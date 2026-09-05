import { actorFrom, fail, handle, ok } from "@/server/http";
import { mutateAlert, type AlertAction } from "@/server/services";
export const dynamic = "force-dynamic";
const ACTIONS: AlertAction[] = ["acknowledge", "resolve", "snooze", "assign", "reopen"];
export async function POST(req: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
  return handle(async () => {
    const { id, action } = await ctx.params;
    if (!ACTIONS.includes(action as AlertAction)) return fail(`Unsupported action ${action}`, 400, "BAD_REQUEST");
    const body = (await req.json().catch(() => ({}))) as { assignee?: string; minutes?: number };
    const { actor, role } = actorFrom(req);
    const updated = await mutateAlert(id, action as AlertAction, actor, role, body);
    return updated ? ok(updated) : fail(`Alert ${id} not found`, 404, "NOT_FOUND");
  });
}
