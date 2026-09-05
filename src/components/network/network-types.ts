import type { StaticStation, StaticEdge } from "@/data/network-static";
import type { StationSnapshot, StationDetail } from "@/types/domain";

export type NetworkFilterMode = "ALL" | "PRIMARY" | "OUTSIDE";

export interface NetworkLayerState {
  rivers: boolean;
  primaryStations: boolean;
  outsideStations: boolean;
  networkEdges: boolean;
  provinces: boolean;
  basin: boolean;
  flowDirection: boolean;
  labels: boolean;
}

export const DEFAULT_NETWORK_LAYERS: NetworkLayerState = {
  rivers: true,
  primaryStations: true,
  outsideStations: true,
  networkEdges: true,
  provinces: true,
  basin: true,
  flowDirection: true,
  labels: true,
};

export interface StationHoverInfo {
  id: string;
  name: string;
  category: string;
  risk: string;
  tma: number;
  river: string;
  primary: boolean;
  x: number;
  y: number;
}
