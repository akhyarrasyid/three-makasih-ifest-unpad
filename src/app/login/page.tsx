"use client";
import { useRouter } from "next/navigation";
import { Droplets, ShieldCheck, Activity, FlaskConical, Settings2, ArrowRight, GitFork } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { PRODUCT, DATASET, SCORES } from "@/config/constants";
import type { Role } from "@/types/domain";

const ROLES: { role: Role; label: string; description: string; icon: typeof Activity }[] = [
  {
    role: "operator",
    label: "Continue as Water Operator",
    description: "Operational monitoring · forecasts · river network · alerts",
    icon: Activity,
  },
  {
    role: "data_scientist",
    label: "Continue as Data Scientist",
    description: "Model registry · Stress-Test validation · ablations · GNN research",
    icon: FlaskConical,
  },
  {
    role: "administrator",
    label: "Continue as Administrator",
    description: "System health · service telemetry · audit trails",
    icon: Settings2,
  },
];

function DirectedRiverBackdrop() {
  const nodes = [
    [10, 20], [22, 35], [15, 60], [35, 45], [48, 30],
    [52, 65], [68, 50], [75, 25], [84, 60], [92, 45],
    [28, 80], [42, 85], [62, 78], [80, 82], [38, 15],
  ];
  const edges = [
    [0, 1], [1, 3], [2, 3], [3, 4], [4, 6],
    [5, 6], [6, 7], [6, 8], [8, 9], [7, 9],
    [10, 11], [11, 5], [12, 8], [13, 9], [14, 4],
  ];

  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="lg-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M4 0H0V4" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.15" />
        </pattern>
        <marker
          id="flow-dir-login"
          viewBox="0 0 8 8"
          refX="6"
          refY="4"
          markerWidth="4"
          markerHeight="4"
          orient="auto"
        >
          <path d="M1 1.5 L6.5 4 L1 6.5 z" fill="#388bfd" opacity="0.8" />
        </marker>
      </defs>
      <rect width="100" height="100" fill="url(#lg-grid)" />
      {edges.map(([a, b], i) => (
        <g key={i}>
          <line
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            stroke="#1e3a5f"
            strokeWidth="0.35"
            strokeOpacity="0.7"
            markerEnd="url(#flow-dir-login)"
          />
          <line
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            stroke="#38bdf8"
            strokeWidth="0.15"
            strokeOpacity="0.5"
            strokeDasharray="1 3"
          />
        </g>
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 0.75 : 0.5}
          fill={i % 4 === 0 ? "#38bdf8" : i % 3 === 0 ? "#22c55e" : "#1e293b"}
          stroke="#090d12"
          strokeWidth="0.2"
        />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const signIn = useUiStore((s) => s.signIn);
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <DirectedRiverBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12 lg:flex-row lg:items-center lg:gap-16">
        {/* Left Hero Description */}
        <div className="mb-10 flex-1 lg:mb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-water text-white shadow-md">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-[0.2em] font-mono text-fg">
                {PRODUCT.name}
              </div>
              <div className="text-xs text-water font-medium">
                {PRODUCT.fullName}
              </div>
            </div>
          </div>

          <div className="mt-2 text-xs font-mono text-fg-subtle">
            {PRODUCT.subtitle}
          </div>

          <h1 className="t-display mt-8 max-w-lg text-fg font-semibold tracking-tight">
            Forecasting next-month water stress across interconnected river basins through hydrological intelligence and directed graph learning.
          </h1>

          <p className="t-body mt-4 max-w-lg text-fg-muted leading-relaxed">
            Operational decision-support prototype based on the IFEST DAC 2026 research framework.
            Continuous risk probability prediction across 2,982 HUC12 sub-basins with 3-hop directed reachability.
          </p>

          <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4 font-mono">
            <div className="border-l border-border pl-3">
              <dt className="text-[10px] uppercase text-fg-subtle">Forecast HUC12s</dt>
              <dd className="text-base font-bold text-fg mt-0.5">{DATASET.testHuc12.toLocaleString()}</dd>
            </div>
            <div className="border-l border-border pl-3">
              <dt className="text-[10px] uppercase text-fg-subtle">Historical Origins</dt>
              <dd className="text-base font-bold text-fg mt-0.5">{DATASET.historicalOrigins} (14 yrs)</dd>
            </div>
            <div className="border-l border-border pl-3">
              <dt className="text-[10px] uppercase text-ok">Verified Public</dt>
              <dd className="text-base font-bold text-ok mt-0.5">{SCORES.verifiedPublicAp.toFixed(4)} AP</dd>
            </div>
          </dl>
        </div>

        {/* Right Sign-in Panel */}
        <div className="w-full max-w-md panel p-6 shadow-2xl bg-surface-0/95 border border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Sign in to Operations Console</h2>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ok">
              <ShieldCheck className="h-3.5 w-3.5" /> SSO Active
            </span>
          </div>
          <p className="text-xs text-fg-subtle mt-1 font-mono">
            Select a role identity. Role determines default workspace and access scope.
          </p>

          <div className="mt-5 space-y-2">
            {ROLES.map(({ role, label, description, icon: Icon }) => (
              <button
                key={role}
                onClick={() => {
                  signIn(role);
                  router.push("/overview");
                }}
                className="group flex w-full items-center gap-3 rounded-md border border-border bg-surface-1 px-3 py-3 text-left transition-colors hover:border-water hover:bg-surface-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-0 text-fg-muted group-hover:text-water">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-fg">{label}</span>
                  <span className="block text-[11px] text-fg-subtle truncate">{description}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-fg transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 font-mono text-[11px] text-fg-subtle">
            <span>
              Environment: <span className="text-amber-400 font-medium">DEMO ENVIRONMENT</span>
            </span>
            <span className="text-fg">TIRTA v2.4</span>
          </div>
          <p className="text-[10px] font-mono text-fg-faint mt-2">
            Operational prototype based on the IFEST DAC 2026 research framework.
          </p>
        </div>
      </div>
    </div>
  );
}
