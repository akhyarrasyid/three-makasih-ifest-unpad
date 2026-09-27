import { handle, ok } from "@/server/http";
import { inference, parseTick } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handle(async () => ok(await inference(parseTick(req.url))));
}
