import { handle, ok } from "@/server/http";
import { listStationSnapshots, parseTick } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handle(async () => ok(await listStationSnapshots(parseTick(req.url))));
}
