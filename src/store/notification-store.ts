"use client";
import { create } from "zustand";

export interface Notification {
  id: string;
  title: string;
  body?: string;
  severity: "info" | "warning" | "critical" | "success";
  timestamp: number;
  read: boolean;
  href?: string;
}

interface NotificationState {
  items: Notification[];
  push: (n: Omit<Notification, "read" | "timestamp"> & { timestamp?: number }) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const SEED: Notification[] = [
  { id: "n-1", title: "3 stations crossed warning threshold", body: "Karanggeneng, Babat Barrage, Ngawi Confluence", severity: "warning", timestamp: Date.now() - 42 * 60_000, read: false, href: "/alerts" },
  { id: "n-2", title: "Data ingestion recovered", body: "Broker partition 3 restored · 1,440 records replayed", severity: "success", timestamp: Date.now() - 3 * 3600_000, read: false, href: "/data-quality" },
  { id: "n-3", title: "Model inference latency increased 14%", body: "P95 214 → 244 ms · auto-scaled feature pipeline", severity: "info", timestamp: Date.now() - 26 * 3600_000, read: true, href: "/inference" },
  { id: "n-4", title: "New model version deployed", body: "anchor-prod-v2.4.1 · holdout RMSE 0.8387", severity: "info", timestamp: Date.now() - 16 * 24 * 3600_000, read: true, href: "/models" },
];

export const useNotificationStore = create<NotificationState>()((set) => ({
  items: SEED,
  push: (n) => set((s) => (s.items.some((x) => x.id === n.id) ? s : { items: [{ ...n, timestamp: n.timestamp ?? Date.now(), read: false }, ...s.items].slice(0, 50) })),
  markAllRead: () => set((s) => ({ items: s.items.map((x) => ({ ...x, read: true })) })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  clear: () => set({ items: [] }),
}));
