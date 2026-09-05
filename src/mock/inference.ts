import { STATIONS, STATION_MAP } from "./stations";
import { createRng, hashString, latticeNoise, round } from "@/lib/prng";
import { MODEL, SIM_BASE_NOW } from "@/config/constants";
import { forecastConfidence, forecastSeries } from "./forecasts";
import type { InferenceMetrics, InferenceRequest, ServiceHealth, TraceSpan } from "@/types/domain";

const WORKERS = ["inf-worker-0", "inf-worker-1", "inf-worker-2", "inf-worker-3", "inf-worker-4", "inf-worker-5"];

function routeFor(stationId: string): string[] {
  const s = STATION_MAP[stationId];
  switch (s.category) {
    case "DAM_WEIR":
      return ["DAM_WEIR", "CLIMATOLOGY"];
    case "MIXED":
      return ["MIXED", "NATURAL_MODEL+CLIMATOLOGY", "WEIGHTED_BLEND"];
    default:
      return ["NATURAL", "DIRECT_MH", "GRAPH_RECONCILIATION"];
  }
}

function spansFor(stationId: string, rng: () => number, degraded: boolean, errorAt?: string): TraceSpan[] {
  const s = STATION_MAP[stationId];
  const j = (base: number, spread: number) => Math.round(base + (rng() - 0.3) * spread);
  const spans: TraceSpan[] = [
    { service: "API Gateway", durationMs: j(12, 6), status: "ok" },
    { service: "Orchestrator", durationMs: j(18, 8), status: "ok", attributes: { model_version: MODEL.productionVersion } },
    { service: "Feature Pipeline", durationMs: j(42, 18) * (degraded ? 1.9 : 1), status: "ok", attributes: { features: s.category === "NATURAL" ? 86 : 54 } },
  ];
  if (s.category === "DAM_WEIR") {
    spans.push({ service: "Climatology Service", durationMs: j(19, 6), status: "ok" });
  } else {
    spans.push({ service: "Model Ensemble", durationMs: j(87, 26), status: "ok", attributes: { members: 3, heads: 7 } });
    if (s.category === "NATURAL") spans.push({ service: "Graph Reconciliation", durationMs: j(25, 10), status: "ok", attributes: { neighbours: 6, lambda: 0.32 } });
    if (s.category === "MIXED") spans.push({ service: "Blend Service", durationMs: j(9, 4), status: "ok" });
  }
  spans.push({ service: "Response", durationMs: j(6, 3), status: "ok" });
  if (errorAt) {
    const idx = spans.findIndex((x) => x.service === errorAt);
    if (idx >= 0) {
      spans[idx].status = "error";
      spans.length = idx + 1;
    }
  }
  return spans;
}

export function buildInferenceRequest(stationId: string, timestamp: number, seedSuffix: string, forceSuccess = false): InferenceRequest {
  const rng = createRng(`inf:${stationId}:${seedSuffix}`);
  const idHex = hashString(`${stationId}:${seedSuffix}`).toString(16).padStart(8, "0");
  const traceHex = hashString(`trace:${stationId}:${seedSuffix}`).toString(16).slice(0, 6);
  const r = rng();
  const degraded = !forceSuccess && r > 0.93 && r <= 0.975;
  const isError = !forceSuccess && r > 0.975 && r <= 0.992;
  const isTimeout = !forceSuccess && r > 0.992;
  const spans = spansFor(stationId, rng, degraded, isError ? "Feature Pipeline" : undefined);
  const latency = isTimeout ? 2000 : spans.reduce((a, b) => a + b.durationMs, 0);
  const fc = forecastSeries(stationId, timestamp, 24);
  const conf = forecastConfidence(stationId, timestamp, fc);
  return {
    requestId: `req_${idHex}`,
    traceId: `trace_${traceHex}`,
    timestamp: new Date(timestamp).toISOString(),
    stationId,
    modelVersion: MODEL.productionVersion,
    latencyMs: latency,
    status: isTimeout ? "TIMEOUT" : isError ? "ERROR" : degraded ? "DEGRADED" : "SUCCESS",
    horizons: [1, 3, 6, 12, 24, 48, 72],
    featureCount: STATION_MAP[stationId].category === "NATURAL" ? 86 : 54,
    route: routeFor(stationId),
    confidence: isError || isTimeout ? 0 : conf.score,
    spans,
    worker: WORKERS[Math.floor(rng() * WORKERS.length)],
    errorMessage: isError ? "FeatureStoreTimeout: upstream feature fetch exceeded 800ms budget" : isTimeout ? "DeadlineExceeded: request exceeded 2000ms SLA" : undefined,
  };
}

/** Recent inference request log: one scheduled cycle per station every 10 min + ad-hoc requests. */
export function recentInferenceRequests(now: number, count = 60): InferenceRequest[] {
  const out: InferenceRequest[] = [];
  const cycleMs = 10 * 60_000;
  const lastCycle = Math.floor(now / cycleMs) * cycleMs;
  for (let c = 0; out.length < count && c < 20; c++) {
    const cycleTime = lastCycle - c * cycleMs;
    const order = [...STATIONS].sort((a, b) => hashString(`${a.id}:${cycleTime}`) - hashString(`${b.id}:${cycleTime}`));
    for (const [i, s] of order.entries()) {
      if (out.length >= count) break;
      const ts = cycleTime + i * 1900 + (hashString(s.id) % 900);
      if (ts > now) continue;
      out.push(buildInferenceRequest(s.id, ts, String(cycleTime)));
    }
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function inferenceMetrics(now: number, scenarioLoad = 0): InferenceMetrics {
  const seed = hashString("inf-metrics");
  const minute = Math.floor(now / 60_000);
  const timeline = Array.from({ length: 60 }, (_, i) => {
    const m = minute - 59 + i;
    const base = 4.2 + latticeNoise(seed, m) * 1.6 + Math.sin(m / 9) * 0.5;
    const p95 = 196 + latticeNoise(seed + 1, m) * 40 + (i > 50 ? scenarioLoad * 22 : 0);
    return { t: m * 60_000, rps: round(base + (i > 50 ? scenarioLoad * 1.4 : 0), 2), p95: Math.round(p95), errors: latticeNoise(seed + 2, m) > 0.9 ? 1 : 0 };
  });
  const last = timeline[timeline.length - 1];
  return {
    requestsPerSec: last.rps,
    p50Ms: Math.round(138 + latticeNoise(seed + 3, minute) * 12 + scenarioLoad * 6),
    p95Ms: last.p95,
    p99Ms: Math.round(last.p95 * 1.42),
    errorRate: round(0.0031 + latticeNoise(seed + 4, minute) * 0.002, 4),
    throughputPerMin: Math.round(last.rps * 60),
    queueDepth: Math.round(2 + latticeNoise(seed + 5, minute) * 5 + scenarioLoad * 6),
    activeWorkers: 5 + (latticeNoise(seed + 6, minute) > 0.7 ? 1 : 0),
    totalWorkers: 6,
    timeline,
  };
}

/* ------------------------------------------------------------------------ */
/* System health                                                            */
/* ------------------------------------------------------------------------ */

const SERVICE_DEFS: Omit<ServiceHealth, "status" | "latencyMs" | "cpu" | "memory" | "requestsPerMin" | "errorRate" | "history">[] = [
  { id: "api-gateway", name: "API Gateway", uptime: 99.98, replicas: 3, version: "1.14.2", dependencies: ["inference-orchestrator", "notification-service"], region: "ap-southeast-3a" },
  { id: "inference-orchestrator", name: "Inference Orchestrator", uptime: 99.95, replicas: 4, version: "2.4.1", dependencies: ["feature-pipeline", "model-service", "graph-service"], region: "ap-southeast-3a" },
  { id: "feature-pipeline", name: "Feature Pipeline", uptime: 99.91, replicas: 4, version: "2.4.1", dependencies: ["data-ingestion"], region: "ap-southeast-3b" },
  { id: "model-service", name: "Model Service", uptime: 99.97, replicas: 6, version: "2.4.1", dependencies: [], region: "ap-southeast-3a" },
  { id: "graph-service", name: "Graph Service", uptime: 99.96, replicas: 2, version: "1.3.0", dependencies: [], region: "ap-southeast-3b" },
  { id: "data-ingestion", name: "Data Ingestion", uptime: 99.82, replicas: 3, version: "3.1.7", dependencies: [], region: "ap-southeast-3a" },
  { id: "scheduler", name: "Scheduler", uptime: 99.99, replicas: 2, version: "1.8.0", dependencies: ["inference-orchestrator", "data-ingestion"], region: "ap-southeast-3a" },
  { id: "notification-service", name: "Notification Service", uptime: 99.94, replicas: 2, version: "1.2.5", dependencies: [], region: "ap-southeast-3b" },
];

export function systemHealth(now: number, scenarioLoad = 0): ServiceHealth[] {
  const minute = Math.floor(now / 60_000);
  return SERVICE_DEFS.map((d, i) => {
    const seed = hashString(`svc:${d.id}`);
    const load = d.id === "feature-pipeline" || d.id === "inference-orchestrator" ? scenarioLoad : 0;
    const cpu = round(28 + latticeNoise(seed, minute) * 22 + i * 1.5 + load * 14, 1);
    const memory = round(41 + latticeNoise(seed + 1, Math.floor(minute / 5)) * 18 + load * 4, 1);
    const latencyMs = Math.round((d.id === "model-service" ? 84 : d.id === "api-gateway" ? 11 : 24) * (1 + latticeNoise(seed + 2, minute) * 0.3 + load * 0.35));
    const errorRate = round((d.id === "data-ingestion" ? 0.006 : 0.0012) + latticeNoise(seed + 3, minute) * 0.002, 4);
    const status: ServiceHealth["status"] = d.id === "data-ingestion" && latticeNoise(seed + 4, Math.floor(minute / 15)) > 0.82 ? "DEGRADED" : cpu > 85 ? "DEGRADED" : "HEALTHY";
    const history = Array.from({ length: 24 }, (_, k) => round(28 + latticeNoise(seed, minute - 23 + k) * 22 + i * 1.5 + (k > 19 ? load * 14 : 0), 1));
    return { ...d, status, latencyMs, cpu, memory, requestsPerMin: Math.round(180 + latticeNoise(seed + 5, minute) * 320 + load * 60), errorRate, history };
  });
}

/* ------------------------------------------------------------------------ */
/* Audit seed                                                               */
/* ------------------------------------------------------------------------ */

export interface AuditSeed {
  timestamp: Date;
  actor: string;
  role: string;
  action: string;
  resource: string;
  requestId: string;
  ipAddress: string;
  environment: string;
  status: string;
  durationMs: number;
  details: Record<string, unknown>;
}

export function auditSeed(): AuditSeed[] {
  const rng = createRng("audit-seed");
  const actors = [
    { actor: "system", role: "service", ip: "10.24.0.12" },
    { actor: "scheduler", role: "service", ip: "10.24.0.18" },
    { actor: "d.santoso", role: "operator", ip: "10.31.4.71" },
    { actor: "a.prasetyo", role: "data_scientist", ip: "10.31.8.22" },
    { actor: "n.wulandari", role: "data_scientist", ip: "10.31.8.29" },
    { actor: "admin.ops", role: "administrator", ip: "10.31.1.5" },
  ];
  const templates: { action: string; resource: () => string; actorIdx: number[]; status?: string }[] = [
    { action: "MODEL_INFERENCE", resource: () => `station:${STATIONS[Math.floor(rng() * STATIONS.length)].name}`, actorIdx: [0, 1] },
    { action: "FORECAST_RUN", resource: () => `forecast:batch:${Math.floor(rng() * 900 + 100)}`, actorIdx: [1] },
    { action: "DATA_INGESTION", resource: () => `telemetry:batch:${Math.floor(rng() * 90000 + 10000)}`, actorIdx: [0] },
    { action: "ALERT_ACKNOWLEDGE", resource: () => `alert:ALR-${Math.floor(rng() * 400 + 1000)}`, actorIdx: [2] },
    { action: "ALERT_RESOLVE", resource: () => `alert:ALR-${Math.floor(rng() * 400 + 1000)}`, actorIdx: [2] },
    { action: "USER_LOGIN", resource: () => "session:console", actorIdx: [2, 3, 4, 5] },
    { action: "MODEL_DEPLOY", resource: () => `model:${MODEL.productionVersion}`, actorIdx: [5] },
    { action: "EXPERIMENT_CREATE", resource: () => `experiment:EXP-0${Math.floor(rng() * 9 + 36)}`, actorIdx: [3, 4] },
    { action: "CONFIG_UPDATE", resource: () => "config:risk-thresholds", actorIdx: [5] },
    { action: "PERMISSION_DENIED", resource: () => "settings:model-registry", actorIdx: [2], status: "DENIED" },
    { action: "EXPORT_REPORT", resource: () => "report:weekly-watershed", actorIdx: [2, 3] },
    { action: "API_KEY_ROTATE", resource: () => "secret:ingest-key-03", actorIdx: [5] },
  ];
  const out: AuditSeed[] = [];
  let t = SIM_BASE_NOW - 40_000;
  for (let i = 0; i < 160; i++) {
    const weight = rng();
    const tpl = weight < 0.42 ? templates[0] : weight < 0.55 ? templates[2] : templates[Math.floor(rng() * templates.length)];
    const a = actors[tpl.actorIdx[Math.floor(rng() * tpl.actorIdx.length)]];
    const failed = rng() < 0.03;
    out.push({
      timestamp: new Date(t),
      actor: a.actor,
      role: a.role,
      action: tpl.action,
      resource: tpl.resource(),
      requestId: `req_${hashString(`audit:${i}`).toString(16).padStart(8, "0")}`,
      ipAddress: a.ip,
      environment: "production",
      status: tpl.status ?? (failed ? "FAILURE" : "SUCCESS"),
      durationMs: Math.round(12 + rng() * 240),
      details: { model_version: MODEL.productionVersion, trace_id: `trace_${hashString(`t:${i}`).toString(16).slice(0, 6)}` },
    });
    t -= Math.round(20_000 + rng() * 420_000);
  }
  return out;
}
