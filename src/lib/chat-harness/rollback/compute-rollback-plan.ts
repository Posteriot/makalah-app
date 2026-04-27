import { STAGE_ORDER, type PaperStageId, getStageLabel } from "../../../../convex/paperSessions/constants"

// Minimum rollback target — gagasan is foundational, changing it = start new chat
const MINIMUM_ROLLBACK_TARGET: PaperStageId = "topik"

export interface RollbackPlan {
  valid: true
  targetStage: PaperStageId
  currentStage: PaperStageId
  /** Stages that will be wiped (in execution order: most recent first) */
  stagesToWipe: PaperStageId[]
  /** Number of stages to rewind (used by rewindToStage) */
  unapproveCount: number
  /** Human-readable description of what will happen */
  description: string
  /** Human-readable list of consequences */
  consequences: string[]
}

export interface RollbackRejection {
  valid: false
  reason: string
}

export type RollbackPlanResult = RollbackPlan | RollbackRejection

/**
 * Compute a rollback plan from currentStage to targetStage.
 *
 * Pure function — no side effects, no DB access.
 * Validates feasibility and computes the exact sequence of unapprove calls needed.
 */
export function computeRollbackPlan(
  currentStage: PaperStageId | "completed",
  targetStage: string,
): RollbackPlanResult {
  // --- Validate targetStage is a known stage ---
  if (!STAGE_ORDER.includes(targetStage as PaperStageId)) {
    return { valid: false, reason: `Unknown stage: "${targetStage}". Valid stages: ${STAGE_ORDER.join(", ")}` }
  }
  const target = targetStage as PaperStageId

  // --- Validate currentStage ---
  const currentIdx = currentStage === "completed"
    ? STAGE_ORDER.length
    : STAGE_ORDER.indexOf(currentStage)
  if (currentIdx === -1) {
    return { valid: false, reason: `Unknown current stage: "${currentStage}"` }
  }

  const targetIdx = STAGE_ORDER.indexOf(target)

  // --- Cannot rollback forward or to same stage ---
  if (targetIdx >= currentIdx) {
    return { valid: false, reason: `Cannot rollback: target "${target}" is not before current "${currentStage}"` }
  }

  // --- Cannot rollback to gagasan (minimum is topik) ---
  const minIdx = STAGE_ORDER.indexOf(MINIMUM_ROLLBACK_TARGET)
  if (targetIdx < minIdx) {
    return { valid: false, reason: `Cannot rollback to "${target}". Minimum rollback target is "${MINIMUM_ROLLBACK_TARGET}". To change gagasan, start a new chat.` }
  }

  // --- Compute stages to wipe ---
  // rewindToStage handles multi-stage rewind atomically.
  // From currentStage, we unapprove until we reach the stage AFTER targetStage,
  // then cancelChoiceDecision on targetStage.
  //
  // Example: currentStage=metodologi, targetStage=pendahuluan
  //   unapprove 1: metodologi → tinjauan_literatur (wipe metodologi)
  //   unapprove 2: tinjauan_literatur → pendahuluan (wipe tinjauan_literatur)
  //   cancel in pendahuluan (reset for re-work)
  //
  // stagesToWipe = [metodologi, tinjauan_literatur] (most recent first)

  const stagesToWipe: PaperStageId[] = []
  const effectiveCurrentIdx = currentStage === "completed"
    ? STAGE_ORDER.length - 1
    : currentIdx

  for (let i = effectiveCurrentIdx; i > targetIdx; i--) {
    if (i < STAGE_ORDER.length) {
      stagesToWipe.push(STAGE_ORDER[i])
    }
  }

  const unapproveCount = stagesToWipe.length

  // --- Build description ---
  const wipeLabels = stagesToWipe.map(s => getStageLabel(s))
  const description = `Rollback dari ${getStageLabel(currentStage === "completed" ? STAGE_ORDER[STAGE_ORDER.length - 1] : currentStage)} ke ${getStageLabel(target)}`

  const consequences = [
    `${unapproveCount} stage akan di-reset: ${wipeLabels.join(", ")}`,
    `Semua artifact dan data di stage tersebut akan dihapus`,
    `Stage "${getStageLabel(target)}" akan kembali ke mode drafting`,
    `Pesan-pesan dari stage yang di-reset akan dihapus dari chat`,
  ]

  return {
    valid: true,
    targetStage: target,
    currentStage: currentStage === "completed" ? STAGE_ORDER[STAGE_ORDER.length - 1] : currentStage,
    stagesToWipe,
    unapproveCount,
    description,
    consequences,
  }
}
