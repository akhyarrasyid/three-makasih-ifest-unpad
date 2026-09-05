"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInference } from "@/hooks/use-api";
import { useUiStore } from "@/store/ui-store";
import { RoleGate } from "@/features/shared/role-gate";
import { PageHeader, Panel, MetricCard, Skeleton, ErrorState, Chip, StatusBadge, Segmented, Dialog } from "@/components/ui/primitives";
import { MetricLineChart, CHART_COLORS } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/tables/data-table";
import { InferenceTrace } from "@/features/inference/trace-view";
import { STATION_MAP } from "@/mock/stations";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InferenceRequest } from "@/types/domain";

const PIPELINE = ["API Request", "Orchestrator", "Data Processing", "Station Router", "Model Ensemble", "Spatial Reconciliation", "Prediction", "Response"];

function InferenceInner() {
  const params = useSearchParams();
  const inf = useInference();
  const demo = useUiStore((s) => s.demoMode);
  const [selected, setSelected] = useState<InferenceRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "DEGRADED" | "ERROR" | "TIMEOUT">("ALL");
  const [stationFilter, setStationFilter] = useState<string>(params.get("station") ?? "");
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStage((s) => (s + 1) % PIPELINE.length), demo ? 450 : 900);
    return () => clearInterval(id);
  }, [demo]);

  useEffect(() => {
    const r = params.get("request");
    if (r && inf.data) {
      const found = inf.data.requests.find((x) => x.requestId === r);
      if (found) setSelected(found);
    }
  }, [params, inf.data]);

  const d = inf.data;
  const rows = useMemo(() => (d?.requests ?? []).filter((r) => (statusFilter === "ALL" || r.status === statusFilter) && (!stationFilter || r.stationId === stationFilter)), [d, statusFilter, stationFilter]);

  const columns: Column<InferenceRequest>[] = [
    { id: "req", header: "request_id", hideable: false, sortValue: (r) => r.requestId, cell: (r) => <span className="mono text-accent-water">{r.requestId}</span> },
    { id: "ts", header: "timestamp", sortValue: (r) => r.timestamp, cell: (r) => <span className="mono text-fg-muted">{fmtTime(r.timestamp)}</span> },
    { id: "station", header: "station_id", sortValue: (r) => r.stationId, cell: (r) => <span className="text-xs">{r.stationId} <span className="t-caption">{STATION_MAP[r.stationId]?.name}</span></span> },
    { id: "model", header: "model_version", sortValue: (r) => r.modelVersion, cell: (r) => <span className="mono text-accent-water">{r.modelVersion}</span>, defaultHidden: true },
    { id: "route", header: "routing_decision", cell: (r) => <span className="mono text-fg-muted">{r.route.join(" → ")}</span> },
    { id: "latency", header: "latency", align: "right", sortValue: (r) => r.latencyMs, cell: (r) => <span className={cn("mono", r.latencyMs > 250 ? "text-[#f5c261]" : "")}>{r.latencyMs} ms</span> },
    { id: "features", header: "features", align: "right", sortValue: (r) => r.featureCount, cell: (r) => <span className="mono">{r.featureCount}</span>, defaultHidden: true },
    { id: "horizons", header: "forecast_horizon", cell: () => <span className="mono text-fg-muted">1…72h (7)</span>, defaultHidden: true },
    { id: "conf", header: "confidence", align: "right", sortValue: (r) => r.confidence, cell: (r) => <span className="mono">{r.confidence ? `${Math.round(r.confidence * 100)}%` : "—"}</span> },
    { id: "status", header: "status", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} dot={false} /> },
  ];

  if (inf.isError) return <ErrorState error={inf.error} onRetry={() => inf.refetch()} title="Inference control plane unavailable" />;

  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader title="Inference Control Plane" subtitle="Real-time observability for the ANCHOR forecasting service — throughput, latency distribution, worker pool and per-request distributed traces." meta={<><Chip tone="water">{d?.modelVersion ?? "…"}</Chip><Chip tone="ok">SLA P95 &lt; 250 ms</Chip><Chip>6 workers · ap-southeast-3</Chip></>} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {d ? (
            <>
              <MetricCard label="Requests/sec" value={d.metrics.requestsPerSec.toFixed(1)} />
              <MetricCard label="P50 latency" value={d.metrics.p50Ms} unit="ms" />
              <MetricCard label="P95 latency" value={d.metrics.p95Ms} unit="ms" tone={d.metrics.p95Ms > 250 ? "warn" : "neutral"} />
              <MetricCard label="P99 latency" value={d.metrics.p99Ms} unit="ms" tone={d.metrics.p99Ms > 400 ? "warn" : "neutral"} />
              <MetricCard label="Error rate" value={`${(d.metrics.errorRate * 100).toFixed(2)}%`} tone={d.metrics.errorRate > 0.01 ? "crit" : "ok"} />
              <MetricCard label="Throughput" value={d.metrics.throughputPerMin} unit="/min" />
              <MetricCard label="Queue depth" value={d.metrics.queueDepth} tone={d.metrics.queueDepth > 10 ? "warn" : "neutral"} />
              <MetricCard label="Active workers" value={`${d.metrics.activeWorkers}/${d.metrics.totalWorkers}`} tone="ok" />
            </>
          ) : (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[84px]" />)
          )}
        </div>

        <Panel title="Inference pipeline" subtitle="Live request flow through the serving graph · active stage highlighted" noPad>
          <div className="flex items-stretch overflow-x-auto p-4 gap-1">
            {PIPELINE.map((p, i) => (
              <div key={p} className="flex items-center gap-1 shrink-0">
                <div className={cn("relative rounded-md border px-3 py-2 text-xs min-w-[128px] transition-colors", i === activeStage ? "border-accent-water/40 bg-accent-water/10 text-accent-water" : "border-border bg-surface-0 text-fg-muted")}>
                  <div className="font-medium">{p}</div>
                  <div className="t-caption !text-[10px] mt-0.5">{["gateway", "orchestrator", "feature-pipeline", "router", "model-service", "graph-service", "orchestrator", "gateway"][i]}</div>
                  {i === activeStage && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent-water" />}
                </div>
                {i < PIPELINE.length - 1 && <div className={cn("h-px w-5", i < activeStage ? "bg-accent-water" : "bg-border-strong")} />}
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Request rate" subtitle="Requests per second · last 60 minutes">
            {d ? <MetricLineChart data={d.metrics.timeline} xFormatter={(v) => fmtTime(v, false)} series={[{ key: "rps", name: "req/s", color: CHART_COLORS.actual, area: true }]} unit="" height={180} /> : <Skeleton className="h-[180px]" />}
          </Panel>
          <Panel title="P95 latency" subtitle="Milliseconds · SLA 250 ms">
            {d ? <MetricLineChart data={d.metrics.timeline} xFormatter={(v) => fmtTime(v, false)} series={[{ key: "p95", name: "P95 ms", color: CHART_COLORS.forecast }]} unit="ms" height={180} referenceY={{ value: 250, label: "SLA", color: CHART_COLORS.critical }} yDomain={[120, 320]} /> : <Skeleton className="h-[180px]" />}
          </Panel>
        </div>

        <Panel title="Inference request timeline" subtitle="Scheduled 10-minute cycles across 30 stations plus on-demand requests · click a row for the full trace" noPad actions={<div className="flex gap-2"><select className="input" value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} aria-label="Station filter"><option value="">All stations</option>{Object.values(STATION_MAP).map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select><Segmented ariaLabel="Status" options={[{ value: "ALL", label: "All" }, { value: "SUCCESS", label: "Success" }, { value: "DEGRADED", label: "Degraded" }, { value: "ERROR", label: "Error" }, { value: "TIMEOUT", label: "Timeout" }]} value={statusFilter} onChange={setStatusFilter} /></div>}>
          {d ? <DataTable columns={columns} rows={rows} rowKey={(r) => r.requestId} pageSize={12} onRowClick={setSelected} selectedKey={selected?.requestId} defaultSort={{ id: "ts", dir: "desc" }} exportName="anchor-inference" density="compact" /> : <Skeleton className="m-3 h-72" />}
        </Panel>

        <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected?.requestId ?? ""} description="Distributed trace and routing decision" width="max-w-2xl">
          {selected && <InferenceTrace request={selected} />}
        </Dialog>
      </div>
    </RoleGate>
  );
}

export default function InferencePage() {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh]" />}>
      <InferenceInner />
    </Suspense>
  );
}
