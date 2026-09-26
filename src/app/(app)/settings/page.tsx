"use client";
import { RoleGate } from "@/features/shared/role-gate";
import { PageHeader, Panel, KV, Chip, Toggle, StatusBadge } from "@/components/ui/primitives";
import { useUiStore } from "@/store/ui-store";
import { RISK_THRESHOLDS, MODEL, DEMO_INTERVAL_MS, SIM_TICK_MS } from "@/config/constants";

export default function SettingsPage() {
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);
  const demoMode = useUiStore((s) => s.demoMode);
  const setDemoMode = useUiStore((s) => s.setDemoMode);
  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader title="Settings" subtitle="Platform configuration, risk thresholds, access control and simulation controls." meta={<Chip tone="warn">DEMO ENVIRONMENT · changes are not persisted</Chip>} />
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Risk thresholds" subtitle="Demonstration early-warning tiers derived from continuous model probability P(stress at t+1)">
            <KV k="LOW" v={`< ${RISK_THRESHOLDS.MODERATE * 100}%`} mono />
            <KV k="MODERATE" v={`${RISK_THRESHOLDS.MODERATE * 100}% – ${RISK_THRESHOLDS.HIGH * 100}%`} mono />
            <KV k="HIGH" v={`${RISK_THRESHOLDS.HIGH * 100}% – ${RISK_THRESHOLDS.CRITICAL * 100}%`} mono />
            <KV k="CRITICAL" v={`> ${RISK_THRESHOLDS.CRITICAL * 100}%`} mono />
            <p className="t-caption mt-2">Continuous model probability is interpreted into 4 operational early-warning tiers. These are demo thresholds based on the IFEST DAC 2026 framework.</p>
          </Panel>
          <Panel title="Model deployment" subtitle="Production routing configuration">
            <KV k="Production" v={<span className="mono text-accent-water">{MODEL.productionVersion}</span>} />
            <KV k="Ensemble Blend" v="0.625 CatBoost + 0.225 LightGBM + 0.150 XGBoost" />
            <KV k="Reachability Horizons" v="1–3 Hops Directed DAG" />
            <KV k="Validation Target" v="Stress-Test Chronology-Aware Split" />
            <KV k="Verified Public AP" v="0.7329" mono />
          </Panel>
          <Panel title="Access control" subtitle="Role-based access · SSO enforced · MFA required">
            {[["Operator", "Monitoring · Forecasts · River Network · Alerts (read/write)"], ["Data Scientist", "Models · Stress-Test Validation · Ablations · Inference · Graph (read)"], ["Administrator", "System Health · Audit Logs · Settings · all workspaces"]].map(([r, d]) => <KV key={r} k={r} v={<span className="text-fg-muted">{d}</span>} />)}
            <div className="mt-2 flex items-center gap-2 t-caption"><StatusBadge status="SUCCESS" dot={false} /> Session policy: 8h idle timeout · device binding · IP allow-list</div>
          </Panel>
          <Panel title="Simulation" subtitle="Demo runtime controls">
            <div className="flex items-center justify-between py-1.5 border-b border-border"><span className="t-body-sm text-fg-subtle">Demo mode</span><Toggle checked={demoMode} onChange={setDemoMode} label="Demo mode" /></div>
            <KV k="Real-time interval" v={`${DEMO_INTERVAL_MS / 1000} s`} mono />
            <KV k="Simulated step" v={`${SIM_TICK_MS / 60000} min per tick`} mono />
            <KV k="Scenario" v="Upstream headwater deficit propagation → tributary stress → downstream mainstem limitation" />
            <div className="flex items-center justify-between py-1.5"><span className="t-body-sm text-fg-subtle">Table density</span><div className="seg"><button aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")}>Comfortable</button><button aria-pressed={density === "compact"} onClick={() => setDensity("compact")}>Compact</button></div></div>
          </Panel>
        </div>
      </div>
    </RoleGate>
  );
}
