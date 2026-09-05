"use client";
import { cn } from "@/lib/utils";

export function MapLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "panel p-2.5 shadow-lg bg-surface-0/95 border border-border space-y-2 text-[11px] font-mono text-fg-subtle select-none max-w-[280px]",
        className
      )}
    >
      <div className="text-[10px] uppercase font-semibold text-fg tracking-wider pb-1 border-b border-border/70 flex items-center justify-between">
        <span>Symbology</span>
        <span className="text-[10px] text-fg-faint font-normal">WGS 84</span>
      </div>

      {/* Network Station Symbology */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-water shrink-0" />
          <span className="text-fg">Primary Station (25 connected)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-fg-subtle bg-transparent shrink-0" />
          <span className="text-fg-subtle">Outside Station (5 monitored)</span>
        </div>
      </div>

      {/* Hydrological Geometry */}
      <div className="space-y-1.5 pt-1.5 border-t border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center w-4 justify-center">
            <span className="h-0.5 w-4 bg-water rounded-full" />
          </div>
          <span className="text-fg">Primary Network (24 edges)</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center w-4 justify-center">
            <span className="h-0.5 w-4 bg-blue-400/50 rounded-full" />
          </div>
          <span className="text-fg-subtle">Bengawan Solo River</span>
        </div>
      </div>

      {/* Alert Status Semantics */}
      <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-1 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          <span>Low</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
          <span>Mod</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
          <span>High</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
          <span>Crit</span>
        </span>
      </div>
    </div>
  );
}
