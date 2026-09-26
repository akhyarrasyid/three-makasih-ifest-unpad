"use client";
import { ArrowDown, ArrowRight, GitFork, Droplets, ShieldCheck, Cpu } from "lucide-react";
import { PageHeader, Panel, Chip, KV } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const TIRTA_STAGES = [
  {
    id: "sources",
    label: "Monthly Water-Budget",
    detail: "378,780 training rows · streamflow, baseflow, quickflow & sectoral withdrawals across HUC12 sub-basins",
    tone: "neutral",
  },
  {
    id: "ingest",
    label: "Data Validation & Schema",
    detail: "European decimal comma-to-dot normalization · missing lag quarantine · schema validation",
    tone: "water",
  },
  {
    id: "lineage",
    label: "Temporal Lineage",
    detail: "Reconstruction of 168 scrambled origin blocks into 14 sequential September → August water-year cycles",
    tone: "water",
  },
  {
    id: "graph",
    label: "Directed River DAG",
    detail: "Physical id → to_id hydrological connectivity · 1–3 hop reachability lookup & graph depth indexing",
    tone: "water",
  },
  {
    id: "features",
    label: "Feature Store",
    detail: "88 features across 6 conceptual families: Hydrology, Withdrawals, Climatology, Limitation, Basin, Reachability",
    tone: "ai",
  },
  {
    id: "validation",
    label: "Stress-Test Validation",
    detail: "Chronology-aware forward split with 12-month purge gap embargo to eliminate 11/12 lag leakage",
    tone: "ai",
  },
  {
    id: "models",
    label: "Dual-Branch Modeling",
    detail: "Branch A: Tri-Model GBDT Ensemble (CatBoost ⊕ LightGBM ⊕ XGBoost) · Branch B: 3-Layer Directed GNN",
    tone: "ai",
  },
  {
    id: "risk",
    label: "Risk Engine",
    detail: "Continuous probability calibration P(stress at t+1) ∈ [0, 1] · attribution driver breakdown",
    tone: "ok",
  },
  {
    id: "apps",
    label: "Operations & Alerts",
    detail: "TIRTA Operations console · early-warning incident alerts · downstream agency reporting",
    tone: "ok",
  },
] as const;

const TONE: Record<string, string> = {
  neutral: "border-border-strong bg-surface-2",
  water: "border-cyan-800 bg-cyan-950/20",
  ai: "border-purple-800 bg-purple-950/20",
  ok: "border-emerald-800 bg-emerald-950/20",
};

export default function ArchitecturePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="TIRTA Platform Architecture & Methodology Flow"
        subtitle="End-to-end data pipeline from raw monthly water budgets to temporal lineage, directed DAG reachability, GBDT + GNN dual-inference, and operational early warning."
        meta={
          <>
            <Chip tone="water">Directed River DAG (id → to_id)</Chip>
            <Chip tone="ok">Stress-Test Validation</Chip>
            <Chip tone="ai">GBDT + Directed GNN</Chip>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Pipeline Stage Cards */}
        <Panel
          title="Methodological Dataflow & Processing Stages"
          subtitle="Chronological sequence from raw data ingestion to dual-model inference and early warning alerts"
        >
          <div className="grid gap-2 md:grid-cols-3 font-mono text-xs">
            {TIRTA_STAGES.map((s, i) => (
              <div key={s.id} className="flex items-stretch gap-2">
                <div className={cn("flex-1 rounded-md border p-3", TONE[s.tone])}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-fg">{s.label}</span>
                    <span className="text-[10px] text-fg-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-[11px] text-fg-muted mt-1 leading-relaxed">
                    {s.detail}
                  </p>
                </div>
                {i < TIRTA_STAGES.length - 1 && (
                  <div className="hidden md:flex items-center text-fg-subtle">
                    {(i + 1) % 3 === 0 ? (
                      <ArrowDown className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Research Rationale Triad */}
          <div className="mt-5 grid gap-3 md:grid-cols-3 font-mono text-xs">
            <div className="rounded-md border border-border bg-surface-0 p-3 space-y-1">
              <div className="text-[10px] uppercase text-cyan-400 font-bold">
                Why Temporal Lineage
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed">
                Scrambled monthly origins obscure annual water-year cycles and induce massive 11/12 lag leakage in naive CV.
                Reconstructing chronology ensures validation mimics true operational deployment.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface-0 p-3 space-y-1">
              <div className="text-[10px] uppercase text-purple-400 font-bold">
                Why Directed Graph Topology
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed">
                Sub-basins do not exist in isolation. River networks physically transport water deficits downstream.
                Directed reachability captures upstream deficit propagation before local streamflow collapses.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface-0 p-3 space-y-1">
              <div className="text-[10px] uppercase text-emerald-400 font-bold">
                Why Dual-Branch Modeling
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed">
                GBDT excels at tabular nonlinear decision boundaries (0.7608 CV). The Directed GNN provides
                complementary learned propagation (0.7641 internal AP). Blending offers operational robustness.
              </p>
            </div>
          </div>
        </Panel>

        {/* Runtime Infrastructure & API Contract */}
        <div className="space-y-4 font-mono text-xs">
          <Panel title="Infrastructure & Runtime Stack" subtitle="Service mesh execution environment">
            <KV k="Framework" v="Next.js 16 + React 19 + TypeScript" />
            <KV k="Styling" v="Tailwind CSS v4 + Instrument Design" />
            <KV k="ML Runtime" v="CatBoost ⊕ LightGBM ⊕ PyTorch GNN" />
            <KV k="Graph Engine" v="Directed River DAG (id → to_id)" />
            <KV k="Evaluation Metric" v="PR-AUC / Average Precision" />
            <KV k="Deployment Target" v="Microservices API Mesh" />
            <KV k="Telemetry" v="Simulated Demo Telemetry" />
          </Panel>

          <Panel title="API Contract Surface" subtitle="Endpoints per Section 36">
            <ul className="space-y-1 text-[11px] text-fg-muted">
              {[
                "GET /api/overview",
                "GET /api/basins",
                "GET /api/basins/:id",
                "GET /api/basins/:id/forecast",
                "GET /api/basins/:id/history",
                "GET /api/basins/:id/reachability",
                "GET /api/network",
                "GET /api/alerts",
                "GET /api/features",
                "GET /api/models",
                "GET /api/validation",
                "GET /api/ablations",
                "GET /api/inference",
                "GET /api/system/health",
                "GET /api/audit-logs",
              ].map((e) => (
                <li
                  key={e}
                  className="flex items-center justify-between rounded border border-border bg-surface-0 px-2 py-1"
                >
                  <span className="truncate pr-2">{e}</span>
                  <span className="text-ok font-bold shrink-0">200 OK</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
