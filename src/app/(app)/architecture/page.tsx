"use client";
import { ArrowDown, ArrowRight } from "lucide-react";
import { PageHeader, Panel, Chip, KV } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "sources", label: "Data Sources", detail: "30 AWLR stations · rain gauges · gate telemetry · external hydrological context", tone: "neutral" },
  { id: "ingest", label: "Data Ingestion", detail: "Kafka-compatible broker · 4 partitions · schema registry · dedup on (station, ts)", tone: "water" },
  { id: "proc", label: "Processing Pipeline", detail: "Gap detection · outlier flagging (>4σ) · interpolation policy (≤2h) · quarantine", tone: "water" },
  { id: "feat", label: "Feature Engineering", detail: "Lags · rolling stats · rainfall accumulations · upstream travel-time features · climatology", tone: "water" },
  { id: "router", label: "Station Router", detail: "Segment lookup: DAM/WEIR → climatology · MIXED → hybrid · NATURAL → ML", tone: "ai" },
  { id: "ens", label: "Model Ensemble", detail: "LightGBM + Extra Trees + Random Forest · 7 direct multi-horizon heads", tone: "ai" },
  { id: "graph", label: "Spatial Graph", detail: "River-distance kernel ⊕ residual correlation · reconciliation λ = 0.32", tone: "ai" },
  { id: "api", label: "Inference API", detail: "FastAPI-compatible contract · P95 214 ms · request/trace IDs · risk interpretation", tone: "ok" },
  { id: "apps", label: "Applications", detail: "Operations console · alerting · reports · downstream integrations", tone: "ok" },
] as const;

const TONE: Record<string, string> = { neutral: "border-border-strong bg-surface-2", water: "border-[#274566] bg-water-dim/60", ai: "border-accent-water/30 bg-accent-water/5", ok: "border-[#1f5a3c] bg-ok-dim/50" };

export default function ArchitecturePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Platform Architecture" subtitle="End-to-end data → observation → quality → forecast → reconciliation → risk → alert → inference → monitoring → audit." meta={<><Chip tone="water">Segmentation + Direct MH + Graph Reconciliation</Chip><Chip>FastAPI-compatible API surface</Chip></>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel title="Forecasting pipeline" subtitle="Observation → Feature Processing → Station Segmentation → Forecast Routing → Direct Multi-Horizon Prediction → Spatial Graph Reconciliation → Risk Interpretation → Operational Output">
          <div className="grid gap-2 md:grid-cols-3">
            {STAGES.map((s, i) => (
              <div key={s.id} className="flex items-stretch gap-2">
                <div className={cn("flex-1 rounded-md border p-3", TONE[s.tone])}>
                  <div className="flex items-center justify-between"><span className="text-xs font-medium">{s.label}</span><span className="mono t-caption">{String(i + 1).padStart(2, "0")}</span></div>
                  <p className="t-caption mt-1">{s.detail}</p>
                </div>
                {i < STAGES.length - 1 && <div className="hidden md:flex items-center text-fg-faint">{(i + 1) % 3 === 0 ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}</div>}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-surface-0 p-3">
              <div className="t-label mb-1">Why direct multi-horizon</div>
              <p className="t-caption">Recursive strategies feed each prediction back as input, compounding error at long horizons (RMSE 1.0827). Predicting every horizon directly from a common anchor removed that feedback loop (0.8508).</p>
            </div>
            <div className="rounded-md border border-border bg-surface-0 p-3">
              <div className="t-label mb-1">Why segmentation</div>
              <p className="t-caption">Dams and weirs are governed by operations, not hydrology. Routing them to climatology and blending for mixed reaches cut RMSE from 1.0827 to 0.9064.</p>
            </div>
            <div className="rounded-md border border-border bg-surface-0 p-3">
              <div className="t-label mb-1">Why a spatial graph</div>
              <p className="t-caption">Forecast errors at neighbouring stations are correlated. Projecting residuals across a river-distance ⊕ correlation graph reconciles them (0.8508 → 0.8387).</p>
            </div>
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Infrastructure" subtitle="Runtime and observability stack">
            <KV k="Containers" v="Docker · distroless" />
            <KV k="Cloud" v="ap-southeast-3 · 3 AZ" />
            <KV k="Monitoring" v="Prometheus · Grafana" />
            <KV k="Logs" v="Loki · structured JSON" />
            <KV k="Metrics" v="OpenTelemetry" />
            <KV k="Audit" v="PostgreSQL · append-only" />
            <KV k="Secrets" v="Vault · rotated 30 d" />
          </Panel>
          <Panel title="API surface" subtitle="Mock endpoints mirror the production FastAPI contract">
            <ul className="space-y-1 mono text-[11px] text-fg-muted">
              {["GET /api/dashboard/overview", "GET /api/stations", "GET /api/stations/:id", "GET /api/stations/:id/forecast", "GET /api/stations/:id/history", "GET /api/network", "GET /api/alerts", "POST /api/alerts/:id/acknowledge", "GET /api/data-quality", "GET /api/models", "GET /api/models/:version", "GET /api/inference", "GET /api/system/health", "GET /api/audit-logs", "POST /api/forecast/run"].map((e) => <li key={e} className="flex items-center justify-between rounded border border-border bg-surface-0 px-2 py-1"><span>{e}</span><span className="text-[#5fd699]">200</span></li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
