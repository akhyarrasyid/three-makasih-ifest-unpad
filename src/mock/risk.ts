import { RISK_THRESHOLDS } from "@/config/constants";
import { clamp, round } from "@/lib/prng";
import type { RiskLevel, Thresholds } from "@/types/domain";

export interface RiskInput {
  currentTma?: number;
  currentSupply?: number;
  climatologyAnomalySigma?: number;
  waterLimitationProxy?: number;
  upstreamStressScore?: number;
  withdrawalToSupplyRatio?: number;
  coldStart?: boolean;
  forecast6h?: number;
  forecast24h?: number;
  thresholds?: Thresholds;
  rainfall24h?: number;
  upstreamInfluence?: number;
  missingRate?: number;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;
  components: { label: string; value: number }[];
}

/**
 * Deterministic water-stress risk scoring engine.
 * Computes model continuous probability P(water stress at t+1) in [0, 1].
 * Tiers: <0.25 LOW · 0.25–0.50 MODERATE · 0.50–0.75 HIGH · >0.75 CRITICAL.
 * Note: Risk tier is a demonstration interpretation of the model continuous probability.
 */
export function computeRisk(input: RiskInput): RiskResult {
  const anomaly = input.climatologyAnomalySigma ?? 0;
  const limitation = input.waterLimitationProxy ?? 0.3;
  const upstream = input.upstreamStressScore ?? input.upstreamInfluence ?? 0;
  const withdrawalRatio = input.withdrawalToSupplyRatio ?? 0.25;

  const climTerm = anomaly < 0 ? Math.min(0.42, Math.abs(anomaly) * 0.28) : -0.08;
  const limitationTerm = limitation * 0.30;
  const upstreamTerm = upstream * 0.22;
  const withdrawalTerm = withdrawalRatio * 0.16;

  const rawScore = 0.204 + climTerm + limitationTerm + upstreamTerm + withdrawalTerm;
  const score = round(clamp(rawScore, 0.05, 0.96), 3);

  let level: RiskLevel = "LOW";
  if (score >= RISK_THRESHOLDS.CRITICAL) level = "CRITICAL";
  else if (score >= RISK_THRESHOLDS.HIGH) level = "HIGH";
  else if (score >= RISK_THRESHOLDS.MODERATE) level = "MODERATE";

  return {
    level,
    score,
    components: [
      { label: "Climatology Anomaly (σ departure)", value: round(Math.max(0, climTerm), 3) },
      { label: "Water-Limitation Proxy", value: round(limitationTerm, 3) },
      { label: "Directed Upstream Reachability Stress", value: round(upstreamTerm, 3) },
      { label: "Withdrawal Pressure Ratio", value: round(withdrawalTerm, 3) },
    ],
  };
}

export const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
};
