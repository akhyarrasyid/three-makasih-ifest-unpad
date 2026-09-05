import { fail, handle, ok } from "@/server/http";
import { stationDetail, parseTick } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const detail = await stationDetail(id, parseTick(req.url));
    return detail ? ok(detail) : fail(`Station ${id} not found`, 404, "NOT_FOUND");
  });
}
