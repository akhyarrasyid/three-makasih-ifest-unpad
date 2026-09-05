"use client";
import { memo, type ReactNode } from "react";
import { Area, Bar, BarChart, Brush, CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, Cell, LabelList } from "recharts";
import { fmtDateTime, fmtShortDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Thresholds } from "@/types/domain";

export const CHART_COLORS = {
  actual: "#388bfd",
  forecast: "#0284c7",
  band: "#0284c7",
  climatology: "#64748b",
  rainfall: "#0284c7",
  warning: "#d29922",
  alert: "#f59e0b",
  critical: "#f85149",
  ok: "#2ea043",
  compare: "#06b6d4",
  grid: "var(--color-chart-grid)",
  axis: "var(--color-chart-axis)",
  text: "var(--color-fg-muted)",
};

const axisStyle = { fontSize: 10, fill: "var(--color-chart-axis)", fontFamily: "var(--font-mono)" };

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

interface TipPayload {
  name?: string;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}
interface TipProps {
  active?: boolean;
  payload?: TipPayload[];
  label?: string | number;
  labelFormatter?: (v: string | number) => string;
  unit?: string;
  extra?: (row: Record<string, unknown>) => ReactNode;
}

export function ChartTooltip({ active, payload, label, labelFormatter, unit = "m", extra }: TipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const seen = new Set<string>();
  return (
    <div className="panel px-3 py-2 shadow-xl min-w-[180px]" role="tooltip">
      <p className="t-caption mb-1.5">{labelFormatter && label !== undefined ? labelFormatter(label) : typeof label === "number" ? fmtDateTime(label) : label}</p>
      <div className="space-y-1">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined && p.name && !seen.has(p.name) && seen.add(p.name))
          .map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="mono text-fg">
                {typeof p.value === "number" ? p.value.toFixed(2) : p.value} {typeof p.value === "number" ? unit : ""}
              </span>
            </div>
          ))}
      </div>
      {extra && <div className="mt-2 border-t border-border pt-2">{extra(row)}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Time-series chart                                                   */
/* ------------------------------------------------------------------ */

export interface TsPoint {
  t: number;
  actual?: number | null;
  forecast?: number | null;
  lower?: number | null;
  upper?: number | null;
  climatology?: number | null;
  rainfall?: number | null;
  compare?: number | null;
  quality?: string;
  band?: [number, number] | null;
}

interface TimeSeriesChartProps {
  data: TsPoint[];
  thresholds?: Thresholds;
  height?: number;
  showRainfall?: boolean;
  showClimatology?: boolean;
  showBand?: boolean;
  showBrush?: boolean;
  anchor?: number;
  compareLabel?: string;
  unit?: string;
  tooltipExtra?: (row: Record<string, unknown>) => ReactNode;
  yDomain?: [number | "auto", number | "auto"];
  className?: string;
  gaps?: { from: number; to: number }[];
}

export const TimeSeriesChart = memo(function TimeSeriesChart({ data, thresholds, height = 280, showRainfall, showClimatology, showBand = true, showBrush, anchor, compareLabel, unit = "m", tooltipExtra, yDomain, className, gaps }: TimeSeriesChartProps) {
  const span = data.length ? data[data.length - 1].t - data[0].t : 0;
  const tickFmt = (v: number) => (span > 3 * 86400_000 ? fmtShortDate(v) : fmtTime(v, false));
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: showBrush ? 0 : 4 }}>
          <defs>
            <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.band} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_COLORS.band} stopOpacity={0.06} />
            </linearGradient>
            <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.actual} stopOpacity={0.18} />
              <stop offset="100%" stopColor={CHART_COLORS.actual} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={tickFmt} tick={axisStyle} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} minTickGap={48} />
          <YAxis yAxisId="tma" tick={axisStyle} axisLine={false} tickLine={false} domain={yDomain ?? ["auto", "auto"]} tickFormatter={(v: number) => v.toFixed(1)} width={44} />
          {showRainfall && <YAxis yAxisId="rain" orientation="right" reversed tick={axisStyle} axisLine={false} tickLine={false} width={36} domain={[0, (max: number) => Math.max(10, max * 3)]} tickFormatter={(v: number) => `${v.toFixed(0)}`} />}
          <Tooltip content={<ChartTooltip unit={unit} extra={tooltipExtra} />} cursor={{ stroke: "#3a4a5a", strokeDasharray: "3 3" }} isAnimationActive={false} />
          {gaps?.map((g, i) => <ReferenceArea key={i} yAxisId="tma" x1={g.from} x2={g.to} fill="#ef5350" fillOpacity={0.06} stroke="none" />)}
          {thresholds && (
            <>
              <ReferenceLine yAxisId="tma" y={thresholds.warning} stroke={CHART_COLORS.warning} strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: "Warning", position: "insideTopRight", fontSize: 9, fill: CHART_COLORS.warning }} />
              <ReferenceLine yAxisId="tma" y={thresholds.alert} stroke={CHART_COLORS.alert} strokeDasharray="4 4" strokeOpacity={0.8} label={{ value: "Alert", position: "insideTopRight", fontSize: 9, fill: CHART_COLORS.alert }} />
            </>
          )}
          {anchor && <ReferenceLine yAxisId="tma" x={anchor} stroke="#9fb0c0" strokeDasharray="2 3" label={{ value: "t₀", position: "top", fontSize: 10, fill: "#e6edf3" }} />}
          {showRainfall && <Bar yAxisId="rain" dataKey="rainfall" name="Rainfall (mm/h)" fill={CHART_COLORS.rainfall} fillOpacity={0.55} barSize={3} isAnimationActive={false} />}
          {showBand && <Area yAxisId="tma" dataKey="band" name="90% interval" stroke="none" fill="url(#bandFill)" isAnimationActive={false} connectNulls={false} legendType="none" tooltipType="none" />}
          {showClimatology && <Line yAxisId="tma" dataKey="climatology" name="Climatology" stroke={CHART_COLORS.climatology} strokeWidth={1} strokeDasharray="2 4" dot={false} isAnimationActive={false} connectNulls />}
          <Area yAxisId="tma" dataKey="actual" name="Observed TMA" stroke={CHART_COLORS.actual} strokeWidth={1.6} fill="url(#actualFill)" dot={false} isAnimationActive={false} connectNulls={false} activeDot={{ r: 3 }} />
          <Line yAxisId="tma" dataKey="forecast" name="Model forecast" stroke={CHART_COLORS.forecast} strokeWidth={1.6} strokeDasharray="5 3" dot={false} isAnimationActive={false} connectNulls activeDot={{ r: 3 }} />
          {compareLabel && <Line yAxisId="tma" dataKey="compare" name={compareLabel} stroke={CHART_COLORS.compare} strokeWidth={1.3} dot={false} isAnimationActive={false} connectNulls />}
          <Legend wrapperStyle={{ fontSize: 11, color: CHART_COLORS.text, paddingTop: 6 }} iconSize={8} iconType="plainline" />
          {showBrush && <Brush dataKey="t" height={22} stroke="#2c3a47" fill="#0f141a" tickFormatter={tickFmt} travellerWidth={8} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Horizontal bar comparison                                           */
/* ------------------------------------------------------------------ */

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  highlight?: boolean;
}

export const HBarChart = memo(function HBarChart({ data, height = 220, unit = "", domain, valueFormatter, className, referenceValue }: { data: BarDatum[]; height?: number; unit?: string; domain?: [number, number]; valueFormatter?: (v: number) => string; className?: string; referenceValue?: number }) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }} barCategoryGap={6}>
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" domain={domain ?? [0, "auto"]} tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={{ ...axisStyle, fontFamily: "var(--font-sans)", fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
          <Tooltip content={<ChartTooltip unit={unit} labelFormatter={(v) => String(v)} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} isAnimationActive={false} />
          {referenceValue !== undefined && <ReferenceLine x={referenceValue} stroke={CHART_COLORS.ok} strokeDasharray="3 3" />}
          <Bar dataKey="value" name={unit || "value"} radius={[0, 3, 3, 0]} isAnimationActive={false} barSize={16}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? (d.highlight ? CHART_COLORS.ok : CHART_COLORS.actual)} fillOpacity={d.highlight ? 1 : 0.75} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : String(v))} style={{ fontSize: 10, fill: "#e6edf3", fontFamily: "var(--font-mono)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Simple line chart for generic metrics                               */
/* ------------------------------------------------------------------ */

export const MetricLineChart = memo(function MetricLineChart({ data, series, height = 180, xKey = "t", xFormatter, unit = "", yDomain, className, referenceY }: { data: Record<string, unknown>[]; series: { key: string; name: string; color: string; dashed?: boolean; area?: boolean; yAxisId?: string }[]; height?: number; xKey?: string; xFormatter?: (v: number) => string; unit?: string; yDomain?: [number | "auto", number | "auto"]; className?: string; referenceY?: { value: number; label: string; color?: string } }) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey={xKey} tick={axisStyle} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} tickFormatter={xFormatter} minTickGap={36} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={yDomain ?? ["auto", "auto"]} width={48} />
          <Tooltip content={<ChartTooltip unit={unit} labelFormatter={xFormatter ? (v) => xFormatter(Number(v)) : undefined} />} cursor={{ stroke: "#3a4a5a" }} isAnimationActive={false} />
          {referenceY && <ReferenceLine y={referenceY.value} stroke={referenceY.color ?? CHART_COLORS.ok} strokeDasharray="4 4" label={{ value: referenceY.label, position: "insideTopRight", fontSize: 9, fill: referenceY.color ?? CHART_COLORS.ok }} />}
          {series.map((s) =>
            s.area ? (
              <Area key={s.key} dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.12} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            ) : (
              <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={1.5} strokeDasharray={s.dashed ? "4 3" : undefined} dot={false} isAnimationActive={false} />
            ),
          )}
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: CHART_COLORS.text }} iconSize={8} iconType="plainline" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Heatmap (SVG)                                                       */
/* ------------------------------------------------------------------ */

export const Heatmap = memo(function Heatmap({ rows, cols, values, rowLabel, colLabel, colorFor, cellTitle, className }: { rows: string[]; cols: string[]; values: number[][]; rowLabel?: (r: string) => string; colLabel?: (c: string, i: number) => string; colorFor: (v: number) => string; cellTitle?: (r: string, c: string, v: number) => string; className?: string }) {
  const cellW = 22;
  const cellH = 14;
  const left = 74;
  const top = 18;
  const w = left + cols.length * cellW;
  const h = top + rows.length * cellH;
  return (
    <div className={cn("overflow-auto", className)}>
      <svg width={w} height={h} className="block" role="img" aria-label="Heatmap">
        {cols.map((c, i) => (i % 3 === 0 ? <text key={c} x={left + i * cellW + cellW / 2} y={12} textAnchor="middle" fontSize={9} fill={CHART_COLORS.text} fontFamily="var(--font-mono)">{colLabel ? colLabel(c, i) : c}</text> : null))}
        {rows.map((r, ri) => (
          <g key={r}>
            <text x={left - 6} y={top + ri * cellH + cellH / 2 + 3} textAnchor="end" fontSize={9} fill={CHART_COLORS.text} fontFamily="var(--font-mono)">{rowLabel ? rowLabel(r) : r}</text>
            {cols.map((c, ci) => {
              const v = values[ri]?.[ci] ?? 0;
              return <rect key={c} x={left + ci * cellW + 1} y={top + ri * cellH + 1} width={cellW - 2} height={cellH - 2} rx={2} fill={colorFor(v)}>{cellTitle && <title>{cellTitle(r, c, v)}</title>}</rect>;
            })}
          </g>
        ))}
      </svg>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Scatter                                                             */
/* ------------------------------------------------------------------ */

export const ResidualScatter = memo(function ResidualScatter({ data, height = 220, className }: { data: { x: number; y: number; label?: string }[]; height?: number; className?: string }) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} />
          <XAxis dataKey="x" type="number" name="Observed" unit=" m" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis dataKey="y" type="number" name="Residual" unit=" m" tick={axisStyle} axisLine={false} tickLine={false} width={48} />
          <ReferenceLine y={0} stroke="#4a5968" />
          <Tooltip content={<ChartTooltip unit="m" labelFormatter={() => "Residual"} />} cursor={{ strokeDasharray: "3 3" }} isAnimationActive={false} />
          <Scatter data={data} fill={CHART_COLORS.forecast} fillOpacity={0.6} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
});
