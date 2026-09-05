import { handle, ok } from "@/server/http";
import { parseTick, search } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handle(async () => ok(await search(new URL(req.url).searchParams.get("q") ?? "", parseTick(req.url))));
}
