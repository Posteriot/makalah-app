// ────────────────────────────────────────────────────────────────
// verification/index.ts — barrel export
// ────────────────────────────────────────────────────────────────

export { verifyStepOutcome } from "./verify-step-outcome"
// `verifyRunReadiness` is intentionally NOT exported. The function exists
// in `./verify-run-readiness.ts` as dormant scaffolding (Task 6.4d note:
// no current callers; instrumentation will follow when first caller lands).
// Per the "no unused exports" project rule, surfacing it through the barrel
// would be premature. (Codex audit LOW 2 — Phase 6 close-out, 2026-04-16.)
export type {
    StepVerificationResult,
    PaperSessionForVerification,
    RunReadinessResult,
} from "./types"
