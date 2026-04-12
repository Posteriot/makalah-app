import type { WorkflowAction } from "../json-render/choice-payload"
import type { PaperStageId } from "../../../convex/paperSessions/constants"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowClass =
  | "discussion_choice"
  | "choice_finalize"
  | "direct_finalize"
  | "compile_finalize"
  | "special_finalize"

export type ToolStrategy =
  | "none"
  | "update_create_submit"
  | "compile_create_submit"
  | "special_executor"

export type ProsePolicy =
  | "discussion_only"
  | "short_confirmation"
  | "artifact_first"

export type FallbackPolicy =
  | "no_rescue"
  | "deterministic_rescue"

export type ContractVersion = "v2" | "legacy"

export interface ResolvedChoiceWorkflow {
  action: WorkflowAction
  workflowClass: WorkflowClass
  toolStrategy: ToolStrategy
  prosePolicy: ProsePolicy
  fallbackPolicy: FallbackPolicy
  reason: string
  contractVersion: ContractVersion
}

export interface ResolveChoiceWorkflowInput {
  stage: PaperStageId | string
  workflowAction?: WorkflowAction
  decisionMode?: "exploration" | "commit"
  stageData?: Record<string, unknown> | null
  hasExistingArtifact?: boolean
  stageStatus?: string
}

// ---------------------------------------------------------------------------
// Stage Registry
// ---------------------------------------------------------------------------

interface StageWorkflowEntry {
  workflowClass: WorkflowClass
  defaultAction: WorkflowAction
  toolStrategy: ToolStrategy
  prosePolicy: ProsePolicy
  fallbackPolicy: FallbackPolicy
}

const STAGE_REGISTRY: Record<string, StageWorkflowEntry> = {
  gagasan: {
    workflowClass: "discussion_choice",
    defaultAction: "continue_discussion",
    toolStrategy: "none",
    prosePolicy: "discussion_only",
    fallbackPolicy: "no_rescue",
  },
  topik: {
    workflowClass: "choice_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  outline: {
    workflowClass: "choice_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  abstrak: {
    workflowClass: "choice_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  pendahuluan: {
    workflowClass: "choice_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  tinjauan_literatur: {
    workflowClass: "choice_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  metodologi: {
    workflowClass: "choice_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  hasil: {
    workflowClass: "special_finalize",
    defaultAction: "special_finalize",
    toolStrategy: "special_executor",
    prosePolicy: "artifact_first",
    fallbackPolicy: "deterministic_rescue",
  },
  diskusi: {
    workflowClass: "direct_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  kesimpulan: {
    workflowClass: "direct_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  pembaruan_abstrak: {
    workflowClass: "direct_finalize",
    defaultAction: "finalize_stage",
    toolStrategy: "update_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  daftar_pustaka: {
    workflowClass: "compile_finalize",
    defaultAction: "compile_then_finalize",
    toolStrategy: "compile_create_submit",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "no_rescue",
  },
  lampiran: {
    workflowClass: "special_finalize",
    defaultAction: "special_finalize",
    toolStrategy: "special_executor",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "deterministic_rescue",
  },
  judul: {
    workflowClass: "special_finalize",
    defaultAction: "special_finalize",
    toolStrategy: "special_executor",
    prosePolicy: "short_confirmation",
    fallbackPolicy: "deterministic_rescue",
  },
}

// ---------------------------------------------------------------------------
// Legacy bridge: maps old decisionMode to workflowAction
// ---------------------------------------------------------------------------

// Maturity keys for gagasan (same as existing shouldFinalizeAfterChoice)
const GAGASAN_MATURITY_KEYS = ["angle", "analisis"]

function resolveLegacyPath(input: ResolveChoiceWorkflowInput): ResolvedChoiceWorkflow {
  const entry = STAGE_REGISTRY[input.stage]

  // If no registry entry, default to discussion
  if (!entry) {
    return {
      action: "continue_discussion",
      workflowClass: "discussion_choice",
      toolStrategy: "none",
      prosePolicy: "discussion_only",
      fallbackPolicy: "no_rescue",
      reason: "unknown_stage_fallback",
      contractVersion: "legacy",
    }
  }

  // Legacy decisionMode takes precedence when present
  if (input.decisionMode === "commit") {
    // Special: daftar_pustaka always gets compile path regardless
    if (input.stage === "daftar_pustaka") {
      return {
        action: "compile_then_finalize",
        workflowClass: "compile_finalize",
        toolStrategy: "compile_create_submit",
        prosePolicy: "short_confirmation",
        fallbackPolicy: "no_rescue",
        reason: "legacy_daftar_pustaka_compile",
        contractVersion: "legacy",
      }
    }
    return {
      ...buildFromEntry(entry),
      action: entry.workflowClass === "discussion_choice" ? "finalize_stage" : entry.defaultAction,
      reason: "legacy_decision_mode_commit",
      contractVersion: "legacy",
    }
  }

  if (input.decisionMode === "exploration") {
    return {
      action: "continue_discussion",
      workflowClass: "discussion_choice",
      toolStrategy: "none",
      prosePolicy: "discussion_only",
      fallbackPolicy: "no_rescue",
      reason: "legacy_decision_mode_exploration",
      contractVersion: "legacy",
    }
  }

  // No decisionMode — use stage maturity heuristics (gagasan) or default
  if (input.stage === "gagasan" && input.stageData) {
    const hasAllKeys = GAGASAN_MATURITY_KEYS.every(key => {
      const val = (input.stageData as Record<string, unknown>)[key]
      return val !== undefined && val !== null && val !== ""
    })
    if (hasAllKeys) {
      return {
        action: "finalize_stage",
        workflowClass: "choice_finalize",
        toolStrategy: "update_create_submit",
        prosePolicy: "short_confirmation",
        fallbackPolicy: "no_rescue",
        reason: "legacy_gagasan_mature",
        contractVersion: "legacy",
      }
    }
  }

  // Artifact exists suggests past exploration
  if (input.hasExistingArtifact && entry.workflowClass === "discussion_choice") {
    return {
      action: "finalize_stage",
      workflowClass: "choice_finalize",
      toolStrategy: "update_create_submit",
      prosePolicy: "short_confirmation",
      fallbackPolicy: "no_rescue",
      reason: "legacy_artifact_exists",
      contractVersion: "legacy",
    }
  }

  // Default: use registry entry defaults
  return {
    ...buildFromEntry(entry),
    reason: "legacy_registry_default",
    contractVersion: "legacy",
  }
}

function buildFromEntry(entry: StageWorkflowEntry): Omit<ResolvedChoiceWorkflow, "reason" | "contractVersion"> {
  return {
    action: entry.defaultAction,
    workflowClass: entry.workflowClass,
    toolStrategy: entry.toolStrategy,
    prosePolicy: entry.prosePolicy,
    fallbackPolicy: entry.fallbackPolicy,
  }
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Rescue decision helper
// ---------------------------------------------------------------------------

export function shouldAttemptRescue(params: {
  resolvedWorkflow: ResolvedChoiceWorkflow
  paperToolTracker: {
    sawCreateArtifactSuccess: boolean
    sawUpdateArtifactSuccess: boolean
    sawSubmitValidationSuccess: boolean
    sawUpdateStageData: boolean
  }
}): { shouldRescue: boolean; reason: string } {
  // Only rescue for stages with deterministic_rescue fallback policy
  if (params.resolvedWorkflow.fallbackPolicy !== "deterministic_rescue") {
    return { shouldRescue: false, reason: "no_rescue_policy" }
  }

  // Only rescue if the action was supposed to finalize
  if (params.resolvedWorkflow.action === "continue_discussion") {
    return { shouldRescue: false, reason: "discussion_turn" }
  }

  // Check if tool chain completed successfully
  const hasArtifactSuccess = params.paperToolTracker.sawCreateArtifactSuccess || params.paperToolTracker.sawUpdateArtifactSuccess
  const hasSubmitSuccess = params.paperToolTracker.sawSubmitValidationSuccess

  // If everything completed, no rescue needed
  if (hasArtifactSuccess && hasSubmitSuccess) {
    return { shouldRescue: false, reason: "tool_chain_complete" }
  }

  // Rescue needed: model was supposed to finalize but didn't complete
  return { shouldRescue: true, reason: "incomplete_finalize_tool_chain" }
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

export function resolveChoiceWorkflow(input: ResolveChoiceWorkflowInput): ResolvedChoiceWorkflow {
  // Priority 1: workflowAction from new contract
  if (input.workflowAction) {
    const entry = STAGE_REGISTRY[input.stage]
    if (!entry) {
      return {
        action: input.workflowAction,
        workflowClass: "discussion_choice",
        toolStrategy: "none",
        prosePolicy: "discussion_only",
        fallbackPolicy: "no_rescue",
        reason: `workflow_action_${input.workflowAction}`,
        contractVersion: "v2",
      }
    }

    // workflowAction determines the action, but registry enriches the metadata
    const isDiscussion = input.workflowAction === "continue_discussion"
    return {
      action: input.workflowAction,
      workflowClass: isDiscussion ? "discussion_choice" : entry.workflowClass,
      toolStrategy: isDiscussion ? "none" : entry.toolStrategy,
      prosePolicy: isDiscussion ? "discussion_only" : entry.prosePolicy,
      fallbackPolicy: isDiscussion ? "no_rescue" : entry.fallbackPolicy,
      reason: `workflow_action_${input.workflowAction}`,
      contractVersion: "v2",
    }
  }

  // Priority 2: Legacy bridge
  return resolveLegacyPath(input)
}
