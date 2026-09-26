"use client";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Compass, GitFork, Droplets, ShieldCheck } from "lucide-react";
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
  type HopDirection,
  type NetworkOverlayMode,
} from "@/components/network";
import { Skeleton, RISK_STYLES } from "@/components/ui/primitives";
import {
  STATIC_STATION_MAP,
  STATIC_STATIONS,
  STATIC_EDGES,
  getUpstream1Hop,
  getUpstream2Hop,
  getUpstream3Hop,
  getDownstreamPath,
} from "@/data/network-static";
import { cn } from "@/lib/utils";

function NetworkWorkspace() {
  const params = useSearchParams();
  const network = useNetwork();
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);

  const [userClosed, setUserClosed] = useState(false);
  const [filterMode, setFilterMode] = useState<NetworkFilterMode>("ALL");
  const [layers, setLayers] = useState<NetworkLayerState>(DEFAULT_NETWORK_LAYERS);

  const panelOpen = Boolean(selected && !userClosed);

  const cameraRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    fitNetwork: () => void;
  } | null>(null);

  // Sync sub-basin from URL query params
  useEffect(() => {
    const st = params.get("station");
    if (st && STATIC_STATION_MAP[st] && selected !== st) {
      selectStation(st);
    }
  }, [params, selectStation, selected]);

  // Real-time detail for selected sub-basin
  const detail = useStation(panelOpen && selected ? selected : null);

  // Upstream ancestors and downstream descendants based on hop distance and direction
  const ancestors = useMemo(() => {
    if (!selected) return [];
    if (layers.hopDirection === "DOWNSTREAM") return [];
    if (layers.hopDistance === 1) return getUpstream1Hop(selected);
    if (layers.hopDistance === 2) return [...getUpstream1Hop(selected), ...getUpstream2Hop(selected)];
    return [...getUpstream1Hop(selected), ...getUpstream2Hop(selected), ...getUpstream3Hop(selected)];
  }, [selected, layers.hopDistance, layers.hopDirection]);

  const descendants = useMemo(() => {
    if (!selected) return [];
    if (layers.hopDirection === "UPSTREAM") return [];
    const path = getDownstreamPath(selected);
    if (layers.hopDistance === 1) return path.slice(0, 1);
    if (layers.hopDistance === 2) return path.slice(0, 2);
    return path;
  }, [selected, layers.hopDistance, layers.hopDirection]);

  // Directed edges connected to the selected sub-basin
  const edgesIn = useMemo(() => {
    if (!selected) return [];
    return (network.data?.edges ?? STATIC_EDGES.map((e) => ({
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
    return (network.data?.edges ?? STATIC_EDGES.map((e) => ({
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

  // Control handlers
  const handleToggleLayer = (layerKey: keyof NetworkLayerState) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleSetHopDistance = (hops: 1 | 2 | 3) => {
    setLayers((prev) => ({ ...prev, hopDistance: hops }));
  };

  const handleSetHopDirection = (dir: HopDirection) => {
    setLayers((prev) => ({ ...prev, hopDirection: dir }));
  };

  const handleSetOverlay = (mode: NetworkOverlayMode) => {
    setLayers((prev) => ({ ...prev, overlay: mode }));
  };

  // Viewport camera actions
  const handleZoomIn = () => cameraRef.current?.zoomIn();
  const handleZoomOut = () => cameraRef.current?.zoomOut();
  const handleFitNetwork = () => cameraRef.current?.fitNetwork();

  // Selection handlers
  const handleStationSelect = (id: string) => {
    selectStation(id);
    setUserClosed(false);
  };

  const handleClearSelection = () => {
    selectStation("");
    setUserClosed(false);
  };

  const selectedNode = selected ? STATIC_STATION_MAP[selected] : null;

  return (
    <div className="relative -m-4 md:-m-6 h-[calc(100vh-3.5rem)] w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] overflow-hidden bg-surface-0">
      {/* 1. Fast, Pure SVG Workspace: The Map IS the Workspace */}
      <NetworkMap
        nodes={network.data?.nodes ?? []}
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
          panelOpen && selected ? "right-4 lg:right-[416px]" : "right-4"
        )}
      >
        <NetworkControls
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitNetwork={handleFitNetwork}
          onSetHopDistance={handleSetHopDistance}
          onSetHopDirection={handleSetHopDirection}
          onSetOverlay={handleSetOverlay}
        />
      </div>

      {/* 4. Bottom-Left Floating Panel: Compact Map Legend */}
      <div className="absolute left-4 bottom-4 z-20 pointer-events-auto hidden md:block">
        <MapLegend />
      </div>

      {/* 5. Bottom-Center Floating Panel: Topological Reachability Inspector */}
      {selectedNode && (
        <div
          className={cn(
            "absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-[min(620px,92vw)] panel px-4 py-2.5 shadow-xl bg-surface-0/95 border border-border transition-all duration-300 font-mono text-xs",
            panelOpen ? "lg:-translate-x-[calc(50%+205px)]" : ""
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  background: RISK_STYLES[selectedNode.risk]?.hex ?? "#22c55e",
                }}
              />
              <span className="font-semibold text-fg">{selectedNode.name}</span>
              <span className="text-[10px] text-fg-subtle">({selectedNode.id})</span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <div>
                <span className="text-fg-subtle">Risk: </span>
                <span className="font-bold text-fg">{(selectedNode.riskScore * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-fg-subtle">Upstream: </span>
                <span className="text-cyan-400 font-semibold">{ancestors.length} basins</span>
              </div>
              <div>
                <span className="text-fg-subtle">Downstream: </span>
                <span className="text-emerald-400 font-semibold">
                  {selectedNode.downstreamStationId ?? "Outlet"}
                </span>
              </div>
              {selectedNode.coldStart && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px]">
                  Cold-Start
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Right Side Slide-Over: Basin Intelligence Inspector */}
      {panelOpen && selected && (
        <div className="absolute right-0 top-0 z-30 h-full pointer-events-auto slide-in-right">
          <StationInspector
            stationId={selected}
            detail={detail.data}
            isLoading={detail.isLoading}
            onClose={() => setUserClosed(true)}
            onSelectStation={handleStationSelect}
            edgesIn={edgesIn}
            edgesOut={edgesOut}
          />
        </div>
      )}

      {/* 7. Floating Reopen Button when Inspector is Closed but a Basin is Selected */}
      {!panelOpen && selected && STATIC_STATION_MAP[selected] && (
        <button
          className="absolute right-4 top-16 z-20 btn btn-sm shadow-xl font-mono flex items-center gap-2 bg-surface-0/95 border border-border hover:bg-surface-1 transition-colors pointer-events-auto"
          onClick={() => setUserClosed(false)}
          title="Open basin intelligence inspector"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              background: RISK_STYLES[STATIC_STATION_MAP[selected]?.risk ?? "LOW"]?.hex ?? "#22c55e",
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
