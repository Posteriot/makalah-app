import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { AutoRescueResult } from "../policy/types"
import type { ConvexFetchQuery, ConvexFetchMutation } from "../types"

// ────────────────────────────────────────────────────────────────
// Auto-Rescue Policy
//
// When the model calls createArtifact or updateArtifact while the
// paper session is in "pending_validation", auto-rescue transitions
// the session to "revision" so the tool can proceed.
// ────────────────────────────────────────────────────────────────

export async function executeAutoRescue(params: {
    paperSession: { _id: Id<"paperSessions">; stageStatus?: string }
    source: "createArtifact" | "updateArtifact"
    userId: Id<"users">
    fetchMutationWithToken: ConvexFetchMutation
    fetchQueryWithToken: ConvexFetchQuery
    conversationId: Id<"conversations">
}): Promise<AutoRescueResult> {
    const { paperSession, source, userId, fetchMutationWithToken, fetchQueryWithToken, conversationId } = params

    if (paperSession.stageStatus !== "pending_validation") {
        return { rescued: false, refreshedSession: undefined, error: undefined }
    }

    try {
        const rescueResult = await fetchMutationWithToken(api.paperSessions.autoRescueRevision, {
            sessionId: paperSession._id,
            userId,
            source,
        })

        if (!rescueResult.rescued) {
            return { rescued: false, refreshedSession: undefined, error: undefined }
        }

        const refreshed = await fetchQueryWithToken(api.paperSessions.getByConversation, {
            conversationId,
        })

        return {
            rescued: true,
            refreshedSession: refreshed ?? undefined,
            error: undefined,
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[${source}] Auto-rescue failed:`, err)
        return { rescued: false, refreshedSession: undefined, error: message }
    }
}
