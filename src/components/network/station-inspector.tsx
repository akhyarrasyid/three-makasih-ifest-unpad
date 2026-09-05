"use client";
import Link from "next/link";
import { X, ArrowRight, MapPin, Activity, Compass, ExternalLink, GitCommit } from "lucide-react";
import { RiskBadge, StationBadge, StatusBadge, KV, RISK_STYLES } from "@/components/ui/primitives";
import { ConfidencePanel } from "@/features/stations/station-panel";
import { STATIC_STATION_MAP, type StaticStation } from "@/data/network-static";
import { STRATEGY_LABEL } from "@/mock/stations";
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

  const isPrimary = staticStation.primary;
  const currentTma = detail?.currentTma ?? staticStation.currentTma;
  const forecast6h = detail?.forecast6h ?? staticStation.forecast6h;
  const forecast12h = detail
    ? Number((currentTma * 1.08).toFixed(2))
    : Number((staticStation.forecast6h * 1.03).toFixed(2));
  const forecast24h = detail?.forecast24h ?? staticStation.forecast24h;
  const risk = detail?.risk ?? staticStation.risk;
  const status = detail?.status ?? "ONLINE";
  const confidence = detail?.confidence ?? {
    score: isPrimary ? 0.91 : 0.84,
    drivers: [
      { label: "AWLR Telemetry", contribution: 0.42 },
      { label: "Rainfall Radar", contribution: 0.35 },
      { label: "Historical Routing", contribution: 0.23 },
    ],
    reconciliationAdjustment: 0.04,
    uncertaintyM: 0.18,
  };

  return (
    <aside
      className={cn(
        "panel h-full w-full max-w-[390px] border-l border-border bg-surface-0/95 shadow-2xl flex flex-col overflow-hidden select-none",
        className
      )}
      role="complementary"
      aria-label="Station Telemetry & Topology Inspector"
    >
      {/* 1. Header: Station Identity & Close Button */}
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
            <span
              className={cn(
                "px-1.5 py-0.5 rounded border font-medium",
                isPrimary
                  ? "bg-water/10 border-water/30 text-water"
                  : "bg-surface-2 border-border text-fg-subtle"
              )}
            >
              {isPrimary ? "Primary Network ● Connected" : "Outside Primary Network"}
            </span>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm !h-7 !w-7 !p-0 text-fg-subtle hover:text-fg"
          onClick={onClose}
          aria-label="Close station inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* Physical Geospatial Coordinates */}
        <div className="rounded border border-border bg-surface-1/60 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-fg-subtle">
            <span className="flex items-center gap-1.5 text-water">
              <MapPin className="h-3.5 w-3.5" /> Geographic Anchor
            </span>
            <span className="text-fg font-medium">
              {staticStation.latitude.toFixed(3)}° S, {staticStation.longitude.toFixed(3)}° E
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-border/50 text-[11px] text-fg-subtle">
            <div>
              <span className="text-[10px] uppercase text-fg-faint block">River</span>
              <span className="text-fg font-medium truncate block" title={staticStation.river}>
                {staticStation.river}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-fg-faint block">Elevation</span>
              <span className="text-fg font-medium block">{staticStation.elevationM} m</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-fg-faint block">Catchment</span>
              <span className="text-fg font-medium block">{staticStation.catchmentKm2} km²</span>
            </div>
          </div>
        </div>

        {/* Real-time Water Level (TMA) & Forecast Multi-Horizon */}
        <div>
          <div className="text-[10px] uppercase text-fg-subtle mb-1.5 tracking-wider flex items-center justify-between">
            <span>Water Level (TMA) & Forecasts</span>
            <span className="text-[10px] text-fg-faint">Alert: {staticStation.alertThreshold} m</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded border border-border bg-surface-1 p-2">
              <div className="text-[9px] uppercase text-fg-subtle">Observed</div>
              <div className="text-sm font-semibold text-fg mt-0.5">
                {currentTma.toFixed(2)} <span className="text-[10px] font-normal text-fg-subtle">m</span>
              </div>
            </div>

            <div className="rounded border border-border bg-surface-1 p-2">
              <div className="text-[9px] uppercase text-water">Forecast +6h</div>
              <div className="text-sm font-semibold text-water mt-0.5">
                {forecast6h.toFixed(2)} <span className="text-[10px] font-normal text-fg-subtle">m</span>
              </div>
            </div>

            <div className="rounded border border-border bg-surface-1 p-2">
              <div className="text-[9px] uppercase text-water">Forecast +24h</div>
              <div className="text-sm font-semibold text-water mt-0.5">
                {forecast24h.toFixed(2)} <span className="text-[10px] font-normal text-fg-subtle">m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hydrological Topology Section */}
        {isPrimary ? (
          <div className="space-y-3">
            <div className="text-[10px] uppercase text-fg-subtle tracking-wider flex items-center justify-between border-b border-border/50 pb-1">
              <span>Network Topology</span>
              <span className="text-emerald-400 font-medium">1 Tree Component</span>
            </div>

            {/* Upstream Sources */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-fg-subtle flex items-center gap-1">
                  <Compass className="h-3 w-3 text-cyan-400" />
                  <span>Upstream Sources</span>
                </span>
                <span className="text-fg-subtle">
                  {staticStation.upstreamStations.length === 0
                    ? "Headwater Node"
                    : `${staticStation.upstreamStations.length} direct`}
                </span>
              </div>

              {staticStation.upstreamStations.length === 0 ? (
                <div className="p-2 rounded border border-border bg-surface-1/60 text-[11px] text-fg-subtle">
                  Headwater origin node · No upstream monitoring stations
                </div>
              ) : (
                <div className="space-y-1">
                  {staticStation.upstreamStations.map((upId) => {
                    const upStn = STATIC_STATION_MAP[upId];
                    return (
                      <button
                        key={upId}
                        onClick={() => onSelectStation(upId)}
                        className="w-full flex items-center justify-between rounded border border-border bg-surface-1 px-2.5 py-1.5 text-xs hover:border-cyan-400 hover:bg-surface-2 transition-colors text-left"
                      >
                        <span className="flex items-center gap-1.5 font-medium text-fg">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          {upStn?.name ?? upId}
                        </span>
                        <span className="text-[10px] text-fg-subtle">{upId}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Downstream Outlets */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-fg-subtle flex items-center gap-1">
                  <Compass className="h-3 w-3 text-emerald-400" />
                  <span>Downstream Outlet</span>
                </span>
                <span className="text-fg-subtle">
                  {staticStation.downstreamStations.length === 0
                    ? "River Estuary"
                    : "1 direct outlet"}
                </span>
              </div>

              {staticStation.downstreamStations.length === 0 ? (
                <div className="p-2 rounded border border-border bg-surface-1/60 text-[11px] text-fg-subtle">
                  Terminal basin outlet node (Ujung Pangkah · Java Sea)
                </div>
              ) : (
                <div className="space-y-1">
                  {staticStation.downstreamStations.map((downId) => {
                    const downStn = STATIC_STATION_MAP[downId];
                    return (
                      <button
                        key={downId}
                        onClick={() => onSelectStation(downId)}
                        className="w-full flex items-center justify-between rounded border border-border bg-surface-1 px-2.5 py-1.5 text-xs hover:border-emerald-400 hover:bg-surface-2 transition-colors text-left"
                      >
                        <span className="flex items-center gap-1.5 font-medium text-fg">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {downStn?.name ?? downId}
                        </span>
                        <span className="text-[10px] text-fg-subtle">{downId}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Outside Station Operational Context */
          <div className="rounded border border-border bg-surface-1/70 p-3 space-y-2">
            <div className="flex items-center gap-2 text-fg">
              <span className="h-2 w-2 rounded-full border border-fg-subtle bg-transparent" />
              <span className="font-semibold text-xs">Outside Primary Network</span>
            </div>
            <p className="text-[11px] text-fg-subtle leading-relaxed">
              This station monitors a secondary or standalone catchment basin ({staticStation.basin}). It operates independently and does not form part of the 25-node Bengawan Solo primary connected tree.
            </p>
            <div className="text-[10px] text-fg-muted pt-1 border-t border-border/50">
              Telemetry status: <strong className="text-ok font-normal">Active telemetry feed</strong>
            </div>
          </div>
        )}

        {/* Model Strategy & Configuration */}
        <div className="rounded border border-border bg-surface-1/60 p-2.5 space-y-1.5 text-[11px]">
          <div className="text-[10px] uppercase text-fg-subtle mb-1">Predictive Architecture</div>
          <KV k="Strategy" v={STRATEGY_LABEL[staticStation.strategy] ?? staticStation.strategy} />
          <KV k="Catchment" v={`${staticStation.catchmentKm2} km²`} />
          <KV k="Basin Role" v={isPrimary ? "Bengawan Solo Core" : "Secondary Basin"} />
        </div>

        {/* Forecast Confidence Panel */}
        <ConfidencePanel confidence={confidence} compact />

        {/* Action Links */}
        <div className="flex gap-2 pt-1 font-sans">
          <Link
            href={`/stations?station=${staticStation.id}`}
            className="btn btn-sm flex-1 justify-center text-xs"
          >
            Station Detail <ArrowRight className="h-3 w-3 ml-1" />
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
