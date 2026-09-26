import { handle, ok } from "@/server/http";
import { FEATURE_IMPORTANCE } from "@/mock/models";
import { dataQualityReport } from "@/mock/dataQuality";
import { parseTick, simNow } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const now = simNow(parseTick(req.url));
    const dq = dataQualityReport(now);
    return ok({
      families: dq.featureFamilies,
      importance: FEATURE_IMPORTANCE,
      temporalReconstruction: dq.temporalReconstruction,
    });
  });
}
