"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Droplets,
  ShieldCheck,
  Activity,
  FlaskConical,
  Settings2,
  ArrowRight,
  GitFork,
  ChevronRight,
  Zap,
  CheckCircle2,
  Layers,
  Terminal,
} from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { PRODUCT, SCORES } from "@/config/constants";
import type { Role } from "@/types/domain";
import { cn } from "@/lib/utils";

interface RoleOption {
  role: Role;
  label: string;
  badge: string;
  badgeColor: string;
  description: string;
  detail: string;
  shortcut: string;
  icon: typeof Activity;
  iconBg: string;
  borderColor: string;
}

const ROLES: RoleOption[] = [
  {
    role: "operator",
    label: "Water Resources Operator",
    badge: "Operations Center",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/25",
    description: "River basin DAG telemetry & early-warning response",
    detail: "Real-time monitoring · 1-month forecast trajectories · reachability alerts",
    shortcut: "1",
    icon: Activity,
    iconBg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    borderColor: "hover:border-sky-500/40",
  },
  {
    role: "data_scientist",
    label: "AI / ML Research Scientist",
    badge: "Dual-Branch Engine",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    description: "Directed Reachability GNN & dual-branch ML models",
    detail: "Model registry · 4-safeguard validation · spatial holdouts · feature store",
    shortcut: "2",
    icon: FlaskConical,
    iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    borderColor: "hover:border-purple-500/40",
  },
  {
    role: "administrator",
    label: "Watershed Operations Admin",
    badge: "Full Governance",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    description: "11-service mesh health, throughput & immutable audit",
    detail: "System telemetry · SLA metrics · PostgreSQL audit logs · system config",
    shortcut: "3",
    icon: Settings2,
    iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    borderColor: "hover:border-emerald-500/40",
  },
];

/**
 * Architectural Engineering Grid Backdrop
 * Clean, restrained layout grid without floating nodes, glowing polygons, or AI slop tropes.
 */
function PrecisionEngineeringBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* 1. Subtle, high-diffusion ambient top glow (soft and unobtrusive) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-full max-w-6xl bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(14,165,233,0.08),transparent)]" />

      {/* 2. Precision 1px Cartesian Architectural Grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 95%)",
        }}
      />

      {/* 3. Subtle horizontal architectural framing guidelines */}
      <div className="absolute top-16 left-0 right-0 h-px bg-white/[0.04]" />
      <div className="absolute bottom-14 left-0 right-0 h-px bg-white/[0.04]" />
    </div>
  );
}

export default function LoginPage() {
  const signIn = useUiStore((s) => s.signIn);
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<Role>("operator");
  const [isNavigating, setIsNavigating] = useState(false);

  const handleLaunch = useCallback(
    (role: Role) => {
      setIsNavigating(true);
      signIn(role);
      router.push("/overview");
    },
    [signIn, router]
  );

  // Keyboard accelerators: 1, 2, 3, or Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") handleLaunch("operator");
      if (e.key === "2") handleLaunch("data_scientist");
      if (e.key === "3") handleLaunch("administrator");
      if (e.key === "Enter") handleLaunch(activeRole);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRole, handleLaunch]);

  return (
    <div className="relative min-h-screen bg-[#080b11] text-slate-100 flex flex-col justify-between selection:bg-sky-500/20 selection:text-sky-200">
      <PrecisionEngineeringBackdrop />

      {/* ------------------------------------------------------------- */}
      {/* 1. Precision Top Navigation Bar                                */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-20 w-full border-b border-white/[0.06] bg-[#080b11]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Droplets className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tracking-wider font-mono text-white">
                TIRTA
              </span>
              <span className="hidden sm:inline-block h-3.5 w-[1px] bg-white/15" />
              <span className="hidden sm:inline-block text-xs font-mono text-slate-400">
                Topology-Informed River Transmission Alert
              </span>
            </div>
          </div>

          {/* Institutional Status & Instant Entry */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="hidden md:flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[11px] text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>DAG Engine Active</span>
              <span className="text-slate-600">·</span>
              <span className="text-sky-400">Origin 168</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-sky-500/20 bg-sky-500/5 px-2.5 py-1 text-[11px] text-sky-300">
              <span className="text-slate-400">IFEST DAC 2026</span>
              <span className="text-slate-600">·</span>
              <span className="font-semibold text-white">AP {SCORES.publicLeaderboard.toFixed(4)}</span>
            </div>

            <button
              onClick={() => handleLaunch("operator")}
              disabled={isNavigating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-white transition-colors"
            >
              <span>Instant Launch</span>
              <ChevronRight className="h-3.5 w-3.5 text-sky-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. Main Hero & Workstation Split Layout                        */}
      {/* ------------------------------------------------------------- */}
      <main className="relative z-10 flex-1 flex items-center py-10 sm:py-14">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Authoritative Domain Narrative */}
            <div className="lg:col-span-7 space-y-6">
              {/* Context Chip */}
              <div className="inline-flex items-center gap-2 rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-1 text-xs font-mono text-sky-300">
                <GitFork className="h-3.5 w-3.5 text-sky-400" />
                <span>Physical River Topology & Directed Graph Learning</span>
              </div>

              {/* Editorial Title */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight text-white leading-[1.12]">
                  Predicting Water Stress Across Interconnected River Basins.
                </h1>
                <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal max-w-2xl pt-1">
                  Conventional machine learning treats watersheds as isolated tabular records. TIRTA embeds physical river flow topology into directed graph neural networks, propagating upstream deficit signals through 3-hop reachability paths across <span className="text-white font-medium">2,982 HUC12 sub-basins</span> with zero temporal leakage.
                </p>
              </div>

              {/* Architecture Spec Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 font-mono text-xs">
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-1.5 text-sky-400 font-semibold mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Directed River DAG</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    1–3 hop topological routing respecting downstream mass balance.
                  </p>
                </div>

                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-1.5 text-purple-400 font-semibold mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Dual-Branch Fusion</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    GBDT tabular boosters blended with spatial graph message passing.
                  </p>
                </div>

                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Purged Embargo</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Strict temporal holdouts across 168 months without leakage.
                  </p>
                </div>
              </div>

              {/* Scientific Metrics Strip */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Forecast HUC12s</span>
                  <span className="text-xl sm:text-2xl font-bold text-white mt-0.5 block tracking-tight">2,982</span>
                  <span className="text-[10px] text-slate-500">42 live demo stations</span>
                </div>

                <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Temporal Lineage</span>
                  <span className="text-xl sm:text-2xl font-bold text-white mt-0.5 block tracking-tight">168 Mos</span>
                  <span className="text-[10px] text-slate-500">14-year water cycles</span>
                </div>

                <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-sky-400 block">Verified Public AP</span>
                  <span className="text-xl sm:text-2xl font-bold text-sky-400 mt-0.5 block tracking-tight">0.7329</span>
                  <span className="text-[10px] text-slate-500">Research GNN: 0.7641</span>
                </div>

                <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 block">Multi-Hop Latency</span>
                  <span className="text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5 block tracking-tight">&lt;185 ms</span>
                  <span className="text-[10px] text-slate-500">10-stage waterfall</span>
                </div>
              </div>
            </div>

            {/* Right Column: Precision Role Command Console */}
            <div className="lg:col-span-5">
              <div className="relative rounded-xl border border-white/[0.08] bg-[#0c1018]/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/[0.06] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white tracking-tight">
                        Operations Console
                      </h2>
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Select an operational profile to launch workspace.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    <ShieldCheck className="h-3 w-3" /> DEMO SSO
                  </div>
                </div>

                {/* Role Profile Selection */}
                <div className="mt-4 space-y-2.5">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = activeRole === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => {
                          setActiveRole(r.role);
                          handleLaunch(r.role);
                        }}
                        onMouseEnter={() => setActiveRole(r.role)}
                        disabled={isNavigating}
                        className={cn(
                          "group relative flex w-full flex-col p-3 rounded-lg border text-left transition-all duration-150",
                          isSelected
                            ? "border-sky-500/50 bg-white/[0.04] ring-1 ring-sky-500/20"
                            : "border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03]",
                          r.borderColor
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-md border", r.iconBg)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white group-hover:text-sky-300 transition-colors">
                                {r.label}
                              </div>
                              <div className="text-xs text-slate-400">
                                {r.description}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn("hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border", r.badgeColor)}>
                              {r.badge}
                            </span>
                            <kbd className="h-5 w-5 rounded flex items-center justify-center bg-white/[0.04] border border-white/10 text-[10px] font-mono text-slate-400 group-hover:border-sky-500/40 group-hover:text-white transition-colors">
                              {r.shortcut}
                            </kbd>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-slate-500 group-hover:text-slate-400">
                          <span className="truncate pr-2">{r.detail}</span>
                          <span className="flex items-center gap-0.5 text-sky-400 group-hover:translate-x-0.5 transition-transform shrink-0 font-medium">
                            Launch <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Primary Launch Action */}
                <div className="mt-4 pt-3.5 border-t border-white/[0.06] space-y-2.5">
                  <button
                    onClick={() => handleLaunch(activeRole)}
                    disabled={isNavigating}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-[0.99] px-4 py-2.5 text-sm font-semibold text-black transition-all"
                  >
                    <Zap className="h-4 w-4 fill-black text-black" />
                    <span>Enter Workspace with {ROLES.find(r => r.role === activeRole)?.label || "Selected Profile"}</span>
                    <span className="font-mono text-xs opacity-75">(↵ Enter)</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                    <span>Press <kbd className="px-1 py-0.2 rounded bg-white/10 text-white font-semibold">1</kbd>, <kbd className="px-1 py-0.2 rounded bg-white/10 text-white font-semibold">2</kbd>, or <kbd className="px-1 py-0.2 rounded bg-white/10 text-white font-semibold">3</kbd> for instant role switch</span>
                    <span className="text-slate-500">v2.4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* 3. Minimal Institutional Footer                                */}
      {/* ------------------------------------------------------------- */}
      <footer className="relative z-20 border-t border-white/[0.06] bg-[#080b11]/90 py-3.5 font-mono text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2.5 px-6 sm:px-8">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>IFEST DAC 2026 Finalist Prototype · Universitas Padjadjaran</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Directed River DAG</span>
            <span className="text-slate-700">·</span>
            <span>Spatial Graph Neural Networks</span>
            <span className="text-slate-700">·</span>
            <span>Hydrological Stress-Test CV</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
