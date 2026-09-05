"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Waves, Radio, ShieldAlert, Cpu } from "lucide-react";
import { useOverview, useNetwork } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import { useUiStore } from "@/store/ui-store";
import { WatershedMap } from "@/components/map/watershed-map";
import {
  ErrorState, Skeleton, Drawer, TrendIcon, Sparkline, ChartSkeleton,
  StatusBadge, RiskBadge
} from "@/components/ui/primitives";
import { MetricLineChart, CHART_COLORS } from "@/components/charts/charts";
import { StationPanel } from "@/features/stations/station-panel";
import { PRODUCT, MODEL } from "@/config/constants";
import { fmtTime, fmtNumber, fmtRelative } from "@/lib/format";
import { STATION_MAP } from "@/mock/stations";
import { cn } from "@/lib/utils";
import type { SimEventType } from "@/types/domain";

const EVENT_LABEL: Record<SimEventType, string> = {
  DATA_INGESTED: "Ingest",
  FORECAST_COMPLETED: "Forecast",
  ALERT_CREATED: "Alert",
  ALERT_ACKNOWLEDGED: "Ack",
  INFERENCE_COMPLETED: "Inference",
  MODEL_METRIC_UPDATED: "Metric",
  STATION_STATUS_CHANGED: "Status",
};

export default function OverviewPage() {
  const overview = useOverview();
  const network = useNetwork();
  const router = useRouter();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const d = overview.data;
  const stations = d?.stations ?? [];

  // Attention list: ranked by risk score
  const attention = useMemo(
    () =>
      [...stations]
        .filter((s) => s.risk !== "LOW" || s.status !== "ONLINE")
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 6),
    [stations]
  );

  const highlight = useMemo(
    () =>
      network.data
        ? {
            upstream: network.data.ancestors[selected] ?? [],
            downstream: network.data.descendants[selected] ?? [],
          }
        : undefined,
    [network.data, selected]
  );

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
      {/* 1. Header & Attention Observation                              */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-border pb-3">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-fg tracking-tight">{PRODUCT.name}</h1>
              <span className="text-xs text-fg-subtle">/ Watershed Overview</span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">
              Bengawan Solo basin · Updated {d ? fmtTime(d.simulatedNow) : "—"} WIB · Freshness {d?.freshnessSec ?? "—"}s
            </p>
          </div>

          <div className="text-xs font-mono text-fg-subtle">
            Model: <span className="text-fg">{MODEL.productionVersion}</span> · RMSE: <span className="text-ok">{MODEL.holdoutRmse.toFixed(4)} m</span>
          </div>
        </div>

        {/* Operational Attention Observation */}
        <div className="mt-3 p-2.5 rounded bg-surface-1 border border-border flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 min-w-0">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-warn shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-fg">Attention: </span>
              <span className="text-fg-muted">
                {d?.scenario.description ??
                  "Water levels are rising across the upper Kali Madiun reach (Badegan). Downstream stations at Karanggeneng and Ponorogo are approaching warning thresholds."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
            <span className="text-fg-subtle">Phase: <span className="text-fg">{d?.scenario.phase ?? "IDLE"}</span></span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Dominant Central Visual: Watershed Map + Quick Inspector    */}
      {/* ------------------------------------------------------------- */}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        {/* Large Map Canvas */}
        <div className="bg-surface-1 border border-border rounded-md overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-0/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Watershed Topology</span>
              <span className="text-[11px] font-mono text-fg-subtle">Bengawan Solo Mainstem & Kali Madiun</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/network" className="text-xs font-mono text-water hover:underline flex items-center gap-1">
                Full network canvas <ArrowRight className="h-3 w-3" />
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

        {/* Operational Attention Feed */}
        <div className="bg-surface-1 border border-border rounded-md flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-surface-0/60 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Requiring Attention</span>
            <span className="text-[11px] font-mono text-fg-subtle">{attention.length} stations</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
            {!d ? (
              <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : attention.length === 0 ? (
              <p className="p-4 text-xs text-fg-subtle font-mono">All 30 stations nominal.</p>
            ) : (
              attention.map((s) => (
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
                      <span className="mono text-[10px] text-fg-subtle">{s.station.id}</span>
                    </div>
                    <div className="text-[11px] font-mono text-fg-muted mt-0.5">
                      {s.currentTma.toFixed(2)} m · {Math.round(s.thresholdRatio * 100)}% alert threshold
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TrendIcon trend={s.trend} />
                    <RiskBadge risk={s.risk} />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Active alerts snippet */}
          <div className="p-2.5 border-t border-border bg-surface-0/40 text-xs font-mono flex items-center justify-between">
            <span className="text-fg-subtle">Open Alerts: <span className="text-fg font-medium">{d?.openAlerts ?? 0}</span> ({d?.criticalAlerts ?? 0} critical)</span>
            <Link href="/alerts" className="text-water hover:underline">View alerts →</Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Inline Network Summary Strip (Typography-first, not cards)  */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-surface-1 border border-border rounded-md p-3.5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <div>
            <span className="text-fg-subtle uppercase text-[10px] tracking-wider block">Stations</span>
            <span className="text-sm font-medium text-fg">30 Total</span>
          </div>
          <div>
            <span className="text-fg-subtle uppercase text-[10px] tracking-wider block">Network Status</span>
            <span className="text-sm text-fg">
              <span className="text-ok font-medium">{stations.filter((s) => s.status === "ONLINE").length} Online</span> · <span className="text-warn">{stations.filter((s) => s.status !== "ONLINE").length} Stale</span>
            </span>
          </div>
          <div>
            <span className="text-fg-subtle uppercase text-[10px] tracking-wider block">Risk Distribution</span>
            <span className="text-sm text-fg">
              <span className="text-ok">{d?.riskDistribution.LOW ?? 0} Normal</span> · <span className="text-warn">{d?.riskDistribution.MODERATE ?? 0} Moderate</span> · <span className="text-crit font-medium">{(d?.riskDistribution.HIGH ?? 0) + (d?.riskDistribution.CRITICAL ?? 0)} Alert</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-6">
          <div>
            <span className="text-fg-subtle uppercase text-[10px] tracking-wider block">Training Obs</span>
            <span className="text-sm text-fg">{fmtNumber(d?.kpis.trainingObservations ?? 84396)}</span>
          </div>
          <div>
            <span className="text-fg-subtle uppercase text-[10px] tracking-wider block">Missingness</span>
            <span className="text-sm text-fg">{((d?.kpis.missingRate ?? 0.0547) * 100).toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-fg-subtle uppercase text-[10px] tracking-wider block">Holdout RMSE</span>
            <span className="text-sm font-medium text-ok">0.8387 m</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Forecast Outlook & Recent Events                            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        {/* Forecast Index */}
        <div className="bg-surface-1 border border-border rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">Network Forecast Outlook (48h)</h2>
              <p className="t-caption mt-0.5">Mean water-level index across 25 primary-network stations with 90% confidence envelope</p>
            </div>
            <Link href="/forecasts" className="text-xs font-mono text-water hover:underline flex items-center gap-1">
              Explore horizons <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3">
            {d ? (
              <MetricLineChart
                data={d.networkForecast.map((p) => ({
                  ...p,
                  observed: p.actual,
                  forecast: p.actual === null ? p.predicted : null,
                  lower: p.actual === null ? p.lower : null,
                  upper: p.actual === null ? p.upper : null,
                }))}
                series={[
                  { key: "upper", name: "Upper 90%", color: CHART_COLORS.band, dashed: true },
                  { key: "observed", name: "Observed", color: CHART_COLORS.actual, area: true },
                  { key: "forecast", name: "Forecast", color: CHART_COLORS.forecast, dashed: true },
                  { key: "lower", name: "Lower 90%", color: CHART_COLORS.band, dashed: true },
                ]}
                xFormatter={(v) => fmtTime(v, false)}
                unit=""
                height={220}
                referenceY={{ value: 0.8, label: "Alert threshold", color: CHART_COLORS.alert }}
                yDomain={[0.3, 1]}
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
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">Recent Events</h2>
              <span className="text-[11px] font-mono text-fg-subtle">Audit & Ingestion</span>
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
                      {EVENT_LABEL[e.type]} · {fmtTime(e.timestamp)} WIB{e.stationId ? ` · ${e.stationId}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-fg-subtle">
            <span>Model Composition: Direct MH → Spatial Reconciliation</span>
            <Link href="/models" className="text-water hover:underline">Model docs →</Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Right-side Station Inspector Drawer (keeps map context!)    */}
      {/* ------------------------------------------------------------- */}
      {selected && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={STATION_MAP[selected]?.name ?? selected}
          subtitle={`Station ID: ${selected} · ${STATION_MAP[selected]?.river ?? "Bengawan Solo"}`}
          width="w-full max-w-xl"
        >
          <StationPanel stationId={selected} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      )}
    </div>
  );
}
