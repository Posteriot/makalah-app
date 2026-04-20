// ────────────────────────────────────────────────────────────────
// Step Verification
// ────────────────────────────────────────────────────────────────

/** Result of verifying a single step's outcome. */
export interface StepVerificationResult {
    canContinue: boolean
    mustPause: boolean
    pauseReason: string | undefined
    canComplete: boolean
    completionBlockers: string[]
    leakageDetected: boolean
    leakageDetails: { match: string; snippet: string } | undefined
    artifactChainComplete: boolean
    planComplete: boolean
    /** Replacement text when outcome guard triggers (sanitized content). */
    streamContentOverride: string | undefined
}

// ────────────────────────────────────────────────────────────────
// Paper Session (narrow type for verification scope)
// ────────────────────────────────────────────────────────────────

/** Narrow paper session type used only by verification functions. */
export interface PaperSessionForVerification {
    currentStage: string
    stageStatus?: string
}

// ────────────────────────────────────────────────────────────────
// Run Readiness
// ────────────────────────────────────────────────────────────────

/** Result of verifying overall run readiness/completion. */
export interface RunReadinessResult {
    ready: boolean
    blockers: string[]
}
