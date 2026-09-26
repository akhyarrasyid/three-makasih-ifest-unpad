import { handle, ok } from "@/server/http";
import { FOLDS, BENCHMARKS } from "@/mock/models";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () =>
    ok({
      folds: FOLDS,
      benchmarks: BENCHMARKS,
      safeguards: [
        {
          name: "Temporal Lineage Reconstruction",
          status: "ENFORCED",
          description: "Chronology inferred from lag fingerprints across 168 unlabelled origins.",
        },
        {
          name: "Whole-Basin Spatial Holdout",
          status: "ENFORCED",
          description: "Sub-basins held out entirely from training history to measure cold-start generalization.",
        },
        {
          name: "Climatology Masking",
          status: "ENFORCED",
          description: "Seasonal long-term baselines masked to prevent intra-annual leakage.",
        },
        {
          name: "Temporal Gap + Historical Anchor",
          status: "ENFORCED",
          description: "Strict T_train < T_val boundary with operational lead-time buffer.",
        },
      ],
    })
  );
}
