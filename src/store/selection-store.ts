"use client";
import { create } from "zustand";
import type { ForecastHorizon } from "@/types/domain";

interface SelectionState {
  selectedStationId: string;
  compareStationId: string | null;
  timeRangeHours: number;
  horizon: ForecastHorizon;
  mapLayers: Record<string, boolean>;
  mapMode: "map" | "terrain" | "satellite";
  selectStation: (id: string) => void;
  setCompare: (id: string | null) => void;
  setTimeRange: (h: number) => void;
  setHorizon: (h: ForecastHorizon) => void;
  toggleLayer: (id: string) => void;
  setMapMode: (m: "map" | "terrain" | "satellite") => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedStationId: "HUC-DEMO-0001",
  compareStationId: null,
  timeRangeHours: 72,
  horizon: 24,
  mapLayers: { rivers: true, stations: true, dams: true, risk: true, flow: true, gradient: false, correlation: false, rainfall: true },
  mapMode: "map",
  selectStation: (id) => set({ selectedStationId: id || "HUC-DEMO-0001" }),
  setCompare: (id) => set({ compareStationId: id }),
  setTimeRange: (h) => set({ timeRangeHours: h }),
  setHorizon: (h) => set({ horizon: h }),
  toggleLayer: (id) => set((s) => ({ mapLayers: { ...s.mapLayers, [id]: !s.mapLayers[id] } })),
  setMapMode: (m) => set({ mapMode: m }),
}));
