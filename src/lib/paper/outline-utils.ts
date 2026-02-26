import type { OutlineSection } from "./stage-types"

/**
 * Find the root (level-1) stage ID for a given section.
 * Traverses parentId chain until level 1 is reached.
 *
 * @returns The level-1 section ID (matches a stage ID by convention), or null if not found
 */
export function getRootStageId(
  sectionId: string,
  sections: OutlineSection[]
): string | null {
  const sectionMap = new Map(sections.map(s => [s.id, s]))

  let current = sectionMap.get(sectionId)
  if (!current) return null

  while (current.parentId) {
    const parent = sectionMap.get(current.parentId)
    if (!parent) break
    current = parent
  }

  return current.id
}

/**
 * Get all child sections (level 2+) that belong to a specific stage.
 * Excludes the level-1 section itself.
 */
export function getSectionsForStage(
  stageId: string,
  sections: OutlineSection[]
): OutlineSection[] {
  return sections.filter(s => {
    if (!s.parentId) return false
    return getRootStageId(s.id, sections) === stageId
  })
}

/**
 * Calculate completeness score as percentage (0-100).
 */
export function calculateCompleteness(sections: OutlineSection[]): number {
  if (sections.length === 0) return 0
  const completeCount = sections.filter(s => s.status === "complete").length
  return Math.round((completeCount / sections.length) * 100)
}

/**
 * Sum estimatedWordCount from all sections.
 */
export function recalculateTotalWordCount(sections: OutlineSection[]): number {
  return sections.reduce((sum, s) => sum + (s.estimatedWordCount ?? 0), 0)
}

// ============================================================================
// AUTO-CHECK
// ============================================================================

const PRE_OUTLINE_STAGES = ["gagasan", "topik", "outline"]

/**
 * Auto-check outline sections when a stage is approved.
 * Marks all child sections of the approved stage as "complete".
 *
 * - Skips pre-outline stages (gagasan, topik, outline)
 * - Preserves existing user-checked sections (checkedBy: "user")
 * - Marks level-1 parent as complete when ALL its children are complete
 */
export function autoCheckOutlineSections(
  sections: OutlineSection[],
  approvedStage: string,
  timestamp: number
): {
  sections: OutlineSection[]
  sectionsChecked: number
  completenessScore: number
} {
  if (PRE_OUTLINE_STAGES.includes(approvedStage)) {
    return { sections, sectionsChecked: 0, completenessScore: calculateCompleteness(sections) }
  }

  const childIds = new Set(
    getSectionsForStage(approvedStage, sections).map(s => s.id)
  )

  if (childIds.size === 0) {
    return { sections, sectionsChecked: 0, completenessScore: calculateCompleteness(sections) }
  }

  let checked = 0
  const updated = sections.map(s => {
    if (childIds.has(s.id)) {
      if (s.checkedBy === "user") return s
      checked++
      return { ...s, status: "complete" as const, checkedAt: timestamp, checkedBy: "auto" as const }
    }
    return s
  })

  // Mark level-1 parent as complete when all children are complete
  const level1Index = updated.findIndex(s => s.id === approvedStage && !s.parentId)
  if (level1Index !== -1) {
    const allChildrenComplete = updated
      .filter(s => childIds.has(s.id))
      .every(s => s.status === "complete")

    if (allChildrenComplete && updated[level1Index].checkedBy !== "user") {
      checked++
      updated[level1Index] = {
        ...updated[level1Index],
        status: "complete" as const,
        checkedAt: timestamp,
        checkedBy: "auto" as const,
      }
    }
  }

  return { sections: updated, sectionsChecked: checked, completenessScore: calculateCompleteness(updated) }
}
