/**
 * Domain Classifier for TIRTA Intelligence Assistant.
 * Enforces strict boundary between in-scope TIRTA hydrological domain
 * and out-of-scope general world knowledge.
 */

export type QueryScope = "TIRTA_RELEVANT" | "TIRTA_RELATED" | "OUT_OF_SCOPE" | "AMBIGUOUS";

export interface ClassificationResult {
  scope: QueryScope;
  isOutOfScope: boolean;
  language: "id" | "en";
  reason: string;
  refusalMessage?: string;
}

// Indonesian language markers
const ID_WORDS = new Set([
  "siapa", "apa", "berapa", "kenapa", "mengapa", "bagaimana", "dimana", "di", "dan", "yang",
  "ini", "itu", "stasiun", "sungai", "kekeringan", "cuaca", "presiden", "harga", "bisa", "tolong",
  "jelaskan", "apakah", "pada", "adalah", "tentang", "dari"
]);

// Out-of-scope intent triggers
const OUT_OF_SCOPE_PATTERNS = [
  /\bpresiden\b/i,
  /\bpresident\b/i,
  /\bcuaca\s+(jakarta|bandung|bali|indonesia|dunia)\b/i,
  /\bweather\s+(in|of|for)\s+(jakarta|london|new york|tokyo|paris)\b/i,
  /\belon\s*musk\b/i,
  /\bjokowi\b/i,
  /\bsoekarno\b/i,
  /\bsuharto\b/i,
  /\bprabowo\b/i,
  /\bperang\s*dunia\b/i,
  /\bworld\s*war\b/i,
  /\bbitcoin\b/i,
  /\bcrypto\b/i,
  /\bsaham\b/i,
  /\bwrite\s*(me\s*)?a\s*(python|javascript|code|game|poem|essay)\b/i,
  /\bbuatkan\s*(saya\s*)?(game|kode|puisi|cerita|skrip)\b/i,
  /\bcapital\s+of\b/i,
  /\bresep\b/i,
  /\bmovie\b/i,
  /\bfootball\b/i,
];

// In-scope TIRTA domain keywords
const TIRTA_DOMAIN_PATTERNS = [
  /\b(tirta|topology|river transmission|water stress|huc12|sub-basin|basin|watershed)\b/i,
  /\b(huc-demo-\d{4}|huc12|sub-basin|headwater|tributary|confluence|outlet)\b/i,
  /\b(streamflow|baseflow|quickflow|withdrawal|irrigation|climatology|anomaly|water limitation|sui)\b/i,
  /\b(forecast|prediksi|next month|month t\+1|lead time|early warning)\b/i,
  /\b(average precision|pr-auc|ap|0\.7329|0\.7590|0\.7641|0\.7608|score|provenance|metric|evaluasi)\b/i,
  /\b(directed graph|river graph|id -> to_id|dag|reachability|upstream|downstream|1-hop|2-hop|3-hop)\b/i,
  /\b(stress-test validation|chronology-aware|temporal lineage|lag|cold start|whole-basin holdout)\b/i,
  /\b(catboost|lightgbm|xgboost|gbdt|gnn|directed reachability gnn|pytorch|ensemble)\b/i,
  /\b(alert|warning|critical|alr-\d{4}|water_stress_critical|upstream_stress_propagation)\b/i,
  /\b(inference|telemetry|latency|p50|p95|waterfall|trace)\b/i,
  /\b(ablation|experiment|findings|supported|rejected|overfit)\b/i,
];

export function detectLanguage(text: string): "id" | "en" {
  const words = text.toLowerCase().split(/\s+/);
  let idMatches = 0;
  for (const w of words) {
    if (ID_WORDS.has(w)) idMatches++;
  }
  return idMatches >= 2 ? "id" : "en";
}

export function classifyQuery(query: string): ClassificationResult {
  const clean = query.trim();
  const lang = detectLanguage(clean);

  // Check out-of-scope triggers first
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(clean)) {
      const refusal =
        lang === "id"
          ? "Maaf, saya adalah asisten intelijen TIRTA (Topology-Informed River Transmission Alert) yang berfokus pada prediksi risiko water stress skala HUC12, topologi graf sungai, dan metodologi IFEST DAC 2026. Pertanyaan ini di luar domain operasional sistem."
          : "I am the TIRTA Intelligence Assistant, dedicated to HUC12 water-stress early warning, directed river graph intelligence, and the IFEST DAC 2026 methodology. This question is outside my operational hydrological domain.";
      return {
        scope: "OUT_OF_SCOPE",
        isOutOfScope: true,
        language: lang,
        reason: "Matched non-hydrological external query pattern.",
        refusalMessage: refusal,
      };
    }
  }

  // Check domain relevance
  let hits = 0;
  for (const pattern of TIRTA_DOMAIN_PATTERNS) {
    if (pattern.test(clean)) hits++;
  }

  if (hits >= 1) {
    return {
      scope: "TIRTA_RELEVANT",
      isOutOfScope: false,
      language: lang,
      reason: `Matched ${hits} TIRTA domain keyword pattern(s).`,
    };
  }

  // Short queries or ambiguous
  if (clean.length < 8) {
    return {
      scope: "AMBIGUOUS",
      isOutOfScope: false,
      language: lang,
      reason: "Query too concise to classify definitively.",
    };
  }

  return {
    scope: "TIRTA_RELATED",
    isOutOfScope: false,
    language: lang,
    reason: "General hydrological/environmental query processed under TIRTA domain context.",
  };
}
