"use client";
import { useMemo } from "react";
import { Chip, KV, StatusBadge } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { STATION_MAP } from "@/mock/stations";
import { cn } from "@/lib/utils";
import type { InferenceRequest } from "@/types/domain";

const SERVICE_COLOR: Record<string, string> = {
  "Feature Retrieval": "#388bfd",
  "Hydrology Processing": "#39c5cf",
  "Temporal Context": "#79c0ff",
  "Reachability Lookup": "#a371f7",
  "CatBoost Tabular": "#58a6ff",
  "LightGBM Leafwise": "#1f6feb",
  "XGBoost Regularized": "#0969da",
  "Directed GNN": "#bc8cff",
  "Fusion & Calibration": "#d29922",
  "Risk Interpretation": "#2ea043",
  Response: "#238636",
};

export function TraceWaterfall({ request, showMeta = true }: { request: InferenceRequest; showMeta?: boolean }) {
  const total = Math.max(1, request.spans.reduce((a, s) => a + s.durationMs, 0));

  const spansWithOffset = useMemo(() => {
    const offsets = request.spans.reduce<number[]>((acc, _, idx) => {
      if (idx === 0) return [0];
      return [...acc, acc[idx - 1] + request.spans[idx - 1].durationMs];
    }, []);

    return request.spans.map((s, idx) => ({
      ...s,
      left: ((offsets[idx] ?? 0) / total) * 100,
      width: Math.max(1.5, (s.durationMs / total) * 100),
    }));
  }, [request.spans, total]);

  return (
    <div className="space-y-3 font-mono">
      {showMeta && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-fg-subtle">Trace ID</span>
          <span className="text-fg font-medium">{request.traceId}</span>
          <Chip tone="water">{request.modelVersion}</Chip>
          <StatusBadge status={request.status} dot={false} />
          <span className="text-warn border border-warn/30 bg-warn/10 px-1.5 py-0.5 rounded text-[10px]">
            SIMULATED DEMO TELEMETRY
          </span>
          <span className="t-caption">{fmtDateTime(request.timestamp)} · {request.worker}</span>
        </div>
      )}
      <div className="space-y-1">
        {spansWithOffset.map((s) => (
          <div key={s.service} className="grid grid-cols-[160px_1fr_56px] items-center gap-2 text-xs">
            <span className={cn("truncate", s.status === "error" ? "text-[#ff8a86]" : "text-fg-muted")}>
              {s.service}
            </span>
            <div className="relative h-4 rounded-sm bg-surface-2">
              <div
                className="absolute top-0 h-full rounded-sm"
                style={{
                  left: `${s.left}%`,
                  width: `${s.width}%`,
                  background: s.status === "error" ? "#ef5350" : SERVICE_COLOR[s.service] ?? "#388bfd",
                  opacity: 0.88,
                }}
              />
            </div>
            <span className="mono text-right text-fg-subtle">{s.durationMs} ms</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="text-fg-subtle">
          Pipeline: <span className="mono text-fg">{request.route.join(" → ")}</span>
        </span>
        <span className="mono font-semibold text-fg">Total {request.latencyMs} ms</span>
      </div>
      {request.errorMessage && (
        <pre className="rounded border border-[#7a2b2a] bg-crit-dim/40 p-2 mono text-[#ff8a86] whitespace-pre-wrap">
          {request.errorMessage}
        </pre>
      )}
    </div>
  );
}

export function InferenceTrace({ request }: { request: InferenceRequest }) {
  const basin = STATION_MAP[request.stationId];
  return (
    <div className="space-y-4 font-mono">
      <div className="grid gap-x-6 md:grid-cols-2">
        <div>
          <KV k="Request ID" v={request.requestId} mono />
          <KV k="Sub-Basin" v={`${basin?.name ?? request.stationId} (${request.stationId})`} />
          <KV k="Model version" v={request.modelVersion} mono />
          <KV k="Status" v={<StatusBadge status={request.status} dot={false} />} />
        </div>
        <div>
          <KV k="Total Latency" v={`${request.latencyMs} ms (Simulated)`} mono />
          <KV k="Forecast Lead" v="Month t+1 (Next Month)" mono />
          <KV k="Input Features" v={request.featureCount} mono />
          <KV k="Confidence" v={request.confidence ? `${Math.round(request.confidence * 100)}%` : "—"} mono />
        </div>
      </div>
      <div className="rounded-md border border-border bg-surface-0 p-3">
        <div className="t-label mb-2">Inference routing sequence</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {request.route.map((r, i) => (
            <span key={r} className="flex items-center gap-1.5">
              <Chip tone={i === 0 ? "water" : i === request.route.length - 1 ? "ok" : "ai"}>{r}</Chip>
              {i < request.route.length - 1 && <span className="text-fg-faint">→</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-border bg-surface-0 p-3">
        <div className="t-label mb-2">Distributed execution trace</div>
        <TraceWaterfall request={request} />
      </div>
    </div>
  );
}
