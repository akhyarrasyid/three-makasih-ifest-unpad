"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Eye, Lock, ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { ALL_NAV_ITEMS, accessFor } from "@/config/navigation";
import { useUiStore } from "@/store/ui-store";
import { ROLE_LABELS } from "@/config/constants";
import type { ReactNode } from "react";

export function RoleGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUiStore((s) => s.user);
  const signIn = useUiStore((s) => s.signIn);
  const signOut = useUiStore((s) => s.signOut);
  const item = ALL_NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  const access = item ? accessFor(item, user?.role) : "full";

  if (access === "denied") {
    return (
      <div className="panel flex flex-col items-center justify-center gap-4 py-16 text-center max-w-lg mx-auto my-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-subtle">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="t-h2">Access restricted</h1>
          <p className="t-body-sm text-fg-muted max-w-sm mt-1 mx-auto">
            Your role <span className="text-fg font-medium">{user ? ROLE_LABELS[user.role] : "Guest"}</span> does not have permission to access <span className="text-fg font-medium">{item?.label}</span>.
          </p>
        </div>

        {/* Demo role switch quick actions */}
        <div className="w-full rounded-md border border-border bg-surface-1 p-3 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-fg-subtle uppercase tracking-wider">Demo: Switch Role</span>
            <span className="text-[10px] text-ok flex items-center gap-1 font-mono"><ShieldCheck className="h-3 w-3" /> Demo Mode</span>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => signIn("administrator")}
              className="flex w-full items-center justify-between rounded px-2.5 py-2 text-xs bg-surface-2 hover:bg-surface-3 border border-border text-fg transition-colors"
            >
              <div>
                <span className="font-medium text-water">Administrator</span>
                <span className="text-fg-muted block text-[11px]">Full access (Settings, Health, Audit, Models)</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-fg-subtle shrink-0" />
            </button>
            <button
              onClick={() => signIn("data_scientist")}
              className="flex w-full items-center justify-between rounded px-2.5 py-2 text-xs bg-surface-2 hover:bg-surface-3 border border-border text-fg transition-colors"
            >
              <div>
                <span className="font-medium">Data Scientist</span>
                <span className="text-fg-muted block text-[11px]">Models, Inference, Experiments, Data Quality</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-fg-subtle shrink-0" />
            </button>
            <button
              onClick={() => signIn("operator")}
              className="flex w-full items-center justify-between rounded px-2.5 py-2 text-xs bg-surface-2 hover:bg-surface-3 border border-border text-fg transition-colors"
            >
              <div>
                <span className="font-medium">Operator</span>
                <span className="text-fg-muted block text-[11px]">Overview, Live Monitoring, Forecasts, Alerts</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-fg-subtle shrink-0" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link href="/overview" className="btn btn-sm">
            Back to Overview
          </Link>
          <button
            onClick={() => { signOut(); router.push("/login"); }}
            className="btn btn-sm btn-ghost text-fg-muted hover:text-crit gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      {access === "readonly" && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-1 px-3 py-2 text-xs text-fg-muted">
          <Eye className="h-3.5 w-3.5 text-fg-subtle" />
          Read-only view — mutating actions on this workspace require the Data Scientist or Administrator role. Session role: <span className="text-fg font-medium">{user ? ROLE_LABELS[user.role] : ""}</span>
        </div>
      )}
      {children}
    </>
  );
}
