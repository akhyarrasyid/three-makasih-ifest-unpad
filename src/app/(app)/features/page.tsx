"use client";
import { useState } from "react";
import { Layers, Droplets, Compass, GitFork, BarChart3, ShieldCheck, ChevronRight } from "lucide-react";
import { PageHeader, Panel, Chip } from "@/components/ui/primitives";
import { FEATURE_FAMILIES } from "@/mock/models";
import { cn } from "@/lib/utils";

export default function FeaturesPage() {
  const [selectedFamilyId, setSelectedFamilyId] = useState(FEATURE_FAMILIES[0].id);
  const activeFamily = FEATURE_FAMILIES.find((f) => f.id === selectedFamilyId) ?? FEATURE_FAMILIES[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Feature Intelligence & Representation"
        subtitle="The 6 conceptual feature families engineered for next-month water-stress prediction across the directed river network."
        meta={
          <>
            <Chip tone="water">6 Feature Families</Chip>
            <Chip tone="ok">88 Total Features</Chip>
            <Chip tone="ai">Directed DAG Prior</Chip>
          </>
        }
      />

      {/* 6 Feature Families Navigation Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
        {FEATURE_FAMILIES.map((fam) => {
          const isSelected = fam.id === selectedFamilyId;
          return (
            <button
              key={fam.id}
              onClick={() => setSelectedFamilyId(fam.id)}
              className={cn(
                "p-3 rounded border text-left transition-all",
                isSelected
                  ? "bg-surface-2 border-water ring-1 ring-water shadow-md"
                  : "bg-surface-1 border-border hover:bg-surface-2"
              )}
            >
              <div className="flex items-center justify-between text-[10px] text-fg-subtle uppercase mb-1">
                <span>{fam.featureCount} Features</span>
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-water" />}
              </div>
              <div className="text-xs font-semibold text-fg leading-tight">
                {fam.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Family In-Depth Architecture Panel */}
      <Panel
        title={`${activeFamily.name} (${activeFamily.featureCount} Features)`}
        subtitle={activeFamily.description}
      >
        <div className="space-y-4 font-mono text-xs">
          {/* Conceptual Rationale */}
          <div className="p-3.5 rounded bg-surface-0 border border-border space-y-1.5">
            <span className="text-[10px] uppercase text-cyan-400 font-bold block">
              Hydrological & Physical Rationale
            </span>
            <p className="text-xs text-fg leading-relaxed">
              {activeFamily.rationale}
            </p>
          </div>

          {/* Feature List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-2/60 border-b border-border text-[10px] text-fg-subtle uppercase">
                <tr>
                  <th className="p-2.5">Feature Name</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Feature Importance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {activeFamily.features.map((feat) => (
                  <tr key={feat.name} className="hover:bg-surface-2 transition-colors">
                    <td className="p-2.5 font-medium text-water">{feat.name}</td>
                    <td className="p-2.5 text-fg-subtle text-[11px]">{feat.type}</td>
                    <td className="p-2.5 text-fg-muted text-[11px]">{feat.description}</td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-fg font-bold text-xs">
                          {(feat.importance * 100).toFixed(1)}%
                        </span>
                        <div className="w-16 bg-surface-3 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-water h-full rounded-full"
                            style={{ width: `${feat.importance * 100 * 3.5}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}
