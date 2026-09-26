"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#0b0f17] text-white flex min-h-screen items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full rounded-lg border border-white/10 bg-[#121927] p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
            ⚠️
          </div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            System Initialization Error
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            A critical runtime error prevented the application from rendering.
          </p>

          {error?.message && (
            <div className="mt-3 p-2.5 rounded bg-black/40 border border-white/10 text-left font-mono text-[11px] text-gray-300 overflow-x-auto max-h-24">
              <code>{error.message}</code>
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 font-mono text-xs">
            <button
              onClick={() => reset()}
              className="px-3 py-1.5 rounded bg-cyan-400 text-black font-semibold hover:bg-cyan-300 transition-colors shadow-sm"
            >
              Retry
            </button>
            <button
              onClick={() => (window.location.href = "/overview")}
              className="px-3 py-1.5 rounded border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
