import { handle, ok } from "@/server/http";
import { ABLATIONS } from "@/mock/models";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ok(ABLATIONS));
}
