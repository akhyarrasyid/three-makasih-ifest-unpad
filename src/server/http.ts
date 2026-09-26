import { hashString } from "@/lib/prng";
import { MODEL } from "@/config/constants";

/** Standard API envelope – mirrors the FastAPI response contract the mock replaces. */
export function ok<T>(data: T, extra: Record<string, unknown> = {}) {
  const requestId = `req_${hashString(`${Date.now()}:${Math.random()}`).toString(16).padStart(8, "0")}`;
  return Response.json(
    { data, meta: { request_id: requestId, trace_id: `trace_${requestId.slice(4, 10)}`, model_version: MODEL.productionVersion, service: "tirta-api", generated_at: new Date().toISOString(), ...extra } },
    { headers: { "x-request-id": requestId, "cache-control": "no-store" } },
  );
}

export function fail(message: string, status = 500, code = "INTERNAL_ERROR") {
  const requestId = `req_${hashString(`${Date.now()}:${Math.random()}`).toString(16).padStart(8, "0")}`;
  return Response.json({ error: { code, message, correlation_id: requestId } }, { status, headers: { "x-request-id": requestId } });
}

export function notFound(message = "Resource not found") {
  return fail(message, 404, "NOT_FOUND");
}

export async function handle(fn: () => Promise<Response> | Response) {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return fail(e instanceof Error ? e.message : "Unexpected error");
  }
}

export function actorFrom(req: Request) {
  const actor = req.headers.get("x-anchor-user") ?? "demo.user";
  const role = req.headers.get("x-anchor-role") ?? "operator";
  return { actor, role };
}
