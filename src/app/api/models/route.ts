import { handle, ok } from "@/server/http";
import { models } from "@/server/services";
import { ABLATIONS, BENCHMARKS, DRIFT_TIMELINE, ERROR_BY_HORIZON, FEATURE_IMPORTANCE, FOLDS, RESIDUAL_BY_CATEGORY } from "@/mock/models";
export const dynamic = "force-dynamic";
export async function GET() {
  return handle(() => ok({ versions: models(), benchmarks: BENCHMARKS, ablations: ABLATIONS, folds: FOLDS, featureImportance: FEATURE_IMPORTANCE, drift: DRIFT_TIMELINE, residualByCategory: RESIDUAL_BY_CATEGORY, errorByHorizon: ERROR_BY_HORIZON }));
}
