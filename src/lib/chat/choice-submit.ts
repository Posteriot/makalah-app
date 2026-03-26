import type { PaperStageId } from "../../../convex/paperSessions/constants"

export interface ChoiceInteractionEvent {
  type: "paper.choice.submit"
  version: 1
  conversationId: string
  stage: PaperStageId
  sourceMessageId: string
  choicePartId: string
  kind: "single-select"
  selectedOptionIds: string[]
  customText?: string
  submittedAt: number
}

export function buildChoiceInteractionEvent(params: {
  conversationId: string
  sourceMessageId: string
  choicePartId: string
  stage: PaperStageId
  kind: "single-select"
  selectedOptionId: string
  customText?: string
}): ChoiceInteractionEvent {
  return {
    type: "paper.choice.submit",
    version: 1,
    conversationId: params.conversationId,
    stage: params.stage,
    sourceMessageId: params.sourceMessageId,
    choicePartId: params.choicePartId,
    kind: params.kind,
    selectedOptionIds: [params.selectedOptionId],
    ...(params.customText?.trim()
      ? { customText: params.customText.trim() }
      : {}),
    submittedAt: Date.now(),
  }
}

export function buildChoiceSyntheticText(params: {
  stage: PaperStageId
  selectedOptionId: string
  selectedLabel: string
  customText?: string
}): string {
  const lines = [
    `[Choice: ${params.stage}]`,
    `Pilihan: ${params.selectedLabel}`,
  ]

  if (params.customText?.trim()) {
    lines.push(`Catatan user: ${params.customText.trim()}`)
  }

  return lines.join("\n")
}
