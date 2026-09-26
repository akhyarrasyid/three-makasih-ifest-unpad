"use client";
import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader, Panel, Chip } from "@/components/ui/primitives";
import { ABLATION_STUDY } from "@/mock/models";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | "IMPROVED" | "SUPPORTED" | "NEUTRAL" | "OVERFIT" | "REJECTED";

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  IMPROVED: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  SUPPORTED: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  NEUTRAL: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
  UNSTABLE: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  OVERFIT: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  REJECTED: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
};

export default function AblationPage() {
  const [filter, setFilter] = useState<StatusFilter>("ALL");

  const filtered = ABLATION_STUDY.filter((a) => {
    if (filter === "ALL") return true;
    return a.status === filter;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ablation Study & Research Findings"
        subtitle="Empirical component impact analysis across feature engineering, graph representations, and validation frameworks."
        meta={
          <>
            <Chip tone="ok">Evidence-Based</Chip>
            <Chip tone="water">Climatology Anomaly (+0.0412)</Chip>
            <Chip tone="warn">Negative Results Disclosed</Chip>
          </>
        }
      />

      {/* Thematic Finding Callout: Climatology Anomaly Dominance */}
      <div className="panel p-4 bg-surface-1 border border-border space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <span className="font-semibold text-fg text-xs uppercase tracking-wider">
            Primary Empirical Finding: Climatological Anomaly Dominance
          </span>
          <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
            Strongest Signal (+0.0412 AP)
          </span>
        </div>
        <p className="text-fg-muted text-[11px] leading-relaxed">
          The single most decisive feature family discovered in the research was the long-term climatological anomaly
          (current monthly supply vs. 14-year seasonal mean in units of σ). Raw water supply alone failed to capture
          drought severity because baseline streamflow varies by an order of magnitude between wet and dry months.
          Contrasting current flow against seasonal normal exposed acute stress across both headwaters and mainstem basins.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {(["ALL", "IMPROVED", "SUPPORTED", "NEUTRAL", "OVERFIT", "REJECTED"] as StatusFilter[]).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={cn(
              "px-2.5 py-1 rounded border transition-colors text-[11px]",
              filter === st
                ? "bg-surface-2 border-water text-fg font-semibold"
                : "bg-surface-1 border-border text-fg-subtle hover:text-fg"
            )}
          >
            {st} ({st === "ALL" ? ABLATION_STUDY.length : ABLATION_STUDY.filter((a) => a.status === st).length})
          </button>
        ))}
      </div>

      {/* Ablation Findings Table */}
      <Panel
        title="Ablation Experiments Matrix"
        subtitle="Impact on Average Precision relative to the baseline"
        noPad
      >
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs text-left">
            <thead className="bg-surface-2/60 border-b border-border text-[10px] text-fg-subtle uppercase">
              <tr>
                <th className="p-3">Component / Hypothesis</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">AP Delta</th>
                <th className="p-3">Validation AP</th>
                <th className="p-3">Scientific Finding & Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((item) => {
                const delta = item.delta ?? item.deltaAp;
                const isPositive = delta > 0;
                const isNeutral = delta === 0;
                const badge = STATUS_STYLE[item.status] ?? STATUS_STYLE.NEUTRAL;
                const valAp = item.validationAp ?? (0.7329 + delta);
                const finding = item.finding ?? item.evidence;

                return (
                  <tr key={item.component} className="hover:bg-surface-2 transition-colors">
                    <td className="p-3 font-semibold text-fg">{item.component}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded border text-[10px] font-bold uppercase",
                          badge.bg,
                          badge.text,
                          badge.border
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">
                      <span
                        className={cn(
                          "flex items-center justify-end gap-1",
                          isPositive ? "text-emerald-400" : isNeutral ? "text-fg-subtle" : "text-red-400"
                        )}
                      >
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : isNeutral ? <Minus className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {isPositive ? `+${delta.toFixed(4)}` : delta.toFixed(4)}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-fg">
                      {valAp.toFixed(4)}
                    </td>
                    <td className="p-3 text-fg-muted text-[11px] max-w-[480px]">
                      {finding}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
