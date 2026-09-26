"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Droplets, AlertTriangle, ShieldCheck, GitFork, Compass, Layers, CheckCircle2 } from "lucide-react";
import { useOverview, useNetwork } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import { WatershedMap } from "@/components/map/watershed-map";
import {
  ErrorState, Skeleton, Drawer, TrendIcon, ChartSkeleton,
  RiskBadge
} from "@/components/ui/primitives";
import { MetricLineChart, CHART_COLORS } from "@/components/charts/charts";
import { StationPanel } from "@/features/stations/station-panel";
import { PRODUCT, DATASET, SCORES } from "@/config/constants";
import { fmtTime, fmtNumber } from "@/lib/format";
import { STATIC_STATION_MAP, getAncestors, getDescendants } from "@/data/network-static";
import { cn } from "@/lib/utils";
import type { SimEventType } from "@/types/domain";

const EVENT_LABEL: Record<SimEventType, string> = {
  DATA_INGESTED: "Ingest",
  LINEAGE_RECONSTRUCTED: "Lineage",
  GRAPH_AGGREGATED: "Graph",
  FORECAST_COMPLETED: "Forecast",
  ALERT_CREATED: "Alert",
  ALERT_ACKNOWLEDGED: "Ack",
  INFERENCE_COMPLETED: "Inference",
  MODEL_METRIC_UPDATED: "Metric",
  BASIN_STATUS_CHANGED: "Basin",
  STATION_STATUS_CHANGED: "Status",
};

export default function OverviewPage() {
  const overview = useOverview();
  const network = useNetwork();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const d = overview.data;
  const stations = d?.stations ?? [];

  // Ranked by next-month risk score
  const highestRiskBasins = useMemo(
    () =>
      [...stations]
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 6),
    [stations]
  );

  // Ranked by supply deficit (climatology anomaly sigma)
  const largestDeficitBasins = useMemo(
    () =>
      [...stations]
        .sort((a, b) => a.climatologyAnomalySigma - b.climatologyAnomalySigma)
        .slice(0, 4),
    [stations]
  );

  // Cold-start spatial holdout basins
  const coldStartBasins = useMemo(
    () => stations.filter((s) => s.coldStart).slice(0, 4),
    [stations]
  );

  const highlight = useMemo(() => {
    if (!selected) return undefined;
    const up = network.data?.ancestors?.[selected] ?? getAncestors(selected) ?? [];
    const down = network.data?.descendants?.[selected] ?? getDescendants(selected) ?? [];
    return {
      upstream: up,
      downstream: down,
    };
  }, [network.data, selected]);

  const handleStationClick = (id: string) => {
    selectStation(id);
    setDrawerOpen(true);
  };

  if (overview.isError) {
    return (
      <ErrorState
        error={overview.error}
        onRetry={() => overview.refetch()}
        title="Overview telemetry unavailable"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & System Architecture Badges                         */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-border pb-3">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-fg tracking-tight">Water-Stress Intelligence Overview</h1>
              <span className="text-xs font-mono text-fg-subtle">/ Operations Center</span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">
              Next-month water availability and water-stress risk across interconnected HUC12 sub-basins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded border border-border bg-surface-1 text-fg-muted font-medium">
              TIRTA v2.4
            </span>
            <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium">
              DEMO ENVIRONMENT
            </span>
            <span className="px-2 py-0.5 rounded border border-ok/30 bg-ok/10 text-ok font-medium">
              Verified Public AP: {SCORES.publicLeaderboard.toFixed(4)}
            </span>
          </div>
        </div>

        {/* System Capability Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-surface-1 border border-border text-fg-subtle flex items-center gap-1">
            <GitFork className="h-3 w-3 text-cyan-400" /> Directed River DAG
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-1 border border-border text-fg-subtle flex items-center gap-1">
            <Compass className="h-3 w-3 text-water" /> 3-Hop Reachability
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-1 border border-border text-fg-subtle flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Stress-Test Validation
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-1 border border-border text-fg-subtle flex items-center gap-1">
            <Droplets className="h-3 w-3 text-purple-400" /> Directed GNN Research Model
          </span>
        </div>

        {/* Operational Attention Alert Bar */}
        <div className="mt-3 p-2.5 rounded bg-surface-1 border border-border flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 min-w-0">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-warn shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-fg">Active Scenario: </span>
              <span className="text-fg-muted">
                {d?.scenario.description ??
                  "Upstream supply deficit detected in tributary headwaters (HUC-DEMO-0001, HUC-DEMO-0005). Propagating downstream stress into mainstem confluence nodes (HUC-DEMO-0014, HUC-DEMO-0021)."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
            <span className="text-fg-subtle">Origin: <span className="text-fg font-medium">Month t (Origin 168)</span></span>
            <span className="text-fg-subtle">·</span>
            <span className="text-fg-subtle">Target: <span className="text-water font-medium">Month t+1</span></span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Primary Scientific & Operational Metrics Strip              */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
        <div className="p-2.5 rounded border border-border bg-surface-1">
          <span className="text-[10px] uppercase text-fg-subtle block tracking-wider">Forecast HUC12s</span>
          <span className="text-base font-bold text-fg mt-0.5 block">{DATASET.testSubBasins.toLocaleString()}</span>
          <span className="text-[10px] text-fg-subtle">42 demo nodes active</span>
        </div>

        <div className="p-2.5 rounded border border-border bg-surface-1">
          <span className="text-[10px] uppercase text-fg-subtle block tracking-wider">Historical HUC12s</span>
          <span className="text-base font-bold text-fg mt-0.5 block">{DATASET.trainingSubBasins.toLocaleString()}</span>
          <span className="text-[10px] text-fg-subtle">{DATASET.trainingRows.toLocaleString()} rows</span>
        </div>

        <div className="p-2.5 rounded border border-border bg-surface-1">
          <span className="text-[10px] uppercase text-fg-subtle block tracking-wider">Monthly Origins</span>
          <span className="text-base font-bold text-fg mt-0.5 block">{DATASET.historicalOrigins}</span>
          <span className="text-[10px] text-fg-subtle">14 × 12 Sep–Aug blocks</span>
        </div>

        <div className="p-2.5 rounded border border-border bg-surface-1">
          <span className="text-[10px] uppercase text-fg-subtle block tracking-wider">Forecast Origins</span>
          <span className="text-base font-bold text-cyan-400 mt-0.5 block">{DATASET.futureTestOrigins}</span>
          <span className="text-[10px] text-fg-subtle">Feb, Apr, Oct, Dec</span>
        </div>

        <div className="p-2.5 rounded border border-border bg-surface-1">
          <span className="text-[10px] uppercase text-fg-subtle block tracking-wider">Historical Stress</span>
          <span className="text-base font-bold text-amber-400 mt-0.5 block">{(DATASET.positiveRateHistorical * 100).toFixed(1)}%</span>
          <span className="text-[10px] text-fg-subtle">Imbalanced PR-AUC target</span>
        </div>

        <div className="p-2.5 rounded border border-border bg-surface-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-fg-subtle tracking-wider">Verified AP</span>
            <span className="text-[9px] px-1 rounded bg-ok/10 text-ok font-semibold">PUBLIC</span>
          </div>
          <span className="text-base font-bold text-ok mt-0.5 block">{SCORES.publicLeaderboard.toFixed(4)}</span>
          <span className="text-[10px] text-fg-subtle">Research GNN: 0.7641</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Dominant Central Visual: River Basin DAG + Quick Inspector  */}
      {/* ------------------------------------------------------------- */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Large River Map Canvas */}
        <div className="bg-surface-1 border border-border rounded-md overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-0/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">River Basin Topology</span>
              <span className="text-[11px] font-mono text-fg-subtle">Directed HUC12 Drainage DAG · Physical Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/network" className="text-xs font-mono text-water hover:underline flex items-center gap-1">
                Full network workspace <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="h-[440px] md:h-[500px] w-full relative">
            {network.data ? (
              <WatershedMap
                nodes={network.data.nodes}
                edges={network.data.edges}
                riverPaths={network.data.riverPaths}
                selectedId={selected}
                onSelect={handleStationClick}
                hoveredId={hover}
                onHover={setHover}
                highlight={highlight}
                layers={{ rainfall: true }}
                className="rounded-none"
              />
            ) : (
              <Skeleton className="h-full w-full rounded-none" />
            )}
          </div>
        </div>

        {/* Operational Intelligence Feed */}
        <div className="bg-surface-1 border border-border rounded-md flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-surface-0/60 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Highest Predicted Risk</span>
            <span className="text-[11px] font-mono text-fg-subtle">P(stress at t+1)</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle max-h-[440px]">
            {!d ? (
              <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : highestRiskBasins.length === 0 ? (
              <p className="p-4 text-xs text-fg-subtle font-mono">No elevated stress detected.</p>
            ) : (
              highestRiskBasins.map((s) => (
                <button
                  key={s.station.id}
                  onClick={() => handleStationClick(s.station.id)}
                  onMouseEnter={() => setHover(s.station.id)}
                  onMouseLeave={() => setHover(null)}
                  className={cn(
                    "flex w-full items-center justify-between p-2.5 text-left hover:bg-surface-2 transition-colors",
                    s.station.id === selected && "bg-surface-2"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-fg">
                      <span className="truncate">{s.station.name}</span>
                      <span className="font-mono text-[10px] text-fg-subtle">{s.station.id}</span>
                    </div>
                    <div className="text-[11px] font-mono text-fg-muted mt-0.5 flex items-center gap-2">
                      <span>Supply: {s.currentSupply.toFixed(1)} m³/s</span>
                      <span>·</span>
                      <span className={cn(s.climatologyAnomalySigma < -1.0 ? "text-red-400" : "text-amber-400")}>
                        {s.climatologyAnomalySigma.toFixed(2)}σ
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-fg block">
                        {(s.riskScore * 100).toFixed(0)}%
                      </span>
                      <RiskBadge risk={s.risk} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Active alerts snippet */}
          <div className="p-2.5 border-t border-border bg-surface-0/40 text-xs font-mono flex items-center justify-between">
            <span className="text-fg-subtle">
              Open Alerts: <span className="text-fg font-medium">{d?.openAlerts ?? 0}</span> ({d?.criticalAlerts ?? 0} critical)
            </span>
            <Link href="/alerts" className="text-water hover:underline">View alerts →</Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Secondary Analytical Row: Deficits, Cold-Starts & Risk Dist */}
      {/* ------------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-3 font-mono text-xs">
        {/* Largest Climatological Supply Deficits */}
        <div className="p-3 bg-surface-1 border border-border rounded-md">
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <span className="font-semibold text-fg text-xs uppercase tracking-wider">Supply Deficit</span>
            <span className="text-[10px] text-red-400 font-medium">Climatology Anomaly</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {largestDeficitBasins.map((b) => (
              <div
                key={b.station.id}
                onClick={() => handleStationClick(b.station.id)}
                className="flex items-center justify-between p-1.5 rounded hover:bg-surface-2 cursor-pointer transition-colors"
              >
                <div className="truncate pr-2">
                  <span className="text-fg font-medium">{b.station.name}</span>
                  <span className="text-[10px] text-fg-subtle block">{b.station.id} · Level {b.graphDepth}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-red-400 font-bold block">{b.climatologyAnomalySigma.toFixed(2)}σ</span>
                  <span className="text-[10px] text-fg-subtle">{b.currentSupply.toFixed(1)} m³/s</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cold-Start Spatial Holdout Basins */}
        <div className="p-3 bg-surface-1 border border-border rounded-md">
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <span className="font-semibold text-fg text-xs uppercase tracking-wider">Cold-Start Holdouts</span>
            <span className="text-[10px] text-amber-400 font-medium">Zero Training Lineage</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {coldStartBasins.map((b) => (
              <div
                key={b.station.id}
                onClick={() => handleStationClick(b.station.id)}
                className="flex items-center justify-between p-1.5 rounded hover:bg-surface-2 cursor-pointer transition-colors"
              >
                <div className="truncate pr-2">
                  <span className="text-fg font-medium">{b.station.name}</span>
                  <span className="text-[10px] text-fg-subtle block">{b.station.id} · Disconnected holdout</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-amber-400 font-semibold block">{(b.riskScore * 100).toFixed(0)}% risk</span>
                  <span className="text-[10px] text-fg-subtle">{(b.confidenceScore * 100).toFixed(0)}% conf</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Distribution & Operational Status */}
        <div className="p-3 bg-surface-1 border border-border rounded-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="font-semibold text-fg text-xs uppercase tracking-wider">Risk Tier Distribution</span>
              <span className="text-[10px] text-fg-subtle">42 Active Basins</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ok flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ok" /> LOW (Nominal)
                </span>
                <span className="font-bold text-fg">{d?.riskDistribution.LOW ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> MODERATE
                </span>
                <span className="font-bold text-fg">{d?.riskDistribution.MODERATE ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-orange-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-orange-400" /> HIGH
                </span>
                <span className="font-bold text-fg">{d?.riskDistribution.HIGH ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-red-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" /> CRITICAL
                </span>
                <span className="font-bold text-fg">{d?.riskDistribution.CRITICAL ?? 0}</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-border/60 text-[10px] text-fg-subtle italic">
            Risk tiers reflect early-warning operational thresholds derived from continuous model probabilities.
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Forecast Outlook & Recent Events                            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        {/* Forecast Index */}
        <div className="bg-surface-1 border border-border rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">Monthly Water-Stress Forecast Envelope</h2>
              <p className="text-xs text-fg-subtle mt-0.5">Basin-average water-limitation trajectory with 90% stress confidence interval</p>
            </div>
            <Link href="/forecasts" className="text-xs font-mono text-water hover:underline flex items-center gap-1">
              Explore forecasts <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3">
            {d ? (
              <MetricLineChart
                data={(d.networkForecast ?? []).map((p) => ({
                  ...p,
                  observed: p.actual,
                  forecast: p.actual === null ? p.predicted : null,
                  lower: p.actual === null ? p.lower : null,
                  upper: p.actual === null ? p.upper : null,
                }))}
                series={[
                  { key: "upper", name: "Upper 90%", color: CHART_COLORS.band, dashed: true },
                  { key: "observed", name: "Observed", color: CHART_COLORS.actual, area: true },
                  { key: "forecast", name: "Forecast (t+1)", color: CHART_COLORS.forecast, dashed: true },
                  { key: "lower", name: "Lower 90%", color: CHART_COLORS.band, dashed: true },
                ]}
                xFormatter={(v) => fmtTime(v, false)}
                unit=""
                height={220}
                referenceY={{ value: 0.7, label: "High risk tier (0.70)", color: CHART_COLORS.alert }}
                yDomain={[0.1, 1.0]}
              />
            ) : (
              <ChartSkeleton height={220} />
            )}
          </div>
        </div>

        {/* Recent Events Timeline */}
        <div className="bg-surface-1 border border-border rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">Recent System Events</h2>
              <span className="text-[11px] font-mono text-fg-subtle">Audit & Telemetry</span>
            </div>

            <ul className="mt-2 divide-y divide-border-subtle">
              {(d?.recentEvents ?? []).slice(0, 5).map((e) => (
                <li key={e.id} className="py-2 flex items-start gap-2.5 text-xs">
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      e.severity === "critical" ? "bg-crit" : e.severity === "warning" ? "bg-warn" : "bg-fg-subtle"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-fg font-medium">{e.message}</span>
                    <span className="text-[10px] font-mono text-fg-subtle">
                      {EVENT_LABEL[e.type]} · {fmtTime(e.timestamp)} UTC{e.stationId ? ` · ${e.stationId}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-fg-subtle">
            <span>Model Ensemble: 0.625 CatBoost + 0.225 LightGBM + 0.150 XGBoost</span>
            <Link href="/models" className="text-water hover:underline">Model registry →</Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. Right-side Sub-Basin Inspector Drawer                       */}
      {/* ------------------------------------------------------------- */}
      {selected && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={STATIC_STATION_MAP[selected]?.name ?? selected}
          subtitle={`HUC12 Basin: ${selected} · Level ${STATIC_STATION_MAP[selected]?.graphDepth ?? 1}`}
          width="w-full max-w-xl"
        >
          <StationPanel stationId={selected} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      )}
    </div>
  );
}
