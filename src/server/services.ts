import { STATIONS, STATION_MAP } from "@/mock/stations";
import { allSnapshots, stationSnapshot, forecastSeries, forecastWithActuals, forecastConfidence, routingSteps } from "@/mock/forecasts";
import { sampleHistory, SCENARIO, basinHydrologyAt, getHydrologicalMonthName, MONTH_MS } from "@/mock/telemetry";
import { buildNetwork, neighbours, reachabilityTrace } from "@/mock/network";
import { ALERT_SEEDS, evaluateScenarioAlerts, type AlertSeed } from "@/mock/alerts";
import { auditSeed, buildInferenceRequest, inferenceMetrics, recentInferenceRequests, systemHealth } from "@/mock/inference";
import { dataQualityReport } from "@/mock/dataQuality";
import { MODEL_VERSIONS, EXPERIMENTS, BENCHMARKS, ABLATIONS, FOLDS, FEATURE_IMPORTANCE } from "@/mock/models";
import { DATASET, MODEL, SCORES, SIM_BASE_NOW, SIM_TICK_MS } from "@/config/constants";
import { hashString, round } from "@/lib/prng";
import type {
  Alert,
  AuditLog,
  OverviewData,
  ScenarioState,
  SimEvent,
  StationDetail,
  StationSnapshot,
  SearchResult,
  RiskLevel,
  AlertAction,
} from "@/types/domain";

/* ------------------------------------------------------------------------ */
/* Simulated clock                                                          */
/* ------------------------------------------------------------------------ */

export function simNow(tick: number): number {
  return SIM_BASE_NOW + Math.max(0, Math.floor(tick)) * SIM_TICK_MS;
}

export function parseTick(url: string): number {
  try {
    const t = Number(new URL(url).searchParams.get("t") ?? 0);
    return Number.isFinite(t) ? Math.max(0, Math.min(t, 600)) : 0;
  } catch {
    return 0;
  }
}

export function scenarioState(tick: number, snapshots: StationSnapshot[]): ScenarioState {
  const focus = snapshots.find((s) => s.station.id === SCENARIO.focusStationId) ?? snapshots[0];
  const downstream = snapshots.find((s) => s.station.id === "HUC-DEMO-0017") ?? snapshots[1];

  let phase: ScenarioState["phase"] = "IDLE";
  let description = "River network in steady hydrological state. Advance simulated origin to observe stress propagation.";

  if (focus.climatologyAnomalySigma < -0.8 && focus.riskScore < 0.65) {
    phase = "DEFICIT_DEVELOPING";
    description = `Seasonal supply deficit developing in headwater basin ${focus.station.name} (${focus.climatologyAnomalySigma}σ below normal).`;
  } else if (focus.riskScore >= 0.65 && downstream.riskScore < 0.70) {
    phase = "UPSTREAM_PROPAGATION";
    description = `Southern Valley headwater deficit is transmitting downstream into ${downstream.station.name}. Reachability layer propagating elevated stress.`;
  } else if (focus.riskScore >= 0.75 && focus.risk === "CRITICAL") {
    phase = "CRITICAL_ALERT";
    description = `Critical next-month water-stress alert raised at ${focus.station.name} (P = ${focus.riskScore}). Upstream stress propagating through 3-hop downstream chain.`;
  } else if (downstream.riskScore >= 0.70) {
    phase = "HIGH_STRESS";
    description = `Downstream agricultural reach ${downstream.station.name} under elevated water stress (P = ${downstream.riskScore}) driven by upstream shortage.`;
  }

  return {
    tick,
    phase,
    description,
    focusStationId: SCENARIO.focusStationId,
    focusBasinId: SCENARIO.focusStationId,
    upstreamStationId: SCENARIO.upstreamStationId,
    upstreamBasinId: SCENARIO.upstreamStationId,
  };
}

/* ------------------------------------------------------------------------ */
/* In-Memory Fallback Store                                                 */
/* ------------------------------------------------------------------------ */

interface InMemoryStore {
  alerts: Map<string, Alert>;
  auditLogs: AuditLog[];
  initialized: boolean;
}

const globalForServices = globalThis as typeof globalThis & {
  __tirtaInMemoryStore?: InMemoryStore;
};

const memStore: InMemoryStore = globalForServices.__tirtaInMemoryStore ?? {
  alerts: new Map<string, Alert>(),
  auditLogs: [],
  initialized: false,
};

if (process.env.NODE_ENV !== "production") {
  globalForServices.__tirtaInMemoryStore = memStore;
}

function initMemoryStore() {
  if (memStore.initialized) return;

  for (const seed of ALERT_SEEDS) {
    const alert: Alert = {
      id: seed.id,
      severity: seed.severity,
      type: seed.type,
      title: seed.title,
      description: seed.description,
      stationId: seed.stationId,
      basinId: seed.basinId,
      source: seed.source,
      status: seed.status,
      acknowledgedBy: seed.acknowledgedBy ?? null,
      acknowledgedAt: seed.acknowledgedAt ? new Date(seed.acknowledgedAt).toISOString() : null,
      assignedTo: seed.assignedTo ?? null,
      snoozedUntil: null,
      correlationId: seed.correlationId,
      createdAt: new Date(seed.createdAt).toISOString(),
      updatedAt: new Date(seed.acknowledgedAt ?? seed.createdAt).toISOString(),
      metadata: seed.metadata ?? {},
      fromScenario: seed.fromScenario ?? false,
      risk: seed.risk,
      confidence: seed.confidence,
      origin: seed.origin,
      traceId: seed.traceId,
    };
    memStore.alerts.set(alert.id, alert);
  }

  memStore.auditLogs = auditSeed();
  memStore.initialized = true;
}

/* ------------------------------------------------------------------------ */
/* Primary Domain Operations & Aliases                                      */
/* ------------------------------------------------------------------------ */

export async function overview(tick = 0): Promise<OverviewData> {
  initMemoryStore();
  const now = simNow(tick);
  const snapshots = allSnapshots(now);

  const scenario = scenarioState(tick, snapshots);
  const scenarioAlerts = evaluateScenarioAlerts(
    Object.fromEntries(snapshots.map((s) => [s.station.id, s])),
    now
  );

  for (const seed of scenarioAlerts) {
    if (!memStore.alerts.has(seed.id)) {
      memStore.alerts.set(seed.id, {
        id: seed.id,
        severity: seed.severity,
        type: seed.type,
        title: seed.title,
        description: seed.description,
        stationId: seed.stationId,
        basinId: seed.basinId,
        source: seed.source,
        status: seed.status,
        acknowledgedBy: null,
        acknowledgedAt: null,
        assignedTo: null,
        snoozedUntil: null,
        correlationId: seed.correlationId,
        createdAt: new Date(seed.createdAt).toISOString(),
        updatedAt: new Date(seed.createdAt).toISOString(),
        metadata: seed.metadata ?? {},
        fromScenario: true,
        risk: seed.risk,
        confidence: seed.confidence,
        origin: seed.origin,
        traceId: seed.traceId,
      });
    }
  }

  const allAlertsList = Array.from(memStore.alerts.values());
  const openAlerts = allAlertsList.filter((a) => a.status === "OPEN").length;
  const criticalAlerts = allAlertsList.filter((a) => a.status === "OPEN" && a.severity === "CRITICAL").length;

  const riskDistribution: Record<RiskLevel, number> = {
    LOW: 0,
    MODERATE: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  snapshots.forEach((s) => {
    riskDistribution[s.risk]++;
  });

  const categoryDistribution: Record<string, number> = {
    HEADWATER: 0,
    TRIBUTARY: 0,
    MAINSTEM: 0,
    OUTLET: 0,
  };
  snapshots.forEach((s) => {
    categoryDistribution[s.station.category] = (categoryDistribution[s.station.category] || 0) + 1;
  });

  const sortedByRisk = [...snapshots].sort((a, b) => b.riskScore - a.riskScore);
  const highestRiskBasins = sortedByRisk.slice(0, 5);

  const sortedByDeficit = [...snapshots].sort((a, b) => a.climatologyAnomalySigma - b.climatologyAnomalySigma);
  const largestDeficitBasins = sortedByDeficit.slice(0, 5);

  const sortedByUpstream = [...snapshots].sort((a, b) => b.upstreamStressScore - a.upstreamStressScore);
  const upstreamStressBasins = sortedByUpstream.slice(0, 5);

  const coldStartBasins = snapshots.filter((s) => s.coldStart);

  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const monthlyStressTimeline = months.map((m, idx) => ({
    month: m,
    historicalRate: round(0.14 + 0.12 * Math.sin(((idx - 2) / 12) * 2 * Math.PI), 3),
    modelPredictedRate: round(0.16 + 0.14 * Math.sin(((idx - 2) / 12) * 2 * Math.PI) + (idx >= 6 && idx <= 9 ? 0.05 : 0), 3),
  }));

  const recentEvents: SimEvent[] = [
    {
      id: `ev-${tick}-1`,
      type: "FORECAST_COMPLETED",
      timestamp: now - 180_000,
      message: `Next-month water-stress inference completed across ${DATASET.testHuc12} HUC12 sub-basins.`,
    },
    {
      id: `ev-${tick}-2`,
      type: "GRAPH_AGGREGATED",
      timestamp: now - 360_000,
      message: "Directed multi-hop reachability operators (1–3 hops) aggregated across river DAG.",
    },
    {
      id: `ev-${tick}-3`,
      type: "LINEAGE_RECONSTRUCTED",
      timestamp: now - 900_000,
      message: "Temporal lineage fingerprint match verified for historical origin block 14.",
    },
  ];

  return {
    generatedAt: Date.now(),
    simulatedNow: now,
    currentOrigin: `Origin 168 (Block 14)`,
    forecastMonth: `Month t+1 (${getHydrologicalMonthName(now + MONTH_MS)})`,
    modelVersion: MODEL.championVersion,
    provenance: "STRESS-TEST VALIDATION",
    freshnessSec: 18,
    systemStatus: criticalAlerts > 0 ? "INCIDENT" : openAlerts > 3 ? "DEGRADED" : "OPERATIONAL",
    kpis: {
      forecastHuc12: DATASET.testHuc12,
      historicalHuc12: DATASET.historicalHuc12,
      historicalOrigins: DATASET.historicalOrigins,
      forecastOrigins: DATASET.futureTestOrigins,
      historicalStressRate: DATASET.historicalStressRate,
      verifiedPublicAp: SCORES.verifiedPublicAp,
      stressTestAp: SCORES.graphCatboostAp,
      gnnResearchAp: SCORES.directedGnnAp,
      stations: STATIONS.length,
      primaryNetwork: STATIONS.length,
      trainingObservations: DATASET.trainingRows,
      testObservations: DATASET.testRows,
      holdoutRmse: 0.288,
      missingRate: 0.0,
    },
    riskDistribution,
    categoryDistribution,
    stations: snapshots,
    highestRiskBasins,
    largestDeficitBasins,
    upstreamStressBasins,
    coldStartBasins,
    openAlerts,
    criticalAlerts,
    monthlyStressTimeline,
    networkForecast: [
      { t: now - 5 * MONTH_MS, actual: 0.18, predicted: 0.18, lower: 0.15, upper: 0.22 },
      { t: now - 4 * MONTH_MS, actual: 0.21, predicted: 0.20, lower: 0.17, upper: 0.24 },
      { t: now - 3 * MONTH_MS, actual: 0.23, predicted: 0.22, lower: 0.19, upper: 0.26 },
      { t: now - 2 * MONTH_MS, actual: 0.26, predicted: 0.25, lower: 0.21, upper: 0.29 },
      { t: now - 1 * MONTH_MS, actual: 0.31, predicted: 0.30, lower: 0.25, upper: 0.35 },
      { t: now, actual: 0.38, predicted: 0.38, lower: 0.32, upper: 0.44 },
      { t: now + 1 * MONTH_MS, actual: null, predicted: 0.46, lower: 0.39, upper: 0.54 },
      { t: now + 2 * MONTH_MS, actual: null, predicted: 0.52, lower: 0.43, upper: 0.62 },
      { t: now + 3 * MONTH_MS, actual: null, predicted: 0.48, lower: 0.38, upper: 0.58 },
    ],
    recentEvents,
    scenario,
  };
}

export const getOverview = overview;

export async function listStationSnapshots(tick = 0): Promise<StationSnapshot[]> {
  const now = simNow(tick);
  return allSnapshots(now);
}

export const getStations = listStationSnapshots;

export async function stationDetail(id: string, tick = 0): Promise<StationDetail | null> {
  const now = simNow(tick);
  const station = STATION_MAP[id];
  if (!station) return null;

  const snap = stationSnapshot(station, now);
  const fc = forecastSeries(id, now, 6);
  const conf = forecastConfidence(id, now, fc);
  const reach = reachabilityTrace(id, now);
  const steps = routingSteps(station);

  return {
    ...snap,
    confidence: conf,
    reachability: reach,
    residualCorrelations: neighbours(id, 6),
    rainfallCorrelation: [
      { lagHours: 1, correlation: 0.78 },
      { lagHours: 2, correlation: 0.84 },
      { lagHours: 3, correlation: 0.72 },
    ],
    inferenceHistory: recentInferenceRequests(now, 8).filter((r) => r.stationId === id),
    routing: steps,
  };
}

export const getStationDetail = stationDetail;

export async function stationForecast(id: string, tick = 0, _anchorOffset = 0) {
  const now = simNow(tick);
  const station = STATION_MAP[id] ?? STATIONS[0];
  const points = forecastWithActuals(id, now - MONTH_MS, now, 6);
  const conf = forecastConfidence(id, now, points);
  const hydro = basinHydrologyAt(id, now);
  const hydroNext = basinHydrologyAt(id, now + MONTH_MS);

  return {
    stationId: id,
    anchor: now - MONTH_MS,
    now,
    modelVersion: station.graphDepth > 3 ? "tirta-directed-gnn-v1" : "tirta-graph-catboost-v1",
    strategy: station.strategy,
    points,
    confidence: conf,
    routing: routingSteps(station),
    riskScore: hydroNext.riskScore,
    predictedSupply: hydroNext.supply,
    predictedAvailability: hydroNext.availabilityProxy,
    predictedLimitation: hydroNext.waterLimitationProxy,
  };
}

export const getStationForecast = stationForecast;

export async function stationHistory(id: string, tick = 0, _months = 18, _step = 1) {
  const now = simNow(tick);
  const station = STATION_MAP[id] ?? STATIONS[0];
  return sampleHistory(station, now, 18);
}

export const getStationHistory = stationHistory;

export async function network(tick = 0) {
  const now = simNow(tick);
  const snapshots = allSnapshots(now);
  return buildNetwork(snapshots, now);
}

export const getNetwork = network;

export async function listAlerts(tick = 0): Promise<Alert[]> {
  initMemoryStore();
  const now = simNow(tick);
  const snapshots = allSnapshots(now);
  const scenarioAlerts = evaluateScenarioAlerts(
    Object.fromEntries(snapshots.map((s) => [s.station.id, s])),
    now
  );
  for (const seed of scenarioAlerts) {
    if (!memStore.alerts.has(seed.id)) {
      memStore.alerts.set(seed.id, {
        ...seed,
        status: "OPEN",
        acknowledgedBy: null,
        acknowledgedAt: null,
        assignedTo: null,
        snoozedUntil: null,
        createdAt: new Date(seed.createdAt).toISOString(),
        updatedAt: new Date(seed.createdAt).toISOString(),
        metadata: seed.metadata ?? {},
        fromScenario: true,
      });
    }
  }

  return Array.from(memStore.alerts.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export const getAlerts = listAlerts;

export type { AlertAction };

export async function mutateAlert(
  id: string,
  action: AlertAction,
  actor?: string,
  role?: string,
  body?: { acknowledgedBy?: string; snoozedHours?: number; assignee?: string; minutes?: number }
): Promise<Alert | null> {
  initMemoryStore();
  const alert = memStore.alerts.get(id);
  if (!alert) return null;

  const nowIso = new Date().toISOString();
  let updated: Alert;

  if (action === "acknowledge") {
    updated = {
      ...alert,
      status: "ACKNOWLEDGED",
      acknowledgedBy: body?.acknowledgedBy ?? actor ?? "operator",
      acknowledgedAt: nowIso,
      updatedAt: nowIso,
    };
  } else if (action === "snooze") {
    const hours = body?.minutes ? body.minutes / 60 : body?.snoozedHours ?? 24;
    updated = {
      ...alert,
      status: "SNOOZED",
      snoozedUntil: new Date(Date.now() + hours * 3600_000).toISOString(),
      updatedAt: nowIso,
    };
  } else if (action === "assign") {
    updated = {
      ...alert,
      assignedTo: body?.assignee ?? "operator",
      updatedAt: nowIso,
    };
  } else if (action === "reopen") {
    updated = {
      ...alert,
      status: "OPEN",
      updatedAt: nowIso,
    };
  } else {
    // resolve
    updated = {
      ...alert,
      status: "RESOLVED",
      updatedAt: nowIso,
    };
  }

  memStore.alerts.set(id, updated);
  return updated;
}

export async function appendAudit(entry: Partial<AuditLog>): Promise<AuditLog> {
  initMemoryStore();
  const id = memStore.auditLogs.length + 1;
  const log: AuditLog = {
    id,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    actor: entry.actor ?? "system",
    role: entry.role ?? "operator",
    action: entry.action ?? "SYSTEM_ACTION",
    resource: entry.resource ?? "system",
    requestId: entry.requestId ?? `req_audit_${id}`,
    ipAddress: entry.ipAddress ?? "127.0.0.1",
    environment: "DEMO ENVIRONMENT",
    status: entry.status ?? "SUCCESS",
    durationMs: entry.durationMs ?? 42,
    details: entry.details ?? {},
  };
  memStore.auditLogs.unshift(log);
  return log;
}

export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
  initMemoryStore();
  return memStore.auditLogs.slice(0, limit);
}

export const getAuditLogs = listAuditLogs;

export async function resetScenario(): Promise<boolean> {
  memStore.initialized = false;
  memStore.alerts.clear();
  memStore.auditLogs = [];
  initMemoryStore();
  return true;
}

export async function inference(tick = 0) {
  const now = simNow(tick);
  const metrics = inferenceMetrics(now, 0);
  return {
    requests: recentInferenceRequests(now, 40),
    metrics,
    summary: {
      p50LatencyMs: metrics.p50Ms,
      p95LatencyMs: metrics.p95Ms,
      throughputRps: metrics.requestsPerSec,
      errorRate: metrics.errorRate,
      cacheHitRate: 0.94,
    },
    modelVersion: MODEL.productionVersion,
  };
}

export const getInference = inference;

export async function health(tick = 0) {
  const now = simNow(tick);
  return systemHealth(now);
}

export const getSystemHealth = health;

export async function dataQuality(tick = 0) {
  const now = simNow(tick);
  return dataQualityReport(now);
}

export const getDataQuality = dataQuality;

export async function models() {
  return {
    versions: MODEL_VERSIONS,
    experiments: EXPERIMENTS,
    benchmarks: BENCHMARKS,
    ablations: ABLATIONS,
    folds: FOLDS,
    featureImportance: FEATURE_IMPORTANCE,
  };
}

export const getModels = models;

export async function experiments() {
  return EXPERIMENTS;
}

export async function runForecast(stationId: string, tick = 0, _actor = "operator", _role = "operator") {
  const now = simNow(tick);
  const snap = await stationDetail(stationId, tick);
  return {
    stationId,
    timestamp: now,
    status: "SUCCESS",
    latencyMs: 183,
    snapshot: snap,
    provenance: "SIMULATED DEMO TELEMETRY",
    request: {
      requestId: `req_${Date.now()}`,
      timestamp: now,
      stationId,
      modelVersion: MODEL.productionVersion,
      route: ["API Request", "Feature Retrieval", "Hydrology Processing", "Directed GNN", "GBDT Inference", "Risk Interpretation"],
      latencyMs: 183,
      featureCount: 88,
      confidence: snap?.confidence.score ?? 0.86,
      status: "SUCCESS" as const,
      trace: [
        { name: "Feature Retrieval", durationMs: 18, status: "OK", detail: "88 tabular features fetched" },
        { name: "Hydrology Processing", durationMs: 31, status: "OK", detail: "Baseflow & quickflow filtered" },
        { name: "Temporal Context", durationMs: 12, status: "OK", detail: "14-year climatology aligned" },
        { name: "Reachability Lookup", durationMs: 14, status: "OK", detail: "3-hop DAG neighborhood retrieved" },
        { name: "CatBoost Inference", durationMs: 26, status: "OK", detail: "Primary nonlinear booster" },
        { name: "LightGBM Inference", durationMs: 18, status: "OK", detail: "Leaf-wise ensemble component" },
        { name: "XGBoost Inference", durationMs: 22, status: "OK", detail: "Depth-wise regularized model" },
        { name: "Directed GNN Inference", durationMs: 44, status: "OK", detail: "3 reachability layers evaluated" },
        { name: "Risk Fusion & Calibration", durationMs: 4, status: "OK", detail: "Dirichlet blend calibrated" },
      ],
    },
  };
}

export async function search(query: string): Promise<SearchResult[]> {
  initMemoryStore();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const s of STATIONS) {
    if (
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.river.toLowerCase().includes(q) ||
      s.subBasin.toLowerCase().includes(q)
    ) {
      results.push({
        type: "basin",
        id: s.id,
        title: `${s.name} (${s.id})`,
        subtitle: `${s.subBasin} · Depth ${s.graphDepth} · Risk ${(s.riskScore * 100).toFixed(0)}%`,
        href: `/network?basin=${s.id}`,
      });
    }
  }

  for (const a of memStore.alerts.values()) {
    if (a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) {
      results.push({
        type: "alert",
        id: a.id,
        title: a.title,
        subtitle: `${a.severity} · ${a.stationId ?? "Network"} · ${a.status}`,
        href: `/alerts?alert=${a.id}`,
      });
    }
  }

  for (const m of MODEL_VERSIONS) {
    if (m.name.toLowerCase().includes(q) || m.version.toLowerCase().includes(q)) {
      results.push({
        type: "model",
        id: m.version,
        title: m.name,
        subtitle: `${m.provenance} · AP ${m.metrics.apScore.toFixed(4)}`,
        href: `/models`,
      });
    }
  }

  return results.slice(0, 10);
}
