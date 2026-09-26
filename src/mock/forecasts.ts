import { STATIONS, STATION_MAP, ancestorsOf } from "./stations";
import { basinHydrologyAt, MONTH_MS, getHydrologicalMonthName, rainfallAt } from "./telemetry";
import { fbm, hashString, clamp, round } from "@/lib/prng";
import { MODEL, RISK_THRESHOLDS } from "@/config/constants";
import type {
  ForecastConfidence,
  ForecastPoint,
  RoutingStep,
  BasinNode,
  StationSnapshot,
  TrendDirection,
  RiskLevel,
} from "@/types/domain";

/**
 * Next-Month Water-Stress Forecast Series (t+1, t+2, t+3, t+6)
 * Target is continuous probability P(water stress at month t+1) in [0, 1]
 */
export function forecastSeries(
  stationId: string,
  now: number,
  monthsAhead = 6,
  modelSeed = "v2.0"
): ForecastPoint[] {
  const basin = STATION_MAP[stationId] || STATIONS[0];
  const out: ForecastPoint[] = [];

  const horizons = [1, 2, 3, 4, 5, 6];

  for (const h of horizons) {
    const t = now + h * MONTH_MS;
    const mName = getHydrologicalMonthName(t);
    const hydro = basinHydrologyAt(basin.id, t);

    // Predict water-stress probability with widening uncertainty envelope
    const baseP = hydro.riskScore;
    const uncertainty = 0.04 + 0.02 * h + (basin.coldStart ? 0.06 : 0);

    const lower = Number(clamp(baseP - uncertainty, 0.01, 0.98).toFixed(2));
    const upper = Number(clamp(baseP + uncertainty, 0.02, 0.99).toFixed(2));

    out.push({
      t,
      horizon: h,
      horizonLabel: `${mName} (t+${h})`,
      predicted: baseP,
      lower,
      upper,
      climatology: hydro.climatology,
      actual: null,
    });
  }

  return out;
}

export function forecastWithActuals(
  stationId: string,
  anchor: number,
  now: number,
  monthsAhead = 6
): ForecastPoint[] {
  return forecastSeries(stationId, anchor, monthsAhead).map((p) => {
    const isPast = p.t <= now;
    const hydroPast = isPast ? basinHydrologyAt(stationId, p.t) : null;
    return {
      ...p,
      actual: hydroPast ? hydroPast.riskScore : null,
    };
  });
}

export function forecastConfidence(
  stationId: string,
  now: number,
  forecast: ForecastPoint[]
): ForecastConfidence {
  const basin = STATION_MAP[stationId] || STATIONS[0];
  const hydro = basinHydrologyAt(stationId, now);

  const baseScore = basin.coldStart ? 0.72 : 0.88;
  const deficitPen = hydro.climatologyAnomalySigma < -1.0 ? -0.06 : 0.04;
  const score = clamp(baseScore + deficitPen, 0.55, 0.96);

  const drivers = [
    {
      label: `Climatology Anomaly (${hydro.climatologyAnomalySigma > 0 ? "+" : ""}${hydro.climatologyAnomalySigma}σ)`,
      contribution: hydro.climatologyAnomalySigma < -1.0 ? 0.38 : 0.24,
      group: "seasonal_climatology",
    },
    {
      label: `Upstream Reachability (${basin.upstreamIds.length} 1-hop basins)`,
      contribution: 0.28,
      group: "directed_reachability",
    },
    {
      label: `Withdrawal-to-Supply Ratio (${Number(((hydro.withdrawal / Math.max(1, hydro.supply)) * 100).toFixed(0))}%)`,
      contribution: 0.20,
      group: "withdrawal_pressure",
    },
    {
      label: `Local Baseflow State (${hydro.baseflow} mm)`,
      contribution: 0.14,
      group: "local_hydrology",
    },
  ];

  if (basin.coldStart) {
    drivers.push({
      label: "Spatial Cold-Start Generalization Penalty",
      contribution: -0.16,
      group: "basin_context",
    });
  }

  return {
    score: round(score, 2),
    drivers,
    reconciliationAdjustment: 0.03,
    uncertaintyM: basin.coldStart ? 0.15 : 0.08,
    coldStart: basin.coldStart,
  };
}

export function stationSnapshot(station: BasinNode, now: number): StationSnapshot {
  const hydro = basinHydrologyAt(station.id, now);
  const hydroPrev = basinHydrologyAt(station.id, now - MONTH_MS);

  // Generate 12-month supply sparkline
  const sparkline: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const hPast = basinHydrologyAt(station.id, now - i * MONTH_MS);
    sparkline.push(hPast.supply);
  }

  const trendRate = hydro.supply - hydroPrev.supply;
  const trend: TrendDirection =
    trendRate > 8 ? "RISING" : trendRate < -8 ? "FALLING" : "STABLE";

  const riskScore = hydro.riskScore;
  let riskTier: RiskLevel = "LOW";
  if (riskScore >= RISK_THRESHOLDS.CRITICAL) riskTier = "CRITICAL";
  else if (riskScore >= RISK_THRESHOLDS.HIGH) riskTier = "HIGH";
  else if (riskScore >= RISK_THRESHOLDS.MODERATE) riskTier = "MODERATE";

  const confidenceScore = station.coldStart ? 0.72 : 0.88;

  // Upstream stress summary
  let upstreamStress = 0;
  if (station.upstreamIds.length > 0) {
    const upRisks = station.upstreamIds.map((u) => basinHydrologyAt(u, now).riskScore);
    upstreamStress = round(Math.max(...upRisks), 2);
  }

  const activeAlerts = riskScore >= 0.75 ? 2 : riskScore >= 0.50 ? 1 : 0;

  return {
    station,
    basin: station,
    graphDepth: station.graphDepth,
    supplyRatio: station.supplyRatio,
    irrigationWithdrawal: station.irrigationWithdrawal,
    publicSupplyWithdrawal: station.publicSupplyWithdrawal,
    thermoelectricWithdrawal: station.thermoelectricWithdrawal,
    currentSupply: hydro.supply,
    previousSupply: hydroPrev.supply,
    currentTma: hydro.supply, // alias
    previousTma: hydroPrev.supply, // alias
    streamflow: hydro.supply,
    baseflow: hydro.baseflow,
    quickflow: hydro.quickflow,
    totalWithdrawal: hydro.withdrawal,
    withdrawalToSupplyRatio: Number((hydro.withdrawal / Math.max(1, hydro.supply)).toFixed(3)),
    climatology: hydro.climatology,
    climatologyAnomalySigma: hydro.climatologyAnomalySigma,
    availabilityProxy: hydro.availabilityProxy,
    waterLimitationProxy: hydro.waterLimitationProxy,
    trend,
    trendRatePerHour: Number((trendRate / 720).toFixed(4)),
    forecastMonth: "Month t+1 (Next Month)",
    forecast24h: riskScore, // alias
    forecast6h: riskScore, // alias
    risk: riskTier,
    riskScore,
    confidenceScore,
    thresholdRatio: riskScore,
    status: "ONLINE",
    lastUpdated: now,
    freshnessSec: 42,
    rainfall1h: Number((hydro.quickflow * 0.15).toFixed(1)),
    rainfall24h: Number((hydro.quickflow * 0.8).toFixed(1)),
    dataQualityScore: station.coldStart ? 0.84 : 0.98,
    missingRate24h: station.coldStart ? 0.05 : 0.0,
    modelVersion: station.graphDepth > 3 ? "tirta-directed-gnn-v1" : "tirta-graph-catboost-v1",
    upstreamInfluence: upstreamStress,
    upstreamStressScore: upstreamStress,
    downstreamId: station.downstreamId,
    upstreamCount1Hop: station.upstreamIds.length,
    upstreamCount2Hop: Math.min(station.upstreamIds.length * 2, 8),
    upstreamCount3Hop: Math.min(station.upstreamIds.length * 4, 18),
    activeAlerts,
    sparkline,
    coldStart: station.coldStart,
  };
}

export function allSnapshots(now: number): StationSnapshot[] {
  return STATIONS.map((s) => stationSnapshot(s, now));
}

export function routingSteps(station: BasinNode): RoutingStep[] {
  return [
    { id: "s-input", label: "Monthly Basin Features", detail: "Streamflow, baseflow, withdrawals, area, population", durationMs: 14, kind: "input" },
    { id: "s-clim", label: "Climatology Normalization", detail: "Historical 14-year seasonal baseline & anomaly sigma", durationMs: 22, kind: "router" },
    { id: "s-graph", label: "Directed Reachability DAG", detail: `1–3 hop upstream message aggregation (${station.upstreamIds.length} connected)`, durationMs: 31, kind: "graph" },
    { id: "s-model", label: station.strategy, detail: "GBDT + Directed Reachability GNN inference", durationMs: 44, kind: "model" },
    { id: "s-output", label: "Continuous Probability", detail: `P(water stress at t+1) = ${station.riskScore}`, durationMs: 4, kind: "output" },
  ];
}
