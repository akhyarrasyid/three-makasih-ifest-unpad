import { fail, handle, ok } from "@/server/http";
import { stationForecast, parseTick } from "@/server/services";
import { STATION_MAP } from "@/mock/stations";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!STATION_MAP[id]) return fail(`Station ${id} not found`, 404, "NOT_FOUND");
    const anchor = Number(new URL(req.url).searchParams.get("anchorOffset") ?? 0);
    return ok(stationForecast(id, parseTick(req.url), Number.isFinite(anchor) ? anchor : 0));
  });
}
