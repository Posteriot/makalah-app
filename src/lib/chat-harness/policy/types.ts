import type { Id } from "../../../../convex/_generated/dataModel"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { ParsedChoiceInteractionEvent } from "@/lib/chat/choice-request"
import type { ResolvedChoiceWorkflow } from "@/lib/chat/choice-request"
import type { PaperToolTracker } from "@/lib/ai/paper-tools"
import type { ExactSourceRoutingResult } from "../context/types"
import type { ConvexFetchQuery, ConvexFetchMutation } from "../types"

// ────────────────────────────────────────────────────────────────
// Enforcer Types
// ────────────────────────────────────────────────────────────────

/** Step params passed to prepareStep functions by the AI SDK. */
export interface EnforcerStepParams {
    steps: Array<{ toolCalls?: Array<{ toolName: string }> }>
    stepNumber: number
}

/** A prepareStep function that returns tool choice overrides or undefined to pass. */
export type PrepareStepFunction = (params: EnforcerStepParams) =>
    | { toolChoice: "required" | { type: "tool"; toolName: string } }
    | undefined

/** Shared state that enforcers read. */
export interface EnforcerContext {
    paperSession: PaperSessionForPolicy | null
    paperStageScope: PaperStageId | undefined
    paperToolTracker: PaperToolTracker
    resolvedWorkflow: ResolvedChoiceWorkflow | undefined
    choiceInteractionEvent: ParsedChoiceInteractionEvent | null
    isCompileThenFinalize: boolean
    shouldEnforceArtifactChain: boolean
    planHasIncompleteTasks: boolean
    /** Mutable ref for step timing. Written by universal reactive enforcer, read by onFinish. */
    stepTimingRef: { current: number }
}

/** Narrow paper session shape for policy scope. */
export interface PaperSessionForPolicy {
    _id: Id<"paperSessions">
    currentStage: string
    stageStatus?: string
    stageData?: unknown
}

// ────────────────────────────────────────────────────────────────
// Runtime Policy Decision
// ────────────────────────────────────────────────────────────────

export type ExecutionBoundary =
    | "normal"
    | "forced-sync"
    | "forced-submit"
    | "exact-source"
    | "revision-chain"

/** The full policy result for one execution step. */
export interface RuntimePolicyDecision {
    prepareStep: PrepareStepFunction | undefined
    forcedToolChoice: unknown
    maxSteps: number
    requiresApproval: boolean
    pauseReason: string | undefined
    allowedToolNames: string[] | undefined
    executionBoundary: ExecutionBoundary
    policyDecisionSummary: string
}

// ────────────────────────────────────────────────────────────────
// Auto-Rescue
// ────────────────────────────────────────────────────────────────

export interface AutoRescueResult {
    rescued: boolean
    refreshedSession: PaperSessionForPolicy | undefined
    error: string | undefined
}
