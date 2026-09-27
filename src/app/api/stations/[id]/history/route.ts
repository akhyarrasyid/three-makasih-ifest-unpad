import { fail, handle, ok } from "@/server/http";
import { stationHistory, parseTick } from "@/server/services";
import { STATION_MAP } from "@/mock/stations";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const targetId = STATION_MAP[id] ? id : "HUC-DEMO-0001";
    const sp = new URL(req.url).searchParams;
    const hours = Math.min(24 * 30, Math.max(6, Number(sp.get("hours") ?? 72)));
    const step = Math.max(10, Number(sp.get("step") ?? (hours > 96 ? 60 : 30)));
    const points = await stationHistory(targetId, parseTick(req.url), hours, step);
    return ok({ stationId: targetId, hours, stepMinutes: step, points });
  });
}
