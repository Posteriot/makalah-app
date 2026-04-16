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
