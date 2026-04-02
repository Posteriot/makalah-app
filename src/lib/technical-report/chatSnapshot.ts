import { sanitizeToolStates, type ToolStateSnapshot } from "./payload"

type ReasoningStepSnapshot = {
  label?: string
  status?: string
  meta?: {
    toolName?: string
  }
}

type ExtractChatDiagnosticSnapshotInput = {
  chatStatus?: string
  errorMessage?: string
  model?: string
  searchStatus?: string
  reasoningSteps?: ReasoningStepSnapshot[]
}

type ShouldShowTechnicalReportTriggerInput = {
  chatStatus?: string
  searchStatus?: string
  toolStates?: ToolStateSnapshot[]
}

export type ChatDiagnosticSnapshot = {
  chatStatus?: string
  errorMessage?: string
  model?: string
  searchStatus?: string
  toolStates?: ToolStateSnapshot[]
}

function normalizeToolNameFromLabel(label?: string): string | undefined {
  if (!label) return undefined
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .slice(0, 80)
}

export function extractChatDiagnosticSnapshot(
  input: ExtractChatDiagnosticSnapshotInput
): ChatDiagnosticSnapshot {
  const toolStates = extractToolStatesFromReasoning(input.reasoningSteps, input.errorMessage)
  const snapshot: ChatDiagnosticSnapshot = {}

  if (input.chatStatus) snapshot.chatStatus = input.chatStatus
  if (input.errorMessage) snapshot.errorMessage = input.errorMessage
  if (input.model) snapshot.model = input.model
  if (input.searchStatus) snapshot.searchStatus = input.searchStatus
  if (toolStates.length > 0) snapshot.toolStates = toolStates

  return snapshot
}

export function extractToolStatesFromReasoning(
  reasoningSteps: ReasoningStepSnapshot[] = [],
  errorMessage?: string
): ToolStateSnapshot[] {
  const rawToolStates = reasoningSteps
    .filter((step) => typeof step?.status === "string")
    .map((step) => ({
      toolName: step?.meta?.toolName ?? normalizeToolNameFromLabel(step?.label) ?? "unknown_tool",
      state: step?.status ?? "unknown",
      ...(step?.status === "error" ? { errorText: errorMessage ?? "Tool failure detected" } : {}),
    }))

  return sanitizeToolStates(rawToolStates)
}

export function shouldShowTechnicalReportTrigger(
  input: ShouldShowTechnicalReportTriggerInput
): boolean {
  // Chat recovered — don't show banner for historical errors
  if (input.chatStatus === "ready" || input.chatStatus === "streaming" || input.chatStatus === "submitted") return false
  if (input.chatStatus === "error") return true
  if (input.searchStatus === "error") return true
  return (input.toolStates ?? []).some((tool) => {
    const state = tool.state.toLowerCase()
    return state === "error" || state === "output-error"
  })
}
