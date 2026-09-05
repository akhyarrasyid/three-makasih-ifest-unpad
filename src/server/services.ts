import { db } from "@/db";
import { alerts, auditLogs, type AlertRow, type AuditLogRow } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { STATIONS, STATION_MAP, ancestorsOf, descendantsOf } from "@/mock/stations";
import { allSnapshots, stationSnapshot, forecastSeries, forecastWithActuals, forecastConfidence, routingSteps } from "@/mock/forecasts";
import { sampleHistory, HOUR, SCENARIO, rainfallAt } from "@/mock/telemetry";
import { buildNetwork, neighbours, residualCorrelation } from "@/mock/network";
import { ALERT_SEEDS, evaluateScenarioAlerts, type AlertSeed } from "@/mock/alerts";
import { auditSeed, buildInferenceRequest, inferenceMetrics, recentInferenceRequests, systemHealth } from "@/mock/inference";
import { dataQualityReport } from "@/mock/dataQuality";
import { MODEL_VERSIONS, EXPERIMENTS } from "@/mock/models";
import { DATASET, MODEL, SIM_BASE_NOW, SIM_TICK_MS } from "@/config/constants";
import { hashString, round } from "@/lib/prng";
import type { Alert, AuditLog, OverviewData, ScenarioState, SimEvent, StationDetail, StationSnapshot, SearchResult } from "@/types/domain";

/* ------------------------------------------------------------------------ */
/* Simulated clock                                                          */
/* ------------------------------------------------------------------------ */

export function simNow(tick: number): number {
  return SIM_BASE_NOW + Math.max(0, Math.floor(tick)) * SIM_TICK_MS;
}

export function parseTick(url: string): number {
  const t = Number(new URL(url).searchParams.get("t") ?? 0);
  return Number.isFinite(t) ? Math.max(0, Math.min(t, 600)) : 0;
}

export function scenarioState(tick: number, snapshots: StationSnapshot[]): ScenarioState {
  const focus = snapshots.find((s) => s.station.id === SCENARIO.focusStationId)!;
  const now = simNow(tick);
  const raining = rainfallAt(SCENARIO.focusStationId, now) > 1;
  let phase: ScenarioState["phase"] = "IDLE";
  let description = "Watershed in steady state. Enable Demo Mode to advance the simulated clock.";
  if (raining && focus.trendRatePerHour < 0.16) {
    phase = "RAINFALL";
    description = "Convective rainfall developing over the upper Kali Madiun sub-basin (Badegan, Ponorogo, Gandong).";
  } else if (focus.risk === "LOW" && focus.trendRatePerHour >= 0.16) {
    phase = "RISING";
    description = "Telemetry at Badegan shows a rising trend; direct multi-horizon heads project continued increase.";
  } else if (focus.risk === "MODERATE") {
    phase = "PROPAGATION";
    description = "Spatial graph reconciliation is propagating the Badegan residual to Ponorogo → Madiun → Kwadungan.";
  } else if (focus.risk === "HIGH" || focus.risk === "CRITICAL") {
    phase = "ALERT";
    description = "Badegan risk elevated. Operational alert raised; downstream exceedance forecast within 6h at Ponorogo.";
  } else if (tick > 0 && now > SCENARIO.start + SCENARIO.duration + 3 * HOUR) {
    phase = "RECOVERY";
    description = "Rainfall ceased; recession underway. Forecast intervals narrowing as residual anomaly decays.";
  }
  return { tick, phase, description, focusStationId: SCENARIO.focusStationId, upstreamStationId: "BS-008" };
}

/* ------------------------------------------------------------------------ */
/* ------------------------------------------------------------------------ */
/* Seeding & In-Memory Fallback Store                                       */
/* ------------------------------------------------------------------------ */

interface InMemoryStore {
  alerts: Map<string, Alert>;
  auditLogs: AuditLog[];
  initialized: boolean;
}

const globalForServices = globalThis as typeof globalThis & {
  __anchorInMemoryStore?: InMemoryStore;
};

const memStore: InMemoryStore = globalForServices.__anchorInMemoryStore ?? {
  alerts: new Map<string, Alert>(),
  auditLogs: [],
  initialized: false,
};

if (process.env.NODE_ENV !== "production") {
  globalForServices.__anchorInMemoryStore = memStore;
}

function initMemoryStore() {
  if (memStore.initialized) return;
  for (const seed of ALERT_SEEDS) {
    const alert: Alert = {
      id: seed.id,
      severity: seed.severity as Alert["severity"],
      title: seed.title,
      description: seed.description,
      stationId: seed.stationId,
      source: seed.source,
      status: seed.status as Alert["status"],
      acknowledgedBy: seed.acknowledgedBy ?? null,
      acknowledgedAt: seed.acknowledgedAt ? new Date(seed.acknowledgedAt).toISOString() : null,
      assignedTo: seed.assignedTo ?? null,
      snoozedUntil: null,
      correlationId: seed.correlationId,
      createdAt: new Date(seed.createdAt).toISOString(),
      updatedAt: new Date(seed.acknowledgedAt ?? seed.createdAt).toISOString(),
      metadata: seed.metadata ?? {},
      fromScenario: seed.fromScenario ?? false,
    };
    memStore.alerts.set(alert.id, alert);
  }

  const seededAudits = auditSeed();
  memStore.auditLogs = seededAudits.map((a, idx) => ({
    id: idx + 1,
    timestamp: a.timestamp.toISOString(),
    actor: a.actor,
    role: a.role,
    action: a.action,
    resource: a.resource,
    requestId: a.requestId,
    ipAddress: a.ipAddress,
    environment: a.environment,
    status: a.status as "SUCCESS" | "FAILURE" | "DENIED",
    durationMs: a.durationMs,
    details: (a.details as Record<string, unknown>) ?? {},
  }));

  memStore.initialized = true;
}

let seeded = false;

export async function ensureSeeded() {
  if (seeded) return;
  if (!db) {
    initMemoryStore();
    seeded = true;
    return;
  }
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(alerts);
    if (count === 0) {
      await db.insert(alerts).values(ALERT_SEEDS.map(seedToRow)).onConflictDoNothing();
    }
    const [{ count: ac }] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);
    if (ac === 0) {
      await db.insert(auditLogs).values(auditSeed());
    }
    seeded = true;
  } catch (err) {
    console.warn("Database connection failed, falling back to in-memory store:", err);
    initMemoryStore();
    seeded = true;
  }
}

function seedToRow(a: AlertSeed): typeof alerts.$inferInsert {
  return {
    id: a.id,
    severity: a.severity,
    title: a.title,
    description: a.description,
    stationId: a.stationId,
    source: a.source,
    status: a.status,
    acknowledgedBy: a.acknowledgedBy ?? null,
    acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt) : null,
    assignedTo: a.assignedTo ?? null,
    snoozedUntil: null,
    correlationId: a.correlationId,
    createdAt: new Date(a.createdAt),
    updatedAt: new Date(a.acknowledgedAt ?? a.createdAt),
    metadata: a.metadata ?? {},
    fromScenario: a.fromScenario ?? false,
  };
}

function rowToAlert(r: AlertRow): Alert {
  return {
    id: r.id,
    severity: r.severity as Alert["severity"],
    title: r.title,
    description: r.description,
    stationId: r.stationId,
    source: r.source,
    status: r.status as Alert["status"],
    acknowledgedBy: r.acknowledgedBy,
    acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
    assignedTo: r.assignedTo,
    snoozedUntil: r.snoozedUntil?.toISOString() ?? null,
    correlationId: r.correlationId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    metadata: r.metadata ?? {},
    fromScenario: r.fromScenario,
  };
}

function rowToAudit(r: AuditLogRow): AuditLog {
  return { ...r, timestamp: r.timestamp.toISOString(), details: r.details ?? {} };
}

/* ------------------------------------------------------------------------ */
/* Alerts                                                                    */
/* ------------------------------------------------------------------------ */

export async function listAlerts(tick: number): Promise<Alert[]> {
  await ensureSeeded();
  const now = simNow(tick);
  const snaps = Object.fromEntries(allSnapshots(now).map((s) => [s.station.id, s]));
  const scenario = evaluateScenarioAlerts(snaps, now);

  if (!db || memStore.initialized) {
    if (scenario.length) {
      for (const s of scenario) {
        if (!memStore.alerts.has(s.id)) {
          memStore.alerts.set(s.id, {
            id: s.id,
            severity: s.severity as Alert["severity"],
            title: s.title,
            description: s.description,
            stationId: s.stationId,
            source: s.source,
            status: s.status as Alert["status"],
            acknowledgedBy: s.acknowledgedBy ?? null,
            acknowledgedAt: s.acknowledgedAt ? new Date(s.acknowledgedAt).toISOString() : null,
            assignedTo: s.assignedTo ?? null,
            snoozedUntil: null,
            correlationId: s.correlationId,
            createdAt: new Date(s.createdAt).toISOString(),
            updatedAt: new Date(s.acknowledgedAt ?? s.createdAt).toISOString(),
            metadata: s.metadata ?? {},
            fromScenario: s.fromScenario ?? false,
          });
        }
      }
    }
    if (!db) {
      return Array.from(memStore.alerts.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  }

  try {
    if (scenario.length) {
      await db.insert(alerts).values(scenario.map(seedToRow)).onConflictDoNothing();
    }
    const rows = await db.select().from(alerts).orderBy(desc(alerts.createdAt));
    return rows.map(rowToAlert);
  } catch {
    return Array.from(memStore.alerts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export async function alertCountsByStation(tick: number): Promise<Record<string, number>> {
  const list = await listAlerts(tick);
  const counts: Record<string, number> = {};
  for (const a of list) if (a.stationId && a.status !== "RESOLVED") counts[a.stationId] = (counts[a.stationId] ?? 0) + 1;
  return counts;
}

export type AlertAction = "acknowledge" | "resolve" | "snooze" | "assign" | "reopen";

export async function mutateAlert(id: string, action: AlertAction, actor: string, role: string, payload: { assignee?: string; minutes?: number } = {}) {
  await ensureSeeded();
  const now = new Date();

  if (!db) {
    const existing = memStore.alerts.get(id);
    if (!existing) return null;
    const patch: Partial<Alert> = { updatedAt: now.toISOString() };
    switch (action) {
      case "acknowledge":
        Object.assign(patch, { status: "ACKNOWLEDGED", acknowledgedBy: actor, acknowledgedAt: now.toISOString() });
        break;
      case "resolve":
        Object.assign(patch, { status: "RESOLVED" });
        break;
      case "snooze":
        Object.assign(patch, { status: "SNOOZED", snoozedUntil: new Date(now.getTime() + (payload.minutes ?? 30) * 60_000).toISOString() });
        break;
      case "assign":
        Object.assign(patch, { assignedTo: payload.assignee ?? actor });
        break;
      case "reopen":
        Object.assign(patch, { status: "OPEN", acknowledgedBy: null, acknowledgedAt: null, snoozedUntil: null });
        break;
    }
    const updated: Alert = { ...existing, ...patch };
    memStore.alerts.set(id, updated);
    await appendAudit({ actor, role, action: `ALERT_${action.toUpperCase()}`, resource: `alert:${id}`, status: "SUCCESS", details: { station: updated.stationId, severity: updated.severity } });
    return updated;
  }

  try {
    const patch: Partial<typeof alerts.$inferInsert> = { updatedAt: now };
    switch (action) {
      case "acknowledge":
        Object.assign(patch, { status: "ACKNOWLEDGED", acknowledgedBy: actor, acknowledgedAt: now });
        break;
      case "resolve":
        Object.assign(patch, { status: "RESOLVED" });
        break;
      case "snooze":
        Object.assign(patch, { status: "SNOOZED", snoozedUntil: new Date(now.getTime() + (payload.minutes ?? 30) * 60_000) });
        break;
      case "assign":
        Object.assign(patch, { assignedTo: payload.assignee ?? actor });
        break;
      case "reopen":
        Object.assign(patch, { status: "OPEN", acknowledgedBy: null, acknowledgedAt: null, snoozedUntil: null });
        break;
    }
    const [row] = await db.update(alerts).set(patch).where(eq(alerts.id, id)).returning();
    if (!row) return null;
    await appendAudit({ actor, role, action: `ALERT_${action.toUpperCase()}`, resource: `alert:${id}`, status: "SUCCESS", details: { station: row.stationId, severity: row.severity } });
    return rowToAlert(row);
  } catch {
    const existing = memStore.alerts.get(id);
    if (!existing) return null;
    const updated: Alert = { ...existing, status: (action === "acknowledge" ? "ACKNOWLEDGED" : action === "resolve" ? "RESOLVED" : "OPEN") as Alert["status"], updatedAt: now.toISOString() };
    memStore.alerts.set(id, updated);
    return updated;
  }
}

export async function resetScenario() {
  await ensureSeeded();
  if (!db) {
    for (const [id, a] of memStore.alerts.entries()) {
      if (a.fromScenario) {
        memStore.alerts.delete(id);
      }
    }
    const a1412 = memStore.alerts.get("ALR-1412");
    if (a1412) {
      memStore.alerts.set("ALR-1412", {
        ...a1412,
        status: "OPEN",
        acknowledgedBy: null,
        acknowledgedAt: null,
        updatedAt: new Date().toISOString(),
      });
    }
    return;
  }
  try {
    await db.delete(alerts).where(eq(alerts.fromScenario, true));
    await db.update(alerts).set({ status: "OPEN", acknowledgedBy: null, acknowledgedAt: null, updatedAt: new Date() }).where(and(eq(alerts.id, "ALR-1412"), eq(alerts.fromScenario, false)));
  } catch {
    for (const [id, a] of memStore.alerts.entries()) {
      if (a.fromScenario) memStore.alerts.delete(id);
    }
  }
}

/* ------------------------------------------------------------------------ */
/* Audit                                                                     */
/* ------------------------------------------------------------------------ */

export async function appendAudit(entry: { actor: string; role: string; action: string; resource: string; status: string; details?: Record<string, unknown>; durationMs?: number }) {
  await ensureSeeded();
  const requestId = `req_${hashString(`${entry.action}:${entry.resource}:${Date.now()}`).toString(16).padStart(8, "0")}`;
  const now = new Date();
  const auditItem: AuditLog = {
    id: memStore.auditLogs.length + 1,
    timestamp: now.toISOString(),
    actor: entry.actor,
    role: entry.role,
    action: entry.action,
    resource: entry.resource,
    requestId,
    ipAddress: entry.role === "service" ? "10.24.0.12" : "10.31.4.71",
    environment: "production",
    status: entry.status as "SUCCESS" | "FAILURE" | "DENIED",
    durationMs: entry.durationMs ?? Math.round(20 + Math.random() * 90),
    details: entry.details ?? {},
  };

  memStore.auditLogs.unshift(auditItem);

  if (db) {
    try {
      await db.insert(auditLogs).values({
        timestamp: now,
        actor: entry.actor,
        role: entry.role,
        action: entry.action,
        resource: entry.resource,
        requestId,
        ipAddress: entry.role === "service" ? "10.24.0.12" : "10.31.4.71",
        environment: "production",
        status: entry.status,
        durationMs: entry.durationMs ?? Math.round(20 + Math.random() * 90),
        details: entry.details ?? {},
      });
    } catch (e) {
      console.warn("Failed to write audit log to database:", e);
    }
  }
  return requestId;
}

export async function listAuditLogs(limit = 300): Promise<AuditLog[]> {
  await ensureSeeded();
  if (!db) {
    return memStore.auditLogs.slice(0, limit);
  }
  try {
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(limit);
    return rows.map(rowToAudit);
  } catch {
    return memStore.auditLogs.slice(0, limit);
  }
}

/* ------------------------------------------------------------------------ */
/* Stations                                                                 */
/* ------------------------------------------------------------------------ */

export async function listStationSnapshots(tick: number): Promise<StationSnapshot[]> {
  const counts = await alertCountsByStation(tick);
  return allSnapshots(simNow(tick), counts);
}

export async function stationDetail(id: string, tick: number): Promise<StationDetail | null> {
  const station = STATION_MAP[id];
  if (!station) return null;
  const now = simNow(tick);
  const counts = await alertCountsByStation(tick);
  const snap = stationSnapshot(id, now, counts[id] ?? 0);
  const fc = forecastSeries(id, now);
  const confidence = forecastConfidence(id, now, fc);
  const rainfallCorrelation = [0, 1, 2, 3, 4, 6, 8, 12, 18, 24].map((lag) => {
    const peak = station.category === "DAM_WEIR" ? 8 : station.category === "MIXED" ? 4 : 2.5;
    const amp = station.category === "DAM_WEIR" ? 0.28 : station.category === "MIXED" ? 0.52 : 0.71;
    return { lagHours: lag, correlation: round(amp * Math.exp(-Math.pow(lag - peak, 2) / (2 * Math.pow(peak * 0.9 + 1, 2))), 3) };
  });
  const inferenceHistory = Array.from({ length: 8 }, (_, i) => buildInferenceRequest(id, now - i * 10 * 60_000, String(Math.floor((now - i * 10 * 60_000) / 600_000) * 600_000), i === 0));
  return { ...snap, confidence, residualCorrelations: neighbours(id, 6), rainfallCorrelation, inferenceHistory, routing: routingSteps(station) };
}

export function stationHistory(id: string, tick: number, hours: number, stepMinutes: number) {
  const now = simNow(tick);
  const step = stepMinutes * 60_000;
  const from = Math.floor((now - hours * HOUR) / step) * step;
  return sampleHistory(id, from, now, step);
}

export function stationForecast(id: string, tick: number, anchorOffsetHours = 0) {
  const now = simNow(tick);
  const anchor = now - anchorOffsetHours * HOUR;
  const points = anchorOffsetHours > 0 ? forecastWithActuals(id, anchor, now) : forecastSeries(id, now);
  const confidence = forecastConfidence(id, anchor, points);
  return { stationId: id, anchor, now, modelVersion: MODEL.productionVersion, strategy: STATION_MAP[id].strategy, points, confidence, routing: routingSteps(STATION_MAP[id]) };
}

/* ------------------------------------------------------------------------ */
/* Network                                                                  */
/* ------------------------------------------------------------------------ */

export async function network(tick: number) {
  const nodes = await listStationSnapshots(tick);
  const graph = buildNetwork(nodes, simNow(tick));
  return { ...graph, ancestors: Object.fromEntries(STATIONS.map((s) => [s.id, ancestorsOf(s.id)])), descendants: Object.fromEntries(STATIONS.map((s) => [s.id, descendantsOf(s.id)])) };
}

export { residualCorrelation };

/* ------------------------------------------------------------------------ */
/* Overview                                                                 */
/* ------------------------------------------------------------------------ */

export async function overview(tick: number): Promise<OverviewData> {
  const now = simNow(tick);
  const alertsList = await listAlerts(tick);
  const counts: Record<string, number> = {};
  for (const a of alertsList) if (a.stationId && a.status !== "RESOLVED") counts[a.stationId] = (counts[a.stationId] ?? 0) + 1;
  const snapshots = allSnapshots(now, counts);
  const riskDistribution = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
  const categoryDistribution = { DAM_WEIR: 0, MIXED: 0, NATURAL: 0 };
  for (const s of snapshots) {
    riskDistribution[s.risk]++;
    categoryDistribution[s.station.category]++;
  }
  const horizons: { h: number; label: string }[] = [
    { h: 6, label: "Next 6h" },
    { h: 12, label: "Next 12h" },
    { h: 24, label: "Next 24h" },
    { h: 48, label: "Next 48h" },
  ];
  const focusIds = ["BS-008", "BS-009", "BS-012", "BS-011", "BS-017", "BS-004"];
  const fcs = Object.fromEntries(focusIds.map((id) => [id, forecastSeries(id, now, 48)]));
  const forecastOverview = horizons.map(({ h, label }) => ({
    t: now + h * HOUR,
    horizonLabel: label,
    stations: focusIds.map((id) => ({ id, predicted: fcs[id][h - 1].predicted, lower: fcs[id][h - 1].lower, upper: fcs[id][h - 1].upper })),
  }));

  // Network-level index: mean threshold ratio across the primary network (past 24h + next 48h)
  const primary = STATIONS.filter((s) => s.primaryNetwork).map((s) => s.id);
  const primaryFc = Object.fromEntries(primary.map((id) => [id, forecastSeries(id, now, 48)]));
  const networkForecast: OverviewData["networkForecast"] = [];
  for (let h = -24; h <= 48; h += 2) {
    const t = now + h * HOUR;
    if (h <= 0) {
      const vals = primary.map((id) => {
        const hist = sampleHistory(id, t, t, HOUR)[0];
        return (hist.tma ?? STATION_MAP[id].thresholds.alert * 0.5) / STATION_MAP[id].thresholds.alert;
      });
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      networkForecast.push({ t, actual: round(m, 4), predicted: round(m, 4), lower: round(m, 4), upper: round(m, 4) });
    } else {
      const p = primary.map((id) => primaryFc[id][h - 1]);
      const m = (k: "predicted" | "lower" | "upper") => round(p.reduce((a, b, i) => a + b[k] / STATION_MAP[primary[i]].thresholds.alert, 0) / p.length, 4);
      networkForecast.push({ t, actual: null, predicted: m("predicted"), lower: m("lower"), upper: m("upper") });
    }
  }

  const openAlerts = alertsList.filter((a) => a.status === "OPEN").length;
  const criticalAlerts = alertsList.filter((a) => a.status !== "RESOLVED" && a.severity === "CRITICAL").length;
  const health = systemHealth(now, 0);
  const degraded = health.some((h) => h.status === "DEGRADED");
  const scenario = scenarioState(tick, snapshots);
  return {
    generatedAt: Date.now(),
    simulatedNow: now,
    modelVersion: MODEL.productionVersion,
    freshnessSec: 14 + (Math.floor(now / 1000) % 9),
    systemStatus: criticalAlerts > 0 ? "INCIDENT" : degraded ? "DEGRADED" : "OPERATIONAL",
    kpis: {
      stations: DATASET.stations,
      primaryNetwork: DATASET.primaryNetwork,
      trainingObservations: DATASET.trainingObservations,
      testObservations: DATASET.testObservations,
      holdoutRmse: MODEL.holdoutRmse,
      missingRate: DATASET.missingRate,
    },
    riskDistribution,
    categoryDistribution,
    stations: snapshots,
    openAlerts,
    criticalAlerts,
    forecastOverview,
    networkForecast,
    recentEvents: recentEvents(tick, snapshots, alertsList),
    scenario,
  };
}

function recentEvents(tick: number, snapshots: StationSnapshot[], alertList: Alert[]): SimEvent[] {
  const now = simNow(tick);
  const events: SimEvent[] = [];
  const cycle = Math.floor(now / 600_000) * 600_000;
  events.push({ id: `ev-ingest-${cycle}`, type: "DATA_INGESTED", timestamp: now - 18_000, message: `Telemetry batch ingested · ${snapshots.filter((s) => s.status === "ONLINE").length}/30 stations · 14 s latency`, severity: "info" });
  events.push({ id: `ev-fc-${cycle}`, type: "FORECAST_COMPLETED", timestamp: cycle + 95_000, message: "Forecast cycle completed · 30 stations · 7 horizons · 210 predictions", severity: "info" });
  events.push({ id: `ev-inf-${cycle}`, type: "INFERENCE_COMPLETED", timestamp: cycle + 71_000, message: `Inference batch · P95 ${Math.round(196 + (tick % 7) * 3)} ms · 0 errors`, severity: "info" });
  for (const a of alertList.filter((x) => x.fromScenario).slice(0, 3)) {
    events.push({ id: `ev-alert-${a.id}`, type: "ALERT_CREATED", timestamp: new Date(a.createdAt).getTime(), message: a.title, stationId: a.stationId ?? undefined, severity: a.severity === "CRITICAL" ? "critical" : "warning" });
  }
  const rising = snapshots.filter((s) => s.trend === "RISING" && s.risk !== "LOW");
  for (const s of rising.slice(0, 2)) {
    events.push({ id: `ev-status-${s.station.id}-${s.risk}`, type: "STATION_STATUS_CHANGED", timestamp: now - 120_000, message: `${s.station.name} risk → ${s.risk} (${Math.round(s.thresholdRatio * 100)}% of threshold)`, stationId: s.station.id, severity: s.risk === "HIGH" || s.risk === "CRITICAL" ? "critical" : "warning" });
  }
  events.push({ id: `ev-metric-${Math.floor(now / 3600_000)}`, type: "MODEL_METRIC_UPDATED", timestamp: now - 25 * 60_000, message: "Rolling 24h RMSE updated · 0.8412 (holdout 0.8387)", severity: "info" });
  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
}

/* ------------------------------------------------------------------------ */
/* Inference / Health / Data quality / Models                              */
/* ------------------------------------------------------------------------ */

function scenarioLoad(tick: number): number {
  return tick > 6 && tick < 80 ? Math.min(1, (tick - 6) / 20) : 0;
}

export function inference(tick: number) {
  const now = simNow(tick);
  return { metrics: inferenceMetrics(now, scenarioLoad(tick)), requests: recentInferenceRequests(now, 80), modelVersion: MODEL.productionVersion };
}

export function health(tick: number) {
  const now = simNow(tick);
  return { services: systemHealth(now, scenarioLoad(tick)), generatedAt: now };
}

export function dataQuality(tick: number) {
  return dataQualityReport(simNow(tick));
}

export function models() {
  return MODEL_VERSIONS;
}

export function experiments() {
  return EXPERIMENTS;
}

export async function runForecast(stationId: string, tick: number, actor: string, role: string) {
  const now = simNow(tick);
  const req = buildInferenceRequest(stationId, Date.now(), `manual:${Date.now()}`, true);
  await appendAudit({ actor, role, action: "FORECAST_RUN", resource: `station:${STATION_MAP[stationId]?.name ?? stationId}`, status: "SUCCESS", details: { request_id: req.requestId, trace_id: req.traceId }, durationMs: req.latencyMs });
  return { request: req, forecast: stationForecast(stationId, tick), now };
}

export async function search(q: string, tick: number): Promise<SearchResult[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const out: SearchResult[] = [];
  for (const s of STATIONS) {
    if (s.name.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle) || s.river.toLowerCase().includes(needle)) {
      out.push({ type: "station", id: s.id, title: `${s.name}`, subtitle: `${s.id} · ${s.river}`, href: `/stations?station=${s.id}` });
    }
  }
  const al = await listAlerts(tick);
  for (const a of al) {
    if (a.title.toLowerCase().includes(needle) || a.id.toLowerCase().includes(needle)) out.push({ type: "alert", id: a.id, title: a.title, subtitle: `${a.id} · ${a.severity} · ${a.status}`, href: `/alerts?alert=${a.id}` });
  }
  for (const m of MODEL_VERSIONS) if (m.version.toLowerCase().includes(needle) || m.name.toLowerCase().includes(needle)) out.push({ type: "model", id: m.version, title: m.version, subtitle: `${m.name} · ${m.status}`, href: `/models?version=${m.version}` });
  for (const e of EXPERIMENTS) if (e.id.toLowerCase().includes(needle) || e.name.toLowerCase().includes(needle)) out.push({ type: "experiment", id: e.id, title: `${e.id} · ${e.name}`, subtitle: `RMSE ${e.rmse || "—"} · ${e.status}`, href: `/experiments?exp=${e.id}` });
  if (needle.startsWith("req") || needle.startsWith("trace")) {
    for (const r of recentInferenceRequests(simNow(tick), 80)) if (r.requestId.includes(needle) || r.traceId.includes(needle)) out.push({ type: "inference", id: r.requestId, title: r.requestId, subtitle: `${r.stationId} · ${r.latencyMs} ms · ${r.status}`, href: `/inference?request=${r.requestId}` });
  }
  return out.slice(0, 30);
}
