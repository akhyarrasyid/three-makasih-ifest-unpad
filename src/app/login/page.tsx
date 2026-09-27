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
  Radio,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { PRODUCT, DATASET, SCORES } from "@/config/constants";
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
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    description: "River basin DAG telemetry & early-warning response",
    detail: "Live monitoring · 1-month forecast trajectory · reachability alerts",
    shortcut: "1",
    icon: Activity,
    iconBg: "from-cyan-500/20 to-blue-600/20 text-cyan-400 border-cyan-500/30",
    borderColor: "hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]",
  },
  {
    role: "data_scientist",
    label: "AI / ML Research Scientist",
    badge: "Dual-Branch Engine",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description: "Directed Reachability GNN & dual-branch ML models",
    detail: "Model registry · 4-safeguard validation · ablations · feature store",
    shortcut: "2",
    icon: FlaskConical,
    iconBg: "from-purple-500/20 to-indigo-600/20 text-purple-400 border-purple-500/30",
    borderColor: "hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]",
  },
  {
    role: "administrator",
    label: "Watershed Operations Admin",
    badge: "Full Governance",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description: "11-service mesh health, throughput & immutable audit",
    detail: "System telemetry · SLA metrics · PostgreSQL audit logs · settings",
    shortcut: "3",
    icon: Settings2,
    iconBg: "from-emerald-500/20 to-teal-600/20 text-emerald-400 border-emerald-500/30",
    borderColor: "hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]",
  },
];

/**
 * World-Class Interactive Hydrological Topography & River Drainage Network
 * Features organic river courses, animated hydraulic flow vectors, and elevation contours.
 */
function PremiumHydrologyBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* 1. Deep Atmospheric Lighting Gradients */}
      <div className="absolute -top-40 -left-40 h-[680px] w-[680px] rounded-full bg-cyan-600/10 blur-[130px]" />
      <div className="absolute top-1/3 right-0 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[150px]" />
      <div className="absolute -bottom-32 left-1/4 h-[550px] w-[550px] rounded-full bg-indigo-600/08 blur-[140px]" />

      {/* 2. Micro Dot-Matrix Coordinate Grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* 3. Organic Vector Watershed Hydrography */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          {/* River glow filter */}
          <filter id="river-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Mainstem Gradient */}
          <linearGradient id="mainstem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.9" />
          </linearGradient>

          {/* Tributary Gradient */}
          <linearGradient id="trib-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.6" />
          </linearGradient>

          {/* Drainage Basin Catchment Fill */}
          <radialGradient id="basin-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0369a1" stopOpacity="0.06" />
            <stop offset="80%" stopColor="#082f49" stopOpacity="0.02" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Catchment Watershed Contours (Elevation & Drainage Boundaries) */}
        <g stroke="rgba(56, 189, 248, 0.05)" strokeWidth="1" fill="none">
          <path d="M120,240 C340,110 650,80 980,140 C1250,190 1480,310 1520,520 C1540,680 1380,820 1100,850 C800,880 480,840 280,720 C120,620 60,420 120,240 Z" fill="url(#basin-fill)" strokeWidth="1.5" strokeDasharray="6 4" />
          <path d="M220,300 C420,180 700,160 960,200 C1180,240 1360,350 1400,500 C1420,620 1280,740 1050,760 C800,780 520,740 360,650 C230,570 180,420 220,300 Z" />
          <path d="M340,360 C500,260 720,240 920,270 C1080,300 1220,390 1250,500 C1260,580 1160,660 980,680 C780,700 560,660 440,600 C340,540 300,440 340,360 Z" />
        </g>

        {/* Secondary Watershed Ridge Ribbons */}
        <g stroke="rgba(255, 255, 255, 0.025)" strokeWidth="1" strokeDasharray="3 3">
          <path d="M150,180 Q450,220 720,340 T1280,480" />
          <path d="M280,780 Q600,680 920,620 T1450,580" />
          <path d="M480,120 Q640,320 800,520 T1150,860" />
        </g>

        {/* Physical Directed River Channels (DAG Layout) */}
        {/* Mainstem Central River Corridor */}
        <path
          d="M 220,280 C 420,320 620,400 860,450 C 1100,500 1320,540 1480,560"
          stroke="url(#mainstem-grad)"
          strokeWidth="3.5"
          filter="url(#river-glow)"
          strokeLinecap="round"
        />

        {/* Animated hydraulic pulse wave along mainstem */}
        <path
          d="M 220,280 C 420,320 620,400 860,450 C 1100,500 1320,540 1480,560"
          stroke="#e0f2fe"
          strokeWidth="2"
          strokeDasharray="16 280"
          strokeLinecap="round"
          className="animate-[dash_6s_linear_infinite]"
          opacity="0.8"
        />

        {/* Northern Tributary Network (Confluence at 860, 450) */}
        <path
          d="M 380,140 C 480,200 640,280 860,450"
          stroke="url(#trib-grad)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M 260,110 C 320,130 350,150 380,140"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />
        <path
          d="M 520,110 C 580,180 700,260 860,450"
          stroke="url(#trib-grad)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Southern Tributary Network (Confluence at 860, 450 & 1100, 500) */}
        <path
          d="M 320,680 C 500,640 680,560 860,450"
          stroke="url(#trib-grad)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M 240,740 C 280,710 300,690 320,680"
          stroke="#38bdf8"
          strokeWidth="1.4"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />
        <path
          d="M 640,760 C 760,700 940,620 1100,500"
          stroke="url(#trib-grad)"
          strokeWidth="2.0"
          strokeLinecap="round"
        />

        {/* Delta Estuary Outfall Distributaries */}
        <path
          d="M 1480,560 C 1520,530 1560,510 1590,500"
          stroke="#0284c7"
          strokeWidth="2.0"
          strokeOpacity="0.5"
          strokeLinecap="round"
        />
        <path
          d="M 1480,560 C 1530,580 1570,610 1600,630"
          stroke="#0284c7"
          strokeWidth="2.0"
          strokeOpacity="0.5"
          strokeLinecap="round"
        />

        {/* Key Hydrological Gauging & Confluence Nodes */}
        {[
          { x: 220, y: 280, label: "Upper West Headwater", color: "#38bdf8" },
          { x: 380, y: 140, label: "North Fork Ridge", color: "#38bdf8" },
          { x: 320, y: 680, label: "South Valley Springs", color: "#f59e0b" },
          { x: 860, y: 450, label: "Central Tri-River Confluence", color: "#ef4444", alert: true },
          { x: 1100, y: 500, label: "Grand Valley Reach", color: "#06b6d4" },
          { x: 1480, y: 560, label: "Terminal Delta Outfall", color: "#10b981" },
        ].map((node, i) => (
          <g key={i}>
            {node.alert && (
              <circle
                cx={node.x}
                cy={node.y}
                r="18"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.2"
                opacity="0.3"
                className="animate-ping"
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r="6"
              fill="#070a10"
              stroke={node.color}
              strokeWidth="2"
            />
            <circle cx={node.x} cy={node.y} r="2.5" fill={node.color} />
          </g>
        ))}
      </svg>
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

  // Keyboard accessibility: '1', '2', '3', or 'Enter'
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
    <div className="relative min-h-screen bg-[#070a10] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      <PremiumHydrologyBackdrop />

      {/* ------------------------------------------------------------- */}
      {/* 1. Precision Top Header Bar                                    */}
      {/* ------------------------------------------------------------- */}
      <header className="relative z-20 w-full border-b border-white/[0.07] bg-[#070a10]/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          {/* Brand Emblem & Name */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Droplets className="h-5 w-5 text-black" strokeWidth={2.2} />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold tracking-wider font-mono text-white">
                TIRTA
              </span>
              <span className="hidden sm:inline-block h-3.5 w-[1px] bg-white/20" />
              <span className="hidden sm:inline-block text-[11px] font-mono tracking-tight text-slate-400">
                Topology-Informed River Transmission Alert
              </span>
            </div>
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time River DAG</span>
              <span className="text-slate-500">·</span>
              <span className="text-cyan-400">Origin 168</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-300 font-semibold">
              <span>IFEST DAC 2026</span>
              <span className="text-cyan-500">·</span>
              <span>AP {SCORES.publicLeaderboard.toFixed(4)}</span>
            </div>

            <button
              onClick={() => handleLaunch("operator")}
              disabled={isNavigating}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white transition-colors"
            >
              <span>Instant Entry</span>
              <ChevronRight className="h-3.5 w-3.5 text-cyan-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. Main Hero & Command Center Split Layout                     */}
      {/* ------------------------------------------------------------- */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: Scientific Narrative & Authority */}
            <div className="lg:col-span-7 space-y-6">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-mono text-cyan-300 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <GitFork className="h-3.5 w-3.5 text-cyan-400" />
                <span>Hydrological Intelligence & Directed Graph Neural Networks</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08]">
                  Predicting Water Stress Across <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">Interconnected River Basins.</span>
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-sans pt-2">
                  TIRTA replaces detached tabular predictions with physical river topology. By propagating upstream supply deficits through 3-hop directed reachability networks, it delivers next-month water availability forecasts across <span className="text-white font-medium">2,982 HUC12 sub-basins</span> with zero temporal data leakage.
                </p>
              </div>

              {/* Methodological Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-slate-300 flex items-center gap-1.5">
                  <span className="text-cyan-400">✓</span> Directed River DAG Flow
                </span>
                <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-slate-300 flex items-center gap-1.5">
                  <span className="text-purple-400">✓</span> Dual-Branch GBDT + GNN Fusion
                </span>
                <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-slate-300 flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> Purged Temporal Lag Embargo
                </span>
              </div>

              {/* Metric Pillars Row */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-sm">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Forecast HUC12s</span>
                  <span className="text-xl sm:text-2xl font-bold text-white mt-0.5 block tracking-tight">2,982</span>
                  <span className="text-[10px] text-slate-400">42 demo sub-basins</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-sm">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Temporal Lineage</span>
                  <span className="text-xl sm:text-2xl font-bold text-white mt-0.5 block tracking-tight">168</span>
                  <span className="text-[10px] text-slate-400">14-year water cycles</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-sm">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400 block">Verified Public AP</span>
                  <span className="text-xl sm:text-2xl font-bold text-cyan-400 mt-0.5 block tracking-tight">0.7329</span>
                  <span className="text-[10px] text-slate-400">Research GNN: 0.7641</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-sm">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 block">Multi-Hop Latency</span>
                  <span className="text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5 block tracking-tight">&lt;185 ms</span>
                  <span className="text-[10px] text-slate-400">10-stage waterfall</span>
                </div>
              </div>
            </div>

            {/* Right Column: World-Class Role Entry Instrument */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-white/10 bg-[#0d131f]/85 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                {/* Header of the Instrument */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Launch Operations Console
                      </h2>
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Select your operational identity to configure telemetry & analytics scope.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    <ShieldCheck className="h-3 w-3" /> DEMO SSO
                  </div>
                </div>

                {/* Role Selection Buttons */}
                <div className="mt-5 space-y-3">
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
                          "group relative flex w-full flex-col p-3.5 rounded-xl border text-left transition-all duration-200",
                          isSelected
                            ? "border-cyan-500/60 bg-white/[0.06] shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30"
                            : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]",
                          r.borderColor
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border bg-gradient-to-br transition-transform group-hover:scale-105", r.iconBg)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
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
                            <span className="h-6 w-6 rounded flex items-center justify-center bg-white/[0.04] border border-white/10 text-[10px] font-mono text-slate-400 group-hover:border-cyan-500/40 group-hover:text-white transition-colors">
                              [{r.shortcut}]
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-slate-500 group-hover:text-slate-400">
                          <span className="truncate pr-2">{r.detail}</span>
                          <span className="flex items-center gap-0.5 text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0">
                            Launch <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Primary Quick Launch Action */}
                <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
                  <button
                    onClick={() => handleLaunch("operator")}
                    disabled={isNavigating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-4 py-3 font-medium text-sm text-black font-semibold shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] hover:brightness-110 active:scale-[0.99] transition-all"
                  >
                    <Zap className="h-4 w-4 fill-black text-black" />
                    <span>Enter Workspace with Primary Profile</span>
                    <span className="font-mono text-xs opacity-75">(Press Enter)</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                    <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">1</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">2</kbd>, or <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">3</kbd> for direct access</span>
                    <span className="text-slate-500">TIRTA v2.4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* 3. Refined Scientific & Institutional Footer                   */}
      {/* ------------------------------------------------------------- */}
      <footer className="relative z-20 border-t border-white/[0.07] bg-[#070a10]/80 py-4 font-mono text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-6 sm:px-8">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>IFEST DAC 2026 Finalist Prototype · Universitas Padjadjaran</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Directed River DAG Architecture</span>
            <span className="text-slate-600">·</span>
            <span>Spatial Graph Neural Networks</span>
            <span className="text-slate-600">·</span>
            <span>Hydrological Stress-Test CV</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
