const fs = require('fs');
const d3Geo = require('d3-geo');

const W = 1200, H = 700;
const proj = d3Geo.geoMercator().fitExtent([[90, 60], [W - 90, H - 60]], {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[110.45, -8.35], [112.75, -6.75]]
    }
  }]
});
const pathGen = d3Geo.geoPath(proj);

const java = JSON.parse(fs.readFileSync('public/geodata/java.geojson', 'utf8'));
const basin = JSON.parse(fs.readFileSync('public/geodata/basin.geojson', 'utf8'));
const provinces = JSON.parse(fs.readFileSync('public/geodata/provinces.geojson', 'utf8'));
const rivers = JSON.parse(fs.readFileSync('public/geodata/bengawan-solo.geojson', 'utf8'));
const edgesGeo = JSON.parse(fs.readFileSync('public/geodata/network-edges.geojson', 'utf8'));
const stationsGeo = JSON.parse(fs.readFileSync('public/geodata/stations.geojson', 'utf8'));

const javaPath = pathGen(java) || '';
const basinPath = pathGen(basin) || '';
const provincesPath = pathGen(provinces) || '';

const riverPaths = rivers.features.map(f => ({
  id: f.id,
  name: f.properties.name,
  type: f.properties.type,
  order: f.properties.stream_order || (f.properties.type === 'mainstem' ? 5 : 3),
  path: pathGen(f.geometry) || ''
}));

const stationMap = new Map();
stationsGeo.features.forEach(f => {
  stationMap.set(f.properties.id, f.properties);
});

function getUpstream(id) {
  const up = [];
  stationsGeo.features.forEach(f => {
    if (f.properties.downstream === id) up.push(f.properties.id);
  });
  return up;
}

function getAncestors(id) {
  const out = [];
  const q = [id];
  const seen = new Set([id]);
  while(q.length) {
    const cur = q.shift();
    const up = getUpstream(cur);
    for (const u of up) {
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
        q.push(u);
      }
    }
  }
  return out;
}

function getDescendants(id) {
  const out = [];
  let cur = stationMap.get(id)?.downstream;
  while(cur) {
    out.push(cur);
    cur = stationMap.get(cur)?.downstream;
  }
  return out;
}

const stations = stationsGeo.features.map(f => {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const [x, y] = proj([lon, lat]);
  const up = getUpstream(p.id);
  const down = p.downstream ? [p.downstream] : [];
  const anc = getAncestors(p.id);
  const desc = getDescendants(p.id);
  
  return {
    id: p.id,
    name: p.name,
    code: p.id,
    latitude: lat,
    longitude: lon,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    category: p.category,
    river: p.river,
    basin: p.primary ? 'Bengawan Solo' : p.river.replace('Kali ', '') + ' Basin',
    primary: p.primary,
    elevationM: p.elevation,
    catchmentKm2: p.catchmentKm2,
    alertThreshold: p.alertThreshold,
    warningThreshold: p.warningThreshold,
    currentTma: p.currentTma,
    forecast6h: Math.round((p.currentTma * (p.primary ? 1.05 : 1.02)) * 100) / 100,
    forecast24h: Math.round((p.currentTma * (p.primary ? 1.12 : 1.04)) * 100) / 100,
    risk: p.risk,
    strategy: p.category === 'DAM_WEIR' ? 'CLIMATOLOGY' : p.category === 'MIXED' ? 'HYBRID' : 'DIRECT_MULTI_HORIZON',
    upstreamStations: up,
    downstreamStations: down,
    ancestors: anc,
    descendants: desc
  };
});

const stationPosMap = new Map(stations.map(s => [s.id, { x: s.x, y: s.y }]));

const edges = edgesGeo.features.map(f => {
  const p = f.properties;
  const sp = stationPosMap.get(p.source);
  const tp = stationPosMap.get(p.target);
  return {
    id: p.id,
    source: p.source,
    target: p.target,
    sourceName: p.sourceName,
    targetName: p.targetName,
    river: p.river,
    distanceKm: p.distanceKm,
    travelTimeHours: p.travelTimeHours,
    residualCorrelation: p.residualCorrelation,
    path: pathGen(f.geometry) || '',
    x1: sp.x,
    y1: sp.y,
    x2: tp.x,
    y2: tp.y
  };
});

const lines = [];
lines.push('// Precomputed static geospatial data & network topology for ANCHOR River Network workspace');
lines.push('// All 30 stations, 24 primary tree edges, and simplified cartography');
lines.push('');
lines.push('export interface StaticStation {');
lines.push('  id: string;');
lines.push('  name: string;');
lines.push('  code: string;');
lines.push('  latitude: number;');
lines.push('  longitude: number;');
lines.push('  x: number;');
lines.push('  y: number;');
lines.push('  category: "DAM_WEIR" | "MIXED" | "NATURAL";');
lines.push('  river: string;');
lines.push('  basin: string;');
lines.push('  primary: boolean;');
lines.push('  elevationM: number;');
lines.push('  catchmentKm2: number;');
lines.push('  alertThreshold: number;');
lines.push('  warningThreshold: number;');
lines.push('  currentTma: number;');
lines.push('  forecast6h: number;');
lines.push('  forecast24h: number;');
lines.push('  risk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";');
lines.push('  strategy: "CLIMATOLOGY" | "HYBRID" | "DIRECT_MULTI_HORIZON";');
lines.push('  upstreamStations: string[];');
lines.push('  downstreamStations: string[];');
lines.push('  ancestors: string[];');
lines.push('  descendants: string[];');
lines.push('}');
lines.push('');
lines.push('export interface StaticEdge {');
lines.push('  id: string;');
lines.push('  source: string;');
lines.push('  target: string;');
lines.push('  sourceName: string;');
lines.push('  targetName: string;');
lines.push('  river: string;');
lines.push('  distanceKm: number;');
lines.push('  travelTimeHours: number;');
lines.push('  residualCorrelation: number;');
lines.push('  path: string;');
lines.push('  x1: number;');
lines.push('  y1: number;');
lines.push('  x2: number;');
lines.push('  y2: number;');
lines.push('}');
lines.push('');
lines.push('export interface StaticRiver {');
lines.push('  id: string;');
lines.push('  name: string;');
lines.push('  type: string;');
lines.push('  order: number;');
lines.push('  path: string;');
lines.push('}');
lines.push('');
lines.push('export const NETWORK_METRICS = {');
lines.push('  totalStations: 30,');
lines.push('  primaryStations: 25,');
lines.push('  outsideStations: 5,');
lines.push('  connectedComponents: 1,');
lines.push('  primaryNodes: 25,');
lines.push('  primaryEdges: 24,');
lines.push('  meanSpacingKm: 22.3,');
lines.push('  coveragePercent: 83.3,');
lines.push('  basinAreaKm2: 16100,');
lines.push('  meanResidualCorrelation: 0.854,');
lines.push('} as const;');
lines.push('');
lines.push('export const STATIC_BASEMAP = {');
lines.push(`  width: ${W},`);
lines.push(`  height: ${H},`);
lines.push(`  javaPath: ${JSON.stringify(javaPath)},`);
lines.push(`  basinPath: ${JSON.stringify(basinPath)},`);
lines.push(`  provincesPath: ${JSON.stringify(provincesPath)},`);
lines.push('};');
lines.push('');
lines.push(`export const STATIC_RIVERS: StaticRiver[] = ${JSON.stringify(riverPaths, null, 2)};`);
lines.push('');
lines.push(`export const STATIC_STATIONS: StaticStation[] = ${JSON.stringify(stations, null, 2)};`);
lines.push('');
lines.push('export const STATIC_STATION_MAP: Record<string, StaticStation> = Object.fromEntries(');
lines.push('  STATIC_STATIONS.map((s) => [s.id, s])');
lines.push(');');
lines.push('');
lines.push(`export const STATIC_EDGES: StaticEdge[] = ${JSON.stringify(edges, null, 2)};`);
lines.push('');

if (!fs.existsSync('src/data')) {
  fs.mkdirSync('src/data', { recursive: true });
}
fs.writeFileSync('src/data/network-static.ts', lines.join('\n'), 'utf8');
console.log('Done writing src/data/network-static.ts, size:', fs.statSync('src/data/network-static.ts').size);
