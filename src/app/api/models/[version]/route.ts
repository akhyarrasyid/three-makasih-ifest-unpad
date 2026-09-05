import { fail, handle, ok } from "@/server/http";
import { models } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, ctx: { params: Promise<{ version: string }> }) {
  return handle(async () => {
    const { version } = await ctx.params;
    const m = models().find((x) => x.version === version);
    return m ? ok(m) : fail(`Model ${version} not found`, 404, "NOT_FOUND");
  });
}
