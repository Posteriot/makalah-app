import type { ModelMessage } from "ai"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import { checkContextBudget, getContextWindow } from "@/lib/ai/context-budget"
import { runCompactionChain, type CompactableMessage } from "@/lib/ai/context-compaction"
import type { BudgetStatus } from "./types"

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface PaperSessionContext {
    currentStage: string
    stageMessageBoundaries?: { stage: string; firstMessageId: string; lastMessageId: string; messageCount: number }[]
    paperMemoryDigest?: { stage: string; decision: string; timestamp: number; superseded?: boolean }[]
}

// ────────────────────────────────────────────────────────────────
// Private helpers
// ────────────────────────────────────────────────────────────────

function estimateModelMessageChars(msgs: Array<{ role: string; content: string | unknown }>): number {
    return msgs.reduce((total, msg) => {
        if (typeof msg.content === "string") {
            return total + msg.content.length
        }
        return total
    }, 0)
}

// ────────────────────────────────────────────────────────────────
// applyContextBudget
// ────────────────────────────────────────────────────────────────

export async function applyContextBudget(params: {
    messages: ModelMessage[]
    contextWindow: number
    isPaperMode: boolean
    paperStageScope: PaperStageId | undefined
    paperSession?: PaperSessionContext | null
    getModel?: () => Promise<unknown>
}): Promise<{
    messages: ModelMessage[]
    budgetStatus: BudgetStatus
}> {
    const { messages, contextWindow, isPaperMode, paperSession, getModel } = params
    const result = [...messages]

    // ── Estimate token usage ──
    const totalChars = estimateModelMessageChars(result)
    const budget = checkContextBudget(totalChars, contextWindow)

    const usagePercent = Math.round((budget.totalTokens / budget.threshold) * 100)
    console.info(
        `[Context Budget] ${budget.totalTokens.toLocaleString()} tokens estimated (${usagePercent}% of ${budget.threshold.toLocaleString()} threshold) | ${result.length} messages | window: ${contextWindow.toLocaleString()}`
    )

    // ── Compaction chain (threshold-based priority chain, runs BEFORE brute prune) ──
    let effectiveBudget = budget
    let resolvedAtPriority: string | null = null
    let didCompact = false

    if (budget.shouldCompact) {
        const compactionResult = await runCompactionChain(
            result as CompactableMessage[],
            {
                contextWindow,
                compactionThreshold: budget.compactionThreshold,
                isPaperMode,
                paperSession: paperSession ? {
                    currentStage: paperSession.currentStage,
                    stageMessageBoundaries: paperSession.stageMessageBoundaries,
                    paperMemoryDigest: paperSession.paperMemoryDigest,
                } : null,
                getModel: getModel ? async () => getModel() : undefined,
            },
            (msg) => (msg as { id?: string }).id || undefined,
        )

        result.length = 0
        result.push(...compactionResult.messages as ModelMessage[])
        resolvedAtPriority = compactionResult.resolvedAtPriority
        didCompact = true

        // Re-estimate after compaction
        const postCompactionChars = estimateModelMessageChars(result)
        effectiveBudget = checkContextBudget(postCompactionChars, contextWindow)
        console.info(
            `[Context Compaction] Post-compaction: ${effectiveBudget.totalTokens.toLocaleString()} tokens (${Math.round((effectiveBudget.totalTokens / effectiveBudget.compactionThreshold) * 100)}% of compaction threshold) | resolved at ${compactionResult.resolvedAtPriority}`
        )
    }

    // ── Brute prune safety net ──
    let didPrune = false
    if (effectiveBudget.shouldPrune) {
        console.warn(
            `[Context Budget] Pruning: ${effectiveBudget.totalTokens} tokens > ${effectiveBudget.threshold} threshold. Messages: ${result.length}`
        )
        const systemMessages = result.filter(m => m.role === "system")
        const conversationMessages = result.filter(m => m.role !== "system")
        const keepLastN = 50
        const prunedConversation = conversationMessages.length > keepLastN
            ? conversationMessages.slice(-keepLastN)
            : conversationMessages
        result.length = 0
        result.push(...systemMessages, ...prunedConversation)
        didPrune = true
    }

    // ── Budget warning ──
    if (effectiveBudget.shouldWarn && !effectiveBudget.shouldPrune) {
        console.info(
            `[Context Budget] Warning: ${effectiveBudget.totalTokens} tokens approaching threshold ${effectiveBudget.threshold}.`
        )
    }

    return {
        messages: result,
        budgetStatus: {
            totalChars: estimateModelMessageChars(result),
            contextWindow,
            didCompact,
            resolvedAtPriority,
            didPrune,
        },
    }
}
