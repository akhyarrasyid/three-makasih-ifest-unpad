import type { StaticBasinNode, StaticEdge } from "@/data/network-static";
import type { StationSnapshot, StationDetail, RiskLevel } from "@/types/domain";

export type NetworkFilterMode = "ALL" | "HEADWATERS" | "MAINSTEM" | "COLD_START";

export type NetworkOverlayMode = "RISK" | "SUPPLY" | "WITHDRAWAL" | "GNN_INFLUENCE";

export type HopDirection = "UPSTREAM" | "DOWNSTREAM" | "BOTH";

export interface NetworkLayerState {
  rivers: boolean;
  basins: boolean;
  networkEdges: boolean;
  flowDirection: boolean;
  labels: boolean;
  hopDistance: 1 | 2 | 3;
  hopDirection: HopDirection;
  overlay: NetworkOverlayMode;
  // Compatibility fields
  primaryStations?: boolean;
  outsideStations?: boolean;
  provinces?: boolean;
  basin?: boolean;
}

export const DEFAULT_NETWORK_LAYERS: NetworkLayerState = {
  rivers: true,
  basins: true,
  networkEdges: true,
  flowDirection: true,
  labels: true,
  hopDistance: 3,
  hopDirection: "BOTH",
  overlay: "RISK",
  primaryStations: true,
  outsideStations: true,
  provinces: false,
  basin: true,
};

export interface StationHoverInfo {
  id: string;
  name: string;
  category: string;
  risk: RiskLevel;
  riskScore: number;
  supply: number;
  climatologyAnomalySigma: number;
  withdrawal: number;
  waterLimitationProxy: number;
  graphDepth: number;
  coldStart: boolean;
  river: string;
  x: number;
  y: number;
  tma?: number; // compatibility
  primary?: boolean;
}
