/**
 * RunStore persistence adapter.
 *
 * Thin wrapper around the Convex `harnessRuns` / `harnessRunSteps` mutations.
 * Every method is a 1:1 pass-through to a single Convex mutation — including
 * `startStep`, which now delegates to the server-side `startStepAtomic`
 * mutation (Phase 6 audit fix HIGH 1) so increment + insert + setCurrent
 * commit in a single Convex transaction. No composed-call window remains
 * in this adapter.
 *
 * Design rules (see persistence/types.ts for the interface contract):
 *   - No business logic; no orchestration across multiple mutations.
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
    PauseRunParams,
    ResumeRunParams,
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
         * Single atomic mutation — delegates to `api.harnessRuns.startStepAtomic`.
         * The server-side handler runs increment + insert + setCurrent inside
         * one Convex transaction, eliminating the partial-write window that
         * existed when this adapter chained three separate mutations.
         */
        async startStep(runId: Id<"harnessRuns">) {
            const result = (await deps.fetchMutation(
                api.harnessRuns.startStepAtomic,
                { runId },
            )) as { stepId: Id<"harnessRunSteps">; stepIndex: number }

            console.info(
                `[HARNESS][persistence] startStep runId=${runId} stepIndex=${result.stepIndex}`,
            )
            return result
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

        // ── Phase 8 — pause/resume ──
        // Both methods compose TWO Convex mutations. Unlike `startStep` (which
        // was collapsed to server-side atomic in Phase 6 audit fix HIGH 1),
        // decision and run state live in DIFFERENT tables, so atomicity is
        // enforced by Convex's per-call transaction boundary plus explicit
        // ordering: create/resolve the decision row FIRST, then flip run status.
        // A partial failure leaves a pending (or stale resolved) decision with
        // no run-side state change — the subsequent run state mutation simply
        // never happens, and retry semantics are safe because the decisionId
        // is stable.

        async pauseRun(runId: Id<"harnessRuns">, params: PauseRunParams) {
            const { decisionId } = (await deps.fetchMutation(api.harnessDecisions.createDecision, {
                runId,
                type: params.decision.type,
                blocking: params.decision.blocking,
                workflowStage: params.decision.workflowStage,
                prompt: params.decision.prompt,
            })) as { decisionId: string }

            await deps.fetchMutation(api.harnessRuns.pauseRun, {
                runId,
                reason: params.reason,
                decisionId,
            })

            console.info(
                `[HARNESS][persistence] pauseRun runId=${runId} decisionId=${decisionId} reason="${params.reason}"`,
            )
            return { decisionId }
        },

        async resumeRun(runId: Id<"harnessRuns">, params: ResumeRunParams) {
            await deps.fetchMutation(api.harnessDecisions.resolveDecision, {
                decisionId: params.decisionResponse.decisionId,
                resolution: params.decisionResponse.resolution,
                ...(params.decisionResponse.response !== undefined && {
                    response: params.decisionResponse.response,
                }),
            })

            await deps.fetchMutation(api.harnessRuns.resumeRun, {
                runId,
                ownerToken: params.ownerToken,
            })

            console.info(
                `[HARNESS][persistence] resumeRun runId=${runId} decisionId=${params.decisionResponse.decisionId} resolution=${params.decisionResponse.resolution}`,
            )
        },
    }
}
