"use client";
import { useState, useRef, useEffect } from "react";
import { Layers, ZoomIn, ZoomOut, Maximize2, Sun, Moon } from "lucide-react";
import { LayerControl } from "./layer-control";
import type { NetworkLayerState, HopDirection, NetworkOverlayMode } from "./network-types";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

interface NetworkControlsProps {
  layers: NetworkLayerState;
  onToggleLayer: (layer: keyof NetworkLayerState) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitNetwork: () => void;
  onSetHopDistance?: (hops: 1 | 2 | 3) => void;
  onSetHopDirection?: (dir: HopDirection) => void;
  onSetOverlay?: (mode: NetworkOverlayMode) => void;
  className?: string;
}

export function NetworkControls({
  layers,
  onToggleLayer,
  onZoomIn,
  onZoomOut,
  onFitNetwork,
  onSetHopDistance,
  onSetHopDirection,
  onSetOverlay,
  className,
}: NetworkControlsProps) {
  const [layerOpen, setLayerOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setLayerOpen(false);
      }
    }
    if (layerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [layerOpen]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className={cn("relative flex flex-wrap items-center gap-1.5", className)}>
      {/* Quick Reachability Hop Distance Selector */}
      {onSetHopDistance && (
        <div className="flex items-center rounded border border-border bg-surface-0/90 shadow-md backdrop-blur-md overflow-hidden font-mono text-[11px]">
          <span className="px-2 py-1 text-fg-subtle text-[10px] uppercase font-semibold border-r border-border/60">
            Reach
          </span>
          {([1, 2, 3] as const).map((h) => (
            <button
              key={h}
              onClick={() => onSetHopDistance(h)}
              className={cn(
                "px-2 py-1 transition-colors border-r last:border-r-0 border-border/60",
                layers.hopDistance === h
                  ? "bg-water text-white font-semibold"
                  : "text-fg-muted hover:text-fg hover:bg-surface-1"
              )}
              title={`Expose ${h}-hop reachability neighborhood`}
            >
              {h}h
            </button>
          ))}
        </div>
      )}

      {/* Quick Hop Direction Selector */}
      {onSetHopDirection && (
        <div className="flex items-center rounded border border-border bg-surface-0/90 shadow-md backdrop-blur-md overflow-hidden font-mono text-[11px]">
          <span className="px-2 py-1 text-fg-subtle text-[10px] uppercase font-semibold border-r border-border/60">
            Flow
          </span>
          {(["UPSTREAM", "DOWNSTREAM", "BOTH"] as const).map((d) => (
            <button
              key={d}
              onClick={() => onSetHopDirection(d)}
              className={cn(
                "px-2 py-1 transition-colors border-r last:border-r-0 border-border/60 text-[10px]",
                layers.hopDirection === d
                  ? "bg-water text-white font-semibold"
                  : "text-fg-muted hover:text-fg hover:bg-surface-1"
              )}
              title={`Trace ${d.toLowerCase()} connectivity`}
            >
              {d === "UPSTREAM" ? "Up (↑)" : d === "DOWNSTREAM" ? "Down (↓)" : "Both"}
            </button>
          ))}
        </div>
      )}

      {/* Overlay Selector */}
      {onSetOverlay && (
        <div className="flex items-center rounded border border-border bg-surface-0/90 shadow-md backdrop-blur-md overflow-hidden font-mono text-[11px]">
          <span className="px-2 py-1 text-fg-subtle text-[10px] uppercase font-semibold border-r border-border/60">
            Signal
          </span>
          {(["RISK", "SUPPLY", "WITHDRAWAL", "GNN_INFLUENCE"] as const).map((ov) => (
            <button
              key={ov}
              onClick={() => onSetOverlay(ov)}
              className={cn(
                "px-2 py-1 transition-colors border-r last:border-r-0 border-border/60 text-[10px]",
                layers.overlay === ov
                  ? "bg-water text-white font-semibold"
                  : "text-fg-muted hover:text-fg hover:bg-surface-1"
              )}
              title={`Overlay ${ov} signal`}
            >
              {ov === "RISK" ? "Risk" : ov === "SUPPLY" ? "Supply" : ov === "WITHDRAWAL" ? "Withdrawal" : "GNN"}
            </button>
          ))}
        </div>
      )}

      {/* Layer Toggle Button */}
      <div className="relative" ref={popupRef}>
        <button
          onClick={() => setLayerOpen((v) => !v)}
          className={cn(
            "btn btn-sm shadow-md font-mono text-xs flex items-center gap-1.5 transition-colors",
            layerOpen ? "bg-surface-2 border-border-strong text-fg" : "bg-surface-0/90 border-border text-fg-muted hover:text-fg"
          )}
          title="Toggle GIS and DAG topology layers"
          aria-label="Toggle GIS and DAG topology layers"
        >
          <Layers className="h-3.5 w-3.5 text-water" />
          <span>Layers</span>
          <span className="ml-0.5 text-[10px] px-1 py-0.2 rounded bg-surface-2 text-fg-subtle">
            {Object.values(layers).filter(Boolean).length}
          </span>
        </button>

        {/* Dropdown Popup */}
        {layerOpen && (
          <div className="absolute right-0 top-full mt-1.5 z-40 panel shadow-2xl border border-border bg-surface-0/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <LayerControl layers={layers} onToggle={onToggleLayer} />
          </div>
        )}
      </div>

      {/* Viewport Actions */}
      <div className="flex items-center rounded border border-border bg-surface-0/90 shadow-md backdrop-blur-md overflow-hidden">
        <button
          onClick={onZoomIn}
          className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-1 transition-colors border-r border-border/60"
          title="Zoom In (+)"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-1 transition-colors border-r border-border/60"
          title="Zoom Out (-)"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onFitNetwork}
          className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-1 transition-colors border-r border-border/60"
          title="Fit HUC12 River Network"
          aria-label="Fit network extent"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-1 transition-colors"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle basemap theme"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
