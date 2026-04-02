import { deriveTaskList } from "@/lib/paper/task-derivation"
import type { PaperStageId } from "../../../convex/paperSessions/constants"
import { isDraftSaveSupportedStage } from "./draft-save-fields"

/**
 * Fields auto-persisted server-side (appendSearchReferences).
 * Harness skips these — they don't need model cooperation.
 */
const AUTO_PERSIST_FIELDS: Record<string, string[]> = {
  gagasan: ["referensiAwal"],
  topik: ["referensiPendukung"],
}

type PrepareStepResult = {
  toolChoice: { type: "tool"; toolName: string } | "none"
  activeTools?: string[]
} | undefined

export type IncrementalSaveConfig = {
  prepareStep: (opts: { stepNumber: number }) => PrepareStepResult
  maxToolSteps: number
  systemNote: string
  targetField: string
}

export function buildValidationSubmitPrepareStep(opts: {
  hasRingkasan: boolean
  hasArtifact: boolean
}): IncrementalSaveConfig {
  const forcedSteps = [
    ...(opts.hasRingkasan ? [] : ["updateStageData"]),
    ...(opts.hasArtifact ? [] : ["createArtifact"]),
    "submitStageForValidation",
  ] as const

  return {
    targetField: "_validationSubmit",
    maxToolSteps: forcedSteps.length + 1,
    systemNote: buildValidationSubmitNote({
      hasRingkasan: opts.hasRingkasan,
      hasArtifact: opts.hasArtifact,
    }),
    prepareStep: ({ stepNumber }) => {
      const toolName = forcedSteps[stepNumber]
      if (toolName) {
        return {
          toolChoice: { type: "tool", toolName } as const,
          activeTools: [toolName],
        }
      }

      if (stepNumber === forcedSteps.length) {
        return {
          toolChoice: "none" as const,
        }
      }

      return undefined
    },
  }
}

export function buildIncrementalSavePrepareStep(opts: {
  currentStage: string
  stageData: Record<string, unknown>
  stageStatus: string
  enableWebSearch: boolean
}): IncrementalSaveConfig | undefined {
  if (opts.enableWebSearch) return undefined
  if (opts.stageStatus !== "drafting") return undefined
  if (!isDraftSaveSupportedStage(opts.currentStage)) return undefined

  const stageId = opts.currentStage
  // deriveTaskList expects stageData nested under stageId key
  const taskSummary = deriveTaskList(stageId as PaperStageId, { [stageId]: opts.stageData })
  if (!taskSummary || taskSummary.tasks.length === 0) return undefined

  const skipFields = AUTO_PERSIST_FIELDS[stageId] ?? []

  const pendingTasks = taskSummary.tasks.filter(
    (t) => t.status === "pending" && !skipFields.includes(t.field)
  )

  // All draft fields complete → check if mature save (ringkasan + artifact) still needed
  if (pendingTasks.length === 0) {
    const hasRingkasan = typeof opts.stageData.ringkasan === "string"
      && opts.stageData.ringkasan.trim().length > 0
    if (hasRingkasan) return undefined // Fully done, nothing to enforce

    // All fields saved but no ringkasan yet → force mature save
    console.log(`[AutoPresent] MATURE_SAVE triggered — stage=${opts.currentStage}, pendingFields=0, hasRingkasan=false`)
    return {
      targetField: "_matureSave",
      maxToolSteps: 4,
      systemNote: buildMatureSaveNote(),
      prepareStep: ({ stepNumber }) => {
        const stepNames = ["updateStageData", "createArtifact", "submitStageForValidation", "text-response"]
        console.log(`[AutoPresent] prepareStep step=${stepNumber}, forcing=${stepNames[stepNumber] ?? "undefined"}`)
        // step 0: force updateStageData (ringkasan)
        if (stepNumber === 0) {
          return {
            toolChoice: { type: "tool", toolName: "updateStageData" } as const,
            activeTools: ["updateStageData"],
          }
        }
        // step 1: force createArtifact
        if (stepNumber === 1) {
          return {
            toolChoice: { type: "tool", toolName: "createArtifact" } as const,
            activeTools: ["createArtifact"],
          }
        }
        // step 2: force submitStageForValidation
        if (stepNumber === 2) {
          return {
            toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const,
            activeTools: ["submitStageForValidation"],
          }
        }
        // step 3: text response
        if (stepNumber === 3) {
          return {
            toolChoice: "none" as const,
          }
        }
        return undefined
      },
    }
  }

  const targetTask = pendingTasks[0]

  return {
    targetField: targetTask.field,
    maxToolSteps: 2,
    systemNote: buildIncrementalNote(targetTask.field, targetTask.label),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) {
        return {
          toolChoice: { type: "tool", toolName: "saveStageDraft" } as const,
          activeTools: ["saveStageDraft"],
        }
      }
      if (stepNumber === 1) {
        return {
          toolChoice: "none" as const,
        }
      }
      return undefined
    },
  }
}

function buildIncrementalNote(field: string, label: string): string {
  return `
══════════════════════════════════════════════════════════════
MODE: INCREMENTAL_SAVE | Field: ${field}
STEP 1: Call saveStageDraft to save "${field}" (${label}).
  Base it on the discussion and references so far.
  If discussion hasn't covered this yet, provide your best draft
  based on available references.
STEP 2: After saving, continue the conversation NATURALLY.
  Follow your normal stage instructions — discuss, recommend,
  and present options using yaml-spec interactive cards as usual.
  Do NOT just summarize what you saved.
══════════════════════════════════════════════════════════════`
}

function buildMatureSaveNote(): string {
  return `
══════════════════════════════════════════════════════════════
MODE: MATURE_SAVE_AND_SUBMIT
All draft fields are complete. Now finalize this stage:
1. Call updateStageData with ringkasan (max 280 chars summarizing the agreed decision)
2. Call createArtifact with the full paper content for this stage (include sources)
3. Call submitStageForValidation to present the approval panel to the user
All three calls MUST happen in this turn, in this order.
══════════════════════════════════════════════════════════════`
}

function buildValidationSubmitNote(opts: {
  hasRingkasan: boolean
  hasArtifact: boolean
}): string {
  return `
══════════════════════════════════════════════════════════════
MODE: VALIDATION_SUBMIT_FLOW
User explicitly confirmed the current direction and wants to proceed.
You MUST finish the current stage in THIS turn. Do NOT say "I will save",
"I will create", "I will submit", or any future-tense promise.
${opts.hasRingkasan
    ? "- Ringkasan already exists in stageData."
    : '- First call updateStageData with ringkasan and any missing stage fields needed to finalize this stage.'}
${opts.hasArtifact
    ? "- Artifact already exists for this stage."
    : "- Then call createArtifact for the finalized stage output."}
- Then call submitStageForValidation.
- After tool calls finish, reply briefly in present/past tense only:
  confirm the draft has been prepared/submitted. Do not promise future actions.
══════════════════════════════════════════════════════════════`
}
