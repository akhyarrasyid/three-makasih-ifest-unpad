import type { Role } from "@/types/domain";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  Cpu,
  Database,
  Droplets,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Map,
  Network,
  Radio,
  ScrollText,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  roles?: Role[];
  restricted?: Role[];
  badge?: string;
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
      { href: "/monitoring", label: "Basin Monitor", icon: Activity, shortcut: "G M" },
      { href: "/forecasts", label: "Forecasts", icon: Droplets, shortcut: "G F" },
      { href: "/network", label: "River Network", icon: Map, shortcut: "G N" },
      { href: "/alerts", label: "Risk Alerts", icon: AlertTriangle, shortcut: "G A" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/water-availability", label: "Water Availability", icon: Droplets },
      { href: "/explorer", label: "HUC12 Explorer", icon: Radio },
      { href: "/graph", label: "Graph Intelligence", icon: Network },
      { href: "/features", label: "Feature Intelligence", icon: Database },
    ],
  },
  {
    label: "AI & Research",
    items: [
      { href: "/models", label: "Model Intelligence", icon: Cpu, roles: ["data_scientist", "administrator"] },
      { href: "/validation", label: "Stress-Test Validation", icon: ShieldCheck, roles: ["data_scientist", "administrator"] },
      { href: "/ablations", label: "Ablation Study", icon: FlaskConical, roles: ["data_scientist", "administrator"] },
      { href: "/inference", label: "AI Inference", icon: GitBranch, roles: ["data_scientist", "administrator"] },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/system", label: "System Health", icon: BarChart3, roles: ["administrator"] },
      { href: "/architecture", label: "Architecture", icon: Boxes },
      { href: "/audit", label: "Audit Logs", icon: ScrollText, restricted: ["administrator", "data_scientist"] },
      { href: "/settings", label: "Settings", icon: Settings, restricted: ["administrator"] },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function accessFor(item: NavItem, role: Role | undefined): "full" | "readonly" | "denied" {
  if (!role) return "full";
  if (item.restricted && !item.restricted.includes(role)) return "readonly";
  if (item.roles && !item.roles.includes(role)) return "readonly";
  return "full";
}

export const SECURITY_ICON = ShieldCheck;
