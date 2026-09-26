/**
 * Curated knowledge corpus for TIRTA (Topology-Informed River Transmission Alert).
 * Used for strict domain retrieval and grounded answer generation in the TIRTA Assistant.
 */

export interface KnowledgeDocument {
  id: string;
  topic:
    | "overview"
    | "methodology"
    | "directed_graph"
    | "reachability"
    | "validation"
    | "gbdt_ensemble"
    | "directed_gnn"
    | "cold_start"
    | "performance"
    | "data_integrity"
    | "alerts";
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
    title: "TIRTA Platform Overview",
    section: "Product Identity and Scientific Mission",
    keywords: ["tirta", "topology", "river transmission", "alert", "water stress", "huc12", "ifest", "dac", "purpose", "mission"],
    content: `TIRTA stands for Topology-Informed River Transmission Alert.
It is an operational AI early-warning and river-basin intelligence platform designed for next-month water-stress risk forecasting across interconnected HUC12 sub-basins, developed for the IFEST DAC 2026 competition.
Spatial unit: HUC12 sub-basins.
Forecast horizon: Next Month (Month t+1).
Primary evaluation metric: Average Precision (PR-AUC).
Topology: Physical directed river graph derived from id -> to_id downstream routing.
The system serves water-resource agencies, drought planners, hydrology analysts, and watershed managers.`,
  },
  {
    id: "kb-problem-1",
    topic: "methodology",
    title: "Scientific Problem & Target Formulation",
    section: "Continuous Probability and Dataset Geometry",
    keywords: ["dataset", "target", "probability", "pr-auc", "average precision", "rows", "origins", "huc12"],
    content: `The competition task is to predict next-month water-stress risk: P(water stress at month t+1) in [0, 1].
Core dataset scale:
- 378,780 training rows across 2,196 historical HUC12 sub-basins.
- 11,928 test rows across 2,982 test HUC12 sub-basins.
- 168 historical monthly origins (reconstructed into 14 annual blocks with September → August chronology).
- 4 future test origins concentrated in February, April, October, and December.
- Historical positive water-stress prevalence: ~20.4%.
- Evaluation metric: Average Precision (PR-AUC).`,
  },
  {
    id: "kb-lineage-1",
    topic: "data_integrity",
    title: "Temporal Lineage Reconstruction",
    section: "Solving the Hidden Origin Timeline",
    keywords: ["temporal lineage", "timeline", "fingerprint", "lags", "origins", "chronology", "reconstruction"],
    content: `Training data provided monthly snapshots with unlabelled origin identifiers.
Because monthly lag features share temporal fingerprints between true consecutive months:
q(t)_lag0 ≈ q(t+1)_lag1  and  q(t)_lag1 ≈ q(t+1)_lag2.
By evaluating cross-origin correlation across hundreds of HUC12 sub-basins, the team reconstructed all 168 origins into an unbroken chronological sequence of 14 annual cycles (14 × 12 months), following an inferred September → August annual hydrological year.
This discovery was critical to preventing temporal leakage during validation.`,
  },
  {
    id: "kb-validation-1",
    topic: "validation",
    title: "Stress-Test Validation Framework",
    section: "Chronology-Aware Forward Validation vs. Naive Random CV",
    keywords: ["validation", "stress-test", "chronology", "forward validation", "random cv", "leakage", "holdout"],
    content: `Why Naive Random CV fails: Rows one month apart share 11 of 12 lag values. Random IID splits produce misleadingly high AP (~0.8421) that fails to generalize.
TIRTA implements Stress-Test Validation (Chronology-Aware Forward Validation) with four safeguards:
1. Temporal Lineage Reconstruction: enforces strict T_train < T_val constraint.
2. Temporal Gap: separates training from evaluation to mirror operational lead-time.
3. Whole-Basin Holdout: evaluates cold-start spatial generalization on basins never seen during training.
4. Climatology Masking: ensures seasonal baseline anomalies are evaluated on future-like origin distributions.
Stress-test validation AP aligns faithfully with public leaderboard behavior.`,
  },
  {
    id: "kb-graph-1",
    topic: "directed_graph",
    title: "Directed River Topology (id -> to_id)",
    section: "Physical Flow Directionality",
    keywords: ["directed river graph", "id", "to_id", "topology", "dag", "flow", "upstream", "downstream"],
    content: `Dataset relation: id -> to_id represents physical downstream river flow from node to receiving downstream node.
The graph is directed and acyclic (DAG).
The network distinguishes:
- Upstream tributary drainage networks.
- Target HUC12 sub-basin.
- Downstream receiving channels and terminal outlets.
TIRTA extracts topological depth, distance to ocean outlet, headwater status, and connected basin counts.`,
  },
  {
    id: "kb-reachability-1",
    topic: "reachability",
    title: "Directed Multi-Hop Reachability",
    section: "1–3 Hop Upstream & Downstream Context",
    keywords: ["multi-hop reachability", "1-hop", "2-hop", "3-hop", "reachability", "upstream mean supply", "node anomaly"],
    content: `Directed Multi-Hop Reachability exposes:
N_upstream^1(v), N_upstream^2(v), N_upstream^3(v)
and downstream paths.
Key engineered signals:
- Upstream mean supply (1–3 hops).
- Upstream minimum supply.
- Upstream withdrawal pressure.
- Maximum upstream risk score.
- Node-vs-upstream anomaly (contrast between local supply and contributing upstream network).
- Reachable basin count and outlet distance.`,
  },
  {
    id: "kb-water-budget-1",
    topic: "methodology",
    title: "Water-Budget Intelligence & Proxies",
    section: "Physical Drivers and SUI-Like Limitation Proxy",
    keywords: ["water availability", "streamflow", "baseflow", "quickflow", "withdrawal", "sui", "limitation proxy"],
    content: `Core hydrological quantities: streamflow, baseflow, quickflow, cumulative supply, irrigation withdrawal, public supply withdrawal, thermoelectric withdrawal, climatology, seasonal anomaly.
Conceptual relationship:
Water Availability Proxy ≈ Water Supply − Withdrawal Pressure.
Relative Water Limitation ≈ 1 − (Availability / Typical Seasonal Supply).
UI language explicitly notes this as an analytical 'SUI-like proxy' or 'Water-limitation proxy', never as an official SUI.`,
  },
  {
    id: "kb-models-1",
    topic: "gbdt_ensemble",
    title: "Modeling Path A: GBDT Ensemble",
    section: "CatBoost, LightGBM, and XGBoost Roles",
    keywords: ["gbdt", "catboost", "lightgbm", "xgboost", "ensemble", "tabular"],
    content: `Modeling Path A uses gradient-boosted decision trees over the unified 25-dimensional feature space (local hydrology, withdrawals, climatology, and 3-hop directed reachability):
- CatBoost: Primary nonlinear tabular learner (iterations 375, depth 7, lr 0.045).
- LightGBM: Complementary leaf-wise tree booster (num_leaves 31, lr 0.025).
- XGBoost: Regularized depth-wise boosting for model diversity (max_depth 7, lr 0.03).
Optimal blend weights determined via Dirichlet search: CatBoost 0.625, LightGBM 0.225, XGBoost 0.150.`,
  },
  {
    id: "kb-gnn-1",
    topic: "directed_gnn",
    title: "Modeling Path B: Directed Reachability GNN",
    section: "Neural Message Passing on River Networks",
    keywords: ["gnn", "directed reachability gnn", "message passing", "layers", "pytorch", "research"],
    content: `Directed Reachability GNN architecture:
- Input: 25 hydrological and water-budget node features.
- Adjacency: Sparse upstream and downstream reachability operators with decay factor 0.70^k for hops 1..3.
- Layers: 3 Directed Reachability layers with independent upstream linear projections, downstream projections, GELU activations, LayerNorm, and residual skip connections.
- Status: RESEARCH candidate.
- Strict temporal validation AP: 0.7641.`,
  },
  {
    id: "kb-performance-1",
    topic: "performance",
    title: "Model Performance & Provenance Labels",
    section: "Public Score vs. Internal Validation Truth",
    keywords: ["0.7329", "0.7590", "0.7641", "score", "provenance", "public leaderboard", "validation ap"],
    content: `Performance Score Provenance:
- 0.7329: VERIFIED PUBLIC SCORE (Tabular baseline CatBoost on Kaggle public leaderboard).
- 0.7590: STRESS-TEST VALIDATION (CatBoost with 3-hop directed reachability features).
- 0.7608: INTERNAL VALIDATION (GBDT Ensemble).
- 0.7641: INTERNAL RESEARCH EVALUATION (Directed Reachability GNN on Block 13 test origin months).
TIRTA strictly displays provenance badges for every score to maintain complete scientific integrity. 0.7641 is never claimed as a verified public score.`,
  },
  {
    id: "kb-cold-start-1",
    topic: "cold_start",
    title: "Cold-Start Spatial Generalization",
    section: "Handling Unseen Test Sub-Basins",
    keywords: ["cold start", "spatial generalization", "unseen basins", "confidence"],
    content: `A substantial portion of test HUC12 sub-basins (~26%, 786 basins) are located in watersheds absent from the 14-year training history.
Rather than generic missing data, TIRTA models this explicitly as cold-start spatial generalization:
- Basin-specific identity embeddings are decoupled.
- Topological river DAG reachability and climatological anomaly priors are preserved.
- Model output confidence is adjusted (uncertainty interval widened from ±0.08 to ±0.15).`,
  },
  {
    id: "kb-ablations-1",
    topic: "methodology",
    title: "Ablation Study Key Findings",
    section: "Empirical Evidence Across Feature Families",
    keywords: ["ablation", "findings", "supported", "rejected", "overfit", "climatology"],
    content: `Key findings:
1. Climatology Anomaly (+0.0482 AP, SUPPORTED): Strongest single feature family by a wide margin.
2. Directed Multi-Hop Reachability (+0.0261 AP, SUPPORTED): Upstream deficits reliably predict downstream stress.
3. Temporal Lineage (+0.0215 AP, SUPPORTED): Essential for unbiased chronological validation.
4. Month-Specific Sub-Models (-0.0194 AP, OVERFIT): Degraded forward generalization due to limited historical years per month.
5. Aggressive Reranking (-0.0284 AP, REJECTED): Distorted natural seasonal prevalence differences.`,
  },
];
