"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, GitBranch, Waves } from "lucide-react";
import { useForecast, useHistory, useStation } from "@/hooks/use-api";
import { CATEGORY_LABEL, STATION_MAP, STRATEGY_LABEL } from "@/mock/stations";
import { MODEL } from "@/config/constants";
import { fmtDateTime, fmtDuration, fmtMeters, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Chip, KV, LoadingState, ErrorState, RiskBadge, StationBadge, StatusBadge, TrendIcon, Segmented, ChartSkeleton, RISK_STYLES } from "@/components/ui/primitives";
import { TimeSeriesChart, type TsPoint } from "@/components/charts/charts";
import { TraceWaterfall } from "@/features/inference/trace-view";
import type { ForecastConfidence, RoutingStep, StationDetail, TelemetryPoint, ForecastPoint } from "@/types/domain";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function mergeSeries(history: TelemetryPoint[] | undefined, forecast: ForecastPoint[] | undefined, anchor?: number): TsPoint[] {
  const out: TsPoint[] = [];
  for (const h of history ?? []) out.push({ t: h.t, actual: h.quality === "OUTLIER" ? null : h.tma, rainfall: h.rainfall, quality: h.quality });
  if (forecast?.length) {
    const last = history?.length ? history[history.length - 1] : undefined;
    if (last && last.tma !== null) out.push({ t: last.t, actual: last.tma, forecast: last.tma, band: [last.tma, last.tma], climatology: forecast[0].climatology });
    for (const f of forecast) out.push({ t: f.t, forecast: f.predicted, lower: f.lower, upper: f.upper, band: [f.lower, f.upper], climatology: f.climatology, actual: f.actual ?? undefined });
  }
  void anchor;
  return out.sort((a, b) => a.t - b.t);
}

export function gapsFrom(history: TelemetryPoint[] | undefined) {
  const gaps: { from: number; to: number }[] = [];
  let start: number | null = null;
  for (const p of history ?? []) {
    if (p.quality === "MISSING" && start === null) start = p.t;
    if (p.quality !== "MISSING" && start !== null) {
      gaps.push({ from: start, to: p.t });
      start = null;
    }
  }
  if (start !== null && history?.length) gaps.push({ from: start, to: history[history.length - 1].t });
  return gaps;
}

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

export function ConfidencePanel({ confidence, compact }: { confidence: ForecastConfidence; compact?: boolean }) {
  const pct = Math.round(confidence.score * 100);
  const tone = pct >= 85 ? "#2fbf71" : pct >= 70 ? "#f0a826" : "#ef5350";
  return (
    <div className={cn("rounded-md border border-border bg-surface-0", compact ? "p-3" : "p-4")}>
      <div className="flex items-center justify-between">
        <span className="t-label">Forecast confidence</span>
        <Chip tone="water">model forecast</Chip>
      </div>
      <div className="mt-2 flex items-end gap-3">
        <span className="t-metric" style={{ color: tone }}>{pct}%</span>
        <span className="t-caption mb-1">±{confidence.uncertaintyM.toFixed(2)} m at 24h (90% interval)</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="t-caption">Drivers</div>
        {confidence.drivers.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-44 shrink-0 truncate text-fg-muted">{d.label}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-ai" style={{ width: `${Math.round(d.contribution * 100)}%` }} />
            </div>
            <span className="mono w-9 text-right text-fg-subtle">{Math.round(d.contribution * 100)}%</span>
          </div>
        ))}
      </div>
      <p className="t-caption mt-3">Reconciliation adjustment: <span className="mono text-fg">{confidence.reconciliationAdjustment >= 0 ? "+" : ""}{confidence.reconciliationAdjustment.toFixed(3)} m</span>. Prediction uncertainty widens with horizon, rainfall intensity and telemetry gaps.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Routing diagram                                                     */
/* ------------------------------------------------------------------ */

const KIND_STYLE: Record<RoutingStep["kind"], string> = {
  input: "border-border bg-surface-1 text-fg",
  router: "border-border bg-surface-2 text-water",
  model: "border-border bg-surface-2 text-fg",
  graph: "border-border bg-surface-2 text-water",
  output: "border-border bg-surface-1 text-ok",
};

export function RoutingDiagram({ steps, active, horizontal }: { steps: RoutingStep[]; active?: boolean; horizontal?: boolean }) {
  const total = steps.reduce((a, s) => a + s.durationMs, 0);
  return (
    <div className={cn("flex gap-1.5 font-mono", horizontal ? "flex-row flex-wrap items-stretch" : "flex-col")}>
      {steps.map((s, i) => (
        <div key={s.id} className={cn("flex", horizontal ? "items-center gap-1.5" : "flex-col gap-1.5")}>
          <div className={cn("rounded border px-2.5 py-1.5 min-w-[140px]", KIND_STYLE[s.kind])}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{s.label}</span>
              <span className="text-[10px] text-fg-subtle">{s.durationMs} ms</span>
            </div>
            <div className="t-caption mt-0.5 !text-[10px] text-fg-subtle">{s.detail}</div>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("flex items-center justify-center text-fg-faint", horizontal ? "" : "h-2.5 pl-3")}>
              {horizontal ? <ArrowRight className="h-3 w-3" /> : <span className="block h-full w-px bg-border" />}
            </div>
          )}
        </div>
      ))}
      {!horizontal && <div className="text-[11px] font-mono text-fg-subtle mt-1">Routing latency: <span className="text-fg">{total} ms</span></div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Station panel                                                       */
/* ------------------------------------------------------------------ */

type Tab = "overview" | "forecast" | "network" | "quality" | "routing" | "inference";

export function StationPanel({ stationId, onClose, compact }: { stationId: string; onClose?: () => void; compact?: boolean }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [explainOpen, setExplainOpen] = useState(false);
  const detail = useStation(stationId);
  const history = useHistory(stationId, 72, 30);
  const forecast = useForecast(stationId);

  const series = useMemo(() => mergeSeries(history.data?.points, forecast.data?.points), [history.data, forecast.data]);
  const gaps = useMemo(() => gapsFrom(history.data?.points), [history.data]);

  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  if (!detail.data) return <LoadingState rows={8} />;
  const d: StationDetail = detail.data;
  const st = d.station;

  return (
    <div className="flex h-full flex-col min-w-0">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="t-h2 truncate">{st.name}</h3>
            <span className="mono text-fg-subtle">{st.id}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StationBadge category={st.category} />
            <RiskBadge risk={d.risk} />
            <StatusBadge status={d.status} />
            <span className="t-caption">{st.river} · {st.basin}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/forecasts?station=${st.id}`} className="btn btn-sm" title="Open in Forecasts"><Waves className="h-3.5 w-3.5" /><span className="hidden sm:inline">Forecast</span></Link>
          <Link href={`/network?station=${st.id}`} className="btn btn-sm" title="Open in River Network"><GitBranch className="h-3.5 w-3.5" /></Link>
          {onClose && <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close panel">✕</button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
        <div className="bg-surface-1 px-4 py-2.5">
          <div className="t-label">Current TMA</div>
          <div className="flex items-center gap-1.5 mt-1"><span className="t-metric">{d.currentTma.toFixed(2)}</span><span className="t-caption">m</span><TrendIcon trend={d.trend} /></div>
          <div className="t-caption mt-0.5">{d.trendRatePerHour >= 0 ? "+" : ""}{d.trendRatePerHour.toFixed(2)} m/h · {Math.round(d.thresholdRatio * 100)}% of alert</div>
        </div>
        <div className="bg-surface-1 px-4 py-2.5">
          <div className="t-label">Forecast 6h / 24h</div>
          <div className="flex items-baseline gap-1.5 mt-1"><span className="t-metric text-water">{d.forecast6h.toFixed(2)}</span><span className="t-caption">/ {d.forecast24h.toFixed(2)} m</span></div>
          <div className="t-caption mt-0.5">Δ24h {d.forecast24h - d.currentTma >= 0 ? "+" : ""}{(d.forecast24h - d.currentTma).toFixed(2)} m</div>
        </div>
        <div className="bg-surface-1 px-4 py-2.5">
          <div className="t-label">Freshness</div>
          <div className="flex items-baseline gap-1.5 mt-1"><span className={cn("t-metric", d.freshnessSec > 1800 ? "text-[#f5c261]" : "")}>{d.freshnessSec < 60 ? d.freshnessSec : Math.round(d.freshnessSec / 60)}</span><span className="t-caption">{d.freshnessSec < 60 ? "sec" : "min"}</span></div>
          <div className="t-caption mt-0.5">DQ {Math.round(d.dataQualityScore * 100)}% · rain 24h {d.rainfall24h.toFixed(1)} mm</div>
        </div>
      </div>

      <div className="overflow-x-auto border-b border-border px-2">
        <Segmented<Tab>
          ariaLabel="Station detail tabs"
          className="my-2 !bg-transparent !border-0"
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "forecast", label: "Forecast" },
            { value: "network", label: "Network" },
            { value: "quality", label: "Data quality" },
            { value: "routing", label: "Model routing" },
            { value: "inference", label: "Inference" },
          ]}
        />
      </div>

      <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", compact && "p-3")}>
        {tab === "overview" && (
          <>
            {history.isLoading || forecast.isLoading ? <ChartSkeleton height={220} /> : <TimeSeriesChart data={series} thresholds={st.thresholds} height={220} showRainfall gaps={gaps} anchor={forecast.data?.anchor} />}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="t-label mb-1">Station metadata</div>
                <KV k="Category" v={CATEGORY_LABEL[st.category]} />
                <KV k="Forecast strategy" v={STRATEGY_LABEL[st.strategy]} />
                <KV k="Coordinates" v={`${st.latitude.toFixed(3)}, ${st.longitude.toFixed(3)}`} mono />
                <KV k="Elevation" v={`${st.elevationM} m`} mono />
                <KV k="Catchment" v={`${st.catchmentKm2.toLocaleString()} km²`} mono />
                <KV k="Sensor" v={st.sensorType} />
                <KV k="Installed" v={st.installedAt} mono />
              </div>
              <div>
                <div className="t-label mb-1">Thresholds (demo)</div>
                <KV k="Normal" v={fmtMeters(st.thresholds.normal)} mono />
                <KV k="Warning" v={<span className="text-[#f5c261]">{fmtMeters(st.thresholds.warning)}</span>} mono />
                <KV k="Alert" v={<span className="text-[#ff9a5c]">{fmtMeters(st.thresholds.alert)}</span>} mono />
                <KV k="Critical" v={<span className="text-[#ff8a86]">{fmtMeters(st.thresholds.critical)}</span>} mono />
                <KV k="Risk score" v={<span style={{ color: RISK_STYLES[d.risk].hex }}>{d.riskScore.toFixed(3)}</span>} mono />
                <KV k="Last observation" v={`${fmtTime(d.lastUpdated)} WIB`} mono />
                <KV k="Active alerts" v={d.activeAlerts} mono />
              </div>
            </div>

            {/* Progressive Disclosure: Explain Forecast */}
            <div className="rounded border border-border bg-surface-0 p-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setExplainOpen(!explainOpen)}
                className="flex items-center justify-between w-full text-left font-medium text-water hover:underline"
              >
                <span>{explainOpen ? "▲ Hide Forecast Drivers" : "▼ Explain Forecast Drivers & Attribution"}</span>
                <span className="text-[10px] text-fg-subtle">Progressive Disclosure</span>
              </button>
              {explainOpen && (
                <div className="mt-2.5 pt-2 border-t border-border-subtle space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Precipitation Inflow (24h)</span>
                    <span className="text-fg">+{Math.min(0.24, d.rainfall24h * 0.012).toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Upstream Inflow Transfer</span>
                    <span className="text-fg">+{d.upstreamInfluence.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Spatial Reconciliation Delta</span>
                    <span className="text-fg">{d.confidence.reconciliationAdjustment >= 0 ? "+" : ""}{d.confidence.reconciliationAdjustment.toFixed(3)} m</span>
                  </div>
                  <div className="text-[10px] text-fg-faint pt-1 border-t border-border-subtle">
                    Model Routing: {st.category === "NATURAL" ? "Natural Reach → Direct MH → Graph Reconciliation" : st.category === "DAM_WEIR" ? "Controlled Barrage → Gate Rules" : "Mixed Polder → Blended Ensemble"}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "forecast" && forecast.data && (
          <>
            <TimeSeriesChart data={series} thresholds={st.thresholds} height={240} showClimatology anchor={forecast.data.anchor} gaps={gaps} />
            <div className="grid gap-4 lg:grid-cols-2">
              <ConfidencePanel confidence={d.confidence} compact />
              <div className="rounded-md border border-border bg-surface-0 p-3">
                <div className="t-label mb-2">Direct multi-horizon heads</div>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 3, 6, 12, 24, 48, 72].map((h) => {
                    const p = forecast.data!.points[h - 1];
                    return (
                      <div key={h} className="rounded border border-border bg-surface-1 p-1.5 text-center">
                        <div className="t-caption">+{h}h</div>
                        <div className="mono text-xs text-water font-medium">{p.predicted.toFixed(2)}</div>
                        <div className="t-caption !text-[9px]">±{((p.upper - p.lower) / 2).toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="t-caption mt-2">Each horizon is predicted directly from anchor t₀ = {fmtTime(forecast.data.anchor)} WIB — no recursive feedback of predictions.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip tone="neutral">{MODEL.productionVersion}</Chip>
                  <Chip>{STRATEGY_LABEL[st.strategy]}</Chip>
                  <Chip tone={st.primaryNetwork && st.category === "NATURAL" ? "ok" : "neutral"}>Reconciliation {st.primaryNetwork && st.category === "NATURAL" ? "enabled" : "n/a"}</Chip>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "network" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="t-label mb-2">Upstream influence</div>
              {st.upstreamStations.length === 0 && <p className="t-body-sm text-fg-subtle">Headwater station — no upstream nodes.</p>}
              <ul className="space-y-1.5">
                {st.upstreamStations.map((id) => (
                  <li key={id} className="flex items-center justify-between rounded-md border border-border bg-surface-0 px-3 py-2">
                    <Link href={`/stations?station=${id}`} className="text-xs hover:text-water flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-water" />{STATION_MAP[id].name}<span className="mono text-fg-subtle">{id}</span></Link>
                    <span className="t-caption">{CATEGORY_LABEL[STATION_MAP[id].category]}</span>
                  </li>
                ))}
              </ul>
              <div className="t-caption mt-2">Aggregated upstream deviation contribution: <span className="mono text-fg">+{d.upstreamInfluence.toFixed(3)} m</span></div>
              <div className="t-label mb-2 mt-4">Downstream</div>
              {st.downstreamStations.length === 0 && <p className="t-body-sm text-fg-subtle">Outlet / terminal node.</p>}
              <ul className="space-y-1.5">
                {st.downstreamStations.map((id) => (
                  <li key={id} className="flex items-center justify-between rounded-md border border-border bg-surface-0 px-3 py-2">
                    <Link href={`/stations?station=${id}`} className="text-xs hover:text-water flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ai" />{STATION_MAP[id].name}<span className="mono text-fg-subtle">{id}</span></Link>
                    <span className="t-caption">{CATEGORY_LABEL[STATION_MAP[id].category]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="t-label mb-2">Residual correlation neighbours</div>
              <ul className="space-y-1.5">
                {d.residualCorrelations.map((r) => (
                  <li key={r.stationId} className="rounded-md border border-border bg-surface-0 px-3 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>{STATION_MAP[r.stationId].name} <span className="mono text-fg-subtle">{r.stationId}</span></span>
                      <span className="mono text-accent-water">ρ {r.correlation.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full bg-accent-water" style={{ width: `${Math.max(0, r.correlation) * 100}%` }} /></div>
                      <span className="t-caption">{r.riverDistanceKm.toFixed(0)} km</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="t-label mb-2 mt-4">Rainfall → TMA lag correlation</div>
              <div className="flex items-end gap-1 h-16">
                {d.rainfallCorrelation.map((c) => (
                  <div key={c.lagHours} className="flex-1 flex flex-col items-center gap-0.5" title={`lag ${c.lagHours}h · r=${c.correlation}`}>
                    <div className="w-full rounded-sm bg-water" style={{ height: `${Math.max(4, c.correlation * 56)}px`, opacity: 0.4 + c.correlation * 0.6 }} />
                    <span className="t-caption !text-[9px]">{c.lagHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "quality" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <KV k="Data quality score" v={`${Math.round(d.dataQualityScore * 100)}%`} mono />
              <KV k="Missing rate (24h)" v={`${(d.missingRate24h * 100).toFixed(1)}%`} mono />
              <KV k="Freshness" v={fmtDuration(d.freshnessSec)} mono />
              <KV k="Status" v={<StatusBadge status={d.status} />} />
              <KV k="Gaps in 72h window" v={gaps.length} mono />
            </div>
            <div>
              <div className="t-label mb-2">Quality timeline (72h)</div>
              <div className="flex h-6 w-full overflow-hidden rounded border border-border">
                {(history.data?.points ?? []).map((p, i) => (
                  <div key={i} className="flex-1" title={`${fmtDateTime(p.t)} · ${p.quality}`} style={{ background: p.quality === "GOOD" ? "#1f5a3c" : p.quality === "INTERPOLATED" ? "#6b4d16" : p.quality === "OUTLIER" ? "#9b7bff" : "#7a2b2a" }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 t-caption">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-[#1f5a3c]" />Good</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-[#6b4d16]" />Interpolated</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-[#7a2b2a]" />Missing</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-[#9b7bff]" />Outlier</span>
              </div>
            </div>
          </div>
        )}

        {tab === "routing" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <RoutingDiagram steps={d.routing} />
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-surface-0 p-3">
                <div className="t-label mb-1">Why this route</div>
                <p className="t-body-sm text-fg-muted">
                  {st.category === "DAM_WEIR" && "Dam/weir stages are dominated by gate operations rather than hydrological response. Historical same-day climatology outperformed the ML branch by 0.21 RMSE for this segment, so the router bypasses the ensemble."}
                  {st.category === "MIXED" && "This reach shows partial regulation. The router blends the natural ML forecast with climatology using station-specific learned weights (w_ml = 0.58) to hedge between regime behaviours."}
                  {st.category === "NATURAL" && "Unregulated reach with strong rainfall–runoff response. Seven direct multi-horizon heads predict each horizon from the same anchor; residual graph reconciliation projects correlated neighbour errors back into the forecast."}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-0 p-3">
                <div className="t-label mb-1">Ensemble</div>
                <div className="flex flex-wrap gap-1.5">{st.category === "DAM_WEIR" ? <Chip>Climatology (15-day window)</Chip> : MODEL.ensemble.map((m) => <Chip key={m} tone="water">{m}</Chip>)}</div>
                <div className="t-caption mt-2">Model version <span className="mono text-fg">{MODEL.productionVersion}</span> · features {st.category === "NATURAL" ? 86 : 54}</div>
              </div>
            </div>
          </div>
        )}

        {tab === "inference" && (
          <div className="space-y-3">
            {d.inferenceHistory.map((r) => (
              <details key={r.requestId} className="group rounded-md border border-border bg-surface-0" open={r === d.inferenceHistory[0]}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs list-none">
                  <span className="mono">{r.requestId}</span>
                  <span className="t-caption">{fmtTime(r.timestamp)} WIB</span>
                  <span className="mono">{r.latencyMs} ms</span>
                  <StatusBadge status={r.status} dot={false} />
                </summary>
                <div className="border-t border-border p-3">
                  <TraceWaterfall request={r} />
                </div>
              </details>
            ))}
            <Link href={`/inference?station=${st.id}`} className="btn btn-sm"><ExternalLink className="h-3.5 w-3.5" /> Open inference console</Link>
          </div>
        )}
      </div>
    </div>
  );
}
