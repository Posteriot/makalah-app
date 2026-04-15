import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai"
import type { ExactSourceConversationMessage } from "@/lib/ai/exact-source-followup"

// ────────────────────────────────────────────────────────────────
// Message conversion, sanitization, and trimming
// Extracted from route.ts lines 265–548
// ────────────────────────────────────────────────────────────────

const MAX_CHAT_HISTORY_PAIRS = 20 // 20 pairs = 40 messages max

/**
 * Converts UI messages to model messages, sanitizes them for provider
 * compatibility, optionally trims for paper-mode history limits, and
 * extracts the recent conversation context needed by exact-source routing.
 */
export async function convertAndSanitizeMessages(params: {
    messages: UIMessage[]
    isPaperMode: boolean
}): Promise<{
    modelMessages: ModelMessage[]
    recentConversationMessagesForExactSource: ExactSourceConversationMessage[]
    normalizedLastUserContent: string
}> {
    const { messages, isPaperMode } = params

    // ── Extract last user content ────────────────────────────────
    const lastUserMessage = messages[messages.length - 1]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastUserContent = lastUserMessage?.role === "user"
        ? ((lastUserMessage as any).content ||
            lastUserMessage.parts?.find((p): p is { type: "text"; text: string } => p.type === "text")?.text ||
            "")
        : ""
    const normalizedLastUserContent =
        typeof lastUserContent === "string" ? lastUserContent.trim() : ""

    // ── Recent conversation messages for exact-source routing ────
    const recentConversationMessagesForExactSource: ExactSourceConversationMessage[] = messages
        .slice(0, -1)
        .map((message: {
            role?: string
            content?: string
            parts?: Array<{ type?: string; text?: string }>
        }) => {
            const extractedContent = message?.parts?.find((part) => part.type === "text")?.text

            if ((message?.role !== "user" && message?.role !== "assistant") || !extractedContent?.trim()) {
                return null
            }

            return {
                role: message.role,
                content: extractedContent.trim(),
            }
        })
        .filter(
            (
                message: ExactSourceConversationMessage | null
            ): message is ExactSourceConversationMessage => message !== null
        )

    // ── Convert UIMessages to model messages format ──────────────
    const rawModelMessages = await convertToModelMessages(messages)

    // ── Sanitize messages to avoid ZodError from OpenRouter ──────
    // Tool call messages from history can have incompatible formats
    const sanitizedMessages = rawModelMessages
        .map((msg) => {
            // Skip messages with invalid roles
            const validRoles = ["user", "assistant", "system"]
            if (!validRoles.includes(msg.role)) {
                return null
            }

            // Handle content array - preserve text AND file parts
            if (Array.isArray(msg.content)) {
                // Keep text and file parts (images via native multimodal)
                const meaningfulParts = msg.content.filter(
                    (part) =>
                        typeof part === "object" &&
                        part !== null &&
                        "type" in part &&
                        (part.type === "text" || part.type === "file")
                )

                if (meaningfulParts.length === 0) {
                    return null
                }

                // If only text parts, join as string (backward compat)
                const hasFileParts = meaningfulParts.some((p) => p.type === "file")
                if (!hasFileParts) {
                    const textContent = meaningfulParts
                        .filter((p): p is { type: "text"; text: string } => p.type === "text" && "text" in p && typeof p.text === "string")
                        .map((p) => p.text)
                        .join("\n")
                    return { ...msg, content: textContent }
                }

                // Mixed content (text + file) — keep as array for multimodal
                return { ...msg, content: meaningfulParts }
            }

            return msg
        })
        .filter((msg): msg is NonNullable<typeof msg> => msg !== null) as ModelMessage[]
        // Type assertion needed because:
        // 1. Tool messages (role: "tool") are filtered out above
        // 2. Content is converted to string for all messages
        // 3. TypeScript cannot infer this from runtime checks

    // ── Paper-mode message trimming ─────────────────────────────
    // Legacy: Superseded by context compaction chain (P1-P4).
    // TODO: Remove after compaction chain is validated in production.
    let modelMessages = sanitizedMessages
    if (isPaperMode && sanitizedMessages.length > MAX_CHAT_HISTORY_PAIRS * 2) {
        modelMessages = sanitizedMessages.slice(-MAX_CHAT_HISTORY_PAIRS * 2)
    }

    return {
        modelMessages,
        recentConversationMessagesForExactSource,
        normalizedLastUserContent,
    }
}
