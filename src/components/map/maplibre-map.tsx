"use client";
import { useEffect, useRef, useState, useMemo, useCallback, type ReactNode } from "react";
import * as maplibregl from "maplibre-gl";
import {
  Layers, ZoomIn, ZoomOut, RotateCcw, X, ArrowRight,
  ShieldCheck, MapPin
} from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { RISK_STYLES, RiskBadge, StationBadge, StatusBadge, KV } from "@/components/ui/primitives";
import { STATION_MAP, STRATEGY_LABEL } from "@/mock/stations";
import { cn } from "@/lib/utils";
import type { NetworkEdge, StationSnapshot, RiskLevel } from "@/types/domain";

import {
  JAVA_GEOJSON,
  PROVINCES_GEOJSON,
  BASIN_GEOJSON,
  RIVERS_GEOJSON,
  NETWORK_EDGES_GEOJSON,
} from "@/geodata";

// Geographic Extents
const BOUNDS_BGS: maplibregl.LngLatBoundsLike = [[110.45, -8.28], [112.75, -6.80]];
const CENTER_BGS: [number, number] = [111.60, -7.42];
const CENTER_JAVA: [number, number] = [110.50, -7.50];
const CENTER_IDN: [number, number] = [117.00, -2.50];

export interface MapLayersState {
  rivers: boolean;
  stations: boolean;
  provinces: boolean;
  basin: boolean;
  flow: boolean;
  correlation: boolean;
  risk: boolean;
  rainfall?: boolean;
}

export const DEFAULT_LAYERS: MapLayersState = {
  rivers: true,
  stations: true,
  provinces: true,
  basin: true,
  flow: true,
  correlation: true,
  risk: true,
  rainfall: false,
};

export interface MapLibreWatershedProps {
  nodes?: StationSnapshot[];
  edges?: NetworkEdge[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  layers?: Partial<MapLayersState>;
  onToggleLayer?: (layer: keyof MapLayersState) => void;
  correlations?: { stationId: string; correlation: number; riverDistanceKm?: number }[];
  highlight?: { upstream: string[]; downstream: string[] };
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  showBreadcrumb?: boolean;
  showControls?: boolean;
  showLegend?: boolean;
  showInspector?: boolean;
  rightOffsetClass?: string;
  className?: string;
  interactive?: boolean;
}

export function MapLibreWatershed({
  nodes = [],
  edges = [],
  selectedId,
  onSelect,
  hoveredId,
  onHover,
  layers: externalLayers,
  onToggleLayer,
  correlations = [],
  highlight,
  title,
  subtitle,
  badge,
  showBreadcrumb = true,
  showControls = true,
  showLegend = true,
  showInspector = false,
  rightOffsetClass,
  className,
}: MapLibreWatershedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const theme = useUiStore((s) => s.theme);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // Track map viewport across re-mounts / theme shifts
  const lastCenterRef = useRef<[number, number]>(CENTER_BGS);
  const lastZoomRef = useRef<number>(8.4);

  const [currentZoom, setCurrentZoom] = useState<number>(8.4);
  const [activeLevel, setActiveLevel] = useState<"IDN" | "JAVA" | "BGS" | "STATION">("BGS");
  const [networkFilter, setNetworkFilter] = useState<"ALL" | "UPSTREAM" | "DOWNSTREAM" | "CONNECTED">("ALL");
  const [layersOpen, setLayersOpen] = useState(false);
  const [internalLayers, setInternalLayers] = useState<MapLayersState>(DEFAULT_LAYERS);
  const [offlineFallback, setOfflineFallback] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const activeLayers = useMemo(() => ({
    ...internalLayers,
    ...externalLayers,
  }), [internalLayers, externalLayers]);

  const toggleLayer = useCallback((key: keyof MapLayersState) => {
    if (onToggleLayer) {
      onToggleLayer(key);
    } else {
      setInternalLayers((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  }, [onToggleLayer]);

  // Determine current active theme (dark / light)
  const isDark = useMemo(() => {
    if (theme === "system") {
      return typeof window !== "undefined" ? !window.matchMedia("(prefers-color-scheme: light)").matches : true;
    }
    return theme === "dark";
  }, [theme]);

  // Active selected station snapshot
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.station.id === selectedId) ?? null;
  }, [nodes, selectedId]);

  // 1. Initialize MapLibre GL instance
  useEffect(() => {
    if (!containerRef.current) return;

    const initialStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "carto-raster": {
          type: "raster",
          tiles: [
            isDark
              ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
              : "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
          ],
          tileSize: 256,
          attribution: "&copy; CartoDB &copy; OpenStreetMap",
        },
        "java-source": {
          type: "geojson",
          data: JAVA_GEOJSON,
        },
        "provinces-source": {
          type: "geojson",
          data: PROVINCES_GEOJSON,
        },
        "basin-source": {
          type: "geojson",
          data: BASIN_GEOJSON,
        },
        "rivers-source": {
          type: "geojson",
          data: RIVERS_GEOJSON,
        },
        "network-edges-source": {
          type: "geojson",
          data: NETWORK_EDGES_GEOJSON,
        },
        "correlation-source": {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        },
      },
      layers: [
        {
          id: "ocean-bg",
          type: "background",
          paint: {
            "background-color": isDark ? "#06090e" : "#e2e8f0",
          },
        },
        {
          id: "carto-raster-layer",
          type: "raster",
          source: "carto-raster",
          paint: {
            "raster-opacity": isDark ? 0.45 : 0.55,
            "raster-saturation": -0.3,
            "raster-contrast": 0.1,
          },
        },
        {
          id: "java-fill",
          type: "fill",
          source: "java-source",
          paint: {
            "fill-color": isDark ? "#0a1019" : "#ffffff",
            "fill-opacity": 0.4,
          },
        },
        {
          id: "java-coastline",
          type: "line",
          source: "java-source",
          paint: {
            "line-color": isDark ? "#1e293b" : "#cbd5e1",
            "line-width": 1.25,
            "line-opacity": 0.8,
          },
        },
        {
          id: "provinces-line",
          type: "line",
          source: "provinces-source",
          paint: {
            "line-color": isDark ? "#475569" : "#94a3b8",
            "line-width": 1,
            "line-dasharray": [4, 4],
            "line-opacity": 0.55,
          },
        },
        {
          id: "basin-fill",
          type: "fill",
          source: "basin-source",
          paint: {
            "fill-color": isDark ? "#38bdf8" : "#0284c7",
            "fill-opacity": isDark ? 0.035 : 0.045,
          },
        },
        {
          id: "basin-line",
          type: "line",
          source: "basin-source",
          paint: {
            "line-color": isDark ? "#38bdf8" : "#0284c7",
            "line-width": 1.25,
            "line-dasharray": [3, 2],
            "line-opacity": isDark ? 0.4 : 0.5,
          },
        },
        {
          id: "rivers-casing",
          type: "line",
          source: "rivers-source",
          paint: {
            "line-color": isDark ? "#020617" : "#f1f5f9",
            "line-width": ["interpolate", ["linear"], ["get", "stream_order"], 2, 1.8, 3, 2.4, 4, 3.4, 5, 4.4],
            "line-opacity": 0.5,
          },
        },
        {
          id: "rivers-line",
          type: "line",
          source: "rivers-source",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "stream_order"], 5],
              isDark ? "#38bdf8" : "#0284c7",
              ["==", ["get", "stream_order"], 4],
              isDark ? "#60a5fa" : "#0369a1",
              isDark ? "#93c5fd" : "#38bdf8",
            ],
            "line-width": ["interpolate", ["linear"], ["get", "stream_order"], 2, 1.0, 3, 1.6, 4, 2.2, 5, 3.0],
            "line-opacity": isDark ? 0.75 : 0.85,
          },
        },
        {
          id: "network-edges-line",
          type: "line",
          source: "network-edges-source",
          paint: {
            "line-color": isDark ? "#38bdf8" : "#0284c7",
            "line-width": 2.0,
            "line-opacity": 0.7,
          },
        },
        {
          id: "rivers-flow",
          type: "line",
          source: "rivers-source",
          paint: {
            "line-color": isDark ? "#ffffff" : "#0f172a",
            "line-width": 1.2,
            "line-dasharray": [1.5, 4],
            "line-opacity": 0.45,
          },
        },
        {
          id: "correlation-line",
          type: "line",
          source: "correlation-source",
          paint: {
            "line-color": isDark ? "#c084fc" : "#9333ea",
            "line-width": ["interpolate", ["linear"], ["get", "correlation"], 0.2, 1.2, 0.9, 3.2],
            "line-dasharray": [2, 2],
            "line-opacity": 0.8,
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: lastCenterRef.current,
      zoom: lastZoomRef.current,
      minZoom: 3.5,
      maxZoom: 16,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      setMapLoaded(true);
    });

    map.on("error", (e: any) => {
      if (e.error?.message?.includes("style") || e.error?.message?.includes("tile")) {
        setOfflineFallback(true);
      }
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      lastCenterRef.current = [c.lng, c.lat];
    });

    map.on("zoom", () => {
      const z = map.getZoom();
      lastZoomRef.current = z;
      setCurrentZoom(z);
      if (z < 5.5) setActiveLevel("IDN");
      else if (z < 7.8) setActiveLevel("JAVA");
      else if (selectedId && z > 10.5) setActiveLevel("STATION");
      else setActiveLevel("BGS");
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isDark]);



  // 3. Update layer visibility based on layer state
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer("rivers-line")) {
      map.setLayoutProperty("rivers-line", "visibility", activeLayers.rivers ? "visible" : "none");
      map.setLayoutProperty("rivers-casing", "visibility", activeLayers.rivers ? "visible" : "none");
    }
    if (map.getLayer("rivers-flow")) {
      map.setLayoutProperty("rivers-flow", "visibility", activeLayers.rivers && activeLayers.flow ? "visible" : "none");
    }
    if (map.getLayer("basin-fill")) {
      map.setLayoutProperty("basin-fill", "visibility", activeLayers.basin ? "visible" : "none");
      map.setLayoutProperty("basin-line", "visibility", activeLayers.basin ? "visible" : "none");
    }
    if (map.getLayer("provinces-line")) {
      map.setLayoutProperty("provinces-line", "visibility", activeLayers.provinces ? "visible" : "none");
    }
    if (map.getLayer("correlation-line")) {
      map.setLayoutProperty("correlation-line", "visibility", activeLayers.correlation ? "visible" : "none");
    }
  }, [mapLoaded, activeLayers]);

  // 4. Update Dynamic Correlation GeoJSON Data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("correlation-source") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (!activeLayers.correlation || !selectedNode || !correlations.length) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const features = correlations
      .filter((c) => STATION_MAP[c.stationId])
      .map((c) => {
        const target = STATION_MAP[c.stationId];
        return {
          type: "Feature" as const,
          properties: {
            stationId: c.stationId,
            correlation: c.correlation,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [selectedNode.station.longitude, selectedNode.station.latitude],
              [target.longitude, target.latitude],
            ],
          },
        };
      });

    source.setData({ type: "FeatureCollection", features });
  }, [mapLoaded, selectedNode, correlations, activeLayers.correlation]);

  // 5. Geographically Anchored Station Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    if (!activeLayers.stations || !nodes.length) return;

    const upstreamIds = new Set(highlight?.upstream ?? []);
    const downstreamIds = new Set(highlight?.downstream ?? []);

    nodes.forEach((node) => {
      const isSelected = node.station.id === selectedId;
      const isUpstream = upstreamIds.has(node.station.id);
      const isDownstream = downstreamIds.has(node.station.id);
      const isHovered = node.station.id === hoveredId;

      let isDimmed = false;
      if (selectedId && !isSelected) {
        if (networkFilter === "UPSTREAM") isDimmed = !isUpstream;
        else if (networkFilter === "DOWNSTREAM") isDimmed = !isDownstream;
        else if (networkFilter === "CONNECTED") isDimmed = !isUpstream && !isDownstream;
      }

      // Create custom DOM element for precise marker
      const el = document.createElement("div");
      el.className = "anchor-station-marker";
      el.style.cursor = "pointer";
      el.style.transition = "transform 140ms ease, opacity 140ms ease";
      el.style.opacity = isDimmed ? "0.2" : "1";

      const riskColor = RISK_STYLES[node.risk].hex;

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          ${isSelected ? `<div class="absolute -inset-1.5 rounded-full border-2 border-[${riskColor}] animate-ping opacity-75"></div>` : ""}
          <div class="h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#090d12] shadow-md flex items-center justify-center" style="background-color: ${riskColor}; transform: ${isSelected || isHovered ? "scale(1.35)" : "scale(1)"};">
            ${isSelected ? `<div class="h-1 w-1 rounded-full bg-white"></div>` : ""}
          </div>
          ${(isSelected || isHovered || currentZoom >= 10.2 || (currentZoom >= 8.5 && (node.risk === "CRITICAL" || node.risk === "HIGH"))) ? `
            <div class="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none z-10 px-1.5 py-0.5 rounded text-[10px] font-mono shadow-md border ${isSelected ? "bg-surface-0 border-water text-fg font-semibold" : "bg-surface-1/95 border-border text-fg-muted"}">
              ${node.station.name} <span class="text-fg-subtle">(${node.currentTma.toFixed(2)}m)</span>
            </div>
          ` : ""}
        </div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect?.(node.station.id);
      });

      el.addEventListener("mouseenter", () => {
        onHover?.(node.station.id);
      });

      el.addEventListener("mouseleave", () => {
        onHover?.(null);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([node.station.longitude, node.station.latitude])
        .addTo(map);

      markersRef.current.set(node.station.id, marker);
    });
  }, [nodes, selectedId, hoveredId, highlight, activeLayers.stations, networkFilter, currentZoom, onSelect, onHover]);

  // 6. Camera Level Navigation Handlers
  const navigateToLevel = (level: "IDN" | "JAVA" | "BGS" | "STATION") => {
    const map = mapRef.current;
    if (!map) return;

    setActiveLevel(level);

    if (level === "IDN") {
      map.flyTo({ center: CENTER_IDN, zoom: 4.5, duration: 1200 });
    } else if (level === "JAVA") {
      map.flyTo({ center: CENTER_JAVA, zoom: 6.8, duration: 1000 });
    } else if (level === "BGS") {
      map.fitBounds(BOUNDS_BGS, { padding: 40, duration: 1000 });
    } else if (level === "STATION" && selectedNode) {
      map.flyTo({
        center: [selectedNode.station.longitude, selectedNode.station.latitude],
        zoom: 11.2,
        duration: 900,
      });
    }
  };

  // Fly to selected station when selectedId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedNode) return;

    map.flyTo({
      center: [selectedNode.station.longitude, selectedNode.station.latitude],
      zoom: Math.max(map.getZoom(), 9.8),
      duration: 800,
    });
  }, [selectedNode]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-bg", className)}>
      {/* MapLibre Canvas Container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Offline/Local GeoJSON Fallback Notice if external vector tiles are blocked */}
      {offlineFallback && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 panel px-3 py-1 text-xs font-mono text-warn flex items-center gap-2 border-warn/40 bg-surface-1/90 shadow-lg">
          <ShieldCheck className="h-3.5 w-3.5 text-warn" />
          <span>Vector basemap unavailable. Operating in local GeoJSON GIS mode.</span>
        </div>
      )}

      {/* Top-Left: Multi-Level GIS Geographic Breadcrumb & Title Panel */}
      {(title || showBreadcrumb) && (
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-2 max-w-[min(480px,90vw)]">
          <div className="panel px-3 py-2 shadow-xl backdrop-blur-md">
            {title && (
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h1 className="t-h3">{title}</h1>
                  {badge}
                </div>
                {subtitle && <p className="t-caption mt-0.5">{subtitle}</p>}
              </div>
            )}

            {showBreadcrumb && (
              <div className={cn("flex items-center gap-1.5 font-mono text-xs flex-wrap", title && "pt-2 border-t border-border")}>
                <button
                  onClick={() => navigateToLevel("IDN")}
                  className={cn("px-1.5 py-0.5 rounded transition-colors hover:text-water", activeLevel === "IDN" ? "bg-surface-2 text-water font-semibold" : "text-fg-subtle")}
                >
                  Indonesia
                </button>
                <span className="text-fg-faint">/</span>
                <button
                  onClick={() => navigateToLevel("JAVA")}
                  className={cn("px-1.5 py-0.5 rounded transition-colors hover:text-water", activeLevel === "JAVA" ? "bg-surface-2 text-water font-semibold" : "text-fg-subtle")}
                >
                  Java
                </button>
                <span className="text-fg-faint">/</span>
                <button
                  onClick={() => navigateToLevel("BGS")}
                  className={cn("px-1.5 py-0.5 rounded transition-colors hover:text-water", activeLevel === "BGS" ? "bg-surface-2 text-water font-semibold" : "text-fg-subtle")}
                >
                  Bengawan Solo
                </button>
                {selectedNode && (
                  <>
                    <span className="text-fg-faint">/</span>
                    <button
                      onClick={() => navigateToLevel("STATION")}
                      className="px-1.5 py-0.5 rounded bg-water-dim text-water font-semibold"
                    >
                      {selectedNode.station.id}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Network Context Mode (Upstream / Downstream / Connected) */}
          {selectedId && (
            <div className="panel p-1.5 shadow-xl backdrop-blur-md flex items-center gap-1 font-mono text-xs fade-up">
              <span className="text-[10px] text-fg-subtle px-1.5 uppercase tracking-wider">Network:</span>
              {(["ALL", "UPSTREAM", "DOWNSTREAM", "CONNECTED"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setNetworkFilter(m)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] transition-colors",
                    networkFilter === m
                      ? "bg-water text-white font-medium"
                      : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  {m === "ALL" ? "All" : m === "UPSTREAM" ? "Upstream" : m === "DOWNSTREAM" ? "Downstream" : "Connected"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top-Right: GIS Layer Controls & Zoom Actions */}
      {showControls && (
        <div className={cn("absolute top-3 z-20 flex flex-col items-end gap-2 transition-all duration-200", rightOffsetClass || "right-3")}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLayersOpen((o) => !o)}
              className={cn("btn btn-sm shadow-xl gap-1 font-mono text-xs backdrop-blur-md", layersOpen ? "border-water text-water" : "")}
              aria-expanded={layersOpen}
              title="Geographic Layers"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Layers</span>
            </button>

            <button
              onClick={() => navigateToLevel("BGS")}
              className="btn btn-sm !h-7 !w-7 !p-0 shadow-xl backdrop-blur-md"
              title="Fit to Watershed Bounds"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <div className="flex rounded border border-border bg-surface-1 shadow-xl overflow-hidden backdrop-blur-md">
              <button
                onClick={() => mapRef.current?.zoomIn()}
                className="px-2 py-1 hover:bg-surface-2 text-fg-muted hover:text-fg border-r border-border"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => mapRef.current?.zoomOut()}
                className="px-2 py-1 hover:bg-surface-2 text-fg-muted hover:text-fg"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Layer Controls Dropdown */}
          {layersOpen && (
            <div className="panel w-56 p-2 shadow-2xl fade-up font-mono text-xs backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-wider text-fg-faint px-2 py-1">Geographic Layers</div>
              <div className="space-y-1 mt-1">
                {[
                  { id: "rivers", label: "River network" },
                  { id: "stations", label: "Stations (30)" },
                  { id: "basin", label: "Basin boundary" },
                  { id: "provinces", label: "Provinces" },
                  { id: "flow", label: "Flow direction" },
                  { id: "correlation", label: "Residual correlation" },
                  { id: "risk", label: "Risk classification" },
                ].map(({ id, label }) => {
                  const key = id as keyof MapLayersState;
                  const checked = !!activeLayers[key];
                  return (
                    <button
                      key={id}
                      onClick={() => toggleLayer(key)}
                      className="flex w-full items-center justify-between px-2 py-1.5 rounded hover:bg-surface-2 text-left"
                    >
                      <span className={checked ? "text-fg" : "text-fg-subtle"}>{label}</span>
                      <span className={cn("h-3.5 w-3.5 rounded-sm border flex items-center justify-center text-[9px]", checked ? "bg-water border-water text-white" : "border-border text-transparent")}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom-Left: Semantic Compact Legend */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-20 panel px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center gap-3 text-[11px] font-mono">
          <span className="text-fg-subtle uppercase text-[10px]">Risk:</span>
          {(["LOW", "MODERATE", "HIGH", "CRITICAL"] as RiskLevel[]).map((r) => (
            <span key={r} className="inline-flex items-center gap-1.5 text-fg-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_STYLES[r].hex }} />
              <span className="capitalize">{r.toLowerCase()}</span>
            </span>
          ))}
        </div>
      )}

      {/* Bottom-Right: Demonstration Geography Disclaimer */}
      <div className={cn("absolute bottom-3 z-10 pointer-events-none text-[10px] font-mono text-fg-subtle bg-surface-0/80 px-2 py-0.5 rounded border border-border backdrop-blur-sm transition-all duration-200", rightOffsetClass ? "right-3 lg:right-[414px]" : "right-3")}>
        HydroSHEDS river geometry · WGS84
      </div>

      {/* Optional Standalone Slide-over Inspector (Used when caller does not provide own inspector) */}
      {showInspector && selectedNode && (
        <aside
          className="absolute right-0 top-0 bottom-0 z-30 w-full max-w-[380px] bg-surface-0 border-l border-border shadow-2xl flex flex-col slide-in-right"
          aria-label="Station Geospatial Inspector"
        >
          <div className="flex items-start justify-between border-b border-border px-4 py-3 bg-surface-1">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="t-h2">{selectedNode.station.name}</h2>
                <span className="mono text-fg-subtle">{selectedNode.station.id}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <StationBadge category={selectedNode.station.category} />
                <RiskBadge risk={selectedNode.risk} />
                <StatusBadge status={selectedNode.status} />
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm !h-7 !w-7 !p-0"
              onClick={() => onSelect?.("")}
              aria-label="Close station inspector"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded border border-border bg-surface-1 p-2.5 font-mono text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-fg-subtle">
                <MapPin className="h-3.5 w-3.5 text-water" /> Geographic Anchor
              </span>
              <span className="text-fg">
                {selectedNode.station.latitude.toFixed(3)}° S, {selectedNode.station.longitude.toFixed(3)}° E
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded border border-border bg-surface-1 p-2">
                <div className="t-label">Current TMA</div>
                <div className="mono text-base mt-0.5">{selectedNode.currentTma.toFixed(2)} m</div>
              </div>
              <div className="rounded border border-border bg-surface-1 p-2">
                <div className="t-label">+6h Forecast</div>
                <div className="mono text-base mt-0.5 text-water">{selectedNode.forecast6h.toFixed(2)} m</div>
              </div>
              <div className="rounded border border-border bg-surface-1 p-2">
                <div className="t-label">+24h Forecast</div>
                <div className="mono text-base mt-0.5 text-water">{selectedNode.forecast24h.toFixed(2)} m</div>
              </div>
            </div>

            <div>
              <div className="t-label mb-1.5">River Reach & Catchment</div>
              <KV k="River Segment" v={selectedNode.station.river} />
              <KV k="Elevation" v={`${selectedNode.station.elevationM} m asl`} mono />
              <KV k="Catchment Area" v={`${selectedNode.station.catchmentKm2.toLocaleString()} km²`} mono />
              <KV k="Alert Threshold" v={`${selectedNode.station.thresholds.alert.toFixed(2)} m`} mono />
            </div>

            <div>
              <div className="t-label mb-1">Model & Routing</div>
              <KV k="Segment Category" v={selectedNode.station.category.replace("_", " / ")} />
              <KV k="Strategy" v={STRATEGY_LABEL[selectedNode.station.strategy]} />
              <KV k="Spatial Graph Reconciliation" v={selectedNode.station.primaryNetwork ? <span className="text-ok font-medium">Enabled (λ = 0.32)</span> : <span className="text-fg-subtle">Uncoupled reach</span>} />
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <a
                href={`/stations?station=${selectedNode.station.id}`}
                className="btn btn-sm flex-1 justify-center gap-1 font-mono"
              >
                Inspect Station <ArrowRight className="h-3 w-3" />
              </a>
              <a
                href={`/forecasts?station=${selectedNode.station.id}`}
                className="btn btn-sm btn-primary flex-1 justify-center font-mono"
              >
                View Forecast
              </a>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
