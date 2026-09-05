import { handle, ok } from "@/server/http";
import { listAlerts, parseTick } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handle(async () => ok(await listAlerts(parseTick(req.url))));
}
