"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { GitFork, ArrowDown, Compass, ShieldAlert, ArrowRight, Layers, Cpu, CheckCircle2 } from "lucide-react";
import { useSelectionStore } from "@/store/selection-store";
import { useStations, useNetwork } from "@/hooks/use-api";
import { PageHeader, Panel, MetricCard, Chip, RiskBadge, StationBadge } from "@/components/ui/primitives";
import {
  STATIC_STATIONS,
  STATIC_STATION_MAP,
  NETWORK_METRICS,
  getUpstream1Hop,
  getUpstream2Hop,
  getUpstream3Hop,
  getDownstreamPath,
} from "@/data/network-static";
import { cn } from "@/lib/utils";

export default function GraphIntelligencePage() {
  const selected = useSelectionStore((s) => s.selectedStationId);
  const selectStation = useSelectionStore((s) => s.selectStation);
  const stations = useStations();
  const network = useNetwork();

  const list = stations.data ?? [];
  const activeHucId = selected || "HUC-DEMO-0014";
  const stn = STATIC_STATION_MAP[activeHucId] ?? STATIC_STATIONS[0];
  const snap = list.find((s) => s.station.id === activeHucId);

  // Reachability calculation for selected basin
  const up1 = getUpstream1Hop(activeHucId);
  const up2 = getUpstream2Hop(activeHucId);
  const up3 = getUpstream3Hop(activeHucId);
  const downPath = getDownstreamPath(activeHucId);

  // Build the vertical Reachability Trace path
  const traceSteps = useMemo(() => {
    const steps: {
      role: string;
      hop: string;
      id: string;
      isTarget: boolean;
      color: string;
    }[] = [];

    if (up3.length > 0) {
      steps.push({
        role: "3-Hop Upstream Catchment",
        hop: "3-hop up",
        id: up3[0],
        isTarget: false,
        color: "border-cyan-800 text-cyan-300",
      });
    }
    if (up2.length > 0) {
      steps.push({
        role: "2-Hop Upstream Contributor",
        hop: "2-hop up",
        id: up2[0],
        isTarget: false,
        color: "border-cyan-600 text-cyan-400",
      });
    }
    if (up1.length > 0) {
      steps.push({
        role: "1-Hop Direct Tributary",
        hop: "1-hop up",
        id: up1[0],
        isTarget: false,
        color: "border-cyan-400 text-cyan-400",
      });
    }

    // Target node
    steps.push({
      role: "Selected Target Sub-Basin",
      hop: "Target Node",
      id: activeHucId,
      isTarget: true,
      color: "border-water text-water bg-water/10",
    });

    // Downstream receiving nodes
    if (downPath.length > 0) {
      steps.push({
        role: "Direct Receiving Downstream",
        hop: "1-hop down",
        id: downPath[0],
        isTarget: false,
        color: "border-emerald-500 text-emerald-400",
      });
    }
    if (downPath.length > 1) {
      steps.push({
        role: "Secondary Receiving Downstream",
        hop: "2-hop down",
        id: downPath[1],
        isTarget: false,
        color: "border-emerald-700 text-emerald-500",
      });
    }

    return steps;
  }, [activeHucId, up1, up2, up3, downPath]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Graph Intelligence & Directed Reachability"
        subtitle="Mathematical formulation of the directed river network DAG, multi-hop reachability operators, and hydrological propagation."
        meta={
          <>
            <Chip tone="water">Directed DAG (id → to_id)</Chip>
            <Chip tone="ok">3-Hop Reachability</Chip>
            <Chip tone="ai">Learned GNN Topology</Chip>
          </>
        }
      />

      {/* DAG Topological Metrics Strip per Prompt Section 20 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono">
        <MetricCard label="Nodes (Demo)" value={STATIC_STATIONS.length} unit="sub-basins" hint="Rendered DAG" />
        <MetricCard label="Total Coverage" value={NETWORK_METRICS.totalTestHuc12.toLocaleString()} unit="HUC12" hint="Regional scope" />
        <MetricCard label="Directed Edges" value={NETWORK_METRICS.directedEdges} hint="Physical flow links" tone="water" />
        <MetricCard label="Headwaters" value={NETWORK_METRICS.headwaterNodes} hint="Source origins" />
        <MetricCard label="Terminal Outlets" value={NETWORK_METRICS.outletNodes} hint="Discharge points" tone="ok" />
        <MetricCard label="Max DAG Depth" value={`Level ${NETWORK_METRICS.maxGraphDepth}`} hint="Longest flow chain" />
        <MetricCard label="Mean Degree" value={NETWORK_METRICS.meanUpstreamDegree.toFixed(2)} hint="Average in-degree" />
        <MetricCard label="Cold-Start Holdouts" value={NETWORK_METRICS.coldStartNodes} hint="Zero lineage" tone="warn" />
      </div>

      {/* Interactive Sub-Basin Selector */}
      <div className="panel flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <label className="text-fg-subtle uppercase text-[10px]">Select Root HUC12</label>
          <select
            className="input font-mono text-xs"
            value={activeHucId}
            onChange={(e) => selectStation(e.target.value)}
            aria-label="Select HUC12 Sub-Basin"
          >
            {STATIC_STATIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id}) · Level {s.graphDepth}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-fg-subtle">
            Upstream Neighborhood: <strong className="text-cyan-400">{up1.length + up2.length + up3.length} basins</strong>
          </span>
          <span className="text-fg-subtle">
            Downstream Path: <strong className="text-emerald-400">{downPath.length} hops to outlet</strong>
          </span>
          <Link href={`/network?station=${activeHucId}`} className="text-water hover:underline flex items-center gap-1">
            Open in Network Workspace <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Main Visual: Vertical Reachability Trace Inspector per Prompt Section 20 */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel
          title="Reachability Trace Inspector"
          subtitle={`Physical upstream-to-downstream water flow sequence centered on ${stn.name}`}
        >
          <div className="py-4 px-2 space-y-2 font-mono">
            {traceSteps.map((step, idx) => {
              const nodeStatic = STATIC_STATION_MAP[step.id];
              const nodeSnap = list.find((s) => s.station.id === step.id);
              const isLast = idx === traceSteps.length - 1;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  {/* Step Card */}
                  <div
                    onClick={() => selectStation(step.id)}
                    className={cn(
                      "w-full max-w-lg p-3 rounded-md border transition-all cursor-pointer",
                      step.isTarget
                        ? "border-water bg-water/10 shadow-lg ring-1 ring-water"
                        : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", step.color)}>
                          {step.hop}
                        </span>
                        <span className="font-semibold text-xs text-fg">{nodeStatic?.name ?? step.id}</span>
                        <span className="text-[10px] text-fg-subtle">({step.id})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {nodeSnap && <RiskBadge risk={nodeSnap.risk} />}
                        <span className="text-[10px] text-cyan-400">Level {nodeStatic?.graphDepth ?? 1}</span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-4 gap-2 pt-2 border-t border-border/50 text-[11px] text-fg-subtle">
                      <div>
                        <span className="text-[9px] uppercase text-fg-faint block">Supply</span>
                        <span className="text-fg font-medium">{nodeSnap?.currentSupply.toFixed(1) ?? "—"} m³/s</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-fg-faint block">Withdrawal</span>
                        <span className="text-amber-400 font-medium">{nodeSnap?.totalWithdrawal.toFixed(1) ?? "—"} m³/s</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-fg-faint block">Anomaly</span>
                        <span className={cn(nodeSnap && nodeSnap.climatologyAnomalySigma < 0 ? "text-amber-400" : "text-emerald-400")}>
                          {nodeSnap ? `${nodeSnap.climatologyAnomalySigma >= 0 ? "+" : ""}${nodeSnap.climatologyAnomalySigma.toFixed(2)}σ` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-fg-faint block">Next Risk</span>
                        <span className="text-fg font-bold">
                          {nodeSnap ? `${(nodeSnap.riskScore * 100).toFixed(0)}%` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Flow Direction Arrow */}
                  {!isLast && (
                    <div className="flex items-center justify-center my-1 text-cyan-400">
                      <ArrowDown className="h-4 w-4 animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Directed Multi-Hop Reachability Features Breakdown */}
        <div className="space-y-4">
          <Panel
            title="Directed Reachability Neighborhood"
            subtitle="Extracted topological features for GBDT & GNN feature vectors"
          >
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded bg-surface-0 border border-border space-y-1.5">
                <span className="text-[10px] uppercase text-cyan-400 font-semibold block">
                  Upstream Reachability Operator N_up(v)
                </span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">1-Hop Direct Inflow:</span>
                    <span className="text-fg font-medium">{up1.join(", ") || "None (Headwater)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">2-Hop Extended Catchment:</span>
                    <span className="text-fg font-medium">{up2.join(", ") || "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">3-Hop Regional Horizon:</span>
                    <span className="text-fg font-medium">{up3.join(", ") || "None"}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded bg-surface-0 border border-border space-y-1.5">
                <span className="text-[10px] uppercase text-emerald-400 font-semibold block">
                  Downstream Transmission Path N_down(v)
                </span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Immediate Receiving Node:</span>
                    <span className="text-fg font-medium">{stn.downstreamStationId ?? "Terminal Estuary Outlet"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Path to Regional Outlet:</span>
                    <span className="text-fg font-medium">{downPath.length} hops remaining</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded bg-surface-0 border border-border space-y-1.5">
                <span className="text-[10px] uppercase text-purple-400 font-semibold block">
                  GNN Directed Propagation
                </span>
                <p className="text-[11px] text-fg-subtle leading-relaxed">
                  Message passing distinguishes physical upstream water contribution from downstream backwater
                  limitation via separate projection matrices W_up and W_down, preserving causal hydrography.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
