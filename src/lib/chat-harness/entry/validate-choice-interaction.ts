import type { Id } from "../../../../convex/_generated/dataModel"
import type { ParsedChoiceInteractionEvent, ResolvedChoiceWorkflow } from "@/lib/chat/choice-request"
import {
    validateChoiceInteractionEvent,
    buildChoiceContextNote,
    resolveChoiceWorkflow,
} from "@/lib/chat/choice-request"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { RunLane } from "../types"
import type { EventStore } from "../persistence"
import { HARNESS_EVENT_TYPES } from "../persistence"

/**
 * Minimal paper-session shape consumed by choice validation.
 * Kept narrow so the caller can pass the full Convex document without
 * coupling this module to the complete schema.
 */
export interface PaperSessionForChoice {
    currentStage: string
    stageStatus?: string
    stageData?: Record<string, Record<string, unknown> | undefined>
}

/**
 * Validates a choice interaction event against the current paper-session
 * state, resolves the workflow action, and builds the context note that
 * is injected into the model prompt.
 *
 * Returns a 409 `Response` when the choice is stale (conversation state
 * moved on). The caller should check `result instanceof Response` and
 * short-circuit if true.
 *
 * When `choiceInteractionEvent` is null the function returns early with
 * both fields undefined — no work to do.
 *
 * Event emission (Task 6.4e):
 *   - On any validated choice arrival → `user_decision_received`
 *   - Before guard check                → `workflow_transition_requested`
 *   - Passed guard (valid)              → `workflow_transition_applied`
 *   - Failed guard (stale 409)          → `workflow_transition_rejected`
 */
export async function validateChoiceInteraction(params: {
    choiceInteractionEvent: ParsedChoiceInteractionEvent | null
    conversationId: Id<"conversations">
    paperSession: PaperSessionForChoice | null
    paperStageScope: PaperStageId | undefined
    paperModePrompt: string | null
    eventStore: EventStore
    lane: RunLane
    userId: Id<"users">
}): Promise<
    | {
          resolvedWorkflow: ResolvedChoiceWorkflow | undefined
          choiceContextNote: string | undefined
      }
    | Response
> {
    const {
        choiceInteractionEvent,
        paperSession,
        paperStageScope,
        paperModePrompt,
        eventStore,
        lane,
        userId,
    } = params

    if (!choiceInteractionEvent) {
        return { resolvedWorkflow: undefined, choiceContextNote: undefined }
    }

    // --- Decision event: user submitted a choice ---
    // Fire BEFORE the guard so we record the arrival even if it turns out stale.
    // `decisionId` is synthesized from the source message + stage since the
    // choice-submit envelope has no dedicated decision id field.
    const decisionId = `${choiceInteractionEvent.sourceMessageId}:${choiceInteractionEvent.stage}`
    await eventStore.emit({
        eventType: HARNESS_EVENT_TYPES.USER_DECISION_RECEIVED,
        userId,
        sessionId: lane.sessionId,
        chatId: lane.conversationId,
        runId: lane.runId,
        correlationId: lane.requestId,
        payload: {
            decisionId,
            decisionType: "selection",
            responseType: "answered",
            response: {
                stage: choiceInteractionEvent.stage,
                choicePartId: choiceInteractionEvent.choicePartId,
                kind: choiceInteractionEvent.kind,
                selectedOptionIds: choiceInteractionEvent.selectedOptionIds,
                workflowAction: choiceInteractionEvent.workflowAction,
                decisionMode: choiceInteractionEvent.decisionMode,
                customText: choiceInteractionEvent.customText,
                submittedAt: choiceInteractionEvent.submittedAt,
            },
        },
    })

    // --- Workflow transition requested (before guard) ---
    const fromStage = paperSession?.currentStage ?? "intake"
    const toStage = choiceInteractionEvent.stage
    await eventStore.emit({
        eventType: HARNESS_EVENT_TYPES.WORKFLOW_TRANSITION_REQUESTED,
        userId,
        sessionId: lane.sessionId,
        chatId: lane.conversationId,
        runId: lane.runId,
        correlationId: lane.requestId,
        payload: {
            fromStage,
            toStage,
            reasonClass: "user_decision",
            reason: "user_choice",
        },
    })

    // --- Stale-state validation (throws on mismatch) ---
    try {
        validateChoiceInteractionEvent({
            event: choiceInteractionEvent,
            conversationId: params.conversationId,
            currentStage: paperStageScope ?? null,
            isPaperMode: !!paperModePrompt,
            stageStatus: paperSession?.stageStatus as string | undefined,
        })
    } catch (validationError) {
        const errorMsg =
            validationError instanceof Error
                ? validationError.message
                : String(validationError)

        if (errorMsg.includes("CHOICE_REJECTED_STALE_STATE")) {
            // Record the rejection before returning the 409.
            await eventStore.emit({
                eventType: HARNESS_EVENT_TYPES.WORKFLOW_TRANSITION_REJECTED,
                userId,
                sessionId: lane.sessionId,
                chatId: lane.conversationId,
                runId: lane.runId,
                correlationId: lane.requestId,
                payload: {
                    fromStage,
                    toStage,
                    rejectionClass: "guard_failed",
                    reason: "stale_state",
                    currentStage: paperSession?.currentStage,
                    stageStatus: paperSession?.stageStatus,
                },
            })

            console.warn(
                `[stale-choice-rejected] stage=${choiceInteractionEvent.stage} stageStatus=${paperSession?.stageStatus} sourceMessageId=${choiceInteractionEvent.sourceMessageId} submittedAt=${choiceInteractionEvent.submittedAt}`,
            )
            return new Response(
                JSON.stringify({
                    error: "CHOICE_REJECTED_STALE_STATE",
                    message:
                        "Pilihan ini sudah tidak berlaku karena state draft sudah berubah. Silakan gunakan chat atau panel validasi yang aktif.",
                    stage: choiceInteractionEvent.stage,
                    stageStatus: paperSession?.stageStatus,
                }),
                { status: 409, headers: { "Content-Type": "application/json" } },
            )
        }
        throw validationError // re-throw non-stale errors
    }

    // --- Resolve choice workflow ---
    const choiceStageData = paperSession?.stageData as
        | Record<string, Record<string, unknown> | undefined>
        | undefined
    const currentStageChoiceData =
        choiceStageData?.[choiceInteractionEvent.stage]
    const hasExistingArtifact = !!currentStageChoiceData?.artifactId

    const resolvedWorkflow = resolveChoiceWorkflow({
        stage: choiceInteractionEvent.stage as PaperStageId,
        workflowAction: choiceInteractionEvent.workflowAction,
        decisionMode: choiceInteractionEvent.decisionMode,
        stageData: currentStageChoiceData as Record<string, unknown> | undefined,
        hasExistingArtifact,
        stageStatus: paperSession?.stageStatus as string | undefined,
    })

    // --- Workflow transition applied (guard passed) ---
    await eventStore.emit({
        eventType: HARNESS_EVENT_TYPES.WORKFLOW_TRANSITION_APPLIED,
        userId,
        sessionId: lane.sessionId,
        chatId: lane.conversationId,
        runId: lane.runId,
        correlationId: lane.requestId,
        payload: {
            fromStage,
            toStage,
            appliedBy: "orchestrator",
            appliedAt: Date.now(),
            resolvedAction: resolvedWorkflow.action,
            workflowClass: resolvedWorkflow.workflowClass,
        },
    })

    // --- Build context note ---
    const choiceContextNote = buildChoiceContextNote(choiceInteractionEvent, {
        hasExistingArtifact,
        resolvedWorkflow,
    })

    // --- Observability ---
    if (resolvedWorkflow.action !== "continue_discussion") {
        console.info(
            `[CHOICE][commit-point] stage=${choiceInteractionEvent.stage} action=${resolvedWorkflow.action} class=${resolvedWorkflow.workflowClass} reason=${resolvedWorkflow.reason} contract=${resolvedWorkflow.contractVersion}`,
        )
    } else {
        console.info(
            `[CHOICE][exploration-loop] stage=${choiceInteractionEvent.stage} action=${resolvedWorkflow.action} reason=${resolvedWorkflow.reason} contract=${resolvedWorkflow.contractVersion}`,
        )
    }

    console.info("[PAPER][post-choice-context]", {
        stage: choiceInteractionEvent.stage,
        stageStatus: paperSession?.stageStatus ?? "unknown",
        workflowAction: choiceInteractionEvent.workflowAction ?? "none",
        decisionMode: choiceInteractionEvent.decisionMode ?? "unknown",
        resolvedAction: resolvedWorkflow.action,
        workflowClass: resolvedWorkflow.workflowClass,
        contractVersion: resolvedWorkflow.contractVersion,
        reason: resolvedWorkflow.reason,
        hasCurrentArtifact: hasExistingArtifact,
    })

    return { resolvedWorkflow, choiceContextNote }
}
