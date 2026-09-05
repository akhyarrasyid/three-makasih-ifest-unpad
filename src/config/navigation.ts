import type { Role } from "@/types/domain";
import {
  Activity, AlertTriangle, BarChart3, Boxes, Cpu, Database, FlaskConical, GitBranch, LayoutDashboard, Map, Radio, ScrollText, Settings, ShieldCheck, Waves, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  roles?: Role[]; // roles with full access; others read-only
  restricted?: Role[]; // roles allowed at all
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard, shortcut: "G O" },
      { href: "/monitoring", label: "Monitoring", icon: Activity, shortcut: "G M" },
      { href: "/forecasts", label: "Forecasts", icon: Waves, shortcut: "G F" },
      { href: "/network", label: "Network", icon: Map, shortcut: "G N" },
      { href: "/stations", label: "Stations", icon: Radio, shortcut: "G S" },
      { href: "/alerts", label: "Alerts", icon: AlertTriangle, shortcut: "G A" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/data-quality", label: "Data", icon: Database, roles: ["data_scientist", "administrator"] },
      { href: "/models", label: "Models", icon: Cpu, roles: ["data_scientist", "administrator"] },
      { href: "/inference", label: "Inference", icon: GitBranch, roles: ["data_scientist", "administrator"] },
      { href: "/experiments", label: "Experiments", icon: FlaskConical, roles: ["data_scientist", "administrator"] },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/system", label: "Health", icon: BarChart3, roles: ["administrator"] },
      { href: "/architecture", label: "Architecture", icon: Boxes },
      { href: "/audit", label: "Audit", icon: ScrollText, restricted: ["administrator", "data_scientist"] },
      { href: "/settings", label: "Settings", icon: Settings, restricted: ["administrator"] },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function accessFor(item: NavItem, role: Role | undefined): "full" | "readonly" | "denied" {
  if (!role) return "denied";
  if (item.restricted && !item.restricted.includes(role)) return "denied";
  if (item.roles && !item.roles.includes(role)) return "readonly";
  return "full";
}

export const SECURITY_ICON = ShieldCheck;
