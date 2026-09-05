import { STATIONS, STATION_MAP } from "./stations";
import { riverDistanceKm, travelTimeH, couplingFactor, tmaAt, climatologyAt } from "./telemetry";
import { hashString, latticeNoise, round, clamp } from "@/lib/prng";
import type { NetworkEdge, NetworkGraph, StationSnapshot } from "@/types/domain";

/** Empirical residual correlation between two stations (symmetric, deterministic). */
export function residualCorrelation(a: string, b: string): number {
  if (a === b) return 1;
  const [x, y] = [a, b].sort();
  const sa = STATION_MAP[x];
  const sb = STATION_MAP[y];
  const dist = riverDistanceKm(sa, sb);
  const connected = sa.downstreamStations.includes(y) || sb.downstreamStations.includes(x);
  const samePrimary = sa.primaryNetwork && sb.primaryNetwork;
  const base = samePrimary ? Math.exp(-dist / 95) * 0.78 : Math.exp(-dist / 40) * 0.25;
  const bonus = connected ? 0.18 : 0;
  const noise = (latticeNoise(hashString(`rc:${x}:${y}`), 1) - 0.5) * 0.12;
  return round(clamp(base + bonus + noise, -0.08, 0.96), 3);
}

export function buildEdges(now: number): NetworkEdge[] {
  const edges: NetworkEdge[] = [];
  for (const s of STATIONS) {
    for (const downId of s.downstreamStations) {
      const d = STATION_MAP[downId];
      const dev = Math.max(0, tmaAt(s.id, now) - climatologyAt(s.id, now));
      edges.push({
        id: `${s.id}->${downId}`,
        from: s.id,
        to: downId,
        riverDistanceKm: riverDistanceKm(s, d),
        travelTimeH: travelTimeH(s, d),
        residualCorrelation: residualCorrelation(s.id, downId),
        weight: couplingFactor(s, d),
        segmentFlow: round(clamp(0.25 + dev / s.thresholds.alert * 1.8, 0.15, 1), 3),
      });
    }
  }
  return edges;
}

/** Ordered river centerlines for map rendering: [lon, lat] pairs incl. intermediate bends. */
export const RIVER_PATHS: { id: string; name: string; points: [number, number][] }[] = [
  {
    id: "main-upper",
    name: "Bengawan Solo (upper)",
    points: [
      [110.99, -7.905], [110.931, -7.832], [110.9, -7.78], [110.879, -7.722], [110.851, -7.699], [110.84, -7.64], [110.858, -7.566],
      [110.9, -7.5], [110.96, -7.46], [111.021, -7.428], [111.12, -7.40], [111.252, -7.382], [111.34, -7.372], [111.447, -7.402],
    ],
  },
  {
    id: "main-lower",
    name: "Bengawan Solo (lower)",
    points: [
      [111.447, -7.402], [111.5, -7.30], [111.55, -7.21], [111.592, -7.152], [111.66, -7.19], [111.702, -7.201], [111.79, -7.17],
      [111.882, -7.151], [111.99, -7.13], [112.08, -7.14], [112.162, -7.112], [112.24, -7.05], [112.302, -7.021], [112.41, -6.99],
      [112.518, -6.982], [112.552, -6.884],
    ],
  },
  { id: "madiun", name: "Kali Madiun", points: [[111.383, -7.869], [111.43, -7.875], [111.468, -7.867], [111.5, -7.76], [111.523, -7.628], [111.5, -7.57], [111.482, -7.521], [111.46, -7.46], [111.447, -7.402]] },
  { id: "gandong", name: "Kali Gandong", points: [[111.33, -7.63], [111.398, -7.602], [111.45, -7.56], [111.482, -7.521]] },
  { id: "dengkeng", name: "Kali Dengkeng", points: [[110.62, -7.72], [110.722, -7.681], [110.8, -7.62], [110.858, -7.566]] },
  { id: "samin", name: "Kali Samin", points: [[111.02, -7.66], [110.951, -7.621], [110.9, -7.59], [110.858, -7.566]] },
  { id: "pepe", name: "Kali Pepe", points: [[110.72, -7.50], [110.79, -7.53], [110.831, -7.552], [110.9, -7.5]] },
  { id: "keduang", name: "Kali Keduang", points: [[111.07, -7.76], [111.004, -7.802], [110.96, -7.82], [110.931, -7.832]] },
  { id: "tirtomoyo", name: "Kali Tirtomoyo", points: [[111.11, -7.98], [111.052, -7.931], [110.99, -7.905]] },
  { id: "kening", name: "Kali Kening", points: [[111.80, -6.86], [111.852, -6.952], [111.87, -7.05], [111.882, -7.151]] },
  { id: "grindulu", name: "Kali Grindulu", points: [[111.05, -8.02], [111.102, -8.191], [111.11, -8.23]] },
  { id: "lorog", name: "Kali Lorog", points: [[111.22, -8.10], [111.252, -8.202], [111.26, -8.24]] },
  { id: "lamong", name: "Kali Lamong", points: [[112.40, -7.30], [112.50, -7.24], [112.552, -7.202], [112.64, -7.19]] },
  { id: "serang", name: "Kali Serang", points: [[110.80, -7.35], [110.852, -7.252], [110.88, -7.15]] },
  { id: "jero", name: "Bengawan Jero", points: [[112.28, -7.09], [112.352, -7.052], [112.44, -7.03]] },
];

export function buildNetwork(nodes: StationSnapshot[], now: number): NetworkGraph {
  return { nodes, edges: buildEdges(now), riverPaths: RIVER_PATHS };
}

export function neighbours(stationId: string, limit = 6) {
  const s = STATION_MAP[stationId];
  return STATIONS.filter((o) => o.id !== stationId && o.primaryNetwork === s.primaryNetwork)
    .map((o) => ({ stationId: o.id, correlation: residualCorrelation(stationId, o.id), riverDistanceKm: riverDistanceKm(s, o) }))
    .sort((a, b) => b.correlation - a.correlation)
    .slice(0, limit);
}
