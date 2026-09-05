import { jakartaDayjs } from "@/lib/time";

export function fmtTime(input: number | string | Date, withSeconds = true): string {
  if (!input) return "—";
  return jakartaDayjs(input).format(withSeconds ? "HH:mm:ss" : "HH:mm");
}

export function fmtDateTime(input: number | string | Date): string {
  if (!input) return "—";
  return jakartaDayjs(input).format("DD MMM, HH:mm");
}

export function fmtDate(input: number | string | Date): string {
  if (!input) return "—";
  return jakartaDayjs(input).format("DD MMM YYYY");
}

export function fmtShortDate(input: number | string | Date): string {
  if (!input) return "—";
  return jakartaDayjs(input).format("DD MMM");
}

export function fmtNumber(v: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

export function fmtMeters(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v.toFixed(digits)} m`;
}

export function fmtPct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} sec`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
}

export function fmtRelative(input: number | string, now: number): string {
  const diff = Math.max(0, now - new Date(input).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function fmtDelta(v: number, digits = 2, unit = "m"): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(digits)} ${unit}`.trim();
}
