import { SIM_BASE_NOW } from "@/config/constants";
import { hashString } from "@/lib/prng";
import type { AlertSeverity, AlertStatus, StationSnapshot } from "@/types/domain";

const H = 3600_000;

export interface AlertSeed {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  stationId: string | null;
  source: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  assignedTo?: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
  fromScenario?: boolean;
  correlationId: string;
}

const corr = (id: string) => `req_${hashString(`alert:${id}`).toString(16).padStart(8, "0")}`;

const RAW_SEEDS: Omit<AlertSeed, 'correlationId'>[] = [
  { id: "ALR-1412", severity: "WARNING", title: "TMA warning threshold exceeded at Karanggeneng", description: "Water level at BS-017 has been above the warning threshold (4.64 m) for 3h 20m. Lowland reach; downstream barrage at Sembayat operating within capacity.", stationId: "BS-017", source: "risk-engine", status: "OPEN", createdAt: SIM_BASE_NOW - 3.3 * H, metadata: { threshold: 4.64, observed: 4.71 } },
  { id: "ALR-1411", severity: "WARNING", title: "Rising trend detected at Babat Barrage", description: "Sustained rise of +0.09 m/h for 4 consecutive hours at BS-016. Upstream release from Bojonegoro Barrage confirmed via gate telemetry.", stationId: "BS-016", source: "trend-detector", status: "ACKNOWLEDGED", acknowledgedBy: "d.santoso", acknowledgedAt: SIM_BASE_NOW - 5.1 * H, assignedTo: "d.santoso", createdAt: SIM_BASE_NOW - 6.4 * H },
  { id: "ALR-1410", severity: "DATA_QUALITY", title: "Station Lorog telemetry stale (> 3h)", description: "No packets received from BS-027 in the last 3 hours. Last known value 1.42 m. Field team notified; forecast falls back to climatology with widened interval.", stationId: "BS-027", source: "ingestion-monitor", status: "OPEN", createdAt: SIM_BASE_NOW - 2.6 * H },
  { id: "ALR-1409", severity: "DATA_QUALITY", title: "Telemetry latency elevated at Serang Hulu", description: "Packet latency at BS-029 is 52 min (SLA 15 min). GSM backhaul signal degraded.", stationId: "BS-029", source: "ingestion-monitor", status: "OPEN", createdAt: SIM_BASE_NOW - 1.1 * H },
  { id: "ALR-1408", severity: "MODEL", title: "Forecast confidence degraded at Ujung Pangkah Estuary", description: "Prediction confidence dropped to 68% (baseline 84%). Estuary tidal influence not fully captured during active spring-tide window.", stationId: "BS-019", source: "model-monitor", status: "OPEN", createdAt: SIM_BASE_NOW - 7.8 * H, metadata: { confidence: 0.68, baseline: 0.84 } },
  { id: "ALR-1407", severity: "MODEL", title: "Model residual anomaly detected at Bengawan Jero", description: "Residual z-score 3.4σ across the last 6 forecast cycles at BS-030. Polder pump operation suspected; reconciliation weight temporarily reduced.", stationId: "BS-030", source: "model-monitor", status: "ACKNOWLEDGED", acknowledgedBy: "a.prasetyo", acknowledgedAt: SIM_BASE_NOW - 10 * H, assignedTo: "a.prasetyo", createdAt: SIM_BASE_NOW - 11.5 * H },
  { id: "ALR-1406", severity: "INFO", title: "Scheduled forecast batch completed", description: "Latest operational cycle: 30 stations · 7 horizons · 210 predictions · mean latency 171 ms.", stationId: null, source: "scheduler", status: "RESOLVED", createdAt: SIM_BASE_NOW - 0.05 * H },
  { id: "ALR-1405", severity: "INFO", title: "Data ingestion recovered", description: "Ingestion broker partition 3 restored. Backfill of 4h window across 15 stations completed; 1,440 records replayed.", stationId: null, source: "ingestion-monitor", status: "RESOLVED", createdAt: SIM_BASE_NOW - 3 * 24 * H - 2.5 * H },
  { id: "ALR-1404", severity: "DATA_QUALITY", title: "Telemetry gap detected across 15 stations", description: "Simultaneous ingestion gap for 15 stations during scheduled maintenance. Root cause: ingestion broker partition unavailable (INC-2214).", stationId: null, source: "ingestion-monitor", status: "RESOLVED", acknowledgedBy: "admin.ops", acknowledgedAt: SIM_BASE_NOW - 3 * 24 * H - 6.6 * H, createdAt: SIM_BASE_NOW - 3 * 24 * H - 7 * H },
  { id: "ALR-1403", severity: "WARNING", title: "Rapid water-level increase detected at Grindulu", description: "+0.61 m in 2h at BS-026 following 41 mm convective rainfall. Peak 3.12 m (73% of alert threshold), receded within 9h.", stationId: "BS-026", source: "trend-detector", status: "RESOLVED", acknowledgedBy: "d.santoso", acknowledgedAt: SIM_BASE_NOW - 2 * 24 * H - 4 * H, createdAt: SIM_BASE_NOW - 2 * 24 * H - 5 * H },
  { id: "ALR-1402", severity: "CRITICAL", title: "TMA alert threshold exceeded at Bengawan Jero", description: "BS-030 reached 3.04 m (105% of alert threshold). Polder pumps activated; level receded below threshold after 5h 40m.", stationId: "BS-030", source: "risk-engine", status: "RESOLVED", acknowledgedBy: "d.santoso", acknowledgedAt: SIM_BASE_NOW - 5 * 24 * H - 1 * H, createdAt: SIM_BASE_NOW - 5 * 24 * H - 1.4 * H },
  { id: "ALR-1401", severity: "INFO", title: "New model version deployed: anchor-prod-v2.4.1", description: "Canary 10% → 100% over 6h. Holdout RMSE 0.8387 (−1.4% vs v2.3.0). Rollback window closed.", stationId: null, source: "model-registry", status: "RESOLVED", createdAt: SIM_BASE_NOW - 16 * 24 * H },
  { id: "ALR-1400", severity: "MODEL", title: "Inference latency increased 14%", description: "P95 latency rose from 214 ms to 244 ms after feature-store cache eviction. Auto-scaled feature pipeline 3 → 4 replicas.", stationId: null, source: "inference-monitor", status: "RESOLVED", createdAt: SIM_BASE_NOW - 1 * 24 * H - 3 * H },
];

export const ALERT_SEEDS: AlertSeed[] = RAW_SEEDS.map((a) => ({ ...a, correlationId: corr(a.id) }));

/**
 * Scenario alerts are derived from live station state. They are created once
 * their trigger condition is met and persisted with the simulated timestamp.
 */
export function evaluateScenarioAlerts(snapshots: Record<string, StationSnapshot>, now: number): AlertSeed[] {
  const out: Omit<AlertSeed, 'correlationId'>[] = [];
  const badegan = snapshots["BS-008"];
  const ponorogo = snapshots["BS-009"];
  const kwadungan = snapshots["BS-012"];
  if (!badegan) return [];

  if (badegan.trendRatePerHour >= 0.16) {
    out.push({
      id: "ALR-S001",
      severity: "WARNING",
      title: "Rapid water-level increase detected at Badegan",
      description: `TMA at BS-008 rising at +${badegan.trendRatePerHour.toFixed(2)} m/h following ${badegan.rainfall1h.toFixed(0)} mm/h convective rainfall over the upper Kali Madiun. Direct multi-horizon forecast projects continued rise.`,
      stationId: "BS-008",
      source: "trend-detector",
      status: "OPEN",
      createdAt: now,
      fromScenario: true,
      metadata: { rate: badegan.trendRatePerHour, rainfall1h: badegan.rainfall1h, forecast6h: badegan.forecast6h },
    });
  }
  if (badegan.currentTma >= badegan.station.thresholds.warning) {
    const critical = badegan.currentTma >= badegan.station.thresholds.alert;
    out.push({
      id: "ALR-S002",
      severity: critical ? "CRITICAL" : "WARNING",
      title: `TMA ${critical ? "alert" : "warning"} threshold exceeded at Badegan`,
      description: `BS-008 observed ${badegan.currentTma.toFixed(2)} m (${Math.round(badegan.thresholdRatio * 100)}% of alert threshold ${badegan.station.thresholds.alert.toFixed(2)} m). Risk level ${badegan.risk}. Downstream propagation expected at Ponorogo in ~2.8h and Madiun in ~7h.`,
      stationId: "BS-008",
      source: "risk-engine",
      status: "OPEN",
      createdAt: now,
      fromScenario: true,
      metadata: { observed: badegan.currentTma, threshold: badegan.station.thresholds.alert, risk: badegan.risk },
    });
  }
  if (ponorogo && ponorogo.forecast6h >= ponorogo.station.thresholds.warning) {
    out.push({
      id: "ALR-S003",
      severity: "WARNING",
      title: "Forecast exceedance within 6h at Ponorogo",
      description: `Spatial reconciliation propagated the Badegan signal downstream: 6h forecast for BS-009 is ${ponorogo.forecast6h.toFixed(2)} m (warning threshold ${ponorogo.station.thresholds.warning.toFixed(2)} m).`,
      stationId: "BS-009",
      source: "forecast-engine",
      status: "OPEN",
      createdAt: now,
      fromScenario: true,
      metadata: { forecast6h: ponorogo.forecast6h },
    });
  }
  if (kwadungan && kwadungan.forecast24h >= kwadungan.station.thresholds.normal * 1.15) {
    out.push({
      id: "ALR-S004",
      severity: "INFO",
      title: "Upstream influence rising at Kwadungan",
      description: `Graph reconciliation increased the 24h forecast for BS-012 to ${kwadungan.forecast24h.toFixed(2)} m based on correlated residuals from the Kali Madiun chain.`,
      stationId: "BS-012",
      source: "graph-service",
      status: "OPEN",
      createdAt: now,
      fromScenario: true,
    });
  }
  return out.map((a) => ({ ...a, correlationId: corr(a.id) }));
}
