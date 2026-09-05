"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStations, useHistory, useForecast } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import { PageHeader, MetricCard, Panel, Segmented, ChartSkeleton, ErrorState, RiskBadge, StationBadge, Sparkline, RISK_STYLES, StatusBadge, Chip } from "@/components/ui/primitives";
import { TimeSeriesChart } from "@/components/charts/charts";
import { mergeSeries, gapsFrom } from "@/features/stations/station-panel";
import { STATIONS, CATEGORY_LABEL } from "@/mock/stations";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StationCategory } from "@/types/domain";

const RANGES = [{ value: 24, label: "24h" }, { value: 72, label: "72h" }, { value: 168, label: "7d" }, { value: 336, label: "14d" }];

export default function MonitoringPage() {
  const router = useRouter();
  const stations = useStations();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const compare = useSelectionStore((s) => s.compareStationId);
  const setCompare = useSelectionStore((s) => s.setCompare);
  const range = useSelectionStore((s) => s.timeRangeHours);
  const setRange = useSelectionStore((s) => s.setTimeRange);
  const [category, setCategory] = useState<StationCategory | "ALL">("ALL");
  const [region, setRegion] = useState<"ALL" | "PRIMARY" | "OTHER">("ALL");
  const [signal, setSignal] = useState<"tma" | "rain">("tma");
  const [agg, setAgg] = useState<30 | 60>(30);

  const step = range > 96 ? 60 : agg;
  const history = useHistory(selected, range, step);
  const compareHistory = useHistory(compare, range, step);
  const forecast = useForecast(selected);

  const series = useMemo(() => {
    const base = mergeSeries(history.data?.points, forecast.data?.points);
    if (!compareHistory.data) return base;
    const cmp = new Map(compareHistory.data.points.map((p) => [p.t, p.tma]));
    return base.map((p) => ({ ...p, compare: cmp.get(p.t) ?? null }));
  }, [history.data, forecast.data, compareHistory.data]);
  const gaps = useMemo(() => gapsFrom(history.data?.points), [history.data]);

  const list = stations.data ?? [];
  const snap = list.find((s) => s.station.id === selected);
  const stale = list.filter((s) => s.status !== "ONLINE").length;
  const missingPackets = list.reduce((a, s) => a + Math.round(s.missingRate24h * 24), 0);
  const outliers = useMemo(() => (history.data?.points ?? []).filter((p) => p.quality === "OUTLIER").length, [history.data]);
  const filtered = list.filter((s) => (category === "ALL" || s.station.category === category) && (region === "ALL" || (region === "PRIMARY") === s.station.primaryNetwork));

  const forecastAt = new Map((forecast.data?.points ?? []).map((p) => [p.t, p.predicted]));

  return (
    <div className="space-y-5">
      <PageHeader title="Live Monitoring" subtitle="Real-time TMA telemetry across the Bengawan Solo network." meta={<><Chip tone="water">30 stations</Chip><Chip>10-min ingestion cycle</Chip><Chip tone="water">forecast overlay: anchor-prod-v2.4.1</Chip></>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Data freshness" value={snap ? (snap.freshnessSec < 60 ? snap.freshnessSec : Math.round(snap.freshnessSec / 60)) : "—"} unit={snap && snap.freshnessSec >= 60 ? "min" : "sec"} hint="selected station" tone={snap && snap.freshnessSec > 1800 ? "warn" : "neutral"} />
        <MetricCard label="Last ingestion" value={list.length ? fmtTime(Math.max(...list.map((s) => s.lastUpdated))) : "—"} hint="WIB · broker partition 0–3" />
        <MetricCard label="Active stations" value={list.length ? list.length - stale : "—"} unit="/ 30" tone="ok" />
        <MetricCard label="Stale data" value={stale} hint={stale ? list.filter((s) => s.status !== "ONLINE").map((s) => s.station.id).join(", ") : "none"} tone={stale ? "warn" : "ok"} />
        <MetricCard label="Missing packets (24h)" value={missingPackets} hint="network-wide hourly slots" />
        <MetricCard label="Outlier events" value={outliers} hint={`selected station · ${range}h`} tone={outliers ? "warn" : "neutral"} />
      </div>

      <Panel
        title={snap ? `${snap.station.name} · ${snap.station.id}` : "Telemetry"}
        subtitle="Observed TMA, model forecast with 90% interval, rainfall (right axis, inverted) and demo alert thresholds"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select className="input" value={selected} onChange={(e) => selectStation(e.target.value)} aria-label="Station">
              {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
            </select>
            <select className="input" value={compare ?? ""} onChange={(e) => setCompare(e.target.value || null)} aria-label="Compare station">
              <option value="">Compare…</option>
              {STATIONS.filter((s) => s.id !== selected).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Segmented ariaLabel="Time range" options={RANGES} value={range} onChange={setRange} />
            <Segmented ariaLabel="Aggregation" options={[{ value: 30, label: "30 min" }, { value: 60, label: "1 h" }]} value={agg} onChange={setAgg} />
            <Segmented ariaLabel="Signal" options={[{ value: "tma", label: "TMA" }, { value: "rain", label: "+ Rainfall" }]} value={signal} onChange={setSignal} />
          </div>
        }
      >
        {history.isError ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} title="Telemetry service unavailable" />
        ) : history.isLoading ? (
          <ChartSkeleton height={360} />
        ) : (
          <TimeSeriesChart
            data={series}
            thresholds={snap?.station.thresholds}
            height={360}
            showRainfall={signal === "rain"}
            showBrush
            gaps={gaps}
            anchor={forecast.data?.anchor}
            compareLabel={compare ? STATIONS.find((s) => s.id === compare)?.name : undefined}
            tooltipExtra={(row) => {
              const t = Number(row.t);
              const actual = typeof row.actual === "number" ? row.actual : null;
              const fc = forecastAt.get(t) ?? (typeof row.forecast === "number" ? row.forecast : null);
              return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <span className="text-fg-subtle">Station</span><span className="text-right">{snap?.station.name}</span>
                  {actual !== null && fc !== null && <><span className="text-fg-subtle">Difference</span><span className="mono text-right">{(fc - actual >= 0 ? "+" : "") + (fc - actual).toFixed(2)} m</span></>}
                  <span className="text-fg-subtle">Risk level</span><span className="text-right" style={{ color: snap ? RISK_STYLES[snap.risk].hex : undefined }}>{snap?.risk}</span>
                  <span className="text-fg-subtle">Data quality</span><span className="text-right">{String(row.quality ?? "FORECAST")}</span>
                </div>
              );
            }}
          />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 t-caption">
          <span>Missing-data windows are shaded red. Outliers (flagged, excluded) are removed from the observed line.</span>
          {snap && <span className="ml-auto flex items-center gap-2"><RiskBadge risk={snap.risk} /><StatusBadge status={snap.status} /></span>}
        </div>
      </Panel>

      <Panel
        title="Station grid"
        subtitle={`${filtered.length} stations · 24h sparklines · click to focus`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented ariaLabel="Region" options={[{ value: "ALL", label: "All" }, { value: "PRIMARY", label: "Primary network" }, { value: "OTHER", label: "Other basins" }]} value={region} onChange={setRegion} />
            <Segmented ariaLabel="Category" options={[{ value: "ALL", label: "All" }, { value: "NATURAL", label: "Natural" }, { value: "MIXED", label: "Mixed" }, { value: "DAM_WEIR", label: "Dam/Weir" }]} value={category} onChange={setCategory} />
          </div>
        }
        noPad
      >
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {filtered.map((s) => (
            <button key={s.station.id} onClick={() => selectStation(s.station.id)} onDoubleClick={() => router.push(`/stations?station=${s.station.id}`)} className={cn("flex items-center gap-3 bg-surface-1 px-3 py-2.5 text-left hover:bg-surface-2", s.station.id === selected && "bg-surface-2 ring-1 ring-inset ring-water/40")}>
              <span className="h-9 w-1 rounded-full" style={{ background: RISK_STYLES[s.risk].hex }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-xs font-medium"><span className="truncate">{s.station.name}</span><StationBadge category={s.station.category} short /></span>
                <span className="t-caption block">{CATEGORY_LABEL[s.station.category]} · {s.station.river}</span>
              </span>
              <span className="text-right">
                <span className="mono block text-sm">{s.currentTma.toFixed(2)} <span className="t-caption">m</span></span>
                <span className={cn("t-caption", s.trendRatePerHour > 0.03 ? "!text-[#ff9a5c]" : s.trendRatePerHour < -0.03 ? "!text-[#5fd699]" : "")}>{s.trendRatePerHour >= 0 ? "+" : ""}{s.trendRatePerHour.toFixed(2)} m/h</span>
              </span>
              <Sparkline data={s.sparkline} width={60} height={24} stroke={RISK_STYLES[s.risk].hex} />
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
