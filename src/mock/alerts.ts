import { SIM_BASE_NOW } from "@/config/constants";
import { hashString } from "@/lib/prng";
import type { AlertSeverity, AlertStatus, AlertType, StationSnapshot } from "@/types/domain";

const H = 3600_000;
const D = 24 * H;

export interface AlertSeed {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  description: string;
  stationId: string | null;
  basinId: string | null;
  source: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  assignedTo?: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
  fromScenario?: boolean;
  correlationId: string;
  risk: number;
  confidence: number;
  origin: string;
  traceId: string;
}

const corr = (id: string) => `req_${hashString(`alert:${id}`).toString(16).padStart(8, "0")}`;

const RAW_SEEDS: Omit<AlertSeed, "correlationId">[] = [
  {
    id: "ALR-2026-01",
    severity: "CRITICAL",
    type: "WATER_STRESS_CRITICAL",
    title: "Critical Next-Month Water Stress Risk at HUC-DEMO-0014",
    description: "Next-month probability P(water stress) = 0.88 (exceeds critical threshold 0.75). Climatology anomaly is -1.42σ with cumulative seasonal deficit. Upstream supply is down 38%.",
    stationId: "HUC-DEMO-0014",
    basinId: "HUC-DEMO-0014",
    source: "risk-engine",
    status: "OPEN",
    createdAt: SIM_BASE_NOW - 1.2 * D,
    risk: 0.88,
    confidence: 0.86,
    origin: "Origin 167 (t-1)",
    traceId: "tr-stress-0014-a",
    metadata: { anomalySigma: -1.42, withdrawalRatio: 0.49, deficitPercent: 38 },
  },
  {
    id: "ALR-2026-02",
    severity: "WARNING",
    type: "UPSTREAM_STRESS_PROPAGATION",
    title: "Upstream Deficit Transmitting to HUC-DEMO-0017",
    description: "1-hop upstream reach HUC-DEMO-0014 is experiencing severe deficit; reachability layer propagated stress increase of +0.24 risk to downstream receiving basin.",
    stationId: "HUC-DEMO-0017",
    basinId: "HUC-DEMO-0017",
    source: "graph-reachability-service",
    status: "OPEN",
    createdAt: SIM_BASE_NOW - 2.4 * D,
    risk: 0.76,
    confidence: 0.84,
    origin: "Origin 167 (t-1)",
    traceId: "tr-reach-0017-b",
    metadata: { upstreamSource: "HUC-DEMO-0014", hopDistance: 1, reachabilityWeight: 0.70 },
  },
  {
    id: "ALR-2026-03",
    severity: "WARNING",
    type: "WITHDRAWAL_PRESSURE_HIGH",
    title: "Excessive Withdrawal-to-Supply Ratio at HUC-DEMO-0022",
    description: "Agricultural irrigation withdrawal has reached 54.8% of available monthly streamflow. SUI-like water-limitation proxy elevated to 0.71.",
    stationId: "HUC-DEMO-0022",
    basinId: "HUC-DEMO-0022",
    source: "water-budget-monitor",
    status: "ACKNOWLEDGED",
    acknowledgedBy: "d.santoso",
    acknowledgedAt: SIM_BASE_NOW - 0.8 * D,
    assignedTo: "d.santoso",
    createdAt: SIM_BASE_NOW - 3.1 * D,
    risk: 0.71,
    confidence: 0.88,
    origin: "Origin 167 (t-1)",
    traceId: "tr-withd-0022-c",
    metadata: { withdrawalRatio: 0.548, limitationProxy: 0.71 },
  },
  {
    id: "ALR-2026-04",
    severity: "WARNING",
    type: "SUPPLY_DEFICIT",
    title: "Rapid Water Supply Decline at HUC-DEMO-0008",
    description: "Monthly water supply decreased by 26% over two consecutive origin snapshots. Climatology departure reached -1.18σ.",
    stationId: "HUC-DEMO-0008",
    basinId: "HUC-DEMO-0008",
    source: "trend-detector",
    status: "OPEN",
    createdAt: SIM_BASE_NOW - 4.2 * D,
    risk: 0.58,
    confidence: 0.89,
    origin: "Origin 166 (t-2)",
    traceId: "tr-decline-0008-d",
    metadata: { declineRate: 0.26, departureSigma: -1.18 },
  },
  {
    id: "ALR-2026-05",
    severity: "INFO",
    type: "COLD_START_LOW_CONFIDENCE",
    title: "Cold-Start Spatial Evaluation at HUC-DEMO-0015",
    description: "Sub-basin was absent from training history. Specialized cold-start inference mode activated; uncertainty interval widened to ±0.15.",
    stationId: "HUC-DEMO-0015",
    basinId: "HUC-DEMO-0015",
    source: "model-monitor",
    status: "OPEN",
    createdAt: SIM_BASE_NOW - 5.5 * D,
    risk: 0.74,
    confidence: 0.72,
    origin: "Origin 167 (t-1)",
    traceId: "tr-cold-0015-e",
    metadata: { coldStart: true, uncertaintyMargin: 0.15 },
  },
  {
    id: "ALR-2026-06",
    severity: "DATA_QUALITY",
    type: "DATA_QUALITY",
    title: "Historical Origin Timeline Verification Completed",
    description: "Fingerprint lag alignment verified across 168 historical origins. Reconstructed into 14 annual blocks with September → August seasonal ordering.",
    stationId: null,
    basinId: null,
    source: "temporal-lineage-service",
    status: "RESOLVED",
    createdAt: SIM_BASE_NOW - 8.0 * D,
    risk: 0.20,
    confidence: 0.99,
    origin: "Full History",
    traceId: "tr-lineage-0001-f",
    metadata: { verifiedBlocks: 14, annualCycle: "Sep-Aug", originsCount: 168 },
  },
  {
    id: "ALR-2026-07",
    severity: "MODEL",
    type: "MODEL_CONFIDENCE",
    title: "Directed Reachability GNN Research Checkpoint",
    description: "3-layer bidirectional reachability network converged at strict temporal AP = 0.7641. Model held in research registry pending formal field calibration.",
    stationId: null,
    basinId: null,
    source: "gnn-inference-service",
    status: "RESOLVED",
    acknowledgedBy: "a.prasetyo",
    acknowledgedAt: SIM_BASE_NOW - 10.0 * D,
    assignedTo: "a.prasetyo",
    createdAt: SIM_BASE_NOW - 12.0 * D,
    risk: 0.18,
    confidence: 0.95,
    origin: "Block 13 Test",
    traceId: "tr-gnn-0001-g",
    metadata: { validationAp: 0.7641, layers: 3, inputDim: 25 },
  },
  {
    id: "ALR-2026-08",
    severity: "WARNING",
    type: "GRAPH_CONTEXT",
    title: "Multi-Hop Confluence Stress Concentration at HUC-DEMO-0021",
    description: "Tri-river confluence receiving combined deficits from Northern Fork and Western Headwaters. Reachability depth = 4.",
    stationId: "HUC-DEMO-0021",
    basinId: "HUC-DEMO-0021",
    source: "graph-reachability-service",
    status: "OPEN",
    createdAt: SIM_BASE_NOW - 2.8 * D,
    risk: 0.52,
    confidence: 0.88,
    origin: "Origin 167 (t-1)",
    traceId: "tr-graph-0021-h",
    metadata: { graphDepth: 4, convergingTributaries: 2 },
  },
];

export const ALERT_SEEDS: AlertSeed[] = RAW_SEEDS.map((a) => ({
  ...a,
  correlationId: corr(a.id),
}));

export function evaluateScenarioAlerts(
  snapshots: Record<string, StationSnapshot>,
  now: number
): AlertSeed[] {
  const out: Omit<AlertSeed, "correlationId">[] = [];
  const focus = snapshots["HUC-DEMO-0014"];
  const downstream = snapshots["HUC-DEMO-0017"];
  if (!focus) return [];

  if (focus.riskScore >= 0.75) {
    out.push({
      id: "ALR-SCENARIO-01",
      severity: "CRITICAL",
      type: "WATER_STRESS_CRITICAL",
      title: "Critical Water Stress Early Warning at HUC-DEMO-0014",
      description: `Predicted next-month stress probability P(t+1) = ${focus.riskScore}. Climatology departure ${focus.climatologyAnomalySigma}σ. Immediate agricultural water conservation recommended.`,
      stationId: "HUC-DEMO-0014",
      basinId: "HUC-DEMO-0014",
      source: "risk-engine",
      status: "OPEN",
      createdAt: now,
      fromScenario: true,
      risk: focus.riskScore,
      confidence: focus.confidenceScore,
      origin: "Forecast Month t+1",
      traceId: "tr-scen-0014",
      metadata: { riskScore: focus.riskScore, supply: focus.currentSupply },
    });
  }

  if (downstream && downstream.riskScore >= 0.65) {
    out.push({
      id: "ALR-SCENARIO-02",
      severity: "WARNING",
      type: "UPSTREAM_STRESS_PROPAGATION",
      title: "Transmitted Upstream Deficit at Receiving Basin HUC-DEMO-0017",
      description: `Physical river routing transmitted headwater deficit down the Southern Valley channel. Risk elevated to ${downstream.riskScore}.`,
      stationId: "HUC-DEMO-0017",
      basinId: "HUC-DEMO-0017",
      source: "graph-reachability-service",
      status: "OPEN",
      createdAt: now,
      fromScenario: true,
      risk: downstream.riskScore,
      confidence: downstream.confidenceScore,
      origin: "Forecast Month t+1",
      traceId: "tr-scen-0017",
      metadata: { upstreamId: "HUC-DEMO-0014", downstreamId: "HUC-DEMO-0017" },
    });
  }

  return out.map((a) => ({ ...a, correlationId: corr(a.id) }));
}
