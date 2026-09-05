"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GitCompare, X } from "lucide-react";
import { useExperiments } from "@/hooks/use-api";
import { RoleGate } from "@/features/shared/role-gate";
import { PageHeader, Panel, Skeleton, ErrorState, Chip, StatusBadge, KV, Dialog, MetricCard } from "@/components/ui/primitives";
import { HBarChart, CHART_COLORS } from "@/components/charts/charts";
import { DataTable, type Column } from "@/components/tables/data-table";
import { fmtDateTime } from "@/lib/format";
import type { Experiment } from "@/types/domain";

function ExperimentsInner() {
  const params = useSearchParams();
  const exps = useExperiments();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(["EXP-042", "EXP-041", "EXP-040"]));
  const [detail, setDetail] = useState<Experiment | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    const id = params.get("exp");
    if (id && exps.data) {
      const e = exps.data.find((x) => x.id === id);
      if (e) setDetail(e);
    }
  }, [params, exps.data]);

  const list = exps.data ?? [];
  const compared = useMemo(() => list.filter((e) => selectedKeys.has(e.id) && e.rmse > 0), [list, selectedKeys]);
  const best = list.filter((e) => e.rmse > 0).sort((a, b) => a.rmse - b.rmse)[0];

  const columns: Column<Experiment>[] = [
    { id: "id", header: "Experiment", hideable: false, sortValue: (r) => r.id, cell: (r) => <div><span className="mono text-[#8fc1ff]">{r.id}</span><div className="text-xs font-medium">{r.name}</div></div> },
    { id: "owner", header: "Owner", sortValue: (r) => r.owner, cell: (r) => <span className="text-xs text-fg-muted">{r.owner}</span> },
    { id: "dataset", header: "Dataset", sortValue: (r) => r.dataset, cell: (r) => <span className="mono text-fg-muted">{r.dataset}</span>, defaultHidden: true },
    { id: "model", header: "Model", sortValue: (r) => r.model, cell: (r) => <span className="mono text-fg-muted">{r.model}</span> },
    { id: "params", header: "Parameters", cell: (r) => <span className="t-caption">{Object.entries(r.parameters).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(" · ") || "—"}</span> },
    { id: "rmse", header: "RMSE", align: "right", sortValue: (r) => r.rmse || 99, cell: (r) => <span className={`mono ${r.id === best?.id ? "text-[#5fd699] font-medium" : ""}`}>{r.rmse ? r.rmse.toFixed(4) : "—"}</span> },
    { id: "mae", header: "MAE", align: "right", sortValue: (r) => r.mae || 99, cell: (r) => <span className="mono">{r.mae ? r.mae.toFixed(4) : "—"}</span> },
    { id: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} dot={r.status === "RUNNING"} /> },
    { id: "tags", header: "Tags", cell: (r) => <span className="flex gap-1">{r.tags.map((t) => <Chip key={t}>{t}</Chip>)}</span>, defaultHidden: true },
    { id: "created", header: "Created", align: "right", sortValue: (r) => r.createdAt, cell: (r) => <span className="mono text-fg-muted">{fmtDateTime(r.createdAt)}</span> },
  ];

  return (
    <RoleGate>
      <div className="space-y-5">
        <PageHeader title="Experiments" subtitle="Experiment tracking for the ANCHOR research programme — runs, configurations, metrics and artifacts." meta={<><Chip>{list.length} runs</Chip><Chip tone="ok">best {best?.rmse.toFixed(4) ?? "—"} · {best?.id}</Chip><Chip tone="water">{list.filter((e) => e.status === "RUNNING").length} running</Chip></>} actions={<button className="btn btn-primary" disabled={compared.length < 2} onClick={() => setCompareOpen(true)}><GitCompare className="h-3.5 w-3.5" /> Compare ({compared.length})</button>} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Best RMSE" value={best?.rmse.toFixed(4) ?? "—"} tone="ok" hint={`${best?.id} · ${best?.name}`} />
          <MetricCard label="Completed" value={list.filter((e) => e.status === "COMPLETED").length} />
          <MetricCard label="Running / queued" value={`${list.filter((e) => e.status === "RUNNING").length} / ${list.filter((e) => e.status === "QUEUED").length}`} tone="water" />
          <MetricCard label="Compute (30d)" value="41.2" unit="GPU·h" hint="fold-parallel training" />
        </div>

        <Panel noPad>
          {exps.isError ? <ErrorState error={exps.error} onRetry={() => exps.refetch()} /> : exps.isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div> : (
            <DataTable columns={columns} rows={list} rowKey={(r) => r.id} pageSize={15} selectable selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} onRowClick={setDetail} selectedKey={detail?.id} defaultSort={{ id: "created", dir: "desc" }} exportName="anchor-experiments" toolbar={<span className="t-caption">Select runs to compare · click a row for configuration and artifacts</span>} />
          )}
        </Panel>

        <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.id} · ${detail.name}` : ""} description={detail?.notes} width="max-w-2xl">
          {detail && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="t-label mb-1">Run</div>
                <KV k="Owner" v={detail.owner} />
                <KV k="Dataset" v={detail.dataset} mono />
                <KV k="Model" v={detail.model} mono />
                <KV k="Status" v={<StatusBadge status={detail.status} dot={false} />} />
                <KV k="RMSE / MAE" v={detail.rmse ? `${detail.rmse.toFixed(4)} / ${detail.mae.toFixed(4)}` : "—"} mono />
                <KV k="Duration" v={`${detail.durationMin} min`} mono />
                <KV k="Created" v={fmtDateTime(detail.createdAt)} mono />
              </div>
              <div>
                <div className="t-label mb-1">Configuration</div>
                <pre className="rounded-md border border-border bg-surface-0 p-3 mono text-fg-muted overflow-auto max-h-40">{JSON.stringify(detail.parameters, null, 2)}</pre>
                <div className="t-label mb-1 mt-3">Artifacts</div>
                {detail.artifacts.length === 0 && <p className="t-caption">No artifacts.</p>}
                <ul className="space-y-1">
                  {detail.artifacts.map((a) => <li key={a.name} className="flex items-center justify-between rounded border border-border bg-surface-0 px-2 py-1 text-xs"><span className="mono">{a.name}</span><span className="t-caption">{a.kind} · {a.sizeMb} MB</span></li>)}
                </ul>
              </div>
            </div>
          )}
        </Dialog>

        <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} title="Compare experiments" description={`${compared.length} runs selected · lower RMSE is better`} width="max-w-3xl">
          <HBarChart data={compared.sort((a, b) => a.rmse - b.rmse).map((e) => ({ label: `${e.id} ${e.name}`, value: e.rmse, highlight: e.id === best?.id, color: e.id === best?.id ? CHART_COLORS.ok : CHART_COLORS.forecast }))} height={Math.max(160, compared.length * 34)} unit="RMSE" domain={[0, 1.5]} valueFormatter={(v) => v.toFixed(4)} />
          <div className="mt-3 overflow-x-auto">
            <table className="data-table compact">
              <thead><tr><th>Metric</th>{compared.map((e) => <th key={e.id}>{e.id}</th>)}</tr></thead>
              <tbody>
                <tr><td>RMSE</td>{compared.map((e) => <td key={e.id} className="mono">{e.rmse.toFixed(4)}</td>)}</tr>
                <tr><td>MAE</td>{compared.map((e) => <td key={e.id} className="mono">{e.mae.toFixed(4)}</td>)}</tr>
                <tr><td>Model</td>{compared.map((e) => <td key={e.id} className="mono text-fg-muted">{e.model}</td>)}</tr>
                <tr><td>Duration</td>{compared.map((e) => <td key={e.id} className="mono">{e.durationMin} min</td>)}</tr>
                {Array.from(new Set(compared.flatMap((e) => Object.keys(e.parameters)))).map((k) => <tr key={k}><td className="mono text-fg-muted">{k}</td>{compared.map((e) => <td key={e.id} className="mono">{e.parameters[k] !== undefined ? String(e.parameters[k]) : <span className="text-fg-faint">—</span>}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end"><button className="btn btn-sm" onClick={() => setSelectedKeys(new Set())}><X className="h-3 w-3" /> Clear selection</button></div>
        </Dialog>
      </div>
    </RoleGate>
  );
}

export default function ExperimentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh]" />}>
      <ExperimentsInner />
    </Suspense>
  );
}
