import { fail, handle, ok } from "@/server/http";
import { stationHistory, parseTick } from "@/server/services";
import { STATION_MAP } from "@/mock/stations";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!STATION_MAP[id]) return fail(`Station ${id} not found`, 404, "NOT_FOUND");
    const sp = new URL(req.url).searchParams;
    const hours = Math.min(24 * 30, Math.max(6, Number(sp.get("hours") ?? 72)));
    const step = Math.max(10, Number(sp.get("step") ?? (hours > 96 ? 60 : 30)));
    return ok({ stationId: id, hours, stepMinutes: step, points: stationHistory(id, parseTick(req.url), hours, step) });
  });
}
