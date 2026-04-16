import type { UIMessage } from "ai"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { OperationType } from "@/lib/billing/enforcement"
import type { ParsedChoiceInteractionEvent } from "@/lib/chat/choice-request"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConvexFetchQuery = (ref: any, args: any) => Promise<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConvexFetchMutation = (ref: any, args: any) => Promise<any>

export interface AcceptedChatRequest {
    requestId: string
    userId: Id<"users">
    convexToken: string
    messages: UIMessage[]
    lastUserContent: string
    firstUserContent: string
    requestStartedAt: number | undefined
    billingContext: {
        userId: Id<"users">
        quotaWarning: string | undefined
        operationType: OperationType
    }
    choiceInteractionEvent: ParsedChoiceInteractionEvent | null
    fetchQueryWithToken: ConvexFetchQuery
    fetchMutationWithToken: ConvexFetchMutation
    conversationId: Id<"conversations"> | undefined
    requestFileIds: unknown[]
    requestedAttachmentMode: unknown
    replaceAttachmentContext: boolean | undefined
    inheritAttachmentContext: boolean | undefined
    clearAttachmentContext: boolean | undefined
    /**
     * Present when the incoming request carries `x-harness-resume: <runId>`.
     * Orchestrator uses this to skip step 2 (resolveRunLane) and reuse the
     * persisted run's lane state. Validation (token + ownership) happens in
     * acceptChatRequest before this field is populated. The extra fields
     * (paperSessionId, workflowStage) come from the persisted run row and
     * let the orchestrator reuse persisted state without re-deriving.
     *
     * `sessionId` is NOT persisted on harnessRuns (schema v1) — the
     * orchestrator mints a fresh sessionId on resume. Event correlation
     * across the paused/resumed boundary is preserved via `runId`.
     */
    resumeContext?: {
        runId: Id<"harnessRuns">
        ownerToken: string
        paperSessionId: Id<"paperSessions"> | undefined
        workflowStage: string
        conversationId: Id<"conversations">
    }
}

export type RunStartMode = "start" | "resume_candidate"

export interface RunLane {
    requestId: string
    conversationId: Id<"conversations">
    mode: RunStartMode
    runId: Id<"harnessRuns">
    ownerToken: string
    sessionId: string
}
