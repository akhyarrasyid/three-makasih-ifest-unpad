import { useUiStore } from "@/store/ui-store";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string, public correlationId: string) {
    super(message);
  }
}

interface Envelope<T> {
  data: T;
  meta: { request_id: string; trace_id: string; generated_at: string };
}

function headers(): Record<string, string> {
  const user = useUiStore.getState().user;
  return { "content-type": "application/json", "x-anchor-user": user?.email.split("@")[0] ?? "demo.user", "x-anchor-role": user?.role ?? "operator" };
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string; correlation_id?: string } };
    throw new ApiError(body.error?.message ?? `Request failed (${res.status})`, res.status, body.error?.code ?? "HTTP_ERROR", body.error?.correlation_id ?? res.headers.get("x-request-id") ?? "unknown");
  }
  const text = await res.text();
  try {
    const json = JSON.parse(text) as Envelope<T>;
    return json.data;
  } catch {
    throw new ApiError("Failed to parse API response", res.status, "INVALID_JSON", res.headers.get("x-request-id") ?? "unknown");
  }
}

export async function apiGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
  const qs = sp.toString();
  const res = await fetch(`/api${path}${qs ? `?${qs}` : ""}`, { headers: headers(), cache: "no-store" });
  return parse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`/api${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  return parse<T>(res);
}
