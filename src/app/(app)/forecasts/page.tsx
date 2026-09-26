"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Loader2, ArrowRight, Droplets, GitFork, ShieldCheck, Compass, AlertTriangle } from "lucide-react";
import { useForecast, useHistory, useRunForecast, useStation } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import {
  PageHeader,
  Panel,
  Segmented,
  ChartSkeleton,
  ErrorState,
  Chip,
  KV,
  RiskBadge,
  StationBadge,
  Dialog,
} from "@/components/ui/primitives";
import { MetricLineChart, CHART_COLORS } from "@/components/charts/charts";
import { ConfidencePanel, RoutingDiagram } from "@/features/stations/station-panel";
import { InferenceTrace } from "@/features/inference/trace-view";
import { STATIONS } from "@/mock/stations";
import { STATIC_STATION_MAP, getUpstream1Hop, getUpstream2Hop, getUpstream3Hop } from "@/data/network-static";
import { MODEL, SCORES } from "@/config/constants";
import type { InferenceRequest } from "@/types/domain";

function ForecastsInner() {
  const params = useSearchParams();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const [modelKey, setModelKey] = useState<string>("tirta-gbdt-ensemble-v1");
  const [trace, setTrace] = useState<InferenceRequest | null>(null);

  useEffect(() => {
    const st = params.get("station");
    if (st && STATIC_STATION_MAP[st]) selectStation(st);
  }, [params, selectStation]);

  const station = useStation(selected);
  const history = useHistory(selected, 12, 1);
  const forecast = useForecast(selected);
  const run = useRunForecast();

  const st = STATIC_STATION_MAP[selected];
  const snap = station.data;

  const up1 = getUpstream1Hop(selected);
  const up2 = getUpstream2Hop(selected);
  const up3 = getUpstream3Hop(selected);
  const totalUpstreamCount = up1.length + up2.length + up3.length;

  const historyPoints = history.data?.points ?? [];
  const chartData = useMemo(() => {
    return historyPoints.map((p, idx) => {
      const isLast = idx === historyPoints.length - 1;
      return {
        month: p.monthName,
        actual: p.supply,
        climatology: p.climatology,
        forecast: isLast && forecast.data ? forecast.data.predictedSupply : null,
      };
    });
  }, [historyPoints, forecast.data]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Next-Month Water-Stress Forecast"
        subtitle="Forecasting next-month water-stress risk P(stress at t+1) using historical water budgets, climatology anomalies, and directed river reachability."
        actions={
          <button
            className="btn btn-primary font-mono text-xs flex items-center gap-1.5"
            onClick={() =>
              run.mutate(selected, {
                onSuccess: (r) => setTrace(r.request),
              })
            }
            disabled={run.isPending}
          >
            {run.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run inference
          </button>
        }
      />

      {/* Control Selector Bar */}
      <div className="panel flex flex-wrap items-center gap-2.5 px-3 py-2 text-xs font-mono">
        <label className="text-fg-subtle uppercase text-[10px]">Sub-Basin</label>
        <select
          className="input font-mono text-xs"
          value={selected}
          onChange={(e) => selectStation(e.target.value)}
          aria-label="Select HUC12 Sub-Basin"
        >
          {STATIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
            </option>
          ))}
        </select>

        <label className="text-fg-subtle uppercase text-[10px] ml-2">Model</label>
        <select
          className="input font-mono text-xs"
          value={modelKey}
          onChange={(e) => setModelKey(e.target.value)}
          aria-label="Select Model"
        >
          <option value="tirta-gbdt-ensemble-v1">tirta-gbdt-ensemble-v1 (AP 0.7608 · Candidate)</option>
          <option value="tirta-graph-catboost-v1">tirta-graph-catboost-v1 (AP 0.7590 · Validated)</option>
          <option value="tirta-directed-gnn-v1">tirta-directed-gnn-v1 (AP 0.7641 · Research)</option>
          <option value="tirta-tabular-baseline-v1">tirta-tabular-baseline-v1 (AP 0.7329 · Verified Public)</option>
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          <Chip tone="water">Month t → t+1</Chip>
          {st?.coldStart ? (
            <Chip tone="warn">Cold-Start Holdout</Chip>
          ) : (
            <Chip tone="ok">Connected Lineage</Chip>
          )}
        </div>
      </div>

      {/* 4-Step Causal Progression Card per Prompt Section 19 */}
      <div className="panel p-4 bg-surface-1 border border-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-fg mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-water" /> Causal Prediction Flow
          </span>
          <span className="font-mono text-[10px] text-fg-subtle">
            HUC12: {st?.name ?? selected}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
          {/* Step 1: Current Condition */}
          <div className="p-3 rounded border border-border bg-surface-0 space-y-1">
            <span className="text-[10px] uppercase text-cyan-400 font-semibold block">
              1. Current Condition
            </span>
            <div className="text-sm font-bold text-fg">
              {snap?.currentSupply.toFixed(1) ?? "—"} m³/s
            </div>
            <div className="text-[11px] text-fg-subtle">
              Supply: {st?.coldStart ? "48th" : "61st"} percentile
            </div>
            <div className="text-[10px] text-fg-faint">
              Withdrawal: {snap?.totalWithdrawal.toFixed(1) ?? "—"} m³/s
            </div>
          </div>

          {/* Step 2: Historical Context */}
          <div className="p-3 rounded border border-border bg-surface-0 space-y-1">
            <span className="text-[10px] uppercase text-blue-400 font-semibold block">
              2. Historical Context
            </span>
            <div className="text-sm font-bold text-fg">
              {snap ? (snap.climatologyAnomalySigma >= 0 ? "+" : "") + snap.climatologyAnomalySigma.toFixed(2) + "σ" : "—"}
            </div>
            <div className="text-[11px] text-fg-subtle">
              vs 14-year climatology
            </div>
            <div className="text-[10px] text-fg-faint">
              SUI-like proxy: {snap?.waterLimitationProxy.toFixed(2) ?? "—"}
            </div>
          </div>

          {/* Step 3: Upstream Context */}
          <div className="p-3 rounded border border-border bg-surface-0 space-y-1">
            <span className="text-[10px] uppercase text-purple-400 font-semibold block">
              3. Upstream Context
            </span>
            <div className="text-sm font-bold text-fg">
              {totalUpstreamCount === 0 ? "Headwater" : `${totalUpstreamCount} Reachable`}
            </div>
            <div className="text-[11px] text-fg-subtle">
              Upstream stress: {totalUpstreamCount > 2 ? "High (deficit)" : "Moderate"}
            </div>
            <div className="text-[10px] text-fg-faint">
              1-3 hop DAG propagation
            </div>
          </div>

          {/* Step 4: Next-Month Probability */}
          <div className="p-3 rounded border border-water/40 bg-water/10 space-y-1">
            <span className="text-[10px] uppercase text-water font-semibold block">
              4. Next-Month Probability
            </span>
            <div className="text-xl font-bold text-fg">
              {snap ? `${(snap.riskScore * 100).toFixed(1)}%` : "—"}
            </div>
            <div className="text-[11px] text-fg font-medium">
              Tier: <span className="text-water uppercase">{snap?.risk ?? "LOW"}</span>
            </div>
            <div className="text-[10px] text-fg-subtle">
              Confidence: {snap ? `${(snap.confidenceScore * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] font-mono text-fg-subtle italic border-t border-border/60 pt-2">
          Risk tier is a demonstration interpretation of the continuous model probability.
        </div>
      </div>

      {/* Main Trajectory Chart & Model Explanation */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel
          title={`${st?.name ?? selected} · Monthly Hydrological Trajectory`}
          subtitle="Observed monthly supply vs. 14-year seasonal climatology baseline and next-month forecast step"
          actions={
            <div className="flex items-center gap-1.5">
              <RiskBadge risk={snap?.risk ?? "LOW"} />
              <StationBadge category={st?.category ?? "TRIBUTARY"} />
            </div>
          }
        >
          {forecast.isError ? (
            <ErrorState
              error={forecast.error}
              onRetry={() => forecast.refetch()}
              title="Forecast service unavailable"
            />
          ) : forecast.isLoading || history.isLoading ? (
            <ChartSkeleton height={380} />
          ) : (
            <MetricLineChart
              data={chartData}
              series={[
                {
                  key: "climatology",
                  name: "Seasonal Normal (Climatology)",
                  color: CHART_COLORS.band,
                  dashed: true,
                },
                {
                  key: "actual",
                  name: "Observed Supply",
                  color: CHART_COLORS.actual,
                  area: true,
                },
                {
                  key: "forecast",
                  name: "Forecast (Month t+1)",
                  color: CHART_COLORS.forecast,
                  dashed: true,
                },
              ]}
              xKey="month"
              unit="m³/s"
              height={360}
            />
          )}

          {/* Model Attribution Drivers */}
          {forecast.data && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-xs font-semibold uppercase tracking-wider text-fg mb-2">
                Primary Causal Attribution Drivers
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                {forecast.data.confidence.drivers.map((d, i) => (
                  <div key={i} className="p-2 rounded border border-border bg-surface-0">
                    <span className="text-[10px] text-fg-subtle truncate block">{d.label}</span>
                    <span className="text-sm font-bold text-fg mt-0.5 block">
                      {(d.contribution * 100).toFixed(0)}%
                    </span>
                    <div className="w-full bg-surface-2 rounded-full h-1 mt-1 overflow-hidden">
                      <div
                        className="bg-water h-full"
                        style={{ width: `${d.contribution * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Model Architecture & Reachability Parameters */}
        <div className="space-y-4">
          <Panel title="Model Architecture" subtitle="Active configuration for this sub-basin">
            <KV k="Active Model" v={modelKey} mono />
            <KV k="Spatial Unit" v="HUC12 Sub-Basin" />
            <KV k="DAG Depth" v={`Level ${st?.graphDepth ?? 1}`} mono />
            <KV
              k="Cold Start"
              v={
                st?.coldStart ? (
                  <span className="text-amber-400 font-semibold">Yes (Spatial Holdout)</span>
                ) : (
                  <span className="text-emerald-400">No (Historical Lineage)</span>
                )
              }
            />
            <KV k="Forecast Horizon" v="Next Month (t+1)" mono />
            <KV k="Primary Evaluation" v="PR-AUC / Average Precision" />
            <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px]">
              <Chip tone="water">Directed Reachability</Chip>
              <Chip>{up1.length} 1-hop up</Chip>
              <Chip>{up2.length} 2-hop up</Chip>
              <Chip>{up3.length} 3-hop up</Chip>
              <Chip>{st?.downstreamStationId ? "1 downstream" : "Outlet"}</Chip>
            </div>
          </Panel>

          {forecast.data && <ConfidencePanel confidence={forecast.data.confidence} />}
        </div>
      </div>

      {/* Forecast Routing Diagram */}
      <Panel
        title="Directed River Forecast Routing Pipeline"
        subtitle="End-to-end transformation from raw water budget to directed reachability and continuous probability"
      >
        {forecast.data ? (
          <RoutingDiagram steps={forecast.data.routing} horizontal />
        ) : (
          <ChartSkeleton height={120} />
        )}
      </Panel>

      {/* Inference Trace Dialog */}
      <Dialog
        open={Boolean(trace)}
        onClose={() => setTrace(null)}
        title="TIRTA Inference Control Plane Trace"
        description="Recorded execution waterfall across hydrology processing, directed reachability, and model inference"
        width="max-w-2xl"
      >
        {trace && <InferenceTrace request={trace} />}
      </Dialog>
    </div>
  );
}

export default function ForecastsPage() {
  return (
    <Suspense fallback={<ChartSkeleton height={400} />}>
      <ForecastsInner />
    </Suspense>
  );
}
