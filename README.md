# TIRTA

## Topology-Informed River Transmission Alert

### Directed Water-Stress Intelligence · IFEST DAC 2026

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**TIRTA** (*Topology-Informed River Transmission Alert*) is an operational decision-support prototype and early-warning intelligence platform for forecasting next-month water-stress risk ($P(\text{water stress at month } t+1) \in [0, 1]$) across interconnected **HUC12 sub-basins**, derived from the team's methodology for the **IFEST Data Analytics Competition (DAC) 2026**.

The platform translates competitive machine learning and graph neural network research into an instrument-grade monitoring system for watershed operators, drought response planners, hydrology analysts, and climate-risk engineers.

---

## 🔬 1. Scientific Problem & Dataset Scale

The objective is to predict whether an individual HUC12 sub-basin will experience water stress in the upcoming calendar month:

$$\hat{y}_v^{(t+1)} = P(\text{water stress at month } t+1 \mid \mathcal{H}_v^{(t)}, \mathcal{G})$$

where $\mathcal{H}_v^{(t)}$ represents the historical water-budget, climatological, and withdrawal state for sub-basin $v$, and $\mathcal{G} = (\mathcal{V}, \mathcal{E})$ represents the physical directed drainage network.

- **Prediction Target**: Continuous probability $P(\text{water stress at month } t+1) \in [0, 1]$
- **Primary Evaluation Metric**: Average Precision (PR-AUC)
- **Dataset Dimensions**:
  - **Training Observations**: 378,780 rows across 2,196 historical HUC12 sub-basins
  - **Test Observations**: 11,928 rows across 2,982 test HUC12 sub-basins
  - **Historical Origins**: 168 monthly blocks reconstructed into 14 annual cycles (September → August)
  - **Future Test Origins**: 4 concentrated seasonal horizons (February, April, October, December)
  - **Historical Positive Stress Prevalence**: ~20.4%
  - **Cold-Start Generalization**: ~26% of test sub-basins (786 basins) are completely absent from training history, requiring strict topological generalization rather than memorized basin embeddings.

---

## 🗺️ 2. The Central Research Progression

TIRTA embodies a disciplined scientific narrative that rejects treating sub-basins as independent, identically distributed (I.I.D.) rows:

```text
Raw Water-Budget Data (Streamflow, Baseflow, Quickflow, Withdrawals)
        ↓
Data Integrity & Forensic Normalization (Locale conversion, unit corrections)
        ↓
Hidden Temporal Structure Discovered (Lag fingerprinting: q(t)_lag0 ≈ q(t+1)_lag1)
        ↓
Temporal Lineage Reconstruction (14 annual 12-month blocks: Sep → Aug)
        ↓
Train-Test Distribution Shift Diagnosed (Adversarial validation on seasonal test months)
        ↓
Stress-Test Validation (Chronology-aware forward evaluation with temporal gaps)
        ↓
Directed River Topology Reconstruction (Physical DAG: id → to_id)
        ↓
Hydrology-Aware Feature Engineering (6 conceptual feature families)
        ↓
Directed Multi-Hop Reachability (Row-safe 1–3 hop upstream/downstream aggregation)
        ↓
        ┌─────────────────────────────────────────┐
        │                                         │
        ▼                                         ▼
GBDT Tabular Ensemble                       Directed Reachability GNN
CatBoost (Nonlinear tabular learner)        3 Reachability Message-Passing Layers
LightGBM (Leaf-wise gradient booster)       Bidirectional Upstream/Downstream Messages
XGBoost (Regularized tree learner)          Residual Node Fusion + LayerNorm
        │                                         │
        └────────────────────┬────────────────────┘
                             ↓
                 Model Comparison & Fusion
                             ↓
              Next-Month Water-Stress Probability
                             ↓
                 Operational Early Warning
```

---

## 🛡️ 3. Stress-Test Validation Methodology

Standard random $k$-fold cross-validation is fundamentally misleading in hydrological autoregressive data because adjacent monthly rows for the same basin share 11 of 12 lag features ($lag_1 \dots lag_{11}$). Naive random splits produce artificially inflated scores ($\text{AP} \approx 0.8421$) that collapse upon deployment.

TIRTA enforces **Stress-Test Validation** (*Chronology-Aware Forward Validation*) built upon four non-negotiable safeguards:

1. **Temporal Lineage Reconstruction**: The 168 unlabelled origins were reconstructed into chronological order using cross-origin lag fingerprints, recovering 14 annual blocks with September → August seasonal trajectory.
2. **Whole-Basin Holdout**: Sub-basins are partitioned by contiguous geographic basins, forcing models to evaluate cold-start spatial generalization.
3. **Climatology Masking**: Synthetic ablation verifies that predictions reflect true drought signal rather than calendar memorization.
4. **Temporal Gap + Historical Anchor**: Past historical blocks are used for training, followed by a temporal buffer gap, before evaluating on future forward blocks.

```text
[ Historical Blocks 1 ... 12 ] ──> [ Temporal Gap ] ──> [ Forward Validation Block 13 ]
           Training Rows                                        Evaluation Split
```

---

## 🌊 4. Directed River Topology & Multi-Hop Reachability

Water flows strictly downstream according to gravity and topography:

$$\text{Edge: } u \to v \iff \text{HUC } u \text{ drains into receiving downstream HUC } v$$

### Directed Multi-Hop Reachability Operators

Rather than generic graph features, TIRTA explicitly constructs directed hydrological operators:

- **1-Hop Upstream Inflows** ($N_{\text{upstream}}^1(v)$): Immediate tributary basins feeding into basin $v$.
- **2-Hop & 3-Hop Upstream Networks** ($N_{\text{upstream}}^2(v)$, $N_{\text{upstream}}^3(v)$): Extended contributing catchment up to 3 hops upstream.
- **Direct Downstream Path** ($N_{\text{downstream}}^{1..3}(v)$): Receiving river corridor transmitting flow toward the basin outlet.

### Extracted Reachability Signals:
- **Upstream Mean & Minimum Water Supply**: Catchment baseline availability before reaching target.
- **Upstream Withdrawal Pressure**: Cumulative irrigation, municipal, and thermoelectric extractions upstream.
- **Upstream Water Limitation Proxy**: Human extraction pressure vs. natural baseflow.
- **Maximum Upstream Risk**: Early propagation warning of approaching deficit fronts.
- **Node-vs-Upstream Contrast**: Detecting local anomalies where a basin experiences drought despite healthy upstream inflow.

---

## ⚡ 5. Model Architecture & Dual-Branch Strategy

TIRTA provides two distinct, complementary modeling paths:

### Branch A: Graph-Aware GBDT Ensemble
- **CatBoost**: Primary nonlinear tabular learner optimized for tabular interactions.
- **LightGBM**: Fast leaf-wise tree booster providing complementary gradient coverage.
- **XGBoost**: Regularized depth-wise tree learner preventing localized overfitting.
- **Convex Dirichlet Blend**: $0.625 \times \text{CatBoost} + 0.225 \times \text{LightGBM} + 0.150 \times \text{XGBoost}$.

### Branch B: Directed Reachability Graph Neural Network (GNN)
- **Node Representation**: 25 physical water-budget and topographical features per HUC12.
- **Graph Topology**: Directed edge index ($\text{id} \to \text{to\_id}$) preserving hydrological drainage direction.
- **Architecture**:
  - Multi-Layer Perceptron (MLP) Feature Encoder
  - 3 Directed Reachability Layers with directional message passing:
    - $\mathbf{m}_{u \to v}^{(\text{up})}$ (aggregating upstream contributing inflows)
    - $\mathbf{m}_{w \to v}^{(\text{down})}$ (aggregating downstream back-propagation context)
  - Residual Node Fusion + Layer Normalization
  - Calibrated Probability Head

---

## 📊 6. Strict Metric Provenance & Verification

To maintain scientific rigor and prevent misleading claims, all metrics in TIRTA are strictly tagged with explicit provenance badges:

| Model Architecture | Metric AP (PR-AUC) | Provenance Level | Status | Scope / Description |
| :--- | :---: | :--- | :--- | :--- |
| **Tabular Baseline CatBoost** | **0.7329** | `VERIFIED PUBLIC` | Verified Baseline | Official verified score on the competition public leaderboard. |
| **Graph-Aware CatBoost (+3-Hop)** | **0.7590** | `STRESS-TEST VALIDATION` | Validated Champion | Evaluated on forward validation with chronological gap. |
| **GBDT Ensemble Blend** | **0.7608** | `INTERNAL VALIDATION` | Candidate | Convex blend of CatBoost, LightGBM, and XGBoost. |
| **Directed Reachability GNN** | **0.7641** | `INTERNAL VALIDATION` | Research Candidate | 3-layer GNN evaluated on strict temporal holdout snapshots. |
| **Hybrid Research Fusion** | **0.7652** | `INTERNAL VALIDATION` | Research Lab | 0.90 GBDT + 0.10 GNN calibrated probability blend. |

> **Critical Provenance Policy**: `0.7329` is the verified public leaderboard benchmark. `0.7590` and `0.7641` represent internal Stress-Test validation findings and research evaluations; they are never represented as public leaderboard scores.

---

## 🧪 7. Ablation Study & Empirical Findings

Component contributions evaluated against the baseline:

| Hypothesis / Component | Family | Delta AP | Status | Scientific Evidence |
| :--- | :--- | :---: | :---: | :--- |
| **Seasonal Climatology Anomaly** | `seasonal_climatology` | **+0.0482** | `SUPPORTED` | Highest individual permutation importance. Exposes deficit far earlier than raw streamflow. |
| **Directed 3-Hop Reachability** | `directed_reachability` | **+0.0261** | `SUPPORTED` | Elevates tabular AP from 0.7329 to 0.7590. Upstream deficit transmits downstream. |
| **Temporal Lineage Reconstruction** | `temporal_lineage` | **+0.0215** | `SUPPORTED` | Recovers 14 annual blocks (Sep → Aug). Prevents temporal data leakage during CV. |
| **SUI-Like Water-Limitation Proxy** | `water_limitation` | **+0.0142** | `IMPROVED` | $1 - \frac{\text{Supply} - \text{Withdrawal}}{\text{Climatology}}$ separates human pressure from natural meteorological drought. |
| **Cold-Start Specialist Formulation** | `basin_context` | **+0.0118** | `IMPROVED` | Stabilizes prediction on 786 holdout basins absent from training history. |
| **Month-Specific GBDT Sub-Models** | `modeling_architecture` | **-0.0194** | `OVERFIT` | Degraded forward evaluation. Too few historical years per calendar month. |
| **Aggressive Rank Normalization** | `calibration` | **-0.0284** | `REJECTED` | Distorts natural prevalence differences between wet and dry test origins. |
| **Naive Random IID Cross-Validation** | `validation_protocol` | **-0.0782** | `REJECTED` | Yielded illusory high CV (0.8421) due to lag overlap; completely failed deployment geometry. |

---

## 💻 8. Application Information Architecture

The TIRTA web application is structured around an operational command center workflow:

### Operations
1. **Overview (`/overview`)**: Command center displaying regional forecast totals, stress prevalence, and critical deficit basins.
2. **Basin Monitor (`/monitoring`)**: Monthly water-budget inspector (streamflow, baseflow, quickflow, sectoral withdrawals, SUI limitation proxy).
3. **Forecasts (`/forecasts`)**: Next-month water-stress probability forecast with causal contribution waterfalls.
4. **River Network (`/network`)**: Level-of-Detail SVG directed DAG network with 1–3 hop upstream/downstream filters and risk overlays.
5. **Risk Alerts (`/alerts`)**: 10 domain alert types (Water Stress Critical, Supply Deficit, Upstream Propagation, Cold-Start Confidence, etc.) with operational triage.

### Intelligence
6. **Water Availability (`/water-availability`)**: Analytical decomposition of water supply vs. human sectoral extractions (irrigation, municipal, thermoelectric).
7. **HUC12 Sub-Basin Explorer (`/explorer` & `/stations`)**: Interactive filterable sub-basin catalog with search and metadata inspection.
8. **Graph Intelligence (`/graph`)**: Mathematical DAG topology analysis, reachability traces, and topological metrics.
9. **Feature Intelligence (`/features` & `/data-quality`)**: Explanatory breakdown of the 6 feature families and forensic data integrity auditing.

### AI & Research
10. **Model Intelligence (`/models`)**: Dual-branch model registry comparing GBDT learners with the Directed Reachability GNN.
11. **Stress-Test Validation (`/validation` & `/experiments`)**: Detailed interactive breakdown of the 4 validation safeguards and experiment logs.
12. **Ablation Study (`/ablations`)**: Empirical component matrix displaying supported, improved, overfit, and rejected hypotheses.
13. **AI Inference Control Plane (`/inference`)**: End-to-end trace waterfall displaying telemetry, GBDT, GNN, and fusion execution.

### Platform
14. **System Health (`/system`)**: Simulated production MLOps service mesh (Data Ingestion, Hydrology, Feature Store, GBDT, GNN, Risk Engine).
15. **Methodology & Architecture (`/architecture`)**: End-to-end research methodology and engineering pipeline.
16. **Audit Logs (`/audit`)**: Immutable operational event logs.

---

## 🛠️ 9. Local Development & Build

### Prerequisites
- **Node.js**: 20.x or higher
- **npm**: 10.x or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/akhyarrasyid/three-makasih-ifest-unpad.git
cd three-makasih-ifest-unpad

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
# Open http://localhost:3000
```

### Quality Assurance & Verification
```bash
# TypeScript strict typechecking (0 errors required)
npm run typecheck

# ESLint inspection (0 errors required)
npm run lint

# Production Next.js build (24 routes static / dynamic optimization)
npm run build
```

---

## ⚖️ 10. Demonstration Disclaimer

TIRTA is an operational research prototype developed for the **IFEST Data Analytics Competition (DAC) 2026**. 

All machine learning model architectures, feature engineering definitions, validation methodologies, reachability graph algorithms, and leaderboard scores ($0.7329$) represent the authentic competition solution. Runtime telemetry metrics (e.g. inference milliseconds, service CPU loads, memory quotas) in the demonstration control plane are deterministic simulated values designed to illustrate operational production behavior. SUI-like metrics represent analytical water-limitation proxies rather than statutory administrative designations.

---

### Team & Credits
**Three Makasih** · IFEST Data Analytics Competition 2026  
*Directed Water-Stress Intelligence through Topology-Informed River Transmission Alerts.*
