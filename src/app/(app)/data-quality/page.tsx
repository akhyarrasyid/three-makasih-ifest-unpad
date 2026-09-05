"use client";
import { useMemo, useState } from "react";
import { useDataQuality } from "@/hooks/use-api";
import { RoleGate } from "@/features/shared/role-gate";
import { PageHeader, Panel, MetricCard, Skeleton, ErrorState, Chip, Segmented, StationBadge } from "@/components/ui/primitives";
import { Heatmap, HBarChart, CHART_COLORS } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/tables/data-table";
import { STATION_MAP } from "@/mock/stations";
import { fmtDateTime, fmtNumber, fmtShortDate } from "@/lib/format";
import type { DataQualityReport } from "@/types/domain";

type Anomaly = DataQualityReport["anomalyTimeline"][number];
const TYPE_TONE: Record<Anomaly["type"], "warn" | "crit" | "neutral" | "water" | "subtle"> = { OUTLIER: "subtle", GAP: "crit", SPIKE: "warn", FLATLINE: "neutral", SCHEMA: "water" };

export default function DataQualityPage() {
  const dq = useDataQuality();
  const [typeFilter, setTypeFilter] = useState<Anomaly["type"] | "ALL">("ALL");
  const d = dq.data;

  const worst = useMemo(() => (d ? [...d.stationQuality].sort((a, b) => a.completeness - b.completeness).slice(0, 10).map((s) => ({ label: `${STATION_MAP[s.stationId].name} (${s.stationId})`, value: Number(((1 - s.completeness) * 100).toFixed(2)), highlight: 1 - s.completeness > 0.08 })) : []), [d]);
  const anomalies = useMemo(() => (d?.anomalyTimeline ?? []).filter((a) => typeFilter === "ALL" || a.type === typeFilter), [d, typeFilter]);

  const columns: Column<Anomaly>[] = [
    { id: "t", header: "Detected", sortValue: (r) => r.t, cell: (r) => <span className="mono text-fg-muted">{fmtDateTime(r.t)}</span> },
    { id: "type", header: "Type", sortValue: (r) => r.type, cell: (r) => <Chip tone={TYPE_TONE[r.type]}>{r.type}</Chip> },
    { id: "station", header: "Station", sortValue: (r) => r.stationId, cell: (r) => (r.stationId === "NETWORK" ? <Chip tone="crit">NETWORK-WIDE</Chip> : <span className="text-xs">{STATION_MAP[r.stationId]?.name} <span className="mono text-fg-subtle">{r.stationId}</span></span>) },
    { id: "cat", header: "Segment", cell: (r) => (STATION_MAP[r.stationId] ? <StationBadge category={STATION_MAP[r.stationId].category} short /> : "—"), defaultHidden: true },
    { id: "mag", header: "Magnitude", align: "right", sortValue: (r) => r.magnitude, cell: (r) => <span className="mono">{r.magnitude.toFixed(2)}</span> },
    { id: "desc", header: "Description", cell: (r) => <span className="text-xs text-fg-muted whitespace-normal max-w-[520px] block">{r.description}</span> },
    { id: "id", header: "ID", sortValue: (r) => r.id, cell: (r) => <span className="mono text-fg-subtle">{r.id}</span>, defaultHidden: true },
  ];

  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader title="Data Quality" subtitle="Observability for the hydrological telemetry pipeline — completeness, outliers, schema conformance and station health." meta={<><Chip tone="water">bs-v3 dataset</Chip><Chip>2023-01-01 → 2026-05-18</Chip><Chip tone="warn">5.47% missing</Chip></>} />
        {dq.isError ? (
          <ErrorState error={dq.error} onRetry={() => dq.refetch()} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {d ? (
                <>
                  <MetricCard label="Records processed" value={fmtNumber(d.summary.recordsProcessed)} hint="train 84,396 · test 21,780" />
                  <MetricCard label="Missing values" value={fmtNumber(d.summary.missingValues)} tone="warn" hint={`${(d.summary.missingRate * 100).toFixed(2)}% missing rate`} />
                  <MetricCard label="Flagged outliers" value={d.summary.outliers} tone="neutral" hint="> 4σ rolling window · excluded" />
                  <MetricCard label="Duplicate records" value={d.summary.duplicates} hint="deduplicated on (station, ts)" />
                  <MetricCard label="Stale stations" value={d.summary.staleStations} tone={d.summary.staleStations ? "warn" : "ok"} hint="latency > 30 min" />
                  <MetricCard label="Schema violations" value={d.summary.schemaViolations} hint="quarantined payloads" />
                </>
              ) : (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
              <Panel title="Missingness heatmap" subtitle="Station × date · fraction of hourly slots missing over the last 28 days. Vertical bands indicate simultaneous multi-station gaps (ingestion / backhaul incidents)." noPad>
                {d ? (
                  <div className="p-3">
                    <Heatmap rows={d.missingnessHeatmap.stations} cols={d.missingnessHeatmap.dates} values={d.missingnessHeatmap.values} colLabel={(c) => fmtShortDate(c)} colorFor={(v) => (v === 0 ? "#131920" : v < 0.05 ? "#1d3a2a" : v < 0.15 ? "#4a3512" : v < 0.3 ? "#7a4520" : "#7a2b2a")} cellTitle={(r, c, v) => `${STATION_MAP[r].name} · ${c} · ${(v * 100).toFixed(0)}% missing`} />
                    <div className="mt-2 flex items-center gap-3 t-caption px-1">
                      <span>Missing:</span>
                      {[["0%", "#131920"], ["<5%", "#1d3a2a"], ["<15%", "#4a3512"], ["<30%", "#7a4520"], ["≥30%", "#7a2b2a"]].map(([l, c]) => <span key={l} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
                    </div>
                  </div>
                ) : (
                  <Skeleton className="m-3 h-[440px]" />
                )}
              </Panel>
              <div className="space-y-4">
                <Panel title="Least complete stations" subtitle="Missing % over 28 days · red bars exceed the 8% SLO">
                  {d ? <HBarChart data={worst} height={300} unit="%" valueFormatter={(v) => `${v.toFixed(1)}%`} referenceValue={8} /> : <Skeleton className="h-[300px]" />}
                </Panel>
                <Panel title="Dataset split" subtitle="Observations per partition">
                  {d && (
                    <div className="space-y-2">
                      {[{ l: "Training (2023-01-01 → 2025-09-18)", v: d.summary.trainingObservations, c: CHART_COLORS.actual }, { l: "Test (2025-09-19 → 2026-05-18)", v: d.summary.testObservations, c: CHART_COLORS.forecast }, { l: "Missing points", v: d.summary.missingValues, c: CHART_COLORS.warning }].map((r) => (
                        <div key={r.l}>
                          <div className="flex items-center justify-between text-xs"><span className="text-fg-muted">{r.l}</span><span className="mono">{fmtNumber(r.v)}</span></div>
                          <div className="mt-1 h-1.5 rounded-full bg-surface-3 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.v / d.summary.trainingObservations) * 100}%`, background: r.c }} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>

            <Panel title="Anomaly timeline" subtitle="Detector output over the last 28 days · outliers, gaps, sudden spikes without build-up, flat-lines, schema violations" noPad actions={<Segmented ariaLabel="Anomaly type" options={[{ value: "ALL", label: "All" }, { value: "OUTLIER", label: "Outlier" }, { value: "GAP", label: "Gap" }, { value: "SPIKE", label: "Spike" }, { value: "FLATLINE", label: "Flatline" }, { value: "SCHEMA", label: "Schema" }]} value={typeFilter} onChange={setTypeFilter} />}>
              {d ? <DataTable columns={columns} rows={anomalies} rowKey={(r) => r.id} pageSize={10} defaultSort={{ id: "t", dir: "desc" }} exportName="anchor-anomalies" /> : <Skeleton className="m-3 h-64" />}
            </Panel>
          </>
        )}
      </div>
    </RoleGate>
  );
}
