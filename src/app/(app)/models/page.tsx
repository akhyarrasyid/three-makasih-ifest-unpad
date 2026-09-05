"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useModels } from "@/hooks/use-api";
import { RoleGate } from "@/features/shared/role-gate";
import { ErrorState, Skeleton, Segmented } from "@/components/ui/primitives";
import { HBarChart, MetricLineChart, CHART_COLORS, ResidualScatter } from "@/components/charts/charts";
import { fmtDate, fmtNumber } from "@/lib/format";
import { createRng } from "@/lib/prng";
import { ArrowRight } from "lucide-react";
import type { ModelVersion } from "@/types/domain";

const GROUP_COLOR: Record<string, string> = {
  hydrological: CHART_COLORS.actual,
  spatial: CHART_COLORS.forecast,
  rainfall: "#388bfd",
  temporal: "#8b949e",
  station: CHART_COLORS.warning,
};

type DeepDiveTab = "benchmarks" | "ablations" | "folds" | "features" | "residuals" | "drift";

export default function ModelsPage() {
  const params = useSearchParams();
  const models = useModels();
  const [activeTab, setActiveTab] = useState<DeepDiveTab>("benchmarks");

  const d = models.data;
  const current: ModelVersion | undefined =
    d?.versions.find((v) => v.version === (params.get("version") ?? "anchor-prod-v2.4.1")) ??
    d?.versions[0];

  const residuals = useMemo(() => {
    const rng = createRng("residuals");
    return Array.from({ length: 160 }, () => {
      const x = 1 + rng() * 9;
      const y = (rng() + rng() + rng() - 1.5) * (0.4 + x * 0.08);
      return { x: Number(x.toFixed(2)), y: Number(y.toFixed(3)) };
    });
  }, []);

  if (models.isError) return <ErrorState error={models.error} onRetry={() => models.refetch()} />;

  return (
    <RoleGate>
      <div className="space-y-5">
        {/* ------------------------------------------------------------- */}
        {/* 1. Header: ANCHOR Production Model Metadata                    */}
        {/* ------------------------------------------------------------- */}
        <div className="border-b border-border pb-3">
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-fg tracking-tight">ANCHOR Production Model</h1>
                <span className="text-xs font-mono text-fg-subtle">/ {current?.version ?? "anchor-prod-v2.4.1"}</span>
              </div>
              <p className="text-xs text-fg-muted mt-0.5">
                Ensemble: LightGBM ⊕ Extra Trees · Deployed to production · Owner: {current?.owner ?? "arif.p"}
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-fg-subtle">
              <span>Status: <span className="text-ok font-medium">Production · Deployed</span></span>
              <span>·</span>
              <span>Inference Count: <span className="text-fg">{fmtNumber(current?.inferenceCount ?? 142200)}</span></span>
            </div>
          </div>
        </div>

        {!d || !current ? (
          <Skeleton className="h-96" />
        ) : (
          <>
            {/* ------------------------------------------------------------- */}
            {/* 2. Typographic Metrics (Information, not card boxes)           */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-surface-1 border border-border rounded-md p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-fg-subtle pb-2 border-b border-border">
                Holdout Test Performance (19 Sep 2025 – 18 May 2026 · 21,780 observations)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-3 font-mono">
                <div>
                  <div className="text-[11px] text-fg-subtle uppercase">RMSE</div>
                  <div className="text-2xl font-medium text-ok mt-0.5">{current.metrics.rmseHoldout.toFixed(4)}</div>
                  <div className="text-[11px] text-fg-faint mt-0.5">metres on holdout</div>
                </div>
                <div>
                  <div className="text-[11px] text-fg-subtle uppercase">MAE</div>
                  <div className="text-2xl font-medium text-fg mt-0.5">{current.metrics.mae.toFixed(4)}</div>
                  <div className="text-[11px] text-fg-faint mt-0.5">mean absolute error</div>
                </div>
                <div>
                  <div className="text-[11px] text-fg-subtle uppercase">R² Score</div>
                  <div className="text-2xl font-medium text-fg mt-0.5">{current.metrics.r2.toFixed(3)}</div>
                  <div className="text-[11px] text-fg-faint mt-0.5">variance explained</div>
                </div>
                <div>
                  <div className="text-[11px] text-fg-subtle uppercase">Coverage (90%)</div>
                  <div className="text-2xl font-medium text-water mt-0.5">{(current.metrics.coverage90 * 100).toFixed(1)}%</div>
                  <div className="text-[11px] text-fg-faint mt-0.5">interval calibration</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-fg-subtle">
                <span>Leaderboard: Public <span className="text-fg">{current.metrics.rmsePublic?.toFixed(5) ?? "1.56296"}</span> · Private <span className="text-fg">{current.metrics.rmsePrivate?.toFixed(5) ?? "1.61812"}</span></span>
                <span>Latency: P50 <span className="text-fg">{current.latencyP50Ms}ms</span> · P95 <span className="text-fg">{current.latencyP95Ms}ms</span></span>
                <span>Drift Score: <span className={current.driftScore > 0.1 ? "text-warn" : "text-ok"}>{current.driftScore.toFixed(3)} PSI</span></span>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 3. Horizontal System Diagram: Model Composition                 */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-surface-1 border border-border rounded-md p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-fg-subtle mb-3">
                Pipeline Architecture & Model Composition
              </div>

              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-mono">
                {/* Step 1 */}
                <div className="flex-1 p-3 rounded bg-surface-0 border border-border">
                  <div className="text-fg-subtle text-[10px] uppercase">Layer 01</div>
                  <div className="text-fg font-medium mt-0.5">Station Segmentation</div>
                  <div className="text-[11px] text-fg-faint mt-1">16 Natural · 8 Dam/Weir · 6 Mixed polder routing</div>
                </div>

                <div className="hidden md:flex text-fg-faint shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </div>

                {/* Step 2 */}
                <div className="flex-1 p-3 rounded bg-surface-0 border border-border">
                  <div className="text-fg-subtle text-[10px] uppercase">Layer 02</div>
                  <div className="text-fg font-medium mt-0.5">Direct Multi-Horizon</div>
                  <div className="text-[11px] text-fg-faint mt-1">Dedicated quantile heads for 6h, 12h, 24h, 48h, 72h</div>
                </div>

                <div className="hidden md:flex text-fg-faint shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </div>

                {/* Step 3 */}
                <div className="flex-1 p-3 rounded bg-surface-0 border border-border">
                  <div className="text-fg-subtle text-[10px] uppercase">Layer 03</div>
                  <div className="text-fg font-medium mt-0.5">Spatial Reconciliation</div>
                  <div className="text-[11px] text-fg-faint mt-1">Topological DAG residual propagation & transit damping</div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 4. Progressive Disclosure Tabs: Deep-Dive Analytics           */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-surface-1 border border-border rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-0/60 overflow-x-auto">
                <Segmented<DeepDiveTab>
                  ariaLabel="Model analysis tabs"
                  value={activeTab}
                  onChange={setActiveTab}
                  options={[
                    { value: "benchmarks", label: "Lineage & Benchmarks" },
                    { value: "ablations", label: "Ablation Study" },
                    { value: "folds", label: "Rolling Folds" },
                    { value: "features", label: "Feature Attribution" },
                    { value: "residuals", label: "Residual Analysis" },
                    { value: "drift", label: "Model Drift (PSI)" },
                  ]}
                />
              </div>

              <div className="p-4">
                {/* Tab: Benchmarks */}
                {activeTab === "benchmarks" && (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                    <div>
                      <div className="text-xs font-medium text-fg mb-1">Benchmark Lineage on Holdout (metres)</div>
                      <p className="t-caption mb-3">Progression from naive persistence to spatial graph reconciliation</p>
                      <HBarChart
                        data={d.benchmarks.map((b) => ({
                          label: b.label,
                          value: b.rmse,
                          highlight: b.stage === "final",
                          color: b.stage === "baseline" ? "#4a5968" : b.stage === "iteration" ? CHART_COLORS.forecast : CHART_COLORS.ok,
                        }))}
                        height={240}
                        unit="RMSE"
                        domain={[0, 1.5]}
                        valueFormatter={(v) => v.toFixed(4)}
                      />
                    </div>
                    <ul className="divide-y divide-border-subtle font-mono text-xs">
                      {d.benchmarks.map((b, i) => {
                        const prev = i > 0 ? d.benchmarks[i - 1].rmse : null;
                        return (
                          <li key={b.id} className="py-2.5 flex items-start justify-between gap-2">
                            <div>
                              <div className="text-fg font-medium">{b.label}</div>
                              <div className="text-[11px] text-fg-subtle mt-0.5">{b.description}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-fg font-medium">{b.rmse.toFixed(4)} m</span>
                              {prev !== null && b.stage !== "baseline" && (
                                <div className="text-[10px] text-ok">−{(((prev - b.rmse) / prev) * 100).toFixed(1)}%</div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Tab: Ablations */}
                {activeTab === "ablations" && (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                    <div>
                      <div className="text-xs font-medium text-fg mb-1">Ablation Study (Component Removal)</div>
                      <p className="t-caption mb-3">Degradation observed when disabling individual pipeline components</p>
                      <HBarChart
                        data={d.ablations.map((a) => ({
                          label: a.label,
                          value: a.rmse,
                          highlight: a.id === "final",
                          color: a.id === "final" ? CHART_COLORS.ok : CHART_COLORS.warning,
                        }))}
                        height={220}
                        unit="RMSE"
                        domain={[0, 1.5]}
                        valueFormatter={(v) => v.toFixed(4)}
                        referenceValue={0.8387}
                      />
                    </div>
                    <ul className="divide-y divide-border-subtle font-mono text-xs">
                      {d.ablations.map((a) => (
                        <li key={a.id} className="py-2.5 flex items-start justify-between gap-2">
                          <div>
                            <div className="text-fg font-medium">{a.label}</div>
                            <div className="text-[11px] text-fg-subtle mt-0.5">{a.description}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-fg">{a.rmse.toFixed(4)} m</span>
                            {a.delta > 0 && <div className="text-[10px] text-warn">+{a.delta.toFixed(4)} error</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tab: Folds */}
                {activeTab === "folds" && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-3 font-mono text-xs">
                      <div className="text-xs font-medium text-fg mb-1">Rolling Origin Evaluation</div>
                      {d.folds.map((f) => (
                        <div key={f.origin} className="p-2.5 rounded bg-surface-0 border border-border">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-fg">{f.origin}</span>
                            <span className="text-fg-subtle text-[11px]">{f.originDate}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] mt-1 text-fg-muted">
                            <span>RMSE: <span className="text-ok font-medium">{f.rmse.toFixed(4)} m</span></span>
                            <span>MAE: {f.mae.toFixed(4)} m</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-fg mb-2">Error Dispersion Across Horizons</div>
                      <MetricLineChart
                        data={d.folds[0].byHorizon.map((_, i) => ({
                          h: `${d.folds[0].byHorizon[i].horizon}h`,
                          ...Object.fromEntries(d.folds.map((f) => [f.origin, f.byHorizon[i].rmse])),
                        }))}
                        xKey="h"
                        series={d.folds.map((f, i) => ({
                          key: f.origin,
                          name: f.origin,
                          color: [CHART_COLORS.actual, CHART_COLORS.forecast, "#388bfd", CHART_COLORS.warning][i],
                        }))}
                        unit="RMSE"
                        height={240}
                      />
                    </div>
                  </div>
                )}

                {/* Tab: Features */}
                {activeTab === "features" && (
                  <div>
                    <div className="text-xs font-medium text-fg mb-1">Top Feature Attribution (Mean Gain)</div>
                    <p className="t-caption mb-3">Relative contribution of lagged TMA, upstream indicators, and spatial terms</p>
                    <ul className="space-y-2 font-mono text-xs max-w-2xl">
                      {d.featureImportance.map((f) => (
                        <li key={f.feature} className="flex items-center gap-3">
                          <span className="w-48 truncate text-fg-muted">{f.feature}</span>
                          <div className="h-1 flex-1 rounded bg-surface-3 overflow-hidden">
                            <div className="h-full bg-water" style={{ width: `${(f.importance / 0.184) * 100}%` }} />
                          </div>
                          <span className="w-12 text-right text-fg font-medium">{(f.importance * 100).toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tab: Residuals */}
                {activeTab === "residuals" && (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                    <div>
                      <div className="text-xs font-medium text-fg mb-1">Residual vs. Observed Stage (Sample)</div>
                      <p className="t-caption mb-3">Checking for heteroscedasticity across river stages</p>
                      <ResidualScatter data={residuals} height={200} />
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      <div className="text-xs font-medium text-fg mb-2">Residual Summary by Segment</div>
                      {d.residualByCategory.map((r) => (
                        <div key={r.category} className="p-2.5 rounded bg-surface-0 border border-border">
                          <div className="text-fg font-medium uppercase text-[11px]">{r.category}</div>
                          <div className="text-[11px] text-fg-subtle mt-1">
                            Bias: <span className="text-fg">{r.bias >= 0 ? "+" : ""}{r.bias.toFixed(3)}</span> · RMSE: <span className="text-fg">{r.rmse.toFixed(3)} m</span> · n = {fmtNumber(r.n)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Drift */}
                {activeTab === "drift" && (
                  <div>
                    <div className="text-xs font-medium text-fg mb-1">Feature Population Stability Index (PSI)</div>
                    <p className="t-caption mb-3">Rolling 30-day feature distribution shift (Threshold: PSI &gt; 0.1 demands retraining)</p>
                    <MetricLineChart
                      data={d.drift}
                      xKey="day"
                      xFormatter={(v) => `${v}d`}
                      series={[{ key: "psi", name: "PSI", color: CHART_COLORS.warning, area: true }]}
                      unit=""
                      height={180}
                      referenceY={{ value: 0.1, label: "Retrain Threshold (0.10)", color: CHART_COLORS.critical }}
                      yDomain={[0, 0.12]}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGate>
  );
}
