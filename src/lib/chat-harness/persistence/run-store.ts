/**
 * RunStore persistence adapter.
 *
 * Thin wrapper around the Convex `harnessRuns` / `harnessRunSteps` mutations.
 * Every method except `startStep` is a 1:1 pass-through to a single Convex
 * mutation. `startStep` is the one composed operation — see the comment above
 * that method for why.
 *
 * Design rules (see persistence/types.ts for the interface contract):
 *   - No business logic beyond the `startStep` composition.
 *   - No try/catch: Convex errors propagate unchanged.
 *   - Observability logs fire AFTER each mutation succeeds so the log line
 *     reflects the actual DB state change.
 */
import type { ConvexFetchMutation } from "../types/runtime"
import type {
    RunStore,
    CreateRunParams,
    CompleteStepParams,
    PolicyStateSnapshot,
    RunStatus,
    UpdateRunStatusOptions,
} from "./types"
import type { Id } from "../../../../convex/_generated/dataModel"
import { api } from "../../../../convex/_generated/api"

export interface RunStoreDeps {
    fetchMutation: ConvexFetchMutation
}

export function createRunStore(deps: RunStoreDeps): RunStore {
    return {
        async createRun(params: CreateRunParams) {
            const result = (await deps.fetchMutation(
                api.harnessRuns.createRun,
                params,
            )) as { runId: Id<"harnessRuns">; ownerToken: string }
            const { runId, ownerToken } = result
            console.info(
                `[HARNESS][persistence] createRun runId=${runId} ownerToken=${ownerToken}`,
            )
            return result
        },

        async linkPaperSession(
            runId: Id<"harnessRuns">,
            paperSessionId: Id<"paperSessions">,
        ) {
            await deps.fetchMutation(api.harnessRuns.linkPaperSession, {
                runId,
                paperSessionId,
            })
            console.info(
                `[HARNESS][persistence] linkPaperSession runId=${runId} paperSessionId=${paperSessionId}`,
            )
        },

        async updateStatus(
            runId: Id<"harnessRuns">,
            status: RunStatus,
            opts?: UpdateRunStatusOptions,
        ) {
            // Spread `opts` only when defined so we never send explicit
            // `undefined` fields through to the Convex validator.
            const args = opts !== undefined
                ? { runId, status, ...opts }
                : { runId, status }
            await deps.fetchMutation(api.harnessRuns.updateRunStatus, args)
            console.info(
                `[HARNESS][persistence] updateStatus runId=${runId} status=${status}`,
            )
        },

        async recordPolicyState(
            runId: Id<"harnessRuns">,
            policyState: PolicyStateSnapshot,
        ) {
            await deps.fetchMutation(api.harnessRuns.recordPolicyState, {
                runId,
                policyState,
            })
            console.info(
                `[HARNESS][persistence] recordPolicyState runId=${runId} currentBoundary=${policyState.currentBoundary}`,
            )
        },

        /**
         * Composed operation — the ONLY place in this adapter where we chain
         * multiple Convex mutations:
         *   1. incrementStepNumber → returns the atomically-bumped stepNumber.
         *   2. createStep           → inserts the row using that stepNumber.
         *   3. setCurrentStep       → points the run at the new step.
         * All other methods in this adapter are 1:1 pass-through.
         */
        async startStep(runId: Id<"harnessRuns">) {
            const { stepNumber } = (await deps.fetchMutation(
                api.harnessRuns.incrementStepNumber,
                { runId },
            )) as { stepNumber: number }

            const { stepId } = (await deps.fetchMutation(
                api.harnessRunSteps.createStep,
                { runId, stepIndex: stepNumber, startedAt: Date.now() },
            )) as { stepId: Id<"harnessRunSteps"> }

            await deps.fetchMutation(api.harnessRuns.setCurrentStep, {
                runId,
                stepId,
            })

            console.info(
                `[HARNESS][persistence] startStep runId=${runId} stepIndex=${stepNumber}`,
            )
            return { stepId, stepIndex: stepNumber }
        },

        async completeStep(
            stepId: Id<"harnessRunSteps">,
            params: CompleteStepParams,
        ) {
            await deps.fetchMutation(api.harnessRunSteps.completeStep, {
                stepId,
                ...params,
            })
            console.info(
                `[HARNESS][persistence] completeStep stepId=${stepId} status=${params.status} blockers=${params.verificationSummary?.completionBlockers?.length ?? 0}`,
            )
        },

        async completeRun(runId: Id<"harnessRuns">) {
            await deps.fetchMutation(api.harnessRuns.completeRun, { runId })
            console.info(
                `[HARNESS][persistence] completeRun runId=${runId}`,
            )
        },
    }
}
