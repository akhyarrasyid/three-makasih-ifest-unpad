"use client";
import dynamic from "next/dynamic";
import { memo, type ReactNode } from "react";
import type { MapLayersState, MapLibreWatershedProps } from "./maplibre-map";
import type { NetworkEdge, StationSnapshot } from "@/types/domain";

export type MapLayers = MapLayersState;

const DynamicMapLibreWatershed = dynamic(
  () => import("./maplibre-map").then((mod) => mod.MapLibreWatershed),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-full w-full min-h-[420px] bg-surface-1 flex flex-col items-center justify-center p-6 border border-border">
        <div className="flex items-center gap-2.5 font-mono text-xs text-fg-subtle">
          <span className="h-2 w-2 rounded-full bg-water animate-pulse" />
          <span>Initializing MapLibre GL engine · Regional Sub-Basin Hydrography...</span>
        </div>
      </div>
    ),
  }
);

export interface WatershedMapProps extends Omit<MapLibreWatershedProps, "className"> {
  riverPaths?: { id: string; name: string; points: [number, number][] }[];
  mode?: "map" | "terrain" | "satellite";
  showLabels?: boolean;
  className?: string;
  overlay?: ReactNode;
}

export const WatershedMap = memo(function WatershedMap({
  nodes = [],
  edges,
  selectedId,
  onSelect,
  hoveredId,
  onHover,
  layers,
  onToggleLayer,
  highlight,
  correlations,
  title,
  subtitle,
  badge,
  showBreadcrumb = true,
  showControls = true,
  showLegend = true,
  showInspector = false,
  rightOffsetClass,
  className,
  overlay,
  interactive = true,
}: WatershedMapProps) {
  return (
    <div className={className || "relative h-full w-full min-h-[420px]"}>
      <DynamicMapLibreWatershed
        nodes={nodes}
        edges={edges}
        selectedId={selectedId}
        onSelect={onSelect}
        hoveredId={hoveredId}
        onHover={onHover}
        layers={layers}
        onToggleLayer={onToggleLayer}
        highlight={highlight}
        correlations={correlations as any}
        title={title}
        subtitle={subtitle}
        badge={badge}
        showBreadcrumb={showBreadcrumb}
        showControls={showControls}
        showLegend={showLegend}
        showInspector={showInspector}
        rightOffsetClass={rightOffsetClass}
        className="h-full w-full"
        interactive={interactive}
      />
      {overlay}
    </div>
  );
});
