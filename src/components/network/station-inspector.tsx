"use client";
import Link from "next/link";
import { X, ArrowRight, MapPin, Compass, Droplets, GitFork, AlertTriangle, ShieldCheck } from "lucide-react";
import { RiskBadge, StationBadge, StatusBadge, KV } from "@/components/ui/primitives";
import { ConfidencePanel } from "@/features/stations/station-panel";
import {
  STATIC_STATION_MAP,
  getUpstream1Hop,
  getUpstream2Hop,
  getUpstream3Hop,
  getDownstreamPath,
} from "@/data/network-static";
import type { StationDetail, NetworkEdge } from "@/types/domain";
import { cn } from "@/lib/utils";

interface StationInspectorProps {
  stationId: string | null;
  detail?: StationDetail | null;
  isLoading?: boolean;
  onClose: () => void;
  onSelectStation: (id: string) => void;
  edgesIn?: NetworkEdge[];
  edgesOut?: NetworkEdge[];
  className?: string;
}

export function StationInspector({
  stationId,
  detail,
  isLoading = false,
  onClose,
  onSelectStation,
  edgesIn = [],
  edgesOut = [],
  className,
}: StationInspectorProps) {
  if (!stationId) return null;

  // Immediate fallback to static station data for instant 0ms rendering
  const staticStation = STATIC_STATION_MAP[stationId];
  if (!staticStation) return null;

  const risk = detail?.risk ?? staticStation.risk;
  const riskScore = detail?.riskScore ?? staticStation.riskScore;
  const status = detail?.status ?? "ONLINE";
  const coldStart = staticStation.coldStart;
  const currentSupply = detail?.currentSupply ?? staticStation.currentSupply;
  const availabilityProxy = detail?.availabilityProxy ?? staticStation.availabilityProxy;
  const waterLimitationProxy = detail?.waterLimitationProxy ?? staticStation.waterLimitationProxy;
  const climatologyAnomaly = detail?.climatologyAnomalySigma ?? staticStation.climatologyAnomalySigma;
  const totalWithdrawal = detail?.totalWithdrawal ?? staticStation.totalWithdrawal;

  const confidence = detail?.confidence ?? {
    score: coldStart ? 0.68 : 0.86,
    drivers: [
      { label: "Climatology Anomaly", contribution: 0.38, group: "climatology" },
      { label: "Water Limitation Proxy", contribution: 0.28, group: "limitation" },
      { label: "Directed Upstream Reachability", contribution: 0.21, group: "graph" },
      { label: "Withdrawal Pressure", contribution: 0.13, group: "withdrawal" },
    ],
    reconciliationAdjustment: coldStart ? 0.08 : 0.03,
    uncertaintyM: 0.12,
    coldStart: coldStart,
  };

  const up1 = getUpstream1Hop(stationId);
  const up2 = getUpstream2Hop(stationId);
  const up3 = getUpstream3Hop(stationId);
  const downPath = getDownstreamPath(stationId);

  return (
    <aside
      className={cn(
        "panel h-full w-full max-w-[400px] border-l border-border bg-surface-0/95 shadow-2xl flex flex-col overflow-hidden select-none",
        className
      )}
      role="complementary"
      aria-label="HUC12 Basin Intelligence & Reachability Inspector"
    >
      {/* 1. Header: Sub-Basin Identity & Close Button */}
      <div className="flex items-start justify-between border-b border-border px-4 py-3 bg-surface-1/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-fg tracking-tight">{staticStation.name}</h2>
            <span className="font-mono text-xs text-fg-subtle px-1.5 py-0.5 rounded bg-surface-2 border border-border">
              {staticStation.id}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
            <StationBadge category={staticStation.category} />
            <RiskBadge risk={risk} />
            <StatusBadge status={status} />
            {coldStart ? (
              <span className="px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium">
                Cold-Start Spatial Holdout
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-medium">
                Historical Anchor Sub-Basin
              </span>
            )}
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm !h-7 !w-7 !p-0 text-fg-subtle hover:text-fg"
          onClick={onClose}
          aria-label="Close sub-basin inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* Geographic & Basin Topology Parameters */}
        <div className="rounded border border-border bg-surface-1/60 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-fg-subtle">
            <span className="flex items-center gap-1.5 text-water">
              <MapPin className="h-3.5 w-3.5" /> Spatial Unit
            </span>
            <span className="text-fg font-medium">
              HUC12 · {staticStation.latitude.toFixed(3)}° S, {staticStation.longitude.toFixed(3)}° E
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-border/50 text-[11px] text-fg-subtle">
            <div>
              <span className="text-[10px] uppercase text-fg-faint block">Basin Area</span>
              <span className="text-fg font-medium block">{staticStation.basinAreaKm2.toLocaleString()} km²</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-fg-faint block">Population</span>
              <span className="text-fg font-medium block">{staticStation.population.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-fg-faint block">DAG Depth</span>
              <span className="text-fg font-medium block">Level {staticStation.graphDepth}</span>
            </div>
          </div>
        </div>

        {/* Next-Month Water-Stress Forecast Summary */}
        <div className="rounded border border-border bg-surface-1 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-water" /> Next-Month Stress Risk
            </span>
            <span className="text-[10px] text-fg-subtle">Month t+1</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold font-mono tracking-tight text-fg">
                {(riskScore * 100).toFixed(1)}%
              </span>
              <span className="ml-1 text-[11px] text-fg-subtle">P(water stress)</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-water uppercase">{risk} TIER</span>
              <div className="text-[10px] text-fg-subtle">Confidence {(confidence.score * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div className="text-[9px] text-fg-subtle italic border-t border-border/40 pt-1">
            Risk tier is a demonstration interpretation of the continuous model probability.
          </div>
        </div>

        {/* Monthly Water-Budget Quantities */}
        <div>
          <div className="text-[10px] uppercase text-fg-subtle mb-1.5 tracking-wider flex items-center justify-between">
            <span>Water Budget & Availability</span>
            <span className="text-[10px] text-fg-faint">Monthly Balance</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded border border-border bg-surface-1 p-2">
              <div className="text-[9px] uppercase text-fg-subtle">Supply</div>
              <div className="text-sm font-semibold text-fg mt-0.5">
                {currentSupply.toFixed(1)} <span className="text-[10px] font-normal text-fg-subtle">m³/s</span>
              </div>
            </div>

            <div className="rounded border border-border bg-surface-1 p-2">
              <div className="text-[9px] uppercase text-fg-subtle">Withdrawal</div>
              <div className="text-sm font-semibold text-amber-400 mt-0.5">
                {totalWithdrawal.toFixed(1)} <span className="text-[10px] font-normal text-fg-subtle">m³/s</span>
              </div>
            </div>

            <div className="rounded border border-border bg-surface-1 p-2">
              <div className="text-[9px] uppercase text-water">Availability</div>
              <div className="text-sm font-semibold text-water mt-0.5">
                {availabilityProxy.toFixed(1)} <span className="text-[10px] font-normal text-fg-subtle">m³/s</span>
              </div>
            </div>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded border border-border bg-surface-1 p-2">
              <span className="text-[9px] uppercase text-fg-subtle block">Climatology Anomaly</span>
              <span className={cn(
                "text-xs font-semibold block mt-0.5",
                climatologyAnomaly < -1.0 ? "text-red-400" : climatologyAnomaly < 0 ? "text-amber-400" : "text-emerald-400"
              )}>
                {climatologyAnomaly >= 0 ? "+" : ""}{climatologyAnomaly.toFixed(2)}σ
              </span>
            </div>
            <div className="rounded border border-border bg-surface-1 p-2">
              <span className="text-[9px] uppercase text-fg-subtle block">SUI-like Proxy</span>
              <span className="text-xs font-semibold text-fg block mt-0.5">
                {waterLimitationProxy.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Directed Multi-Hop Reachability Section */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase text-fg-subtle tracking-wider flex items-center justify-between border-b border-border/50 pb-1">
            <span className="flex items-center gap-1">
              <GitFork className="h-3 w-3 text-cyan-400" />
              <span>Directed Multi-Hop Reachability</span>
            </span>
            <span className="text-cyan-400 font-medium">{up1.length + up2.length + up3.length} Upstream Basins</span>
          </div>

          {/* Upstream Hop Breakdown */}
          <div className="space-y-2">
            {/* 1-hop upstream */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-fg-subtle flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>1-Hop Direct Upstream</span>
                </span>
                <span className="text-fg-subtle">{up1.length === 0 ? "Headwater Origin" : `${up1.length} basin(s)`}</span>
              </div>
              {up1.length === 0 ? (
                <div className="p-2 rounded border border-border bg-surface-1/60 text-[10px] text-fg-subtle italic">
                  Headwater sub-basin — no upstream contributing nodes in DAG.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {up1.map((id) => (
                    <button
                      key={id}
                      onClick={() => onSelectStation(id)}
                      className="px-2 py-1 rounded border border-border bg-surface-1 hover:border-cyan-400 hover:bg-surface-2 transition-colors text-[10px] text-fg font-medium"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2-hop upstream */}
            {up2.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-fg-subtle flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
                    <span>2-Hop Upstream Catchment</span>
                  </span>
                  <span className="text-fg-subtle">{up2.length} basin(s)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {up2.map((id) => (
                    <button
                      key={id}
                      onClick={() => onSelectStation(id)}
                      className="px-2 py-1 rounded border border-border bg-surface-1 hover:border-cyan-400 hover:bg-surface-2 transition-colors text-[10px] text-fg-muted"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3-hop upstream */}
            {up3.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-fg-subtle flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-800" />
                    <span>3-Hop Upstream Reach</span>
                  </span>
                  <span className="text-fg-subtle">{up3.length} basin(s)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {up3.map((id) => (
                    <button
                      key={id}
                      onClick={() => onSelectStation(id)}
                      className="px-2 py-1 rounded border border-border bg-surface-1 hover:border-cyan-400 hover:bg-surface-2 transition-colors text-[10px] text-fg-subtle"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Downstream Receiving Basin */}
            <div className="pt-1.5 border-t border-border/40">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-fg-subtle flex items-center gap-1">
                  <Compass className="h-3 w-3 text-emerald-400" />
                  <span>Downstream Receiving Basin</span>
                </span>
                <span className="text-fg-subtle">
                  {staticStation.downstreamStationId ? "1 direct receiving node" : "Terminal Basin Outlet"}
                </span>
              </div>
              {staticStation.downstreamStationId ? (
                <button
                  onClick={() => onSelectStation(staticStation.downstreamStationId!)}
                  className="w-full flex items-center justify-between rounded border border-border bg-surface-1 px-2.5 py-1.5 text-xs hover:border-emerald-400 hover:bg-surface-2 transition-colors text-left"
                >
                  <span className="flex items-center gap-1.5 font-medium text-fg">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {STATIC_STATION_MAP[staticStation.downstreamStationId]?.name ?? staticStation.downstreamStationId}
                  </span>
                  <span className="text-[10px] text-fg-subtle">{staticStation.downstreamStationId}</span>
                </button>
              ) : (
                <div className="p-2 rounded border border-border bg-surface-1/60 text-[10px] text-fg-subtle italic">
                  Terminal basin outlet — discharges to regional receiving water body.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Forecast Confidence Panel */}
        <ConfidencePanel confidence={confidence} compact />

        {/* Action Links */}
        <div className="flex gap-2 pt-1 font-sans">
          <Link
            href={`/explorer?station=${staticStation.id}`}
            className="btn btn-sm flex-1 justify-center text-xs"
          >
            Basin Detail <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
          <Link
            href={`/forecasts?station=${staticStation.id}`}
            className="btn btn-sm btn-primary flex-1 justify-center text-xs"
          >
            Forecast
          </Link>
        </div>
      </div>
    </aside>
  );
}
