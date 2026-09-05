/** Central configuration + design constants. All demo assumptions live here. */

export const PRODUCT = {
  name: "ANCHOR",
  fullName: "Adaptive Node Categorization with Direct-Horizon Optimization and Reconciliation",
  tagline: "Hydrological Intelligence Platform",
  subtitle: "Adaptive Hydrological Intelligence",
  environment: "PRODUCTION",
  region: "ap-southeast-3 (Jakarta)",
} as const;

export const MODEL = {
  productionVersion: "anchor-prod-v2.4.1",
  ensemble: ["LightGBM", "Extra Trees", "Random Forest"],
  holdoutRmse: 0.8387,
  publicRmse: 1.56296,
  privateRmse: 1.61812,
} as const;

export const DATASET = {
  stations: 30,
  primaryNetwork: 25,
  trainingObservations: 84396,
  testObservations: 21780,
  trainingStart: "2023-01-01",
  trainingEnd: "2025-09-18",
  testStart: "2025-09-19",
  testEnd: "2026-05-18",
  flaggedOutliers: 150,
  missingPoints: 4884,
  missingRate: 0.0547,
} as const;

/** 
 * Operational base timestamp: initialized to real-time current clock (Date.now()).
 * When deployed to Vercel or run locally, all telemetry, forecasts, and live monitoring
 * are always anchored to the actual current moment.
 * Can be overridden via NEXT_PUBLIC_BASE_TIMESTAMP if a specific backtesting epoch is desired.
 */
export const SIM_BASE_NOW =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_TIMESTAMP
    ? Number(process.env.NEXT_PUBLIC_BASE_TIMESTAMP)
    : Date.now();
export const SIM_TICK_MS = 5 * 60 * 1000; // each demo tick advances simulated time by 5 minutes
export const DEMO_INTERVAL_MS = 5000;

/** Demonstration risk thresholds (ratio of current TMA to alert threshold). */
export const RISK_THRESHOLDS = {
  MODERATE: 0.6,
  HIGH: 0.8,
  CRITICAL: 1.0,
} as const;

export const HISTORY_HOURS = 24 * 14;
export const FORECAST_HOURS = 72;

export const ROLE_LABELS: Record<string, string> = {
  operator: "Operator",
  data_scientist: "Data Scientist",
  administrator: "Administrator",
};
