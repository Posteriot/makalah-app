import type { ModelMessage, LanguageModel } from "ai"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { SearchExecutionMode } from "@/lib/ai/web-search"
import type { ExactSourceFollowupResolution, ExactSourceSummary } from "@/lib/ai/exact-source-followup"
import type { ConvexFetchQuery, ConvexFetchMutation } from "../types"

// ────────────────────────────────────────────────────────────────
// Instruction Stack
// ────────────────────────────────────────────────────────────────

/** One item in the system instruction stacking order. */
export interface InstructionStackEntry {
    role: "system"
    content: string
    /** Trace label for inspectability: "base-prompt", "paper-mode", "file-context", etc. */
    source: string
}

/** The resolved instruction stack: system entries + conversation messages. */
export interface ResolvedInstructionStack {
    entries: InstructionStackEntry[]
    conversationMessages: ModelMessage[]
}

// ────────────────────────────────────────────────────────────────
// Budget
// ────────────────────────────────────────────────────────────────

export interface BudgetStatus {
    totalChars: number
    contextWindow: number
    didCompact: boolean
    resolvedAtPriority: string | null
    didPrune: boolean
}

// ────────────────────────────────────────────────────────────────
// Search Decision
// ────────────────────────────────────────────────────────────────

export interface SearchDecision {
    enableWebSearch: boolean
    executionMode: SearchExecutionMode
    intentType: string
    confidence: number
    reason: string
}

// ────────────────────────────────────────────────────────────────
// Exact Source Routing
// ────────────────────────────────────────────────────────────────

export interface ExactSourceRoutingResult {
    mode: "force-inspect" | "clarify" | "none"
    matchedSourceId: string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepareStep: any | undefined
}

// ────────────────────────────────────────────────────────────────
// Skill Telemetry
// ────────────────────────────────────────────────────────────────

export interface SkillTelemetryContext {
    skillInstructions: string
    stageSearchPolicy: string
    hasRecentSourcesInDb: boolean
}

// ────────────────────────────────────────────────────────────────
// Sources
// ────────────────────────────────────────────────────────────────

export interface RecentSource {
    url: string
    title: string
    publishedAt?: number
}

// ────────────────────────────────────────────────────────────────
// Resolved Step Context (final output of context assembly)
// ────────────────────────────────────────────────────────────────

/** Full assembled context for one execution step, produced by assembleStepContext. */
export interface ResolvedStepContext {
    messages: ModelMessage[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolChoice: any
    maxSteps: number
    samplingOptions: Record<string, unknown>
    providerOptions: Record<string, unknown> | undefined
    budgetStatus: BudgetStatus
    searchDecision: SearchDecision
    exactSourceRouting: ExactSourceRoutingResult
    skillTelemetryContext: SkillTelemetryContext
    // Model + config resolved during context assembly (dynamic imports)
    model: LanguageModel
    modelNames: {
        primary: { model: string; provider: string }
        fallback: { model: string; provider: string }
    }
    reasoningSettings: Record<string, unknown>
    webSearchConfig: Record<string, unknown>
    // Data needed by downstream phases
    recentSourcesList: RecentSource[]
    hasRecentSourcesInDb: boolean
    availableExactSources: ExactSourceSummary[]
    normalizedLastUserContent: string
    // Exact source resolution for executor/policy
    exactSourceResolution: ExactSourceFollowupResolution
    // Search-related overrides
    forcedSyncPrepareStep: unknown
    forcedToolChoice: unknown
    missingArtifactNote: string | undefined
}
