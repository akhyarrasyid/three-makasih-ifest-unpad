/** Central configuration + design constants for TIRTA.
 * Topology-Informed River Transmission Alert
 * Directed Water-Stress Intelligence · IFEST DAC 2026
 */

export const PRODUCT = {
  name: "TIRTA",
  fullName: "Topology-Informed River Transmission Alert",
  tagline: "Directed Water-Stress Intelligence",
  subtitle: "Directed Water-Stress Intelligence",
  description:
    "AI-powered early-warning and river-basin intelligence platform for next-month water-stress risk across interconnected HUC12 sub-basins.",
  framework: "Topology-Informed River Transmission Alert",
  domain: "Water-Stress Early Warning",
  spatialUnit: "HUC12 Sub-Basin",
  forecastHorizon: "Next Month",
  primaryMetric: "Average Precision / PR-AUC",
  topology: "Directed River Graph",
  environment: "DEMO ENVIRONMENT",
  region: "ifest-dac-2026",
} as const;

export const SCORES = {
  verifiedPublicAp: 0.7329,
  publicLeaderboard: 0.7329, // alias
  graphCatboostAp: 0.7590,
  directedGnnAp: 0.7641,
  gbdtEnsembleAp: 0.7608,
  hybridCandidateAp: 0.7652,
  naiveRandomCvAp: 0.8421, // misleading diagnostic baseline
} as const;

export const PROVENANCE_BADGES = {
  PUBLIC_VERIFIED: {
    label: "VERIFIED PUBLIC",
    score: SCORES.verifiedPublicAp,
    description: "Verified competition public leaderboard score.",
    tone: "ok",
  },
  INTERNAL_CV: {
    label: "INTERNAL VALIDATION",
    score: SCORES.gbdtEnsembleAp,
    description: "Internal cross-validation on historical monthly blocks.",
    tone: "water",
  },
  STRESS_TEST: {
    label: "STRESS-TEST VALIDATION",
    score: SCORES.graphCatboostAp,
    description: "Chronology-aware forward validation with temporal gap and basin holdouts.",
    tone: "water",
  },
  RESEARCH_GNN: {
    label: "RESEARCH GNN",
    score: SCORES.directedGnnAp,
    description: "Internal research evaluation on strict temporal holdout snapshots.",
    tone: "violet",
  },
  DEMO_TELEMETRY: {
    label: "DEMO TELEMETRY",
    score: null,
    description: "Simulated runtime latency and resource statistics for demonstration.",
    tone: "warn",
  },
} as const;

export const MODEL = {
  productionVersion: "tirta-tabular-baseline-v1",
  championVersion: "tirta-graph-catboost-v1",
  researchVersion: "tirta-directed-gnn-v1",
  verifiedPublicScore: SCORES.verifiedPublicAp,
  stressTestAp: SCORES.graphCatboostAp,
  gnnResearchAp: SCORES.directedGnnAp,
  models: [
    {
      id: "tirta-tabular-baseline-v1",
      name: "Tabular Baseline CatBoost",
      provenance: "VERIFIED PUBLIC",
      metricLabel: "Public AP",
      metricValue: SCORES.verifiedPublicAp,
      status: "PUBLIC-VERIFIED",
    },
    {
      id: "tirta-graph-catboost-v1",
      name: "Graph-Aware CatBoost (+3-Hop Reachability)",
      provenance: "STRESS-TEST VALIDATION",
      metricLabel: "Stress-Test AP",
      metricValue: SCORES.graphCatboostAp,
      status: "VALIDATED",
    },
    {
      id: "tirta-gbdt-ensemble-v1",
      name: "GBDT Ensemble (CatBoost + LightGBM + XGBoost)",
      provenance: "INTERNAL VALIDATION",
      metricLabel: "Validation AP",
      metricValue: SCORES.gbdtEnsembleAp,
      status: "CANDIDATE",
    },
    {
      id: "tirta-directed-gnn-v1",
      name: "Directed Reachability GNN",
      provenance: "INTERNAL VALIDATION",
      metricLabel: "Research AP",
      metricValue: SCORES.directedGnnAp,
      status: "RESEARCH",
    },
    {
      id: "tirta-hybrid-research-v1",
      name: "Hybrid GBDT-GNN Research Fusion (0.90 + 0.10)",
      provenance: "INTERNAL VALIDATION",
      metricLabel: "Research AP",
      metricValue: SCORES.hybridCandidateAp,
      status: "RESEARCH",
    },
  ],
} as const;

export const DATASET = {
  trainingRows: 378780,
  testRows: 11928,
  historicalHuc12: 2196,
  testHuc12: 2982,
  trainingSubBasins: 2196, // alias
  testSubBasins: 2982, // alias
  historicalOrigins: 168,
  futureTestOrigins: 4,
  testOriginMonths: ["February", "April", "October", "December"],
  historicalStressRate: 0.204, // ~20.4% positive water-stress rate
  positiveRateHistorical: 0.204, // alias
  inferredCycle: "September → August",
  demoBasinsCount: 42,
  directedGraphHops: 3,
  inputFeaturesCount: 25,
} as const;

/**
 * Operational base timestamp: initialized to real-time current clock.
 * Telemetry and forecasts in demo environment anchor to the current moment.
 */
export const SIM_BASE_NOW =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_TIMESTAMP
    ? Number(process.env.NEXT_PUBLIC_BASE_TIMESTAMP)
    : Date.now();

export const SIM_TICK_MS = 30 * 24 * 60 * 60 * 1000; // each demo tick advances 1 monthly origin
export const DEMO_INTERVAL_MS = 6000;

/** Water-stress risk tiers (interpretation of model continuous probability). */
export const RISK_THRESHOLDS = {
  LOW: 0.25,
  MODERATE: 0.50,
  HIGH: 0.75,
  CRITICAL: 0.90,
} as const;

export const ROLE_LABELS: Record<string, string> = {
  operator: "Water Operator",
  data_scientist: "Data Scientist / ML Engineer",
  administrator: "Watershed Administrator",
};
