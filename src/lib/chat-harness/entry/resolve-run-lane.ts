import type { Id } from "../../../../convex/_generated/dataModel"
import type { RunLane } from "../types"

export function resolveRunLane(params: {
    requestId: string
    conversationId: Id<"conversations">
    isNewConversation: boolean
}): RunLane {
    return {
        requestId: params.requestId,
        conversationId: params.conversationId,
        mode: params.isNewConversation ? "start" : "resume_candidate",
    }
}
