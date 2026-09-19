import type { FeatureFlags } from "../config.js";
import type { AppContext } from "../context.js";

export function resolveFlags(ctx: AppContext): FeatureFlags {
  // phiTrainingAllowed stays false unless config flips it AND express consent exists later.
  // Contract-only is insufficient — see docs/hipaa-invariants.md.
  return { ...ctx.config.flags, quebecLaw25: false };
}
