import { fail, handle, ok } from "@/server/http";
import { stationForecast, parseTick } from "@/server/services";
import { STATION_MAP } from "@/mock/stations";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const targetId = STATION_MAP[id] ? id : "HUC-DEMO-0001";
    const anchor = Number(new URL(req.url).searchParams.get("anchorOffset") ?? 0);
    const data = await stationForecast(targetId, parseTick(req.url), Number.isFinite(anchor) ? anchor : 0);
    return ok(data);
  });
}
