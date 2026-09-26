"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, CheckCheck, Clock, UserPlus, ExternalLink, X, RotateCcw, Search, Loader2, GitFork, Droplets, Activity } from "lucide-react";
import { useAlerts, useAlertMutation, useStations } from "@/hooks/use-api";
import { useUiStore } from "@/store/ui-store";
import { useSelectionStore } from "@/store/selection-store";
import { DataTable, type Column } from "@/components/tables/data-table";
import { PageHeader, Panel, SeverityBadge, StatusBadge, RiskBadge, Skeleton, ErrorState, Segmented, MetricCard, KV, ConfirmDialog, Dialog, Chip, Sparkline, RISK_STYLES } from "@/components/ui/primitives";
import { STATIC_STATION_MAP } from "@/data/network-static";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { SIM_BASE_NOW, SIM_TICK_MS } from "@/config/constants";
import type { Alert, AlertSeverity, AlertStatus } from "@/types/domain";

const SEV_ORDER: Record<AlertSeverity, number> = { CRITICAL: 0, WARNING: 1, MODEL: 2, DATA_QUALITY: 3, INFO: 4 };

function AlertsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const alerts = useAlerts();
  const stations = useStations();
  const mutate = useAlertMutation();
  const user = useUiStore((s) => s.user);
  const tick = useUiStore((s) => s.tick);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const queryAlert = params.get("alert");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeAlertId = selectedId ?? queryAlert;
  const [status, setStatus] = useState<AlertStatus | "ACTIVE" | "ALL">("ACTIVE");
  const [severity, setSeverity] = useState<AlertSeverity | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<{ action: string; label: string; danger?: boolean } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState("d.santoso");

  const list = alerts.data ?? [];
  const rows = useMemo(() => list.filter((a) => (status === "ALL" || (status === "ACTIVE" ? a.status !== "RESOLVED" : a.status === status)) && (severity === "ALL" || a.severity === severity) && (!q || `${a.title} ${a.id} ${a.stationId ?? ""} ${a.correlationId}`.toLowerCase().includes(q.toLowerCase()))), [list, status, severity, q]);
  const selected = list.find((a) => a.id === activeAlertId) ?? null;
  const snap = selected?.stationId ? stations.data?.find((s) => s.station.id === selected.stationId) : undefined;
  const simNow = SIM_BASE_NOW + tick * SIM_TICK_MS;

  const counts = { open: list.filter((a) => a.status === "OPEN").length, ack: list.filter((a) => a.status === "ACKNOWLEDGED").length, critical: list.filter((a) => a.status !== "RESOLVED" && a.severity === "CRITICAL").length, resolved24: list.filter((a) => a.status === "RESOLVED").length };

  const act = (action: string, body?: Record<string, unknown>) => {
    if (!selected) return;
    mutate.mutate({ id: selected.id, action, body }, { onSettled: () => { setConfirm(null); setAssignOpen(false); } });
  };

  const columns: Column<Alert>[] = [
    { id: "severity", header: "Severity", sortValue: (r) => SEV_ORDER[r.severity], exportValue: (r) => r.severity, cell: (r) => <SeverityBadge severity={r.severity} /> },
    { id: "title", header: "Alert", hideable: false, sortValue: (r) => r.title, cell: (r) => <div className="max-w-[420px]"><div className="truncate text-xs font-medium">{r.title}</div><div className="t-caption mono">{r.id}{r.fromScenario ? " · scenario" : ""}</div></div> },
    { id: "station", header: "HUC12 Basin", sortValue: (r) => r.stationId ?? "", cell: (r) => (r.stationId ? <span className="text-xs">{STATIC_STATION_MAP[r.stationId]?.name ?? r.stationId} <span className="mono text-fg-subtle">{r.stationId}</span></span> : <span className="t-caption">network</span>) },
    { id: "source", header: "Source", sortValue: (r) => r.source, cell: (r) => <span className="mono text-fg-muted">{r.source}</span> },
    { id: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} dot={false} /> },
    { id: "ack", header: "Acknowledged by", sortValue: (r) => r.acknowledgedBy ?? "", cell: (r) => <span className="text-xs text-fg-muted">{r.acknowledgedBy ?? "—"}</span>, defaultHidden: true },
    { id: "assigned", header: "Assignee", sortValue: (r) => r.assignedTo ?? "", cell: (r) => <span className="text-xs text-fg-muted">{r.assignedTo ?? "—"}</span> },
    { id: "created", header: "Created", align: "right", sortValue: (r) => r.createdAt, cell: (r) => <span className="mono text-fg-muted" title={fmtDateTime(r.createdAt)}>{fmtRelative(r.createdAt, simNow)}</span> },
    { id: "corr", header: "Correlation ID", sortValue: (r) => r.correlationId, cell: (r) => <span className="mono text-fg-subtle">{r.correlationId}</span>, defaultHidden: true },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Risk Alerts" subtitle="Operational incident management for water-stress threshold exceedance, supply deficits, upstream stress transmission, and model confidence signals." meta={<><Chip tone="crit">{counts.critical} critical</Chip><Chip tone="warn">{counts.open} open</Chip><Chip tone="water">{counts.ack} acknowledged</Chip></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 font-mono">
        <MetricCard label="Open Alerts" value={counts.open} tone={counts.open ? "crit" : "ok"} hint="awaiting operator review" />
        <MetricCard label="Acknowledged" value={counts.ack} tone="water" hint="under mitigation" />
        <MetricCard label="Critical (Active)" value={counts.critical} tone={counts.critical ? "crit" : "neutral"} hint="critical water stress" />
        <MetricCard label="Resolved" value={counts.resolved24} tone="ok" hint="recorded in audit log" />
      </div>

      <div className={`grid gap-4 ${selected ? "xl:grid-cols-[minmax(0,1fr)_440px]" : ""}`}>
        <Panel noPad>
          {alerts.isError ? (
            <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
          ) : alerts.isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              selectedKey={activeAlertId ?? undefined}
              onRowClick={(r) => { setSelectedId(r.id); if (r.stationId) selectStation(r.stationId); }}
              defaultSort={{ id: "created", dir: "desc" }}
              exportName="tirta-alerts"
              emptyTitle="No alerts match the current filters"
              emptyDescription="Try widening the status or severity filter."
              toolbar={
                <>
                  <div className="relative"><Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" /><input className="input pl-7 w-48 font-mono text-xs" placeholder="Search alerts…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search alerts" /></div>
                  <Segmented ariaLabel="Status" options={[{ value: "ACTIVE", label: "Active" }, { value: "OPEN", label: "Open" }, { value: "ACKNOWLEDGED", label: "Ack" }, { value: "RESOLVED", label: "Resolved" }, { value: "ALL", label: "All" }]} value={status} onChange={setStatus} />
                  <select className="input font-mono text-xs" value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity | "ALL")} aria-label="Severity">
                    <option value="ALL">All severities</option>
                    {(["CRITICAL", "WARNING", "INFO", "DATA_QUALITY", "MODEL"] as AlertSeverity[]).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </>
              }
            />
          )}
        </Panel>

        {selected && (
          <Panel noPad className="xl:sticky xl:top-0 xl:max-h-[calc(100vh-7rem)] overflow-hidden fade-up">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><SeverityBadge severity={selected.severity} /><StatusBadge status={selected.status} dot={false} /></div>
                  <h2 className="t-h2 mt-2">{selected.title}</h2>
                  <div className="t-caption mono mt-0.5">{selected.id} · {selected.correlationId}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedId(null)} aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="t-body text-fg-muted">{selected.description}</p>
                <div className="flex flex-wrap gap-2">
                  {selected.status === "OPEN" && <button className="btn btn-primary btn-sm font-mono text-xs" onClick={() => setConfirm({ action: "acknowledge", label: "Acknowledge alert" })}><Check className="h-3.5 w-3.5" /> Acknowledge</button>}
                  {selected.status !== "RESOLVED" && <button className="btn btn-sm font-mono text-xs" onClick={() => setConfirm({ action: "resolve", label: "Resolve alert" })}><CheckCheck className="h-3.5 w-3.5" /> Resolve</button>}
                  {selected.status !== "RESOLVED" && <button className="btn btn-sm font-mono text-xs" onClick={() => act("snooze", { minutes: 30 })}><Clock className="h-3.5 w-3.5" /> Snooze 30m</button>}
                  {selected.status !== "RESOLVED" && <button className="btn btn-sm font-mono text-xs" onClick={() => setAssignOpen(true)}><UserPlus className="h-3.5 w-3.5" /> Assign</button>}
                  {selected.status === "RESOLVED" && <button className="btn btn-sm font-mono text-xs" onClick={() => setConfirm({ action: "reopen", label: "Reopen alert", danger: true })}><RotateCcw className="h-3.5 w-3.5" /> Reopen</button>}
                  {mutate.isPending && <Loader2 className="h-4 w-4 animate-spin text-fg-subtle" />}
                </div>
                {snap && (
                  <div className="rounded-md border border-border bg-surface-0 p-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase text-fg-subtle font-semibold tracking-wider">Affected HUC12 Sub-Basin</div>
                      <RiskBadge risk={snap.risk} />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-fg">{snap.station.name} <span className="mono text-fg-subtle">{snap.station.id}</span></div>
                        <div className="text-[11px] text-fg-muted mt-0.5">
                          Supply: {snap.currentSupply.toFixed(1)} m³/s · Anomaly: {snap.climatologyAnomalySigma.toFixed(2)}σ · Risk: {(snap.riskScore * 100).toFixed(0)}%
                        </div>
                      </div>
                      <Sparkline data={snap.sparkline} width={80} height={24} stroke={RISK_STYLES[snap.risk].hex} />
                    </div>
                    {/* Interaction Links per Prompt Section 24 */}
                    <div className="mt-3 flex gap-2">
                      <Link href={`/network?station=${snap.station.id}`} className="btn btn-sm flex-1 justify-center text-xs">
                        <GitFork className="h-3 w-3 mr-1 text-cyan-400" /> River Network
                      </Link>
                      <Link href={`/forecasts?station=${snap.station.id}`} className="btn btn-sm flex-1 justify-center text-xs">
                        <Droplets className="h-3 w-3 mr-1 text-water" /> Forecast
                      </Link>
                      <Link href={`/inference?station=${snap.station.id}`} className="btn btn-sm flex-1 justify-center text-xs">
                        <Activity className="h-3 w-3 mr-1 text-purple-400" /> Trace
                      </Link>
                    </div>
                  </div>
                )}
                <div className="font-mono text-xs">
                  <div className="text-[10px] uppercase text-fg-subtle font-semibold tracking-wider mb-1">Incident Telemetry</div>
                  <KV k="Source" v={selected.source} mono />
                  <KV k="Created" v={fmtDateTime(selected.createdAt)} mono />
                  <KV k="Updated" v={fmtDateTime(selected.updatedAt)} mono />
                  <KV k="Acknowledged by" v={selected.acknowledgedBy ?? "—"} />
                  <KV k="Assigned to" v={selected.assignedTo ?? "—"} />
                  {selected.snoozedUntil && <KV k="Snoozed until" v={fmtDateTime(selected.snoozedUntil)} mono />}
                  <KV k="Correlation ID" v={selected.correlationId} mono />
                  <KV k="Origin" v={selected.fromScenario ? "Demo scenario injection" : "Telemetry audit"} />
                </div>
                {Object.keys(selected.metadata).length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-fg-subtle font-semibold tracking-wider mb-1">Payload Envelope</div>
                    <pre className="rounded-md border border-border bg-surface-0 p-3 mono text-xs text-fg-muted overflow-auto">{JSON.stringify(selected.metadata, null, 2)}</pre>
                  </div>
                )}
                <p className="t-caption">Actions are recorded in the audit trail as {user?.email.split("@")[0]} ({user?.role}).</p>
              </div>
            </div>
          </Panel>
        )}
      </div>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && act(confirm.action)} title={confirm?.label ?? ""} description={`${selected?.title ?? ""} — this action will be attributed to ${user?.name} and appended to the audit log.`} confirmLabel={confirm?.label.split(" ")[0]} danger={confirm?.danger} busy={mutate.isPending} />
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign alert" description="Route this alert to an on-call responder" footer={<><button className="btn" onClick={() => setAssignOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={() => act("assign", { assignee })}>Assign</button></>}>
        <select className="input w-full font-mono text-xs" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
          <option value="d.santoso">d.santoso · Water Resources Operator (on-call)</option>
          <option value="a.prasetyo">a.prasetyo · Staff ML Engineer</option>
          <option value="n.wulandari">n.wulandari · Hydrology Specialist</option>
          <option value="admin.ops">admin.ops · Platform Administrator</option>
        </select>
      </Dialog>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh]" />}>
      <AlertsInner />
    </Suspense>
  );
}
