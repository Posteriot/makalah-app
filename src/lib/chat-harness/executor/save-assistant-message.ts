import { retryMutation } from "@/lib/convex/retry"
import { api } from "../../../../convex/_generated/api"
import type { SaveAssistantMessageParams } from "./types"
import { sanitizeReasoningTraceForPersistence } from "../shared/reasoning-sanitization"

// ────────────────────────────────────────────────────────────────
// saveAssistantMessage
// ────────────────────────────────────────────────────────────────

/**
 * Persist an assistant message to the conversation.
 *
 * Sanitizes the reasoning trace (strips internal/sensitive fields) and
 * normalizes sources before writing to the database via retryMutation.
 */
export async function saveAssistantMessage(params: SaveAssistantMessageParams): Promise<void> {
    const {
        conversationId,
        content,
        sources,
        usedModel,
        reasoningTrace,
        jsonRendererChoice,
        uiMessageId,
        planSnapshot,
        fetchMutationWithToken,
    } = params

    const sanitizedReasoningTrace = sanitizeReasoningTraceForPersistence(reasoningTrace)
    const normalizedSources = sources
        ?.map((source) => ({
            url: source.url,
            title: source.title,
            ...(typeof source.publishedAt === "number" && Number.isFinite(source.publishedAt)
                ? { publishedAt: source.publishedAt }
                : {}),
        }))
        .filter((source) => source.url && source.title)

    await retryMutation(
        () => fetchMutationWithToken(api.messages.createMessage, {
            conversationId,
            role: "assistant",
            content,
            metadata: {
                model: usedModel,
                ...(uiMessageId ? { uiMessageId } : {}),
            },
            sources: normalizedSources && normalizedSources.length > 0 ? normalizedSources : undefined,
            reasoningTrace: sanitizedReasoningTrace,
            ...(jsonRendererChoice
                ? { jsonRendererChoice: JSON.stringify(jsonRendererChoice) }
                : {}),
            ...(uiMessageId ? { uiMessageId } : {}),
            ...(planSnapshot ? { planSnapshot } : {}),
        }),
        "messages.createMessage(assistant)"
    )
}
