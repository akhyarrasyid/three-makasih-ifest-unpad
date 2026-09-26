export type BasinCategory = "HEADWATER" | "TRIBUTARY" | "CONFLUENCE" | "MAINSTEM" | "OUTLET";
export type StationCategory = BasinCategory | "DAM_WEIR" | "MIXED" | "NATURAL";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type StationStatus = "ONLINE" | "STALE" | "OFFLINE";
export type TrendDirection = "RISING" | "FALLING" | "STABLE";
export type ForecastStrategy =
  | "TABULAR_BASELINE"
  | "GRAPH_CATBOOST"
  | "GBDT_ENSEMBLE"
  | "DIRECTED_GNN"
  | "CLIMATOLOGY"
  | "HYBRID"
  | "DIRECT_MULTI_HORIZON";

export type Role = "operator" | "data_scientist" | "administrator";

export type ScoreProvenance =
  | "VERIFIED PUBLIC"
  | "INTERNAL VALIDATION"
  | "STRESS-TEST VALIDATION"
  | "DEMO TELEMETRY";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO" | "DATA_QUALITY" | "MODEL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "SNOOZED" | "RESOLVED";
export type AlertAction = "acknowledge" | "resolve" | "snooze" | "assign" | "reopen";

export type AlertType =
  | "WATER_STRESS_HIGH"
  | "WATER_STRESS_CRITICAL"
  | "SUPPLY_DEFICIT"
  | "RAPID_SUPPLY_DECLINE"
  | "WITHDRAWAL_PRESSURE_HIGH"
  | "UPSTREAM_STRESS_PROPAGATION"
  | "COLD_START_LOW_CONFIDENCE"
  | "DATA_QUALITY"
  | "MODEL_CONFIDENCE"
  | "GRAPH_CONTEXT";

export const FORECAST_HORIZONS = [1, 3, 6, 12, 24, 48, 72] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export interface Thresholds {
  normal: number;
  warning: number;
  alert: number;
  critical: number;
}

export interface BasinNode {
  id: string; // e.g. "HUC-DEMO-0014"
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  category: BasinCategory;
  river: string;
  basin: string;
  subBasin: string;
  primaryNetwork: boolean;
  elevationM: number;
  catchmentKm2: number;
  downstreamId: string | null; // id -> to_id physical flow
  upstreamIds: string[];
  graphDepth: number;
  headwater: boolean;
  outletDistanceKm: number;
  coldStart: boolean;
  basinAreaKm2: number;
  population: number;
  streamflow: number; // m3/s or mm/mo
  baseflow: number;
  quickflow: number;
  irrigationWithdrawal: number;
  publicSupplyWithdrawal: number;
  thermoelectricWithdrawal: number;
  totalWithdrawal: number;
  climatology: number;
  supplyRatio: number;
  availabilityProxy: number; // Supply - Withdrawal
  waterLimitationProxy: number; // 1 - Availability / Climatology
  riskScore: number; // continuous probability in [0, 1]
  riskTier: RiskLevel;
  confidence: number;
  thresholds: Thresholds;
  upstreamStations: string[]; // alias
  downstreamStations: string[]; // alias
  strategy: ForecastStrategy;
  installedAt: string;
  sensorType: string;
}

/** Station is aliased to BasinNode for seamless compatibility across existing components */
export type Station = BasinNode;

export interface TelemetryPoint {
  t: number; // epoch ms or month index
  monthLabel?: string;
  monthName?: string;
  tma: number | null; // water availability / supply proxy
  supply: number;
  baseflow: number;
  quickflow: number;
  withdrawal: number;
  climatology: number;
  availabilityProxy: number;
  waterLimitationProxy: number;
  riskScore: number;
  rainfall: number;
  quality: "GOOD" | "INTERPOLATED" | "MISSING" | "OUTLIER";
}

export interface ForecastPoint {
  t: number;
  horizon: number;
  horizonLabel?: string;
  predicted: number; // water-stress probability P(stress at t+1)
  lower: number;
  upper: number;
  climatology: number;
  actual?: number | null;
}

export interface ForecastConfidence {
  score: number; // 0..1
  drivers: { label: string; contribution: number; group: string }[];
  reconciliationAdjustment: number;
  uncertaintyM: number;
  coldStart: boolean;
}

export interface StationSnapshot {
  station: BasinNode;
  basin: BasinNode;
  graphDepth: number; // convenience direct access
  supplyRatio: number;
  irrigationWithdrawal?: number;
  publicSupplyWithdrawal?: number;
  thermoelectricWithdrawal?: number;
  currentSupply: number;
  previousSupply: number;
  currentTma: number; // alias for backwards compatibility
  previousTma: number; // alias
  streamflow: number;
  baseflow: number;
  quickflow: number;
  totalWithdrawal: number;
  withdrawalToSupplyRatio: number;
  climatology: number;
  climatologyAnomalySigma: number;
  availabilityProxy: number;
  waterLimitationProxy: number;
  trend: TrendDirection;
  trendRatePerHour: number;
  forecastMonth: string;
  forecast24h: number; // alias to riskScore
  forecast6h: number; // alias to riskScore
  risk: RiskLevel;
  riskScore: number;
  confidenceScore: number;
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
  upstreamStressScore: number;
  downstreamId: string | null;
  upstreamCount1Hop: number;
  upstreamCount2Hop: number;
  upstreamCount3Hop: number;
  activeAlerts: number;
  sparkline: number[];
  coldStart: boolean;
}

export interface StationDetail extends StationSnapshot {
  confidence: ForecastConfidence;
  reachability: ReachabilityTrace;
  residualCorrelations: { stationId: string; correlation: number; riverDistanceKm: number }[];
  rainfallCorrelation: { lagHours: number; correlation: number }[];
  inferenceHistory: InferenceRequest[];
  routing: RoutingStep[];
}

export interface ReachabilityTrace {
  targetId: string;
  targetName: string;
  upstream1Hop: string[];
  upstream2Hop: string[];
  upstream3Hop: string[];
  downstreamPath: string[];
  upstreamMeanSupply: number;
  upstreamMinSupply: number;
  upstreamWithdrawalPressure: number;
  upstreamMaxRisk: number;
  nodeVsUpstreamAnomaly: number;
  nodeVsDownstreamAnomaly: number;
  reachableBasinsCount: number;
  graphDepth: number;
  outletDistanceKm: number;
  headwater: boolean;
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
  from: string; // upstream
  to: string; // downstream receiving node
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
  ancestors?: Record<string, string[]>;
  descendants?: Record<string, string[]>;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  description: string;
  stationId: string | null;
  basinId: string | null;
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
  risk: number;
  confidence: number;
  origin: string;
  traceId: string;
}

export interface ModelMetrics {
  apScore: number;
  apPublic?: number;
  apStressTest?: number;
  aucPr: number;
  aucRoc: number;
  brierScore: number;
  f1Score: number;
  rmseHoldout?: number;
  rmsePublic?: number;
  rmsePrivate?: number;
  mae?: number;
  mape?: number;
  r2?: number;
  coverage90?: number;
}

export interface ModelVersion {
  version: string;
  name: string;
  description?: string; // alias
  status: "PUBLIC-VERIFIED" | "VALIDATED" | "CANDIDATE" | "RESEARCH" | "ARCHIVED";
  provenance: ScoreProvenance;
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
  featureCount?: number; // alias
  inferenceLatencyMs?: number; // alias
  graphHops: number;
  layers?: number;
  artifactSizeMb: number;
  owner: string;
  prAuc?: number; // alias
}

export interface BenchmarkEntry {
  id: string;
  label: string;
  name?: string; // alias to label
  metricLabel: string;
  family?: string; // alias to metricLabel
  metricValue: number;
  prAuc?: number; // alias to metricValue
  provenance: ScoreProvenance;
  stage: "baseline" | "iteration" | "research" | "final";
  description: string;
  latencyMs?: number;
  rmse?: number;
}

export interface AblationEntry {
  id: string;
  component: string;
  family: string;
  deltaAp: number;
  delta?: number;
  validationAp?: number;
  status: "SUPPORTED" | "IMPROVED" | "NEUTRAL" | "UNSTABLE" | "OVERFIT" | "REJECTED";
  evidence: string;
  finding?: string;
  description: string;
  label?: string;
  rmse?: number;
}

export interface FoldResult {
  origin: string;
  originDate: string;
  ap: number;
  testPositions: string;
  trainBlockCount: number;
  validationBlock: number;
  observations: number;
  byHorizon?: { horizon: number; rmse: number }[];
  rmse?: number;
  mae?: number;
}

export interface FeatureImportance {
  feature: string;
  group:
    | "local_hydrology"
    | "withdrawal_pressure"
    | "seasonal_climatology"
    | "water_limitation"
    | "basin_context"
    | "directed_reachability";
  importance: number; // percentage or relative gain
  description: string;
}

export interface Experiment {
  id: string;
  name: string;
  owner: string;
  dataset: string;
  model: string;
  parameters: Record<string, string | number | boolean>;
  validationAp: number;
  provenance: ScoreProvenance;
  status: "COMPLETED" | "RUNNING" | "FAILED" | "QUEUED";
  createdAt: string;
  durationMin: number;
  tags: string[];
  artifacts: { name: string; sizeMb: number; kind: string }[];
  notes: string;
  rmse?: number;
  mae?: number;
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
  basinId: string;
  modelVersion: string;
  provenance: ScoreProvenance;
  latencyMs: number;
  status: "SUCCESS" | "ERROR" | "TIMEOUT" | "DEGRADED";
  horizons: number[];
  featureCount: number;
  route: string[];
  confidence: number;
  spans: TraceSpan[];
  worker: string;
  isSimulatedDemo: boolean;
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
  role: string;
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
    trainingRows: number;
    testRows: number;
    historicalHuc12: number;
    testHuc12: number;
    historicalOrigins: number;
    testOrigins: number;
    coldStartHuc12: number;
    positiveStressRate: number;
    normalizedNumericLocale: boolean;
    unitAnomaliesCorrected: number;
    structuralDenoisedRows: number;
    missingValues?: number;
    missingRate?: number;
    schemaViolations?: number;
    outliers?: number;
    duplicates?: number;
    staleStations?: number;
    trainingObservations?: number;
    testObservations?: number;
  };
  featureFamilies: {
    name: string;
    description: string;
    featuresCount: number;
    dominantFeature: string;
    contributionRank: number;
  }[];
  temporalReconstruction: {
    totalOrigins: number;
    inferredCycle: string;
    blockStructure: string;
    fingerprintLagFormula: string;
    consecutiveMatchesFound: number;
  };
  missingnessHeatmap?: {
    stations: string[];
    dates: string[];
    values: number[][];
  };
  anomalyTimeline?: {
    id: string;
    t: string;
    stationId: string;
    type: "GAP" | "OUTLIER" | "SPIKE" | "FLATLINE" | "SCHEMA";
    magnitude: number;
    description: string;
  }[];
  stationQuality?: {
    stationId: string;
    completeness: number;
    outliers: number;
    latencySec: number;
  }[];
}

export interface OverviewData {
  generatedAt: number;
  simulatedNow: number;
  currentOrigin: string;
  forecastMonth: string;
  modelVersion: string;
  provenance: ScoreProvenance;
  freshnessSec: number;
  systemStatus: "OPERATIONAL" | "DEGRADED" | "INCIDENT";
  kpis: {
    forecastHuc12: number;
    historicalHuc12: number;
    historicalOrigins: number;
    forecastOrigins: number;
    historicalStressRate: number;
    verifiedPublicAp: number;
    stressTestAp: number;
    gnnResearchAp: number;
    stations: number; // alias
    primaryNetwork: number; // alias
    trainingObservations: number; // alias
    testObservations: number; // alias
    holdoutRmse: number; // alias
    missingRate: number; // alias
  };
  riskDistribution: Record<RiskLevel, number>;
  categoryDistribution: Record<string, number>;
  stations: StationSnapshot[];
  highestRiskBasins: StationSnapshot[];
  largestDeficitBasins: StationSnapshot[];
  upstreamStressBasins: StationSnapshot[];
  coldStartBasins: StationSnapshot[];
  openAlerts: number;
  criticalAlerts: number;
  monthlyStressTimeline: { month: string; historicalRate: number; modelPredictedRate: number }[];
  networkForecast: { t: number; actual: number | null; predicted: number; lower: number; upper: number }[];
  recentEvents: SimEvent[];
  scenario: ScenarioState;
}

export type SimEventType =
  | "DATA_INGESTED"
  | "LINEAGE_RECONSTRUCTED"
  | "GRAPH_AGGREGATED"
  | "FORECAST_COMPLETED"
  | "ALERT_CREATED"
  | "ALERT_ACKNOWLEDGED"
  | "INFERENCE_COMPLETED"
  | "MODEL_METRIC_UPDATED"
  | "BASIN_STATUS_CHANGED"
  | "STATION_STATUS_CHANGED";

export interface SimEvent {
  id: string;
  type: SimEventType;
  timestamp: number;
  message: string;
  stationId?: string;
  basinId?: string;
  severity?: "info" | "warning" | "critical";
}

export interface ScenarioState {
  tick: number;
  phase: "IDLE" | "DEFICIT_DEVELOPING" | "UPSTREAM_PROPAGATION" | "HIGH_STRESS" | "CRITICAL_ALERT" | "RECOVERY";
  description: string;
  focusStationId: string;
  focusBasinId: string;
  upstreamStationId: string;
  upstreamBasinId: string;
}

export interface SearchResult {
  type: "basin" | "station" | "alert" | "model" | "feature" | "inference";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}
