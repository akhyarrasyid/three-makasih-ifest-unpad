import { STATIONS, STATION_MAP } from "./stations";
import { createRng, fbm, hashString, latticeNoise, clamp, round } from "@/lib/prng";
import { SIM_BASE_NOW } from "@/config/constants";
import type { Station, TelemetryPoint } from "@/types/domain";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/* ------------------------------------------------------------------------ */
/* Regional rainfall field                                                  */
/* ------------------------------------------------------------------------ */

const REGION_OF: Record<string, string> = {
  "BS-001": "upper", "BS-002": "upper", "BS-003": "upper", "BS-005": "upper", "BS-020": "upper", "BS-021": "upper", "BS-022": "upper",
  "BS-004": "solo", "BS-006": "solo", "BS-007": "solo", "BS-025": "solo",
  "BS-008": "madiun", "BS-009": "madiun", "BS-010": "madiun", "BS-012": "madiun", "BS-013": "madiun",
  "BS-011": "middle", "BS-014": "middle", "BS-024": "middle", "BS-023": "middle", "BS-015": "middle",
  "BS-016": "lower", "BS-017": "lower", "BS-018": "lower", "BS-019": "lower", "BS-030": "lower", "BS-028": "lower",
  "BS-026": "south", "BS-027": "south", "BS-029": "north",
};

interface RainEvent {
  start: number; // ms
  duration: number; // ms
  peak: number; // mm/h
  scenario?: boolean;
}

const RAIN_PROBABILITY = 0.42; // May – transition to dry season on Java
const rainEventCache = new Map<string, RainEvent[]>();

/** Scenario: heavy convective rainfall over the upper Kali Madiun sub-basin, starting just after the simulated "now". */
export const SCENARIO = {
  stations: ["BS-008", "BS-009", "BS-013"],
  focusStationId: "BS-008",
  downstreamPath: ["BS-009", "BS-010", "BS-012", "BS-011"],
  start: SIM_BASE_NOW + 5 * 60_000,
  duration: 3 * HOUR,
  peak: 54,
};

function regionalEvents(region: string, dayIndex: number): RainEvent[] {
  const rng = createRng(`rain:${region}:${dayIndex}`);
  const events: RainEvent[] = [];
  const dayStart = SIM_BASE_NOW - (SIM_BASE_NOW % DAY) + dayIndex * DAY - 7 * HOUR; // local midnight WIB
  const p = rng();
  if (p < RAIN_PROBABILITY) {
    const startHour = 12.5 + rng() * 8; // afternoon convection
    const duration = (0.8 + rng() * 3.5) * HOUR;
    const peak = 2.5 + Math.pow(rng(), 2.2) * 34;
    events.push({ start: dayStart + startHour * HOUR, duration, peak });
    if (rng() < 0.25) {
      events.push({ start: dayStart + (2 + rng() * 6) * HOUR, duration: (0.5 + rng() * 2) * HOUR, peak: 1.5 + rng() * 9 });
    }
  }
  return events;
}

function stationEvents(station: Station): RainEvent[] {
  const cached = rainEventCache.get(station.id);
  if (cached) return cached;
  const region = REGION_OF[station.id] ?? "solo";
  const seed = hashString(`station-rain:${station.id}`);
  const out: RainEvent[] = [];
  for (let d = -40; d <= 4; d++) {
    for (const [i, ev] of regionalEvents(region, d).entries()) {
      const mult = latticeNoise(seed, d * 10 + i);
      if (mult < 0.15) continue; // localised cell missed this station
      out.push({ ...ev, peak: ev.peak * (0.55 + mult * 0.9), start: ev.start + (mult - 0.5) * 40 * 60_000 });
    }
  }
  if (SCENARIO.stations.includes(station.id)) {
    const w = station.id === SCENARIO.focusStationId ? 1 : 0.8;
    out.push({ start: SCENARIO.start, duration: SCENARIO.duration, peak: SCENARIO.peak * w, scenario: true });
  }
  rainEventCache.set(station.id, out);
  return out;
}

function eventIntensity(ev: RainEvent, t: number): number {
  const x = (t - ev.start) / ev.duration;
  if (x <= 0 || x >= 1) return 0;
  // asymmetric bell: fast build-up, slower decay
  const shape = x < 0.3 ? Math.pow(x / 0.3, 1.4) : Math.pow(1 - (x - 0.3) / 0.7, 1.1);
  return ev.peak * shape;
}

/** Rainfall intensity (mm/h) at station at time t. Events after `knownUntil` are not visible. */
export function rainfallAt(stationId: string, t: number, knownUntil = Infinity): number {
  const station = STATION_MAP[stationId];
  if (!station || t > knownUntil) return 0;
  let total = 0;
  for (const ev of stationEvents(station)) total += eventIntensity(ev, t);
  return total;
}

/* ------------------------------------------------------------------------ */
/* Station hydraulic parameters                                             */
/* ------------------------------------------------------------------------ */

interface Hydraulics {
  baseRatio: number;
  responseK: number; // m per mm effective
  lagH: number; // time-to-peak
  noiseAmp: number;
  seasonalAmp: number;
}

const BASE_RATIO_OVERRIDES: Record<string, number> = {
  "BS-008": 0.58,
  "BS-011": 0.63,
  "BS-016": 0.67,
  "BS-017": 0.79,
  "BS-019": 0.57,
  "BS-024": 0.6,
  "BS-014": 0.55,
  "BS-030": 0.7,
  "BS-004": 0.52,
  "BS-001": 0.72,
  "BS-015": 0.64,
};

function hydraulics(station: Station): Hydraulics {
  const seed = hashString(`hyd:${station.id}`);
  const jitter = latticeNoise(seed, 1);
  const baseRatio = BASE_RATIO_OVERRIDES[station.id] ?? 0.4 + jitter * 0.14;
  switch (station.category) {
    case "DAM_WEIR":
      return { baseRatio, responseK: station.thresholds.alert * 0.0012, lagH: 6 + jitter * 3, noiseAmp: 0.018, seasonalAmp: 0.05 };
    case "MIXED":
      return { baseRatio, responseK: station.thresholds.alert * 0.0028, lagH: 3 + jitter * 2, noiseAmp: 0.035, seasonalAmp: 0.09 };
    default:
      return { baseRatio, responseK: station.thresholds.alert * 0.0042, lagH: 1.8 + jitter * 1.8, noiseAmp: 0.055, seasonalAmp: 0.12 };
  }
}

/** Unit hydrograph: fast gamma(2) rise + slow baseflow drain so recessions persist realistically. */
function kernel(tauH: number, tp: number): number {
  if (tauH <= 0) return 0;
  const x = tauH / tp;
  const quick = x * Math.exp(1 - x);
  const slow = Math.exp(-tauH / (tp * 7)) * (1 - Math.exp(-tauH / tp));
  return 0.62 * quick + 0.38 * slow;
}

/* ------------------------------------------------------------------------ */
/* River routing                                                            */
/* ------------------------------------------------------------------------ */

export function riverDistanceKm(a: Station, b: Station): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return round(2 * R * Math.asin(Math.sqrt(h)) * 1.32, 1); // sinuosity factor
}

export function travelTimeH(a: Station, b: Station): number {
  const v = b.category === "DAM_WEIR" ? 0.9 : 1.25; // m/s mean celerity
  return round(riverDistanceKm(a, b) / (v * 3.6), 1);
}

export function couplingFactor(up: Station, down: Station): number {
  const areaRatio = Math.sqrt(up.catchmentKm2 / down.catchmentKm2);
  const stageRatio = Math.sqrt(down.thresholds.alert / up.thresholds.alert);
  const damping = down.category === "DAM_WEIR" ? 0.45 : 1;
  return round(clamp(0.55 * areaRatio * stageRatio * damping, 0.06, 0.62), 3);
}

/* ------------------------------------------------------------------------ */
/* Water level model                                                        */
/* ------------------------------------------------------------------------ */

const devCache = new Map<string, number>();

function rainResponse(station: Station, hyd: Hydraulics, t: number, knownUntil: number): number {
  let r = 0;
  const sliceMs = 15 * 60_000;
  for (const ev of stationEvents(station)) {
    if (ev.start > t || ev.start + ev.duration < t - 72 * HOUR) continue;
    const end = Math.min(ev.start + ev.duration, t, knownUntil);
    for (let tau = ev.start; tau < end; tau += sliceMs) {
      const v = eventIntensity(ev, tau + sliceMs / 2) * 0.25; // mm in slice
      r += v * kernel((t - tau) / HOUR, hyd.lagH);
    }
  }
  return r * hyd.responseK;
}

/** Deviation from baseline caused by rainfall (local + routed from upstream). */
function deviation(stationId: string, t: number, knownUntil: number, depth = 0): number {
  const key = `${stationId}:${Math.round(t / 60_000)}:${knownUntil === Infinity ? "inf" : Math.round(knownUntil / 60_000)}`;
  const hit = devCache.get(key);
  if (hit !== undefined) return hit;
  const station = STATION_MAP[stationId];
  const hyd = hydraulics(station);
  let dev = rainResponse(station, hyd, t, knownUntil);
  if (depth < 5) {
    for (const upId of station.upstreamStations) {
      const up = STATION_MAP[upId];
      const lag = travelTimeH(up, station) * HOUR;
      dev += couplingFactor(up, station) * deviation(upId, t - lag, knownUntil, depth + 1);
    }
  }
  if (devCache.size > 200_000) devCache.clear();
  devCache.set(key, dev);
  return dev;
}

export function climatologyAt(stationId: string, t: number): number {
  const station = STATION_MAP[stationId];
  const hyd = hydraulics(station);
  const alert = station.thresholds.alert;
  const doy = ((t - Date.UTC(2026, 0, 1)) / DAY) % 365;
  const seasonal = Math.cos(((doy - 40) / 365) * 2 * Math.PI) * hyd.seasonalAmp * alert; // wet-season peak early Feb
  const hourLocal = ((t / HOUR + 7) % 24 + 24) % 24;
  const diurnal = station.category === "DAM_WEIR" ? (hourLocal > 6 && hourLocal < 18 ? -0.01 : 0.01) * alert : Math.sin(((hourLocal - 4) / 24) * 2 * Math.PI) * 0.006 * alert;
  return alert * hyd.baseRatio + seasonal + diurnal;
}

/** True (latent) water level. */
export function tmaAt(stationId: string, t: number, knownUntil = Infinity): number {
  const station = STATION_MAP[stationId];
  const hyd = hydraulics(station);
  const seed = hashString(`noise:${stationId}`);
  const hours = t / HOUR;
  const noise = fbm(seed, hours, [0.75, 3, 12, 48, 168], [0.4, 0.8, 1, 1.2, 1.6]) * hyd.noiseAmp * station.thresholds.alert;
  const trend = station.category === "DAM_WEIR" ? 0 : -0.0004 * station.thresholds.alert * ((t - SIM_BASE_NOW) / DAY);
  return Math.max(0.05, climatologyAt(stationId, t) + deviation(stationId, t, knownUntil) + noise + trend);
}

/* ------------------------------------------------------------------------ */
/* Data quality                                                             */
/* ------------------------------------------------------------------------ */

const NETWORK_GAPS: { start: number; hours: number; stations: string[] }[] = [
  { start: SIM_BASE_NOW - 3 * DAY - 7 * HOUR, hours: 4, stations: STATIONS.filter((_, i) => i % 2 === 1).map((s) => s.id) },
  { start: SIM_BASE_NOW - 9 * DAY - 3 * HOUR, hours: 6, stations: STATIONS.filter((_, i) => i % 4 !== 0).map((s) => s.id) },
  { start: SIM_BASE_NOW - 6 * DAY + 2 * HOUR, hours: 2, stations: ["BS-016", "BS-017", "BS-018", "BS-019", "BS-030", "BS-028"] },
];

const STALE_STATIONS: Record<string, number> = { "BS-027": 3.4 * HOUR, "BS-029": 52 * 60_000 };
const OFFLINE_STATIONS: string[] = [];

function missingProbability(station: Station): number {
  const j = latticeNoise(hashString(`miss:${station.id}`), 3);
  return station.category === "DAM_WEIR" ? 0.015 + j * 0.02 : 0.025 + j * 0.055;
}

export function sampleQuality(stationId: string, t: number): TelemetryPoint["quality"] {
  const station = STATION_MAP[stationId];
  const hourIdx = Math.floor(t / HOUR);
  for (const gap of NETWORK_GAPS) {
    if (t >= gap.start && t < gap.start + gap.hours * HOUR && gap.stations.includes(stationId)) return "MISSING";
  }
  const seed = hashString(`q:${stationId}`);
  const u = latticeNoise(seed, hourIdx);
  const pMiss = missingProbability(station);
  if (u < pMiss * 0.7) return "MISSING";
  if (u < pMiss) return "INTERPOLATED";
  if (latticeNoise(seed + 11, hourIdx) < 0.0019) return "OUTLIER";
  return "GOOD";
}

export function staleOffsetMs(stationId: string): number {
  return STALE_STATIONS[stationId] ?? 0;
}
export function isOffline(stationId: string): boolean {
  return OFFLINE_STATIONS.includes(stationId);
}

/* ------------------------------------------------------------------------ */
/* Sampling helpers                                                         */
/* ------------------------------------------------------------------------ */

export function sampleHistory(stationId: string, from: number, to: number, stepMs = HOUR): TelemetryPoint[] {
  const out: TelemetryPoint[] = [];
  for (let t = from; t <= to; t += stepMs) {
    const quality = sampleQuality(stationId, t);
    let tma: number | null = round(tmaAt(stationId, t), 3);
    if (quality === "MISSING") tma = null;
    if (quality === "OUTLIER") tma = round(tma! * (latticeNoise(hashString(stationId), Math.floor(t / HOUR)) > 0.5 ? 1.55 : 0.42), 3);
    out.push({ t, tma, rainfall: round(rainfallAt(stationId, t), 2), quality });
  }
  return out;
}

export function rainfallAccum(stationId: string, to: number, hours: number): number {
  let total = 0;
  const step = 10 * 60_000;
  for (let t = to - hours * HOUR; t < to; t += step) total += rainfallAt(stationId, t) * (step / HOUR);
  return round(total, 1);
}

export function missingRate(stationId: string, to: number, hours: number): number {
  let miss = 0;
  for (let h = 0; h < hours; h++) if (sampleQuality(stationId, to - h * HOUR) === "MISSING") miss++;
  return round(miss / hours, 3);
}

export { HOUR, DAY };
