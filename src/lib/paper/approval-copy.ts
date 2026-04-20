import {
  getNextStage,
  getStageIdFromLabel,
  getStageLabel,
  type PaperStageId,
} from "../../../convex/paperSessions/constants"

export function buildApprovedStageMessage(stage: PaperStageId): string {
  const currentStageLabel = getStageLabel(stage)
  const nextStage = getNextStage(stage)

  if (nextStage === "completed") {
    return `Tahap ${currentStageLabel} disetujui. Semua tahap selesai.`
  }

  return `Tahap ${currentStageLabel} disetujui. Lanjut ke tahap berikutnya, yakni ${getStageLabel(nextStage)}.`
}

export function buildApprovedStageMessageFromLabel(stageLabel: string): string | null {
  const normalizedLabel = stageLabel.trim()
  if (!normalizedLabel) return null

  const stageId = getStageIdFromLabel(normalizedLabel)
  if (!stageId) return null

  return buildApprovedStageMessage(stageId)
}
