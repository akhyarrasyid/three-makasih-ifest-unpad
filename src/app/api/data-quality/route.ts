import { handle, ok } from "@/server/http";
import { dataQuality, parseTick } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handle(() => ok(dataQuality(parseTick(req.url))));
}
