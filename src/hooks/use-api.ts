"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import { useUiStore } from "@/store/ui-store";
import type {
  Alert, AuditLog, DataQualityReport, Experiment, ForecastPoint, ForecastConfidence, InferenceMetrics, InferenceRequest,
  ModelVersion, NetworkGraph, OverviewData, RoutingStep, SearchResult, ServiceHealth, StationDetail, StationSnapshot, TelemetryPoint,
  BenchmarkEntry, AblationEntry, FoldResult, FeatureImportance,
} from "@/types/domain";

const useTick = () => useUiStore((s) => s.tick);

export const useOverview = () => {
  const t = useTick();
  return useQuery({ queryKey: ["overview", t], queryFn: () => apiGet<OverviewData>("/dashboard/overview", { t }), placeholderData: (p) => p, staleTime: 4000 });
};

export const useStations = () => {
  const t = useTick();
  return useQuery({ queryKey: ["stations", t], queryFn: () => apiGet<StationSnapshot[]>("/stations", { t }), placeholderData: (p) => p, staleTime: 4000 });
};

export const useStation = (id: string | null) => {
  const t = useTick();
  return useQuery({ queryKey: ["station", id, t], queryFn: () => apiGet<StationDetail>(`/stations/${id}`, { t }), enabled: !!id, placeholderData: (p) => p, staleTime: 4000 });
};

export interface ForecastResponse {
  stationId: string; anchor: number; now: number; modelVersion: string; strategy: string; points: ForecastPoint[]; confidence: ForecastConfidence; routing: RoutingStep[];
}
export const useForecast = (id: string | null, anchorOffset = 0) => {
  const t = useTick();
  return useQuery({ queryKey: ["forecast", id, anchorOffset, t], queryFn: () => apiGet<ForecastResponse>(`/stations/${id}/forecast`, { t, anchorOffset }), enabled: !!id, placeholderData: (p) => p, staleTime: 4000 });
};

export interface HistoryResponse { stationId: string; hours: number; stepMinutes: number; points: TelemetryPoint[] }
export const useHistory = (id: string | null, hours: number, step?: number) => {
  const t = useTick();
  return useQuery({ queryKey: ["history", id, hours, step, t], queryFn: () => apiGet<HistoryResponse>(`/stations/${id}/history`, { t, hours, step }), enabled: !!id, placeholderData: (p) => p, staleTime: 4000 });
};

export interface NetworkResponse extends NetworkGraph { ancestors: Record<string, string[]>; descendants: Record<string, string[]> }
export const useNetwork = () => {
  const t = useTick();
  return useQuery({ queryKey: ["network", t], queryFn: () => apiGet<NetworkResponse>("/network", { t }), placeholderData: (p) => p, staleTime: 4000 });
};

export const useAlerts = () => {
  const t = useTick();
  return useQuery({ queryKey: ["alerts", t], queryFn: () => apiGet<Alert[]>("/alerts", { t }), placeholderData: (p) => p, staleTime: 4000 });
};

export const useAlertMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body?: Record<string, unknown> }) => apiPost<Alert>(`/alerts/${id}/${action}`, body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["stations"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
};

export const useDataQuality = () => {
  const t = useTick();
  return useQuery({ queryKey: ["dq", Math.floor(t / 12)], queryFn: () => apiGet<DataQualityReport>("/data-quality", { t }), placeholderData: (p) => p, staleTime: 30_000 });
};

export interface ModelsResponse {
  versions: ModelVersion[]; benchmarks: BenchmarkEntry[]; ablations: AblationEntry[]; folds: FoldResult[]; featureImportance: FeatureImportance[];
  drift: { day: number; psi: number; rmseRolling: number }[]; residualByCategory: { category: string; bias: number; rmse: number; n: number }[];
  errorByHorizon: { horizon: number; rmse: number; mae: number; coverage: number }[];
}
export const useModels = () => useQuery({ queryKey: ["models"], queryFn: () => apiGet<ModelsResponse>("/models"), staleTime: 60_000 });

export interface InferenceResponse { metrics: InferenceMetrics; requests: InferenceRequest[]; modelVersion: string }
export const useInference = () => {
  const t = useTick();
  return useQuery({ queryKey: ["inference", t], queryFn: () => apiGet<InferenceResponse>("/inference", { t }), placeholderData: (p) => p, staleTime: 4000 });
};

export const useHealth = () => {
  const t = useTick();
  return useQuery({ queryKey: ["health", t], queryFn: () => apiGet<{ services: ServiceHealth[]; generatedAt: number }>("/system/health", { t }), placeholderData: (p) => p, staleTime: 4000 });
};

export const useAuditLogs = () => useQuery({ queryKey: ["audit"], queryFn: () => apiGet<AuditLog[]>("/audit-logs"), staleTime: 10_000 });
export const useExperiments = () => useQuery({ queryKey: ["experiments"], queryFn: () => apiGet<Experiment[]>("/experiments"), staleTime: 60_000 });

export const useSearch = (q: string) => {
  const t = useTick();
  return useQuery({ queryKey: ["search", q, t], queryFn: () => apiGet<SearchResult[]>("/search", { q, t }), enabled: q.trim().length > 0, staleTime: 5000 });
};

export const useRunForecast = () => {
  const qc = useQueryClient();
  const t = useTick();
  return useMutation({
    mutationFn: (stationId: string) => apiPost<{ request: InferenceRequest; forecast: ForecastResponse }>("/forecast/run", { stationId, tick: t }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });
};

export const useResetScenario = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => apiPost<{ reset: boolean }>("/simulation/reset"), onSuccess: () => qc.invalidateQueries() });
};
