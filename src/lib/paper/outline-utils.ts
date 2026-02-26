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
