import { handle, ok } from "@/server/http";
import { experiments } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET() {
  return handle(() => ok(experiments()));
}
