import { STATIONS, STATION_MAP } from "./stations";
import { createRng, fbm, hashString, latticeNoise, clamp, round } from "@/lib/prng";
import { SIM_BASE_NOW, SIM_TICK_MS } from "@/config/constants";
import type { BasinNode, TelemetryPoint } from "@/types/domain";

export const MONTH_NAMES = [
  "September", "October", "November", "December",
  "January", "February", "March", "April",
  "May", "June", "July", "August"
];

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
export const MONTH_MS = 30 * DAY;

/**
 * Scenario: Upstream Supply Deficit Propagation
 * Focus: HUC-DEMO-0014 & HUC-DEMO-0017 in the Southern Valley Branch
 * Rapid supply deficit and elevated withdrawal propagate downstream to HUC-DEMO-0019 -> HUC-DEMO-0020 -> HUC-DEMO-0022.
 */
export const SCENARIO = {
  stations: ["HUC-DEMO-0014", "HUC-DEMO-0017", "HUC-DEMO-0018", "HUC-DEMO-0019", "HUC-DEMO-0020", "HUC-DEMO-0022"],
  focusStationId: "HUC-DEMO-0014",
  upstreamStationId: "HUC-DEMO-0014",
  downstreamPath: ["HUC-DEMO-0017", "HUC-DEMO-0019", "HUC-DEMO-0020", "HUC-DEMO-0022"],
  start: SIM_BASE_NOW,
  duration: 4 * MONTH_MS,
  deficitSeverity: 0.42, // 42% supply deficit relative to climatology
};

/**
 * Monthly seasonal index 0..11 corresponding to Sep -> Aug hydrological calendar
 */
export function getHydrologicalMonthIndex(timestamp: number): number {
  const d = new Date(timestamp);
  const calMonth = d.getUTCMonth(); // 0 = Jan, 8 = Sep
  // Map calendar month to Sep=0, Oct=1, ..., Aug=11
  return (calMonth + 4) % 12;
}

export function getHydrologicalMonthName(timestamp: number): string {
  return MONTH_NAMES[getHydrologicalMonthIndex(timestamp)];
}

/**
 * Causal monthly hydrological state generator
 */
export function basinHydrologyAt(basinId: string, timestamp: number): {
  supply: number;
  baseflow: number;
  quickflow: number;
  withdrawal: number;
  climatology: number;
  climatologyAnomalySigma: number;
  availabilityProxy: number;
  waterLimitationProxy: number;
  riskScore: number;
} {
  const basin = STATION_MAP[basinId] || STATIONS[0];
  const mIdx = getHydrologicalMonthIndex(timestamp);
  const seed = hashString(`hydro:${basin.id}:${mIdx}`);
  const rng = createRng(`hcausal:${basin.id}:${Math.floor(timestamp / MONTH_MS)}`);

  // Seasonal cycle: Wet season in winter (Dec-Feb, indices 3-5), Dry season in summer (Jun-Aug, indices 9-11)
  const seasonFactor = 1.0 + 0.35 * Math.sin(((mIdx - 2) / 12) * 2 * Math.PI);
  const clim = Number((basin.climatology * seasonFactor).toFixed(1));

  // Baseflow changes gradually
  const noiseSlow = latticeNoise(seed, 10) * 0.2 - 0.1;
  // Quickflow is volatile
  const noiseFast = (rng() - 0.5) * 0.3;

  let supply = clim * (1.0 + noiseSlow + noiseFast);

  // Scenario impact: If in scenario basins, apply seasonal supply deficit
  if (SCENARIO.stations.includes(basin.id)) {
    const isFocus = basin.id === SCENARIO.focusStationId;
    const factor = isFocus ? 0.58 : 0.72; // severe deficit
    supply *= factor;
  }

  supply = Math.max(12, Number(supply.toFixed(1)));
  const baseflow = Number((supply * 0.64).toFixed(1));
  const quickflow = Number((supply - baseflow).toFixed(1));

  // Withdrawal: elevated during dry season due to agricultural irrigation
  const drySeasonIrrigationBoost = mIdx >= 7 && mIdx <= 10 ? 1.45 : 1.0;
  const withdrawal = Number((basin.totalWithdrawal * drySeasonIrrigationBoost).toFixed(1));

  // Availability proxy = Supply - Withdrawal
  const availabilityProxy = Number((supply - withdrawal).toFixed(1));

  // Climatology anomaly in standard deviations
  const std = Math.max(8, clim * 0.22);
  const climatologyAnomalySigma = Number(((supply - clim) / std).toFixed(2));

  // Relative water-limitation proxy
  const waterLimitationProxy = Number(
    Math.max(0, Math.min(1, 1 - Math.max(0, availabilityProxy) / Math.max(1, clim))).toFixed(3)
  );

  // Model-predicted risk P(stress at month t+1)
  let riskScore = 0.204; // baseline ~20.4%
  if (climatologyAnomalySigma < -1.0) riskScore += 0.32;
  if (waterLimitationProxy > 0.6) riskScore += 0.26;
  if (basin.upstreamIds.length > 0) {
    // Upstream influence
    const isScenarioUpstream = SCENARIO.stations.some((id) => basin.upstreamIds.includes(id));
    if (isScenarioUpstream) riskScore += 0.18;
  }
  if (SCENARIO.stations.includes(basin.id)) {
    riskScore = Math.max(riskScore, basin.id === SCENARIO.focusStationId ? 0.78 : 0.65);
  }

  riskScore = Number(clamp(riskScore, 0.05, 0.96).toFixed(2));

  return {
    supply,
    baseflow,
    quickflow,
    withdrawal,
    climatology: clim,
    climatologyAnomalySigma,
    availabilityProxy,
    waterLimitationProxy,
    riskScore,
  };
}

/** Simulated rainfall / precipitation rate */
export function rainfallAt(stationId: string, timestamp: number): number {
  const hydro = basinHydrologyAt(stationId, timestamp);
  return Number((hydro.quickflow * 0.15).toFixed(1));
}

/**
 * Historical monthly telemetry series for a basin (e.g. 12-24 historical monthly points)
 */
export function sampleHistory(
  station: BasinNode,
  until: number,
  pointsCount = 18
): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];

  for (let i = pointsCount - 1; i >= 0; i--) {
    const t = until - i * MONTH_MS;
    const mName = getHydrologicalMonthName(t);
    const hydro = basinHydrologyAt(station.id, t);

    // Occasional missing point in cold start basins
    const isMissing = station.coldStart && i === 5;
    const isOutlier = i === 12 && station.id === "HUC-DEMO-0033";

    points.push({
      t,
      monthLabel: mName,
      monthName: mName,
      tma: isMissing ? null : hydro.supply, // alias for backwards compatibility
      supply: isMissing ? 0 : hydro.supply,
      baseflow: hydro.baseflow,
      quickflow: hydro.quickflow,
      withdrawal: hydro.withdrawal,
      climatology: hydro.climatology,
      availabilityProxy: hydro.availabilityProxy,
      waterLimitationProxy: hydro.waterLimitationProxy,
      riskScore: hydro.riskScore,
      rainfall: isMissing ? 0 : rainfallAt(station.id, t),
      quality: isMissing ? "MISSING" : isOutlier ? "OUTLIER" : "GOOD",
    });
  }

  return points;
}
