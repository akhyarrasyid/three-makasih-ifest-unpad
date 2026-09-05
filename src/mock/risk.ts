import { RISK_THRESHOLDS } from "@/config/constants";
import type { RiskLevel, Thresholds } from "@/types/domain";

export interface RiskInput {
  currentTma: number;
  forecast6h: number;
  forecast24h: number;
  thresholds: Thresholds;
  rainfall24h: number;
  upstreamInfluence: number;
  missingRate: number;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;
  components: { label: string; value: number }[];
}

/**
 * Deterministic demonstration risk engine.
 * Score ≈ ratio of effective water level to the alert threshold; adjusted by
 * forecast increase, rainfall, upstream conditions and data quality.
 * Thresholds: <60% LOW · 60–80% MODERATE · 80–100% HIGH · >100% CRITICAL (demo assumptions).
 */
export function computeRisk(input: RiskInput): RiskResult {
  const { currentTma, forecast6h, forecast24h, thresholds, rainfall24h, upstreamInfluence, missingRate } = input;
  const alert = thresholds.alert;
  const proximity = currentTma / alert;
  const forecastRise = Math.max(0, Math.max(forecast6h, forecast24h * 0.85) - currentTma) / alert;
  const rainTerm = Math.min(0.08, (rainfall24h / 60) * 0.08);
  const upstreamTerm = Math.min(0.08, (upstreamInfluence / alert) * 0.4);
  const dqTerm = missingRate > 0.2 ? 0.03 : 0;
  const score = proximity + forecastRise * 0.7 + rainTerm + upstreamTerm + dqTerm;
  const level: RiskLevel =
    score >= RISK_THRESHOLDS.CRITICAL ? "CRITICAL" : score >= RISK_THRESHOLDS.HIGH ? "HIGH" : score >= RISK_THRESHOLDS.MODERATE ? "MODERATE" : "LOW";
  return {
    level,
    score: Math.round(score * 1000) / 1000,
    components: [
      { label: "Threshold proximity", value: proximity },
      { label: "Forecast increase", value: forecastRise * 0.7 },
      { label: "Rainfall (24h)", value: rainTerm },
      { label: "Upstream conditions", value: upstreamTerm },
      { label: "Data quality penalty", value: dqTerm },
    ],
  };
}

export const RISK_ORDER: Record<RiskLevel, number> = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };
