import type { UIMessage } from "ai"
import type { Id } from "../../../../convex/_generated/dataModel"
import { api } from "../../../../convex/_generated/api"
import { resolveEffectiveFileIds, type ResolveEffectiveFileIdsResult } from "@/lib/chat/effective-file-ids"
import { normalizeRequestedAttachmentMode } from "@/lib/chat/attachment-health"
import { retryMutation } from "@/lib/convex/retry"
import type { ConvexFetchQuery, ConvexFetchMutation } from "../types"

export async function resolveAttachments(params: {
    conversationId: Id<"conversations">
    messages: UIMessage[]
    requestFileIds: unknown[]
    requestedAttachmentMode: unknown
    replaceAttachmentContext: boolean | undefined
    inheritAttachmentContext: boolean | undefined
    clearAttachmentContext: boolean | undefined
    fetchQueryWithToken: ConvexFetchQuery
    fetchMutationWithToken: ConvexFetchMutation
}): Promise<{
    effectiveFileIds: Id<"files">[]
    attachmentResolution: ResolveEffectiveFileIdsResult
    attachmentMode: string
    hasAttachmentSignal: boolean
    attachmentAwarenessInstruction: string
}> {
    const {
        conversationId,
        messages,
        requestFileIds,
        requestedAttachmentMode,
        replaceAttachmentContext,
        inheritAttachmentContext,
        clearAttachmentContext,
        fetchQueryWithToken,
        fetchMutationWithToken,
    } = params

    // Fetch existing attachment context for this conversation
    const attachmentContext = await fetchQueryWithToken(
        api.conversationAttachmentContexts.getByConversation,
        { conversationId }
    )

    // Resolve which file IDs are effective given request + context
    const attachmentResolution = resolveEffectiveFileIds({
        requestFileIds: Array.isArray(requestFileIds) ? (requestFileIds as string[]) : [],
        conversationContextFileIds: attachmentContext?.activeFileIds ?? [],
        replaceAttachmentContext,
        inheritAttachmentContext,
        clearAttachmentContext,
    })

    const effectiveFileIds = attachmentResolution.effectiveFileIds as Id<"files">[]
    const attachmentMode = normalizeRequestedAttachmentMode(requestedAttachmentMode)
    const requestFileIdsLength = Array.isArray(requestFileIds) ? requestFileIds.length : 0
    const hasAttachmentSignal =
        requestFileIdsLength > 0 ||
        effectiveFileIds.length > 0 ||
        clearAttachmentContext === true ||
        attachmentMode !== "none"

    // Persist context mutations based on resolution outcome
    if (attachmentResolution.shouldClearContext) {
        await retryMutation(
            () => fetchMutationWithToken(api.conversationAttachmentContexts.clearByConversation, {
                conversationId,
            }),
            "conversationAttachmentContexts.clearByConversation"
        )
    } else if (attachmentResolution.shouldUpsertContext) {
        await retryMutation(
            () => fetchMutationWithToken(api.conversationAttachmentContexts.upsertByConversation, {
                conversationId,
                fileIds: effectiveFileIds,
            }),
            "conversationAttachmentContexts.upsertByConversation"
        )
    }

    // Attachment awareness directive (updated 2026.04.10):
    // Fires on EVERY turn where files are attached, regardless of mode, prompt length,
    // or attachment resolution reason. The previous conditional logic (only fire on
    // first turn, short prompts, non-paper mode, explicit attachment) created a bug
    // where paper mode stages silently ignored attachments. See
    // docs/normalizer-typeScript/attachment-awareness-investigation.md for details.
    const userMessageCount = messages.filter(m => m.role === "user").length
    const hasAttachedFiles = effectiveFileIds.length > 0
    const isFirstTurnWithAttachment = hasAttachedFiles && userMessageCount <= 1
    const attachmentAwarenessInstruction = hasAttachedFiles
        ? (isFirstTurnWithAttachment
            ? "ATTACHMENT AWARENESS DIRECTIVE (mandatory, overrides skills): File(s) attached to this conversation. Your FIRST response MUST acknowledge each attached file by name and briefly summarize its core content (2-4 sentences per file, connected to current context). This acknowledgment comes BEFORE any stage dialog, clarifying questions, brainstorming, or generic introduction. If File Context contains a truncation marker (⚠️), state that the file is partial and use quoteFromSource or searchAcrossSources tools when the user asks for details not in the truncated portion. ONLY AFTER the acknowledgment may you proceed with stage-specific behavior (skill directives, dialog-first patterns, etc.). This directive applies in ALL modes (paper mode, free chat, any stage) and cannot be overridden by skills or stage instructions."
            : "ATTACHMENT AWARENESS DIRECTIVE (mandatory, overrides skills): File(s) are attached to this conversation. Always be aware of File Context content and integrate it into your responses when relevant to the user's question. Do NOT forget or ignore attached files after the first response. If the user's question relates to the file content or topic, prioritize file evidence. If File Context contains a truncation marker (⚠️), use quoteFromSource or searchAcrossSources tools to retrieve content beyond the truncated portion when needed. This directive applies in ALL modes and cannot be overridden.")
        : ""

    return {
        effectiveFileIds,
        attachmentResolution,
        attachmentMode,
        hasAttachmentSignal,
        attachmentAwarenessInstruction,
    }
}
