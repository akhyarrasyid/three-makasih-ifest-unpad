import { STATIONS } from "./stations";
import { hashString, latticeNoise, round } from "@/lib/prng";
import { DATASET } from "@/config/constants";
import type { DataQualityReport } from "@/types/domain";

const DAYS = 28;

export function dataQualityReport(now: number): DataQualityReport {
  const dayStart = now - (now % (24 * 3600_000));
  const dates: string[] = [];
  const values: number[][] = [];
  const stationQuality: { stationId: string; completeness: number; outliers: number; latencySec: number }[] = [];

  for (let d = DAYS - 1; d >= 0; d--) {
    dates.push(new Date(dayStart - d * 24 * 3600_000).toISOString().slice(0, 10));
  }

  for (const s of STATIONS) {
    const row: number[] = [];
    const seed = hashString(s.id);
    for (let d = DAYS - 1; d >= 0; d--) {
      // Missingness fraction is zero for historical verified basins, slight in cold-start
      const miss = s.coldStart ? round(latticeNoise(seed, d) * 0.08, 3) : 0;
      row.push(miss);
    }
    values.push(row);
    stationQuality.push({
      stationId: s.id,
      completeness: s.coldStart ? 0.942 : 1.0,
      outliers: s.coldStart ? 2 : 0,
      latencySec: 18 + (hashString(s.id) % 30),
    });
  }

  const anomalyTimeline = [
    {
      id: "DQ-2026-01",
      t: new Date(now - 2 * 24 * 3600_000).toISOString(),
      stationId: "HUC-DEMO-0015",
      type: "GAP" as const,
      magnitude: 1.2,
      description: "Cold-start spatial holdout sub-basin: zero historical observations in train split; relies on directed DAG topological prior.",
    },
    {
      id: "DQ-2026-02",
      t: new Date(now - 5 * 24 * 3600_000).toISOString(),
      stationId: "DATASET-GLOBAL",
      type: "SCHEMA" as const,
      magnitude: 0.0,
      description: "Numeric locale normalization: commas converted to standard decimal periods across all 378,780 training rows.",
    },
    {
      id: "DQ-2026-03",
      t: new Date(now - 12 * 24 * 3600_000).toISOString(),
      stationId: "DATASET-GLOBAL",
      type: "OUTLIER" as const,
      magnitude: 3.4,
      description: "Unit anomaly correction: isolated water withdrawal metric scaled by 1,000 corrected to match physical baseflow units.",
    },
  ];

  return {
    summary: {
      recordsProcessed: DATASET.trainingRows + DATASET.testRows,
      trainingRows: DATASET.trainingRows,
      testRows: DATASET.testRows,
      historicalHuc12: DATASET.historicalHuc12,
      testHuc12: DATASET.testHuc12,
      historicalOrigins: DATASET.historicalOrigins,
      testOrigins: DATASET.futureTestOrigins,
      coldStartHuc12: 786, // ~26% of test basins are cold start
      positiveStressRate: DATASET.historicalStressRate,
      normalizedNumericLocale: true,
      unitAnomaliesCorrected: 48,
      structuralDenoisedRows: 378780,
      // Compatibility fields
      missingValues: 0,
      missingRate: 0.0,
      outliers: 48,
      duplicates: 0,
      staleStations: 0,
      schemaViolations: 0,
      trainingObservations: DATASET.trainingRows,
      testObservations: DATASET.testRows,
    },
    featureFamilies: [
      {
        name: "Seasonal & Climatological Context",
        description: "Long-term historical 14-year monthly baseline and standard deviation anomaly sigma.",
        featuresCount: 6,
        dominantFeature: "climatology_anomaly_sigma",
        contributionRank: 1,
      },
      {
        name: "Directed Multi-Hop Reachability",
        description: "Row-safe upstream and downstream 1–3 hop mean supply, minimum supply, and stress propagation.",
        featuresCount: 8,
        dominantFeature: "reachability_upstream_mean_supply_3hop",
        contributionRank: 2,
      },
      {
        name: "Withdrawal Pressure",
        description: "Irrigation, public supply, thermoelectric extractions and withdrawal-to-supply ratio.",
        featuresCount: 5,
        dominantFeature: "withdrawal_to_supply_ratio",
        contributionRank: 3,
      },
      {
        name: "Local Hydrological State",
        description: "Streamflow, baseflow, quickflow, and 3-month rolling volatility.",
        featuresCount: 4,
        dominantFeature: "baseflow_to_streamflow_ratio",
        contributionRank: 4,
      },
      {
        name: "Water Limitation Proxies",
        description: "Analytical SUI-like availability and relative water-limitation estimates.",
        featuresCount: 3,
        dominantFeature: "water_limitation_proxy",
        contributionRank: 5,
      },
      {
        name: "Basin & Topological Context",
        description: "Catchment drainage area, population, graph depth, headwater flag, and outlet distance.",
        featuresCount: 5,
        dominantFeature: "graph_depth",
        contributionRank: 6,
      },
    ],
    temporalReconstruction: {
      totalOrigins: 168,
      inferredCycle: "September → August",
      blockStructure: "14 annual blocks × 12 monthly snapshots",
      fingerprintLagFormula: "q(t)_lag0 ≈ q(t+1)_lag1  and  q(t)_lag1 ≈ q(t+1)_lag2",
      consecutiveMatchesFound: 167,
    },
    // Backwards-compatibility properties
    missingnessHeatmap: {
      stations: STATIONS.map((s) => s.id),
      dates,
      values,
    },
    anomalyTimeline,
    stationQuality,
  } as unknown as DataQualityReport;
}
