const fs = require('fs');
const path = require('path');

const javaPath = path.join(__dirname, '../public/geodata/java.geojson');
const provincesPath = path.join(__dirname, '../public/geodata/provinces.geojson');
const basinPath = path.join(__dirname, '../public/geodata/basin.geojson');
const riversPath = path.join(__dirname, '../public/geodata/bengawan-solo.geojson');
const stationsPath = path.join(__dirname, '../public/geodata/stations.geojson');
const edgesPath = path.join(__dirname, '../public/geodata/network-edges.geojson');

const java = fs.readFileSync(javaPath, 'utf8');
const provinces = fs.readFileSync(provincesPath, 'utf8');
const basin = fs.readFileSync(basinPath, 'utf8');
const rivers = fs.readFileSync(riversPath, 'utf8');
const stations = fs.readFileSync(stationsPath, 'utf8');
const edges = fs.readFileSync(edgesPath, 'utf8');

const regionalLabels = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'JAWA TENGAH', type: 'province' }, geometry: { type: 'Point', coordinates: [110.45, -7.30] } },
    { type: 'Feature', properties: { name: 'JAWA TIMUR', type: 'province' }, geometry: { type: 'Point', coordinates: [112.15, -7.55] } },
    { type: 'Feature', properties: { name: 'LAUT JAWA (Java Sea)', type: 'water' }, geometry: { type: 'Point', coordinates: [111.75, -6.55] } },
    { type: 'Feature', properties: { name: 'SAMUDERA HINDIA', type: 'water' }, geometry: { type: 'Point', coordinates: [111.35, -8.45] } },
    { type: 'Feature', properties: { name: 'Solo / Surakarta', type: 'city' }, geometry: { type: 'Point', coordinates: [110.83, -7.57] } },
    { type: 'Feature', properties: { name: 'Madiun', type: 'city' }, geometry: { type: 'Point', coordinates: [111.52, -7.63] } },
    { type: 'Feature', properties: { name: 'Bojonegoro', type: 'city' }, geometry: { type: 'Point', coordinates: [111.88, -7.16] } },
    { type: 'Feature', properties: { name: 'Gresik / Surabaya', type: 'city' }, geometry: { type: 'Point', coordinates: [112.65, -7.16] } },
  ]
};

const tsContent = `// Auto-generated bundled geospatial data for ANCHOR platform
import type { FeatureCollection } from "geojson";

export const JAVA_GEOJSON: FeatureCollection = ${java.trim()} as unknown as FeatureCollection;

export const PROVINCES_GEOJSON: FeatureCollection = ${provinces.trim()} as unknown as FeatureCollection;

export const BASIN_GEOJSON: FeatureCollection = ${basin.trim()} as unknown as FeatureCollection;

export const RIVERS_GEOJSON: FeatureCollection = ${rivers.trim()} as unknown as FeatureCollection;

export const STATIONS_GEOJSON: FeatureCollection = ${stations.trim()} as unknown as FeatureCollection;

export const NETWORK_EDGES_GEOJSON: FeatureCollection = ${edges.trim()} as unknown as FeatureCollection;

export const REGIONAL_LABELS_GEOJSON: FeatureCollection = ${JSON.stringify(regionalLabels, null, 2)} as unknown as FeatureCollection;
`;

const targetDir = path.join(__dirname, '../src/geodata');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}
const targetFile = path.join(targetDir, 'index.ts');
fs.writeFileSync(targetFile, tsContent, 'utf8');
console.log('Successfully wrote', targetFile);
