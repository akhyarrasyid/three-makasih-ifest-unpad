"use client";
import { useMemo, useState } from "react";
import { useDataQuality } from "@/hooks/use-api";
import { RoleGate } from "@/features/shared/role-gate";
import { PageHeader, Panel, MetricCard, Skeleton, ErrorState, Chip, Segmented, StationBadge } from "@/components/ui/primitives";
import { Heatmap, HBarChart, CHART_COLORS } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/tables/data-table";
import { STATIC_STATION_MAP } from "@/data/network-static";
import { fmtDateTime, fmtNumber, fmtShortDate } from "@/lib/format";
import type { DataQualityReport } from "@/types/domain";

type Anomaly = NonNullable<DataQualityReport["anomalyTimeline"]>[number];
const TYPE_TONE: Record<Anomaly["type"], "warn" | "crit" | "neutral" | "water" | "subtle"> = {
  OUTLIER: "subtle",
  GAP: "crit",
  SPIKE: "warn",
  FLATLINE: "neutral",
  SCHEMA: "water",
};

export default function DataQualityPage() {
  const dq = useDataQuality();
  const [typeFilter, setTypeFilter] = useState<Anomaly["type"] | "ALL">("ALL");
  const d = dq.data;

  const worst = useMemo(
    () =>
      d && d.stationQuality
        ? [...d.stationQuality]
            .sort((a, b) => a.completeness - b.completeness)
            .slice(0, 10)
            .map((s) => ({
              label: `${STATIC_STATION_MAP[s.stationId]?.name ?? s.stationId} (${s.stationId})`,
              value: Number(((1 - s.completeness) * 100).toFixed(2)),
              highlight: 1 - s.completeness > 0.08,
            }))
        : [],
    [d]
  );
  const anomalies = useMemo(
    () =>
      (d?.anomalyTimeline ?? []).filter(
        (a: Anomaly) => typeFilter === "ALL" || a.type === typeFilter
      ),
    [d, typeFilter]
  );

  const columns: Column<Anomaly>[] = [
    {
      id: "t",
      header: "Detected",
      sortValue: (r) => r.t,
      cell: (r) => <span className="mono text-fg-muted">{fmtDateTime(r.t)}</span>,
    },
    {
      id: "type",
      header: "Category",
      sortValue: (r) => r.type,
      cell: (r) => <Chip tone={TYPE_TONE[r.type]}>{r.type}</Chip>,
    },
    {
      id: "station",
      header: "Sub-Basin",
      sortValue: (r) => r.stationId,
      cell: (r) =>
        r.stationId === "NETWORK" ? (
          <Chip tone="crit">NETWORK-WIDE</Chip>
        ) : (
          <span className="text-xs">
            {STATIC_STATION_MAP[r.stationId]?.name ?? r.stationId}{" "}
            <span className="mono text-fg-subtle">{r.stationId}</span>
          </span>
        ),
    },
    {
      id: "mag",
      header: "Magnitude",
      align: "right",
      sortValue: (r) => r.magnitude,
      cell: (r) => <span className="mono">{r.magnitude.toFixed(2)}</span>,
    },
    {
      id: "desc",
      header: "Description & Remediation",
      cell: (r) => (
        <span className="text-xs text-fg-muted whitespace-normal max-w-[520px] block">
          {r.description}
        </span>
      ),
    },
    {
      id: "id",
      header: "ID",
      sortValue: (r) => r.id,
      cell: (r) => <span className="mono text-fg-subtle">{r.id}</span>,
      defaultHidden: true,
    },
  ];

  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader
          title="Data Integrity & Lineage Forensics"
          subtitle="Forensic validation across 378,780 training and 11,928 test rows — European comma normalization, temporal lineage, and holdout spatial boundaries."
          meta={
            <>
              <Chip tone="water">378,780 Train Rows</Chip>
              <Chip>168 Monthly Origins</Chip>
              <Chip tone="ok">Schema Normalized</Chip>
            </>
          }
        />
        {dq.isError ? (
          <ErrorState error={dq.error} onRetry={() => dq.refetch()} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 font-mono">
              {d ? (
                <>
                  <MetricCard
                    label="Records Processed"
                    value={fmtNumber(d.summary.recordsProcessed)}
                    hint="378,780 train · 11,928 test"
                  />
                  <MetricCard
                    label="Missing Values"
                    value={fmtNumber(d.summary.missingValues ?? 0)}
                    tone="ok"
                    hint={`${((d.summary.missingRate ?? 0) * 100).toFixed(2)}% (lag initialization)`}
                  />
                  <MetricCard
                    label="Decimal Fixes"
                    value={d.summary.schemaViolations ?? d.summary.structuralDenoisedRows}
                    tone="water"
                    hint="European comma → dot"
                  />
                  <MetricCard
                    label="Temporal Overlap"
                    value="11/12 lags"
                    tone="warn"
                    hint="Adjacent origin sharing"
                  />
                  <MetricCard
                    label="Cold-Start Basins"
                    value="786"
                    tone="warn"
                    hint="Absent from train history"
                  />
                  <MetricCard
                    label="Temporal Lineage"
                    value="14 Annual Blocks"
                    tone="ok"
                    hint="Sep → Aug chronology"
                  />
                </>
              ) : (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[92px]" />
                ))
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
              <Panel
                title="Historical Origin Coverage Matrix"
                subtitle="Sub-basin × annual blocks · fraction of historical observations available across the 168 origins."
                noPad
              >
                {d && d.missingnessHeatmap ? (
                  <div className="p-3">
                    <Heatmap
                      rows={d.missingnessHeatmap.stations}
                      cols={d.missingnessHeatmap.dates}
                      values={d.missingnessHeatmap.values}
                      colLabel={(c) => fmtShortDate(c)}
                      colorFor={(v) =>
                        v === 0
                          ? "#131920"
                          : v < 0.05
                          ? "#1d3a2a"
                          : v < 0.15
                          ? "#4a3512"
                          : v < 0.3
                          ? "#7a4520"
                          : "#7a2b2a"
                      }
                      cellTitle={(r, c, v) =>
                        `${STATIC_STATION_MAP[r]?.name ?? r} · ${c} · ${(v * 100).toFixed(0)}% missing`
                      }
                    />
                  </div>
                ) : (
                  <Skeleton className="h-64" />
                )}
              </Panel>

              <Panel
                title="Top Sub-Basins by Data Sparsity"
                subtitle="Percentage of missing lag values before temporal imputation"
              >
                {worst.length ? (
                  <HBarChart data={worst} unit="%" height={260} />
                ) : (
                  <Skeleton className="h-64" />
                )}
              </Panel>
            </div>

            <Panel
              title="Integrity & Lineage Audit Log"
              subtitle="Data engineering transformations and detected anomalies"
              actions={
                <Segmented
                  ariaLabel="Anomaly category filter"
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "SCHEMA", label: "Schema" },
                    { value: "GAP", label: "Gaps" },
                    { value: "SPIKE", label: "Spikes" },
                    { value: "OUTLIER", label: "Outliers" },
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
              }
              noPad
            >
              <DataTable
                columns={columns}
                rows={anomalies}
                rowKey={(r) => r.id}
                pageSize={8}
                defaultSort={{ id: "t", dir: "desc" }}
                exportName="tirta-data-integrity-log"
              />
            </Panel>
          </>
        )}
      </div>
    </RoleGate>
  );
}
