"use client";
import type { NetworkFilterMode } from "./network-types";
import { STATIC_STATION_MAP, NETWORK_METRICS, STATIC_STATIONS } from "@/data/network-static";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
      aria-label="HUC12 Directed River Network Operational Summary"
    >
      {/* 1. Geospatial & Hydrological Context Breadcrumb */}
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-fg-subtle tracking-wider uppercase">
        <span>TIRTA</span>
        <span className="text-fg-faint">/</span>
        <span>HUC12 Sub-Basins</span>
        <span className="text-fg-faint">/</span>
        <span className="text-fg-muted font-medium">Directed River Graph</span>
      </div>

      {/* 2. Primary Title & Operational Status */}
      <div className="mt-1 flex items-baseline justify-between gap-2 border-b border-border/70 pb-2">
        <div>
          <h1 className="text-sm font-semibold text-fg tracking-tight flex items-center gap-2">
            <span>Directed River Network</span>
          </h1>
          <p className="text-[11px] font-mono text-fg-subtle mt-0.5">
            {NETWORK_METRICS.demoSubBasins} Demo Sub-Basins · {NETWORK_METRICS.totalTestHuc12.toLocaleString()} Total HUC12 Basins
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-medium">
            DAG Topology
          </span>
        </div>
      </div>

      {/* 3. Compact Operational Metadata Summary */}
      <div className="mt-2.5 grid grid-cols-4 gap-1.5 font-mono">
        <div className="border border-border/80 bg-surface-1/60 rounded px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-wider text-fg-subtle">DAG Nodes</div>
          <div className="text-xs font-semibold text-fg mt-0.5">{STATIC_STATIONS.length} Demo</div>
          <div className="text-[9px] text-fg-subtle">{NETWORK_METRICS.totalTestHuc12.toLocaleString()} total</div>
        </div>

        <div className="border border-border/80 bg-surface-1/60 rounded px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-wider text-fg-subtle">Structure</div>
          <div className="text-xs font-semibold text-cyan-400 mt-0.5">{NETWORK_METRICS.directedEdges} Edges</div>
          <div className="text-[9px] text-fg-subtle">Depth {NETWORK_METRICS.maxGraphDepth}</div>
        </div>

        <div className="border border-border/80 bg-surface-1/60 rounded px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-wider text-fg-subtle">Origins</div>
          <div className="text-xs font-semibold text-water mt-0.5">{NETWORK_METRICS.headwaterNodes} Heads</div>
          <div className="text-[9px] text-fg-subtle">{NETWORK_METRICS.outletNodes} Outlets</div>
        </div>

        <div className="border border-border/80 bg-surface-1/60 rounded px-2 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-wider text-fg-subtle">Cold Start</div>
          <div className="text-xs font-semibold text-amber-400 mt-0.5">{NETWORK_METRICS.coldStartNodes} Nodes</div>
          <div className="text-[9px] text-fg-subtle">Holdout Basins</div>
        </div>
      </div>

      {/* 4. Active Selection Focus Bar (if a HUC is clicked) */}
      {selectedStation && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded border border-water/40 bg-water/5 px-2.5 py-1.5 font-mono text-xs">
          <div className="flex items-center gap-2 truncate">
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                selectedStation.coldStart ? "bg-amber-400" : "bg-water"
              )}
            />
            <span className="font-medium text-fg truncate">
              {selectedStation.name}
            </span>
            <span className="text-[10px] text-fg-subtle">({selectedStation.id})</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-fg-subtle">
              ↑ {upstreamCount} up · ↓ {downstreamCount} down
            </span>
            {selectedStation.coldStart && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Cold-Start
              </span>
            )}
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="text-fg-subtle hover:text-fg p-0.5 rounded transition-colors"
                title="Clear selection"
                aria-label="Clear sub-basin selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Clean Scope Filter Toggle: ALL | HEADWATERS | MAINSTEM | COLD_START */}
      <div className="mt-2.5 pt-2 border-t border-border/70 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase text-fg-subtle tracking-wider">
          Filter Sub-Basins
        </span>

        <div className="flex items-center rounded border border-border bg-surface-1 p-0.5 font-mono text-xs">
          {(
            [
              { key: "ALL", label: "All" },
              { key: "HEADWATERS", label: "Headwaters" },
              { key: "MAINSTEM", label: "Mainstem" },
              { key: "COLD_START", label: "Cold-Start" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => onFilterChange(item.key)}
              className={cn(
                "px-2 py-1 rounded transition-colors text-center font-medium text-[11px]",
                filterMode === item.key
                  ? "bg-surface-0 text-water shadow-sm border border-border/80"
                  : "text-fg-subtle hover:text-fg"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
