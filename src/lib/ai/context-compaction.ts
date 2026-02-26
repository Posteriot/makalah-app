/**
 * Context Compaction — Threshold-Based Priority Chain
 *
 * Inserted between message building and brute prune in chat/route.ts.
 * Runs P1-P4 sequentially, stopping when tokens drop below 85%.
 *
 * P1: Strip chitchat (deterministic)
 * P2: Compact oldest completed stages (paper only, deterministic)
 * P3: LLM summarize mid-conversation (paper + general chat)
 * P4: Compact recent completed stages (paper only, deterministic)
 */

import { generateText } from "ai"
import { getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants"
import { getPaperMidStageSummaryPrompt, getGeneralChatSummaryPrompt } from "./compaction-prompts"

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

export interface CompactableMessage {
    role: string
    content: string
    [key: string]: unknown
}

interface StageMessageBoundary {
    stage: string
    firstMessageId: string
    lastMessageId: string
    messageCount: number
}

interface PaperMemoryEntry {
    stage: string
    decision: string
    timestamp: number
    superseded?: boolean
}

interface PaperSessionContext {
    currentStage: string
    stageMessageBoundaries?: StageMessageBoundary[]
    paperMemoryDigest?: PaperMemoryEntry[]
}

export interface CompactionResult {
    messages: CompactableMessage[]
    compactedStages: string[]
    strippedChitchatCount: number
    llmSummarized: boolean
    resolvedAtPriority: "P1" | "P2" | "P3" | "P4" | "none"
}

interface CompactionConfig {
    contextWindow: number
    compactionThreshold: number
    isPaperMode: boolean
    paperSession?: PaperSessionContext | null
    getModel?: () => Promise<unknown>
}

// ════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════

const CHARS_PER_TOKEN = 4
const CHITCHAT_MAX_LENGTH = 50
const CHITCHAT_SHORT_LENGTH = 15
const P3_GENERAL_CHAT_OLDEST_COUNT = 20

// ════════════════════════════════════════════════════════════════
// P1: Strip Chitchat
// ════════════════════════════════════════════════════════════════

function isChitchat(msg: CompactableMessage): boolean {
    if (msg.role !== "user") return false
    if (msg.content.length > CHITCHAT_MAX_LENGTH) return false
    const text = msg.content.trim().toLowerCase()
    return text.length < CHITCHAT_SHORT_LENGTH && !text.includes("?") && !text.includes("!")
}

export function stripChitchat(messages: CompactableMessage[]): CompactableMessage[] {
    return messages.filter(msg => !isChitchat(msg))
}

// ════════════════════════════════════════════════════════════════
// P2/P4: Compact Completed Stages
// ════════════════════════════════════════════════════════════════

function excludeStageMessages(
    messages: CompactableMessage[],
    boundary: StageMessageBoundary,
    messageIdExtractor: (msg: CompactableMessage) => string | undefined
): CompactableMessage[] {
    const firstId = boundary.firstMessageId
    const lastId = boundary.lastMessageId

    let inRange = false
    let passedRange = false

    return messages.filter(msg => {
        if (msg.role === "system") return true

        const msgId = messageIdExtractor(msg)

        if (msgId === firstId) inRange = true
        // Messages without ID within range are also excluded (e.g. tool calls)
        if (inRange && !passedRange) {
            if (msgId === lastId) {
                passedRange = true
                inRange = false
            }
            return false
        }
        return true
    })
}

function buildStageDigestMessage(
    digest: PaperMemoryEntry[],
    compactedStages: string[]
): CompactableMessage | null {
    if (compactedStages.length === 0) return null

    const entries = digest
        .filter(d => !d.superseded && compactedStages.includes(d.stage))
        .map(d => `- ${getStageLabel(d.stage as PaperStageId)}: ${d.decision}`)
        .join("\n")

    if (!entries) return null

    return {
        role: "system",
        content: `[CONTEXT COMPACTION: ${compactedStages.length} tahap sebelumnya di-compact]\n${entries}\n\nDetail tersimpan di stageData. Pesan asli tetap ada di database.`,
    }
}

// ════════════════════════════════════════════════════════════════
// P3: LLM Summarize
// ════════════════════════════════════════════════════════════════

async function llmSummarize(
    messages: CompactableMessage[],
    prompt: string,
    getModel: () => Promise<unknown>
): Promise<string | null> {
    try {
        const conversationText = messages
            .map(m => `[${m.role}]: ${m.content}`)
            .join("\n")

        const model = await getModel()

        const result = await generateText({
            model: model as Parameters<typeof generateText>[0]["model"],
            system: prompt,
            prompt: conversationText,
        })

        return result.text || null
    } catch (error) {
        console.error("[Context Compaction] P3 LLM summarization failed:", error)
        return null
    }
}

// ════════════════════════════════════════════════════════════════
// Utility
// ════════════════════════════════════════════════════════════════

function estimateTokens(messages: CompactableMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => {
        return sum + (typeof msg.content === "string" ? msg.content.length : 0)
    }, 0)
    return Math.ceil(totalChars / CHARS_PER_TOKEN)
}

function isUnderThreshold(messages: CompactableMessage[], threshold: number): boolean {
    return estimateTokens(messages) < threshold
}

// ════════════════════════════════════════════════════════════════
// Main: runCompactionChain
// ════════════════════════════════════════════════════════════════

export async function runCompactionChain(
    messages: CompactableMessage[],
    config: CompactionConfig,
    messageIdExtractor: (msg: CompactableMessage) => string | undefined = () => undefined
): Promise<CompactionResult> {
    const result: CompactionResult = {
        messages: [...messages],
        compactedStages: [],
        strippedChitchatCount: 0,
        llmSummarized: false,
        resolvedAtPriority: "none",
    }

    const threshold = config.compactionThreshold

    if (isUnderThreshold(result.messages, threshold)) {
        return result
    }

    console.info(
        `[Context Compaction] Triggered: ${estimateTokens(result.messages)} tokens > ${threshold} threshold`
    )

    // ── P1: Strip Chitchat ──
    const beforeP1 = result.messages.length
    result.messages = stripChitchat(result.messages)
    result.strippedChitchatCount = beforeP1 - result.messages.length

    if (result.strippedChitchatCount > 0) {
        console.info(
            `[Context Compaction] P1: Stripped ${result.strippedChitchatCount} chitchat messages → ${estimateTokens(result.messages)} tokens`
        )
    }

    if (isUnderThreshold(result.messages, threshold)) {
        result.resolvedAtPriority = "P1"
        console.info("[Context Compaction] Complete: resolved at P1")
        return result
    }

    // ── P2: Compact Oldest Completed Stages (Paper Only) ──
    if (config.isPaperMode && config.paperSession?.stageMessageBoundaries) {
        const boundaries = config.paperSession.stageMessageBoundaries
        const digest = config.paperSession.paperMemoryDigest || []

        for (const boundary of boundaries) {
            result.messages = excludeStageMessages(result.messages, boundary, messageIdExtractor)
            result.compactedStages.push(boundary.stage)

            console.info(
                `[Context Compaction] P2: Compacted stage ${boundary.stage} (${boundary.messageCount} msgs) → ${estimateTokens(result.messages)} tokens`
            )

            if (isUnderThreshold(result.messages, threshold)) {
                const digestMsg = buildStageDigestMessage(digest, result.compactedStages)
                if (digestMsg) {
                    const systemCount = result.messages.filter(m => m.role === "system").length
                    result.messages.splice(systemCount, 0, digestMsg)
                }
                result.resolvedAtPriority = "P2"
                console.info(`[Context Compaction] Complete: resolved at P2 (${result.compactedStages.length} stages compacted)`)
                return result
            }
        }

        const digestMsg = buildStageDigestMessage(digest, result.compactedStages)
        if (digestMsg) {
            const systemCount = result.messages.filter(m => m.role === "system").length
            result.messages.splice(systemCount, 0, digestMsg)
        }
    }

    // ── P3: LLM Summarize ──
    if (config.getModel) {
        const conversationMessages = result.messages.filter(m => m.role !== "system")
        const systemMessages = result.messages.filter(m => m.role === "system")

        const summarizeCount = config.isPaperMode
            ? Math.min(Math.floor(conversationMessages.length * 0.3), 30)
            : Math.min(P3_GENERAL_CHAT_OLDEST_COUNT, Math.floor(conversationMessages.length * 0.4))

        if (summarizeCount > 2) {
            const toSummarize = conversationMessages.slice(0, summarizeCount)
            const toKeep = conversationMessages.slice(summarizeCount)

            const prompt = config.isPaperMode
                ? getPaperMidStageSummaryPrompt(
                    getStageLabel(config.paperSession?.currentStage as PaperStageId) || "unknown"
                )
                : getGeneralChatSummaryPrompt()

            const summary = await llmSummarize(toSummarize, prompt, config.getModel)

            if (summary) {
                const summaryMsg: CompactableMessage = {
                    role: "system",
                    content: `[RINGKASAN DISKUSI SEBELUMNYA]\n${summary}\n\nPercakapan berlanjut dari sini.`,
                }

                result.messages = [...systemMessages, summaryMsg, ...toKeep]
                result.llmSummarized = true

                console.info(
                    `[Context Compaction] P3: Summarized ${summarizeCount} messages via LLM → ${estimateTokens(result.messages)} tokens`
                )

                if (isUnderThreshold(result.messages, threshold)) {
                    result.resolvedAtPriority = "P3"
                    console.info("[Context Compaction] Complete: resolved at P3")
                    return result
                }
            } else {
                console.warn("[Context Compaction] P3: LLM summarization returned null, skipping")
            }
        }
    }

    // ── P4: Signal to shrink formatStageData detail window ──
    if (config.isPaperMode) {
        result.resolvedAtPriority = "P4"
        console.info("[Context Compaction] P4: Signal caller to shrink formatStageData detail window")
        return result
    }

    console.warn("[Context Compaction] Chain exhausted without resolution. P5 (brute prune) will handle.")
    return result
}
