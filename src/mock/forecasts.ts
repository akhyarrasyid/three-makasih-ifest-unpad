import { STATIONS, STATION_MAP, ancestorsOf } from "./stations";
import {
  tmaAt,
  climatologyAt,
  rainfallAt,
  rainfallAccum,
  missingRate,
  sampleQuality,
  staleOffsetMs,
  isOffline,
  HOUR,
  couplingFactor,
} from "./telemetry";
import { computeRisk } from "./risk";
import { fbm, hashString, clamp, round, latticeNoise } from "@/lib/prng";
import { MODEL, FORECAST_HOURS } from "@/config/constants";
import type {
  ForecastConfidence,
  ForecastPoint,
  RoutingStep,
  Station,
  StationSnapshot,
  TrendDirection,
} from "@/types/domain";

/* ------------------------------------------------------------------------ */
/* Forecast generation                                                      */
/* ------------------------------------------------------------------------ */

function volatility(station: Station): number {
  switch (station.category) {
    case "DAM_WEIR":
      return 0.35;
    case "MIXED":
      return 0.7;
    default:
      return 1;
  }
}

/** Forecast uncertainty (1σ, metres) at horizon h – widens sub-linearly with horizon. */
export function sigmaAt(station: Station, h: number, rain24h: number): number {
  const v = volatility(station);
  const rainFactor = 1 + Math.min(rain24h / 60, 1) * 0.6;
  return (0.03 + 0.021 * Math.pow(h, 0.72)) * v * rainFactor * (station.thresholds.alert / 6);
}

/**
 * Direct multi-horizon forecast. Every horizon is predicted directly from the
 * anchor time `now` (no recursive feedback), using only information known at `now`.
 */
export function forecastSeries(stationId: string, now: number, hours = FORECAST_HOURS, modelSeed = "v2.4.1"): ForecastPoint[] {
  const station = STATION_MAP[stationId];
  const seed = hashString(`fc:${stationId}:${modelSeed}:${Math.floor(now / (30 * 60_000))}`);
  const rain24 = rainfallAccum(stationId, now, 24);
  const current = tmaAt(stationId, now);
  const out: ForecastPoint[] = [];
  for (let h = 1; h <= hours; h++) {
    const t = now + h * HOUR;
    const clim = climatologyAt(stationId, t);
    const latentKnown = tmaAt(stationId, t, now); // physics with only observed rainfall
    const persistenceDecay = Math.exp(-h / 18);
    let predicted: number;
    switch (station.strategy) {
      case "CLIMATOLOGY":
        predicted = clim + (current - climatologyAt(stationId, now)) * persistenceDecay * 0.85;
        break;
      case "HYBRID":
        predicted = 0.58 * latentKnown + 0.42 * (clim + (current - climatologyAt(stationId, now)) * persistenceDecay);
        break;
      default:
        predicted = latentKnown;
    }
    const sigma = sigmaAt(station, h, rain24);
    const err = fbm(seed, h, [4, 16, 48], [1, 1, 0.6]) * sigma * 0.55;
    predicted = Math.max(0.05, predicted + err);
    out.push({
      t,
      horizon: h,
      predicted: round(predicted, 3),
      lower: round(Math.max(0, predicted - 1.645 * sigma), 3),
      upper: round(predicted + 1.645 * sigma, 3),
      climatology: round(clim, 3),
      actual: null,
    });
  }
  return out;
}

/** Forecast with realized actuals for back-testing views (anchor in the past). */
export function forecastWithActuals(stationId: string, anchor: number, now: number, hours = FORECAST_HOURS): ForecastPoint[] {
  return forecastSeries(stationId, anchor, hours).map((p) => ({
    ...p,
    actual: p.t <= now && sampleQuality(stationId, p.t) !== "MISSING" ? round(tmaAt(stationId, p.t), 3) : null,
  }));
}

export function forecastConfidence(stationId: string, now: number, forecast: ForecastPoint[]): ForecastConfidence {
  const station = STATION_MAP[stationId];
  const rain24 = rainfallAccum(stationId, now, 24);
  const miss = missingRate(stationId, now, 24);
  const p24 = forecast[23];
  const uncertainty = p24 ? (p24.upper - p24.lower) / 2 : 0.2;
  const upstreamRain = station.upstreamStations.reduce((acc, id) => acc + rainfallAccum(id, now, 12), 0);
  let score = 0.96;
  score -= Math.min(0.12, (uncertainty / station.thresholds.alert) * 0.6);
  score -= Math.min(0.12, miss * 0.6);
  score -= Math.min(0.05, (rain24 / 80) * 0.05);
  if (station.category === "DAM_WEIR") score += 0.02;
  if (station.category === "MIXED") score -= 0.02;
  score += (latticeNoise(hashString(`conf:${stationId}`), 1) - 0.5) * 0.02;
  score = clamp(score, 0.52, 0.97);

  const trendW = 0.3 + Math.min(0.2, Math.abs(tmaAt(stationId, now) - tmaAt(stationId, now - 3 * HOUR)) * 0.5);
  const rainW = 0.12 + Math.min(0.3, rain24 / 100);
  const upW = station.upstreamStations.length ? 0.14 + Math.min(0.25, upstreamRain / 120) : 0.02;
  const seasonW = station.category === "DAM_WEIR" ? 0.4 : 0.15;
  const total = trendW + rainW + upW + seasonW;
  return {
    score: round(score, 3),
    drivers: [
      { label: "Recent TMA trend", contribution: round(trendW / total, 3) },
      { label: "Rainfall (24h)", contribution: round(rainW / total, 3) },
      { label: "Upstream station influence", contribution: round(upW / total, 3) },
      { label: "Seasonal pattern", contribution: round(seasonW / total, 3) },
    ].sort((a, b) => b.contribution - a.contribution),
    reconciliationAdjustment: round((latticeNoise(hashString(`recon:${stationId}`), Math.floor(now / HOUR)) - 0.5) * 0.08 * (station.primaryNetwork ? 1 : 0), 3),
    uncertaintyM: round(uncertainty, 3),
  };
}

/* ------------------------------------------------------------------------ */
/* Snapshot                                                                  */
/* ------------------------------------------------------------------------ */

const snapshotCache = new Map<string, StationSnapshot>();

export function stationSnapshot(stationId: string, now: number, activeAlerts = 0): StationSnapshot {
  const key = `${stationId}:${now}:${activeAlerts}`;
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const station = STATION_MAP[stationId];
  const stale = staleOffsetMs(stationId);
  const offline = isOffline(stationId);
  const obsTime = now - stale - (hashString(stationId) % 47) * 1000;
  const currentTma = round(tmaAt(stationId, obsTime), 2);
  const previousTma = round(tmaAt(stationId, obsTime - HOUR), 2);
  const rate = round(currentTma - previousTma, 3);
  const trend: TrendDirection = rate > 0.03 ? "RISING" : rate < -0.03 ? "FALLING" : "STABLE";
  const fc = forecastSeries(stationId, now, 24);
  const forecast6h = fc[5].predicted;
  const forecast24h = fc[23].predicted;
  const forecastPeak6h = Math.max(...fc.slice(0, 6).map((p) => p.predicted));
  const rain1h = round(rainfallAt(stationId, now), 1);
  const rain24 = rainfallAccum(stationId, now, 24);
  const miss24 = missingRate(stationId, now, 24);

  const upstreamInfluence = round(
    station.upstreamStations.reduce((acc, id) => {
      const up = STATION_MAP[id];
      return acc + couplingFactor(up, station) * Math.max(0, tmaAt(id, now) - climatologyAt(id, now));
    }, 0),
    3,
  );

  const risk = computeRisk({
    currentTma,
    forecast6h: forecastPeak6h,
    forecast24h,
    thresholds: station.thresholds,
    rainfall24h: rain24,
    upstreamInfluence,
    missingRate: miss24,
  });

  const sparkline: number[] = [];
  for (let i = 23; i >= 0; i--) sparkline.push(round(tmaAt(stationId, now - i * HOUR), 2));

  const freshnessSec = Math.round((now - obsTime) / 1000);
  const snap: StationSnapshot = {
    station,
    currentTma,
    previousTma,
    trend,
    trendRatePerHour: rate,
    forecast6h,
    forecast24h,
    risk: risk.level,
    riskScore: risk.score,
    thresholdRatio: round(currentTma / station.thresholds.alert, 3),
    status: offline ? "OFFLINE" : freshnessSec > 30 * 60 ? "STALE" : "ONLINE",
    lastUpdated: obsTime,
    freshnessSec,
    rainfall1h: rain1h,
    rainfall24h: rain24,
    dataQualityScore: round(clamp(1 - miss24 * 1.6 - (freshnessSec > 1800 ? 0.2 : 0), 0.3, 1), 3),
    missingRate24h: miss24,
    modelVersion: MODEL.productionVersion,
    upstreamInfluence,
    activeAlerts,
    sparkline,
  };
  if (snapshotCache.size > 5000) snapshotCache.clear();
  snapshotCache.set(key, snap);
  return snap;
}

export function allSnapshots(now: number, alertCounts: Record<string, number> = {}): StationSnapshot[] {
  return STATIONS.map((s) => stationSnapshot(s.id, now, alertCounts[s.id] ?? 0));
}

/* ------------------------------------------------------------------------ */
/* Routing                                                                   */
/* ------------------------------------------------------------------------ */

export function routingSteps(station: Station): RoutingStep[] {
  const base = hashString(`route:${station.id}`);
  const j = (i: number) => Math.round(latticeNoise(base, i) * 12);
  const input: RoutingStep = { id: "input", label: "Input", detail: `${station.id} telemetry + rainfall + ${station.upstreamStations.length} upstream signals`, durationMs: 12 + j(1), kind: "input" };
  const output: RoutingStep = { id: "output", label: "Final Prediction", detail: "7 horizons · 90% interval · risk interpretation", durationMs: 6 + j(9), kind: "output" };
  switch (station.category) {
    case "DAM_WEIR":
      return [
        input,
        { id: "router", label: "Dam/Weir Router", detail: "Segment = DAM_WEIR → climatological branch", durationMs: 4 + j(2), kind: "router" },
        { id: "clim", label: "Climatology", detail: "Historical same-day profile + persistence decay", durationMs: 18 + j(3), kind: "model" },
        output,
      ];
    case "MIXED":
      return [
        input,
        { id: "router", label: "Mixed Router", detail: "Segment = MIXED → blended branch", durationMs: 4 + j(2), kind: "router" },
        { id: "nat", label: "Natural Model + Climatology", detail: "LightGBM · ExtraTrees · RF ensemble ∥ climatology", durationMs: 71 + j(4), kind: "model" },
        { id: "blend", label: "Weighted Combination", detail: "w_ml = 0.58 · w_clim = 0.42 (learned per station)", durationMs: 9 + j(5), kind: "model" },
        output,
      ];
    default:
      return [
        input,
        { id: "nat", label: "Natural Model", detail: "Segment = NATURAL → machine-learning branch", durationMs: 5 + j(2), kind: "router" },
        { id: "dmh", label: "Direct Multi-Horizon", detail: "7 independent heads (1h … 72h) anchored at t₀", durationMs: 84 + j(4), kind: "model" },
        { id: "graph", label: "Residual Graph", detail: `${ancestorsOf(station.id, 2).length + station.downstreamStations.length} neighbours · river-distance ⊕ residual correlation`, durationMs: 14 + j(6), kind: "graph" },
        { id: "recon", label: "Spatial Reconciliation", detail: "Neighbour residual projection · λ = 0.32", durationMs: 22 + j(7), kind: "graph" },
        output,
      ];
  }
}
