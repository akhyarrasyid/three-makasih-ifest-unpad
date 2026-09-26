import { handle, ok } from "@/server/http";
import { stationForecast, parseTick } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handle(async () => ok(await stationForecast(id, parseTick(req.url))));
}
