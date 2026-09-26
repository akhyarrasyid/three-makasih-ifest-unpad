"use client";
import { useState, useRef, useMemo, useEffect, useCallback, type MouseEvent, type WheelEvent } from "react";
import {
  STATIC_STATIONS,
  STATIC_STATION_MAP,
  STATIC_EDGES,
  STATIC_RIVERS,
  STATIC_BASEMAP,
  type StaticBasinNode,
  type StaticEdge,
} from "@/data/network-static";
import type { NetworkFilterMode, NetworkLayerState, StationHoverInfo, NetworkOverlayMode } from "./network-types";
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
  const dragStartRef = useRef({ x: 0, y: 0, vx: view.x, vy: view.y });

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

  // Live telemetry map indexed by HUC ID
  const liveMap = useMemo(() => {
    const map = new Map<string, StationSnapshot>();
    if (nodes && nodes.length > 0) {
      nodes.forEach((n) => map.set(n.station.id, n));
    }
    return map;
  }, [nodes]);

  // Precomputed ancestor & descendant lookup sets
  const ancestorSet = useMemo(() => new Set(ancestorIds), [ancestorIds]);
  const descendantSet = useMemo(() => new Set(descendantIds), [descendantIds]);
  const isAnySelected = Boolean(selectedId);

  // Filter basins based on filterMode
  const visibleStations = useMemo(() => {
    if (filterMode === "HEADWATERS") {
      return STATIC_STATIONS.filter((s) => s.category === "HEADWATER");
    }
    if (filterMode === "MAINSTEM") {
      return STATIC_STATIONS.filter((s) => s.category === "MAINSTEM");
    }
    if (filterMode === "COLD_START") {
      return STATIC_STATIONS.filter((s) => s.coldStart);
    }
    return STATIC_STATIONS;
  }, [filterMode]);

  // Edges are visible when networkEdges layer is on
  const visibleEdges = useMemo(() => {
    if (!layers.networkEdges) return [];
    return STATIC_EDGES;
  }, [layers.networkEdges]);

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

  // Mouse pan handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
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

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setView((prev) => ({
      ...prev,
      k: Math.min(Math.max(prev.k * factor, 0.6), 5),
    }));
  }, []);

  // Compute node fill color depending on overlay mode
  const getNodeColor = useCallback(
    (st: StaticBasinNode, snap?: StationSnapshot) => {
      const overlay = layers.overlay ?? "RISK";
      const risk = snap?.risk ?? st.risk;
      const supplyRatio = snap ? snap.currentSupply / Math.max(1, snap.climatology) : st.supplyRatio;
      const totalWithdrawal = snap?.totalWithdrawal ?? st.totalWithdrawal;

      if (overlay === "RISK") {
        return RISK_STYLES[risk]?.hex ?? "#22c55e";
      }
      if (overlay === "SUPPLY") {
        if (supplyRatio < 0.6) return "#f59e0b"; // deficit
        if (supplyRatio < 0.85) return "#38bdf8"; // moderate
        return "#0284c7"; // robust supply
      }
      if (overlay === "WITHDRAWAL") {
        if (totalWithdrawal > 45) return "#ef4444"; // extreme withdrawal
        if (totalWithdrawal > 25) return "#f97316"; // elevated
        return "#10b981"; // sustainable
      }
      if (overlay === "GNN_INFLUENCE") {
        return "#a855f7"; // learned GNN propagation
      }
      return "#38bdf8";
    },
    [layers.overlay]
  );

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
          {/* Precision Cartographic Grid */}
          <pattern id="carto-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.035)"}
              strokeWidth="1"
            />
          </pattern>

          {/* Directed DAG Flow Arrowhead (Physical id → to_id) */}
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

        {/* 2. Watershed Basin Catchment Outline */}
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

        {/* 3. Natural River Hydrography (Drainage Corridors) */}
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

        {/* 4. Directed DAG Edges (41 Edges Connecting HUC12 Sub-Basins) */}
        {visibleEdges.length > 0 && (
          <g id="layer-network-edges">
            {visibleEdges.map((edge) => {
              let isEdgeActive = false;
              let isEdgeDimmed = false;

              if (isAnySelected) {
                const isSourceSelected = edge.source === selectedId;
                const isTargetSelected = edge.target === selectedId;
                const isAncestralEdge =
                  ancestorSet.has(edge.source) && (ancestorSet.has(edge.target) || edge.target === selectedId);
                const isDescendantEdge =
                  descendantSet.has(edge.target) && (descendantSet.has(edge.source) || edge.source === selectedId);

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

        {/* 5. Sub-Basin Nodes (42 Representative HUC12 Sub-Basins) */}
        <g id="layer-stations">
          {visibleStations.map((st) => {
            const isSelected = selectedId === st.id;
            const isAncestor = ancestorSet.has(st.id);
            const isDescendant = descendantSet.has(st.id);

            let opacity = 1.0;
            if (isAnySelected) {
              if (isSelected || isAncestor || isDescendant) {
                opacity = 1.0;
              } else {
                opacity = 0.35;
              }
            }

            const snap = liveMap.get(st.id);
            const risk = snap?.risk ?? st.risk;
            const riskScore = snap?.riskScore ?? st.riskScore;
            const supply = snap?.currentSupply ?? st.currentSupply;
            const withdrawal = snap?.totalWithdrawal ?? st.totalWithdrawal;
            const nodeFill = getNodeColor(st, snap);

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
                      riskScore,
                      supply,
                      climatologyAnomalySigma: snap?.climatologyAnomalySigma ?? st.climatologyAnomalySigma,
                      withdrawal,
                      waterLimitationProxy: snap?.waterLimitationProxy ?? st.waterLimitationProxy,
                      graphDepth: st.graphDepth,
                      coldStart: st.coldStart,
                      river: st.river,
                      primary: st.primary,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredStation(null)}
              >
                {/* Selected Node Halo */}
                {isSelected && (
                  <>
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="14"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="18"
                      fill="#38bdf8"
                      fillOpacity="0.14"
                    />
                  </>
                )}

                {/* Upstream Ancestor Halo (Cyan) / Downstream Descendant Halo (Emerald) */}
                {(isAncestor || isDescendant) && !isSelected && (
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="11"
                    fill="none"
                    stroke={isAncestor ? "#38bdf8" : "#34d399"}
                    strokeWidth="1.6"
                    strokeDasharray="2 2"
                    strokeOpacity="0.85"
                  />
                )}

                {/* Sub-Basin Node Circle */}
                <circle
                  cx={st.x}
                  cy={st.y}
                  r={isSelected ? 7.0 : st.coldStart ? 5.8 : 5.2}
                  fill={nodeFill}
                  stroke={isDark ? "#090d12" : "#ffffff"}
                  strokeWidth="2.0"
                />

                {/* Cold Start Outer Indicator Ring */}
                {st.coldStart && !isSelected && (
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="7.5"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Concentric Center Dot */}
                <circle
                  cx={st.x}
                  cy={st.y}
                  r="1.8"
                  fill={isDark ? "#090d12" : "#ffffff"}
                />

                {/* Sub-Basin Identifier Tag */}
                {layers.labels && (
                  <text
                    x={st.x}
                    y={st.y + 14}
                    textAnchor="middle"
                    className={cn(
                      "font-mono text-[9px] pointer-events-none select-none tracking-tight",
                      isSelected
                        ? "font-semibold fill-water"
                        : isAncestor
                        ? "font-medium fill-cyan-400"
                        : isDescendant
                        ? "font-medium fill-emerald-400"
                        : st.coldStart
                        ? "fill-amber-400"
                        : isDark
                        ? "fill-slate-300"
                        : "fill-slate-700"
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
          className="pointer-events-none absolute z-30 panel px-3 py-2 shadow-xl bg-surface-0/95 border border-border text-xs min-w-[220px] -translate-x-1/2 -translate-y-full -mt-3"
          style={{ left: hoveredStation.x, top: hoveredStation.y }}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/70">
            <span className="font-semibold text-fg truncate">{hoveredStation.name}</span>
            <span className="font-mono text-[10px] text-fg-subtle">{hoveredStation.id}</span>
          </div>

          <div className="mt-1.5 space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between text-fg-subtle">
              <span>Next-Month Risk:</span>
              <span
                className="font-medium font-mono"
                style={{ color: RISK_STYLES[hoveredStation.risk as keyof typeof RISK_STYLES]?.hex }}
              >
                {(hoveredStation.riskScore * 100).toFixed(1)}% ({hoveredStation.risk})
              </span>
            </div>

            <div className="flex items-center justify-between text-fg-subtle">
              <span>Monthly Supply:</span>
              <span className="text-fg font-medium">{hoveredStation.supply.toFixed(1)} m³/s</span>
            </div>

            <div className="flex items-center justify-between text-fg-subtle">
              <span>Withdrawal:</span>
              <span className="text-fg font-medium">{hoveredStation.withdrawal.toFixed(1)} m³/s</span>
            </div>

            <div className="flex items-center justify-between text-fg-subtle">
              <span>Climatology Anomaly:</span>
              <span className={cn(
                "font-medium",
                hoveredStation.climatologyAnomalySigma < 0 ? "text-amber-400" : "text-emerald-400"
              )}>
                {hoveredStation.climatologyAnomalySigma >= 0 ? "+" : ""}{hoveredStation.climatologyAnomalySigma.toFixed(2)}σ
              </span>
            </div>

            <div className="flex items-center justify-between pt-0.5 border-t border-border/50 text-fg-subtle">
              <span>DAG Depth:</span>
              <span className="text-cyan-400 font-medium">Level {hoveredStation.graphDepth}</span>
            </div>

            {hoveredStation.coldStart && (
              <div className="text-[10px] text-amber-400 pt-0.5">
                ● Cold-Start Spatial Generalization
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
