import { handle, ok } from "@/server/http";
import { listAuditLogs } from "@/server/services";
export const dynamic = "force-dynamic";
export async function GET() {
  return handle(async () => ok(await listAuditLogs(400)));
}
