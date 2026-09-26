"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to console for diagnosis
    console.error("Hydration/Runtime Error caught by (app)/error.tsx:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-border bg-surface-1 p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertOctagon className="h-6 w-6" />
        </div>

        <h2 className="text-base font-semibold text-fg tracking-tight">
          Operational View Error
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          A client rendering anomaly occurred while assembling the hydrological workspace.
        </p>

        {error?.message && (
          <div className="mt-3 p-2.5 rounded bg-surface-0 border border-border text-left font-mono text-[11px] text-fg-subtle overflow-x-auto max-h-24">
            <code>{error.message}</code>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 font-mono text-xs">
          <button
            onClick={() => reset()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-water text-black font-semibold hover:bg-water-hover transition-colors shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reload View
          </button>
          <Link
            href="/overview"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-surface-2 text-fg hover:bg-surface-3 transition-colors"
          >
            <Home className="h-3.5 w-3.5" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
