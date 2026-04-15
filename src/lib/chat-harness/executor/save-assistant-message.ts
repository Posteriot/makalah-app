import { retryMutation } from "@/lib/convex/retry"
import { api } from "../../../../convex/_generated/api"
import type { SaveAssistantMessageParams } from "./types"
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"

// ────────────────────────────────────────────────────────────────
// Reasoning trace sanitization (private helpers)
// ────────────────────────────────────────────────────────────────

const MAX_REASONING_TRACE_STEPS = 8
const MAX_REASONING_TEXT_LENGTH = 240

const ALLOWED_REASONING_STEP_KEYS = new Set([
    "intent-analysis",
    "paper-context-check",
    "search-decision",
    "source-validation",
    "response-compose",
    "tool-action",
])

const ALLOWED_REASONING_STATUSES = new Set([
    "pending",
    "running",
    "done",
    "skipped",
    "error",
])

const FORBIDDEN_REASONING_PATTERNS = [
    /system\s+prompt/i,
    /developer\s+prompt/i,
    /chain[-\s]?of[-\s]?thought/i,
    /\bcot\b/i,
    /api[\s_-]?key/i,
    /bearer\s+[a-z0-9._-]+/i,
    /\btoken\b/i,
    /\bsecret\b/i,
    /\bpassword\b/i,
    /\bcredential\b/i,
    /internal\s+policy/i,
    /tool\s+schema/i,
]

const truncateReasoningText = (value: string) => value.slice(0, MAX_REASONING_TEXT_LENGTH)
const collapseSpaces = (value: string) => value.replace(/\s+/g, " ").trim()

const containsForbiddenReasoningText = (value: string) =>
    FORBIDDEN_REASONING_PATTERNS.some((pattern) => pattern.test(value))

const sanitizeReasoningText = (value: string, fallback: string) => {
    const withoutCodeFence = value
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
    const cleaned = collapseSpaces(withoutCodeFence)
    if (!cleaned) return fallback
    if (containsForbiddenReasoningText(cleaned)) return fallback
    return truncateReasoningText(cleaned)
}

const normalizeLegacyReasoningNote = (note: string) => {
    const normalized = collapseSpaces(note).toLowerCase()
    if (!normalized) return note

    if (normalized === "web-search-enabled") return "Pencarian web diaktifkan untuk memperkuat jawaban."
    if (normalized === "web-search-disabled") return "Pencarian web tidak diperlukan untuk turn ini."
    if (normalized === "no-web-search") return "Langkah validasi sumber dilewati karena tanpa pencarian web."
    if (normalized === "source-detected") return "Sumber terdeteksi dan sedang diverifikasi."
    if (normalized === "sources-validated") return "Sumber yang dipakai sudah tervalidasi."
    if (normalized === "no-sources-returned") return "Tidak ada sumber valid yang bisa dipakai."
    if (normalized === "tool-running") return "Tool sedang dijalankan untuk membantu proses."
    if (normalized === "tool-done" || normalized === "tool-completed") return "Tool selesai dijalankan."
    if (normalized === "no-tool-detected-yet" || normalized === "no-tool-call") return "Tidak ada tool tambahan yang diperlukan."
    if (normalized === "stream-error") return "Terjadi kendala pada aliran respons."
    if (normalized === "stopped-by-user-or-stream-abort") return "Proses dihentikan sebelum jawaban selesai."

    return note
}

const sanitizeReasoningMode = (mode: unknown): "normal" | "paper" | "websearch" | undefined => {
    if (mode === "normal" || mode === "paper" || mode === "websearch") return mode
    return undefined
}

const sanitizeReasoningStatus = (status: unknown): "pending" | "running" | "done" | "skipped" | "error" => {
    if (typeof status === "string" && ALLOWED_REASONING_STATUSES.has(status)) {
        return status as "pending" | "running" | "done" | "skipped" | "error"
    }
    return "pending"
}

function sanitizeReasoningTraceForPersistence(
    trace?: PersistedCuratedTraceSnapshot
): PersistedCuratedTraceSnapshot | undefined {
    if (!trace || (trace.traceMode !== "curated" && trace.traceMode !== "transparent")) return undefined
    const rawSteps = Array.isArray(trace.steps) ? trace.steps.slice(0, MAX_REASONING_TRACE_STEPS) : []
    const steps = rawSteps
        .map((step) => {
            if (!step || typeof step !== "object") return null
            if (typeof step.stepKey !== "string" || !ALLOWED_REASONING_STEP_KEYS.has(step.stepKey)) return null

            const sanitizedMeta = step.meta
                ? {
                    ...(sanitizeReasoningMode(step.meta.mode)
                        ? { mode: sanitizeReasoningMode(step.meta.mode) }
                        : {}),
                    ...(step.meta.stage
                        ? { stage: sanitizeReasoningText(step.meta.stage, "Tahap tidak tersedia.") }
                        : {}),
                    ...(step.meta.note
                        ? {
                            note: sanitizeReasoningText(
                                normalizeLegacyReasoningNote(step.meta.note),
                                "Detail aktivitas disederhanakan demi keamanan."
                            ),
                        }
                        : {}),
                    ...(typeof step.meta.sourceCount === "number" && Number.isFinite(step.meta.sourceCount)
                        ? { sourceCount: Math.max(0, Math.floor(step.meta.sourceCount)) }
                        : {}),
                    ...(step.meta.toolName
                        ? {
                            toolName: sanitizeReasoningText(
                                step.meta.toolName.replace(/[^a-zA-Z0-9:_-]/g, " "),
                                "tool"
                            ),
                        }
                        : {}),
                }
                : undefined

            return {
                stepKey: step.stepKey,
                label: sanitizeReasoningText(step.label, "Langkah reasoning"),
                status: sanitizeReasoningStatus(step.status),
                ...(typeof step.progress === "number" && Number.isFinite(step.progress)
                    ? { progress: Math.max(0, Math.min(100, step.progress)) }
                    : {}),
                ts: Number.isFinite(step.ts) ? step.ts : Date.now(),
                ...(typeof step.thought === "string" && step.thought.trim()
                    ? { thought: (() => { const t = step.thought.trim(); return sanitizeReasoningText(t.length > 600 ? t.slice(0, 597) + "..." : t, "Detail reasoning."); })() }
                    : {}),
                ...(sanitizedMeta && Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {}),
            }
        })
        .filter((step): step is NonNullable<typeof step> => Boolean(step))
    if (steps.length === 0) return undefined

    return {
        version: trace.version === 2 ? 2 : 1,
        headline: sanitizeReasoningText(
            trace.headline || "",
            ""
        ),
        traceMode: trace.traceMode === "transparent" ? "transparent" : "curated",
        completedAt: Number.isFinite(trace.completedAt) ? trace.completedAt : Date.now(),
        ...(typeof trace.durationSeconds === "number" && Number.isFinite(trace.durationSeconds)
            ? { durationSeconds: trace.durationSeconds }
            : {}),
        ...(typeof trace.rawReasoning === "string" && trace.rawReasoning.trim()
            ? { rawReasoning: trace.rawReasoning }
            : {}),
        steps,
    }
}

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
