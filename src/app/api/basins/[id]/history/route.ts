import { handle, ok } from "@/server/http";
import { stationHistory, parseTick } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handle(async () => ok(await stationHistory(id, parseTick(req.url))));
}
