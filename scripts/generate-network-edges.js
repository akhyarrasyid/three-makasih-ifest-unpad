const fs = require('fs');
const path = require('path');

const stationsPath = path.join(__dirname, '../public/geodata/stations.geojson');
const riverPath = path.join(__dirname, '../public/geodata/bengawan-solo.geojson');

const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));
const riverData = JSON.parse(fs.readFileSync(riverPath, 'utf8'));

// Build coordinate lookup and station lookup
const stationMap = {};
stationsData.features.forEach(f => {
  stationMap[f.properties.id] = {
    id: f.properties.id,
    name: f.properties.name,
    coords: f.geometry.coordinates,
    downstream: f.properties.downstream,
    primary: f.properties.primary,
    category: f.properties.category,
    river: f.properties.river
  };
});

// Map of river geometries
const riverMap = {};
riverData.features.forEach(f => {
  riverMap[f.properties.id] = f.geometry.coordinates;
});

// Helper to extract sub-path between two coordinates on a river
function sliceCoords(fullCoords, startPt, endPt) {
  function findClosestIndex(coords, pt) {
    let bestIdx = 0;
    let minDist = Infinity;
    coords.forEach((c, idx) => {
      const d = Math.hypot(c[0] - pt[0], c[1] - pt[1]);
      if (d < minDist) {
        minDist = d;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  const i1 = findClosestIndex(fullCoords, startPt);
  const i2 = findClosestIndex(fullCoords, endPt);
  let sub = [];
  if (i1 <= i2) {
    sub = fullCoords.slice(i1, i2 + 1);
  } else {
    sub = fullCoords.slice(i2, i1 + 1).reverse();
  }
  // Ensure exact start and end points
  if (sub.length < 2) {
    sub = [startPt, endPt];
  } else {
    sub[0] = startPt;
    sub[sub.length - 1] = endPt;
  }
  return sub;
}

// 24 primary edges connecting the 25 primary stations
const primaryEdges = [
  { source: 'BS-022', target: 'BS-001', riverId: 'RIV-TIRTOMOYO', distKm: 18.5, timeH: 4.2, corr: 0.74 },
  { source: 'BS-021', target: 'BS-001', riverId: 'RIV-KEDUANG', distKm: 14.2, timeH: 3.1, corr: 0.82 },
  { source: 'BS-001', target: 'BS-002', riverId: 'RIV-MAINSTEM', distKm: 16.8, timeH: 3.8, corr: 0.88 },
  { source: 'BS-002', target: 'BS-003', riverId: 'RIV-MAINSTEM', distKm: 5.4, timeH: 1.2, corr: 0.94 },
  { source: 'BS-003', target: 'BS-004', riverId: 'RIV-MAINSTEM', distKm: 22.1, timeH: 4.9, corr: 0.86 },
  { source: 'BS-005', target: 'BS-004', riverId: 'RIV-DENGKENG', distKm: 24.6, timeH: 5.2, corr: 0.76 },
  { source: 'BS-020', target: 'BS-004', riverId: 'RIV-SAMIN', distKm: 15.3, timeH: 3.4, corr: 0.81 },
  { source: 'BS-004', target: 'BS-007', riverId: 'RIV-MAINSTEM', distKm: 28.7, timeH: 6.1, corr: 0.89 },
  { source: 'BS-006', target: 'BS-007', riverId: 'RIV-PEPE', distKm: 26.3, timeH: 5.8, corr: 0.78 },
  { source: 'BS-007', target: 'BS-025', riverId: 'RIV-MAINSTEM', distKm: 27.4, timeH: 5.6, corr: 0.87 },
  { source: 'BS-025', target: 'BS-011', riverId: 'RIV-MAINSTEM', distKm: 24.8, timeH: 5.1, corr: 0.85 },
  { source: 'BS-008', target: 'BS-009', riverId: 'RIV-MADIUN', distKm: 12.4, timeH: 2.8, corr: 0.86 },
  { source: 'BS-009', target: 'BS-010', riverId: 'RIV-MADIUN', distKm: 31.2, timeH: 6.8, corr: 0.84 },
  { source: 'BS-013', target: 'BS-012', riverId: 'RIV-GANDONG', distKm: 16.5, timeH: 3.6, corr: 0.79 },
  { source: 'BS-010', target: 'BS-012', riverId: 'RIV-MADIUN', distKm: 18.2, timeH: 4.0, corr: 0.91 },
  { source: 'BS-012', target: 'BS-011', riverId: 'RIV-MADIUN', distKm: 22.7, timeH: 4.8, corr: 0.88 },
  { source: 'BS-011', target: 'BS-014', riverId: 'RIV-MAINSTEM', distKm: 38.5, timeH: 8.2, corr: 0.83 },
  { source: 'BS-014', target: 'BS-024', riverId: 'RIV-MAINSTEM', distKm: 17.6, timeH: 3.9, corr: 0.92 },
  { source: 'BS-024', target: 'BS-015', riverId: 'RIV-MAINSTEM', distKm: 26.8, timeH: 5.7, corr: 0.89 },
  { source: 'BS-023', target: 'BS-015', riverId: 'RIV-KENING', distKm: 28.1, timeH: 6.2, corr: 0.77 },
  { source: 'BS-015', target: 'BS-016', riverId: 'RIV-MAINSTEM', distKm: 34.2, timeH: 7.4, corr: 0.86 },
  { source: 'BS-016', target: 'BS-017', riverId: 'RIV-MAINSTEM', distKm: 21.3, timeH: 4.8, corr: 0.90 },
  { source: 'BS-017', target: 'BS-018', riverId: 'RIV-MAINSTEM', distKm: 27.5, timeH: 6.0, corr: 0.87 },
  { source: 'BS-018', target: 'BS-019', riverId: 'RIV-MAINSTEM', distKm: 15.6, timeH: 3.5, corr: 0.93 },
];

const edgeFeatures = primaryEdges.map((e, idx) => {
  const s = stationMap[e.source];
  const t = stationMap[e.target];
  const riverCoords = riverMap[e.riverId] || [s.coords, t.coords];
  const edgeCoords = sliceCoords(riverCoords, s.coords, t.coords);

  return {
    type: 'Feature',
    id: `EDGE-${e.source}-${e.target}`,
    properties: {
      id: `EDGE-${e.source}-${e.target}`,
      edgeIndex: idx + 1,
      source: e.source,
      target: e.target,
      sourceName: s.name,
      targetName: t.name,
      river: s.river,
      distanceKm: e.distKm,
      travelTimeHours: e.timeH,
      residualCorrelation: e.corr,
      flowDirection: 'downstream',
      primary: true
    },
    geometry: {
      type: 'LineString',
      coordinates: edgeCoords
    }
  };
});

const networkEdgesGeoJson = {
  type: 'FeatureCollection',
  name: 'bengawan_solo_primary_network_edges',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  features: edgeFeatures
};

const outputPath = path.join(__dirname, '../public/geodata/network-edges.geojson');
fs.writeFileSync(outputPath, JSON.stringify(networkEdgesGeoJson, null, 2));
console.log('Successfully wrote', edgeFeatures.length, 'primary network edges to', outputPath);
