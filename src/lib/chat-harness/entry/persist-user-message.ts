/**
 * User Message Persistence
 *
 * Extracts the latest user message content from AI SDK UIMessage format,
 * validates that attachments have accompanying text, and persists the
 * message to Convex.
 */

import { retryMutation } from "@/lib/convex/retry"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { UIMessage } from "ai"
import type { ResolveEffectiveFileIdsResult } from "@/lib/chat/effective-file-ids"
import type { ConvexFetchMutation } from "../types"

export async function persistUserMessage(params: {
    messages: UIMessage[]
    conversationId: Id<"conversations">
    effectiveFileIds: Id<"files">[]
    requestedAttachmentMode: unknown
    attachmentResolution: ResolveEffectiveFileIdsResult
    fetchMutationWithToken: ConvexFetchMutation
}): Promise<void | Response> {
    const {
        messages,
        conversationId,
        effectiveFileIds,
        requestedAttachmentMode,
        attachmentResolution,
        fetchMutationWithToken,
    } = params

    // Extract content from last message (AI SDK v5/v6 UIMessage format)
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== "user") return

    // AI SDK v5/v6: content may live in a legacy `content` field (not in the
    // UIMessage type but present at runtime) or in the parts array.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = lastMessage as any
    const userContent: string = msg.content ||
        lastMessage.parts?.find((p): p is { type: "text"; text: string } => p.type === "text")?.text ||
        ""
    const normalizedUserContent = typeof userContent === "string" ? userContent.trim() : ""

    if (!normalizedUserContent && effectiveFileIds.length > 0) {
        return new Response(
            "Attachment membutuhkan teks pendamping minimal 1 karakter.",
            { status: 400 },
        )
    }

    if (normalizedUserContent) {
        const attachmentMode =
            requestedAttachmentMode === "explicit" || requestedAttachmentMode === "inherit"
                ? requestedAttachmentMode
                : (attachmentResolution.reason === "explicit" ? "explicit" : "inherit")

        await retryMutation(
            () => fetchMutationWithToken(api.messages.createMessage, {
                conversationId,
                role: "user",
                content: userContent,
                fileIds: effectiveFileIds.length > 0 ? effectiveFileIds : undefined,
                attachmentMode,
                ...(lastMessage.id ? { uiMessageId: lastMessage.id } : {}),
            }),
            "messages.createMessage(user)",
        )
    }
}
