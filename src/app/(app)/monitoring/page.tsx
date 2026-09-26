"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStations, useHistory, useForecast } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import {
  PageHeader,
  MetricCard,
  Panel,
  Segmented,
  ChartSkeleton,
  ErrorState,
  RiskBadge,
  StationBadge,
  Sparkline,
  RISK_STYLES,
  StatusBadge,
  Chip,
} from "@/components/ui/primitives";
import { MetricLineChart, CHART_COLORS } from "@/components/charts/charts";
import { STATIONS, CATEGORY_LABEL } from "@/mock/stations";
import { STATIC_STATION_MAP } from "@/data/network-static";
import { cn } from "@/lib/utils";
import type { StationCategory } from "@/types/domain";

type MonthlySignal =
  | "SUPPLY"
  | "BASEFLOW"
  | "QUICKFLOW"
  | "WITHDRAWAL"
  | "AVAILABILITY"
  | "LIMITATION"
  | "RISK";

const SIGNAL_OPTIONS: { value: MonthlySignal; label: string }[] = [
  { value: "SUPPLY", label: "Water Supply" },
  { value: "BASEFLOW", label: "Baseflow" },
  { value: "QUICKFLOW", label: "Quickflow" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
  { value: "AVAILABILITY", label: "Availability Proxy" },
  { value: "LIMITATION", label: "SUI Limitation" },
  { value: "RISK", label: "Model Risk" },
];

export default function MonitoringPage() {
  const router = useRouter();
  const stations = useStations();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const compare = useSelectionStore((s) => s.compareStationId);
  const setCompare = useSelectionStore((s) => s.setCompare);

  const [category, setCategory] = useState<StationCategory | "ALL">("ALL");
  const [region, setRegion] = useState<"ALL" | "PRIMARY" | "COLD_START">("ALL");
  const [signal, setSignal] = useState<MonthlySignal>("SUPPLY");

  const history = useHistory(selected, 12, 1);
  const compareHistory = useHistory(compare, 12, 1);
  const forecast = useForecast(selected);

  const list = stations.data ?? [];
  const snap = list.find((s) => s.station.id === selected);
  const staticSelected = STATIC_STATION_MAP[selected];

  const filtered = list.filter((s) => {
    if (category !== "ALL" && s.station.category !== category) return false;
    if (region === "PRIMARY" && !s.station.primaryNetwork) return false;
    if (region === "COLD_START" && !s.coldStart) return false;
    return true;
  });

  // Build monthly time series data for the selected signal
  const chartData = useMemo(() => {
    const pts = history.data?.points ?? [];
    const fc = forecast.data;

    return pts.map((p, idx) => {
      let val = p.supply;
      let clim = p.climatology;

      if (signal === "BASEFLOW") val = p.baseflow;
      else if (signal === "QUICKFLOW") val = p.quickflow;
      else if (signal === "WITHDRAWAL") val = p.withdrawal;
      else if (signal === "AVAILABILITY") val = p.availabilityProxy;
      else if (signal === "LIMITATION") val = p.waterLimitationProxy;
      else if (signal === "RISK") val = p.riskScore;

      const isLast = idx === pts.length - 1;
      let forecastVal: number | null = null;
      if (isLast && fc) {
        if (signal === "RISK") forecastVal = fc.riskScore ?? fc.points?.[0]?.predicted ?? null;
        else if (signal === "SUPPLY") forecastVal = fc.predictedSupply ?? null;
        else if (signal === "AVAILABILITY") forecastVal = fc.predictedAvailability ?? null;
        else if (signal === "LIMITATION") forecastVal = fc.predictedLimitation ?? null;
      }

      return {
        month: p.monthName ?? new Date(p.t).toLocaleDateString("en-US", { month: "short" }),
        actual: val,
        climatology: clim,
        forecast: forecastVal,
      };
    });
  }, [history.data, forecast.data, signal]);

  const unit =
    signal === "LIMITATION" || signal === "RISK"
      ? ""
      : "m³/s";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Basin Water-Budget Monitor"
        subtitle="Monthly hydrological balance, withdrawal pressure, and limitation proxies across HUC12 sub-basins."
        meta={
          <>
            <Chip tone="water">HUC12 Sub-Basins</Chip>
            <Chip>Monthly Aggregation</Chip>
            <Chip tone="ok">Next-Month Early Warning</Chip>
          </>
        }
      />

      {/* 6 Key Basin Hydrological Metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 font-mono">
        <MetricCard
          label="Water Supply"
          value={snap ? snap.currentSupply.toFixed(1) : "—"}
          unit="m³/s"
          hint="Streamflow balance"
          tone="neutral"
        />
        <MetricCard
          label="Withdrawal Pressure"
          value={snap ? snap.totalWithdrawal.toFixed(1) : "—"}
          unit="m³/s"
          hint="Irrigation & public use"
          tone={snap && snap.totalWithdrawal > 30 ? "warn" : "neutral"}
        />
        <MetricCard
          label="Availability Proxy"
          value={snap ? snap.availabilityProxy.toFixed(1) : "—"}
          unit="m³/s"
          hint="Supply - Withdrawal"
          tone={snap && snap.availabilityProxy < 30 ? "crit" : "ok"}
        />
        <MetricCard
          label="Climatology Anomaly"
          value={
            snap
              ? (snap.climatologyAnomalySigma >= 0 ? "+" : "") +
                snap.climatologyAnomalySigma.toFixed(2)
              : "—"
          }
          unit="σ"
          hint="vs Long-term normal"
          tone={
            snap && snap.climatologyAnomalySigma < -1.0
              ? "crit"
              : snap && snap.climatologyAnomalySigma < 0
              ? "warn"
              : "ok"
          }
        />
        <MetricCard
          label="SUI-like Limitation"
          value={snap ? snap.waterLimitationProxy.toFixed(2) : "—"}
          hint="Analytical limitation proxy"
          tone={snap && snap.waterLimitationProxy > 0.65 ? "warn" : "neutral"}
        />
        <MetricCard
          label="P(Water Stress t+1)"
          value={snap ? `${(snap.riskScore * 100).toFixed(1)}%` : "—"}
          hint={`${snap?.risk ?? "—"} tier`}
          tone={
            snap && snap.risk === "CRITICAL"
              ? "crit"
              : snap && snap.risk === "HIGH"
              ? "warn"
              : "ok"
          }
        />
      </div>

      {/* Main Historical Chart Panel */}
      <Panel
        title={snap ? `${snap.station.name} (${snap.station.id})` : "Basin Hydrology"}
        subtitle={`12-Month Historical Water-Budget Lineage with Climatology Baseline · DAG Depth Level ${staticSelected?.graphDepth ?? 1}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
            <Segmented
              ariaLabel="Signal"
              options={SIGNAL_OPTIONS}
              value={signal}
              onChange={setSignal}
            />
          </div>
        }
      >
        {history.isError ? (
          <ErrorState
            error={history.error}
            onRetry={() => history.refetch()}
            title="Hydrological history unavailable"
          />
        ) : history.isLoading ? (
          <ChartSkeleton height={360} />
        ) : (
          <div className="space-y-2">
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
                  name: "Observed Historical",
                  color: CHART_COLORS.actual,
                  area: true,
                },
                ...(signal === "RISK" || signal === "SUPPLY" || signal === "AVAILABILITY"
                  ? [
                      {
                        key: "forecast",
                        name: "Next-Month (t+1)",
                        color: CHART_COLORS.forecast,
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
              xKey="month"
              unit={unit}
              height={360}
            />
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-fg-subtle pt-2 border-t border-border/60">
              <span>
                Monthly timestep · SUI-like proxy = 1 - (Availability / Typical Seasonal Supply).
              </span>
              <div className="flex items-center gap-2">
                <RiskBadge risk={snap?.risk ?? "LOW"} />
                {snap?.coldStart && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    Cold-Start Holdout
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Sub-Basin Grid */}
      <Panel
        title="HUC12 Sub-Basin Matrix"
        subtitle={`${filtered.length} sub-basins · 12-month supply sparkline · click to inspect`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              ariaLabel="Region"
              options={[
                { value: "ALL", label: "All" },
                { value: "PRIMARY", label: "Mainstem" },
                { value: "COLD_START", label: "Cold-Start" },
              ]}
              value={region}
              onChange={setRegion}
            />
            <Segmented
              ariaLabel="Category"
              options={[
                { value: "ALL", label: "All" },
                { value: "HEADWATER", label: "Headwater" },
                { value: "TRIBUTARY", label: "Tributary" },
                { value: "CONFLUENCE", label: "Confluence" },
                { value: "MAINSTEM", label: "Mainstem" },
              ]}
              value={category}
              onChange={setCategory}
            />
          </div>
        }
        noPad
      >
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 font-mono">
          {filtered.map((s) => (
            <button
              key={s.station.id}
              onClick={() => selectStation(s.station.id)}
              onDoubleClick={() => router.push(`/explorer?station=${s.station.id}`)}
              className={cn(
                "flex items-center gap-3 bg-surface-1 px-3 py-2.5 text-left hover:bg-surface-2 transition-colors",
                s.station.id === selected && "bg-surface-2 ring-1 ring-inset ring-water/40"
              )}
            >
              <span
                className="h-9 w-1 rounded-full shrink-0"
                style={{ background: RISK_STYLES[s.risk].hex }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="truncate text-fg">{s.station.name}</span>
                </div>
                <div className="text-[10px] text-fg-subtle truncate mt-0.5">
                  {s.station.id} · Level {s.station.graphDepth} {s.coldStart ? "· Holdout" : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-xs font-bold text-fg">
                  {(s.riskScore * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-fg-subtle block">
                  {s.currentSupply.toFixed(0)} m³/s
                </span>
              </div>
              <Sparkline
                data={s.sparkline}
                width={50}
                height={20}
                stroke={RISK_STYLES[s.risk].hex}
              />
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
