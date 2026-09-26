"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useModels } from "@/hooks/use-api";
import { RoleGate } from "@/features/shared/role-gate";
import { ErrorState, Skeleton, Segmented, Chip, PageHeader, Panel } from "@/components/ui/primitives";
import { HBarChart, MetricLineChart, CHART_COLORS } from "@/components/charts/charts";
import { fmtDate, fmtNumber } from "@/lib/format";
import { ArrowRight, ShieldCheck, GitFork, Droplets, CheckCircle2, AlertTriangle, Layers, Cpu } from "lucide-react";
import { SCORES } from "@/config/constants";
import type { ModelVersion } from "@/types/domain";
import { cn } from "@/lib/utils";

type DeepDiveTab = "benchmarks" | "architecture" | "gnn" | "folds" | "features";

export default function ModelsPage() {
  const params = useSearchParams();
  const models = useModels();
  const [activeTab, setActiveTab] = useState<DeepDiveTab>("benchmarks");
  const [selectedVersion, setSelectedVersion] = useState<string>("tirta-gbdt-ensemble-v1");

  const d = models.data;
  const current: ModelVersion | undefined =
    d?.versions.find((v) => v.version === selectedVersion) ?? d?.versions[0];

  if (models.isError) return <ErrorState error={models.error} onRetry={() => models.refetch()} />;

  return (
    <RoleGate>
      <div className="space-y-5">
        {/* Header & Intellectual Narrative */}
        <PageHeader
          title="Model Intelligence & Dual-Branch Architecture"
          subtitle="Comprehensive registry comparing GBDT tabular learners with the Directed Reachability Graph Neural Network (GNN)."
          meta={
            <>
              <span className="px-2 py-0.5 rounded border border-ok/30 bg-ok/10 text-ok font-mono text-xs font-semibold">
                VERIFIED PUBLIC AP: {SCORES.publicLeaderboard.toFixed(4)}
              </span>
              <span className="px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-mono text-xs">
                STRESS-TEST CV: 0.7608
              </span>
              <span className="px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 font-mono text-xs">
                RESEARCH GNN: 0.7641
              </span>
            </>
          }
        />

        {/* Critical Thematic Banner: The Progression of Modeling Ideas */}
        <div className="panel p-4 bg-surface-1 border border-border space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <span className="font-semibold text-fg text-xs uppercase tracking-wider">
              Research Progression & Provenance Hierarchy
            </span>
            <span className="text-[10px] text-fg-subtle">Strict Metric Provenance</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Step 1: Tabular Baseline */}
            <div className="p-3 rounded border border-border bg-surface-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-fg-subtle font-semibold">
                  1. Tabular Baseline
                </span>
                <span className="px-1.5 py-0.2 rounded bg-ok/10 text-ok border border-ok/30 text-[9px] font-bold">
                  VERIFIED PUBLIC
                </span>
              </div>
              <div className="text-xl font-bold text-fg">0.7329 AP</div>
              <p className="text-[11px] text-fg-muted">
                Initial CatBoost tabular model evaluated on the official competition leaderboard. Sub-basins treated as independent tabular rows.
              </p>
            </div>

            {/* Step 2: Graph-Aware CatBoost */}
            <div className="p-3 rounded border border-cyan-500/30 bg-cyan-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-cyan-400 font-semibold">
                  2. Graph-Aware CatBoost
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[9px] font-bold">
                  STRESS-TEST CV
                </span>
              </div>
              <div className="text-xl font-bold text-cyan-400">0.7590 AP</div>
              <p className="text-[11px] text-fg-muted">
                Integrated 3-hop directed reachability, upstream water availability, and limitation proxies (+0.0261 gain).
              </p>
            </div>

            {/* Step 3: Directed Reachability GNN */}
            <div className="p-3 rounded border border-purple-500/30 bg-purple-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-purple-400 font-semibold">
                  3. Directed Reachability GNN
                </span>
                <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[9px] font-bold">
                  RESEARCH CANDIDATE
                </span>
              </div>
              <div className="text-xl font-bold text-purple-400">0.7641 AP</div>
              <p className="text-[11px] text-fg-muted">
                3-layer directed graph neural network learning bidirectional hydrological message passing with residual node fusion.
              </p>
            </div>
          </div>
        </div>

        {/* Model Registry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5 font-mono">
          {(d?.versions ?? []).map((ver) => {
            const isSelected = ver.version === selectedVersion;
            return (
              <button
                key={ver.version}
                onClick={() => setSelectedVersion(ver.version)}
                className={cn(
                  "p-3 rounded border text-left transition-all",
                  isSelected
                    ? "bg-surface-2 border-water ring-1 ring-water shadow-md"
                    : "bg-surface-1 border-border hover:bg-surface-2"
                )}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded font-bold uppercase text-[9px]",
                      ver.provenance === "VERIFIED PUBLIC"
                        ? "bg-ok/10 text-ok border border-ok/30"
                        : ver.provenance === "STRESS-TEST VALIDATION"
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                        : ver.provenance === "INTERNAL VALIDATION"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                    )}
                  >
                    {ver.provenance}
                  </span>
                  <span className="text-fg-subtle text-[10px] uppercase">{ver.status}</span>
                </div>
                <div className="text-xs font-bold text-fg truncate mt-1">{ver.version}</div>
                <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-border/50">
                  <span className="text-[10px] text-fg-subtle">Average Precision</span>
                  <span className="text-sm font-bold text-fg">{ver.metrics.apScore.toFixed(4)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Model Deep Dive */}
        {current && (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Panel
              title={`${current.version} · Architectural Specification`}
              subtitle={current.name}
              actions={
                <Segmented
                  ariaLabel="Model details tab"
                  options={[
                    { value: "benchmarks", label: "Benchmarks" },
                    { value: "architecture", label: "GBDT Ensemble" },
                    { value: "gnn", label: "Directed GNN" },
                    { value: "folds", label: "CV Stability" },
                  ]}
                  value={activeTab}
                  onChange={(t) => setActiveTab(t as DeepDiveTab)}
                />
              }
            >
              {activeTab === "benchmarks" && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-surface-2/60 border-b border-border text-[10px] text-fg-subtle uppercase">
                        <tr>
                          <th className="p-2.5">Model Identifier</th>
                          <th className="p-2.5">Family</th>
                          <th className="p-2.5 text-right">Validation AP</th>
                          <th className="p-2.5 text-right">Inference Latency</th>
                          <th className="p-2.5">Provenance Badge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {(d?.benchmarks ?? []).map((b) => (
                          <tr key={b.id ?? b.label} className="hover:bg-surface-2 transition-colors">
                            <td className="p-2.5 font-medium text-fg">{b.label}</td>
                            <td className="p-2.5 text-fg-subtle">{b.metricLabel}</td>
                            <td className="p-2.5 text-right font-bold text-water">
                              {b.metricValue.toFixed(4)}
                            </td>
                            <td className="p-2.5 text-right text-fg-subtle">{b.latencyMs ?? 22} ms</td>
                            <td className="p-2.5">
                              <span
                                className={cn(
                                  "px-1.5 py-0.2 rounded font-bold text-[9px]",
                                  b.provenance === "VERIFIED PUBLIC"
                                    ? "bg-ok/10 text-ok border border-ok/30"
                                    : b.provenance === "STRESS-TEST VALIDATION"
                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                    : "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                                )}
                              >
                                {b.provenance}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "architecture" && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-3.5 rounded bg-surface-0 border border-border space-y-2">
                    <span className="text-[10px] uppercase text-cyan-400 font-bold block">
                      Modeling Path A: GBDT Tri-Model Ensemble
                    </span>
                    <p className="text-fg-muted leading-relaxed text-[11px]">
                      A constrained Dirichlet-optimized blend of three gradient boosted decision tree learners,
                      all receiving the exact same coherent 88-dimensional feature representation.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-[11px]">
                      <div className="p-2 rounded bg-surface-1 border border-border">
                        <span className="font-bold text-fg block">CatBoost (0.625)</span>
                        <span className="text-[10px] text-fg-subtle">Primary nonlinear tabular learner</span>
                      </div>
                      <div className="p-2 rounded bg-surface-1 border border-border">
                        <span className="font-bold text-fg block">LightGBM (0.225)</span>
                        <span className="text-[10px] text-fg-subtle">Leaf-wise boosting diversity</span>
                      </div>
                      <div className="p-2 rounded bg-surface-1 border border-border">
                        <span className="font-bold text-fg block">XGBoost (0.150)</span>
                        <span className="text-[10px] text-fg-subtle">Regularized depth-wise booster</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "gnn" && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-3.5 rounded bg-surface-0 border border-purple-500/30 space-y-2">
                    <span className="text-[10px] uppercase text-purple-400 font-bold block">
                      Modeling Path B: Directed Reachability GNN Architecture
                    </span>
                    <p className="text-fg-muted leading-relaxed text-[11px]">
                      HUC12 sub-basins are graph nodes; directed river reaches (id → to_id) form the physical DAG edges.
                    </p>
                    {/* Visual ASCII Flow of GNN per Prompt Section 12 */}
                    <div className="p-3 rounded bg-surface-1 border border-border font-mono text-[11px] text-fg space-y-1">
                      <div>Local Node Features (25 input features)</div>
                      <div className="text-purple-400">  ↓ Linear Feature Encoder (25 → 64)</div>
                      <div>  ┌────────────────────────────────────────────────────────┐</div>
                      <div>  │ Directed Reachability Layer (Repeated × 3)             │</div>
                      <div>  │    ↙ (Upstream W_up)              ↘ (Downstream W_down)│</div>
                      <div>  │ Upstream Messages (Supply)     Downstream Context      │</div>
                      <div>  │    ↘                              ↙                    │</div>
                      <div>  │       Residual Fusion + LayerNorm + LeakyReLU (0.1)    │</div>
                      <div>  └────────────────────────────────────────────────────────┘</div>
                      <div className="text-purple-400">  ↓ MLP Risk Head (64 → 16 → 1) + Sigmoid</div>
                      <div className="font-bold text-ok">P(Water Stress at month t+1) ∈ [0, 1]</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "folds" && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="text-[10px] uppercase text-fg-subtle tracking-wider">
                    Forward Validation Fold Stability across Chronological Blocks
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {(d?.folds ?? []).map((f) => (
                      <div key={f.origin} className="p-2.5 rounded border border-border bg-surface-0 text-center">
                        <span className="text-[10px] text-fg-subtle block">{f.origin}</span>
                        <span className="text-base font-bold text-fg mt-0.5 block">{f.ap.toFixed(4)}</span>
                        <span className="text-[9px] text-fg-subtle">{f.observations.toLocaleString()} rows</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            {/* Model Metadata Panel */}
            <div className="space-y-4 font-mono text-xs">
              <Panel title="Model Governance" subtitle="Operational deployment parameters">
                <div className="space-y-2">
                  <div className="flex justify-between pb-1.5 border-b border-border/50">
                    <span className="text-fg-subtle">Model ID:</span>
                    <span className="text-fg font-bold">{current.version}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-border/50">
                    <span className="text-fg-subtle">Status:</span>
                    <span className="text-water uppercase font-semibold">{current.status}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-border/50">
                    <span className="text-fg-subtle">Metric Provenance:</span>
                    <span className="text-ok font-semibold">{current.provenance}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-border/50">
                    <span className="text-fg-subtle">Validation AP:</span>
                    <span className="text-fg font-bold text-sm">{current.metrics.apScore.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-border/50">
                    <span className="text-fg-subtle">Feature Count:</span>
                    <span className="text-fg">{current.features} features</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-border/50">
                    <span className="text-fg-subtle">Inference Latency:</span>
                    <span className="text-fg">{current.latencyP50Ms} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Deployed Date:</span>
                    <span className="text-fg">{current.deployedAt ? fmtDate(current.deployedAt) : "Research Candidate"}</span>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
