export type StationCategory = "DAM_WEIR" | "MIXED" | "NATURAL";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type StationStatus = "ONLINE" | "STALE" | "OFFLINE";
export type TrendDirection = "RISING" | "FALLING" | "STABLE";
export type ForecastStrategy = "CLIMATOLOGY" | "HYBRID" | "DIRECT_MULTI_HORIZON";
export type Role = "operator" | "data_scientist" | "administrator";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO" | "DATA_QUALITY" | "MODEL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "SNOOZED" | "RESOLVED";

export const FORECAST_HORIZONS = [1, 3, 6, 12, 24, 48, 72] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export interface Thresholds {
  normal: number;
  warning: number;
  alert: number;
  critical: number;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  category: StationCategory;
  river: string;
  basin: string;
  primaryNetwork: boolean;
  elevationM: number;
  catchmentKm2: number;
  thresholds: Thresholds;
  upstreamStations: string[];
  downstreamStations: string[];
  strategy: ForecastStrategy;
  installedAt: string;
  sensorType: string;
}

export interface TelemetryPoint {
  t: number; // epoch ms
  tma: number | null;
  rainfall: number; // mm/h
  quality: "GOOD" | "INTERPOLATED" | "MISSING" | "OUTLIER";
}

export interface ForecastPoint {
  t: number;
  horizon: number;
  predicted: number;
  lower: number;
  upper: number;
  climatology: number;
  actual?: number | null;
}

export interface ForecastConfidence {
  score: number; // 0..1
  drivers: { label: string; contribution: number }[];
  reconciliationAdjustment: number;
  uncertaintyM: number;
}

export interface StationSnapshot {
  station: Station;
  currentTma: number;
  previousTma: number;
  trend: TrendDirection;
  trendRatePerHour: number;
  forecast24h: number;
  forecast6h: number;
  risk: RiskLevel;
  riskScore: number;
  thresholdRatio: number;
  status: StationStatus;
  lastUpdated: number;
  freshnessSec: number;
  rainfall1h: number;
  rainfall24h: number;
  dataQualityScore: number;
  missingRate24h: number;
  modelVersion: string;
  upstreamInfluence: number;
  activeAlerts: number;
  sparkline: number[];
}

export interface StationDetail extends StationSnapshot {
  confidence: ForecastConfidence;
  residualCorrelations: { stationId: string; correlation: number; riverDistanceKm: number }[];
  rainfallCorrelation: { lagHours: number; correlation: number }[];
  inferenceHistory: InferenceRequest[];
  routing: RoutingStep[];
}

export interface RoutingStep {
  id: string;
  label: string;
  detail: string;
  durationMs: number;
  kind: "input" | "router" | "model" | "graph" | "output";
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  riverDistanceKm: number;
  travelTimeH: number;
  residualCorrelation: number;
  weight: number;
  segmentFlow: number; // normalized 0..1
}

export interface NetworkGraph {
  nodes: StationSnapshot[];
  edges: NetworkEdge[];
  riverPaths: { id: string; name: string; points: [number, number][] }[];
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  stationId: string | null;
  source: string;
  status: AlertStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  assignedTo: string | null;
  snoozedUntil: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  fromScenario: boolean;
}

export interface ModelMetrics {
  rmseHoldout: number;
  rmsePublic?: number;
  rmsePrivate?: number;
  mae: number;
  mape: number;
  r2: number;
  coverage90: number;
}

export interface ModelVersion {
  version: string;
  name: string;
  status: "PRODUCTION" | "STAGING" | "ARCHIVED" | "CANDIDATE";
  architecture: string[];
  trainingWindow: { start: string; end: string; observations: number };
  testWindow: { start: string; end: string; observations: number };
  createdAt: string;
  deployedAt?: string;
  metrics: ModelMetrics;
  latencyP50Ms: number;
  latencyP95Ms: number;
  inferenceCount: number;
  driftScore: number;
  ensemble: string[];
  features: number;
  artifactSizeMb: number;
  owner: string;
}

export interface BenchmarkEntry {
  id: string;
  label: string;
  rmse: number;
  stage: "baseline" | "iteration" | "final";
  description: string;
}

export interface AblationEntry {
  id: string;
  label: string;
  rmse: number;
  delta: number;
  description: string;
}

export interface FoldResult {
  origin: string;
  originDate: string;
  rmse: number;
  mae: number;
  observations: number;
  byHorizon: { horizon: number; rmse: number }[];
}

export interface FeatureImportance {
  feature: string;
  group: "temporal" | "hydrological" | "rainfall" | "spatial" | "station";
  importance: number;
}

export interface Experiment {
  id: string;
  name: string;
  owner: string;
  dataset: string;
  model: string;
  parameters: Record<string, string | number | boolean>;
  rmse: number;
  mae: number;
  status: "COMPLETED" | "RUNNING" | "FAILED" | "QUEUED";
  createdAt: string;
  durationMin: number;
  tags: string[];
  artifacts: { name: string; sizeMb: number; kind: string }[];
  notes: string;
}

export interface TraceSpan {
  service: string;
  durationMs: number;
  status: "ok" | "error";
  attributes?: Record<string, string | number>;
}

export interface InferenceRequest {
  requestId: string;
  traceId: string;
  timestamp: string;
  stationId: string;
  modelVersion: string;
  latencyMs: number;
  status: "SUCCESS" | "ERROR" | "TIMEOUT" | "DEGRADED";
  horizons: number[];
  featureCount: number;
  route: string[];
  confidence: number;
  spans: TraceSpan[];
  worker: string;
  errorMessage?: string;
}

export interface InferenceMetrics {
  requestsPerSec: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRate: number;
  throughputPerMin: number;
  queueDepth: number;
  activeWorkers: number;
  totalWorkers: number;
  timeline: { t: number; rps: number; p95: number; errors: number }[];
}

export interface ServiceHealth {
  id: string;
  name: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs: number;
  cpu: number;
  memory: number;
  requestsPerMin: number;
  errorRate: number;
  uptime: number;
  replicas: number;
  version: string;
  dependencies: string[];
  region: string;
  history: number[];
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  requestId: string;
  ipAddress: string;
  environment: string;
  status: string;
  durationMs: number | null;
  details: Record<string, unknown>;
}

export interface DataQualityReport {
  summary: {
    recordsProcessed: number;
    missingValues: number;
    missingRate: number;
    outliers: number;
    duplicates: number;
    staleStations: number;
    schemaViolations: number;
    trainingObservations: number;
    testObservations: number;
  };
  missingnessHeatmap: {
    stations: string[];
    dates: string[];
    values: number[][]; // station x date missing fraction 0..1
  };
  anomalyTimeline: {
    id: string;
    t: string;
    stationId: string;
    type: "OUTLIER" | "GAP" | "SPIKE" | "FLATLINE" | "SCHEMA";
    magnitude: number;
    description: string;
  }[];
  stationQuality: { stationId: string; completeness: number; outliers: number; latencySec: number }[];
}

export interface OverviewData {
  generatedAt: number;
  simulatedNow: number;
  modelVersion: string;
  freshnessSec: number;
  systemStatus: "OPERATIONAL" | "DEGRADED" | "INCIDENT";
  kpis: {
    stations: number;
    primaryNetwork: number;
    trainingObservations: number;
    testObservations: number;
    holdoutRmse: number;
    missingRate: number;
  };
  riskDistribution: Record<RiskLevel, number>;
  categoryDistribution: Record<StationCategory, number>;
  stations: StationSnapshot[];
  openAlerts: number;
  criticalAlerts: number;
  forecastOverview: {
    t: number;
    horizonLabel: string;
    stations: { id: string; predicted: number; lower: number; upper: number }[];
  }[];
  networkForecast: { t: number; actual: number | null; predicted: number; lower: number; upper: number }[];
  recentEvents: SimEvent[];
  scenario: ScenarioState;
}

export type SimEventType =
  | "DATA_INGESTED"
  | "FORECAST_COMPLETED"
  | "ALERT_CREATED"
  | "ALERT_ACKNOWLEDGED"
  | "INFERENCE_COMPLETED"
  | "MODEL_METRIC_UPDATED"
  | "STATION_STATUS_CHANGED";

export interface SimEvent {
  id: string;
  type: SimEventType;
  timestamp: number;
  message: string;
  stationId?: string;
  severity?: "info" | "warning" | "critical";
}

export interface ScenarioState {
  tick: number;
  phase: "IDLE" | "RAINFALL" | "RISING" | "PROPAGATION" | "ALERT" | "RECOVERY";
  description: string;
  focusStationId: string;
  upstreamStationId: string;
}

export interface SearchResult {
  type: "station" | "alert" | "model" | "experiment" | "inference";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}
