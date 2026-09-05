"use client";
import { type CSSProperties, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL } from "@/mock/stations";
import type { AlertSeverity, AlertStatus, RiskLevel, StationCategory, StationStatus, TrendDirection } from "@/types/domain";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Minus, RefreshCw, Inbox, X, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Restrained Semantic Badges & Indicators                            */
/* ------------------------------------------------------------------ */

export const RISK_STYLES: Record<RiskLevel, { dot: string; hex: string; text: string }> = {
  LOW: { dot: "bg-ok", hex: "#2ea043", text: "text-ok" },
  MODERATE: { dot: "bg-warn", hex: "#d29922", text: "text-warn" },
  HIGH: { dot: "bg-[#f0883e]", hex: "#f0883e", text: "text-[#f0883e]" },
  CRITICAL: { dot: "bg-crit", hex: "#f85149", text: "text-crit" },
};

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  const s = RISK_STYLES[risk];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium mono", s.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
      {risk}
    </span>
  );
}

export function StationBadge({ category, className, short }: { category: StationCategory; className?: string; short?: boolean }) {
  return (
    <span className={cn("inline-flex items-center text-[11px] text-fg-subtle mono", className)}>
      {short ? category.replace("_WEIR", "").slice(0, 3) : CATEGORY_LABEL[category]}
    </span>
  );
}

export function SeverityBadge({ severity, className }: { severity: AlertSeverity; className?: string }) {
  const isCrit = severity === "CRITICAL";
  const isWarn = severity === "WARNING";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium mono", isCrit ? "text-crit" : isWarn ? "text-warn" : "text-fg-muted", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isCrit ? "bg-crit" : isWarn ? "bg-warn" : "bg-fg-subtle")} />
      {severity.replace("_", " ")}
    </span>
  );
}

export function StatusBadge({ status, className, dot = true }: { status: StationStatus | AlertStatus | string; className?: string; dot?: boolean }) {
  const isHealthy = status === "ONLINE" || status === "HEALTHY" || status === "SUCCESS" || status === "RESOLVED" || status === "PRODUCTION";
  const isWarn = status === "STALE" || status === "DEGRADED" || status === "DENIED" || status === "TIMEOUT" || status === "CANDIDATE";
  const isCrit = status === "OFFLINE" || status === "DOWN" || status === "ERROR" || status === "FAILURE" || status === "FAILED" || status === "OPEN";
  const tone = isHealthy ? "text-ok" : isWarn ? "text-warn" : isCrit ? "text-crit" : "text-fg-muted";
  const dotBg = isHealthy ? "bg-ok" : isWarn ? "bg-warn" : isCrit ? "bg-crit" : "bg-fg-subtle";

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium mono", tone, className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotBg)} />}
      {status}
    </span>
  );
}

export function TrendIcon({ trend, className }: { trend: TrendDirection; className?: string }) {
  if (trend === "RISING") return <ArrowUpRight className={cn("h-3.5 w-3.5 text-warn", className)} aria-label="Rising" />;
  if (trend === "FALLING") return <ArrowDownRight className={cn("h-3.5 w-3.5 text-ok", className)} aria-label="Falling" />;
  return <Minus className={cn("h-3.5 w-3.5 text-fg-subtle", className)} aria-label="Stable" />;
}

export function Chip({ children, className, tone = "neutral" }: { children: ReactNode; className?: string; tone?: "neutral" | "water" | "ai" | "subtle" | "ok" | "warn" | "crit" }) {
  const tones = {
    neutral: "text-fg-muted border-border bg-surface-2",
    water: "text-water border-border bg-surface-2",
    ai: "text-fg border-border bg-surface-2",
    subtle: "text-fg-subtle border-border bg-surface-2",
    ok: "text-ok border-border bg-surface-2",
    warn: "text-warn border-border bg-surface-2",
    crit: "text-crit border-border bg-surface-2",
  };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[11px] font-mono border leading-tight", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces, Panels & Continuous Layouts                              */
/* ------------------------------------------------------------------ */

export function Panel({ title, subtitle, actions, children, className, bodyClassName, noPad }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; noPad?: boolean }) {
  return (
    <section className={cn("panel flex flex-col min-w-0", className)}>
      {(title || actions) && (
        <header className="panel-header">
          <div className="min-w-0">
            {title && <h3 className="t-h3 text-fg truncate">{title}</h3>}
            {subtitle && <p className="t-caption mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cn(noPad ? "" : "panel-body", "min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, unit, hint, delta, tone = "neutral", icon, className }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode; delta?: { value: string; direction: "up" | "down" | "flat"; positive?: boolean }; tone?: "neutral" | "water" | "ai" | "ok" | "warn" | "crit"; icon?: ReactNode; className?: string; sparkline?: number[] }) {
  const toneText = { neutral: "text-fg", water: "text-water", ai: "text-fg", ok: "text-ok", warn: "text-warn", crit: "text-crit" }[tone];
  return (
    <div className={cn("p-3.5 bg-surface-1 border border-border rounded-md flex flex-col justify-between min-w-0", className)}>
      <div className="flex items-center justify-between gap-1.5">
        <span className="t-eyebrow truncate">{label}</span>
        {icon && <span className="text-fg-faint">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 min-w-0">
        <span className={cn("t-metric-large truncate", toneText)}>{value}</span>
        {unit && <span className="t-caption text-fg-muted">{unit}</span>}
      </div>
      {(hint || delta) && (
        <div className="mt-2 flex items-center gap-2 t-caption">
          {delta && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium mono", delta.positive === undefined ? "text-fg-muted" : delta.positive ? "text-ok" : "text-crit")}>
              {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→"}
              {delta.value}
            </span>
          )}
          {hint && <span className="truncate text-fg-subtle">{hint}</span>}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ data, width = 72, height = 20, stroke = "#388bfd", className }: { data: number[]; width?: number; height?: number; stroke?: string; className?: string; fill?: boolean }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)] as const);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

export function KV({ k, v, mono = false, className }: { k: ReactNode; v: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1.5 border-b border-border-subtle last:border-0", className)}>
      <span className="t-body-sm text-fg-subtle">{k}</span>
      <span className={cn("t-body-sm text-fg text-right", mono && "mono")}>{v}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide-over Drawer for Contextual Secondary Information             */
/* ------------------------------------------------------------------ */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
  width = "w-full max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-auto transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-auto">
        <aside className={cn("flex flex-col bg-surface-1 border-l border-border shadow-2xl slide-in-right", width)}>
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-0 shrink-0">
            <div className="min-w-0 pr-2">
              <h2 className="text-sm font-semibold text-fg truncate">{title}</h2>
              {subtitle && <p className="t-caption mt-0.5 truncate">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {actions}
              <button onClick={onClose} className="btn btn-ghost btn-sm !h-7 !w-7 !p-0" aria-label="Close panel">
                <X className="h-4 w-4 text-fg-muted hover:text-fg" />
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">{children}</div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string | number>({ options, value, onChange, ariaLabel, className }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; ariaLabel: string; className?: string }) {
  return (
    <div className={cn("seg", className)} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, size = "md" }: { checked: boolean; onChange: (v: boolean) => void; label: string; size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-7 h-4" : "w-8 h-4.5";
  const knob = size === "sm" ? "h-3 w-3 translate-x-0.5" : "h-3.5 w-3.5 translate-x-0.5";
  const on = size === "sm" ? "translate-x-3.5" : "translate-x-3.5";
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative inline-flex shrink-0 items-center rounded-full border transition-colors", w, checked ? "bg-[#235a96] border-[#2d73be]" : "bg-surface-3 border-border-strong")}>
      <span className={cn("inline-block rounded-full bg-white transition-transform", knob, checked && on)} />
    </button>
  );
}

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "right" | "bottom" }) {
  const pos = { top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5", right: "left-full top-1/2 -translate-y-1/2 ml-2", bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5" }[side];
  return (
    <span className="relative inline-flex group/tt">
      {children}
      <span role="tooltip" className={cn("pointer-events-none absolute z-50 hidden group-hover/tt:block group-focus-within/tt:block whitespace-nowrap rounded-[3px] border border-border-strong bg-surface-3 px-2 py-1 text-[11px] text-fg shadow-md", pos)}>
        {content}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} aria-hidden="true" />;
}

export function LoadingState({ label = "Loading", rows = 4, className }: { label?: string; rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2 p-4", className)} role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i % 3 === 0 ? "w-3/4" : i % 3 === 1 ? "w-full" : "w-1/2")} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="relative w-full" style={{ height }} role="status" aria-label="Loading chart">
      <div className="absolute inset-x-0 top-0 flex gap-3">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <div className="absolute inset-x-0 bottom-6 top-6 flex items-end gap-1 px-1">
        {Array.from({ length: 36 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${30 + Math.abs(Math.sin(i / 3)) * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-subtle">{icon ?? <Inbox className="h-4 w-4" />}</div>
      <p className="t-h3">{title}</p>
      {description && <p className="t-body-sm text-fg-subtle max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Service temporarily unavailable", error, onRetry, correlationId }: { title?: string; error?: unknown; onRetry?: () => void; correlationId?: string }) {
  const [open, setOpen] = useState(false);
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  const corr = correlationId ?? (error && typeof error === "object" && "correlationId" in error ? String((error as { correlationId: string }).correlationId) : undefined);
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center" role="alert">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#5c1e20] bg-crit-dim/40 text-crit">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <p className="t-h3">{title}</p>
      <p className="t-body-sm text-fg-subtle max-w-sm">The request could not be completed. Retry or inspect the correlation ID.</p>
      {corr && <p className="mono text-fg-subtle text-xs">Correlation ID: <span className="text-fg">{corr}</span></p>}
      <div className="flex gap-2 mt-1">
        {onRetry && (
          <button className="btn btn-sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
        <button className="btn btn-sm btn-ghost" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide details" : "Technical details"}
        </button>
      </div>
      {open && <pre className="mt-2 max-w-md overflow-auto rounded-md border border-border bg-surface-0 p-3 text-left mono text-fg-muted">{message}</pre>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

export function Dialog({ open, onClose, title, description, children, footer, width = "max-w-md" }: { open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn("panel w-full fade-up shadow-2xl", width)} onClick={(e) => e.stopPropagation()}>
        <header className="panel-header items-center">
          <div>
            <h2 className="t-h2">{title}</h2>
            {description && <p className="t-caption mt-0.5">{description}</p>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close dialog">
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        {children && <div className="panel-body">{children}</div>}
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", danger, busy }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel?: string; danger?: boolean; busy?: boolean }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={cn("btn", danger ? "btn-danger" : "btn-primary")} onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}

export function PageHeader({ title, subtitle, actions, meta }: { title: string; subtitle?: string; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-border/80 pb-4">
      <div className="min-w-0">
        <h1 className="t-h1 text-fg">{title}</h1>
        {subtitle && <p className="t-body-sm text-fg-muted mt-0.5">{subtitle}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
