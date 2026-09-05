import { actorFrom, handle, ok } from "@/server/http";
import { appendAudit, resetScenario } from "@/server/services";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return handle(async () => {
    await resetScenario();
    const { actor, role } = actorFrom(req);
    await appendAudit({ actor, role, action: "SIMULATION_RESET", resource: "simulation:scenario", status: "SUCCESS" });
    return ok({ reset: true });
  });
}
