import type { Station, StationCategory, ForecastStrategy, Thresholds } from "@/types/domain";

const STRATEGY: Record<StationCategory, ForecastStrategy> = {
  DAM_WEIR: "CLIMATOLOGY",
  MIXED: "HYBRID",
  NATURAL: "DIRECT_MULTI_HORIZON",
};

interface StationSeed {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: StationCategory;
  river: string;
  primary: boolean;
  elev: number;
  catchment: number;
  down: string | null;
  alert: number; // alert threshold (m)
  sensor?: string;
}

/**
 * 30 representative stations inspired by the Bengawan Solo watershed.
 * Identifiers are demo identifiers (BS-001 … BS-030) and do not correspond to
 * official station codes. Stations BS-001 … BS-025 form the primary river network.
 */
const SEEDS: StationSeed[] = [
  { id: "BS-001", name: "Wonogiri Dam", lat: -7.832, lon: 110.931, category: "DAM_WEIR", river: "Bengawan Solo Hulu", primary: true, elev: 136, catchment: 1350, down: "BS-002", alert: 6.4 },
  { id: "BS-002", name: "Nguter", lat: -7.722, lon: 110.879, category: "NATURAL", river: "Bengawan Solo Hulu", primary: true, elev: 112, catchment: 1610, down: "BS-003", alert: 5.6 },
  { id: "BS-003", name: "Colo Weir", lat: -7.699, lon: 110.851, category: "DAM_WEIR", river: "Bengawan Solo Hulu", primary: true, elev: 104, catchment: 1720, down: "BS-004", alert: 4.8 },
  { id: "BS-004", name: "Jurug", lat: -7.566, lon: 110.858, category: "NATURAL", river: "Bengawan Solo", primary: true, elev: 88, catchment: 3210, down: "BS-007", alert: 8.5 },
  { id: "BS-005", name: "Dengkeng", lat: -7.681, lon: 110.722, category: "NATURAL", river: "Kali Dengkeng", primary: true, elev: 132, catchment: 760, down: "BS-004", alert: 4.2 },
  { id: "BS-006", name: "Pepe Hilir", lat: -7.552, lon: 110.831, category: "MIXED", river: "Kali Pepe", primary: true, elev: 92, catchment: 310, down: "BS-007", alert: 3.6 },
  { id: "BS-007", name: "Sragen", lat: -7.428, lon: 111.021, category: "NATURAL", river: "Bengawan Solo", primary: true, elev: 74, catchment: 4020, down: "BS-025", alert: 9.2 },
  { id: "BS-008", name: "Badegan", lat: -7.869, lon: 111.383, category: "NATURAL", river: "Kali Madiun Hulu", primary: true, elev: 214, catchment: 420, down: "BS-009", alert: 3.8 },
  { id: "BS-009", name: "Ponorogo", lat: -7.867, lon: 111.468, category: "NATURAL", river: "Kali Madiun", primary: true, elev: 152, catchment: 890, down: "BS-010", alert: 4.6 },
  { id: "BS-010", name: "Madiun", lat: -7.628, lon: 111.523, category: "MIXED", river: "Kali Madiun", primary: true, elev: 68, catchment: 2180, down: "BS-012", alert: 6.1 },
  { id: "BS-011", name: "Ngawi Confluence", lat: -7.402, lon: 111.447, category: "NATURAL", river: "Bengawan Solo", primary: true, elev: 52, catchment: 8460, down: "BS-014", alert: 11.8 },
  { id: "BS-012", name: "Kwadungan", lat: -7.521, lon: 111.482, category: "NATURAL", river: "Kali Madiun", primary: true, elev: 58, catchment: 3140, down: "BS-011", alert: 7.4 },
  { id: "BS-013", name: "Gandong Weir", lat: -7.602, lon: 111.398, category: "DAM_WEIR", river: "Kali Gandong", primary: true, elev: 96, catchment: 340, down: "BS-012", alert: 3.2 },
  { id: "BS-014", name: "Cepu", lat: -7.152, lon: 111.592, category: "NATURAL", river: "Bengawan Solo", primary: true, elev: 34, catchment: 9820, down: "BS-024", alert: 12.6 },
  { id: "BS-015", name: "Bojonegoro Barrage", lat: -7.151, lon: 111.882, category: "DAM_WEIR", river: "Bengawan Solo", primary: true, elev: 22, catchment: 11400, down: "BS-016", alert: 13.5 },
  { id: "BS-016", name: "Babat Barrage", lat: -7.112, lon: 112.162, category: "DAM_WEIR", river: "Bengawan Solo Hilir", primary: true, elev: 14, catchment: 12300, down: "BS-017", alert: 7.9 },
  { id: "BS-017", name: "Karanggeneng", lat: -7.021, lon: 112.302, category: "MIXED", river: "Bengawan Solo Hilir", primary: true, elev: 8, catchment: 13100, down: "BS-018", alert: 5.8 },
  { id: "BS-018", name: "Sembayat Barrage", lat: -6.982, lon: 112.518, category: "DAM_WEIR", river: "Bengawan Solo Hilir", primary: true, elev: 4, catchment: 15600, down: "BS-019", alert: 4.4 },
  { id: "BS-019", name: "Ujung Pangkah Estuary", lat: -6.884, lon: 112.552, category: "NATURAL", river: "Bengawan Solo Hilir", primary: true, elev: 1, catchment: 16100, down: null, alert: 3.1 },
  { id: "BS-020", name: "Samin", lat: -7.621, lon: 110.951, category: "NATURAL", river: "Kali Samin", primary: true, elev: 118, catchment: 280, down: "BS-004", alert: 3.4 },
  { id: "BS-021", name: "Keduang", lat: -7.802, lon: 111.004, category: "NATURAL", river: "Kali Keduang", primary: true, elev: 168, catchment: 420, down: "BS-001", alert: 3.9 },
  { id: "BS-022", name: "Tirtomoyo", lat: -7.931, lon: 111.052, category: "NATURAL", river: "Kali Tirtomoyo", primary: true, elev: 186, catchment: 230, down: "BS-001", alert: 3.5 },
  { id: "BS-023", name: "Kening", lat: -6.952, lon: 111.852, category: "NATURAL", river: "Kali Kening", primary: true, elev: 28, catchment: 510, down: "BS-015", alert: 4.1 },
  { id: "BS-024", name: "Padangan", lat: -7.201, lon: 111.702, category: "MIXED", river: "Bengawan Solo", primary: true, elev: 28, catchment: 10600, down: "BS-015", alert: 12.9 },
  { id: "BS-025", name: "Widodaren", lat: -7.382, lon: 111.252, category: "NATURAL", river: "Bengawan Solo", primary: true, elev: 62, catchment: 4680, down: "BS-011", alert: 9.8 },
  { id: "BS-026", name: "Grindulu", lat: -8.191, lon: 111.102, category: "NATURAL", river: "Kali Grindulu", primary: false, elev: 42, catchment: 620, down: null, alert: 4.3 },
  { id: "BS-027", name: "Lorog", lat: -8.202, lon: 111.252, category: "NATURAL", river: "Kali Lorog", primary: false, elev: 36, catchment: 290, down: null, alert: 3.7 },
  { id: "BS-028", name: "Lamong Hilir", lat: -7.202, lon: 112.552, category: "MIXED", river: "Kali Lamong", primary: false, elev: 6, catchment: 720, down: null, alert: 3.3 },
  { id: "BS-029", name: "Serang Hulu", lat: -7.252, lon: 110.852, category: "NATURAL", river: "Kali Serang", primary: false, elev: 96, catchment: 480, down: null, alert: 4.0 },
  { id: "BS-030", name: "Bengawan Jero", lat: -7.052, lon: 112.352, category: "NATURAL", river: "Bengawan Jero", primary: false, elev: 3, catchment: 380, down: null, alert: 2.9 },
];

function makeThresholds(alert: number): Thresholds {
  return {
    normal: Number((alert * 0.6).toFixed(2)),
    warning: Number((alert * 0.8).toFixed(2)),
    alert,
    critical: Number((alert * 1.15).toFixed(2)),
  };
}

export const STATIONS: Station[] = SEEDS.map((s, idx) => {
  const upstream = SEEDS.filter((o) => o.down === s.id).map((o) => o.id);
  return {
    id: s.id,
    code: s.id,
    name: s.name,
    latitude: s.lat,
    longitude: s.lon,
    category: s.category,
    river: s.river,
    basin: s.primary ? "Bengawan Solo" : s.river.replace("Kali ", "") + " Basin",
    primaryNetwork: s.primary,
    elevationM: s.elev,
    catchmentKm2: s.catchment,
    thresholds: makeThresholds(s.alert),
    upstreamStations: upstream,
    downstreamStations: s.down ? [s.down] : [],
    strategy: STRATEGY[s.category],
    installedAt: `20${String(15 + (idx % 7)).padStart(2, "0")}-0${1 + (idx % 9)}-1${idx % 9}`,
    sensorType: s.sensor ?? (s.category === "DAM_WEIR" ? "Radar AWLR + Gate Telemetry" : idx % 3 === 0 ? "Pressure AWLR" : "Radar AWLR"),
  };
});

export const STATION_MAP: Record<string, Station> = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

export function getStation(id: string): Station | undefined {
  return STATION_MAP[id];
}

/** All upstream ancestors (transitive) for a station. */
export function ancestorsOf(id: string, maxDepth = 8): string[] {
  const out: string[] = [];
  const queue: [string, number][] = [[id, 0]];
  const seen = new Set<string>();
  while (queue.length) {
    const [cur, d] = queue.shift()!;
    if (d >= maxDepth) continue;
    for (const up of STATION_MAP[cur]?.upstreamStations ?? []) {
      if (!seen.has(up)) {
        seen.add(up);
        out.push(up);
        queue.push([up, d + 1]);
      }
    }
  }
  return out;
}

export function descendantsOf(id: string): string[] {
  const out: string[] = [];
  let cur = STATION_MAP[id]?.downstreamStations[0];
  while (cur) {
    out.push(cur);
    cur = STATION_MAP[cur]?.downstreamStations[0];
  }
  return out;
}

export const CATEGORY_LABEL: Record<StationCategory, string> = {
  DAM_WEIR: "Dam / Weir",
  MIXED: "Mixed",
  NATURAL: "Natural",
};

export const STRATEGY_LABEL: Record<ForecastStrategy, string> = {
  CLIMATOLOGY: "Climatology",
  HYBRID: "Hybrid (ML + Climatology)",
  DIRECT_MULTI_HORIZON: "Direct Multi-Horizon",
};
