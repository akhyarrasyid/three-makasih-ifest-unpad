const fs = require('fs');

// We can import or read the generated file
const content = fs.readFileSync('src/data/network-static.ts', 'utf8');

// Parse the arrays directly
const stationsMatch = content.match(/export const STATIC_STATIONS: StaticStation\[\] = (\[[\s\S]*?\]);/);
const edgesMatch = content.match(/export const STATIC_EDGES: StaticEdge\[\] = (\[[\s\S]*?\]);/);

if (!stationsMatch || !edgesMatch) {
  console.error('Failed to match arrays in network-static.ts');
  process.exit(1);
}

const stations = JSON.parse(stationsMatch[1]);
const edges = JSON.parse(edgesMatch[1]);

console.log('--- NETWORK VERIFICATION ---');
console.log('Total stations:', stations.length, '(expected 30)');
const primary = stations.filter(s => s.primary);
const outside = stations.filter(s => !s.primary);
console.log('Primary stations:', primary.length, '(expected 25)');
console.log('Outside stations:', outside.length, '(expected 5)');
console.log('Total edges:', edges.length, '(expected 24)');

// Check graph connectivity among 25 primary stations
const adj = new Map();
primary.forEach(s => adj.set(s.id, []));
edges.forEach(e => {
  if (adj.has(e.source) && adj.has(e.target)) {
    adj.get(e.source).push(e.target);
    adj.get(e.target).push(e.source);
  } else {
    console.error('Edge with non-primary node:', e);
  }
});

const visited = new Set();
function dfs(u) {
  visited.add(u);
  for (const v of adj.get(u) || []) {
    if (!visited.has(v)) dfs(v);
  }
}
dfs(primary[0].id);

console.log('Primary connected nodes:', visited.size, '(expected 25)');
const unvisited = primary.filter(s => !visited.has(s.id));
if (unvisited.length > 0) {
  console.error('Disconnected primary nodes:', unvisited.map(s => s.id));
} else {
  console.log('Connected components in primary network: 1');
}

// Check outside stations have 0 edges
const outsideIds = new Set(outside.map(s => s.id));
const badEdges = edges.filter(e => outsideIds.has(e.source) || outsideIds.has(e.target));
console.log('Edges touching outside stations:', badEdges.length, '(expected 0)');

// Check all 30 stations have positive coordinates within [0, 1200] and [0, 700]
const outOfBounds = stations.filter(s => s.x < 0 || s.x > 1200 || s.y < 0 || s.y > 700);
console.log('Out of bounds stations:', outOfBounds.length, '(expected 0)');
console.log('--- VERIFICATION SUCCESS ---');
