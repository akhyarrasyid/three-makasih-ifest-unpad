import { handle, ok } from "@/server/http";
import { handleAssistantQuery, type AssistantContext } from "@/server/rag/pipeline";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json();
    const message = String(body.message ?? "");
    const context: AssistantContext = body.context ?? {};

    const result = await handleAssistantQuery(message, context);
    return ok(result);
  });
}
