"use client";
import { useRouter } from "next/navigation";
import { Anchor, ShieldCheck, Activity, FlaskConical, Settings2, ArrowRight } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { PRODUCT, MODEL } from "@/config/constants";
import type { Role } from "@/types/domain";

const ROLES: { role: Role; label: string; description: string; icon: typeof Activity }[] = [
  { role: "operator", label: "Continue as Operator", description: "Monitoring · forecasts · alerts", icon: Activity },
  { role: "data_scientist", label: "Continue as Data Scientist", description: "Models · experiments · data quality · inference", icon: FlaskConical },
  { role: "administrator", label: "Continue as Administrator", description: "System health · audit logs · settings", icon: Settings2 },
];

function NetworkBackdrop() {
  const nodes = [[8, 82], [18, 64], [27, 71], [36, 52], [44, 58], [52, 40], [61, 46], [70, 30], [79, 36], [88, 18], [30, 30], [58, 74], [72, 62], [90, 60], [14, 40]];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [10, 3], [11, 6], [12, 8], [13, 9], [14, 1]];
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="lg" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M4 0H0V4" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.15" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#lg)" />
      {edges.map(([a, b], i) => (
        <g key={i}>
          <line x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#1f5f9e" strokeWidth="0.35" strokeOpacity="0.6" />
          <line x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#bfe2ff" strokeWidth="0.18" strokeOpacity="0.5" className="flow-line" style={{ strokeDasharray: "1 4" }} />
        </g>
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 0.7 : 0.45} fill={i % 5 === 0 ? "#3b9eff" : "#2c3a47"} />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const signIn = useUiStore((s) => s.signIn);
  const router = useRouter();
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <NetworkBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="mb-10 flex-1 lg:mb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-water-soft text-white"><Anchor className="h-5 w-5" /></div>
            <div>
              <div className="text-xl font-semibold tracking-[0.18em]">{PRODUCT.name}</div>
              <div className="t-caption">{PRODUCT.subtitle}</div>
            </div>
          </div>
          <h1 className="t-display mt-8 max-w-lg">Operational visibility into river water levels — and what the model expects next.</h1>
          <p className="t-body mt-4 max-w-lg text-fg-muted">{PRODUCT.fullName}. Segmented station routing, direct multi-horizon forecasting and spatial graph reconciliation across the Bengawan Solo watershed.</p>
          <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4">
            {[["30", "Monitoring stations"], [MODEL.holdoutRmse.toFixed(4), "Holdout RMSE"], ["7", "Forecast horizons"]].map(([v, k]) => (
              <div key={k} className="border-l border-border pl-3">
                <dt className="t-caption">{k}</dt>
                <dd className="t-metric text-lg mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="w-full max-w-md panel p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="t-h2">Sign in to Operations Console</h2>
            <span className="inline-flex items-center gap-1 t-caption text-ok"><ShieldCheck className="h-3.5 w-3.5" /> SSO · MFA</span>
          </div>
          <p className="t-caption mt-1">Select a demo identity. Role determines default workspace and access scope.</p>
          <div className="mt-5 space-y-2">
            {ROLES.map(({ role, label, description, icon: Icon }) => (
              <button key={role} onClick={() => { signIn(role); router.push("/overview"); }} className="group flex w-full items-center gap-3 rounded-md border border-border-strong bg-surface-2 px-3 py-3 text-left transition-colors hover:border-water hover:bg-surface-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-0 text-fg-muted group-hover:text-water"><Icon className="h-4 w-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block t-caption truncate">{description}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-fg-faint group-hover:text-fg" />
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 t-caption">
            <span>Environment: <span className="text-ok font-medium">PRODUCTION</span> · <span className="text-warn">DEMO</span></span>
            <span className="mono">{MODEL.productionVersion}</span>
          </div>
          <p className="t-caption mt-3">Data shown in this environment is simulated for demonstration purposes.</p>
        </div>
      </div>
    </div>
  );
}
