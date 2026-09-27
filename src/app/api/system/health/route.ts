import { handle, ok } from "@/server/http";
import { health, parseTick } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handle(async () => {
    const list = await health(parseTick(req.url));
    return ok({
      services: list,
      generatedAt: Date.now(),
    });
  });
}
