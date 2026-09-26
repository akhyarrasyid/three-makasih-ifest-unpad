import type { BasinNode, Thresholds } from "@/types/domain";
import {
  STATIC_STATIONS,
  STATIC_STATION_MAP,
  getAncestors,
  getDescendants,
  getUpstream1Hop,
  getUpstream2Hop,
  getUpstream3Hop,
  getDownstreamPath,
  type StaticBasinNode,
} from "@/data/network-static";

function makeThresholds(): Thresholds {
  return {
    normal: 0.25,
    warning: 0.50,
    alert: 0.75,
    critical: 0.90,
  };
}

export const STATIONS: BasinNode[] = STATIC_STATIONS.map((s) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  latitude: s.latitude,
  longitude: s.longitude,
  category: s.category,
  river: s.river,
  basin: s.basin,
  subBasin: s.subBasin,
  primaryNetwork: true,
  elevationM: s.elevationM,
  catchmentKm2: s.catchmentKm2,
  downstreamId: s.downstreamId,
  upstreamIds: s.upstreamIds,
  graphDepth: s.graphDepth,
  headwater: s.headwater,
  outletDistanceKm: s.outletDistanceKm,
  coldStart: s.coldStart,
  basinAreaKm2: s.catchmentKm2,
  population: Math.round(s.catchmentKm2 * (s.category === "MAINSTEM" ? 180 : s.category === "OUTLET" ? 220 : 45)),
  streamflow: s.streamflow,
  baseflow: s.baseflow,
  quickflow: s.quickflow,
  irrigationWithdrawal: s.irrigationWithdrawal,
  publicSupplyWithdrawal: s.publicSupplyWithdrawal,
  thermoelectricWithdrawal: s.thermoelectricWithdrawal,
  totalWithdrawal: s.totalWithdrawal,
  climatology: s.climatology,
  supplyRatio: Number((s.currentSupply / Math.max(1, s.climatology)).toFixed(3)),
  availabilityProxy: s.availabilityProxy,
  waterLimitationProxy: s.waterLimitationProxy,
  riskScore: s.riskScore,
  riskTier: s.risk,
  confidence: s.confidence,
  thresholds: makeThresholds(),
  upstreamStations: s.upstreamIds,
  downstreamStations: s.downstreamId ? [s.downstreamId] : [],
  strategy: s.strategy,
  installedAt: "2024-09-01",
  sensorType: s.coldStart ? "Test-Domain Spatial Gauging" : "Historical Sensor & Climatology Station",
}));

export const STATION_MAP: Record<string, BasinNode> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s])
);

export function getStation(id: string): BasinNode | undefined {
  return STATION_MAP[id] ?? STATIC_STATION_MAP[id] as unknown as BasinNode | undefined;
}

export function ancestorsOf(id: string): string[] {
  return getAncestors(id);
}

export function descendantsOf(id: string): string[] {
  return getDescendants(id);
}

export const CATEGORY_LABEL: Record<string, string> = {
  HEADWATER: "Headwater Origin",
  TRIBUTARY: "Tributary Sub-Basin",
  MAINSTEM: "Mainstem Corridor",
  OUTLET: "Terminal Basin Outlet",
  CONFLUENCE: "Confluence Junction",
  NATURAL: "Natural Channel",
  MIXED: "Mixed Irrigation Reach",
  DAM_WEIR: "Regulated Control Weir",
};

export const STRATEGY_LABEL: Record<string, string> = {
  DIRECT_MULTI_HORIZON: "Directed Reachability GBDT",
  DIRECT_GRAPH_RECONCILIATION: "Directed Reachability GBDT",
  GBDT_ENSEMBLE: "GBDT Tri-Model Ensemble",
  DIRECTED_GNN: "Directed Reachability GNN",
  CLIMATOLOGY: "Seasonal Climatology Baseline",
  HYBRID: "Hybrid GBDT + GNN Candidate",
};

export {
  getUpstream1Hop,
  getUpstream2Hop,
  getUpstream3Hop,
  getDownstreamPath,
};
