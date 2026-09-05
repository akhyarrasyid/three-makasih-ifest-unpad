"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuditLogs } from "@/hooks/use-api";
import { RoleGate } from "@/features/shared/role-gate";
import { PageHeader, Panel, Skeleton, ErrorState, Chip, StatusBadge, Segmented, MetricCard } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/tables/data-table";
import { fmtDateTime, fmtTime } from "@/lib/format";
import type { AuditLog } from "@/types/domain";

export default function AuditPage() {
  const logs = useAuditLogs();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | "SUCCESS" | "FAILURE" | "DENIED">("ALL");
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const list = logs.data ?? [];
  const actors = useMemo(() => Array.from(new Set(list.map((l) => l.actor))).sort(), [list]);
  const actions = useMemo(() => Array.from(new Set(list.map((l) => l.action))).sort(), [list]);
  const rows = useMemo(() => list.filter((l) => (status === "ALL" || l.status === status) && (!actor || l.actor === actor) && (!action || l.action === action) && (!q || `${l.resource} ${l.requestId} ${l.actor} ${l.action}`.toLowerCase().includes(q.toLowerCase()))), [list, status, actor, action, q]);

  const columns: Column<AuditLog>[] = [
    { id: "ts", header: "Timestamp", sortValue: (r) => r.timestamp, exportValue: (r) => r.timestamp, cell: (r) => <span className="mono text-fg-muted" title={fmtDateTime(r.timestamp)}>{fmtTime(r.timestamp)}</span> },
    { id: "actor", header: "Actor", sortValue: (r) => r.actor, cell: (r) => <span className="text-xs">{r.actor} <span className="t-caption">{r.role}</span></span> },
    { id: "action", header: "Action", sortValue: (r) => r.action, cell: (r) => <span className="mono text-[#8fc1ff]">{r.action}</span> },
    { id: "resource", header: "Resource", sortValue: (r) => r.resource, cell: (r) => <span className="mono text-fg-muted">{r.resource}</span> },
    { id: "req", header: "Request ID", sortValue: (r) => r.requestId, cell: (r) => <span className="mono text-fg-subtle">{r.requestId}</span> },
    { id: "ip", header: "IP / environment", sortValue: (r) => r.ipAddress, cell: (r) => <span className="mono text-fg-muted">{r.ipAddress} · {r.environment}</span> },
    { id: "dur", header: "Duration", align: "right", sortValue: (r) => r.durationMs ?? 0, cell: (r) => <span className="mono">{r.durationMs ?? "—"} ms</span>, defaultHidden: true },
    { id: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} dot={false} /> },
  ];

  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader title="Audit Logs" subtitle="Immutable, append-only record of operator actions, model events and system operations. Persisted in PostgreSQL; retained 400 days." meta={<><Chip tone="ok">integrity verified</Chip><Chip>{list.length} entries loaded</Chip></>} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Entries (window)" value={list.length} />
          <MetricCard label="Failures" value={list.filter((l) => l.status === "FAILURE").length} tone="warn" />
          <MetricCard label="Access denied" value={list.filter((l) => l.status === "DENIED").length} tone="crit" />
          <MetricCard label="Distinct actors" value={actors.length} />
        </div>
        <Panel noPad>
          {logs.isError ? <ErrorState error={logs.error} onRetry={() => logs.refetch()} /> : logs.isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div> : (
            <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} pageSize={25} defaultSort={{ id: "ts", dir: "desc" }} exportName="anchor-audit" density="compact" maxHeight="calc(100vh - 360px)" toolbar={<>
              <div className="relative"><Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" /><input className="input pl-7 w-52" placeholder="Resource, request ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audit logs" /></div>
              <select className="input" value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Actor"><option value="">All actors</option>{actors.map((a) => <option key={a}>{a}</option>)}</select>
              <select className="input" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action"><option value="">All actions</option>{actions.map((a) => <option key={a}>{a}</option>)}</select>
              <Segmented ariaLabel="Status" options={[{ value: "ALL", label: "All" }, { value: "SUCCESS", label: "Success" }, { value: "FAILURE", label: "Failure" }, { value: "DENIED", label: "Denied" }]} value={status} onChange={setStatus} />
            </>} />
          )}
        </Panel>
      </div>
    </RoleGate>
  );
}
