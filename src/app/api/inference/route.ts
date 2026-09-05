import { handle, ok } from "@/server/http";
import { inference, parseTick } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handle(() => ok(inference(parseTick(req.url))));
}
