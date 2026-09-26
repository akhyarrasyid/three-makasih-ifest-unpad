// Precomputed static geospatial data & network topology for TIRTA River Network workspace
// 42 representative HUC12 sub-basin DAG nodes, directed downstream edges (id -> to_id),
// multi-hop reachability lookups, and catchment cartography.

import type { BasinCategory, RiskLevel, ForecastStrategy } from "@/types/domain";

export interface StaticBasinNode {
  id: string; // e.g. "HUC-DEMO-0001"
  name: string;
  code: string;
  x: number; // SVG canvas coordinate 0..1200
  y: number; // SVG canvas coordinate 0..700
  latitude: number;
  longitude: number;
  category: BasinCategory;
  river: string;
  basin: string;
  subBasin: string;
  primary: boolean;
  elevationM: number;
  catchmentKm2: number;
  graphDepth: number;
  headwater: boolean;
  outletDistanceKm: number;
  coldStart: boolean; // absent from training history
  downstreamId: string | null;
  upstreamIds: string[];
  ancestors: string[];
  descendants: string[];
  // Baseline hydrological attributes
  climatology: number; // mm/mo
  currentSupply: number;
  streamflow: number;
  baseflow: number;
  quickflow: number;
  irrigationWithdrawal: number;
  publicSupplyWithdrawal: number;
  thermoelectricWithdrawal: number;
  totalWithdrawal: number;
  availabilityProxy: number;
  waterLimitationProxy: number;
  riskScore: number;
  risk: RiskLevel;
  confidence: number;
  strategy: ForecastStrategy;
  // Aliases for component compatibility
  alertThreshold: number;
  warningThreshold: number;
  currentTma: number;
  forecast6h: number;
  forecast24h: number;
  upstreamStations: string[];
  downstreamStations: string[];
  basinAreaKm2: number;
  population: number;
  supplyRatio: number;
  climatologyAnomalySigma: number;
  downstreamStationId: string | null;
}

export type StaticStation = StaticBasinNode;

export interface StaticEdge {
  id: string;
  source: string; // upstream
  target: string; // downstream receiving node
  sourceName: string;
  targetName: string;
  river: string;
  distanceKm: number;
  travelTimeHours: number;
  residualCorrelation: number;
  path: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface StaticRiver {
  id: string;
  name: string;
  type: "mainstem" | "tributary" | "headwater_channel";
  order: number;
  path: string;
}

export const NETWORK_METRICS = {
  totalForecastHuc12: 2982,
  historicalHuc12: 2196,
  demoNetworkNodes: 42,
  demoDirectedEdges: 41,
  headwaterNodesCount: 14,
  outletNodesCount: 2,
  maxGraphDepth: 7,
  meanUpstreamDegree: 1.14,
  coldStartNodesCount: 8,
  reachabilityHops: 3,
  catchmentAreaKm2: 24800,
  inferredAnnualCycle: "September → August",
  // Compatibility aliases
  totalStations: 42,
  primaryStations: 36,
  outsideStations: 6,
  demoSubBasins: 42,
  totalTestHuc12: 2982,
  directedEdges: 41,
  headwaterNodes: 14,
  outletNodes: 2,
  coldStartNodes: 8,
  meanSpacingKm: 18.4,
  coveragePercent: 100,
} as const;

export const STATIC_BASEMAP = {
  width: 1200,
  height: 700,
  // Catchment watershed boundary contour (SVG path)
  basinPath:
    "M180,190 C220,120 360,70 520,60 C690,50 870,80 1020,130 C1110,160 1150,250 1120,380 C1090,510 990,620 840,650 C680,680 480,650 340,590 C210,530 140,430 140,320 C140,260 160,220 180,190 Z",
  subBasinDivisions: [
    "M360,70 C410,210 440,320 460,420",
    "M690,50 C680,180 670,300 660,420",
    "M870,80 C840,220 820,340 800,480",
    "M340,590 C460,540 600,490 740,460",
  ],
};

export const STATIC_RIVERS: StaticRiver[] = [
  {
    id: "RIV-MAINSTEM",
    name: "Mainstem Central Corridor",
    type: "mainstem",
    order: 5,
    path: "M280,260 L380,290 L480,310 L580,330 L690,350 L800,380 L920,400 L1020,410 L1080,420",
  },
  {
    id: "RIV-NORTH-TRIB",
    name: "Northern Ridge Tributary",
    type: "tributary",
    order: 3,
    path: "M320,130 L400,180 L480,230 L580,330",
  },
  {
    id: "RIV-EAST-HIGHLAND",
    name: "Eastern Highland Fork",
    type: "tributary",
    order: 4,
    path: "M880,150 L840,240 L810,310 L800,380",
  },
  {
    id: "RIV-SOUTH-TRIB",
    name: "Southern Valley Branch",
    type: "tributary",
    order: 3,
    path: "M360,510 L460,470 L570,420 L690,350",
  },
  {
    id: "RIV-DELTA-CHANNEL",
    name: "Coastal Delta Estuary",
    type: "mainstem",
    order: 5,
    path: "M920,400 L1000,440 L1070,470",
  },
];

/** Raw node seeds that strictly observe physical river DAG direction: id -> downstreamId */
interface RawNodeSeed {
  id: string;
  name: string;
  x: number;
  y: number;
  downstreamId: string | null;
  category: BasinCategory;
  river: string;
  subBasin: string;
  elev: number;
  area: number;
  coldStart?: boolean;
  baseSupply: number;
  climatology: number;
  withdrawal: number;
  stressFactor: number;
}

const RAW_SEEDS: RawNodeSeed[] = [
  // --- NORTHERN RIDGE BRANCH (Headwaters -> Downstream) ---
  { id: "HUC-DEMO-0001", name: "Upper Pine Headwater", x: 230, y: 110, downstreamId: "HUC-DEMO-0005", category: "HEADWATER", river: "North Fork", subBasin: "Upper Ridge", elev: 620, area: 184, baseSupply: 142, climatology: 155, withdrawal: 18, stressFactor: 0.15 },
  { id: "HUC-DEMO-0002", name: "Granite Peak Basin", x: 310, y: 90, downstreamId: "HUC-DEMO-0005", category: "HEADWATER", river: "North Fork", subBasin: "Upper Ridge", elev: 590, area: 165, baseSupply: 138, climatology: 150, withdrawal: 22, stressFactor: 0.18 },
  { id: "HUC-DEMO-0003", name: "Highland Brook", x: 380, y: 110, downstreamId: "HUC-DEMO-0006", category: "HEADWATER", river: "North Fork", subBasin: "Upper Ridge", elev: 540, area: 195, baseSupply: 120, climatology: 148, withdrawal: 26, stressFactor: 0.22 },
  { id: "HUC-DEMO-0004", name: "Alpine Meadow Basin", x: 440, y: 130, downstreamId: "HUC-DEMO-0006", category: "HEADWATER", river: "North Fork", subBasin: "Upper Ridge", elev: 510, area: 210, baseSupply: 115, climatology: 142, withdrawal: 30, stressFactor: 0.24 },
  { id: "HUC-DEMO-0005", name: "North Ridge Confluence", x: 320, y: 160, downstreamId: "HUC-DEMO-0007", category: "TRIBUTARY", river: "North Fork", subBasin: "Upper Ridge", elev: 460, area: 380, baseSupply: 240, climatology: 290, withdrawal: 55, stressFactor: 0.28 },
  { id: "HUC-DEMO-0006", name: "Cedar Creek Reach", x: 410, y: 170, downstreamId: "HUC-DEMO-0007", category: "TRIBUTARY", river: "North Fork", subBasin: "Upper Ridge", elev: 430, area: 360, baseSupply: 220, climatology: 275, withdrawal: 62, stressFactor: 0.32 },
  { id: "HUC-DEMO-0007", name: "Upper Valley Junction", x: 390, y: 220, downstreamId: "HUC-DEMO-0008", category: "TRIBUTARY", river: "North Fork", subBasin: "Mid North", elev: 370, area: 590, baseSupply: 380, climatology: 490, withdrawal: 110, stressFactor: 0.45 },
  { id: "HUC-DEMO-0008", name: "Stony River Sub-Basin", x: 460, y: 250, downstreamId: "HUC-DEMO-0021", category: "TRIBUTARY", river: "North Fork", subBasin: "Mid North", elev: 310, area: 720, baseSupply: 420, climatology: 560, withdrawal: 165, stressFactor: 0.58 },

  // --- WESTERN HEADWATERS & MAINSTEM ORIGIN ---
  { id: "HUC-DEMO-0009", name: "West Pass Summit Basin", x: 190, y: 220, downstreamId: "HUC-DEMO-0011", category: "HEADWATER", river: "Mainstem Upper", subBasin: "West Headwaters", elev: 680, area: 240, baseSupply: 160, climatology: 175, withdrawal: 15, stressFactor: 0.12 },
  { id: "HUC-DEMO-0010", name: "Boulder Creek Catchment", x: 220, y: 290, downstreamId: "HUC-DEMO-0011", category: "HEADWATER", river: "Mainstem Upper", subBasin: "West Headwaters", elev: 610, area: 220, baseSupply: 145, climatology: 168, withdrawal: 20, stressFactor: 0.16 },
  { id: "HUC-DEMO-0011", name: "Upper Mainstem Portal", x: 260, y: 260, downstreamId: "HUC-DEMO-0012", category: "TRIBUTARY", river: "Mainstem Upper", subBasin: "West Headwaters", elev: 490, area: 490, baseSupply: 285, climatology: 330, withdrawal: 48, stressFactor: 0.25 },
  { id: "HUC-DEMO-0012", name: "Clearwater Gorge Reach", x: 330, y: 280, downstreamId: "HUC-DEMO-0013", category: "MAINSTEM", river: "Mainstem Upper", subBasin: "Upper Mainstem", elev: 390, area: 680, baseSupply: 370, climatology: 440, withdrawal: 85, stressFactor: 0.35 },
  { id: "HUC-DEMO-0013", name: "Forest Gate Sub-Basin", x: 410, y: 295, downstreamId: "HUC-DEMO-0021", category: "MAINSTEM", river: "Mainstem Upper", subBasin: "Upper Mainstem", elev: 320, area: 840, baseSupply: 480, climatology: 580, withdrawal: 130, stressFactor: 0.42 },

  // --- SOUTHERN VALLEY TRIBUTARIES ---
  { id: "HUC-DEMO-0014", name: "South Ridge Springs", x: 270, y: 540, downstreamId: "HUC-DEMO-0017", category: "HEADWATER", river: "South Fork", subBasin: "South Highland", elev: 580, area: 190, baseSupply: 85, climatology: 135, withdrawal: 42, stressFactor: 0.68 },
  { id: "HUC-DEMO-0015", name: "Iron Creek Headwaters", x: 340, y: 550, downstreamId: "HUC-DEMO-0017", category: "HEADWATER", river: "South Fork", subBasin: "South Highland", elev: 550, area: 175, baseSupply: 78, climatology: 130, withdrawal: 48, stressFactor: 0.74, coldStart: true },
  { id: "HUC-DEMO-0016", name: "Bear Canyon Basin", x: 420, y: 530, downstreamId: "HUC-DEMO-0018", category: "HEADWATER", river: "South Fork", subBasin: "South Highland", elev: 520, area: 215, baseSupply: 95, climatology: 145, withdrawal: 55, stressFactor: 0.71 },
  { id: "HUC-DEMO-0017", name: "South Fork Confluence", x: 330, y: 480, downstreamId: "HUC-DEMO-0019", category: "TRIBUTARY", river: "South Fork", subBasin: "South Highland", elev: 420, area: 410, baseSupply: 155, climatology: 260, withdrawal: 110, stressFactor: 0.78 },
  { id: "HUC-DEMO-0018", name: "Dry Creek Intermediate Reach", x: 430, y: 470, downstreamId: "HUC-DEMO-0019", category: "TRIBUTARY", river: "South Fork", subBasin: "South Valley", elev: 380, area: 380, baseSupply: 140, climatology: 250, withdrawal: 105, stressFactor: 0.82, coldStart: true },
  { id: "HUC-DEMO-0019", name: "Lower South Agricultural Reach", x: 420, y: 420, downstreamId: "HUC-DEMO-0020", category: "TRIBUTARY", river: "South Fork", subBasin: "South Valley", elev: 310, area: 850, baseSupply: 270, climatology: 480, withdrawal: 240, stressFactor: 0.86 },
  { id: "HUC-DEMO-0020", name: "Willow Bend Sub-Basin", x: 510, y: 390, downstreamId: "HUC-DEMO-0022", category: "TRIBUTARY", river: "South Fork", subBasin: "South Valley", elev: 260, area: 990, baseSupply: 310, climatology: 560, withdrawal: 290, stressFactor: 0.88 },

  // --- CENTRAL CONFLUENCE & AGRICULTURAL CORRIDOR ---
  { id: "HUC-DEMO-0021", name: "Tri-River Central Confluence", x: 500, y: 320, downstreamId: "HUC-DEMO-0022", category: "MAINSTEM", river: "Mainstem Central", subBasin: "Central Valley", elev: 270, area: 1820, baseSupply: 980, climatology: 1320, withdrawal: 380, stressFactor: 0.52 },
  { id: "HUC-DEMO-0022", name: "Verde Valley Agricultural Reach", x: 590, y: 340, downstreamId: "HUC-DEMO-0023", category: "MAINSTEM", river: "Mainstem Central", subBasin: "Central Valley", elev: 230, area: 2450, baseSupply: 1240, climatology: 1820, withdrawal: 680, stressFactor: 0.71 },
  { id: "HUC-DEMO-0023", name: "Mid-Basin Barrage Reservoir", x: 670, y: 350, downstreamId: "HUC-DEMO-0030", category: "MAINSTEM", river: "Mainstem Central", subBasin: "Central Valley", elev: 190, area: 3100, baseSupply: 1450, climatology: 2150, withdrawal: 840, stressFactor: 0.76 },

  // --- EASTERN HIGHLAND FORK (Tributary entering from East) ---
  { id: "HUC-DEMO-0024", name: "Eastern Ridge Snowmelt Basin", x: 910, y: 130, downstreamId: "HUC-DEMO-0027", category: "HEADWATER", river: "East Fork", subBasin: "Eastern Highlands", elev: 640, area: 210, baseSupply: 130, climatology: 145, withdrawal: 16, stressFactor: 0.17 },
  { id: "HUC-DEMO-0025", name: "Blue Ridge Headwater", x: 860, y: 150, downstreamId: "HUC-DEMO-0027", category: "HEADWATER", river: "East Fork", subBasin: "Eastern Highlands", elev: 590, area: 195, baseSupply: 125, climatology: 140, withdrawal: 20, stressFactor: 0.19 },
  { id: "HUC-DEMO-0026", name: "Silver Spring Catchment", x: 790, y: 160, downstreamId: "HUC-DEMO-0028", category: "HEADWATER", river: "East Fork", subBasin: "Eastern Highlands", elev: 550, area: 185, baseSupply: 110, climatology: 135, withdrawal: 24, stressFactor: 0.23, coldStart: true },
  { id: "HUC-DEMO-0027", name: "Upper East Fork Reach", x: 860, y: 220, downstreamId: "HUC-DEMO-0029", category: "TRIBUTARY", river: "East Fork", subBasin: "Eastern Highlands", elev: 440, area: 460, baseSupply: 245, climatology: 280, withdrawal: 50, stressFactor: 0.26 },
  { id: "HUC-DEMO-0028", name: "Shadyside Tributary Reach", x: 790, y: 230, downstreamId: "HUC-DEMO-0029", category: "TRIBUTARY", river: "East Fork", subBasin: "Eastern Highlands", elev: 400, area: 420, baseSupply: 220, climatology: 265, withdrawal: 58, stressFactor: 0.30 },
  { id: "HUC-DEMO-0029", name: "Eastern Foothills Confluence", x: 810, y: 300, downstreamId: "HUC-DEMO-0030", category: "TRIBUTARY", river: "East Fork", subBasin: "Eastern Transition", elev: 280, area: 950, baseSupply: 480, climatology: 580, withdrawal: 135, stressFactor: 0.38 },

  // --- LOWER MAINSTEM & CONVERGENCE ---
  { id: "HUC-DEMO-0030", name: "Grand Confluence Reach", x: 740, y: 370, downstreamId: "HUC-DEMO-0031", category: "MAINSTEM", river: "Lower Mainstem", subBasin: "Lower Basin", elev: 160, area: 4250, baseSupply: 1980, climatology: 2780, withdrawal: 960, stressFactor: 0.65 },
  { id: "HUC-DEMO-0031", name: "Valley Crossing Industrial Reach", x: 810, y: 390, downstreamId: "HUC-DEMO-0032", category: "MAINSTEM", river: "Lower Mainstem", subBasin: "Lower Basin", elev: 120, area: 5400, baseSupply: 2240, climatology: 3200, withdrawal: 1180, stressFactor: 0.70 },
  { id: "HUC-DEMO-0032", name: "Canyon Gate Reach", x: 880, y: 400, downstreamId: "HUC-DEMO-0035", category: "MAINSTEM", river: "Lower Mainstem", subBasin: "Lower Basin", elev: 85, area: 6800, baseSupply: 2480, climatology: 3600, withdrawal: 1340, stressFactor: 0.74 },

  // --- SOUTHEAST SHORELINE TRIBUTARY ---
  { id: "HUC-DEMO-0033", name: "South Lake Overflow", x: 620, y: 550, downstreamId: "HUC-DEMO-0034", category: "HEADWATER", river: "Coastal Canal", subBasin: "Southeast Coastal", elev: 310, area: 220, baseSupply: 90, climatology: 150, withdrawal: 55, stressFactor: 0.75, coldStart: true },
  { id: "HUC-DEMO-0034", name: "Marshland Lateral Channel", x: 710, y: 500, downstreamId: "HUC-DEMO-0035", category: "TRIBUTARY", river: "Coastal Canal", subBasin: "Southeast Coastal", elev: 180, area: 460, baseSupply: 160, climatology: 270, withdrawal: 110, stressFactor: 0.79 },

  // --- DELTA & ESTUARY (Terminal Reaches) ---
  { id: "HUC-DEMO-0035", name: "Delta Head Confluence", x: 940, y: 410, downstreamId: "HUC-DEMO-0036", category: "MAINSTEM", river: "Delta Reach", subBasin: "Delta Estuary", elev: 52, area: 7800, baseSupply: 2650, climatology: 3950, withdrawal: 1480, stressFactor: 0.72 },
  { id: "HUC-DEMO-0036", name: "Upper Delta Canal Zone", x: 980, y: 390, downstreamId: "HUC-DEMO-0037", category: "MAINSTEM", river: "Delta Reach", subBasin: "Delta Estuary", elev: 34, area: 8900, baseSupply: 2800, climatology: 4200, withdrawal: 1600, stressFactor: 0.69 },
  { id: "HUC-DEMO-0037", name: "North Delta Distributary", x: 1040, y: 370, downstreamId: "HUC-DEMO-0041", category: "MAINSTEM", river: "Delta Reach", subBasin: "Delta Estuary", elev: 18, area: 4800, baseSupply: 1520, climatology: 2280, withdrawal: 840, stressFactor: 0.64 },
  { id: "HUC-DEMO-0038", name: "South Delta Distributary", x: 1010, y: 450, downstreamId: "HUC-DEMO-0039", category: "TRIBUTARY", river: "Delta Reach", subBasin: "Delta Estuary", elev: 22, area: 4500, baseSupply: 1410, climatology: 2150, withdrawal: 810, stressFactor: 0.67, coldStart: true },
  { id: "HUC-DEMO-0039", name: "Estuary Salt-Wedge Reach", x: 1060, y: 480, downstreamId: "HUC-DEMO-0042", category: "TRIBUTARY", river: "Coastal Outfall", subBasin: "Delta Estuary", elev: 10, area: 4700, baseSupply: 1460, climatology: 2200, withdrawal: 850, stressFactor: 0.70, coldStart: true },
  { id: "HUC-DEMO-0040", name: "Bay Harbor Canal", x: 1020, y: 530, downstreamId: "HUC-DEMO-0042", category: "HEADWATER", river: "Coastal Outfall", subBasin: "Coastal Fringe", elev: 45, area: 180, baseSupply: 75, climatology: 125, withdrawal: 45, stressFactor: 0.66, coldStart: true },
  { id: "HUC-DEMO-0041", name: "Northern Bay Terminal Outlet", x: 1110, y: 360, downstreamId: null, category: "OUTLET", river: "Ocean Terminal", subBasin: "Marine Outfall", elev: 2, area: 12500, baseSupply: 1720, climatology: 2540, withdrawal: 890, stressFactor: 0.61 },
  { id: "HUC-DEMO-0042", name: "Southern Bay Terminal Outlet", x: 1120, y: 480, downstreamId: null, category: "OUTLET", river: "Ocean Terminal", subBasin: "Marine Outfall", elev: 1, area: 12300, baseSupply: 1680, climatology: 2480, withdrawal: 920, stressFactor: 0.68 },
];

/** Graph propagation: derive ancestors, descendants, depth, and reachability */
const downstreamMap: Record<string, string | null> = {};
const upstreamMap: Record<string, string[]> = {};

RAW_SEEDS.forEach((s) => {
  downstreamMap[s.id] = s.downstreamId;
  upstreamMap[s.id] = [];
});

RAW_SEEDS.forEach((s) => {
  if (s.downstreamId && upstreamMap[s.downstreamId]) {
    upstreamMap[s.downstreamId].push(s.id);
  }
});

// Calculate graph depth (distance from headwater)
function computeDepth(id: string): number {
  const ups = upstreamMap[id] || [];
  if (ups.length === 0) return 0;
  return 1 + Math.max(...ups.map(computeDepth));
}

// Calculate distance to terminal outlet
function computeOutletDistance(id: string): number {
  const down = downstreamMap[id];
  if (!down) return 0;
  return 24 + computeOutletDistance(down);
}

// Compute all transitive ancestors (upstream nodes)
export function getAncestors(id: string): string[] {
  const visited = new Set<string>();
  function dfs(curr: string) {
    const ups = upstreamMap[curr] || [];
    for (const u of ups) {
      if (!visited.has(u)) {
        visited.add(u);
        dfs(u);
      }
    }
  }
  dfs(id);
  return Array.from(visited);
}

// Compute all transitive descendants (downstream path to outlet)
export function getDescendants(id: string): string[] {
  const result: string[] = [];
  let curr = downstreamMap[id];
  while (curr) {
    if (result.includes(curr)) break; // cycle protection
    result.push(curr);
    curr = downstreamMap[curr] ?? null;
  }
  return result;
}

// Get 1-hop upstream nodes
export function getUpstream1Hop(id: string): string[] {
  return upstreamMap[id] || [];
}

// Get 2-hop upstream nodes
export function getUpstream2Hop(id: string): string[] {
  const hop1 = getUpstream1Hop(id);
  const hop2 = new Set<string>();
  hop1.forEach((h1) => {
    (upstreamMap[h1] || []).forEach((h2) => hop2.add(h2));
  });
  return Array.from(hop2);
}

// Get 3-hop upstream nodes
export function getUpstream3Hop(id: string): string[] {
  const hop2 = getUpstream2Hop(id);
  const hop3 = new Set<string>();
  hop2.forEach((h2) => {
    (upstreamMap[h2] || []).forEach((h3) => hop3.add(h3));
  });
  return Array.from(hop3);
}

// Get full downstream path
export function getDownstreamPath(id: string): string[] {
  return getDescendants(id);
}

/** Construct full static station / basin objects */
export const STATIC_STATIONS: StaticBasinNode[] = RAW_SEEDS.map((s, idx) => {
  const depth = computeDepth(s.id);
  const outletDist = computeOutletDistance(s.id);
  const isHeadwater = (upstreamMap[s.id] || []).length === 0;
  const isColdStart = Boolean(s.coldStart);

  // Hydrological base values
  const streamflow = Number((s.baseSupply * 0.88).toFixed(1));
  const baseflow = Number((streamflow * 0.62).toFixed(1));
  const quickflow = Number((streamflow * 0.38).toFixed(1));
  const totalWithdrawal = s.withdrawal;
  const irrigationWithdrawal = Number((totalWithdrawal * 0.65).toFixed(1));
  const publicSupplyWithdrawal = Number((totalWithdrawal * 0.22).toFixed(1));
  const thermoelectricWithdrawal = Number((totalWithdrawal * 0.13).toFixed(1));

  // Availability proxy = Supply - Withdrawal
  const availabilityProxy = Number((streamflow - totalWithdrawal).toFixed(1));

  // Water-limitation proxy = 1 - (Availability / Climatology)
  const waterLimitationProxy = Number(
    Math.max(0, Math.min(1, 1 - availabilityProxy / Math.max(1, s.climatology))).toFixed(3)
  );

  // Model-predicted probability P(water stress at month t+1) in [0, 1]
  const rawRisk = s.stressFactor;
  const riskScore = Number(rawRisk.toFixed(2));

  let riskTier: RiskLevel = "LOW";
  if (riskScore >= 0.75) riskTier = "CRITICAL";
  else if (riskScore >= 0.50) riskTier = "HIGH";
  else if (riskScore >= 0.25) riskTier = "MODERATE";

  // Confidence is lower for cold-start spatial basins
  const confidence = isColdStart ? 0.72 : 0.88;

  const strategy: ForecastStrategy = isHeadwater
    ? "TABULAR_BASELINE"
    : depth > 3
    ? "DIRECTED_GNN"
    : "GRAPH_CATBOOST";

  // Coordinates approximate geographic basin in Java
  const lat = -7.45 + (s.y - 350) * 0.0028;
  const lon = 111.45 + (s.x - 600) * 0.0035;

  const ups = upstreamMap[s.id] || [];
  const down = s.downstreamId ? [s.downstreamId] : [];

  return {
    id: s.id,
    name: s.name,
    code: s.id,
    x: s.x,
    y: s.y,
    latitude: Number(lat.toFixed(4)),
    longitude: Number(lon.toFixed(4)),
    category: s.category,
    river: s.river,
    basin: "Directed River Basin System",
    subBasin: s.subBasin,
    primary: true,
    elevationM: s.elev,
    catchmentKm2: s.area,
    graphDepth: depth,
    headwater: isHeadwater,
    outletDistanceKm: outletDist,
    coldStart: isColdStart,
    downstreamId: s.downstreamId,
    upstreamIds: ups,
    ancestors: getAncestors(s.id),
    descendants: getDescendants(s.id),
    climatology: s.climatology,
    currentSupply: streamflow,
    streamflow,
    baseflow,
    quickflow,
    irrigationWithdrawal,
    publicSupplyWithdrawal,
    thermoelectricWithdrawal,
    totalWithdrawal,
    availabilityProxy,
    waterLimitationProxy,
    riskScore,
    risk: riskTier,
    confidence,
    strategy,
    // Aliases
    alertThreshold: 0.75,
    warningThreshold: 0.50,
    currentTma: streamflow,
    forecast6h: riskScore,
    forecast24h: riskScore,
    upstreamStations: ups,
    downstreamStations: down,
    basinAreaKm2: s.area,
    population: Math.round(s.area * (s.category === "MAINSTEM" ? 180 : s.category === "OUTLET" ? 220 : 45)),
    supplyRatio: Number((streamflow / Math.max(1, s.climatology)).toFixed(3)),
    climatologyAnomalySigma: Number(((streamflow - s.climatology) / (s.climatology * 0.28)).toFixed(2)),
    downstreamStationId: s.downstreamId,
  };
});

export const STATIC_STATION_MAP: Record<string, StaticBasinNode> = Object.fromEntries(
  STATIC_STATIONS.map((s) => [s.id, s])
);

/** Build directed edges connecting each node to its downstream receiving node */
export const STATIC_EDGES: StaticEdge[] = RAW_SEEDS.filter((s) => s.downstreamId !== null).map((s) => {
  const target = STATIC_STATION_MAP[s.downstreamId!];
  const source = STATIC_STATION_MAP[s.id];
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy) * 0.45; // km
  const travelTime = Number((dist / 3.8).toFixed(1)); // hours

  // Smooth quadratic or cubic bezier curve path between source and target
  const midX = (source.x + target.x) / 2 + (dy > 0 ? 12 : -12);
  const midY = (source.y + target.y) / 2 + (dx > 0 ? -8 : 8);
  const path = `M${source.x},${source.y} Q${midX},${midY} ${target.x},${target.y}`;

  return {
    id: `EDGE-${source.id}-${target.id}`,
    source: source.id,
    target: target.id,
    sourceName: source.name,
    targetName: target.name,
    river: source.river,
    distanceKm: Number(dist.toFixed(1)),
    travelTimeHours: travelTime,
    residualCorrelation: Number((0.72 + (0.24 * (source.elevationM - target.elevationM)) / 500).toFixed(2)),
    path,
    x1: source.x,
    y1: source.y,
    x2: target.x,
    y2: target.y,
  };
});

export function getStationById(id: string): StaticBasinNode | undefined {
  return STATIC_STATION_MAP[id];
}

