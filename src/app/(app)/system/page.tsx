"use client";
import { useMemo } from "react";
import { useHealth } from "@/hooks/use-api";
import { RoleGate } from "@/features/shared/role-gate";
import { PageHeader, Panel, MetricCard, Skeleton, ErrorState, Chip, StatusBadge, Sparkline, KV } from "@/components/ui/primitives";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ServiceHealth } from "@/types/domain";

const POS: Record<string, [number, number]> = {
  "api-gateway": [80, 60],
  "inference-orchestrator": [300, 60],
  "feature-pipeline": [520, 20],
  "model-service": [520, 100],
  "graph-service": [520, 180],
  "data-ingestion": [740, 20],
  scheduler: [300, 200],
  "notification-service": [80, 200],
};

function DependencyGraph({ services }: { services: ServiceHealth[] }) {
  const color = (s: ServiceHealth["status"]) => (s === "HEALTHY" ? "#2fbf71" : s === "DEGRADED" ? "#f0a826" : "#ef5350");
  const byId = Object.fromEntries(services.map((s) => [s.id, s]));
  return (
    <svg viewBox="0 0 900 260" className="w-full h-auto" role="img" aria-label="Service dependency graph">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#3a4a5a" /></marker>
      </defs>
      {services.flatMap((s) => s.dependencies.map((d) => {
        const [x1, y1] = POS[s.id];
        const [x2, y2] = POS[d];
        return <path key={`${s.id}-${d}`} d={`M${x1 + 140},${y1 + 22} C${x1 + 180},${y1 + 22} ${x2 - 40},${y2 + 22} ${x2},${y2 + 22}`} fill="none" stroke="#2c3a47" strokeWidth={1.4} markerEnd="url(#arrow)" />;
      }))}
      {services.map((s) => {
        const [x, y] = POS[s.id];
        return (
          <g key={s.id} transform={`translate(${x} ${y})`}>
            <rect width={140} height={44} rx={6} fill="#131920" stroke={s.status === "HEALTHY" ? "#1f2a35" : color(s.status)} strokeWidth={1.2} />
            <circle cx={12} cy={22} r={4} fill={color(s.status)} />
            <text x={24} y={19} fontSize={11} fill="#e6edf3" fontFamily="var(--font-sans)" fontWeight={500}>{s.name}</text>
            <text x={24} y={33} fontSize={9.5} fill="#6b7c8c" fontFamily="var(--font-mono)">{s.latencyMs} ms · {s.replicas}× · {byId[s.id].version}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SystemPage() {
  const health = useHealth();
  const services = health.data?.services ?? [];
  const summary = useMemo(() => ({ healthy: services.filter((s) => s.status === "HEALTHY").length, degraded: services.filter((s) => s.status === "DEGRADED").length, down: services.filter((s) => s.status === "DOWN").length, rpm: services.reduce((a, s) => a + s.requestsPerMin, 0), cpu: services.length ? services.reduce((a, s) => a + s.cpu, 0) / services.length : 0 }), [services]);

  if (health.isError) return <ErrorState error={health.error} onRetry={() => health.refetch()} />;

  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader title="System Health" subtitle="Infrastructure observability for the ANCHOR platform — service status, dependency topology, saturation and error budgets." meta={<><Chip tone="ok">{summary.healthy} healthy</Chip><Chip tone={summary.degraded ? "warn" : "neutral"}>{summary.degraded} degraded</Chip><Chip tone={summary.down ? "crit" : "neutral"}>{summary.down} down</Chip><Chip>Kubernetes · ap-southeast-3 · 3 AZ</Chip></>} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <MetricCard label="Services" value={`${summary.healthy}/${services.length || 8}`} tone={summary.degraded || summary.down ? "warn" : "ok"} hint="healthy" />
          <MetricCard label="Total requests" value={summary.rpm.toLocaleString()} unit="/min" />
          <MetricCard label="Mean CPU" value={summary.cpu.toFixed(0)} unit="%" tone={summary.cpu > 70 ? "warn" : "neutral"} />
          <MetricCard label="Error budget (30d)" value="94.1" unit="%" tone="ok" hint="SLO 99.9% availability" />
          <MetricCard label="Last check" value={health.data ? fmtTime(health.data.generatedAt) : "—"} hint="WIB · 15 s probe interval" />
        </div>

        <Panel title="Service dependency graph" subtitle="Request flow · edge = runtime dependency · node colour = health">
          {services.length ? <DependencyGraph services={services} /> : <Skeleton className="h-64" />}
        </Panel>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {!services.length && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          {services.map((s) => (
              <div key={s.id} className={cn("panel p-4", s.status !== "HEALTHY" && "border-[#6b4d16]")}>
                <div className="flex items-start justify-between">
                  <div><div className="text-sm font-medium">{s.name}</div><div className="t-caption mono">{s.id} · v{s.version} · {s.region}</div></div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div><div className="t-label">CPU</div><div className="mono text-lg">{s.cpu.toFixed(0)}%</div></div>
                  <Sparkline data={s.history} width={110} height={30} stroke={s.status === "HEALTHY" ? "#3b9eff" : "#f0a826"} />
                </div>
                <div className="mt-2">
                  <KV k="Latency" v={`${s.latencyMs} ms`} mono />
                  <KV k="Memory" v={`${s.memory.toFixed(0)}%`} mono />
                  <KV k="Requests" v={`${s.requestsPerMin.toLocaleString()}/min`} mono />
                  <KV k="Error rate" v={<span className={s.errorRate > 0.005 ? "text-[#f5c261]" : ""}>{(s.errorRate * 100).toFixed(2)}%</span>} mono />
                  <KV k="Uptime (30d)" v={`${s.uptime}%`} mono />
                  <KV k="Replicas" v={s.replicas} mono />
                </div>
              </div>
          ))}
        </div>

        <Panel title="Infrastructure" subtitle="Platform components and integrations">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            {[["Container runtime", "Docker 26 · distroless images", "ok"], ["Orchestration", "Kubernetes 1.30 · 3 node pools", "ok"], ["Cloud", "ap-southeast-3 (Jakarta) · 3 AZ", "ok"], ["Metrics", "Prometheus · 14 d retention", "ok"], ["Dashboards", "Grafana · 12 boards · SLO alerts", "ok"], ["Logs", "Loki · structured JSON · 30 d", "ok"], ["Tracing", "OpenTelemetry → Tempo", "ok"], ["Audit", "Immutable append-only ledger", "ok"]].map(([k, v]) => (
              <div key={k} className="rounded-md border border-border bg-surface-0 px-3 py-2"><div className="t-label">{k}</div><div className="mt-0.5 text-fg-muted">{v}</div></div>
            ))}
          </div>
        </Panel>
      </div>
    </RoleGate>
  );
}
