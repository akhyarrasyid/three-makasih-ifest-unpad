"use client";
import { useState, useRef, useMemo, useEffect, useCallback, type MouseEvent, type WheelEvent } from "react";
import {
  STATIC_STATIONS,
  STATIC_STATION_MAP,
  STATIC_EDGES,
  STATIC_RIVERS,
  STATIC_BASEMAP,
  type StaticStation,
  type StaticEdge,
} from "@/data/network-static";
import type { NetworkFilterMode, NetworkLayerState, StationHoverInfo } from "./network-types";
import type { StationSnapshot } from "@/types/domain";
import { useUiStore } from "@/store/ui-store";
import { RISK_STYLES } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface NetworkMapProps {
  nodes?: StationSnapshot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterMode: NetworkFilterMode;
  layers: NetworkLayerState;
  ancestorIds?: string[];
  descendantIds?: string[];
  className?: string;
  onMapReady?: (controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    fitNetwork: () => void;
  }) => void;
}

const W = STATIC_BASEMAP.width;   // 1200
const H = STATIC_BASEMAP.height;  // 700

export function NetworkMap({
  nodes = [],
  selectedId,
  onSelect,
  filterMode = "ALL",
  layers,
  ancestorIds = [],
  descendantIds = [],
  className,
  onMapReady,
}: NetworkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useUiStore((s) => s.theme);

  // Pan & Zoom viewport state
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  // Floating hover card state
  const [hoveredStation, setHoveredStation] = useState<StationHoverInfo | null>(null);

  // Dark mode check
  const isDark = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    if (typeof document !== "undefined") {
      return (
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark"
      );
    }
    return true;
  }, [theme]);

  // Merge live telemetry snapshot from API with static station models
  const liveStationMap = useMemo(() => {
    const map = new Map<string, { currentTma: number; risk: string; forecast6h: number; forecast24h: number }>();
    if (nodes && nodes.length > 0) {
      nodes.forEach((n) => {
        map.set(n.station.id, {
          currentTma: n.currentTma,
          risk: n.risk,
          forecast6h: n.forecast6h,
          forecast24h: n.forecast24h,
        });
      });
    }
    return map;
  }, [nodes]);

  // Precomputed ancestor & descendant lookup sets
  const ancestorSet = useMemo(() => new Set(ancestorIds), [ancestorIds]);
  const descendantSet = useMemo(() => new Set(descendantIds), [descendantIds]);
  const isAnySelected = Boolean(selectedId);

  // Filter stations based on filterMode
  const visibleStations = useMemo(() => {
    if (filterMode === "PRIMARY") {
      return STATIC_STATIONS.filter((s) => s.primary);
    }
    if (filterMode === "OUTSIDE") {
      return STATIC_STATIONS.filter((s) => !s.primary);
    }
    // "ALL": Show all 30 stations
    return STATIC_STATIONS;
  }, [filterMode]);

  // Edges are visible in ALL and PRIMARY modes (0 edges in OUTSIDE mode)
  const visibleEdges = useMemo(() => {
    if (filterMode === "OUTSIDE" || !layers.networkEdges) {
      return [];
    }
    return STATIC_EDGES;
  }, [filterMode, layers.networkEdges]);

  // Expose camera controls via onMapReady
  useEffect(() => {
    if (onMapReady) {
      onMapReady({
        zoomIn: () => setView((v) => ({ ...v, k: Math.min(v.k * 1.25, 4.5) })),
        zoomOut: () => setView((v) => ({ ...v, k: Math.max(v.k / 1.25, 0.6) })),
        fitNetwork: () => setView({ x: 0, y: 0, k: 1 }),
      });
    }
  }, [onMapReady]);

  // Mouse pan event handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setView({
      ...view,
      x: dragStartRef.current.vx + dx,
      y: dragStartRef.current.vy + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setView((prev) => ({
      ...prev,
      k: Math.min(Math.max(prev.k * factor, 0.6), 5),
    }));
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full select-none overflow-hidden cursor-grab active:cursor-grabbing",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{
        backgroundColor: isDark ? "#090d12" : "#f8fafc",
      }}
    >
      {/* SVG Canvas Workspace */}
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.k})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 120ms ease-out",
        }}
      >
        <defs>
          {/* Subtle Precision Cartographic Grid */}
          <pattern id="carto-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.035)"}
              strokeWidth="1"
            />
          </pattern>

          {/* Upstream -> Downstream Directional Flow Marker */}
          <marker
            id="flow-arrow-dir"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path
              d="M 1 1.5 L 6.5 4 L 1 6.5 z"
              fill={isDark ? "#388bfd" : "#0284c7"}
              opacity="0.9"
            />
          </marker>

          {/* Active Flow Highlight Marker */}
          <marker
            id="flow-arrow-active"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 1 1.5 L 6.5 4 L 1 6.5 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* 1. Background Grid */}
        <rect width={W} height={H} fill="url(#carto-grid)" />

        {/* 2. Java Landmass Contour (Geographic Context) */}
        {layers.provinces && (
          <g id="layer-java-land">
            <path
              d={STATIC_BASEMAP.javaPath}
              fill={isDark ? "#10161f" : "#edf2f7"}
              stroke={isDark ? "#1e2836" : "#cbd5e1"}
              strokeWidth="1.25"
            />
          </g>
        )}

        {/* 3. Provincial Boundary (Central Java / East Java) */}
        {layers.provinces && (
          <g id="layer-provinces">
            <path
              d={STATIC_BASEMAP.provincesPath}
              fill="none"
              stroke={isDark ? "#334155" : "#94a3b8"}
              strokeWidth="1.2"
              strokeDasharray="4 4"
              strokeOpacity="0.75"
            />
          </g>
        )}

        {/* 4. Bengawan Solo Watershed Basin Catchment Outline */}
        {layers.basin && (
          <g id="layer-basin">
            <path
              d={STATIC_BASEMAP.basinPath}
              fill={isDark ? "#0284c7" : "#38bdf8"}
              fillOpacity={isDark ? 0.04 : 0.05}
              stroke={isDark ? "#0284c7" : "#0284c7"}
              strokeWidth="1.2"
              strokeDasharray="4 3"
              strokeOpacity="0.45"
            />
          </g>
        )}

        {/* 5. Natural River Hydrography (Geographic Backbone) */}
        {layers.rivers && (
          <g id="layer-rivers">
            {STATIC_RIVERS.map((r) => {
              const isMain = r.type === "mainstem";
              return (
                <path
                  key={`riv-${r.id}`}
                  d={r.path}
                  fill="none"
                  stroke={isDark ? "#1e3a5f" : "#93c5fd"}
                  strokeWidth={isMain ? 2.5 : 1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={isDark ? (isMain ? 0.75 : 0.45) : (isMain ? 0.8 : 0.5)}
                />
              );
            })}
          </g>
        )}

        {/* 6. Primary Hydrological Network Links (24 Edges Connecting 25 Primary Nodes) */}
        {visibleEdges.length > 0 && (
          <g id="layer-network-edges">
            {visibleEdges.map((edge) => {
              // Highlighting logic when a station is selected
              let isEdgeActive = false;
              let isEdgeDimmed = false;

              if (isAnySelected) {
                const isSourceSelected = edge.source === selectedId;
                const isTargetSelected = edge.target === selectedId;
                const isAncestralEdge = ancestorSet.has(edge.source) && (ancestorSet.has(edge.target) || edge.target === selectedId);
                const isDescendantEdge = descendantSet.has(edge.target) && (descendantSet.has(edge.source) || edge.source === selectedId);

                isEdgeActive = isSourceSelected || isTargetSelected || isAncestralEdge || isDescendantEdge;
                isEdgeDimmed = !isEdgeActive;
              }

              const strokeColor = isEdgeActive
                ? "#38bdf8"
                : isDark
                ? "#0284c7"
                : "#0369a1";

              const strokeOpacity = isEdgeDimmed ? 0.2 : isEdgeActive ? 0.95 : 0.75;
              const strokeWidth = isEdgeActive ? 2.8 : 1.8;

              return (
                <g key={`net-edge-${edge.id}`}>
                  {/* Subtle contrast casing */}
                  <path
                    d={edge.path}
                    fill="none"
                    stroke={isDark ? "#090d12" : "#ffffff"}
                    strokeWidth={strokeWidth + 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={isEdgeDimmed ? 0.15 : 0.85}
                  />

                  {/* Primary Link Stroke */}
                  <path
                    d={edge.path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={strokeOpacity}
                  />

                  {/* Directional Flow Arrow Marker */}
                  {layers.flowDirection && (
                    <path
                      d={edge.path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      markerEnd={isEdgeActive ? "url(#flow-arrow-active)" : "url(#flow-arrow-dir)"}
                    />
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* 7. Monitoring Stations (All 30 Stations in Default View) */}
        <g id="layer-stations">
          {visibleStations.map((st) => {
            const isSelected = selectedId === st.id;
            const isAncestor = ancestorSet.has(st.id);
            const isDescendant = descendantSet.has(st.id);

            // Opacity when a station is selected
            let opacity = 1.0;
            if (isAnySelected) {
              if (isSelected || isAncestor || isDescendant) {
                opacity = 1.0;
              } else {
                opacity = 0.35; // Dimmed but intentionally STILL VISIBLE
              }
            }

            // Real-time telemetry overrides if available
            const live = liveStationMap.get(st.id);
            const risk = live?.risk ?? st.risk;
            const tma = live?.currentTma ?? st.currentTma;
            const riskColor = RISK_STYLES[risk as keyof typeof RISK_STYLES]?.hex ?? "#22c55e";

            return (
              <g
                key={`stn-${st.id}`}
                className="cursor-pointer"
                style={{ opacity, transition: "opacity 150ms ease" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(st.id);
                }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setHoveredStation({
                      id: st.id,
                      name: st.name,
                      category: st.category,
                      risk,
                      tma,
                      river: st.river,
                      primary: st.primary,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredStation(null)}
              >
                {/* PRIMARY STATIONS (25 connected stations) */}
                {st.primary ? (
                  <>
                    {/* Selected Target Pulse Ring */}
                    {isSelected && (
                      <>
                        <circle
                          cx={st.x}
                          cy={st.y}
                          r="13"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.8"
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx={st.x}
                          cy={st.y}
                          r="17"
                          fill="#38bdf8"
                          fillOpacity="0.12"
                        />
                      </>
                    )}

                    {/* Upstream / Downstream Interaction Halo */}
                    {(isAncestor || isDescendant) && !isSelected && (
                      <circle
                        cx={st.x}
                        cy={st.y}
                        r="10"
                        fill="none"
                        stroke={isAncestor ? "#38bdf8" : "#34d399"}
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        strokeOpacity="0.8"
                      />
                    )}

                    {/* Compact Infrastructure Solid Node */}
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r={isSelected ? 6.5 : 5.2}
                      fill={riskColor}
                      stroke={isDark ? "#090d12" : "#ffffff"}
                      strokeWidth="2.0"
                    />

                    {/* Concentric Center Dot */}
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="1.8"
                      fill={isDark ? "#090d12" : "#ffffff"}
                    />
                  </>
                ) : (
                  /* OUTSIDE / SECONDARY STATIONS (5 stations - Monitored, Intentionally Unconnected) */
                  <>
                    {isSelected && (
                      <circle
                        cx={st.x}
                        cy={st.y}
                        r="12"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Distinct Secondary Outer Ring */}
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="5.5"
                      fill={isDark ? "#1e293b" : "#e2e8f0"}
                      stroke={isSelected ? "#94a3b8" : isDark ? "#64748b" : "#94a3b8"}
                      strokeWidth="1.5"
                      strokeDasharray="2.5 1.5"
                    />

                    {/* Center Core */}
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="2.2"
                      fill={riskColor}
                      opacity={isSelected ? 1.0 : 0.75}
                    />
                  </>
                )}

                {/* Station Code Label */}
                {layers.labels && (
                  <text
                    x={st.x}
                    y={st.y + (st.primary ? 14 : 13)}
                    textAnchor="middle"
                    className={cn(
                      "font-mono text-[9px] pointer-events-none select-none tracking-tight",
                      isSelected
                        ? "font-semibold fill-water"
                        : isAncestor
                        ? "font-medium fill-cyan-400"
                        : isDescendant
                        ? "font-medium fill-emerald-400"
                        : st.primary
                        ? isDark
                          ? "fill-slate-300"
                          : "fill-slate-700"
                        : "fill-slate-500"
                    )}
                  >
                    {st.id}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Hover Card Tooltip */}
      {hoveredStation && (
        <div
          className="pointer-events-none absolute z-30 panel px-3 py-2 shadow-xl bg-surface-0/95 border border-border text-xs min-w-[200px] -translate-x-1/2 -translate-y-full -mt-3"
          style={{ left: hoveredStation.x, top: hoveredStation.y }}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/70">
            <span className="font-semibold text-fg">{hoveredStation.name}</span>
            <span className="font-mono text-[10px] text-fg-subtle">{hoveredStation.id}</span>
          </div>

          <div className="mt-1.5 space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between text-fg-subtle">
              <span>Network Role:</span>
              <span className={hoveredStation.primary ? "text-water font-medium" : "text-fg-subtle"}>
                {hoveredStation.primary ? "Primary (Connected)" : "Outside Primary Network"}
              </span>
            </div>

            <div className="flex items-center justify-between text-fg-subtle">
              <span>Water Level (TMA):</span>
              <span className="text-fg font-medium">{hoveredStation.tma.toFixed(2)} m</span>
            </div>

            <div className="flex items-center justify-between text-fg-subtle">
              <span>River Reach:</span>
              <span className="text-fg truncate max-w-[110px]">{hoveredStation.river}</span>
            </div>

            <div className="flex items-center justify-between pt-0.5 border-t border-border/50 text-fg-subtle">
              <span>Status:</span>
              <span
                className="font-medium"
                style={{ color: RISK_STYLES[hoveredStation.risk as keyof typeof RISK_STYLES]?.hex }}
              >
                {hoveredStation.risk}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
