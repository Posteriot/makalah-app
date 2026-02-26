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

// ============================================================================
// EDIT VALIDATION & APPLICATION
// ============================================================================

export interface OutlineEdit {
  action: "add" | "edit" | "remove"
  sectionId: string
  parentId?: string
  judul?: string
  estimatedWordCount?: number
}

export function validateOutlineEdit(
  edit: OutlineEdit,
  sections: OutlineSection[]
): { valid: boolean; reason?: string } {
  const sectionMap = new Map(sections.map(s => [s.id, s]))

  if (edit.action === "add") {
    if (sectionMap.has(edit.sectionId)) return { valid: false, reason: `Section '${edit.sectionId}' sudah ada` }
    if (!edit.parentId) return { valid: false, reason: "parentId wajib untuk action 'add'" }
    const parent = sectionMap.get(edit.parentId)
    if (!parent) return { valid: false, reason: `Parent section '${edit.parentId}' tidak ditemukan` }
    const newLevel = (parent.level ?? 1) + 1
    if (newLevel > 3) return { valid: false, reason: "Maksimum nesting level adalah 3" }
    return { valid: true }
  }

  if (edit.action === "edit") {
    const section = sectionMap.get(edit.sectionId)
    if (!section) return { valid: false, reason: `Section '${edit.sectionId}' tidak ditemukan` }
    if (!section.parentId) return { valid: false, reason: "Tidak bisa mengedit section level 1 (bab utama)" }
    return { valid: true }
  }

  if (edit.action === "remove") {
    const section = sectionMap.get(edit.sectionId)
    if (!section) return { valid: false, reason: `Section '${edit.sectionId}' tidak ditemukan` }
    if (!section.parentId) return { valid: false, reason: "Tidak bisa menghapus section level 1 (bab utama)" }
    const hasChildren = sections.some(s => s.parentId === edit.sectionId)
    if (hasChildren) return { valid: false, reason: "Section masih punya children, hapus children terlebih dahulu" }
    return { valid: true }
  }

  return { valid: false, reason: `Unknown action: ${edit.action}` }
}

function recalculateTotalWordCount(sections: OutlineSection[]): number {
  return sections.reduce((sum, s) => sum + (s.estimatedWordCount ?? 0), 0)
}

export function applyOutlineEdits(
  sections: OutlineSection[],
  edits: OutlineEdit[],
  currentStage: string,
  timestamp: number
): {
  sections: OutlineSection[]
  updatedCount: number
  completenessScore: number
  totalWordCount: number
  warnings: string[]
} {
  const warnings: string[] = []
  let updated = [...sections]
  let updatedCount = 0

  for (const edit of edits) {
    const validation = validateOutlineEdit(edit, updated)
    if (!validation.valid) {
      warnings.push(`${edit.action} '${edit.sectionId}': ${validation.reason}`)
      continue
    }

    if (edit.action === "add") {
      const parent = updated.find(s => s.id === edit.parentId)
      const newLevel = (parent?.level ?? 1) + 1
      const newSection: OutlineSection = {
        id: edit.sectionId,
        judul: edit.judul,
        level: newLevel,
        parentId: edit.parentId ?? null,
        estimatedWordCount: edit.estimatedWordCount,
        editHistory: [{ action: "add", timestamp, fromStage: currentStage }],
      }
      updated.push(newSection)
      updatedCount++
    }

    if (edit.action === "edit") {
      const idx = updated.findIndex(s => s.id === edit.sectionId)
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          ...(edit.judul !== undefined ? { judul: edit.judul } : {}),
          ...(edit.estimatedWordCount !== undefined ? { estimatedWordCount: edit.estimatedWordCount } : {}),
          editHistory: [
            ...(updated[idx].editHistory ?? []),
            { action: "edit", timestamp, fromStage: currentStage },
          ],
        }
        updatedCount++
      }
    }

    if (edit.action === "remove") {
      updated = updated.filter(s => s.id !== edit.sectionId)
      updatedCount++
    }
  }

  return {
    sections: updated,
    updatedCount,
    completenessScore: calculateCompleteness(updated),
    totalWordCount: recalculateTotalWordCount(updated),
    warnings,
  }
}
