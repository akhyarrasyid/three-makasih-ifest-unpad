import { STATIONS, STATION_MAP } from "./stations";
import { createRng, hashString, latticeNoise, round } from "@/lib/prng";
import { MODEL, SIM_BASE_NOW } from "@/config/constants";
import { forecastConfidence, forecastSeries } from "./forecasts";
import type {
  InferenceMetrics,
  InferenceRequest,
  ServiceHealth,
  TraceSpan,
  AuditLog,
} from "@/types/domain";

const WORKERS = [
  "tirta-worker-0",
  "tirta-worker-1",
  "tirta-worker-2",
  "tirta-worker-3",
  "tirta-worker-4",
  "tirta-worker-5",
];

function spansFor(stationId: string, rng: () => number, degraded: boolean, errorAt?: string): TraceSpan[] {
  const basin = STATION_MAP[stationId] || STATIONS[0];
  const j = (base: number, spread: number) => Math.round(base + (rng() - 0.3) * spread);

  const spans: TraceSpan[] = [
    { service: "Feature Retrieval", durationMs: j(18, 4), status: "ok" },
    { service: "Hydrology Processing", durationMs: j(31, 6), status: "ok" },
    { service: "Temporal Context", durationMs: j(12, 3), status: "ok" },
    { service: "Reachability Lookup", durationMs: j(14, 4), status: "ok", attributes: { hops: 3, graph_depth: basin.graphDepth } },
    { service: "CatBoost Tabular", durationMs: j(26, 5), status: "ok" },
    { service: "LightGBM Leafwise", durationMs: j(18, 4), status: "ok" },
    { service: "XGBoost Regularized", durationMs: j(22, 4), status: "ok" },
    { service: "Directed GNN", durationMs: j(44, 8) * (degraded ? 1.8 : 1), status: "ok", attributes: { layers: 3, input_features: 25 } },
    { service: "Fusion & Calibration", durationMs: j(4, 2), status: "ok" },
    { service: "Risk Interpretation", durationMs: j(6, 2), status: "ok" },
  ];

  if (errorAt) {
    const idx = spans.findIndex((x) => x.service === errorAt);
    if (idx >= 0) {
      spans[idx].status = "error";
      spans.length = idx + 1;
    }
  }

  return spans;
}

export function buildInferenceRequest(
  stationId: string,
  timestamp: number,
  seedSuffix: string,
  forceSuccess = false
): InferenceRequest {
  const basin = STATION_MAP[stationId] || STATIONS[0];
  const rng = createRng(`inf:${stationId}:${seedSuffix}`);
  const idHex = hashString(`${stationId}:${seedSuffix}`).toString(16).padStart(8, "0");
  const traceHex = hashString(`trace:${stationId}:${seedSuffix}`).toString(16).slice(0, 6);

  const r = rng();
  const degraded = !forceSuccess && r > 0.94 && r <= 0.98;
  const isError = !forceSuccess && r > 0.98 && r <= 0.995;
  const isTimeout = !forceSuccess && r > 0.995;

  const spans = spansFor(stationId, rng, degraded, isError ? "Directed GNN" : undefined);
  const latency = isTimeout ? 2000 : spans.reduce((a, b) => a + b.durationMs, 0);
  const fc = forecastSeries(stationId, timestamp, 6);
  const conf = forecastConfidence(stationId, timestamp, fc);

  return {
    requestId: `req_${idHex}`,
    traceId: `trace_${traceHex}`,
    timestamp: new Date(timestamp).toISOString(),
    stationId,
    basinId: stationId,
    modelVersion: "tirta-hybrid-research-v1",
    provenance: "INTERNAL VALIDATION",
    latencyMs: latency,
    status: isTimeout ? "TIMEOUT" : isError ? "ERROR" : degraded ? "DEGRADED" : "SUCCESS",
    horizons: [1, 2, 3, 6],
    featureCount: 25,
    route: [
      "Feature Retrieval",
      "Reachability Lookup",
      "GBDT (CatBoost+LGBM+XGB)",
      "DirectedReachGNN",
      "Model Fusion",
    ],
    confidence: isError || isTimeout ? 0 : conf.score,
    spans,
    worker: WORKERS[Math.floor(rng() * WORKERS.length)],
    isSimulatedDemo: true,
    errorMessage: isError
      ? "GNNMessagePassingTimeout: graph adjacency fetch exceeded budget"
      : isTimeout
      ? "DeadlineExceeded: request exceeded 2000ms SLA"
      : undefined,
  };
}

export function recentInferenceRequests(now: number, count = 50): InferenceRequest[] {
  const out: InferenceRequest[] = [];
  const cycleMs = 15 * 60_000;
  const lastCycle = Math.floor(now / cycleMs) * cycleMs;

  for (let c = 0; out.length < count && c < 15; c++) {
    const cycleTime = lastCycle - c * cycleMs;
    const order = [...STATIONS].sort(
      (a, b) => hashString(`${a.id}:${cycleTime}`) - hashString(`${b.id}:${cycleTime}`)
    );
    for (const [i, s] of order.entries()) {
      if (out.length >= count) break;
      const ts = cycleTime + i * 2200 + (hashString(s.id) % 1000);
      if (ts > now) continue;
      out.push(buildInferenceRequest(s.id, ts, String(cycleTime)));
    }
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function inferenceMetrics(now: number, scenarioLoad = 0): InferenceMetrics {
  const seed = hashString("tirta-inf-metrics");
  const minute = Math.floor(now / 60_000);

  const timeline = Array.from({ length: 60 }, (_, i) => {
    const m = minute - 59 + i;
    const base = 5.4 + latticeNoise(seed, m) * 2.2 + Math.sin(m / 10) * 0.8;
    const load = base + scenarioLoad * 3.5;
    const p95 = round(165 + latticeNoise(seed + 1, m) * 45 + scenarioLoad * 55, 1);
    const err = round(Math.max(0, latticeNoise(seed + 2, m) * 0.012 - 0.004), 4);
    return {
      t: (now - (59 - i) * 60_000),
      rps: round(load, 2),
      p95,
      errors: err,
    };
  });

  return {
    requestsPerSec: timeline[timeline.length - 1].rps,
    p50Ms: 142,
    p95Ms: 195,
    p99Ms: 248,
    errorRate: 0.0018,
    throughputPerMin: Math.round(timeline[timeline.length - 1].rps * 60),
    queueDepth: 4,
    activeWorkers: 6,
    totalWorkers: 6,
    timeline,
  };
}

export function systemHealth(now: number): ServiceHealth[] {
  const seed = hashString("tirta-sys-health");
  const services = [
    { id: "srv-ingest", name: "Data Ingestion Service", role: "Water-budget data pipeline & locale normalization", ver: "v2.1.0" },
    { id: "srv-hydro", name: "Hydrology Processing Service", role: "Baseflow separation, climatology anomaly sigma calculation", ver: "v2.2.4" },
    { id: "srv-lineage", name: "Temporal Lineage Service", role: "Historical origin ordering & monthly block alignment", ver: "v1.8.2" },
    { id: "srv-features", name: "Feature Store", role: "6 feature families, online retrieval with <20ms latency", ver: "v3.0.1" },
    { id: "srv-graph", name: "Directed Graph Service", role: "DAG topology, 1–3 hop reachability matrices & adjacency operators", ver: "v2.4.0" },
    { id: "srv-gbdt", name: "GBDT Inference Service", role: "CatBoost + LightGBM + XGBoost ensemble scoring", ver: "v2.5.2" },
    { id: "srv-gnn", name: "Directed GNN Service", role: "3-layer message-passing neural network forward pass", ver: "v1.4.0" },
    { id: "srv-risk", name: "Risk Engine", role: "Continuous probability calibration & alert thresholding", ver: "v2.1.1" },
    { id: "srv-alerts", name: "Alert & Notification Service", role: "Threshold notifications & downstream propagation routing", ver: "v2.0.0" },
    { id: "srv-gateway", name: "API Gateway", role: "Edge routing, rate limiting, authentication, telemetry aggregation", ver: "v3.2.0" },
    { id: "srv-audit", name: "Audit Service", role: "Immutable operational logging & provenance verification", ver: "v1.9.0" },
  ];

  return services.map((s, idx) => {
    const noise = latticeNoise(seed, idx);
    const cpu = Math.round(18 + noise * 38);
    const mem = Math.round(35 + (1 - noise) * 32);
    const lat = Math.round(12 + noise * 28);
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      status: "HEALTHY",
      latencyMs: lat,
      cpu,
      memory: mem,
      requestsPerMin: Math.round(240 + noise * 320),
      errorRate: 0.0005,
      uptime: 99.98,
      replicas: idx === 5 || idx === 6 ? 4 : 2,
      version: s.ver,
      dependencies: idx === 0 ? [] : [services[Math.max(0, idx - 1)].name],
      region: "ifest-dac-2026",
      history: Array.from({ length: 24 }, (_, i) => Math.round(15 + latticeNoise(seed + i, idx) * 30)),
    };
  });
}

export function auditSeed(): AuditLog[] {
  const actions = [
    { action: "INFERENCE_RUN", resource: "HUC-DEMO-0014", role: "operator", actor: "water.operator@tirta.id" },
    { action: "MODEL_DEPLOY", resource: "tirta-graph-catboost-v1", role: "data_scientist", actor: "akhyarrasyid@tirta.id" },
    { action: "ALERT_ACKNOWLEDGED", resource: "ALR-2026-01", role: "operator", actor: "d.santoso@tirta.id" },
    { action: "GRAPH_REACHABILITY_UPDATE", resource: "HUC12-DAG-2026", role: "administrator", actor: "admin@tirta.id" },
    { action: "VALIDATION_SUITE_RUN", resource: "Chronology-Aware-Block-13", role: "data_scientist", actor: "akhyarrasyid@tirta.id" },
    { action: "DATA_LOCALE_NORMALIZE", resource: "train_378780_rows", role: "administrator", actor: "sys.pipeline@tirta.id" },
    { action: "GNN_SNAPSHOT_INGEST", resource: "Origin-168-Adjacency", role: "data_scientist", actor: "akhyarrasyid@tirta.id" },
  ];

  return actions.map((a, i) => ({
    id: i + 1,
    timestamp: new Date(Date.now() - (i * 3 + 1) * 3600_000).toISOString(),
    actor: a.actor,
    role: a.role,
    action: a.action,
    resource: a.resource,
    requestId: `req_audit_${i + 100}`,
    ipAddress: "10.24.18.52",
    environment: "DEMO ENVIRONMENT",
    status: "SUCCESS",
    durationMs: 42 + i * 8,
    details: { provenance: "SIMULATED DEMO TELEMETRY", auditHash: hashString(`${a.action}:${i}`).toString(16) },
  }));
}
