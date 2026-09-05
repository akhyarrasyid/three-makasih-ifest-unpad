"use client";
import { useMemo } from "react";
import type { NetworkFilterMode } from "./network-types";
import { STATIC_STATION_MAP, NETWORK_METRICS } from "@/data/network-static";
import { cn } from "@/lib/utils";
import { X, Network, Globe } from "lucide-react";

interface NetworkSummaryProps {
  selectedStationId: string | null;
  onClearSelection?: () => void;
  filterMode: NetworkFilterMode;
  onFilterChange: (mode: NetworkFilterMode) => void;
  upstreamCount?: number;
  downstreamCount?: number;
  className?: string;
}

export function NetworkSummary({
  selectedStationId,
  onClearSelection,
  filterMode,
  onFilterChange,
  upstreamCount = 0,
  downstreamCount = 0,
  className,
}: NetworkSummaryProps) {
  const selectedStation = selectedStationId ? STATIC_STATION_MAP[selectedStationId] : null;

  return (
    <aside
      className={cn(
        "panel p-3 shadow-lg bg-surface-0/95 border border-border max-w-[420px] select-none",
        className
      )}
      aria-label="Hydrological Network Operational Summary"
    >
      {/* 1. Geographic Context Breadcrumb */}
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-fg-subtle tracking-wider uppercase">
        <span>Indonesia</span>
        <span className="text-fg-faint">/</span>
        <span>Java</span>
        <span className="text-fg-faint">/</span>
        <span className="text-fg-muted font-medium">Bengawan Solo Basin</span>
      </div>

      {/* 2. Primary Title & Operational Status */}
      <div className="mt-1 flex items-baseline justify-between gap-2 border-b border-border/70 pb-2">
        <div>
          <h1 className="text-sm font-semibold text-fg tracking-tight flex items-center gap-2">
            <span>River Monitoring Network</span>
          </h1>
          <p className="text-[11px] font-mono text-fg-subtle mt-0.5">
            {NETWORK_METRICS.totalStations} Monitored Stations · {NETWORK_METRICS.primaryStations} Primary · {NETWORK_METRICS.outsideStations} Outside
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
            1 Connected Tree
          </span>
        </div>
      </div>

      {/* 3. Compact Operational Metadata Summary */}
      <div className="mt-2.5 grid grid-cols-4 gap-1.5 font-mono">
        <div className="border border-border/80 bg-surface-1/60 rounded px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-wider text-fg-subtle">Stations</div>
          <div className="text-xs font-semibold text-fg mt-0.5">30 Total</div>
          <div className="text-[9px] text-fg-subtle">25 / 5</div>
        </div>

        <div className="border border-border/80 bg-surface-1/60 rounded px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-wider text-fg-subtle">Topology</div>
          <div className="text-xs font-semibold text-emerald-400 mt-0.5">1 Tree</div>
          <div className="text-[9px] text-fg-subtle">24 Links</div>
        </div>

        <div className="border border-border/80 bg-surface-1/60 rounded px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-wider text-fg-subtle">Mean Spacing</div>
          <div className="text-xs font-semibold text-water mt-0.5">{NETWORK_METRICS.meanSpacingKm} km</div>
          <div className="text-[9px] text-fg-subtle">River reach</div>
        </div>

        <div className="border border-border/80 bg-surface-1/60 rounded px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-wider text-fg-subtle">Coverage</div>
          <div className="text-xs font-semibold text-fg mt-0.5">{NETWORK_METRICS.coveragePercent}%</div>
          <div className="text-[9px] text-fg-subtle">Primary basin</div>
        </div>
      </div>

      {/* 4. Active Selection Focus Bar (if a station is clicked) */}
      {selectedStation && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded border border-water/40 bg-water/5 px-2.5 py-1.5 font-mono text-xs">
          <div className="flex items-center gap-2 truncate">
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                selectedStation.primary ? "bg-water" : "bg-fg-subtle"
              )}
            />
            <span className="font-medium text-fg truncate">
              {selectedStation.name}
            </span>
            <span className="text-[10px] text-fg-subtle">({selectedStation.id})</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedStation.primary ? (
              <span className="text-[10px] text-fg-subtle">
                ↑ {upstreamCount} · ↓ {downstreamCount}
              </span>
            ) : (
              <span className="text-[10px] text-fg-subtle italic">
                Outside Network
              </span>
            )}
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="text-fg-subtle hover:text-fg p-0.5 rounded transition-colors"
                title="Clear selection"
                aria-label="Clear station selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Clean Scope Filter Toggle: ALL (30) | PRIMARY (25) | OUTSIDE (5) */}
      <div className="mt-2.5 pt-2 border-t border-border/70 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase text-fg-subtle tracking-wider">
          Filter View
        </span>

        <div className="flex items-center rounded border border-border bg-surface-1 p-0.5 font-mono text-xs">
          <button
            onClick={() => onFilterChange("ALL")}
            className={cn(
              "px-2.5 py-1 rounded transition-colors text-center font-medium",
              filterMode === "ALL"
                ? "bg-surface-0 text-fg shadow-sm border border-border/80"
                : "text-fg-subtle hover:text-fg"
            )}
            title="Show all 30 monitoring stations (25 primary + 5 outside)"
          >
            All (30)
          </button>
          <button
            onClick={() => onFilterChange("PRIMARY")}
            className={cn(
              "px-2.5 py-1 rounded transition-colors text-center font-medium",
              filterMode === "PRIMARY"
                ? "bg-surface-0 text-water shadow-sm border border-border/80"
                : "text-fg-subtle hover:text-fg"
            )}
            title="Show 25 primary network stations and 24 edges"
          >
            Primary (25)
          </button>
          <button
            onClick={() => onFilterChange("OUTSIDE")}
            className={cn(
              "px-2.5 py-1 rounded transition-colors text-center font-medium",
              filterMode === "OUTSIDE"
                ? "bg-surface-0 text-fg shadow-sm border border-border/80"
                : "text-fg-subtle hover:text-fg"
            )}
            title="Show 5 outside/secondary monitoring stations"
          >
            Outside (5)
          </button>
        </div>
      </div>
    </aside>
  );
}
