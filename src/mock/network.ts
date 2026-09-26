import { STATIONS, STATION_MAP } from "./stations";
import {
  STATIC_EDGES,
  getUpstream1Hop,
  getUpstream2Hop,
  getUpstream3Hop,
  getDownstreamPath,
} from "@/data/network-static";
import { basinHydrologyAt } from "./telemetry";
import { clamp, round } from "@/lib/prng";
import type {
  NetworkEdge,
  NetworkGraph,
  StationSnapshot,
  ReachabilityTrace,
} from "@/types/domain";

export function residualCorrelation(a: string, b: string): number {
  if (a === b) return 1.0;
  const sa = STATION_MAP[a];
  const sb = STATION_MAP[b];
  if (!sa || !sb) return 0.5;

  const connected = sa.downstreamId === b || sb.downstreamId === a;
  const depthDiff = Math.abs(sa.graphDepth - sb.graphDepth);
  const base = Math.max(0.1, 0.92 - depthDiff * 0.14);
  return round(connected ? Math.min(0.96, base + 0.15) : base, 3);
}

export function buildEdges(now: number): NetworkEdge[] {
  return STATIC_EDGES.map((e) => {
    const hydro = basinHydrologyAt(e.source, now);
    const flowRatio = clamp(hydro.supply / Math.max(1, hydro.climatology), 0.2, 1.8);
    return {
      id: e.id,
      from: e.source,
      to: e.target,
      riverDistanceKm: e.distanceKm,
      travelTimeH: e.travelTimeHours,
      residualCorrelation: e.residualCorrelation,
      weight: round(flowRatio, 2),
      segmentFlow: round(clamp(flowRatio * 0.65, 0.15, 1.0), 3),
    };
  });
}

export function buildNetwork(nodes: StationSnapshot[], now: number): NetworkGraph {
  return {
    nodes,
    edges: buildEdges(now),
    riverPaths: [],
  };
}

export function neighbours(stationId: string, limit = 6) {
  const s = STATION_MAP[stationId];
  if (!s) return [];
  return STATIONS.filter((o) => o.id !== stationId)
    .map((o) => ({
      stationId: o.id,
      correlation: residualCorrelation(stationId, o.id),
      riverDistanceKm: Math.abs(s.outletDistanceKm - o.outletDistanceKm) + 12,
    }))
    .sort((a, b) => b.correlation - a.correlation)
    .slice(0, limit);
}

/**
 * Computes Directed Multi-Hop Reachability Trace for a target HUC12
 */
export function reachabilityTrace(stationId: string, now: number): ReachabilityTrace {
  const basin = STATION_MAP[stationId] || STATIONS[0];
  const u1 = getUpstream1Hop(basin.id);
  const u2 = getUpstream2Hop(basin.id);
  const u3 = getUpstream3Hop(basin.id);
  const downPath = getDownstreamPath(basin.id);

  const allUp = [...u1, ...u2, ...u3];
  let upstreamMeanSupply = basin.streamflow;
  let upstreamMinSupply = basin.streamflow;
  let upstreamWithdrawalPressure = basin.totalWithdrawal;
  let upstreamMaxRisk = basin.riskScore;

  if (allUp.length > 0) {
    const upHydros = allUp.map((uid) => basinHydrologyAt(uid, now));
    const supplies = upHydros.map((h) => h.supply);
    const withdrawals = upHydros.map((h) => h.withdrawal);
    const risks = upHydros.map((h) => h.riskScore);

    upstreamMeanSupply = round(supplies.reduce((a, b) => a + b, 0) / supplies.length, 1);
    upstreamMinSupply = Math.min(...supplies);
    upstreamWithdrawalPressure = round(withdrawals.reduce((a, b) => a + b, 0) / withdrawals.length, 1);
    upstreamMaxRisk = round(Math.max(...risks), 2);
  }

  const currentHydro = basinHydrologyAt(basin.id, now);
  const nodeVsUpstreamAnomaly = round(currentHydro.supply - upstreamMeanSupply, 1);

  let nodeVsDownstreamAnomaly = 0;
  if (downPath.length > 0) {
    const downHydro = basinHydrologyAt(downPath[0], now);
    nodeVsDownstreamAnomaly = round(currentHydro.supply - downHydro.supply, 1);
  }

  return {
    targetId: basin.id,
    targetName: basin.name,
    upstream1Hop: u1,
    upstream2Hop: u2,
    upstream3Hop: u3,
    downstreamPath: downPath,
    upstreamMeanSupply,
    upstreamMinSupply,
    upstreamWithdrawalPressure,
    upstreamMaxRisk,
    nodeVsUpstreamAnomaly,
    nodeVsDownstreamAnomaly,
    reachableBasinsCount: allUp.length + downPath.length,
    graphDepth: basin.graphDepth,
    outletDistanceKm: basin.outletDistanceKm,
    headwater: basin.headwater,
  };
}
