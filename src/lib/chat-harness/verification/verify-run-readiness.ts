import type { StepVerificationResult, RunReadinessResult } from "./types";
import type { PaperStageId } from "../../../../convex/paperSessions/constants";

/**
 * Determines whether a run can be considered complete by checking the step
 * verification result and paper session state.
 *
 * This is a simple aggregation function. The heavy verification logic lives
 * in `verifyStepOutcome` (Task 5.2).
 */
export function verifyRunReadiness(params: {
    stepVerification: StepVerificationResult;
    paperSession: { currentStage: string; stageStatus?: string } | null;
    paperStageScope: PaperStageId | undefined;
}): RunReadinessResult {
    const { stepVerification, paperSession } = params;
    const blockers: string[] = [];

    // 1. Must-pause takes priority
    if (stepVerification.mustPause) {
        blockers.push(stepVerification.pauseReason ?? "pause requested");
        return { ready: false, blockers };
    }

    // 2. Leakage detected without a stream content override
    if (stepVerification.leakageDetected && !stepVerification.streamContentOverride) {
        blockers.push("leakage detected without override");
        return { ready: false, blockers };
    }

    // 3. Paper session in "drafting" with incomplete artifact chain
    if (
        paperSession &&
        paperSession.stageStatus === "drafting" &&
        !stepVerification.artifactChainComplete
    ) {
        blockers.push("artifact chain incomplete");
        return { ready: false, blockers };
    }

    // 4. Paper session present, plan not complete, and there are completion blockers
    if (
        paperSession &&
        !stepVerification.planComplete &&
        stepVerification.completionBlockers.length > 0
    ) {
        blockers.push(...stepVerification.completionBlockers);
        return { ready: false, blockers };
    }

    // 5. All checks passed
    return { ready: true, blockers: [] };
}
