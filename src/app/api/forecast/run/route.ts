import { actorFrom, fail, handle, ok } from "@/server/http";
import { runForecast } from "@/server/services";
import { STATION_MAP } from "@/mock/stations";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { stationId?: string; tick?: number };
    if (!body.stationId || !STATION_MAP[body.stationId]) return fail("stationId is required", 400, "BAD_REQUEST");
    const { actor, role } = actorFrom(req);
    return ok(await runForecast(body.stationId, body.tick ?? 0, actor, role));
  });
}
