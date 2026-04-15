import type { Id } from "../../../../convex/_generated/dataModel"
import type { ParsedChoiceInteractionEvent, ResolvedChoiceWorkflow } from "@/lib/chat/choice-request"
import {
    validateChoiceInteractionEvent,
    buildChoiceContextNote,
    resolveChoiceWorkflow,
} from "@/lib/chat/choice-request"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"

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
 */
export async function validateChoiceInteraction(params: {
    choiceInteractionEvent: ParsedChoiceInteractionEvent | null
    conversationId: Id<"conversations">
    paperSession: PaperSessionForChoice | null
    paperStageScope: PaperStageId | undefined
    paperModePrompt: string | null
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
    } = params

    if (!choiceInteractionEvent) {
        return { resolvedWorkflow: undefined, choiceContextNote: undefined }
    }

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
