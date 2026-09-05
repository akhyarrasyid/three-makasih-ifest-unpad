import { MODEL, DATASET } from "@/config/constants";
import type { AblationEntry, BenchmarkEntry, Experiment, FeatureImportance, FoldResult, ModelVersion } from "@/types/domain";

export const BENCHMARKS: BenchmarkEntry[] = [
  { id: "persistence", label: "Persistence", rmse: 1.3099, stage: "baseline", description: "Last observed value carried forward for all horizons." },
  { id: "seasonal-naive", label: "Seasonal Naive", rmse: 1.0414, stage: "baseline", description: "Same hour / same day-of-week value from the previous cycle." },
  { id: "boosting-recursive", label: "Boosting Recursive", rmse: 1.0827, stage: "baseline", description: "Single gradient-boosting model, predictions fed back recursively." },
  { id: "segmented", label: "Station Segmentation", rmse: 0.9064, stage: "iteration", description: "Dam/Weir → climatology, Mixed → hybrid, Natural → ML." },
  { id: "direct-mh", label: "Direct Multi-Horizon", rmse: 0.8508, stage: "iteration", description: "Independent heads per horizon anchored at t₀ — no error feedback." },
  { id: "spatial", label: "Spatial Reconciliation", rmse: 0.8387, stage: "final", description: "Residual graph projection using river distance ⊕ residual correlation." },
];

export const ABLATIONS: AblationEntry[] = [
  { id: "final", label: "Final Pipeline", rmse: 0.8387, delta: 0, description: "Segmentation + Direct MH + Spatial Reconciliation" },
  { id: "spectral", label: "Spectral Correction", rmse: 0.943, delta: 0.1043, description: "Replace graph reconciliation with spectral residual filtering" },
  { id: "atlas", label: "Residual Atlas + Routing", rmse: 0.953, delta: 0.1143, description: "Static residual atlas lookup instead of learned reconciliation" },
  { id: "clim-all", label: "Climatology All Stations", rmse: 1.311, delta: 0.4723, description: "Climatology applied to every station, no ML branch" },
];

export const FOLDS: FoldResult[] = [
  { origin: "Origin 1", originDate: "2025-09-19", rmse: 0.8124, mae: 0.5211, observations: 5445, byHorizon: [{ horizon: 1, rmse: 0.31 }, { horizon: 3, rmse: 0.47 }, { horizon: 6, rmse: 0.63 }, { horizon: 12, rmse: 0.79 }, { horizon: 24, rmse: 0.94 }, { horizon: 48, rmse: 1.08 }, { horizon: 72, rmse: 1.17 }] },
  { origin: "Origin 2", originDate: "2025-11-18", rmse: 0.8679, mae: 0.5588, observations: 5445, byHorizon: [{ horizon: 1, rmse: 0.34 }, { horizon: 3, rmse: 0.52 }, { horizon: 6, rmse: 0.69 }, { horizon: 12, rmse: 0.86 }, { horizon: 24, rmse: 1.01 }, { horizon: 48, rmse: 1.15 }, { horizon: 72, rmse: 1.24 }] },
  { origin: "Origin 3", originDate: "2026-01-17", rmse: 0.8812, mae: 0.5702, observations: 5445, byHorizon: [{ horizon: 1, rmse: 0.35 }, { horizon: 3, rmse: 0.54 }, { horizon: 6, rmse: 0.71 }, { horizon: 12, rmse: 0.88 }, { horizon: 24, rmse: 1.03 }, { horizon: 48, rmse: 1.17 }, { horizon: 72, rmse: 1.27 }] },
  { origin: "Origin 4", originDate: "2026-03-18", rmse: 0.7933, mae: 0.5064, observations: 5445, byHorizon: [{ horizon: 1, rmse: 0.29 }, { horizon: 3, rmse: 0.45 }, { horizon: 6, rmse: 0.61 }, { horizon: 12, rmse: 0.76 }, { horizon: 24, rmse: 0.91 }, { horizon: 48, rmse: 1.05 }, { horizon: 72, rmse: 1.13 }] },
];

export const FEATURE_IMPORTANCE: FeatureImportance[] = [
  { feature: "tma_lag_1h", group: "hydrological", importance: 0.184 },
  { feature: "tma_lag_3h", group: "hydrological", importance: 0.121 },
  { feature: "tma_rolling_mean_24h", group: "hydrological", importance: 0.093 },
  { feature: "tma_diff_1h", group: "hydrological", importance: 0.087 },
  { feature: "upstream_tma_lag_travel", group: "spatial", importance: 0.082 },
  { feature: "rain_sum_6h", group: "rainfall", importance: 0.071 },
  { feature: "rain_sum_24h", group: "rainfall", importance: 0.058 },
  { feature: "upstream_rain_sum_12h", group: "spatial", importance: 0.049 },
  { feature: "hour_sin", group: "temporal", importance: 0.037 },
  { feature: "day_of_year_cos", group: "temporal", importance: 0.034 },
  { feature: "climatology_same_day", group: "temporal", importance: 0.031 },
  { feature: "station_category", group: "station", importance: 0.028 },
  { feature: "catchment_area_log", group: "station", importance: 0.024 },
  { feature: "tma_rolling_std_24h", group: "hydrological", importance: 0.022 },
  { feature: "residual_neighbour_mean", group: "spatial", importance: 0.021 },
  { feature: "downstream_gate_state", group: "station", importance: 0.018 },
];

export const MODEL_VERSIONS: ModelVersion[] = [
  {
    version: MODEL.productionVersion,
    name: "ANCHOR Production",
    status: "PRODUCTION",
    architecture: ["Station Segmentation", "Direct Multi-Horizon", "Spatial Graph Reconciliation"],
    trainingWindow: { start: DATASET.trainingStart, end: DATASET.trainingEnd, observations: DATASET.trainingObservations },
    testWindow: { start: DATASET.testStart, end: DATASET.testEnd, observations: DATASET.testObservations },
    createdAt: "2026-04-28T03:12:00Z",
    deployedAt: "2026-05-02T01:00:00Z",
    metrics: { rmseHoldout: 0.8387, rmsePublic: 1.56296, rmsePrivate: 1.61812, mae: 0.5391, mape: 9.8, r2: 0.912, coverage90: 0.893 },
    latencyP50Ms: 142,
    latencyP95Ms: 214,
    inferenceCount: 1_284_112,
    driftScore: 0.041,
    ensemble: [...MODEL.ensemble],
    features: 86,
    artifactSizeMb: 412,
    owner: "hydro-ml-platform",
  },
  {
    version: "anchor-cand-v2.5.0-rc1",
    name: "Spectral + Graph Candidate",
    status: "CANDIDATE",
    architecture: ["Station Segmentation", "Direct Multi-Horizon", "Spatial Graph Reconciliation", "Spectral Residual Filter"],
    trainingWindow: { start: DATASET.trainingStart, end: DATASET.trainingEnd, observations: DATASET.trainingObservations },
    testWindow: { start: DATASET.testStart, end: DATASET.testEnd, observations: DATASET.testObservations },
    createdAt: "2026-05-14T09:41:00Z",
    metrics: { rmseHoldout: 0.8412, mae: 0.5417, mape: 9.9, r2: 0.91, coverage90: 0.901 },
    latencyP50Ms: 168,
    latencyP95Ms: 251,
    inferenceCount: 18_420,
    driftScore: 0.038,
    ensemble: ["LightGBM", "Extra Trees", "Random Forest", "CatBoost"],
    features: 94,
    artifactSizeMb: 486,
    owner: "hydro-ml-research",
  },
  {
    version: "anchor-prod-v2.3.0",
    name: "Direct Multi-Horizon",
    status: "ARCHIVED",
    architecture: ["Station Segmentation", "Direct Multi-Horizon"],
    trainingWindow: { start: DATASET.trainingStart, end: "2025-08-31", observations: 82_910 },
    testWindow: { start: "2025-09-01", end: "2026-03-31", observations: 19_120 },
    createdAt: "2026-03-11T06:20:00Z",
    deployedAt: "2026-03-14T01:00:00Z",
    metrics: { rmseHoldout: 0.8508, mae: 0.5488, mape: 10.2, r2: 0.905, coverage90: 0.882 },
    latencyP50Ms: 118,
    latencyP95Ms: 176,
    inferenceCount: 3_914_226,
    driftScore: 0.067,
    ensemble: [...MODEL.ensemble],
    features: 74,
    artifactSizeMb: 356,
    owner: "hydro-ml-platform",
  },
  {
    version: "anchor-prod-v2.2.0",
    name: "Segmented Boosting",
    status: "ARCHIVED",
    architecture: ["Station Segmentation", "Recursive Boosting"],
    trainingWindow: { start: DATASET.trainingStart, end: "2025-06-30", observations: 78_452 },
    testWindow: { start: "2025-07-01", end: "2026-01-31", observations: 17_880 },
    createdAt: "2026-01-19T04:02:00Z",
    deployedAt: "2026-01-22T01:00:00Z",
    metrics: { rmseHoldout: 0.9064, mae: 0.5912, mape: 11.1, r2: 0.889, coverage90: 0.861 },
    latencyP50Ms: 96,
    latencyP95Ms: 151,
    inferenceCount: 2_207_910,
    driftScore: 0.112,
    ensemble: ["LightGBM"],
    features: 61,
    artifactSizeMb: 148,
    owner: "hydro-ml-platform",
  },
  {
    version: "anchor-stg-v2.4.2",
    name: "Production Hotfix (feature schema)",
    status: "STAGING",
    architecture: ["Station Segmentation", "Direct Multi-Horizon", "Spatial Graph Reconciliation"],
    trainingWindow: { start: DATASET.trainingStart, end: DATASET.trainingEnd, observations: DATASET.trainingObservations },
    testWindow: { start: DATASET.testStart, end: DATASET.testEnd, observations: DATASET.testObservations },
    createdAt: "2026-05-16T11:05:00Z",
    metrics: { rmseHoldout: 0.8387, mae: 0.5391, mape: 9.8, r2: 0.912, coverage90: 0.893 },
    latencyP50Ms: 139,
    latencyP95Ms: 208,
    inferenceCount: 4_102,
    driftScore: 0.041,
    ensemble: [...MODEL.ensemble],
    features: 86,
    artifactSizeMb: 412,
    owner: "hydro-ml-platform",
  },
];

export const DRIFT_TIMELINE = Array.from({ length: 30 }, (_, i) => {
  const day = i - 29;
  const psi = 0.028 + Math.abs(Math.sin(i * 0.61)) * 0.018 + (i > 22 ? (i - 22) * 0.0022 : 0);
  return { day, psi: Number(psi.toFixed(4)), rmseRolling: Number((0.81 + Math.sin(i * 0.4) * 0.035 + (i > 24 ? 0.012 : 0)).toFixed(4)) };
});

export const RESIDUAL_BY_CATEGORY = [
  { category: "NATURAL", bias: 0.021, rmse: 0.872, n: 13_794 },
  { category: "MIXED", bias: -0.008, rmse: 0.744, n: 3_630 },
  { category: "DAM_WEIR", bias: 0.004, rmse: 0.612, n: 4_356 },
];

export const ERROR_BY_HORIZON = [
  { horizon: 1, rmse: 0.32, mae: 0.21, coverage: 0.93 },
  { horizon: 3, rmse: 0.5, mae: 0.33, coverage: 0.92 },
  { horizon: 6, rmse: 0.66, mae: 0.43, coverage: 0.9 },
  { horizon: 12, rmse: 0.82, mae: 0.53, coverage: 0.89 },
  { horizon: 24, rmse: 0.97, mae: 0.62, coverage: 0.88 },
  { horizon: 48, rmse: 1.11, mae: 0.71, coverage: 0.87 },
  { horizon: 72, rmse: 1.2, mae: 0.77, coverage: 0.86 },
];

export const EXPERIMENTS: Experiment[] = [
  { id: "EXP-042", name: "Spatial Reconciliation", owner: "a.prasetyo", dataset: "bs-v3 / 84,396 obs", model: "seg + direct-mh + graph", parameters: { lambda: 0.32, neighbours: 6, distance_kernel: "exp", corr_threshold: 0.35, heads: 7 }, rmse: 0.8387, mae: 0.5391, status: "COMPLETED", createdAt: "2026-04-27T14:20:00Z", durationMin: 212, tags: ["graph", "production-candidate"], artifacts: [{ name: "model.pkl", sizeMb: 412, kind: "model" }, { name: "residual_graph.npz", sizeMb: 3.1, kind: "graph" }, { name: "metrics.json", sizeMb: 0.02, kind: "metrics" }], notes: "Promoted to production as anchor-prod-v2.4.1. Largest gains at Ngawi confluence and Kali Madiun chain." },
  { id: "EXP-041", name: "Direct Multi-Horizon", owner: "a.prasetyo", dataset: "bs-v3 / 84,396 obs", model: "seg + direct-mh", parameters: { heads: 7, n_estimators: 900, learning_rate: 0.03, max_depth: 8 }, rmse: 0.8508, mae: 0.5488, status: "COMPLETED", createdAt: "2026-03-09T09:02:00Z", durationMin: 168, tags: ["forecasting"], artifacts: [{ name: "model.pkl", sizeMb: 356, kind: "model" }, { name: "metrics.json", sizeMb: 0.02, kind: "metrics" }], notes: "Eliminated recursive error compounding at 48h/72h horizons." },
  { id: "EXP-040", name: "Station Segmentation", owner: "n.wulandari", dataset: "bs-v3 / 84,396 obs", model: "seg + recursive-boosting", parameters: { segments: 3, dam_strategy: "climatology", mixed_weight: 0.58 }, rmse: 0.9064, mae: 0.5912, status: "COMPLETED", createdAt: "2026-01-16T07:45:00Z", durationMin: 94, tags: ["segmentation"], artifacts: [{ name: "model.pkl", sizeMb: 148, kind: "model" }, { name: "segments.csv", sizeMb: 0.01, kind: "table" }], notes: "Dams/weirs are dominated by gate operations; climatology outperformed ML by 0.21 RMSE for that segment." },
  { id: "EXP-039", name: "Spectral Correction", owner: "r.hartono", dataset: "bs-v3 / 84,396 obs", model: "seg + direct-mh + spectral", parameters: { fft_window: 168, bands: 4, damping: 0.6 }, rmse: 0.943, mae: 0.612, status: "COMPLETED", createdAt: "2026-04-12T16:31:00Z", durationMin: 141, tags: ["ablation"], artifacts: [{ name: "model.pkl", sizeMb: 388, kind: "model" }], notes: "Spectral filter over-smoothed rapid rises; rejected." },
  { id: "EXP-038", name: "Residual Atlas + Routing", owner: "r.hartono", dataset: "bs-v3 / 84,396 obs", model: "seg + direct-mh + atlas", parameters: { atlas_bins: 24, routing: "static" }, rmse: 0.953, mae: 0.621, status: "COMPLETED", createdAt: "2026-04-05T10:12:00Z", durationMin: 77, tags: ["ablation"], artifacts: [{ name: "atlas.parquet", sizeMb: 11.4, kind: "table" }], notes: "Static atlas fails to adapt to shifting residual structure in the wet season." },
  { id: "EXP-037", name: "Climatology All Stations", owner: "n.wulandari", dataset: "bs-v3 / 84,396 obs", model: "climatology", parameters: { window_days: 15 }, rmse: 1.311, mae: 0.88, status: "COMPLETED", createdAt: "2025-12-20T08:00:00Z", durationMin: 6, tags: ["baseline", "ablation"], artifacts: [{ name: "climatology.parquet", sizeMb: 2.2, kind: "table" }], notes: "Lower bound reference." },
  { id: "EXP-036", name: "Recursive Boosting", owner: "a.prasetyo", dataset: "bs-v2 / 84,396 obs", model: "lightgbm-recursive", parameters: { n_estimators: 600, learning_rate: 0.05 }, rmse: 1.0827, mae: 0.712, status: "COMPLETED", createdAt: "2025-12-14T13:22:00Z", durationMin: 58, tags: ["baseline"], artifacts: [{ name: "model.pkl", sizeMb: 92, kind: "model" }], notes: "Error compounding beyond 12h." },
  { id: "EXP-035", name: "Seasonal Naive", owner: "system", dataset: "bs-v2 / 84,396 obs", model: "seasonal-naive", parameters: { period: 168 }, rmse: 1.0414, mae: 0.69, status: "COMPLETED", createdAt: "2025-12-10T02:00:00Z", durationMin: 2, tags: ["baseline"], artifacts: [], notes: "Baseline." },
  { id: "EXP-034", name: "Persistence", owner: "system", dataset: "bs-v2 / 84,396 obs", model: "persistence", parameters: {}, rmse: 1.3099, mae: 0.86, status: "COMPLETED", createdAt: "2025-12-10T01:50:00Z", durationMin: 1, tags: ["baseline"], artifacts: [], notes: "Baseline." },
  { id: "EXP-043", name: "Graph λ sweep", owner: "a.prasetyo", dataset: "bs-v3 / 84,396 obs", model: "seg + direct-mh + graph", parameters: { lambda: "0.1…0.6", neighbours: 6 }, rmse: 0.8391, mae: 0.5402, status: "RUNNING", createdAt: "2026-05-18T01:12:00Z", durationMin: 84, tags: ["graph", "sweep"], artifacts: [], notes: "Sweep in progress — 7/12 configs complete." },
  { id: "EXP-044", name: "CatBoost ensemble member", owner: "r.hartono", dataset: "bs-v3 / 84,396 obs", model: "seg + direct-mh(+catboost) + graph", parameters: { members: 4, catboost_depth: 8 }, rmse: 0.8412, mae: 0.5417, status: "COMPLETED", createdAt: "2026-05-13T22:40:00Z", durationMin: 264, tags: ["ensemble", "candidate"], artifacts: [{ name: "model.pkl", sizeMb: 486, kind: "model" }], notes: "Marginal degradation vs production; latency +18%." },
  { id: "EXP-045", name: "Rainfall radar features", owner: "n.wulandari", dataset: "bs-v3 + radar / 84,396 obs", model: "seg + direct-mh + graph", parameters: { radar_grid_km: 2, lags: "0-6h" }, rmse: 0, mae: 0, status: "QUEUED", createdAt: "2026-05-18T02:05:00Z", durationMin: 0, tags: ["features"], artifacts: [], notes: "Waiting for GPU pool." },
  { id: "EXP-033", name: "Transformer sequence model", owner: "r.hartono", dataset: "bs-v2 / 84,396 obs", model: "temporal-fusion", parameters: { d_model: 128, heads: 4, epochs: 40 }, rmse: 0, mae: 0, status: "FAILED", createdAt: "2025-12-02T18:00:00Z", durationMin: 31, tags: ["deep-learning"], artifacts: [], notes: "OOM on fold 3; deprioritised due to data volume." },
];
