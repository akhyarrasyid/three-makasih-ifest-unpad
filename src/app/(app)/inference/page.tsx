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
import { STATIC_STATION_MAP, STATIC_STATIONS } from "@/data/network-static";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InferenceRequest } from "@/types/domain";

const TIRTA_PIPELINE = [
  "Forecast Request",
  "Feature Retrieval",
  "Hydrology Processing",
  "Temporal Context",
  "Reachability Lookup",
  "GBDT Inference",
  "Directed GNN",
  "Model Fusion",
  "Risk Interpretation",
  "Response",
];

function InferenceInner() {
  const params = useSearchParams();
  const inf = useInference();
  const demo = useUiStore((s) => s.demoMode);
  const [selected, setSelected] = useState<InferenceRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "DEGRADED" | "ERROR" | "TIMEOUT">("ALL");
  const [stationFilter, setStationFilter] = useState<string>(params.get("station") ?? "");
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveStage((s) => (s + 1) % TIRTA_PIPELINE.length), demo ? 450 : 900);
    return () => clearInterval(id);
  }, [demo]);

  const queryRequestId = params.get("request");
  const activeSelected = useMemo(() => {
    if (selected) return selected;
    if (queryRequestId && inf.data) {
      return inf.data.requests.find((x) => x.requestId === queryRequestId) ?? null;
    }
    return null;
  }, [selected, queryRequestId, inf.data]);

  const d = inf.data;
  const rows = useMemo(
    () =>
      (d?.requests ?? []).filter(
        (r) =>
          (statusFilter === "ALL" || r.status === statusFilter) &&
          (!stationFilter || r.stationId === stationFilter)
      ),
    [d, statusFilter, stationFilter]
  );

  const columns: Column<InferenceRequest>[] = [
    {
      id: "req",
      header: "request_id",
      hideable: false,
      sortValue: (r) => r.requestId,
      cell: (r) => <span className="mono text-water font-medium">{r.requestId}</span>,
    },
    {
      id: "ts",
      header: "timestamp",
      sortValue: (r) => r.timestamp,
      cell: (r) => <span className="mono text-fg-muted">{fmtTime(r.timestamp)}</span>,
    },
    {
      id: "station",
      header: "sub_basin_id",
      sortValue: (r) => r.stationId,
      cell: (r) => (
        <span className="text-xs">
          {r.stationId} <span className="t-caption">({STATIC_STATION_MAP[r.stationId]?.name ?? "HUC12"})</span>
        </span>
      ),
    },
    {
      id: "model",
      header: "model_version",
      sortValue: (r) => r.modelVersion,
      cell: (r) => <span className="mono text-water">{r.modelVersion}</span>,
      defaultHidden: true,
    },
    {
      id: "route",
      header: "routing_pipeline",
      cell: (r) => <span className="mono text-fg-muted text-[11px]">{(r.route ?? []).join(" → ")}</span>,
    },
    {
      id: "latency",
      header: "total_latency",
      align: "right",
      sortValue: (r) => r.latencyMs,
      cell: (r) => (
        <span className={cn("mono", r.latencyMs > 220 ? "text-amber-400" : "text-fg")}>
          {r.latencyMs} ms
        </span>
      ),
    },
    {
      id: "features",
      header: "features",
      align: "right",
      sortValue: (r) => r.featureCount,
      cell: (r) => <span className="mono">{r.featureCount}</span>,
      defaultHidden: true,
    },
    {
      id: "conf",
      header: "confidence",
      align: "right",
      sortValue: (r) => r.confidence,
      cell: (r) => (
        <span className="mono font-semibold">
          {r.confidence ? `${Math.round(r.confidence * 100)}%` : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "status",
      sortValue: (r) => r.status,
      cell: (r) => <StatusBadge status={r.status} dot={false} />,
    },
  ];

  if (inf.isError)
    return <ErrorState error={inf.error} onRetry={() => inf.refetch()} title="Inference control plane unavailable" />;

  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader
          title="TIRTA Inference Control Plane"
          subtitle="Real-time telemetry and execution waterfall for online feature retrieval, reachability lookup, and dual-model inference."
          meta={
            <>
              <Chip tone="water">GBDT + GNN Dual Execution</Chip>
              <Chip tone="ok">183 ms Waterfall</Chip>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-xs">
                SIMULATED DEMO TELEMETRY
              </span>
            </>
          }
        />

        {/* Live Execution Pipeline Stages */}
        <div className="panel p-3.5 bg-surface-1 border border-border">
          <div className="text-[10px] uppercase font-mono text-fg-subtle tracking-wider mb-2 flex items-center justify-between">
            <span>Inference Orchestration Pipeline (Simulated Waterfall)</span>
            <span className="text-water">183 ms total latency</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 font-mono text-[10px]">
            {TIRTA_PIPELINE.map((stage, i) => (
              <div
                key={stage}
                className={cn(
                  "p-2 rounded border text-center transition-all truncate",
                  i === activeStage
                    ? "bg-water text-white font-bold border-water shadow-md"
                    : i < activeStage
                    ? "bg-surface-2 text-fg border-border"
                    : "bg-surface-0 text-fg-subtle border-border/50"
                )}
              >
                {stage}
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry Metrics Strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 font-mono">
          {d?.summary ? (
            <>
              <MetricCard
                label="Mean Latency (p50)"
                value={`${d.summary.p50LatencyMs ?? 142}`}
                unit="ms"
                hint="Feature fetch + GBDT + GNN"
                tone="ok"
              />
              <MetricCard
                label="p95 Latency"
                value={`${d.summary.p95LatencyMs ?? 195}`}
                unit="ms"
                hint="Waterfall threshold < 300ms"
                tone="neutral"
              />
              <MetricCard
                label="Throughput"
                value={`${d.summary.throughputRps ?? 5.4}`}
                unit="req/s"
                hint="Sub-basin forecast queries"
              />
              <MetricCard
                label="Success Rate"
                value={`${((1 - (d.summary.errorRate ?? 0.0018)) * 100).toFixed(1)}%`}
                tone={(d.summary.errorRate ?? 0) > 0.05 ? "crit" : "ok"}
                hint="24h SLA"
              />
              <MetricCard
                label="Cache Hit Rate"
                value={`${((d.summary.cacheHitRate ?? 0.94) * 100).toFixed(0)}%`}
                hint="Reachability graph cache"
                tone="ok"
              />
              <MetricCard
                label="Active Models"
                value="2"
                unit="branches"
                hint="GBDT + Directed GNN"
                tone="water"
              />
            </>
          ) : (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)
          )}
        </div>

        {/* Requests Table */}
        <Panel
          title="Inference Request Stream"
          subtitle="Recent sub-basin forecast evaluation requests with step-level timings"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="input font-mono text-xs"
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                aria-label="Filter by Sub-Basin"
              >
                <option value="">All sub-basins</option>
                {STATIC_STATIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
              <Segmented
                ariaLabel="Status filter"
                options={[
                  { value: "ALL", label: "All" },
                  { value: "SUCCESS", label: "Success" },
                  { value: "DEGRADED", label: "Degraded" },
                  { value: "ERROR", label: "Error" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          }
          noPad
        >
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.requestId}
            pageSize={10}
            selectedKey={activeSelected?.requestId}
            onRowClick={(r) => setSelected(r)}
            exportName="tirta-inference-requests"
          />
        </Panel>

        {/* Trace Waterfall Dialog */}
        <Dialog
          open={Boolean(activeSelected)}
          onClose={() => setSelected(null)}
          title={`Inference Request Trace · ${activeSelected?.requestId}`}
          description={`Sub-Basin: ${activeSelected?.stationId} · Total Latency: ${activeSelected?.latencyMs} ms · Execution Status: ${activeSelected?.status}`}
          width="max-w-2xl"
        >
          {activeSelected && <InferenceTrace request={activeSelected} />}
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
