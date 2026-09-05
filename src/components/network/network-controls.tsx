"use client";
import { useState, useRef, useEffect } from "react";
import { Layers, ZoomIn, ZoomOut, Maximize2, Sun, Moon } from "lucide-react";
import { LayerControl } from "./layer-control";
import type { NetworkLayerState } from "./network-types";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

interface NetworkControlsProps {
  layers: NetworkLayerState;
  onToggleLayer: (layer: keyof NetworkLayerState) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitNetwork: () => void;
  className?: string;
}

export function NetworkControls({
  layers,
  onToggleLayer,
  onZoomIn,
  onZoomOut,
  onFitNetwork,
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
    <div className={cn("relative flex items-center gap-1.5", className)}>
      {/* Layer Toggle Button */}
      <div className="relative" ref={popupRef}>
        <button
          onClick={() => setLayerOpen((v) => !v)}
          className={cn(
            "btn btn-sm shadow-md font-mono text-xs flex items-center gap-1.5 transition-colors",
            layerOpen ? "bg-surface-2 border-border-strong text-fg" : "bg-surface-0/90 border-border text-fg-muted hover:text-fg"
          )}
          title="Toggle GIS layers"
          aria-label="Toggle GIS layers"
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
          title="Fit Bengawan Solo Network"
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
