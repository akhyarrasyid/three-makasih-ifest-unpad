/**
 * Modular RAG Pipeline for TIRTA Intelligence Assistant.
 * Handles Query Rewriting, Hybrid Retrieval, Grounded Generation,
 * and Citation & Action Assembly.
 */

import { KNOWLEDGE_CORPUS, type KnowledgeDocument } from "./knowledge";
import { classifyQuery, type QueryScope } from "./classifier";
import { STATION_MAP } from "@/mock/stations";
import { MODEL, SCORES } from "@/config/constants";

export interface AssistantContext {
  route?: string;
  station_id?: string | null;
  basin_id?: string | null;
  model_version?: string;
  tick?: number;
}

export interface AssistantCitation {
  document: string;
  section: string;
  relevance: number;
  stationId?: string;
  modelVersion?: string;
  excerpt?: string;
}

export interface AssistantAction {
  label: string;
  type: "navigate" | "select_station";
  href: string;
  stationId?: string;
}

export interface AssistantResponse {
  answer: string;
  scope: QueryScope;
  language: "id" | "en";
  citations: AssistantCitation[];
  actions: AssistantAction[];
}

export function rewriteQuery(
  query: string,
  context?: AssistantContext
): { normalizedQuery: string; targetStationId: string | null } {
  let q = query.trim();
  let targetStation: string | null = null;

  // Check explicit HUC12 ID in query (e.g. HUC-DEMO-0014, HUC-0014, 0014)
  const hucMatch = q.match(/HUC(?:-DEMO)?-?(\d{4})/i);
  if (hucMatch) {
    targetStation = `HUC-DEMO-${hucMatch[1].padStart(4, "0")}`;
  } else if (context?.station_id || context?.basin_id) {
    const active = context.station_id || context.basin_id!;
    if (/\b(this basin|sub-basin ini|basin ini|disini|here|di sub-basin ini)\b/i.test(q)) {
      targetStation = active;
      q = q.replace(/\b(this basin|sub-basin ini|basin ini|disini)\b/gi, active);
    }
  }

  // Check basin names
  if (!targetStation) {
    for (const [id, s] of Object.entries(STATION_MAP)) {
      if (new RegExp(`\\b${s.name}\\b`, "i").test(q)) {
        targetStation = id;
        break;
      }
    }
  }

  return { normalizedQuery: q, targetStationId: targetStation };
}

export function retrieveDocuments(
  normalizedQuery: string,
  targetStationId: string | null,
  context?: AssistantContext,
  limit = 3
): { doc: KnowledgeDocument; score: number }[] {
  const queryTokens = normalizedQuery
    .toLowerCase()
    .split(/[^\w\-]+/)
    .filter((t) => t.length > 2);

  const scored = KNOWLEDGE_CORPUS.map((doc) => {
    let score = 0;

    if (targetStationId && doc.stationId === targetStationId) {
      score += 4.0;
    }

    for (const kw of doc.keywords) {
      if (normalizedQuery.toLowerCase().includes(kw.toLowerCase())) {
        score += 2.5;
      }
    }

    for (const token of queryTokens) {
      if (doc.content.toLowerCase().includes(token)) score += 0.8;
      if (doc.title.toLowerCase().includes(token)) score += 1.5;
    }

    return { doc, score };
  });

  return scored
    .filter((x) => x.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function generateGroundedAnswer(
  query: string,
  retrieved: { doc: KnowledgeDocument; score: number }[],
  language: "id" | "en",
  targetStationId: string | null
): string {
  const cleanQ = query.toLowerCase();

  // 1. Inquiries about scores and provenance
  if (/\b(score|skor|akurasi|ap|public|pr-auc|0\.7329|0\.7590|0\.7641)\b/i.test(cleanQ)) {
    if (language === "id") {
      return (
        `Hasil evaluasi model TIRTA dipisahkan secara tegas berdasarkan bukti ilmiah:\n\n` +
        `1. **0.7329 (VERIFIED PUBLIC)**: Tabular Baseline CatBoost pada public leaderboard Kaggle.\n` +
        `2. **0.7590 (STRESS-TEST VALIDATION)**: CatBoost dengan fitur Directed Multi-Hop Reachability (1–3 hops).\n` +
        `3. **0.7608 (INTERNAL VALIDATION)**: GBDT Ensemble (CatBoost + LightGBM + XGBoost).\n` +
        `4. **0.7641 (RESEARCH CANDIDATE)**: Directed Reachability GNN 3-layer pada strict temporal validation.\n\n` +
        `Skor 0.7641 merupakan hasil riset internal pada evaluasi forward temporal, bukan skor public leaderboard yang diverifikasi.`
      );
    }
    return (
      `TIRTA model evaluation is strictly distinguished by evidence provenance:\n\n` +
      `1. **0.7329 (VERIFIED PUBLIC)**: Tabular Baseline CatBoost on Kaggle public leaderboard.\n` +
      `2. **0.7590 (STRESS-TEST VALIDATION)**: CatBoost with Directed Multi-Hop Reachability features (1–3 hops).\n` +
      `3. **0.7608 (INTERNAL VALIDATION)**: GBDT Ensemble blend (0.625 CatBoost + 0.225 LightGBM + 0.150 XGBoost).\n` +
      `4. **0.7641 (RESEARCH CANDIDATE)**: 3-layer Directed Reachability GNN on strict forward temporal evaluation.\n\n` +
      `Note: 0.7641 is an internal research evaluation result and is never misrepresented as a verified public leaderboard score.`
    );
  }

  // 2. Inquiries about why random CV failed / Stress-Test validation
  if (/\b(validation|validasi|random cv|leakage|kebocoran|stress-test)\b/i.test(cleanQ)) {
    if (language === "id") {
      return (
        `Mengapa Naive Random CV gagal dan digantikan oleh Stress-Test Validation:\n\n` +
        `- **Hidden Temporal Overlap**: Baris data satu bulan terpisah berbagi 11 dari 12 nilai lag. Random CV menghasilkan skor optimis semu (AP ≈ 0.8421) yang gagal total pada pengujian masa depan.\n` +
        `- **Empat Safeguard Stress-Test Validation**:\n` +
        `  1. *Temporal Lineage Reconstruction*: Memetakan ulang 168 origin ke dalam 14 siklus tahunan (Sep → Ags) untuk menjaga batasan kronologis T_train < T_val.\n` +
        `  2. *Temporal Gap*: Memisahkan data latih dan validasi untuk meniru kondisi operasional.\n` +
        `  3. *Whole-Basin Holdout*: Menguji generalisasi spatial cold-start pada sub-basin yang tidak pernah dilihat model.\n` +
        `  4. *Climatology Masking*: Menghindari bias musiman.`
      );
    }
    return (
      `Why Naive Random CV failed and was replaced by Stress-Test Validation:\n\n` +
      `- **Hidden Temporal Overlap**: Rows one month apart share 11 of 12 lag values. Random IID cross-validation produces misleadingly optimistic scores (AP ≈ 0.8421) that collapse on deployment.\n` +
      `- **Four Stress-Test Safeguards**:\n` +
      `  1. *Temporal Lineage Reconstruction*: Solves the hidden 168-origin timeline into 14 annual blocks (Sep → Aug) enforcing T_train < T_val.\n` +
      `  2. *Temporal Gap*: Enforces operational lead-time separation between training and evaluation blocks.\n` +
      `  3. *Whole-Basin Holdout*: Explicitly evaluates cold-start spatial generalization on unseen test sub-basins.\n` +
      `  4. *Climatology Masking*: Prevents seasonal leakage across future origin months.`
    );
  }

  // 3. Inquiries about directed river graph and reachability
  if (/\b(graph|graf|topolog|reachability|upstream|downstream|hulu|hilir|hop)\b/i.test(cleanQ)) {
    if (language === "id") {
      return (
        `Directed River Graph dalam TIRTA diturunkan langsung dari relasi fisik id → to_id:\n\n` +
        `- Setiap sub-basin HUC12 adalah node graf, dan aliran air menuju receiving node di hilir adalah directed edge.\n` +
        `- **Directed Multi-Hop Reachability**: Menghitung agregat hidrologi dari 1, 2, hingga 3 hop di hulu (upstream mean supply, minimum supply, withdrawal pressure, dan maximum risk).\n` +
        `- Informasi ini memberi tahu model apakah defisit pasokan di hulu sedang menjalar ke hilir sebelum defisit lokal terjadi.`
      );
    }
    return (
      `The Directed River Graph in TIRTA is derived directly from physical id → to_id downstream flow:\n\n` +
      `- Each HUC12 sub-basin is a graph node; physical river conveyance to the receiving downstream node is a directed edge.\n` +
      `- **Directed Multi-Hop Reachability**: Computes causal hydrological aggregates across 1, 2, and 3 upstream hops (upstream mean supply, minimum supply, withdrawal pressure, and maximum stress risk).\n` +
      `- This topological prior alerts the model when upstream supply shortages are actively propagating downstream before local depletion manifests.`
    );
  }

  // 4. Default grounded response from retrieved knowledge
  if (retrieved.length > 0) {
    const top = retrieved[0].doc;
    return top.content;
  }

  if (language === "id") {
    return `TIRTA adalah platform early-warning risiko water-stress skala sub-basin HUC12 berbasis topologi graf sungai dan machine learning. Silakan tanyakan seputar metodologi validasi, graf terarah, model GBDT/GNN, atau status sub-basin HUC12.`;
  }
  return `TIRTA is an operational HUC12 water-stress early warning platform combining directed river graph learning and hydrological intelligence. Feel free to ask about our stress-test validation, multi-hop reachability, GBDT/GNN models, or specific HUC12 sub-basin states.`;
}

export async function processAssistantQuery(
  query: string,
  context?: AssistantContext
): Promise<AssistantResponse> {
  const classification = classifyQuery(query);

  if (classification.isOutOfScope) {
    return {
      answer: classification.refusalMessage!,
      scope: classification.scope,
      language: classification.language,
      citations: [],
      actions: [],
    };
  }

  const { normalizedQuery, targetStationId } = rewriteQuery(query, context);
  const retrieved = retrieveDocuments(normalizedQuery, targetStationId, context, 3);
  const answer = generateGroundedAnswer(normalizedQuery, retrieved, classification.language, targetStationId);

  const citations: AssistantCitation[] = retrieved.map(({ doc, score }) => ({
    document: doc.title,
    section: doc.section,
    relevance: Math.round(score * 10) / 10,
    stationId: doc.stationId,
    modelVersion: doc.modelVersion,
    excerpt: doc.content.slice(0, 140) + "…",
  }));

  const actions: AssistantAction[] = [];
  if (targetStationId && STATION_MAP[targetStationId]) {
    actions.push({
      label: `Inspect ${STATION_MAP[targetStationId].name} (${targetStationId})`,
      type: "select_station",
      href: `/network?basin=${targetStationId}`,
      stationId: targetStationId,
    });
  }
  if (/\b(validation|validasi|cv)\b/i.test(query)) {
    actions.push({ label: "Open Stress-Test Validation", type: "navigate", href: "/validation" });
  }
  if (/\b(model|gnn|gbdt|catboost)\b/i.test(query)) {
    actions.push({ label: "Open Model Intelligence", type: "navigate", href: "/models" });
  }
  if (/\b(network|graph|reachability)\b/i.test(query)) {
    actions.push({ label: "Open River Network DAG", type: "navigate", href: "/network" });
  }

  return {
    answer,
    scope: classification.scope,
    language: classification.language,
    citations,
    actions,
  };
}

export const handleAssistantQuery = processAssistantQuery;

