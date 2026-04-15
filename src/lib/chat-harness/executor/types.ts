import type { LanguageModel, ModelMessage, ToolSet } from "ai"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { ParsedChoiceInteractionEvent } from "@/lib/chat/choice-request"
import type { ResolvedChoiceWorkflow } from "@/lib/chat/choice-request"
import type { PlanSpec } from "@/lib/ai/harness/plan-spec"
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"
import type { JsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
import type { ConvexFetchQuery, ConvexFetchMutation, RunLane } from "../types"

// ────────────────────────────────────────────────────────────────
// Step Execution
// ────────────────────────────────────────────────────────────────

/** Input configuration for a single model execution step (streamText call). */
export interface StepExecutionConfig {
    model: LanguageModel
    messages: ModelMessage[]
    tools: ToolSet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prepareStep: any  // AI SDK PrepareStepFunction — typed as any to match route.ts cast pattern
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stopWhen: any     // AI SDK StopCondition
    maxSteps: number
    modelName: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolChoice: any   // AI SDK ToolChoice<ToolSet>
    providerOptions: Record<string, unknown> | undefined
    samplingOptions: Record<string, unknown>
}

/** Summary of a tool call for telemetry/observability. */
export interface ToolCallSummary {
    toolName: string
    args?: unknown
}

/** Output of a completed execution step. */
export interface StepExecutionResult {
    text: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    steps: any[]
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
    providerMetadata: unknown
    finishReason: string
    toolCalls: ToolCallSummary[]
}

// ────────────────────────────────────────────────────────────────
// Stream Pipeline
// ────────────────────────────────────────────────────────────────

/** Configuration for stream transforms applied to the output. */
export interface StreamPipelineConfig {
    reasoningTraceEnabled: boolean
    enablePlanCapture: boolean
    enableYamlRender: boolean
}

// ────────────────────────────────────────────────────────────────
// onFinish Handler
// ────────────────────────────────────────────────────────────────

export interface BillingContext {
    userId: Id<"users">
    quotaWarning: string | undefined
    operationType: string
}

export interface PaperTurnObservability {
    firstLeakageMatch: string | null
    firstLeakageSnippet: string | null
    firstLeakageAtMs: number | null
    createArtifactAtMs: number | null
    updateArtifactAtMs: number | null
}

export type { PaperToolTracker } from "@/lib/ai/paper-tools"
import type { PaperToolTracker } from "@/lib/ai/paper-tools"

export type TitleUpdateFn = (opts: {
    assistantText: string
    minPairsForFinalTitle: number
}) => Promise<void>

/** Normalized data passed to the onFinish handler after streamText completes. */
export interface OnFinishContext {
    text: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    steps: any[]
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
    providerMetadata: unknown
    toolChainOrder: string[]
    modelName: string
}

/** Full configuration for building the onFinish handler (used internally by buildStepStream). */
export interface OnFinishConfig {
    conversationId: Id<"conversations">
    userId: Id<"users">
    modelName: string
    model: LanguageModel | undefined
    requestId: string
    convexToken: string
    billingContext: BillingContext
    paperSession: PaperSessionForExecutor | null
    paperStageScope: PaperStageId | undefined
    paperToolTracker: PaperToolTracker
    paperTurnObservability: PaperTurnObservability
    resolvedWorkflow: ResolvedChoiceWorkflow | undefined
    choiceInteractionEvent: ParsedChoiceInteractionEvent | null
    isCompileThenFinalize: boolean
    normalizedLastUserContent: string
    lane: RunLane
    maybeUpdateTitleFromAI: TitleUpdateFn
    fetchQueryWithToken: ConvexFetchQuery
    fetchMutationWithToken: ConvexFetchMutation
    requestStartedAt: number | undefined
    isDraftingStage: boolean
    isHasilPostChoice: boolean
    buildLeakageSnippet: (text: string, matchIndex: number, matchValue: string) => string
    // Feature flags for primary-only behaviors
    enableGroundingExtraction: boolean
    enableSourceTitleEnrichment: boolean
    enableRevisionClassifier: boolean
    enablePlanSpecFallbackExtraction: boolean
}

/** Narrow paper session type for executor scope. */
export interface PaperSessionForExecutor {
    _id: Id<"paperSessions">
    currentStage: string
    stageStatus?: string
    stageData?: unknown
}

// ────────────────────────────────────────────────────────────────
// saveAssistantMessage
// ────────────────────────────────────────────────────────────────

export interface SaveAssistantMessageParams {
    conversationId: Id<"conversations">
    content: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sources: any[] | undefined
    usedModel: string
    reasoningTrace: PersistedCuratedTraceSnapshot | undefined
    jsonRendererChoice: JsonRendererChoicePayload | undefined
    uiMessageId: string | undefined
    planSnapshot: PlanSpec | undefined
    fetchMutationWithToken: ConvexFetchMutation
}
