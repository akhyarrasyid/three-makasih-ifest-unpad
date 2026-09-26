import { handle, ok } from "@/server/http";
import { reachabilityTrace } from "@/mock/network";
import { parseTick, simNow } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handle(async () => {
    const now = simNow(parseTick(req.url));
    return ok(reachabilityTrace(id, now));
  });
}
