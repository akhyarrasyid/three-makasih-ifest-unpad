"use client";
import { useMemo, useState } from "react";
import { Droplets, ShieldAlert, Compass, ArrowRight, Info, CheckCircle2 } from "lucide-react";
import { useStations, useHistory } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import { PageHeader, Panel, MetricCard, Segmented, ChartSkeleton, Chip, RiskBadge, StationBadge } from "@/components/ui/primitives";
import { MetricLineChart, MetricBarChart, CHART_COLORS } from "@/components/charts/charts";
import { STATIONS } from "@/mock/stations";
import { STATIC_STATION_MAP } from "@/data/network-static";
import { cn } from "@/lib/utils";

export default function WaterAvailabilityPage() {
  const stations = useStations();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);

  const history = useHistory(selected, 12, 1);
  const list = stations.data ?? [];
  const currentSnap = list.find((s) => s.station.id === selected) ?? list[0];
  const staticStn = STATIC_STATION_MAP[selected];

  // Ranked by most severe water limitation proxy
  const severeLimitationBasins = useMemo(
    () => [...list].sort((a, b) => b.waterLimitationProxy - a.waterLimitationProxy).slice(0, 8),
    [list]
  );

  // Sectoral withdrawal breakdown data
  const withdrawalBreakdown = useMemo(() => {
    if (!currentSnap) return [];
    return [
      { sector: "Irrigation (Agri)", amount: currentSnap.station.irrigationWithdrawal, color: "#38bdf8" },
      { sector: "Public Supply (Mun)", amount: currentSnap.station.publicSupplyWithdrawal, color: "#818cf8" },
      { sector: "Thermoelectric (Ind)", amount: currentSnap.station.thermoelectricWithdrawal, color: "#fbbf24" },
    ];
  }, [currentSnap]);

  // Monthly 12-month budget progression
  const monthlyBudget = useMemo(() => {
    return (history.data?.points ?? []).map((p) => ({
      month: p.monthName ?? new Date(p.t).toLocaleDateString("en-US", { month: "short" }),
      supply: p.supply,
      withdrawal: p.withdrawal,
      availability: p.availabilityProxy,
      climatology: p.climatology,
    }));
  }, [history.data]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Water Availability & Limitation Intelligence"
        subtitle="Analytical decomposition of water supply, sectoral withdrawal pressure, and SUI-like limitation proxies across HUC12 sub-basins."
        meta={
          <>
            <Chip tone="water">Water Balance</Chip>
            <Chip tone="ok">Sectoral Withdrawals</Chip>
            <Chip tone="warn">SUI-like Analytical Proxy</Chip>
          </>
        }
      />

      {/* Analytical Formulation Callout per Prompt Section 9 */}
      <div className="panel p-4 bg-surface-1 border border-border space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-water" />
            <span className="font-semibold text-fg text-sm tracking-tight">
              Physical Balance & Limitation Formulation
            </span>
          </div>
          <span className="text-[10px] text-fg-subtle px-2 py-0.5 rounded bg-surface-2 border border-border">
            Hydrological Proxy Framework
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-fg-muted">
          <div className="p-3 rounded bg-surface-0 border border-border space-y-1.5">
            <span className="text-[10px] uppercase text-cyan-400 font-bold block">
              1. Water Availability Proxy
            </span>
            <div className="text-sm font-semibold text-fg">
              Availability Proxy ≈ Water Supply − Sectoral Withdrawal Pressure
            </div>
            <p className="text-[11px] text-fg-subtle leading-relaxed">
              Where Water Supply is the cumulative streamflow balance (baseflow + quickflow runoff) and
              Withdrawal Pressure sums agricultural irrigation, municipal public supply, and industrial
              thermoelectric cooling demands.
            </p>
          </div>

          <div className="p-3 rounded bg-surface-0 border border-border space-y-1.5">
            <span className="text-[10px] uppercase text-purple-400 font-bold block">
              2. SUI-like Limitation Proxy
            </span>
            <div className="text-sm font-semibold text-fg">
              Relative Limitation ≈ 1 − (Availability / Typical Seasonal Supply)
            </div>
            <p className="text-[11px] text-fg-subtle leading-relaxed">
              Values approaching 1.0 indicate acute hydrological stress where withdrawal pressure outpaces
              local availability relative to the long-term climatological seasonal baseline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 text-[11px] text-fg-subtle">
          <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span>
            Analytical Proxy Notice: This metric is an exploratory SUI-like proxy designed for machine-learning
            feature representations. It does not replace statutory water-rights allocation measurements.
          </span>
        </div>
      </div>

      {/* Selector & Key Sub-Basin Metrics */}
      <div className="panel flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <label className="text-fg-subtle uppercase text-[10px]">Inspect Sub-Basin</label>
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
        </div>

        <div className="flex items-center gap-3">
          <div>
            <span className="text-fg-subtle">Supply: </span>
            <span className="font-bold text-fg">{currentSnap?.currentSupply.toFixed(1) ?? "—"} m³/s</span>
          </div>
          <div>
            <span className="text-fg-subtle">Withdrawals: </span>
            <span className="font-bold text-amber-400">{currentSnap?.totalWithdrawal.toFixed(1) ?? "—"} m³/s</span>
          </div>
          <div>
            <span className="text-fg-subtle">SUI Proxy: </span>
            <span className="font-bold text-water">{currentSnap?.waterLimitationProxy.toFixed(2) ?? "—"}</span>
          </div>
          <RiskBadge risk={currentSnap?.risk ?? "LOW"} />
        </div>
      </div>

      {/* Monthly Dynamics Chart & Withdrawal Breakdown */}
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title={`${currentSnap?.station.name ?? selected} · 12-Month Water Budget Dynamics`}
          subtitle="Observed supply vs. withdrawal pressure and resulting net availability proxy"
        >
          {history.isLoading ? (
            <ChartSkeleton height={320} />
          ) : (
            <MetricLineChart
              data={monthlyBudget}
              series={[
                { key: "climatology", name: "Climatology Normal", color: CHART_COLORS.band, dashed: true },
                { key: "supply", name: "Water Supply", color: CHART_COLORS.actual, area: true },
                { key: "withdrawal", name: "Withdrawals", color: CHART_COLORS.alert, dashed: true },
                { key: "availability", name: "Net Availability Proxy", color: CHART_COLORS.forecast },
              ]}
              xKey="month"
              unit="m³/s"
              height={320}
            />
          )}
        </Panel>

        <Panel
          title="Sectoral Withdrawal Distribution"
          subtitle={`Sector demands for ${currentSnap?.station.name ?? selected}`}
        >
          <div className="space-y-4 pt-2 font-mono">
            {withdrawalBreakdown.map((item) => {
              const total = currentSnap?.totalWithdrawal ?? 1;
              const pct = (item.amount / total) * 100;
              return (
                <div key={item.sector} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-fg font-medium">{item.sector}</span>
                    <span className="text-fg-subtle">
                      {item.amount.toFixed(1)} m³/s ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="p-3 rounded border border-border bg-surface-0 space-y-1 text-xs">
              <span className="text-[10px] uppercase text-fg-subtle block font-semibold">
                Withdrawal / Supply Ratio
              </span>
              <div className="text-base font-bold text-fg">
                {currentSnap ? (currentSnap.totalWithdrawal / Math.max(1, currentSnap.currentSupply)).toFixed(2) : "—"}
              </div>
              <p className="text-[10px] text-fg-subtle">
                Ratios exceeding 0.40 indicate severe pressure where water use consumes over 40% of instantaneous
                sub-basin supply.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Watershed-wide Highest Limitation Ranking Table */}
      <Panel
        title="Sub-Basins Facing Elevated Water Limitation"
        subtitle="Ranked by SUI-like limitation proxy across the active network"
        noPad
      >
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs text-left">
            <thead className="bg-surface-1 border-b border-border text-fg-subtle text-[10px] uppercase">
              <tr>
                <th className="p-3">HUC12 Sub-Basin</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Supply (m³/s)</th>
                <th className="p-3 text-right">Withdrawal (m³/s)</th>
                <th className="p-3 text-right">Climatology Anomaly</th>
                <th className="p-3 text-right">SUI-like Proxy</th>
                <th className="p-3 text-right">P(Stress t+1)</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {severeLimitationBasins.map((b) => (
                <tr
                  key={b.station.id}
                  className={cn(
                    "hover:bg-surface-2 transition-colors",
                    b.station.id === selected && "bg-surface-2"
                  )}
                >
                  <td className="p-3 font-medium text-fg">
                    {b.station.name} <span className="text-fg-subtle text-[10px]">({b.station.id})</span>
                  </td>
                  <td className="p-3">
                    <StationBadge category={b.station.category} short />
                  </td>
                  <td className="p-3 text-right">{b.currentSupply.toFixed(1)}</td>
                  <td className="p-3 text-right text-amber-400">{b.totalWithdrawal.toFixed(1)}</td>
                  <td className="p-3 text-right">
                    <span className={b.climatologyAnomalySigma < -1.0 ? "text-red-400 font-bold" : "text-amber-400"}>
                      {b.climatologyAnomalySigma.toFixed(2)}σ
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-water">
                    {b.waterLimitationProxy.toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {(b.riskScore * 100).toFixed(0)}%
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => selectStation(b.station.id)}
                      className="px-2 py-1 rounded bg-surface-2 hover:bg-water hover:text-white transition-colors text-[10px]"
                    >
                      Focus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
