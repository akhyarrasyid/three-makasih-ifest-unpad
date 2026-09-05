const fs = require('fs');
const path = require('path');

function cleanCollection(filePath, transformProps) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const clean = {
    type: 'FeatureCollection',
    features: raw.features.map((f) => {
      const props = transformProps ? transformProps(f.properties) : f.properties;
      return {
        type: 'Feature',
        id: f.id || props.id,
        properties: props,
        geometry: f.geometry,
      };
    }),
  };
  fs.writeFileSync(filePath, JSON.stringify(clean, null, 2), 'utf8');
  console.log('Sanitized', filePath, 'features:', clean.features.length);
  return clean;
}

// 1. Stations
const stationsPath = path.join(__dirname, '../public/geodata/stations.geojson');
cleanCollection(stationsPath, (props) => {
  const isPrimary = props.primary === true || props.networkRole === 'primary';
  return {
    id: props.id,
    name: props.name,
    networkRole: isPrimary ? 'primary' : 'secondary',
    primary: isPrimary,
    category: props.category || 'NATURAL',
    river: props.river || 'Bengawan Solo',
    elevation: props.elevation || 50,
    catchmentKm2: props.catchmentKm2 || 1000,
    downstream: props.downstream || null,
    risk: props.risk || (props.id === 'BS-004' ? 'HIGH' : props.id === 'BS-014' ? 'MODERATE' : 'LOW'),
    currentTma: props.currentTma || (props.alertThreshold ? props.alertThreshold * 0.65 : 2.5),
    alertThreshold: props.alertThreshold || 5.0,
    warningThreshold: props.warningThreshold || 4.0,
  };
});

// 2. Network Edges
const edgesPath = path.join(__dirname, '../public/geodata/network-edges.geojson');
cleanCollection(edgesPath, (props) => ({
  id: props.id,
  source: props.source,
  target: props.target,
  sourceName: props.sourceName,
  targetName: props.targetName,
  river: props.river,
  distanceKm: props.distanceKm,
  travelTimeHours: props.travelTimeHours,
  residualCorrelation: props.residualCorrelation,
  flowDirection: 'downstream',
  relationship: 'downstream',
  primary: true,
}));

// 3. Rivers
const riversPath = path.join(__dirname, '../public/geodata/bengawan-solo.geojson');
cleanCollection(riversPath, (props) => ({
  id: props.id,
  name: props.name,
  type: props.type,
  stream_order: props.stream_order,
  length_km: props.length_km,
  primary_reach: props.primary_reach,
}));

// 4. Basin
const basinPath = path.join(__dirname, '../public/geodata/basin.geojson');
cleanCollection(basinPath);

// 5. Provinces
const provincesPath = path.join(__dirname, '../public/geodata/provinces.geojson');
cleanCollection(provincesPath);

// 6. Java
const javaPath = path.join(__dirname, '../public/geodata/java.geojson');
cleanCollection(javaPath);

console.log('All GeoJSON files sanitized successfully!');
