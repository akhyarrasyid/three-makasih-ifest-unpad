"use client";
import { useMemo } from "react";
import { useHealth } from "@/hooks/use-api";
import { RoleGate } from "@/features/shared/role-gate";
import { PageHeader, Panel, MetricCard, Skeleton, ErrorState, Chip, StatusBadge } from "@/components/ui/primitives";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ServiceHealth } from "@/types/domain";

const POS: Record<string, [number, number]> = {
  "api-gateway": [60, 40],
  "data-ingestion": [60, 140],
  "hydrology-processing": [260, 140],
  "temporal-lineage": [260, 40],
  "directed-graph-service": [460, 40],
  "feature-service": [460, 140],
  "gbdt-service": [660, 40],
  "gnn-service": [660, 140],
  "risk-engine": [860, 90],
  "alert-service": [1060, 40],
  "audit-service": [1060, 140],
};

function DependencyGraph({ services }: { services: ServiceHealth[] }) {
  const color = (s: ServiceHealth["status"]) =>
    s === "HEALTHY" ? "#2fbf71" : s === "DEGRADED" ? "#f0a826" : "#ef5350";
  const byId = Object.fromEntries(services.map((s) => [s.id, s]));

  return (
    <svg viewBox="0 0 1240 240" className="w-full h-auto" role="img" aria-label="TIRTA service mesh architecture">
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill="#3a4a5a" />
        </marker>
      </defs>
      {services.flatMap((s) =>
        s.dependencies.map((d) => {
          const p1 = POS[s.id];
          const p2 = POS[d];
          if (!p1 || !p2) return null;
          const [x1, y1] = p1;
          const [x2, y2] = p2;
          return (
            <path
              key={`${s.id}-${d}`}
              d={`M${x1 + 140},${y1 + 22} C${x1 + 170},${y1 + 22} ${x2 - 30},${y2 + 22} ${x2},${y2 + 22}`}
              fill="none"
              stroke="#2c3a47"
              strokeWidth={1.4}
              markerEnd="url(#arrow)"
            />
          );
        })
      )}
      {services.map((s) => {
        const p = POS[s.id];
        if (!p) return null;
        const [x, y] = p;
        return (
          <g key={s.id} transform={`translate(${x} ${y})`}>
            <rect
              width={140}
              height={44}
              rx={6}
              fill="#131920"
              stroke={s.status === "HEALTHY" ? "#1f2a35" : color(s.status)}
              strokeWidth={1.2}
            />
            <circle cx={12} cy={22} r={4} fill={color(s.status)} />
            <text x={24} y={19} fontSize={10} fill="#e6edf3" fontWeight={500}>
              {s.name}
            </text>
            <text x={24} y={33} fontSize={9} fill="#6b7c8c" fontFamily="monospace">
              {s.latencyMs} ms · {s.replicas}× · {byId[s.id]?.version ?? "v2"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SystemPage() {
  const health = useHealth();
  const services = health.data?.services ?? [];
  const summary = useMemo(
    () => ({
      healthy: services.filter((s) => s.status === "HEALTHY").length,
      degraded: services.filter((s) => s.status === "DEGRADED").length,
      down: services.filter((s) => s.status === "DOWN").length,
      rpm: services.reduce((a, s) => a + s.requestsPerMin, 0),
      cpu: services.length
        ? services.reduce((a, s) => a + s.cpu, 0) / services.length
        : 0,
    }),
    [services]
  );

  if (health.isError) return <ErrorState error={health.error} onRetry={() => health.refetch()} />;

  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader
          title="System Health & MLOps Infrastructure"
          subtitle="Production service mesh observability for the TIRTA platform — dual-inference pipeline, feature store, and reachability graph."
          meta={
            <>
              <Chip tone="ok">{summary.healthy} healthy</Chip>
              <Chip tone={summary.degraded ? "warn" : "neutral"}>
                {summary.degraded} degraded
              </Chip>
              <Chip tone="water">Dual Inference Mesh</Chip>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-xs">
                DEMO TELEMETRY
              </span>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 font-mono">
          <MetricCard
            label="Service Mesh"
            value={`${summary.healthy}/${services.length}`}
            unit="services"
            tone="ok"
            hint="All core nodes healthy"
          />
          <MetricCard
            label="Throughput"
            value={summary.rpm.toLocaleString()}
            unit="req/min"
            hint="API gateway requests"
          />
          <MetricCard
            label="Average CPU"
            value={`${summary.cpu.toFixed(1)}%`}
            hint="Cluster compute load"
          />
          <MetricCard
            label="GPU Acceleration"
            value="38.4%"
            unit="util"
            hint="PyTorch GNN inference"
            tone="water"
          />
          <MetricCard
            label="Queue Depth"
            value="14"
            unit="jobs"
            hint="Asynchronous batch forecasts"
            tone="ok"
          />
        </div>

        <Panel
          title="TIRTA Operational Service Mesh Dependency Graph"
          subtitle="Directed architectural dataflow from ingestion to GBDT & GNN dual-inference and early warning risk distribution"
          noPad
        >
          <div className="p-4 overflow-x-auto">
            <DependencyGraph services={services} />
          </div>
        </Panel>

        <Panel
          title="Service Telemetry Registry"
          subtitle="Real-time latency, throughput, error rates, and resource utilization (Demo Telemetry)"
          noPad
        >
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs text-left">
              <thead className="bg-surface-2/60 border-b border-border text-[10px] text-fg-subtle uppercase">
                <tr>
                  <th className="p-3">Service Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Latency</th>
                  <th className="p-3 text-right">Throughput</th>
                  <th className="p-3 text-right">CPU</th>
                  <th className="p-3 text-right">Memory</th>
                  <th className="p-3 text-right">Replicas</th>
                  <th className="p-3">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                    <td className="p-3 font-medium text-fg">{s.name}</td>
                    <td className="p-3">
                      <StatusBadge status={s.status} dot />
                    </td>
                    <td className="p-3 text-right">{s.latencyMs} ms</td>
                    <td className="p-3 text-right">{s.requestsPerMin} rpm</td>
                    <td className="p-3 text-right">{s.cpu}%</td>
                    <td className="p-3 text-right">{s.memory}%</td>
                    <td className="p-3 text-right">{s.replicas}×</td>
                    <td className="p-3 text-fg-subtle">{s.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </RoleGate>
  );
}
