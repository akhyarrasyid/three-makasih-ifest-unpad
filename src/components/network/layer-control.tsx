"use client";
import { Check } from "lucide-react";
import type { NetworkLayerState } from "./network-types";
import { cn } from "@/lib/utils";

interface LayerControlProps {
  layers: NetworkLayerState;
  onToggle: (layer: keyof NetworkLayerState) => void;
  className?: string;
}

const LAYER_DEFINITIONS: { key: keyof NetworkLayerState; label: string; description: string; badge?: string }[] = [
  { key: "primaryStations", label: "Connected Sub-Basins", description: "36 mainstem & tributary HUC12 nodes", badge: "36 Nodes" },
  { key: "outsideStations", label: "Peripheral Sub-Basins", description: "6 monitored peripheral sub-basin nodes", badge: "6 Nodes" },
  { key: "networkEdges", label: "Directed River Edges", description: "41 directed hydrological DAG links (id → to_id)", badge: "41 Edges" },
  { key: "rivers", label: "River Corridors", description: "Drainage backbone & active river channels", badge: "Hydrography" },
  { key: "flowDirection", label: "Flow Direction Markers", description: "Physical upstream → downstream flow vectors" },
  { key: "basin", label: "Watershed Boundary", description: "Regional hydrologic catchment envelope" },
  { key: "labels", label: "HUC12 Identifier Tags", description: "HUC-DEMO-0001 through HUC-DEMO-0042 labels" },
];

export function LayerControl({ layers, onToggle, className }: LayerControlProps) {
  return (
    <div className={cn("p-3 space-y-1.5 min-w-[280px] select-none", className)}>
      <div className="flex items-center justify-between pb-2 border-b border-border/80 font-mono">
        <span className="text-xs font-semibold text-fg uppercase tracking-wider">Topology Layers</span>
        <span className="text-[10px] text-fg-subtle">
          {Object.values(layers).filter(Boolean).length} active
        </span>
      </div>

      <div className="space-y-1 pt-1 max-h-[340px] overflow-y-auto">
        {LAYER_DEFINITIONS.map((def) => {
          const isActive = Boolean(layers[def.key]);
          return (
            <button
              key={def.key}
              onClick={() => onToggle(def.key)}
              className={cn(
                "w-full flex items-start gap-2.5 px-2 py-1.5 rounded text-left transition-colors",
                isActive ? "bg-surface-2/60 text-fg hover:bg-surface-2" : "text-fg-subtle hover:bg-surface-1"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                  isActive
                    ? "bg-water border-water text-white"
                    : "border-border-strong bg-surface-1"
                )}
              >
                {isActive && <Check className="h-2.5 w-2.5 stroke-[3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium truncate">{def.label}</span>
                  {def.badge && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-3 text-fg-subtle shrink-0">
                      {def.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-fg-subtle truncate">{def.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
