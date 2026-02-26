/**
 * Pure helper functions for outline auto-check in Convex mutations.
 * Mirrors logic in src/lib/paper/outline-utils.ts but importable from Convex.
 *
 * KEEP IN SYNC with src/lib/paper/outline-utils.ts
 */

interface OutlineSection {
  id: string
  judul?: string
  level?: number
  parentId?: string | null
  estimatedWordCount?: number
  status?: "complete" | "partial" | "empty"
  checkedAt?: number
  checkedBy?: "auto" | "user"
  editHistory?: Array<{
    action: "add" | "edit" | "remove"
    timestamp: number
    fromStage: string
  }>
}

const PRE_OUTLINE_STAGES = ["gagasan", "topik", "outline"]

function getRootStageId(sectionId: string, sections: OutlineSection[]): string | null {
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

function getSectionsForStage(stageId: string, sections: OutlineSection[]): OutlineSection[] {
  return sections.filter(s => {
    if (!s.parentId) return false
    return getRootStageId(s.id, sections) === stageId
  })
}

function calculateCompleteness(sections: OutlineSection[]): number {
  if (sections.length === 0) return 0
  const completeCount = sections.filter(s => s.status === "complete").length
  return Math.round((completeCount / sections.length) * 100)
}

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

  const childIds = new Set(getSectionsForStage(approvedStage, sections).map(s => s.id))
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

  const level1Index = updated.findIndex(s => s.id === approvedStage && !s.parentId)
  if (level1Index !== -1) {
    const allChildrenComplete = updated.filter(s => childIds.has(s.id)).every(s => s.status === "complete")
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

export function resetAutoCheckedSections(
  sections: OutlineSection[],
  invalidatedStages: string[]
): {
  sections: OutlineSection[]
  sectionsReset: number
  completenessScore: number
} {
  const invalidatedSet = new Set(invalidatedStages)
  let resetCount = 0

  const updated = sections.map(s => {
    const rootStage = getRootStageId(s.id, sections)
    const belongsToInvalidated = rootStage ? invalidatedSet.has(rootStage) : invalidatedSet.has(s.id)
    if (!belongsToInvalidated) return s
    if (s.checkedBy === "user") return s
    if (s.checkedBy === "auto") {
      resetCount++
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { status, checkedAt, checkedBy, ...rest } = s
      return rest as OutlineSection
    }
    return s
  })

  return {
    sections: updated,
    sectionsReset: resetCount,
    completenessScore: calculateCompleteness(updated),
  }
}
