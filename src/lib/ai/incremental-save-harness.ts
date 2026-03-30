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
  activeTools: string[]
} | undefined

export type IncrementalSaveConfig = {
  prepareStep: (opts: { stepNumber: number }) => PrepareStepResult
  maxToolSteps: number
  systemNote: string
  targetField: string
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

  if (pendingTasks.length === 0) return undefined

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
          // Keep all tools visible so model retains paper workflow context
          // (yaml-spec generation depends on seeing available tools).
          // toolChoice: "none" prevents actual calls.
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
