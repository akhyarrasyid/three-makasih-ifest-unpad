import { STATIONS } from "./stations";
import { sampleQuality, HOUR, DAY, tmaAt } from "./telemetry";
import { hashString, latticeNoise, round } from "@/lib/prng";
import { DATASET } from "@/config/constants";
import type { DataQualityReport } from "@/types/domain";

const DAYS = 28;

export function dataQualityReport(now: number): DataQualityReport {
  const dayStart = now - (now % DAY) - 7 * HOUR + 7 * HOUR; // align to UTC day for stability
  const dates: string[] = [];
  const values: number[][] = [];
  const stationQuality: DataQualityReport["stationQuality"] = [];
  let staleStations = 0;

  for (let d = DAYS - 1; d >= 0; d--) dates.push(new Date(dayStart - d * DAY).toISOString().slice(0, 10));

  for (const s of STATIONS) {
    const row: number[] = [];
    let totalMissing = 0;
    let outliers = 0;
    for (let d = DAYS - 1; d >= 0; d--) {
      const start = dayStart - d * DAY;
      let miss = 0;
      for (let h = 0; h < 24; h++) {
        const t = start + h * HOUR;
        if (t > now) break;
        const q = sampleQuality(s.id, t);
        if (q === "MISSING") miss++;
        if (q === "OUTLIER") outliers++;
      }
      totalMissing += miss;
      row.push(round(miss / 24, 3));
    }
    values.push(row);
    const latency = s.id === "BS-027" ? 12_240 : s.id === "BS-029" ? 3_120 : 14 + (hashString(s.id) % 40);
    if (latency > 1800) staleStations++;
    stationQuality.push({ stationId: s.id, completeness: round(1 - totalMissing / (DAYS * 24), 4), outliers, latencySec: latency });
  }

  // anomaly timeline — deterministic set of notable events over the window
  const anomalyTimeline: DataQualityReport["anomalyTimeline"] = [];
  const rngSeed = hashString("dq-anomalies");
  const types: DataQualityReport["anomalyTimeline"][number]["type"][] = ["OUTLIER", "GAP", "SPIKE", "FLATLINE", "SCHEMA"];
  for (let i = 0; i < 26; i++) {
    const s = STATIONS[Math.floor(latticeNoise(rngSeed, i) * STATIONS.length)];
    const type = types[Math.floor(Math.pow(latticeNoise(rngSeed + 1, i), 1.3) * types.length)];
    const t = now - latticeNoise(rngSeed + 2, i) * DAYS * DAY;
    const magnitude = round(0.4 + latticeNoise(rngSeed + 3, i) * 2.6, 2);
    const desc: Record<typeof type, string> = {
      OUTLIER: `Value ${magnitude > 1.5 ? "+" : "−"}${(magnitude * 1.4).toFixed(2)} m deviates > 4σ from rolling window; flagged, excluded from training.`,
      GAP: `Telemetry gap of ${Math.round(magnitude * 2.1)} h; interpolation withheld (gap > 2h policy).`,
      SPIKE: `Sudden TMA spike of +${magnitude.toFixed(2)} m without rainfall build-up; anomaly score ${(0.6 + magnitude / 8).toFixed(2)}.`,
      FLATLINE: `Sensor flat-lined at ${tmaAt(s.id, t).toFixed(2)} m for ${Math.round(magnitude * 3)} h; stuck-value detector fired.`,
      SCHEMA: `Payload schema violation: rainfall field missing unit suffix; record quarantined.`,
    };
    anomalyTimeline.push({ id: `DQ-${1200 + i}`, t: new Date(t).toISOString(), stationId: s.id, type, magnitude, description: desc[type] });
  }
  anomalyTimeline.push({
    id: "DQ-1199",
    t: new Date(now - 3 * DAY - 7 * HOUR).toISOString(),
    stationId: "NETWORK",
    type: "GAP",
    magnitude: 4,
    description: "Simultaneous 4h telemetry gap across 15 stations — upstream ingestion broker partition unavailable (INC-2214).",
  });
  anomalyTimeline.push({
    id: "DQ-1198",
    t: new Date(now - 9 * DAY - 3 * HOUR).toISOString(),
    stationId: "NETWORK",
    type: "GAP",
    magnitude: 6,
    description: "Simultaneous 6h telemetry gap across 22 stations — regional GSM backhaul outage.",
  });
  anomalyTimeline.sort((a, b) => b.t.localeCompare(a.t));

  return {
    summary: {
      recordsProcessed: DATASET.trainingObservations + DATASET.testObservations + 4_884,
      missingValues: DATASET.missingPoints,
      missingRate: DATASET.missingRate,
      outliers: DATASET.flaggedOutliers,
      duplicates: 312,
      staleStations,
      schemaViolations: 7,
      trainingObservations: DATASET.trainingObservations,
      testObservations: DATASET.testObservations,
    },
    missingnessHeatmap: { stations: STATIONS.map((s) => s.id), dates, values },
    anomalyTimeline,
    stationQuality,
  };
}
