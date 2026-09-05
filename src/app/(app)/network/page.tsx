"use client";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useNetwork, useStation } from "@/hooks/use-api";
import { useSelectionStore } from "@/store/selection-store";
import {
  NetworkMap,
  NetworkSummary,
  NetworkControls,
  MapLegend,
  StationInspector,
  DEFAULT_NETWORK_LAYERS,
  type NetworkFilterMode,
  type NetworkLayerState,
} from "@/components/network";
import { Skeleton, RISK_STYLES } from "@/components/ui/primitives";
import { STATIC_STATION_MAP, STATIC_STATIONS, STATIC_EDGES } from "@/data/network-static";
import { cn } from "@/lib/utils";

function NetworkWorkspace() {
  const params = useSearchParams();
  const network = useNetwork();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);

  const [userClosed, setUserClosed] = useState(false);
  const [filterMode, setFilterMode] = useState<NetworkFilterMode>("ALL");
  const [layers, setLayers] = useState<NetworkLayerState>(DEFAULT_NETWORK_LAYERS);
  const [timeOffset, setTimeOffset] = useState(0);

  const panelOpen = Boolean(selected && !userClosed);

  const cameraRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    fitNetwork: () => void;
  } | null>(null);

  // Sync station from URL query params if present
  useEffect(() => {
    const st = params.get("station");
    if (st && STATIC_STATION_MAP[st] && selected !== st) {
      selectStation(st);
    }
  }, [params, selectStation, selected]);

  // Fetch real-time detail only if inspector panel is open and a station is selected
  const detail = useStation(panelOpen && selected ? selected : null);

  // Transitive upstream ancestors and downstream descendants (O(1) static lookup)
  const ancestors = useMemo(() => {
    if (!selected) return [];
    return STATIC_STATION_MAP[selected]?.ancestors ?? network.data?.ancestors[selected] ?? [];
  }, [selected, network.data]);

  const descendants = useMemo(() => {
    if (!selected) return [];
    return STATIC_STATION_MAP[selected]?.descendants ?? network.data?.descendants[selected] ?? [];
  }, [selected, network.data]);

  // Forecast time slider node projections
  const projectedNodes = useMemo(() => {
    if (!network.data?.nodes) return [];
    if (timeOffset === 0) return network.data.nodes;
    return network.data.nodes.map((n) => {
      const f = timeOffset <= 6 ? n.forecast6h : n.forecast24h;
      const ratio = f / n.station.thresholds.alert;
      const risk =
        ratio >= 1.0 ? "CRITICAL" : ratio >= 0.8 ? "HIGH" : ratio >= 0.6 ? "MODERATE" : "LOW";
      return { ...n, currentTma: f, risk } as typeof n;
    });
  }, [network.data, timeOffset]);

  // Directed edges connected to the selected station
  const edgesIn = useMemo(() => {
    if (!selected) return [];
    return (network.data?.edges ?? STATIC_EDGES.map(e => ({
      id: e.id,
      from: e.source,
      to: e.target,
      riverDistanceKm: e.distanceKm,
      travelTimeH: e.travelTimeHours,
      residualCorrelation: e.residualCorrelation,
      weight: 1,
      segmentFlow: 0.5,
    }))).filter((e) => e.to === selected);
  }, [network.data, selected]);

  const edgesOut = useMemo(() => {
    if (!selected) return [];
    return (network.data?.edges ?? STATIC_EDGES.map(e => ({
      id: e.id,
      from: e.source,
      to: e.target,
      riverDistanceKm: e.distanceKm,
      travelTimeH: e.travelTimeHours,
      residualCorrelation: e.residualCorrelation,
      weight: 1,
      segmentFlow: 0.5,
    }))).filter((e) => e.from === selected);
  }, [network.data, selected]);

  // Layer toggle handler
  const handleToggleLayer = (layerKey: keyof NetworkLayerState) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Viewport camera actions
  const handleZoomIn = () => {
    cameraRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    cameraRef.current?.zoomOut();
  };

  const handleFitNetwork = () => {
    cameraRef.current?.fitNetwork();
  };

  // Station selection handler
  const handleStationSelect = (id: string) => {
    selectStation(id);
    setUserClosed(false);
  };

  const handleClearSelection = () => {
    selectStation("");
    setUserClosed(false);
  };

  const handleClosePanel = () => {
    setUserClosed(true);
  };

  return (
    <div className="relative -m-4 md:-m-6 h-[calc(100vh-3.5rem)] w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] overflow-hidden bg-surface-0">
      {/* 1. Fast, Pure SVG Workspace: The Map IS the Workspace */}
      <NetworkMap
        nodes={projectedNodes}
        selectedId={selected}
        onSelect={handleStationSelect}
        filterMode={filterMode}
        layers={layers}
        ancestorIds={ancestors}
        descendantIds={descendants}
        onMapReady={(controls) => {
          cameraRef.current = controls;
        }}
        className="h-full w-full"
      />

      {/* 2. Top-Left Floating Panel: Operational Metadata Summary & Scope Filters */}
      <div className="absolute left-4 top-4 z-20 pointer-events-auto">
        <NetworkSummary
          selectedStationId={selected}
          onClearSelection={handleClearSelection}
          filterMode={filterMode}
          onFilterChange={setFilterMode}
          upstreamCount={ancestors.length}
          downstreamCount={descendants.length}
        />
      </div>

      {/* 3. Top-Right Floating Panel: Cartographic & Navigation Controls */}
      <div
        className={cn(
          "absolute top-4 z-20 pointer-events-auto transition-all duration-300",
          panelOpen && selected ? "right-4 lg:right-[406px]" : "right-4"
        )}
      >
        <NetworkControls
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitNetwork={handleFitNetwork}
        />
      </div>

      {/* 4. Bottom-Left Floating Panel: Compact Map Legend */}
      <div className="absolute left-4 bottom-4 z-20 pointer-events-auto hidden md:block">
        <MapLegend />
      </div>

      {/* 5. Bottom-Center Floating Panel: Forecast Time Horizon Scrubber */}
      <div
        className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-[min(480px,88vw)] panel px-4 py-2 shadow-xl bg-surface-0/95 border border-border transition-all duration-300",
          panelOpen && selected ? "lg:-translate-x-[calc(50%+195px)]" : ""
        )}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs w-20 shrink-0 text-fg">
            {timeOffset === 0 ? "Observed (t₀)" : `Forecast +${timeOffset}h`}
          </span>
          <input
            type="range"
            min={0}
            max={24}
            step={6}
            value={timeOffset}
            onChange={(e) => setTimeOffset(Number(e.target.value))}
            className="flex-1 accent-water cursor-pointer h-1.5 bg-surface-3 rounded-lg"
            aria-label="Hydrological forecast horizon scrubber"
          />
          <span className="font-mono text-[11px] w-20 text-right text-fg-subtle">
            {timeOffset === 0 ? "Real-time" : "Multi-horizon"}
          </span>
        </div>
      </div>

      {/* 6. Right Side Slide-Over: Station Inspector */}
      {panelOpen && selected && (
        <div className="absolute right-0 top-0 z-30 h-full pointer-events-auto slide-in-right">
          <StationInspector
            stationId={selected}
            detail={detail.data}
            isLoading={detail.isLoading}
            onClose={handleClosePanel}
            onSelectStation={handleStationSelect}
            edgesIn={edgesIn}
            edgesOut={edgesOut}
          />
        </div>
      )}

      {/* 7. Floating Reopen Button when Inspector is Closed but a Station is Selected */}
      {!panelOpen && selected && STATIC_STATION_MAP[selected] && (
        <button
          className="absolute right-4 top-16 z-20 btn btn-sm shadow-xl font-mono flex items-center gap-2 bg-surface-0/95 border border-border hover:bg-surface-1 transition-colors pointer-events-auto"
          onClick={() => setUserClosed(false)}
          title="Open station inspector"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              background:
                RISK_STYLES[
                  projectedNodes.find((n) => n.station.id === selected)?.risk ??
                  STATIC_STATION_MAP[selected]?.risk ??
                  "LOW"
                ]?.hex ?? "#22c55e",
            }}
          />
          <span className="font-medium text-fg">{STATIC_STATION_MAP[selected].name}</span>
          <ArrowRight className="h-3 w-3 text-fg-subtle ml-0.5" />
        </button>
      )}
    </div>
  );
}

export default function NetworkPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-3.5rem)] w-full bg-surface-1 flex items-center justify-center">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      }
    >
      <NetworkWorkspace />
    </Suspense>
  );
}
