"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useStations } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import { DataTable, type Column } from "@/components/tables/data-table";
import { PageHeader, Panel, RiskBadge, StationBadge, StatusBadge, Sparkline, Skeleton, ErrorState, Segmented, Chip, RISK_STYLES } from "@/components/ui/primitives";
import { StationPanel } from "@/features/stations/station-panel";
import { STATIC_STATION_MAP } from "@/data/network-static";
import { fmtTime } from "@/lib/format";
import { RISK_ORDER } from "@/mock/risk";
import type { StationSnapshot, StationCategory, RiskLevel } from "@/types/domain";

function StationsInner() {
  const params = useSearchParams();
  const stations = useStations();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<StationCategory | "ALL">("ALL");
  const [risk, setRisk] = useState<RiskLevel | "ALL">("ALL");
  const [panel, setPanel] = useState(true);

  const st = params.get("station");
  useEffect(() => {
    if (st && STATIC_STATION_MAP[st]) {
      selectStation(st);
    }
  }, [st, selectStation]);

  const rows = useMemo(
    () =>
      (stations.data ?? []).filter(
        (s) =>
          (category === "ALL" || s.station.category === category) &&
          (risk === "ALL" || s.risk === risk) &&
          (!q ||
            `${s.station.name} ${s.station.id} ${s.station.river}`
              .toLowerCase()
              .includes(q.toLowerCase()))
      ),
    [stations.data, category, risk, q]
  );

  const columns: Column<StationSnapshot>[] = [
    {
      id: "station",
      header: "HUC12 Sub-Basin",
      hideable: false,
      sortValue: (r) => r.station.name,
      exportValue: (r) => r.station.name,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span
            className="h-6 w-1 rounded-full shrink-0"
            style={{ background: RISK_STYLES[r.risk].hex }}
          />
          <div>
            <div className="text-xs font-medium text-fg">{r.station.name}</div>
            <div className="text-[10px] font-mono text-fg-subtle">
              {r.station.id} · {r.station.river}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      sortValue: (r) => r.station.category,
      cell: (r) => <StationBadge category={r.station.category} />,
    },
    {
      id: "supply",
      header: "Supply",
      align: "right",
      sortValue: (r) => r.currentSupply,
      cell: (r) => <span className="font-mono text-xs">{r.currentSupply.toFixed(1)} m³/s</span>,
    },
    {
      id: "withdrawal",
      header: "Withdrawal",
      align: "right",
      sortValue: (r) => r.totalWithdrawal,
      cell: (r) => <span className="font-mono text-xs text-amber-400">{r.totalWithdrawal.toFixed(1)} m³/s</span>,
    },
    {
      id: "anomaly",
      header: "Climatology",
      align: "right",
      sortValue: (r) => r.climatologyAnomalySigma,
      cell: (r) => (
        <span
          className={`font-mono text-xs ${
            r.climatologyAnomalySigma < -1.0
              ? "text-red-400 font-bold"
              : r.climatologyAnomalySigma < 0
              ? "text-amber-400"
              : "text-emerald-400"
          }`}
        >
          {r.climatologyAnomalySigma >= 0 ? "+" : ""}
          {r.climatologyAnomalySigma.toFixed(2)}σ
        </span>
      ),
    },
    {
      id: "limitation",
      header: "SUI Proxy",
      align: "right",
      sortValue: (r) => r.waterLimitationProxy,
      cell: (r) => <span className="font-mono text-xs">{r.waterLimitationProxy.toFixed(2)}</span>,
    },
    {
      id: "riskScore",
      header: "Next-Month P(Stress)",
      align: "right",
      sortValue: (r) => r.riskScore,
      cell: (r) => (
        <span className="font-mono text-xs font-bold text-fg">
          {(r.riskScore * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      id: "risk",
      header: "Risk Tier",
      sortValue: (r) => RISK_ORDER[r.risk],
      exportValue: (r) => r.risk,
      cell: (r) => <RiskBadge risk={r.risk} />,
    },
    {
      id: "depth",
      header: "DAG Depth",
      align: "right",
      sortValue: (r) => r.station.graphDepth,
      cell: (r) => <span className="font-mono text-xs text-cyan-400">Level {r.station.graphDepth}</span>,
    },
    {
      id: "holdout",
      header: "Lineage",
      sortValue: (r) => (r.coldStart ? 1 : 0),
      cell: (r) =>
        r.coldStart ? (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Cold-Start
          </span>
        ) : (
          <span className="font-mono text-[10px] text-fg-subtle">Historical</span>
        ),
    },
    {
      id: "spark",
      header: "12M Supply",
      cell: (r) => <Sparkline data={r.sparkline} width={64} height={20} stroke={RISK_STYLES[r.risk].hex} />,
      defaultHidden: false,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="HUC12 Sub-Basin Explorer"
        subtitle="Catalog and detailed intelligence inspector across all monitored HUC12 sub-basins in the river network DAG."
        meta={
          <>
            <Chip tone="ok">
              {(stations.data ?? []).filter((s) => s.station.category === "HEADWATER").length} headwaters
            </Chip>
            <Chip tone="subtle">
              {(stations.data ?? []).filter((s) => s.station.category === "TRIBUTARY").length} tributaries
            </Chip>
            <Chip tone="water">
              {(stations.data ?? []).filter((s) => s.station.category === "MAINSTEM").length} mainstem
            </Chip>
            <Chip tone="warn">
              {(stations.data ?? []).filter((s) => s.coldStart).length} cold-start holdouts
            </Chip>
          </>
        }
      />

      <div className={`grid gap-4 ${panel ? "xl:grid-cols-[minmax(0,1fr)_520px]" : ""}`}>
        <Panel noPad className="min-h-[520px]">
          {stations.isError ? (
            <ErrorState error={stations.error} onRetry={() => stations.refetch()} />
          ) : stations.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.station.id}
              pageSize={15}
              selectedKey={selected}
              onRowClick={(r) => {
                selectStation(r.station.id);
                setPanel(true);
              }}
              exportName="tirta-huc12-basins"
              defaultSort={{ id: "riskScore", dir: "desc" }}
              maxHeight="calc(100vh - 320px)"
              toolbar={
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                    <input
                      className="input pl-7 w-52 font-mono text-xs"
                      placeholder="Search sub-basin, river…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Search sub-basins"
                    />
                  </div>
                  <Segmented
                    ariaLabel="Category filter"
                    options={[
                      { value: "ALL", label: "All" },
                      { value: "HEADWATER", label: "Headwaters" },
                      { value: "TRIBUTARY", label: "Tributaries" },
                      { value: "MAINSTEM", label: "Mainstem" },
                    ]}
                    value={category}
                    onChange={setCategory}
                  />
                  <select
                    className="input font-mono text-xs"
                    value={risk}
                    onChange={(e) => setRisk(e.target.value as RiskLevel | "ALL")}
                    aria-label="Risk filter"
                  >
                    <option value="ALL">All risk tiers</option>
                    <option value="LOW">Low</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </>
              }
            />
          )}
        </Panel>

        {panel && (
          <Panel noPad className="xl:sticky xl:top-0 xl:max-h-[calc(100vh-7rem)] overflow-hidden fade-up">
            <StationPanel stationId={selected} onClose={() => setPanel(false)} />
          </Panel>
        )}
      </div>
    </div>
  );
}

export default function StationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh]" />}>
      <StationsInner />
    </Suspense>
  );
}
