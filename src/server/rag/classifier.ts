/**
 * Domain Classifier for ANCHOR Intelligence Assistant.
 * Enforces strict boundary between in-scope ANCHOR hydrological domain
 * and out-of-scope general world knowledge.
 */

export type QueryScope = "ANCHOR_RELEVANT" | "ANCHOR_RELATED" | "OUT_OF_SCOPE" | "AMBIGUOUS";

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
  "ini", "itu", "stasiun", "sungai", "banjir", "cuaca", "presiden", "harga", "bisa", "tolong",
  "jelaskan", "apakah", "pada", "adalah", "tentang", "dari"
]);

// Out-of-scope intent triggers
const OUT_OF_SCOPE_PATTERNS = [
  /\bpresiden\b/i,
  /\bpresident\b/i,
  /\bjakarta\b/i,
  /\bbandung\b/i,
  /\bsurabaya\b/i,
  /\bbali\b/i,
  /\bcuaca\s+(jakarta|bandung|bali|indonesia|dunia)\b/i,
  /\bweather\s+(in|of|for)\s+(jakarta|london|new york|tokyo|paris)\b/i,
  /\belon\s*musk\b/i,
  /\bjokowi\b/i,
  /\bsoekarno\b/i,
  /\bsuharto\b/i,
  /\bprabowo\b/i,
  /\bperang\s*dunia\b/i,
  /\bworld\s*war\b/i,
  /\bsejarah\s*(dunia|indonesia|eropa|kemerdekaan)\b/i,
  /\bbitcoin\b/i,
  /\bcrypto\b/i,
  /\bsaham\b/i,
  /\bpython\s*(game|script|tutorial|code|belajar)\b/i,
  /\bwrite\s*(me\s*)?a\s*(python|javascript|code|game|poem|essay)\b/i,
  /\bbuatkan\s*(saya\s*)?(game|kode|puisi|cerita|skrip)\b/i,
  /\bwho\s+is\s+(the\s+)?(first\s+)?president\b/i,
  /\bcapital\s+of\b/i,
  /\bibukota\b/i,
  /\bresep\b/i,
  /\brecipe\b/i,
  /\bfilm\b/i,
  /\bmovie\b/i,
  /\blirik\b/i,
  /\blyrics\b/i,
  /\bwho\s+won\b/i,
  /\bfootball\b/i,
  /\bsepak\s*bola\b/i,
];

// In-scope ANCHOR domain keywords
const ANCHOR_DOMAIN_PATTERNS = [
  /\b(anchor|bengawan solo|kali madiun|madiun|solo|watershed|das)\b/i,
  /\b(bs-\d{3}|station|stasiun|jurug|badegan|ponorogo|kwadungan|babat|karanggeneng|lorog|bengawan jero|wonogiri|sembayat)\b/i,
  /\b(tma|water level|ketinggian air|debit|threshold|ambang batas|banjir|flood)\b/i,
  /\b(forecast|prediksi|horizon|multi-horizon|direct multi-horizon|lead time)\b/i,
  /\b(rmse|mae|r2|r\^2|holdout|public|private|metric|evaluasi|akurasi|loss)\b/i,
  /\b(spatial|reconciliation|rekonsiliasi|topolog|graph|upstream|downstream|hulu|hilir|residual)\b/i,
  /\b(natural|dam|weir|waduk|bendungan|polder|mixed|segmentation|segmentasi)\b/i,
  /\b(model|anchor-prod|lightgbm|extra trees|random forest|ensemble|version|versi)\b/i,
  /\b(data quality|kualitas data|missing|outlier|telemetr|gap|flatline|spike|sensor)\b/i,
  /\b(alert|warning|critical|alr-\d{4}|notifikasi|snooze|acknowledge|resolve)\b/i,
  /\b(inference|latency|p50|p95|trace|request_id|req_\w+)\b/i,
  /\b(scenario|simulasi|demo|tick|clock)\b/i,
  /\b(experiment|ablation|fold|drift)\b/i,
];

export function detectLanguage(text: string): "id" | "en" {
  const words = text.toLowerCase().split(/\s+/);
  let idCount = 0;
  for (const w of words) {
    if (ID_WORDS.has(w)) idCount++;
  }
  return idCount >= 2 || /kenapa|siapa|berapa|bagaimana|apakah|stasiun|sungai/i.test(text) ? "id" : "en";
}

export function classifyQuery(message: string, contextStationId?: string | null): ClassificationResult {
  const clean = message.trim();
  const lang = detectLanguage(clean);

  // 1. Empty or trivial
  if (!clean || clean.length < 3) {
    return {
      scope: "AMBIGUOUS",
      isOutOfScope: false,
      language: lang,
      reason: "Query is too brief or empty.",
      refusalMessage: lang === "id"
        ? "Pertanyaan terlalu singkat. Anda dapat menanyakan seputar kondisi stasiun, forecast TMA, atau model ANCHOR."
        : "The query is too brief. You can ask about station conditions, water-level forecasts, or ANCHOR models."
    };
  }

  // 2. Explicit Out-of-scope triggers
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        scope: "OUT_OF_SCOPE",
        isOutOfScope: true,
        language: lang,
        reason: "Matched explicit out-of-scope general knowledge pattern.",
        refusalMessage: lang === "id"
          ? "Maaf, saya hanya dapat membantu pertanyaan yang berkaitan dengan platform ANCHOR, seperti kondisi stasiun, forecast TMA, jaringan sungai Bengawan Solo, kualitas data, model hidrologi, alert, dan sistem inference."
          : "I can only assist with questions related to the ANCHOR platform, such as station conditions, water level (TMA) forecasts, the Bengawan Solo river network, data quality, hydrological models, alerts, and the inference system."
      };
    }
  }

  // 3. ANCHOR Domain matching
  let matchesAnchor = false;
  for (const pattern of ANCHOR_DOMAIN_PATTERNS) {
    if (pattern.test(clean)) {
      matchesAnchor = true;
      break;
    }
  }

  // Context awareness: if user says "stasiun ini" or "this station" and contextStationId exists
  if (contextStationId && /\b(this station|stasiun ini|disini|station here|forecast here)\b/i.test(clean)) {
    matchesAnchor = true;
  }

  if (matchesAnchor) {
    return {
      scope: "ANCHOR_RELEVANT",
      isOutOfScope: false,
      language: lang,
      reason: "Matched ANCHOR hydrological domain concepts."
    };
  }

  // 4. Default out-of-scope for ungrounded queries
  return {
    scope: "OUT_OF_SCOPE",
    isOutOfScope: true,
    language: lang,
    reason: "No ANCHOR domain entities detected in query.",
    refusalMessage: lang === "id"
      ? "Maaf, saya hanya dapat membantu pertanyaan yang berkaitan dengan platform ANCHOR, seperti kondisi stasiun, forecast TMA, jaringan sungai Bengawan Solo, kualitas data, model hidrologi, alert, dan sistem inference."
      : "I can only assist with questions related to the ANCHOR platform, such as station conditions, water level (TMA) forecasts, the Bengawan Solo river network, data quality, hydrological models, alerts, and the inference system."
  };
}
