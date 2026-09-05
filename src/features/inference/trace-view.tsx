"use client";
import { Chip, KV, StatusBadge } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { STATION_MAP } from "@/mock/stations";
import { cn } from "@/lib/utils";
import type { InferenceRequest } from "@/types/domain";

const SERVICE_COLOR: Record<string, string> = {
  "API Gateway": "#8b949e",
  Orchestrator: "#388bfd",
  "Feature Pipeline": "#39c5cf",
  "Model Ensemble": "#58a6ff",
  "Climatology Service": "#79c0ff",
  "Graph Reconciliation": "#388bfd",
  "Blend Service": "#1f6feb",
  Response: "#2ea043",
};

export function TraceWaterfall({ request, showMeta = true }: { request: InferenceRequest; showMeta?: boolean }) {
  const total = Math.max(1, request.spans.reduce((a, s) => a + s.durationMs, 0));
  let offset = 0;
  return (
    <div className="space-y-3">
      {showMeta && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="mono text-fg-subtle">Trace ID</span>
          <span className="mono">{request.traceId}</span>
          <Chip tone="water">{request.modelVersion}</Chip>
          <StatusBadge status={request.status} dot={false} />
          <span className="t-caption">{fmtDateTime(request.timestamp)} WIB · {request.worker}</span>
        </div>
      )}
      <div className="space-y-1">
        {request.spans.map((s) => {
          const left = (offset / total) * 100;
          const width = Math.max(1.5, (s.durationMs / total) * 100);
          offset += s.durationMs;
          return (
            <div key={s.service} className="grid grid-cols-[130px_1fr_56px] items-center gap-2 text-xs">
              <span className={cn("truncate", s.status === "error" ? "text-[#ff8a86]" : "text-fg-muted")}>{s.service}</span>
              <div className="relative h-4 rounded-sm bg-surface-2">
                <div className="absolute top-0 h-full rounded-sm" style={{ left: `${left}%`, width: `${width}%`, background: s.status === "error" ? "#ef5350" : SERVICE_COLOR[s.service] ?? "#3b9eff", opacity: 0.85 }} />
              </div>
              <span className="mono text-right">{s.durationMs} ms</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="text-fg-subtle">Route: <span className="mono text-fg">{request.route.join(" → ")}</span></span>
        <span className="mono">Total {request.latencyMs} ms</span>
      </div>
      {request.errorMessage && <pre className="rounded border border-[#7a2b2a] bg-crit-dim/40 p-2 mono text-[#ff8a86] whitespace-pre-wrap">{request.errorMessage}</pre>}
    </div>
  );
}

export function InferenceTrace({ request }: { request: InferenceRequest }) {
  const st = STATION_MAP[request.stationId];
  return (
    <div className="space-y-4">
      <div className="grid gap-x-6 md:grid-cols-2">
        <div>
          <KV k="Request ID" v={request.requestId} mono />
          <KV k="Station" v={`${st?.name ?? request.stationId} (${request.stationId})`} />
          <KV k="Model version" v={request.modelVersion} mono />
          <KV k="Status" v={<StatusBadge status={request.status} dot={false} />} />
        </div>
        <div>
          <KV k="Latency" v={`${request.latencyMs} ms`} mono />
          <KV k="Horizons" v={request.horizons.map((h) => `${h}h`).join(" · ")} mono />
          <KV k="Features" v={request.featureCount} mono />
          <KV k="Confidence" v={request.confidence ? `${Math.round(request.confidence * 100)}%` : "—"} mono />
        </div>
      </div>
      <div className="rounded-md border border-border bg-surface-0 p-3">
        <div className="t-label mb-2">Routing decision</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {request.route.map((r, i) => (
            <span key={r} className="flex items-center gap-1.5">
              <Chip tone={i === 0 ? "water" : "ai"}>{r}</Chip>
              {i < request.route.length - 1 && <span className="text-fg-faint">→</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-border bg-surface-0 p-3">
        <div className="t-label mb-2">Distributed trace</div>
        <TraceWaterfall request={request} />
      </div>
    </div>
  );
}
