"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useStations } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import { DataTable, type Column } from "@/components/tables/data-table";
import { PageHeader, Panel, RiskBadge, StationBadge, StatusBadge, TrendIcon, Sparkline, Skeleton, ErrorState, Segmented, Chip, RISK_STYLES } from "@/components/ui/primitives";
import { StationPanel } from "@/features/stations/station-panel";
import { STATION_MAP } from "@/mock/stations";
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

  useEffect(() => {
    const st = params.get("station");
    if (st && STATION_MAP[st]) { selectStation(st); setPanel(true); }
  }, [params, selectStation]);

  const rows = useMemo(() => (stations.data ?? []).filter((s) => (category === "ALL" || s.station.category === category) && (risk === "ALL" || s.risk === risk) && (!q || `${s.station.name} ${s.station.id} ${s.station.river}`.toLowerCase().includes(q.toLowerCase()))), [stations.data, category, risk, q]);

  const columns: Column<StationSnapshot>[] = [
    { id: "station", header: "Station", hideable: false, sortValue: (r) => r.station.name, exportValue: (r) => r.station.name, cell: (r) => <div className="flex items-center gap-2"><span className="h-6 w-1 rounded-full" style={{ background: RISK_STYLES[r.risk].hex }} /><div><div className="text-xs font-medium">{r.station.name}</div><div className="t-caption mono">{r.station.id} · {r.station.river}</div></div></div> },
    { id: "category", header: "Category", sortValue: (r) => r.station.category, cell: (r) => <StationBadge category={r.station.category} /> },
    { id: "tma", header: "Current TMA", align: "right", sortValue: (r) => r.currentTma, cell: (r) => <span className="mono">{r.currentTma.toFixed(2)} m</span> },
    { id: "fc24", header: "24h Forecast", align: "right", sortValue: (r) => r.forecast24h, cell: (r) => <span className="mono text-accent-water">{r.forecast24h.toFixed(2)} m</span> },
    { id: "trend", header: "Trend", sortValue: (r) => r.trendRatePerHour, cell: (r) => <span className="flex items-center gap-1.5"><TrendIcon trend={r.trend} /><span className="mono text-fg-muted">{r.trendRatePerHour >= 0 ? "+" : ""}{r.trendRatePerHour.toFixed(2)}/h</span></span> },
    { id: "spark", header: "24h", cell: (r) => <Sparkline data={r.sparkline} width={64} height={20} stroke={RISK_STYLES[r.risk].hex} />, defaultHidden: false },
    { id: "risk", header: "Risk", sortValue: (r) => RISK_ORDER[r.risk], exportValue: (r) => r.risk, cell: (r) => <RiskBadge risk={r.risk} /> },
    { id: "ratio", header: "% Alert", align: "right", sortValue: (r) => r.thresholdRatio, cell: (r) => <span className="mono">{Math.round(r.thresholdRatio * 100)}%</span>, defaultHidden: true },
    { id: "fresh", header: "Freshness", align: "right", sortValue: (r) => r.freshnessSec, cell: (r) => <span className={`mono ${r.freshnessSec > 1800 ? "text-[#f5c261]" : ""}`}>{r.freshnessSec < 60 ? `${r.freshnessSec}s` : `${Math.round(r.freshnessSec / 60)}m`}</span> },
    { id: "dq", header: "DQ", align: "right", sortValue: (r) => r.dataQualityScore, cell: (r) => <span className="mono">{Math.round(r.dataQualityScore * 100)}%</span>, defaultHidden: true },
    { id: "model", header: "Model", sortValue: (r) => r.station.strategy, cell: (r) => <span className="t-caption">{r.station.strategy === "DIRECT_MULTI_HORIZON" ? "Direct MH + Graph" : r.station.strategy === "HYBRID" ? "Hybrid" : "Climatology"}</span> },
    { id: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    { id: "updated", header: "Last update", align: "right", sortValue: (r) => r.lastUpdated, exportValue: (r) => new Date(r.lastUpdated).toISOString(), cell: (r) => <span className="mono text-fg-muted">{fmtTime(r.lastUpdated)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Stations" subtitle="Station intelligence across 30 monitoring points — segment, current stage, forecast, risk and data health." meta={<><Chip tone="ok">{(stations.data ?? []).filter((s) => s.station.category === "NATURAL").length} natural</Chip><Chip tone="subtle">{(stations.data ?? []).filter((s) => s.station.category === "MIXED").length} mixed</Chip><Chip tone="water">{(stations.data ?? []).filter((s) => s.station.category === "DAM_WEIR").length} dam / weir</Chip></>} />
      <div className={`grid gap-4 ${panel ? "xl:grid-cols-[minmax(0,1fr)_520px]" : ""}`}>
        <Panel noPad className="min-h-[520px]">
          {stations.isError ? (
            <ErrorState error={stations.error} onRetry={() => stations.refetch()} />
          ) : stations.isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.station.id}
              pageSize={15}
              selectedKey={selected}
              onRowClick={(r) => { selectStation(r.station.id); setPanel(true); }}
              exportName="anchor-stations"
              defaultSort={{ id: "risk", dir: "desc" }}
              maxHeight="calc(100vh - 320px)"
              toolbar={
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                    <input className="input pl-7 w-52" placeholder="Search station, river…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search stations" />
                  </div>
                  <Segmented ariaLabel="Category filter" options={[{ value: "ALL", label: "All" }, { value: "NATURAL", label: "Natural" }, { value: "MIXED", label: "Mixed" }, { value: "DAM_WEIR", label: "Dam" }]} value={category} onChange={setCategory} />
                  <select className="input" value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel | "ALL")} aria-label="Risk filter">
                    <option value="ALL">All risk</option>
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
