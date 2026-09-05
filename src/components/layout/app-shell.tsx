"use client";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Bell, ChevronsLeft, ChevronsRight, Clock, Lock, LogOut, Menu, Play, RotateCcw,
  Search, ShieldCheck, Square, X, Anchor, Eye, CheckCheck, Sparkles, MessageSquareCode,
  ChevronDown, Check, Sun, Moon, Monitor
} from "lucide-react";
import { NAV_GROUPS, ALL_NAV_ITEMS, accessFor } from "@/config/navigation";
import { DEMO_INTERVAL_MS, PRODUCT, ROLE_LABELS, SIM_BASE_NOW, SIM_TICK_MS } from "@/config/constants";
import { useUiStore } from "@/store/ui-store";
import { useNotificationStore } from "@/store/notification-store";
import { useOverview, useResetScenario, useSearch } from "@/hooks/use-api";
import { eventBus } from "@/lib/event-bus";
import { fmtTime, fmtRelative, fmtDate } from "@/lib/format";
import { cn, debounce } from "@/lib/utils";
import { Tooltip, Toggle, Chip } from "@/components/ui/primitives";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { useLiveJakartaTime } from "@/hooks/use-live-time";
import type { OverviewData } from "@/types/domain";

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/* ------------------------------------------------------------------ */
/* Demo runtime – advances the simulated clock and emits events        */
/* ------------------------------------------------------------------ */

function DemoRuntime() {
  const demoMode = useUiStore((s) => s.demoMode);
  const advanceTick = useUiStore((s) => s.advanceTick);
  const { data } = useOverview();
  const push = useNotificationStore((s) => s.push);
  const prev = useRef<OverviewData | null>(null);

  useEffect(() => {
    if (!demoMode) return;
    const id = setInterval(advanceTick, DEMO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [demoMode, advanceTick]);

  useEffect(() => {
    if (!data) return;
    const before = prev.current;
    prev.current = data;
    if (!before) return;
    // Emit domain events derived from state deltas.
    const seenBefore = new Set(before.recentEvents.map((e) => e.id));
    for (const ev of data.recentEvents) {
      if (seenBefore.has(ev.id)) continue;
      eventBus.emit(ev);
      if (ev.type === "ALERT_CREATED" || ev.type === "STATION_STATUS_CHANGED") {
        push({ id: `n-${ev.id}`, title: ev.message, body: ev.stationId ? `Station ${ev.stationId} · ${fmtTime(ev.timestamp)} WIB` : undefined, severity: ev.severity === "critical" ? "critical" : "warning", href: ev.type === "ALERT_CREATED" ? "/alerts" : `/stations?station=${ev.stationId}` });
      }
    }
    const riskBefore = new Map(before.stations.map((s) => [s.station.id, s.risk]));
    for (const s of data.stations) {
      const r0 = riskBefore.get(s.station.id);
      if (r0 && r0 !== s.risk && (s.risk === "HIGH" || s.risk === "CRITICAL")) {
        push({ id: `n-risk-${s.station.id}-${s.risk}`, title: `${s.station.name} risk elevated to ${s.risk}`, body: `${s.currentTma.toFixed(2)} m · ${Math.round(s.thresholdRatio * 100)}% of alert threshold`, severity: s.risk === "CRITICAL" ? "critical" : "warning", href: `/stations?station=${s.station.id}` });
      }
    }
  }, [data, push]);

  return null;
}

/* ------------------------------------------------------------------ */
/* Sidebar — Restrained, Quiet, Human-Designed Navigation             */
/* ------------------------------------------------------------------ */

function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const user = useUiStore((s) => s.user);
  const signOut = useUiStore((s) => s.signOut);
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobile = useUiStore((s) => s.setMobileNav);

  const content = (
    <nav aria-label="Primary" className="flex h-full flex-col">
      {/* Brand area */}
      <div className={cn("flex h-12 items-center border-b border-border px-3 shrink-0", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-2 text-fg border border-border">
            <Anchor className="h-3 w-3 text-water" />
          </span>
          {!collapsed && (
            <span className="text-xs font-semibold tracking-wider uppercase text-fg">
              {PRODUCT.name}
            </span>
          )}
        </div>
        <button className="btn btn-ghost btn-sm lg:hidden" onClick={() => setMobile(false)} aria-label="Close navigation">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation items grouped by category */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            {!collapsed && (
              <div className="text-[10px] font-mono tracking-wider uppercase text-fg-faint px-2 pb-1">
                {g.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                const access = accessFor(item, user?.role);
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobile(false)}
                    className={cn(
                      "group flex h-7 items-center gap-2 rounded px-2 text-[12px] transition-colors",
                      active
                        ? "bg-surface-2 text-fg font-medium border-l-2 border-water pl-2"
                        : "text-fg-muted hover:bg-surface-1 hover:text-fg",
                      collapsed && "justify-center px-0 border-l-0"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-water" : "text-fg-subtle group-hover:text-fg-muted")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && access === "denied" && <Lock className="ml-auto h-3 w-3 text-fg-faint" aria-label="Restricted" />}
                    {!collapsed && access === "readonly" && <Eye className="ml-auto h-3 w-3 text-fg-faint" aria-label="Read-only" />}
                  </Link>
                );
                return <li key={item.href}>{collapsed ? <Tooltip content={item.label} side="right">{link}</Tooltip> : link}</li>;
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer controls */}
      <div className="border-t border-border p-2 shrink-0 space-y-1.5">
        {/* User profile card */}
        <div className={cn("flex items-center gap-2 rounded px-2 py-1.5 bg-surface-1 border border-border-subtle", collapsed && "justify-center px-0")}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-2 text-[10px] font-mono font-medium text-water">
            {user?.initials ?? "?"}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-fg leading-tight">{user?.name}</div>
              <div className="truncate text-[10px] font-mono text-fg-subtle leading-tight">{user?.role ? ROLE_LABELS[user.role] : "Guest"}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => { signOut(); router.push("/login"); }}
              className="btn btn-ghost !h-6 !w-6 !p-0 text-fg-subtle hover:text-crit"
              title="Sign out / Exit to login"
              aria-label="Sign out"
            >
              <LogOut className="h-3 w-3" />
            </button>
          )}
        </div>

        <button
          className={cn("btn btn-ghost btn-sm w-full hidden lg:inline-flex text-fg-subtle hover:text-fg !h-6", collapsed ? "justify-center" : "justify-start")}
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <><ChevronsLeft className="h-3.5 w-3.5" /> <span className="text-[11px] font-mono">Collapse</span></>}
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <aside className={cn("hidden lg:block shrink-0 border-r border-border bg-surface-0 transition-[width] duration-150", collapsed ? "w-12" : "w-52")}>
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface-0 border-r border-border slide-in-right">{content}</aside>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Topbar — Contextual, Restrained, Quiet                              */
/* ------------------------------------------------------------------ */

function LiveJakartaClock({ data }: { data?: OverviewData }) {
  const tick = useUiStore((s) => s.tick);
  const liveTime = useLiveJakartaTime(1000);

  const isSimulating = tick > 0;
  const simTimestamp = (data?.simulatedNow ?? SIM_BASE_NOW) + tick * SIM_TICK_MS;

  if (!liveTime.mounted) {
    return (
      <span className="mono text-fg-subtle text-[11px] inline-flex items-center gap-1.5" suppressHydrationWarning>
        <span className="h-1.5 w-1.5 rounded-full bg-ok opacity-60" />
        <span>— WIB</span>
      </span>
    );
  }

  if (isSimulating) {
    return (
      <span
        className="mono text-[11px] inline-flex items-center gap-1.5 text-warn bg-warn/10 px-1.5 py-0.5 rounded border border-warn/30 cursor-help"
        title={`Simulation Mode Active: advanced +${tick * 5}m (${fmtDate(simTimestamp)})`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-warn animate-ping" />
        <span className="font-semibold">{fmtTime(simTimestamp)}</span>
        <span className="text-warn/80 text-[10px]">WIB (+{tick * 5}m)</span>
      </span>
    );
  }

  return (
    <span
      className="mono text-[11px] inline-flex items-center gap-1.5 text-fg-muted hover:text-fg transition-colors cursor-help"
      title={`${liveTime.dayName}, ${liveTime.dateFormatted} (Asia/Jakarta, UTC+7)`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />
      <span className="font-medium text-fg">{liveTime.timeWithSeconds}</span>
      <span className="text-fg-subtle text-[10px]">WIB</span>
    </span>
  );
}

const ROUTE_TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/monitoring": "Monitoring",
  "/forecasts": "Forecasts",
  "/network": "Network",
  "/stations": "Stations",
  "/alerts": "Alerts",
  "/data-quality": "Data Quality",
  "/models": "Models",
  "/inference": "Inference",
  "/experiments": "Experiments",
  "/system": "Health",
  "/architecture": "Architecture",
  "/audit": "Audit",
  "/settings": "Settings",
};

function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUiStore((s) => s.user);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const signIn = useUiStore((s) => s.signIn);
  const signOut = useUiStore((s) => s.signOut);
  const setPalette = useUiStore((s) => s.setPalette);
  const setNotifications = useUiStore((s) => s.setNotifications);
  const setMobile = useUiStore((s) => s.setMobileNav);
  const assistantOpen = useUiStore((s) => s.assistantOpen);
  const setAssistant = useUiStore((s) => s.setAssistant);
  const unread = useNotificationStore((s) => s.items.filter((n) => !n.read).length);
  const { data } = useOverview();
  const [menu, setMenu] = useState(false);

  const pageTitle = ROUTE_TITLES[pathname] ?? "Operations";
  const hasCriticalIncident = data?.systemStatus === "INCIDENT" || (data?.criticalAlerts ?? 0) > 0;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface-0 px-3 md:px-4">
      {/* Contextual breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button className="btn btn-ghost btn-sm lg:hidden !p-1" onClick={() => setMobile(true)} aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="font-semibold text-fg tracking-wide">ANCHOR</span>
          <span className="text-fg-faint">/</span>
          <span className="text-fg-muted font-medium">{pageTitle}</span>
          <span className="hidden sm:inline text-fg-faint">·</span>
          <span className="hidden sm:inline text-[11px] text-fg-subtle">Production · Demo</span>
          <span className="hidden sm:inline"><LiveJakartaClock data={data} /></span>
        </div>

        {/* Operational warning indicator — only visible when there's an actual incident */}
        {hasCriticalIncident && (
          <span className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-crit bg-crit-dim/40 px-2 py-0.5 rounded border border-[#5c1e20]">
            <span className="h-1.5 w-1.5 rounded-full bg-crit" />
            Active Alert
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Global search */}
        <button
          onClick={() => setPalette(true)}
          className="flex h-7 w-40 md:w-52 items-center gap-2 rounded border border-border bg-surface-1 px-2 text-xs text-fg-subtle hover:border-border-strong hover:text-fg-muted transition-colors"
          aria-label="Open global search"
        >
          <Search className="h-3 w-3 shrink-0" />
          <span className="flex-1 text-left truncate text-[11px] font-mono">Search…</span>
          <kbd className="hidden sm:inline font-mono text-[10px] text-fg-faint bg-surface-0 px-1 rounded border border-border">⌘K</kbd>
        </button>

        {/* ANCHOR Intelligence Assistant Trigger */}
        <button
          onClick={() => setAssistant(!assistantOpen)}
          className={cn(
            "btn btn-sm !h-7 gap-1.5 font-mono text-xs border transition-colors",
            assistantOpen
              ? "bg-surface-3 border-water text-fg"
              : "bg-surface-1 border-border text-fg-muted hover:text-fg"
          )}
          title="Toggle ANCHOR Intelligence Assistant (⌘J)"
        >
          <Sparkles className="h-3 w-3 text-water" />
          <span className="hidden sm:inline">Assistant</span>
          <kbd className="hidden lg:inline text-[10px] text-fg-faint bg-surface-0 px-1 rounded border border-border">⌘J</kbd>
        </button>

        {/* Theme quick toggle */}
        <button
          className="btn btn-ghost btn-sm relative !h-7 !w-7 !p-0"
          onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")}
          title={`Appearance: ${theme.toUpperCase()} (click to cycle)`}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Sun className="h-3.5 w-3.5 text-warn" />
          ) : theme === "system" ? (
            <Monitor className="h-3.5 w-3.5 text-fg-subtle" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-water" />
          )}
        </button>

        {/* Notifications */}
        <button
          className="btn btn-ghost btn-sm relative !h-7 !w-7 !p-0"
          onClick={() => setNotifications(true)}
          aria-label={`Notifications, ${unread} unread`}
        >
          <Bell className="h-3.5 w-3.5 text-fg-subtle hover:text-fg" />
          {unread > 0 && (
            <span className="absolute 1 top-1 right-1 h-1.5 w-1.5 rounded-full bg-crit" />
          )}
        </button>

        {/* User profile & Role switcher */}
        <div className="relative">
          <button
            className={cn(
              "flex items-center gap-1.5 rounded border px-2 h-7 text-xs font-mono transition-colors",
              menu
                ? "border-water bg-surface-2 text-fg"
                : "border-border bg-surface-1 text-fg-muted hover:border-border-strong hover:text-fg"
            )}
            onClick={() => setMenu((m) => !m)}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="User profile and role menu"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded bg-surface-2 text-[10px] text-water font-mono font-medium">
              {user?.initials ?? "?"}
            </span>
            <span className="hidden md:inline text-[11px]">
              {user?.role ? ROLE_LABELS[user.role] : "Guest"}
            </span>
            <ChevronDown className={cn("h-3 w-3 text-fg-subtle transition-transform", menu && "rotate-180")} />
          </button>

          {menu && (
            <>
              {/* Invisible backdrop to dismiss menu on click outside */}
              <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />

              <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-64 panel p-2 shadow-2xl fade-up font-mono">
                {/* User info */}
                <div className="px-2 py-1.5 border-b border-border-subtle mb-1.5">
                  <div className="text-xs font-medium text-fg">{user?.name}</div>
                  <div className="text-[10px] text-fg-subtle truncate">{user?.email}</div>
                  <div className="mt-1">
                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-water border border-border">
                      Active: {user?.role ? ROLE_LABELS[user.role] : "Guest"}
                    </span>
                  </div>
                </div>

                {/* Role switcher list */}
                <div className="mb-1.5">
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-fg-faint">Switch Demo Role</div>
                  {(
                    [
                      { role: "administrator", label: "Administrator", desc: "Full access (Settings, Health, Audit)" },
                      { role: "data_scientist", label: "Data Scientist", desc: "Models, Inference, Experiments" },
                      { role: "operator", label: "Operator", desc: "Monitoring, Forecasts, Alerts" },
                    ] as const
                  ).map((r) => {
                    const isCurrent = user?.role === r.role;
                    return (
                      <button
                        key={r.role}
                        role="menuitem"
                        onClick={() => {
                          signIn(r.role);
                          setMenu(false);
                        }}
                        className={cn(
                          "flex w-full items-start justify-between rounded px-2 py-1.5 text-xs text-left transition-colors",
                          isCurrent
                            ? "bg-surface-2 text-water font-medium"
                            : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{r.label}</span>
                            {isCurrent && <span className="text-[10px] text-ok">(current)</span>}
                          </div>
                          <div className="text-[10px] text-fg-subtle">{r.desc}</div>
                        </div>
                        {isCurrent && <Check className="h-3.5 w-3.5 text-water shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* Theme selector */}
                <div className="border-t border-border-subtle pt-1.5 pb-1 mb-1">
                  <div className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-faint">Appearance</div>
                  <div className="grid grid-cols-3 gap-1 px-1 mt-1">
                    {(["dark", "light", "system"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          "flex items-center justify-center gap-1 rounded py-1 text-[10px] font-mono border transition-colors",
                          theme === t
                            ? "bg-surface-3 border-water text-fg font-medium"
                            : "border-border bg-surface-1 text-fg-muted hover:text-fg"
                        )}
                      >
                        {t === "dark" && <Moon className="h-3 w-3" />}
                        {t === "light" && <Sun className="h-3 w-3" />}
                        {t === "system" && <Monitor className="h-3 w-3" />}
                        <span className="capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sign out */}
                <div className="border-t border-border-subtle pt-1">
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-fg-muted hover:text-crit hover:bg-crit-dim/20 transition-colors"
                    onClick={() => {
                      setMenu(false);
                      signOut();
                      router.push("/login");
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out / Exit Demo
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Command Palette                                                     */
/* ------------------------------------------------------------------ */

function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPalette);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useSearch(debounced);

  useEffect(() => {
    const fn = debounce((q: string) => setDebounced(q), 140);
    fn(query);
  }, [query]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-4 pt-16 md:pt-24" onClick={() => setOpen(false)}>
      <div className="panel w-full max-w-lg shadow-2xl fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-xs text-fg placeholder:text-fg-subtle focus:outline-none font-mono"
            placeholder="Search stations, alerts, models, traces…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="mono text-[10px] text-fg-faint bg-surface-0 px-1 rounded border border-border">ESC</kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-1 font-mono text-xs">
          {!query && (
            <div className="p-2 text-fg-subtle text-[11px]">
              Type station ID (e.g. BS-017), river reach, alert title, or model version…
            </div>
          )}
          {search.data && search.data.length === 0 && query && (
            <div className="p-4 text-center text-fg-subtle text-xs">No matching domain entities found.</div>
          )}
          {search.data?.map((res) => (
            <button
              key={`${res.type}-${res.id}`}
              onClick={() => { router.push(res.href); setOpen(false); }}
              className="flex w-full items-center justify-between gap-3 rounded px-2.5 py-1.5 text-left hover:bg-surface-2 transition-colors"
            >
              <div className="min-w-0">
                <span className="block text-fg truncate">{res.title}</span>
                <span className="block text-[10px] text-fg-subtle truncate">{res.subtitle}</span>
              </div>
              <span className="text-[10px] uppercase text-fg-faint">{res.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notification Center                                                 */
/* ------------------------------------------------------------------ */

function NotificationCenter() {
  const open = useUiStore((s) => s.notificationsOpen);
  const setOpen = useUiStore((s) => s.setNotifications);
  const items = useNotificationStore((s) => s.items);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const dismiss = useNotificationStore((s) => s.dismiss);
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setOpen(false)} />
      <aside className="fixed inset-y-0 right-0 w-full max-w-sm bg-surface-1 border-l border-border shadow-2xl flex flex-col slide-in-right">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-fg font-mono uppercase tracking-wider">Operational Events</h2>
            <span className="text-[10px] mono text-fg-subtle">{items.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm text-[11px] font-mono" onClick={markAllRead}>Mark read</button>
            <button className="btn btn-ghost btn-sm !h-6 !w-6 !p-0" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <ul className="flex-1 overflow-y-auto divide-y divide-border-subtle">
          {items.length === 0 ? (
            <li className="p-6 text-center text-xs text-fg-subtle font-mono">No new notifications.</li>
          ) : (
            items.map((n) => (
              <li key={n.id} className="p-3 hover:bg-surface-2 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => { if (n.href) router.push(n.href); setOpen(false); }}
                  >
                    <div className="text-xs font-medium text-fg">{n.title}</div>
                    {n.body && <div className="t-caption mt-0.5 text-fg-subtle">{n.body}</div>}
                    <div className="text-[10px] font-mono text-fg-faint mt-1">{fmtRelative(n.timestamp, Date.now())}</div>
                  </button>
                  <button className="btn btn-ghost btn-sm !h-5 !w-5 !p-0 text-fg-faint hover:text-fg" onClick={() => dismiss(n.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main AppShell                                                       */
/* ------------------------------------------------------------------ */

export function AppShell({ children }: { children: ReactNode }) {
  const user = useUiStore((s) => s.user);
  const theme = useUiStore((s) => s.theme);
  const toggleAssistant = useUiStore((s) => s.toggleAssistant);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  // Synchronize document data-theme with theme store
  useEffect(() => {
    const apply = () => {
      let resolved = theme;
      if (theme === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }
      document.documentElement.setAttribute("data-theme", resolved);
      if (resolved === "light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      }
    };
    apply();

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: light)");
      const listener = () => apply();
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [theme]);

  // Global shortcut for ANCHOR Assistant (⌘J / Ctrl+J)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleAssistant();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleAssistant]);

  if (!hydrated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="flex items-center gap-2 text-fg-subtle text-xs font-mono">
          <Anchor className="h-4 w-4 animate-pulse text-water" /> Establishing session…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto" id="main">
          <div className="mx-auto w-full max-w-[1760px] p-4 md:p-6 space-y-5">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette />
      <NotificationCenter />
      <AssistantDrawer />
      <DemoRuntime />
    </div>
  );
}
