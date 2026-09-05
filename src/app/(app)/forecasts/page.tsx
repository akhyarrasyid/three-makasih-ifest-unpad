"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Loader2 } from "lucide-react";
import { useForecast, useHistory, useRunForecast, useStation } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import { PageHeader, Panel, Segmented, ChartSkeleton, ErrorState, Chip, KV, RiskBadge, StationBadge, Dialog } from "@/components/ui/primitives";
import { TimeSeriesChart, MetricLineChart, CHART_COLORS } from "@/components/charts/charts";
import { mergeSeries, gapsFrom, ConfidencePanel, RoutingDiagram } from "@/features/stations/station-panel";
import { InferenceTrace } from "@/features/inference/trace-view";
import { STATIONS, STATION_MAP, STRATEGY_LABEL, CATEGORY_LABEL } from "@/mock/stations";
import { MODEL } from "@/config/constants";
import { fmtTime } from "@/lib/format";
import { FORECAST_HORIZONS, type ForecastHorizon } from "@/types/domain";
import type { InferenceRequest } from "@/types/domain";


function ForecastsInner() {
  const params = useSearchParams();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const horizon = useSelectionStore((s) => s.horizon);
  const setHorizon = useSelectionStore((s) => s.setHorizon);
  const [anchorOffset, setAnchorOffset] = useState(0);
  const [modelVersion, setModelVersion] = useState<string>(MODEL.productionVersion);
  const [scenario, setScenario] = useState<"baseline" | "rain+20" | "upstream-release">("baseline");
  const [trace, setTrace] = useState<InferenceRequest | null>(null);

  useEffect(() => {
    const st = params.get("station");
    if (st && STATION_MAP[st]) selectStation(st);
  }, [params, selectStation]);

  const station = useStation(selected);
  const history = useHistory(selected, 72, 30);
  const forecast = useForecast(selected, anchorOffset);
  const run = useRunForecast();

  const scenarioFactor = scenario === "baseline" ? 1 : scenario === "rain+20" ? 1.12 : 1.06;
  const points = useMemo(() => (forecast.data?.points ?? []).map((p) => ({ ...p, predicted: p.predicted * scenarioFactor, upper: p.upper * scenarioFactor, lower: p.lower * scenarioFactor })), [forecast.data, scenarioFactor]);
  const visiblePoints = useMemo(() => points.filter((p) => p.horizon <= horizon), [points, horizon]);
  const series = useMemo(() => mergeSeries(history.data?.points?.filter((p) => !forecast.data || p.t <= forecast.data.anchor), visiblePoints), [history.data, visiblePoints, forecast.data]);
  const gaps = useMemo(() => gapsFrom(history.data?.points), [history.data]);
  const st = STATION_MAP[selected];
  const heads = FORECAST_HORIZONS.map((h) => points[h - 1]).filter(Boolean);
  const horizonError = FORECAST_HORIZONS.map((h) => ({ h: `${h}h`, sigma: heads.find((p) => p.horizon === h) ? Number((((heads.find((p) => p.horizon === h)!.upper - heads.find((p) => p.horizon === h)!.lower) / 2 / 1.645)).toFixed(3)) : 0, recursive: Number((0.05 + 0.035 * h ** 0.85).toFixed(3)) }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Forecast Intelligence"
        subtitle="Direct multi-horizon water-level forecasts with spatial graph reconciliation. Every horizon is predicted from a common anchor — predictions are never fed back into the model."
        actions={
          <button className="btn btn-primary" onClick={() => run.mutate(selected, { onSuccess: (r) => setTrace(r.request) })} disabled={run.isPending}>
            {run.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run forecast
          </button>
        }
      />

      <div className="panel flex flex-wrap items-center gap-2 px-3 py-2">
        <label className="t-caption">Station</label>
        <select className="input" value={selected} onChange={(e) => selectStation(e.target.value)} aria-label="Station">
          {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} · {CATEGORY_LABEL[s.category]}</option>)}
        </select>
        <label className="t-caption ml-2">Horizon</label>
        <Segmented<ForecastHorizon> ariaLabel="Forecast horizon" options={FORECAST_HORIZONS.map((h) => ({ value: h, label: `${h}h` }))} value={horizon} onChange={setHorizon} />
        <label className="t-caption ml-2">Model</label>
        <select className="input" value={modelVersion} onChange={(e) => setModelVersion(e.target.value)} aria-label="Model version">
          <option>anchor-prod-v2.4.1</option>
          <option>anchor-stg-v2.4.2</option>
          <option>anchor-cand-v2.5.0-rc1</option>
        </select>
        <label className="t-caption ml-2">Run</label>
        <Segmented ariaLabel="Run anchor" options={[{ value: 0, label: "Latest" }, { value: 6, label: "t₀ − 6h" }, { value: 12, label: "t₀ − 12h" }, { value: 24, label: "t₀ − 24h" }]} value={anchorOffset} onChange={setAnchorOffset} />
        <label className="t-caption ml-2">Scenario</label>
        <select className="input" value={scenario} onChange={(e) => setScenario(e.target.value as typeof scenario)} aria-label="Scenario">
          <option value="baseline">Baseline</option>
          <option value="rain+20">Rainfall +20%</option>
          <option value="upstream-release">Upstream release</option>
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel
          title={`${st.name} · forecast trajectory`}
          subtitle={forecast.data ? `Anchor t₀ = ${fmtTime(forecast.data.anchor)} WIB · ${anchorOffset > 0 ? "back-test run with realised observations" : "latest operational run"} · ${scenario !== "baseline" ? `scenario: ${scenario}` : "baseline"}` : undefined}
          actions={<div className="flex items-center gap-1.5"><RiskBadge risk={station.data?.risk ?? "LOW"} /><StationBadge category={st.category} /></div>}
        >
          {forecast.isError ? (
            <ErrorState error={forecast.error} onRetry={() => forecast.refetch()} title="Forecast service temporarily unavailable" />
          ) : forecast.isLoading || history.isLoading ? (
            <ChartSkeleton height={380} />
          ) : (
            <TimeSeriesChart data={series} thresholds={st.thresholds} height={380} showClimatology anchor={forecast.data?.anchor} gaps={gaps} showBrush />
          )}
          <div className="mt-4">
            <div className="t-label mb-2">Direct multi-horizon heads — anchored at t₀</div>
            <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
              {heads.map((p) => (
                <button key={p.horizon} onClick={() => setHorizon(p.horizon as ForecastHorizon)} className={`rounded-md border p-2 text-left transition-colors ${p.horizon <= horizon ? "border-accent-water/40 bg-accent-water/10" : "border-border bg-surface-0 opacity-60"}`} aria-pressed={p.horizon === horizon}>
                  <div className="t-caption">t₀ + {p.horizon}h</div>
                  <div className="mono text-sm text-accent-water">{p.predicted.toFixed(2)} m</div>
                  <div className="t-caption !text-[10px]">[{p.lower.toFixed(2)} – {p.upper.toFixed(2)}]</div>
                  <div className={`t-caption !text-[10px] ${p.predicted >= st.thresholds.warning ? "!text-[#f5c261]" : ""}`}>{Math.round((p.predicted / st.thresholds.alert) * 100)}% of alert</div>
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Model explanation" subtitle="How this forecast was produced">
            <KV k="Station segment" v={<StationBadge category={st.category} />} />
            <KV k="Forecast strategy" v={STRATEGY_LABEL[st.strategy]} />
            <KV k="Spatial reconciliation" v={st.primaryNetwork && st.category === "NATURAL" ? <span className="text-ok">Enabled</span> : <span className="text-fg-subtle">Not applied</span>} />
            <KV k="Model ensemble" v={st.category === "DAM_WEIR" ? "Climatology" : MODEL.ensemble.join(" + ")} />
            <KV k="Model version" v={modelVersion} mono />
            <KV k="Horizons" v="1h · 3h · 6h · 12h · 24h · 48h · 72h" mono />
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tone="water">Direct MH</Chip>
              {st.primaryNetwork && <Chip tone="water">Residual graph</Chip>}
              <Chip>{st.upstreamStations.length} upstream</Chip>
              <Chip>{st.downstreamStations.length} downstream</Chip>
            </div>
          </Panel>
          {forecast.data && <ConfidencePanel confidence={forecast.data.confidence} />}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Uncertainty growth by horizon" subtitle="Forecast σ (metres) for this station vs. an equivalent recursive strategy — direct heads avoid compounding error">
          <MetricLineChart data={horizonError} xKey="h" series={[{ key: "sigma", name: "Direct multi-horizon σ", color: CHART_COLORS.forecast, area: true }, { key: "recursive", name: "Recursive σ (reference)", color: CHART_COLORS.climatology, dashed: true }]} unit="m" height={220} />
        </Panel>
        <Panel title="Forecast routing" subtitle="Segment-dependent pipeline for the selected station">
          {forecast.data ? <RoutingDiagram steps={forecast.data.routing} horizontal /> : <ChartSkeleton height={120} />}
        </Panel>
      </div>

      <Dialog open={!!trace} onClose={() => setTrace(null)} title="Forecast run completed" description="On-demand inference request recorded in the audit trail" width="max-w-2xl">
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
