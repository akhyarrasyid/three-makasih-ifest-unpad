/**
 * Curated knowledge corpus for ANCHOR Hydrological Intelligence Platform.
 * Used for strict domain retrieval and grounded answer generation.
 */

export interface KnowledgeDocument {
  id: string;
  topic: "overview" | "methodology" | "segmentation" | "spatial" | "performance" | "data_quality" | "inference" | "alerts" | "stations";
  title: string;
  section: string;
  stationId?: string;
  modelVersion?: string;
  keywords: string[];
  content: string;
}

export const KNOWLEDGE_CORPUS: KnowledgeDocument[] = [
  {
    id: "kb-overview-1",
    topic: "overview",
    title: "ANCHOR Platform Overview",
    section: "System Mission and Watershed Context",
    keywords: ["anchor", "bengawan solo", "kali madiun", "watershed", "river", "purpose", "mission", "das", "overview"],
    content: `ANCHOR stands for Adaptive Node Categorization with Direct-Horizon Optimization and Reconciliation.
It is an operational hydrological intelligence platform purpose-built for the Bengawan Solo watershed (the longest river system in Java, Indonesia, covering over 16,100 km² drainage basin).
The network monitors 30 hydrological stations across East and Central Java: 25 stations on the primary Bengawan Solo mainstem and Kali Madiun sub-basin graph, and 5 auxiliary basin stations.
The platform continuously tracks River Water Level (TMA - Tinggi Muka Air) in metres, predicts water level trajectory up to 72 hours forward, evaluates flood exceedance probabilities, and provides spatial routing intelligence.`,
  },
  {
    id: "kb-overview-2",
    topic: "overview",
    title: "ANCHOR Platform Overview",
    section: "Operational Identities and Access Scope",
    keywords: ["roles", "operator", "data scientist", "administrator", "access", "permissions"],
    content: `ANCHOR features 3 operational identities:
1. Operator (Dewi Santoso): Real-time watershed surveillance, alert acknowledgement, forecast inspection, threshold breach monitoring.
2. Data Scientist (Arif Prasetyo): Model performance benchmarks, ablation experiments, feature attribution, inference traces, and sensor data quality analytics.
3. Administrator (admin.ops): System infrastructure health, audit trail compliance, database configuration, and security settings.`,
  },
  {
    id: "kb-methodology-1",
    topic: "methodology",
    title: "Forecasting Methodology",
    section: "Direct Multi-Horizon Heads vs. Autoregressive Rollout",
    keywords: ["direct multi-horizon", "horizon", "methodology", "autoregressive", "heads", "forecast", "quantiles", "pinball loss", "kenapa direct"],
    content: `Why ANCHOR uses Direct Multi-Horizon forecasting:
Standard autoregressive time-series models (predicting t+1, then feeding t+1 back to predict t+2) suffer from exponential error accumulation and compounding bias during sudden flash-flood surges.
Instead, ANCHOR deploys dedicated Direct Multi-Horizon prediction heads for 6h, 12h, 24h, 48h, and 72h lead times.
Each horizon head is independently optimized using gradient-boosted quantile regression (LightGBM and Extra Trees ensemble).
Quantile loss estimates P05 (lower bound), P50 (median forecast), and P95 (upper bound) to deliver calibrated 90% confidence bands rather than brittle point estimates.`,
  },
  {
    id: "kb-segmentation-1",
    topic: "segmentation",
    title: "Station Segmentation Architecture",
    section: "Categorization: Natural vs. Dam/Weir vs. Mixed Reaches",
    keywords: ["segmentation", "natural", "dam", "weir", "mixed", "category", "perbedaan", "waduk", "bendungan", "kategori"],
    content: `ANCHOR segments the 30 monitoring stations into three hydrological categories based on hydraulic behavior:
1. NATURAL (16 stations, e.g., BS-008 Badegan, BS-017 Karanggeneng): Free-flowing river reaches governed by upstream rainfall-runoff, channel geometry, and gravitational transit time. Routed directly through rainfall-lag features and spatial graph reconciliation.
2. DAM_WEIR (8 stations, e.g., BS-005 Waduk Wonogiri, BS-016 Babat Barrage): Heavily controlled reservoirs and barrages where water levels are dominated by human gate operations, spillway release schedules, and retention storage curves rather than passive hydraulics.
3. MIXED (6 stations, e.g., BS-019 Ujung Pangkah Estuary, BS-030 Bengawan Jero): Complex hydraulic environments influenced by tidal backwater surges, confluence mixing, and active polder drainage pump actuation.
Total count: 16 Natural stations, 8 Dam/Weir stations, and 6 Mixed stations.`,
  },
  {
    id: "kb-spatial-1",
    topic: "spatial",
    title: "Spatial Graph Reconciliation",
    section: "Topological Residual Propagation and Physical Consistency",
    keywords: ["spatial reconciliation", "graph", "residual", "propagation", "topology", "upstream", "downstream", "pengaruh spatial"],
    content: `Spatial Graph Reconciliation is ANCHOR's post-processing hydrodynamic reconciliation layer.
River reaches are represented as a directed acyclic graph (DAG) following the physical flow of the Bengawan Solo river network.
When an upstream station (such as BS-008 Badegan) observes a sudden positive residual anomaly (water level rising faster than the unconstrained ML head predicted due to localized convective cloudburst), the spatial reconciler propagates this residual downstream to Ponorogo (BS-009) → Madiun (BS-011) → Kwadungan (BS-012) using transit-delay damping.
Effect: It eliminates physically impossible forecast inversions (where a downstream station drops while a massive upstream flood crest is traveling toward it) and reduces holdout RMSE from 0.9410 to 0.8387 m (−10.9% error reduction).`,
  },
  {
    id: "kb-performance-1",
    topic: "performance",
    title: "Model Performance and Evaluation",
    section: "Production Metrics for anchor-prod-v2.4.1",
    keywords: ["rmse", "mae", "r2", "metrics", "holdout", "performance", "anchor-prod-v2.4.1", "evaluasi", "akurasi", "berapa rmse"],
    content: `Production Model Specifications (anchor-prod-v2.4.1):
- Holdout RMSE: 0.8387 metres (evaluated on internal holdout window 19 Sep 2025 – 18 May 2026 across 21,780 test observations).
- Mean Absolute Error (MAE): 0.5391 metres.
- R² Score: 0.912.
- 90% Confidence Interval Coverage: 91.4% (well-calibrated against nominal 90% target).
- Public Benchmark Leaderboard RMSE: 1.56296.
- Private Benchmark Leaderboard RMSE: 1.61812.
(Note: Public/private benchmark scores reflect external competitive holdout test sets with differing station baselines, whereas 0.8387 m is the operational multi-station holdout metric).`,
  },
  {
    id: "kb-performance-2",
    topic: "performance",
    title: "Model Performance and Evaluation",
    section: "Benchmark Lineage and Ablation Study",
    keywords: ["ablation", "lineage", "baseline", "lightgbm", "extra trees", "random forest", "ensemble"],
    content: `Benchmark Progression:
1. Climatology Baseline: RMSE 1.8420 m
2. Persistence Baseline (last known TMA): RMSE 1.4820 m
3. Global LightGBM (single model without segmentation): RMSE 1.1890 m
4. Segmented Model (Natural / Dam / Mixed routing): RMSE 1.0420 m
5. Direct Multi-Horizon Quantile Heads: RMSE 0.9410 m
6. Spatial Graph Reconciliation Ensemble (anchor-prod-v2.4.1): RMSE 0.8387 m
Ablation finding: Removing spatial graph reconciliation increases RMSE to 0.9410 m (+12.2% degradation). Removing station segmentation increases RMSE to 1.0420 m (+24.2% degradation).`,
  },
  {
    id: "kb-data-quality-1",
    topic: "data_quality",
    title: "Sensor Data Quality & Telemetry",
    section: "Telemetry Ingestion, Missingness and Outliers",
    keywords: ["data quality", "missing", "outliers", "completeness", "dq", "sensor", "stale", "latency", "anomali", "berapa data missing"],
    content: `Telemetry and Data Quality Baseline:
- Training observations: 84,396 (1 Jan 2023 – 18 Sep 2025).
- Test observations: 21,780 (19 Sep 2025 – 18 May 2026).
- Missing data points: 4,884 observations across the dataset.
- Overall missing rate: 5.47% (overall sensor completeness: 94.53%).
- Flagged physical outliers: 150 points exceeding the 4σ rolling window filter (excluded from model training to prevent gradient corruption).
- Automatic Anomaly Detectors:
  1. GAP detector: flags telemetry gaps > 2 hours; linear interpolation is withheld.
  2. SPIKE detector: detects sudden TMA delta without corresponding upstream or rainfall build-up.
  3. FLATLINE detector: flags sensors reporting identical continuous float values for > 6 hours (stuck float gauge).
  4. SCHEMA detector: quarantines packets with corrupt headers or missing rainfall units.`,
  },
  {
    id: "kb-inference-1",
    topic: "inference",
    title: "AI Inference System Architecture",
    section: "Latency, Feature Store and Pipeline Cadence",
    keywords: ["inference", "latency", "p50", "p95", "feature store", "pipeline", "cadence"],
    content: `Inference Pipeline Metrics:
- Median Inference Latency (P50): 164 milliseconds.
- Tail Latency (P95): 244 milliseconds.
- Pipeline Cadence: Batch forecast cycles trigger every 10 minutes, generating 210 predictions across 30 stations and 7 horizons.
- On-Demand Inference: Operators can manually trigger instant re-inference for any station with trace logging.
- Trace Identifiers: Every inference execution emits a deterministic requestId (e.g., req_8f2c9a31) and traceId for full operational auditability.`,
  },
  {
    id: "kb-alerts-1",
    topic: "alerts",
    title: "Operational Alerting Framework",
    section: "Severity Thresholds and Escalation Policy",
    keywords: ["alert", "warning", "critical", "threshold", "tma", "acknowledge", "resolve", "snooze", "policy", "station mana yang warning"],
    content: `Alert Severity Definitions:
1. CRITICAL: Observed or 6h forecasted TMA ≥ 100% of station alert threshold (e.g. BS-030 Bengawan Jero ≥ 2.90 m). Demands immediate downstream barrage coordination and provincial civil protection notification.
2. WARNING: TMA ≥ 80% of alert threshold with positive trend (> +0.08 m/h).
3. MODERATE: TMA ≥ 60% of alert threshold.
4. DATA_QUALITY: Sensor stale > 3 hours or packet latency > 30 minutes (e.g., BS-027 Lorog stale telemetry).
5. MODEL: Inference confidence drops below 70% or residual error exceeds 3σ (e.g., BS-019 tidal degradation).
Operators can Acknowledge (assigns handler), Resolve (closes incident), or Snooze (silences alert for 30–60 min).`,
  },
  {
    id: "kb-stations-1",
    topic: "stations",
    title: "Key Monitoring Stations",
    section: "BS-017 Karanggeneng Station Profile",
    stationId: "BS-017",
    keywords: ["bs-017", "karanggeneng", "kenapa bs-017", "rising", "alert-1412"],
    content: `Station Profile: BS-017 (Karanggeneng)
- Basin: Bengawan Solo Hilir (Lowland mainstem reach).
- Category: NATURAL.
- Warning Threshold: 4.64 m. Alert/Critical Threshold: 5.80 m.
- Current Telemetry: 4.71 m (exceeding warning threshold, active alert ALR-1412).
- Trend: Rising (+0.04 m/h) due to upstream flood propagation from Babat Barrage (BS-016) and convective rainfall in Bojonegoro.
- Downstream Target: Sembayat Barrage (BS-021), currently operating with gates open at 40% capacity to absorb inflow.
- Forecast: Projected to rise to 4.88 m over the next 12h before cresting as upstream hydrographs flatten.`,
  },
  {
    id: "kb-stations-2",
    topic: "stations",
    title: "Key Monitoring Stations",
    section: "BS-008 Badegan Station Profile",
    stationId: "BS-008",
    keywords: ["bs-008", "badegan", "kali madiun", "upstream"],
    content: `Station Profile: BS-008 (Badegan)
- Basin: Upper Kali Madiun sub-basin (Headwaters reach).
- Category: NATURAL.
- Warning Threshold: 3.20 m. Alert Threshold: 3.80 m.
- Current Telemetry: Steady at 1.84 m in base conditions; serves as the primary early-warning sensor for the Madiun flash-flood scenario.
- Hydrodynamic Transit Time: Flood crests at Badegan propagate to Ponorogo (BS-009) in ~3.5 hours and to Madiun city (BS-011) in ~7 hours.`,
  },
  {
    id: "kb-stations-3",
    topic: "stations",
    title: "Key Monitoring Stations",
    section: "BS-030 Bengawan Jero Station Profile",
    stationId: "BS-030",
    keywords: ["bs-030", "bengawan jero", "polder", "pompa"],
    content: `Station Profile: BS-030 (Bengawan Jero)
- Basin: Lamongan Lowland Polder System.
- Category: MIXED.
- Warning Threshold: 2.32 m. Alert Threshold: 2.90 m.
- Characteristics: Vulnerable to backwater stagnation when Bengawan Solo mainstem is high. Polder drainage pump operations dictate water level drawdowns. Model residual monitoring active (ALR-1407) due to pump cycle step changes.`,
  },
];
