import { actorFrom, handle, ok } from "@/server/http";
import { appendAudit } from "@/server/services";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { action?: string; resource?: string; status?: string; details?: Record<string, unknown> };
    const { actor, role } = actorFrom(req);
    const requestId = await appendAudit({ actor, role, action: body.action ?? "UI_EVENT", resource: body.resource ?? "console", status: body.status ?? "SUCCESS", details: body.details });
    return ok({ requestId });
  });
}
