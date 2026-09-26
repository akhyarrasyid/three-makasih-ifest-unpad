import { handle, ok, notFound } from "@/server/http";
import { stationDetail, parseTick } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handle(async () => {
    const s = await stationDetail(id, parseTick(req.url));
    if (!s) return notFound(`HUC12 sub-basin ${id} not found`);
    return ok(s);
  });
}
