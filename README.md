# ANCHOR — Bengawan Solo Hydrological Intelligence Platform

**ANCHOR** is an instrument-grade, operational flood intelligence and river monitoring platform designed for real-time telemetry, predictive multi-horizon flood forecasting, and network topology analysis across the **Bengawan Solo River Basin** in Central & East Java, Indonesia.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=flat&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)

---

## 🌊 Monitoring Network Architecture

The ANCHOR platform monitors **30 hydrological monitoring stations**:

```
30 TOTAL MONITORING STATIONS
│
├── 25 PRIMARY NETWORK STATIONS
│   └── 1 Connected Directed Tree (Nodes: 25, Edges: 24)
│       └── Continuous downstream hydrological connectivity from Wonogiri Dam to Ujung Pangkah Estuary
│
└── 5 OUTSIDE / SECONDARY STATIONS
    └── Standalone sub-basin monitoring (Grindulu, Lorog, Lamong Hilir, Serang Hulu, Bengawan Jero)
    └── Active telemetry feed with independent hydrological modeling
```

- **Geographic Coverage**: Central and East Java (Bengawan Solo Catchment Basin · 16,100 km²).
- **Network Invariants**: 25 primary nodes, 24 river links, 1 connected component, 22.3 km mean spacing, 83.3% primary coverage.
- **Sub-basin Monitoring**: 5 outside stations are maintained as intentional standalone sub-basins with no artificial graph links.

---

## 🚀 Key Features

1. **Ultra-Fast SVG River Network Workspace (`/network`)**:
   - Zero heavy browser GIS overhead; uses precomputed static geometries and lightweight React SVG rendering.
   - Instant (0ms) tab transitions with zero loading flicker or "Rendering..." delays.
   - Interactive upstream / downstream graph highlighting upon station selection.
   - Scope filtering: **All (30)**, **Primary (25)**, and **Outside (5)**.
   - Operational station inspector panel with live TMA, +6h/+24h forecasts, and strategy details.

2. **Real-Time Telemetry & Alert Intelligence (`/alerts`, `/monitoring`)**:
   - Water level (TMA) observation with automated alert threshold levels (Low, Moderate, High, Critical).
   - In-memory fallback simulation engine allowing full platform operation without requiring external databases.

3. **Multi-Horizon Forecasting Engine (`/forecasts`)**:
   - Predictive hydrological models: Climatology, Hybrid (ML + Climatology), and Direct Multi-Horizon neural forecasts.

4. **Instrument-Grade UI/UX**:
   - Restrained, scientific aesthetics tailored for mission-critical monitoring centers.
   - Native dark mode and light mode with high-contrast cartography.

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/akhyarrasyid/ssds-uns-bengawan-solo.git
cd ssds-uns-bengawan-solo

# Install dependencies
npm install

# Start local development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Verification & Testing
```bash
# Validate network invariants (30 stations, 25 primary, 5 outside, 24 edges, 1 tree)
node scripts/verify-network.js

# Run TypeScript typecheck
npm run typecheck

# Build for production
npm run build
```

---

## 🚢 Deployment (Vercel)

This repository is pre-configured for instant zero-configuration deployment to **Vercel**:
1. Connect your GitHub repository to Vercel.
2. Framework Preset: **Next.js**.
3. Root Directory: `./`.
4. Click **Deploy**.
5. No database or environment variables are required for standard demo deployment (runs in high-fidelity in-memory standalone mode).
