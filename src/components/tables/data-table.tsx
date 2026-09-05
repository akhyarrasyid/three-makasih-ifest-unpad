"use client";
import { type ReactNode, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Download, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/primitives";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  exportValue?: (row: T) => string | number;
  width?: string;
  align?: "left" | "right";
  hideable?: boolean;
  defaultHidden?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  selectedKey?: string | null;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
  exportName?: string;
  defaultSort?: { id: string; dir: "asc" | "desc" };
  density?: "comfortable" | "compact";
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  maxHeight?: string;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, pageSize = 15, selectedKey, onRowClick, emptyTitle = "No records", emptyDescription, toolbar, exportName = "export", defaultSort, density: densityProp, selectable, selectedKeys, onSelectionChange, maxHeight, className }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(defaultSort ?? null);
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)));
  const [colMenu, setColMenu] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">(densityProp ?? "comfortable");

  const visible = columns.filter((c) => !hidden.has(c.id));

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = sv(a);
      const vb = sv(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === "asc" ? r : -r;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (id: string) => {
    setSort((s) => (s?.id !== id ? { id, dir: "asc" } : s.dir === "asc" ? { id, dir: "desc" } : null));
  };

  const exportCsv = () => {
    const cols = visible;
    const header = cols.map((c) => c.id).join(",");
    const body = sorted
      .map((r) =>
        cols
          .map((c) => {
            const v = c.exportValue ? c.exportValue(r) : c.sortValue ? c.sortValue(r) ?? "" : "";
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const allSelected = selectable && slice.length > 0 && slice.every((r) => selectedKeys?.has(rowKey(r)));
  const toggleAll = () => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (allSelected) slice.forEach((r) => next.delete(rowKey(r)));
    else slice.forEach((r) => next.add(rowKey(r)));
    onSelectionChange(next);
  };

  return (
    <div className={cn("flex flex-col min-w-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">{toolbar}</div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="t-caption mr-2 hidden sm:inline">{sorted.length.toLocaleString()} rows</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setDensity((d) => (d === "compact" ? "comfortable" : "compact"))} aria-label="Toggle density" title="Density">
            <Rows3 className="h-3.5 w-3.5" />
          </button>
          <div className="relative">
            <button className="btn btn-ghost btn-sm" onClick={() => setColMenu((o) => !o)} aria-haspopup="menu" aria-expanded={colMenu} title="Columns">
              <Columns3 className="h-3.5 w-3.5" />
            </button>
            {colMenu && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-48 panel p-1 shadow-xl fade-up">
                {columns
                  .filter((c) => c.hideable !== false)
                  .map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-surface-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-water"
                        checked={!hidden.has(c.id)}
                        onChange={() =>
                          setHidden((h) => {
                            const n = new Set(h);
                            if (n.has(c.id)) n.delete(c.id);
                            else n.add(c.id);
                            return n;
                          })
                        }
                      />
                      <span className="truncate">{typeof c.header === "string" ? c.header : c.id}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} title="Export CSV" aria-label="Export CSV">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        {slice.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <table className={cn("data-table", density === "compact" && "compact")}>
            <thead>
              <tr>
                {selectable && (
                  <th style={{ width: 32 }}>
                    <input type="checkbox" className="accent-water" checked={!!allSelected} onChange={toggleAll} aria-label="Select all rows on page" />
                  </th>
                )}
                {visible.map((c) => (
                  <th key={c.id} style={{ width: c.width }} className={cn(c.align === "right" && "text-right", c.className)} aria-sort={sort?.id === c.id ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.sortValue ? (
                      <button className="inline-flex items-center gap-1 hover:text-fg" onClick={() => toggleSort(c.id)}>
                        {c.header}
                        {sort?.id === c.id ? sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => {
                const k = rowKey(r);
                return (
                  <tr
                    key={k}
                    aria-selected={selectedKey === k || selectedKeys?.has(k)}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick?.(r)}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onRowClick(r);
                      }
                    }}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {selectable && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="accent-water"
                          checked={!!selectedKeys?.has(k)}
                          onChange={() => {
                            const n = new Set(selectedKeys);
                            if (n.has(k)) n.delete(k);
                            else n.add(k);
                            onSelectionChange?.(n);
                          }}
                          aria-label={`Select ${k}`}
                        />
                      </td>
                    )}
                    {visible.map((c) => (
                      <td key={c.id} className={cn(c.align === "right" && "text-right", c.className)}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="t-caption">
            Page {safePage + 1} of {pages}
          </span>
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous page">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button className="btn btn-ghost btn-sm" disabled={safePage >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} aria-label="Next page">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
