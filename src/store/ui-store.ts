"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types/domain";

export interface SessionUser {
  name: string;
  email: string;
  role: Role;
  initials: string;
}

export const DEMO_USERS: Record<Role, SessionUser> = {
  operator: { name: "Dewi Santoso", email: "d.santoso@anchor.demo", role: "operator", initials: "DS" },
  data_scientist: { name: "Arif Prasetyo", email: "a.prasetyo@anchor.demo", role: "data_scientist", initials: "AP" },
  administrator: { name: "Ops Administrator", email: "admin.ops@anchor.demo", role: "administrator", initials: "OA" },
};

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  paletteOpen: boolean;
  notificationsOpen: boolean;
  assistantOpen: boolean;
  demoMode: boolean;
  tick: number;
  user: SessionUser | null;
  density: "comfortable" | "compact";
  theme: "dark" | "light" | "system";
  toggleSidebar: () => void;
  setMobileNav: (open: boolean) => void;
  setPalette: (open: boolean) => void;
  setNotifications: (open: boolean) => void;
  setAssistant: (open: boolean) => void;
  toggleAssistant: () => void;
  setDemoMode: (on: boolean) => void;
  advanceTick: () => void;
  resetTick: () => void;
  signIn: (role: Role) => void;
  signOut: () => void;
  setDensity: (d: "comfortable" | "compact") => void;
  setTheme: (t: "dark" | "light" | "system") => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      paletteOpen: false,
      notificationsOpen: false,
      assistantOpen: false,
      demoMode: false,
      tick: 0,
      user: null,
      density: "comfortable",
      theme: "dark",
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
      setPalette: (open) => set({ paletteOpen: open }),
      setNotifications: (open) => set({ notificationsOpen: open }),
      setAssistant: (open) => set({ assistantOpen: open }),
      toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),
      setDemoMode: (on) => set({ demoMode: on }),
      advanceTick: () => set((s) => ({ tick: s.tick + 1 })),
      resetTick: () => set({ tick: 0 }),
      signIn: (role) => set({ user: DEMO_USERS[role] }),
      signOut: () => set({ user: null, demoMode: false }),
      setDensity: (density) => set({ density }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "anchor-ui", partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, demoMode: s.demoMode, tick: s.tick, user: s.user, density: s.density, theme: s.theme }) },
  ),
);
