# Living Outline Checklist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the paper outline a living checklist that auto-checks sections on stage approval and allows mid-course minor edits, integrated into the SidebarProgress timeline.

**Architecture:** Two-phase approach. Phase 1 adds auto-check side-effect to `approveStage` mutation + outline sub-items UI in SidebarProgress. Phase 2 adds `updateOutlineSections` mutation + inline edit UI. Helper functions in `outline-utils.ts` shared by both phases. Stage-ID Matching maps outline level-1 section IDs to stage IDs by convention.

**Tech Stack:** Convex mutations (backend), React + TypeScript (frontend), Vitest (tests), Tailwind CSS 4 (styling)

---

## Phase 1: Auto-Check (Fitur A)

### Task 1: Extend OutlineSection and OutlineData types

**Files:**
- Modify: `src/lib/paper/stage-types.ts:239-258`

**Step 1: Add new fields to OutlineSection**

Add `checkedAt`, `checkedBy`, and `editHistory` fields to `OutlineSection` interface at `src/lib/paper/stage-types.ts:239-246`:

```ts
export interface OutlineSection {
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
```

**Step 2: Add new fields to OutlineData**

Add `lastEditedAt` and `lastEditedFromStage` to `OutlineData` at `src/lib/paper/stage-types.ts:248-258`:

```ts
export interface OutlineData {
  ringkasan?: string
  ringkasanDetail?: string
  sections?: OutlineSection[]
  totalWordCount?: number
  completenessScore?: number
  webSearchReferences?: WebSearchReference[]
  artifactId?: string
  validatedAt?: number
  revisionCount?: number
  lastEditedAt?: number
  lastEditedFromStage?: string
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to stage-types.ts

**Step 4: Commit**

```bash
git add src/lib/paper/stage-types.ts
git commit -m "feat(paper): extend OutlineSection and OutlineData types for living checklist"
```

---

### Task 2: Create outline-utils.ts helper functions

**Files:**
- Create: `src/lib/paper/outline-utils.ts`
- Create: `src/lib/paper/__tests__/outline-utils.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/paper/__tests__/outline-utils.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import {
  getRootStageId,
  getSectionsForStage,
  calculateCompleteness,
  recalculateTotalWordCount,
} from "../outline-utils"
import type { OutlineSection } from "../stage-types"

// ============================================================================
// TEST DATA
// ============================================================================

const SAMPLE_SECTIONS: OutlineSection[] = [
  { id: "pendahuluan", judul: "Pendahuluan", level: 1, parentId: null },
  { id: "pendahuluan.latar", judul: "Latar Belakang", level: 2, parentId: "pendahuluan", estimatedWordCount: 300 },
  { id: "pendahuluan.rumusan", judul: "Rumusan Masalah", level: 2, parentId: "pendahuluan", estimatedWordCount: 200 },
  { id: "tinjauan_literatur", judul: "Tinjauan Literatur", level: 1, parentId: null },
  { id: "tinjauan_literatur.teori", judul: "Kerangka Teori", level: 2, parentId: "tinjauan_literatur", estimatedWordCount: 500 },
  { id: "tinjauan_literatur.teori.sub1", judul: "Sub Teori 1", level: 3, parentId: "tinjauan_literatur.teori", estimatedWordCount: 250 },
  { id: "metodologi", judul: "Metodologi", level: 1, parentId: null },
  { id: "metodologi.desain", judul: "Desain Penelitian", level: 2, parentId: "metodologi", estimatedWordCount: 400 },
  { id: "hasil", judul: "Hasil", level: 1, parentId: null },
  { id: "hasil.temuan1", judul: "Temuan Pertama", level: 2, parentId: "hasil", estimatedWordCount: 350 },
]

// ============================================================================
// getRootStageId
// ============================================================================

describe("getRootStageId", () => {
  it("returns level-1 section ID directly", () => {
    expect(getRootStageId("pendahuluan", SAMPLE_SECTIONS)).toBe("pendahuluan")
  })

  it("returns root parent for level-2 section", () => {
    expect(getRootStageId("pendahuluan.latar", SAMPLE_SECTIONS)).toBe("pendahuluan")
  })

  it("returns root parent for level-3 section", () => {
    expect(getRootStageId("tinjauan_literatur.teori.sub1", SAMPLE_SECTIONS)).toBe("tinjauan_literatur")
  })

  it("returns null for unknown section", () => {
    expect(getRootStageId("nonexistent", SAMPLE_SECTIONS)).toBeNull()
  })

  it("returns null for empty sections array", () => {
    expect(getRootStageId("pendahuluan", [])).toBeNull()
  })
})

// ============================================================================
// getSectionsForStage
// ============================================================================

describe("getSectionsForStage", () => {
  it("returns all children (level 2+) of a stage", () => {
    const result = getSectionsForStage("pendahuluan", SAMPLE_SECTIONS)
    expect(result).toHaveLength(2)
    expect(result.map(s => s.id)).toEqual(["pendahuluan.latar", "pendahuluan.rumusan"])
  })

  it("returns nested children for stage with level-3 sections", () => {
    const result = getSectionsForStage("tinjauan_literatur", SAMPLE_SECTIONS)
    expect(result).toHaveLength(2)
    expect(result.map(s => s.id)).toEqual(["tinjauan_literatur.teori", "tinjauan_literatur.teori.sub1"])
  })

  it("returns empty array for stage with no outline sections", () => {
    const result = getSectionsForStage("gagasan", SAMPLE_SECTIONS)
    expect(result).toHaveLength(0)
  })

  it("returns empty array for empty sections", () => {
    const result = getSectionsForStage("pendahuluan", [])
    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// calculateCompleteness
// ============================================================================

describe("calculateCompleteness", () => {
  it("returns 0 for all empty sections", () => {
    expect(calculateCompleteness(SAMPLE_SECTIONS)).toBe(0)
  })

  it("returns 100 when all sections are complete", () => {
    const allComplete = SAMPLE_SECTIONS.map(s => ({ ...s, status: "complete" as const }))
    expect(calculateCompleteness(allComplete)).toBe(100)
  })

  it("calculates percentage correctly for mixed statuses", () => {
    const mixed = SAMPLE_SECTIONS.map((s, i) => ({
      ...s,
      status: i < 5 ? "complete" as const : "empty" as const,
    }))
    // 5 out of 10 = 50%
    expect(calculateCompleteness(mixed)).toBe(50)
  })

  it("returns 0 for empty sections array", () => {
    expect(calculateCompleteness([])).toBe(0)
  })
})

// ============================================================================
// recalculateTotalWordCount
// ============================================================================

describe("recalculateTotalWordCount", () => {
  it("sums estimatedWordCount from all sections", () => {
    // 300 + 200 + 500 + 250 + 400 + 350 = 2000
    // Level 1 sections have no estimatedWordCount (undefined)
    expect(recalculateTotalWordCount(SAMPLE_SECTIONS)).toBe(2000)
  })

  it("returns 0 for empty array", () => {
    expect(recalculateTotalWordCount([])).toBe(0)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: FAIL — module `../outline-utils` not found

**Step 3: Implement outline-utils.ts**

Create `src/lib/paper/outline-utils.ts`:

```ts
import type { OutlineSection } from "./stage-types"

/**
 * Find the root (level-1) stage ID for a given section.
 * Traverses parentId chain until level 1 is reached.
 *
 * @returns The level-1 section ID (which matches a stage ID by convention), or null if not found
 */
export function getRootStageId(
  sectionId: string,
  sections: OutlineSection[]
): string | null {
  const sectionMap = new Map(sections.map(s => [s.id, s]))

  let current = sectionMap.get(sectionId)
  if (!current) return null

  // Traverse up the parent chain
  while (current.parentId) {
    const parent = sectionMap.get(current.parentId)
    if (!parent) break
    current = parent
  }

  // current is now the root (level 1)
  return current.id
}

/**
 * Get all child sections (level 2+) that belong to a specific stage.
 * Uses getRootStageId to determine membership.
 *
 * @returns Array of OutlineSections whose root parent matches stageId (excludes the level-1 section itself)
 */
export function getSectionsForStage(
  stageId: string,
  sections: OutlineSection[]
): OutlineSection[] {
  return sections.filter(s => {
    // Skip level-1 sections (they are headers, not checkable items)
    if (!s.parentId) return false
    return getRootStageId(s.id, sections) === stageId
  })
}

/**
 * Calculate the completeness score as a percentage (0-100).
 * Based on count of sections with status "complete" / total sections.
 */
export function calculateCompleteness(sections: OutlineSection[]): number {
  if (sections.length === 0) return 0

  const completeCount = sections.filter(s => s.status === "complete").length
  return Math.round((completeCount / sections.length) * 100)
}

/**
 * Sum estimatedWordCount from all sections.
 * Sections without estimatedWordCount contribute 0.
 */
export function recalculateTotalWordCount(sections: OutlineSection[]): number {
  return sections.reduce((sum, s) => sum + (s.estimatedWordCount ?? 0), 0)
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/paper/outline-utils.ts src/lib/paper/__tests__/outline-utils.test.ts
git commit -m "feat(paper): add outline-utils helper functions with tests"
```

---

### Task 3: Add autoCheckOutlineSections helper for approveStage

**Files:**
- Modify: `src/lib/paper/outline-utils.ts`
- Modify: `src/lib/paper/__tests__/outline-utils.test.ts`

**Step 1: Write the failing tests**

Append to `src/lib/paper/__tests__/outline-utils.test.ts`:

```ts
import {
  getRootStageId,
  getSectionsForStage,
  calculateCompleteness,
  recalculateTotalWordCount,
  autoCheckOutlineSections,
} from "../outline-utils"

// ... (keep existing tests, add import above)

// ============================================================================
// autoCheckOutlineSections
// ============================================================================

describe("autoCheckOutlineSections", () => {
  it("marks matching sections as complete with auto checker", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "pendahuluan", now)

    // pendahuluan.latar and pendahuluan.rumusan should be checked
    const latar = result.sections.find(s => s.id === "pendahuluan.latar")
    const rumusan = result.sections.find(s => s.id === "pendahuluan.rumusan")
    expect(latar?.status).toBe("complete")
    expect(latar?.checkedAt).toBe(now)
    expect(latar?.checkedBy).toBe("auto")
    expect(rumusan?.status).toBe("complete")
    expect(rumusan?.checkedBy).toBe("auto")
  })

  it("does not modify sections of other stages", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "pendahuluan", now)

    const metodDesain = result.sections.find(s => s.id === "metodologi.desain")
    expect(metodDesain?.status).toBeUndefined()
    expect(metodDesain?.checkedAt).toBeUndefined()
  })

  it("recalculates completenessScore", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "pendahuluan", now)
    // 2 sections checked + level-1 "pendahuluan" auto-marked = sections with "complete"
    // Out of 10 total sections, 3 are complete (pendahuluan + pendahuluan.latar + pendahuluan.rumusan)
    expect(result.completenessScore).toBeGreaterThan(0)
  })

  it("skips stages with no matching sections", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "gagasan", now)

    // No sections should be modified
    expect(result.sectionsChecked).toBe(0)
    expect(result.sections).toEqual(SAMPLE_SECTIONS)
  })

  it("also marks level-1 parent section as complete when all children are complete", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "pendahuluan", now)

    const parent = result.sections.find(s => s.id === "pendahuluan")
    expect(parent?.status).toBe("complete")
    expect(parent?.checkedAt).toBe(now)
    expect(parent?.checkedBy).toBe("auto")
  })

  it("preserves already-complete sections", () => {
    const existingChecked = SAMPLE_SECTIONS.map(s =>
      s.id === "pendahuluan.latar"
        ? { ...s, status: "complete" as const, checkedAt: 1600000000000, checkedBy: "user" as const }
        : s
    )
    const now = 1700000000000
    const result = autoCheckOutlineSections(existingChecked, "pendahuluan", now)

    // Should preserve user's earlier check, not overwrite
    const latar = result.sections.find(s => s.id === "pendahuluan.latar")
    expect(latar?.checkedBy).toBe("user")
    expect(latar?.checkedAt).toBe(1600000000000)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: FAIL — `autoCheckOutlineSections` is not exported

**Step 3: Implement autoCheckOutlineSections**

Add to `src/lib/paper/outline-utils.ts`:

```ts
/**
 * Pre-outline stages that should not trigger auto-check.
 */
const PRE_OUTLINE_STAGES = ["gagasan", "topik", "outline"]

/**
 * Auto-check outline sections when a stage is approved.
 * Marks all child sections of the approved stage as "complete".
 *
 * Rules:
 * - Only runs for stages after outline (index > 2)
 * - Level-1 section is also marked complete when ALL its children are complete
 * - Already-complete sections (checkedBy: "user") are preserved
 * - Returns updated sections array + metadata
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
  // Guard: skip pre-outline stages
  if (PRE_OUTLINE_STAGES.includes(approvedStage)) {
    return {
      sections,
      sectionsChecked: 0,
      completenessScore: calculateCompleteness(sections),
    }
  }

  // Find child sections for this stage
  const childIds = new Set(
    getSectionsForStage(approvedStage, sections).map(s => s.id)
  )

  if (childIds.size === 0) {
    return {
      sections,
      sectionsChecked: 0,
      completenessScore: calculateCompleteness(sections),
    }
  }

  let checked = 0
  const updated = sections.map(s => {
    if (childIds.has(s.id)) {
      // Preserve existing user checks
      if (s.checkedBy === "user") return s

      checked++
      return {
        ...s,
        status: "complete" as const,
        checkedAt: timestamp,
        checkedBy: "auto" as const,
      }
    }
    return s
  })

  // Check if level-1 parent should be marked complete
  // (all children are now complete)
  const level1Section = updated.find(s => s.id === approvedStage && !s.parentId)
  if (level1Section) {
    const allChildrenComplete = updated
      .filter(s => childIds.has(s.id))
      .every(s => s.status === "complete")

    if (allChildrenComplete && level1Section.checkedBy !== "user") {
      const level1Index = updated.findIndex(s => s.id === approvedStage && !s.parentId)
      if (level1Index !== -1) {
        checked++
        updated[level1Index] = {
          ...updated[level1Index],
          status: "complete" as const,
          checkedAt: timestamp,
          checkedBy: "auto" as const,
        }
      }
    }
  }

  return {
    sections: updated,
    sectionsChecked: checked,
    completenessScore: calculateCompleteness(updated),
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/paper/outline-utils.ts src/lib/paper/__tests__/outline-utils.test.ts
git commit -m "feat(paper): add autoCheckOutlineSections helper with tests"
```

---

### Task 4: Add resetAutoCheckedSections helper for rewind

**Files:**
- Modify: `src/lib/paper/outline-utils.ts`
- Modify: `src/lib/paper/__tests__/outline-utils.test.ts`

**Step 1: Write the failing tests**

Append to `src/lib/paper/__tests__/outline-utils.test.ts`:

```ts
import {
  // ... existing imports
  resetAutoCheckedSections,
} from "../outline-utils"

// ============================================================================
// resetAutoCheckedSections
// ============================================================================

describe("resetAutoCheckedSections", () => {
  const checkedSections: OutlineSection[] = [
    { id: "pendahuluan", judul: "Pendahuluan", level: 1, parentId: null, status: "complete", checkedAt: 1700000000000, checkedBy: "auto" },
    { id: "pendahuluan.latar", judul: "Latar Belakang", level: 2, parentId: "pendahuluan", status: "complete", checkedAt: 1700000000000, checkedBy: "auto", estimatedWordCount: 300 },
    { id: "pendahuluan.rumusan", judul: "Rumusan Masalah", level: 2, parentId: "pendahuluan", status: "complete", checkedAt: 1600000000000, checkedBy: "user", estimatedWordCount: 200 },
    { id: "tinjauan_literatur", judul: "Tinjauan Literatur", level: 1, parentId: null, status: "complete", checkedAt: 1700000000000, checkedBy: "auto" },
    { id: "tinjauan_literatur.teori", judul: "Kerangka Teori", level: 2, parentId: "tinjauan_literatur", status: "complete", checkedAt: 1700000000000, checkedBy: "auto", estimatedWordCount: 500 },
    { id: "metodologi", judul: "Metodologi", level: 1, parentId: null },
    { id: "metodologi.desain", judul: "Desain Penelitian", level: 2, parentId: "metodologi", estimatedWordCount: 400 },
  ]

  it("resets auto-checked sections for invalidated stages", () => {
    const result = resetAutoCheckedSections(checkedSections, ["tinjauan_literatur"])

    // tinjauan_literatur sections should be reset
    const tl = result.sections.find(s => s.id === "tinjauan_literatur")
    expect(tl?.status).toBeUndefined()
    expect(tl?.checkedAt).toBeUndefined()
    expect(tl?.checkedBy).toBeUndefined()

    const teori = result.sections.find(s => s.id === "tinjauan_literatur.teori")
    expect(teori?.status).toBeUndefined()
    expect(teori?.checkedAt).toBeUndefined()
  })

  it("preserves user-checked sections during reset", () => {
    const result = resetAutoCheckedSections(checkedSections, ["pendahuluan"])

    // pendahuluan.rumusan was checkedBy: "user" -> should be preserved
    const rumusan = result.sections.find(s => s.id === "pendahuluan.rumusan")
    expect(rumusan?.status).toBe("complete")
    expect(rumusan?.checkedBy).toBe("user")

    // pendahuluan.latar was checkedBy: "auto" -> should be reset
    const latar = result.sections.find(s => s.id === "pendahuluan.latar")
    expect(latar?.status).toBeUndefined()
    expect(latar?.checkedBy).toBeUndefined()
  })

  it("does not touch sections of non-invalidated stages", () => {
    const result = resetAutoCheckedSections(checkedSections, ["tinjauan_literatur"])

    // pendahuluan sections should remain unchanged
    const latar = result.sections.find(s => s.id === "pendahuluan.latar")
    expect(latar?.status).toBe("complete")
    expect(latar?.checkedBy).toBe("auto")
  })

  it("recalculates completenessScore", () => {
    const result = resetAutoCheckedSections(checkedSections, ["pendahuluan", "tinjauan_literatur"])
    // Only pendahuluan.rumusan (user-checked) remains complete = 1 out of 7
    expect(result.completenessScore).toBeLessThan(50)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: FAIL — `resetAutoCheckedSections` is not exported

**Step 3: Implement resetAutoCheckedSections**

Add to `src/lib/paper/outline-utils.ts`:

```ts
/**
 * Reset auto-checked outline sections for invalidated stages (during rewind).
 * Preserves user-checked sections (checkedBy: "user").
 *
 * @param sections - Current outline sections
 * @param invalidatedStages - Array of stage IDs being invalidated by rewind
 * @returns Updated sections with auto-checks removed for invalidated stages
 */
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

    // Check if this section belongs to an invalidated stage
    // For level-1 sections, check if their own ID is invalidated
    const belongsToInvalidated = rootStage
      ? invalidatedSet.has(rootStage)
      : invalidatedSet.has(s.id)

    if (!belongsToInvalidated) return s

    // Preserve user-checked sections
    if (s.checkedBy === "user") return s

    // Only reset if section was auto-checked
    if (s.checkedBy === "auto") {
      resetCount++
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
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/paper/outline-utils.ts src/lib/paper/__tests__/outline-utils.test.ts
git commit -m "feat(paper): add resetAutoCheckedSections helper for rewind support"
```

---

### Task 5: Integrate auto-check into approveStage mutation

**Files:**
- Modify: `convex/paperSessions.ts:1116-1166`

**Step 1: Add auto-check logic to approveStage**

In `convex/paperSessions.ts`, after the "Mark current stage validated" block (after line 1123) and before `const nextStage = getNextStage(currentStage)` (line 1125), insert the auto-check logic.

**Important context:** The outline-utils helpers are in `src/lib/paper/` which is a frontend path. Convex functions cannot import from `src/`. So we must inline the auto-check logic directly in the mutation, OR create a shared utility in `convex/paperSessions/`. The cleanest approach: create `convex/paperSessions/outlineAutoCheck.ts` with pure functions (no Convex imports needed).

Create `convex/paperSessions/outlineAutoCheck.ts`:

```ts
/**
 * Pure helper functions for outline auto-check in Convex mutations.
 * These mirror the logic in src/lib/paper/outline-utils.ts but are
 * importable from Convex functions.
 *
 * IMPORTANT: Keep in sync with src/lib/paper/outline-utils.ts
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
  const level1Section = updated.find(s => s.id === approvedStage && !s.parentId)
  if (level1Section) {
    const allChildrenComplete = updated.filter(s => childIds.has(s.id)).every(s => s.status === "complete")
    if (allChildrenComplete && level1Section.checkedBy !== "user") {
      const idx = updated.findIndex(s => s.id === approvedStage && !s.parentId)
      if (idx !== -1) {
        checked++
        updated[idx] = { ...updated[idx], status: "complete" as const, checkedAt: timestamp, checkedBy: "auto" as const }
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
      const { status, checkedAt, checkedBy, ...rest } = s
      return rest as OutlineSection
    }
    return s
  })
  return { sections: updated, sectionsReset: resetCount, completenessScore: calculateCompleteness(updated) }
}
```

**Step 2: Modify approveStage mutation**

In `convex/paperSessions.ts`, add import at top:

```ts
import { autoCheckOutlineSections } from "./paperSessions/outlineAutoCheck"
```

Then insert auto-check block after line 1123 (after `updatedStageData[currentStage] = { ...updatedStageData[currentStage], validatedAt: now }`) and before line 1125 (`const nextStage = getNextStage(currentStage)`):

```ts
        // ════════════════════════════════════════════════════════════════
        // Living Outline Checklist: Auto-check sections on stage approval
        // ════════════════════════════════════════════════════════════════
        const outlineForAutoCheck = updatedStageData.outline as Record<string, unknown> | undefined;
        const outlineSections = outlineForAutoCheck?.sections as Array<Record<string, unknown>> | undefined;

        if (outlineSections && outlineSections.length > 0) {
            try {
                const autoCheckResult = autoCheckOutlineSections(
                    outlineSections as Parameters<typeof autoCheckOutlineSections>[0],
                    currentStage,
                    now
                );

                if (autoCheckResult.sectionsChecked > 0) {
                    updatedStageData.outline = {
                        ...updatedStageData.outline,
                        sections: autoCheckResult.sections as unknown as Record<string, unknown>[],
                        completenessScore: autoCheckResult.completenessScore,
                        lastEditedAt: now,
                        lastEditedFromStage: currentStage,
                    };
                    console.log(
                        `[autoCheckOutline] stage=${currentStage} sections_checked=${autoCheckResult.sectionsChecked} new_completeness=${autoCheckResult.completenessScore}%`
                    );
                }
            } catch (err) {
                console.warn(`[autoCheckOutline] SKIPPED: Error during auto-check for session=${args.sessionId}`, err);
                // Graceful skip — approveStage continues regardless
            }
        }
```

**Step 3: Verify Convex compiles**

Run: `npx convex dev --once --typecheck=enable 2>&1 | tail -10`
Expected: No type errors. Convex functions pushed successfully.

**Step 4: Commit**

```bash
git add convex/paperSessions/outlineAutoCheck.ts convex/paperSessions.ts
git commit -m "feat(paper): integrate auto-check outline into approveStage mutation"
```

---

### Task 6: Integrate outline reset into rewindToStage mutation

**Files:**
- Modify: `convex/paperSessions.ts:1670-1677`

**Step 1: Add import for resetAutoCheckedSections**

Import is already available from Task 5's `outlineAutoCheck.ts`. Add to existing import:

```ts
import { autoCheckOutlineSections, resetAutoCheckedSections } from "./paperSessions/outlineAutoCheck"
```

**Step 2: Insert reset logic into rewindToStage**

In `convex/paperSessions.ts`, in the `rewindToStage` mutation, after `const updatedStageData = clearValidatedAt(stageData, stagesToInvalidate)` (line 1641) and before `const updatedDigest = markDigestAsSuperseded(...)` (line 1644), insert:

```ts
        // ════════════════════════════════════════════════════════════════
        // Living Outline Checklist: Reset auto-checked sections on rewind
        // ════════════════════════════════════════════════════════════════
        const outlineForReset = updatedStageData.outline as Record<string, unknown> | undefined;
        const outlineSectionsForReset = outlineForReset?.sections as Array<Record<string, unknown>> | undefined;

        if (outlineSectionsForReset && outlineSectionsForReset.length > 0) {
            try {
                const resetResult = resetAutoCheckedSections(
                    outlineSectionsForReset as Parameters<typeof resetAutoCheckedSections>[0],
                    stagesToInvalidate
                );

                if (resetResult.sectionsReset > 0) {
                    updatedStageData.outline = {
                        ...updatedStageData.outline,
                        sections: resetResult.sections as unknown as Record<string, unknown>[],
                        completenessScore: resetResult.completenessScore,
                        lastEditedAt: Date.now(),
                        lastEditedFromStage: args.targetStage,
                    };
                    console.log(
                        `[resetOutlineOnRewind] target=${args.targetStage} sections_reset=${resetResult.sectionsReset} new_completeness=${resetResult.completenessScore}%`
                    );
                }
            } catch (err) {
                console.warn(`[resetOutlineOnRewind] SKIPPED: Error during reset for session=${args.sessionId}`, err);
            }
        }
```

**Step 3: Verify Convex compiles**

Run: `npx convex dev --once --typecheck=enable 2>&1 | tail -10`
Expected: No type errors

**Step 4: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(paper): integrate outline reset into rewindToStage mutation"
```

---

### Task 7: Enhance SidebarProgress with outline sub-items

**Files:**
- Modify: `src/components/chat/sidebar/SidebarProgress.tsx`

This is the largest UI task. We need to:
1. Extract outline sections from stageData
2. Pass them to MilestoneItem
3. Add expand/collapse behavior
4. Show checkmark status per sub-item

**Step 1: Add OutlineSection import and helper**

At the top of `SidebarProgress.tsx`, add:

```ts
import type { OutlineSection } from "@/lib/paper/stage-types"
import { getSectionsForStage } from "@/lib/paper/outline-utils"
```

**Step 2: Extend MilestoneItemProps**

Update `MilestoneItemProps` interface (line 48-56):

```ts
interface MilestoneItemProps {
  stageId: PaperStageId
  index: number
  state: MilestoneState
  isLast: boolean
  canRewind: boolean
  rewindReason?: string
  onRewindClick?: () => void
  outlineSections?: OutlineSection[]
  isCurrentStage?: boolean
}
```

**Step 3: Add expand/collapse state and sub-items to MilestoneItem**

Replace the `MilestoneItem` component (lines 106-223) with the version below. Key changes:
- Add `expanded` state (auto-expanded for current stage)
- Add clickable header to toggle expand/collapse
- Add sub-item list with check/circle icons
- Show summary count when collapsed

```tsx
function MilestoneItem({
  stageId,
  index,
  state,
  isLast,
  canRewind,
  rewindReason,
  onRewindClick,
  outlineSections,
  isCurrentStage,
}: MilestoneItemProps) {
  const [expanded, setExpanded] = useState(isCurrentStage ?? false)
  const label = getStageLabel(stageId)
  const hasSections = outlineSections && outlineSections.length > 0

  // Auto-expand current stage, collapse when no longer current
  // Use a ref to track previous isCurrentStage to avoid infinite re-renders
  const prevIsCurrentRef = useRef(isCurrentStage)
  if (prevIsCurrentRef.current !== isCurrentStage) {
    prevIsCurrentRef.current = isCurrentStage
    if (isCurrentStage) {
      // Will be applied on next render via useState initializer
    }
  }

  // Calculate section stats
  const completedCount = outlineSections?.filter(s => s.status === "complete").length ?? 0
  const totalCount = outlineSections?.length ?? 0

  const statusText =
    state === "completed"
      ? "Selesai"
      : state === "current"
        ? "Sedang berjalan"
        : undefined

  // Toggle expand on header click (only if has sections and not a rewind click)
  const handleHeaderClick = useCallback(() => {
    if (hasSections) {
      setExpanded(prev => !prev)
    }
  }, [hasSections])

  const dotElement = (
    <div
      className={cn(
        "w-3 h-3 rounded-full border-2 shrink-0 z-10 transition-all",
        state === "completed" &&
          "bg-[oklch(0.777_0.152_181.912)] border-[color:oklch(0.777_0.152_181.912)]",
        state === "current" &&
          "bg-[var(--chat-success)] border-[color:var(--chat-success)] ring-2 ring-[var(--chat-success)] ring-offset-1 ring-offset-[var(--chat-sidebar)]",
        state === "pending" && "bg-transparent border-[color:var(--chat-muted-foreground)]",
        canRewind &&
          "cursor-pointer hover:scale-125 hover:ring-2 hover:ring-[var(--chat-success)]"
      )}
      onClick={canRewind ? onRewindClick : undefined}
      role={canRewind ? "button" : undefined}
      tabIndex={canRewind ? 0 : undefined}
      onKeyDown={
        canRewind
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onRewindClick?.()
              }
            }
          : undefined
      }
      aria-label={canRewind ? `Kembali ke tahap ${label}` : undefined}
    />
  )

  const showTooltip = state === "completed" && !canRewind && rewindReason

  return (
    <div
      className={cn(
        "flex gap-3 relative group",
        canRewind && "cursor-pointer"
      )}
    >
      {/* Milestone Dot & Line */}
      <div className="flex flex-col items-center">
        {showTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{dotElement}</TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px] font-mono text-xs">
              {rewindReason}
            </TooltipContent>
          </Tooltip>
        ) : (
          dotElement
        )}
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 min-h-[24px]",
              state === "completed" &&
                "bg-gradient-to-b from-[oklch(0.777_0.152_181.912)] to-[var(--chat-success)]",
              state === "current" &&
                "bg-gradient-to-b from-[var(--chat-success)] to-[var(--chat-border)]",
              state === "pending" && "bg-[var(--chat-border)]"
            )}
          />
        )}
      </div>

      {/* Milestone Content */}
      <div className={cn("pb-4 flex-1 min-w-0", isLast && "pb-0")}>
        {/* Header row — clickable to expand/collapse */}
        <div
          className={cn(
            "flex items-center gap-1",
            hasSections && "cursor-pointer"
          )}
          onClick={canRewind ? onRewindClick : handleHeaderClick}
        >
          <div
            className={cn(
              "text-sm font-mono transition-colors flex-1",
              state === "completed" && "font-semibold text-[var(--chat-foreground)]",
              state === "current" && "font-semibold text-[var(--chat-foreground)]",
              state === "pending" && "font-medium text-[var(--chat-muted-foreground)]",
              canRewind && "group-hover:text-[var(--chat-foreground)]"
            )}
          >
            {index + 1}. {label}
          </div>
          {/* Section count badge (collapsed) */}
          {hasSections && !expanded && (
            <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)] shrink-0">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        {/* Status text */}
        {statusText && (
          <div
            className={cn(
              "text-xs font-mono transition-colors",
              state === "completed" && "text-[var(--chat-foreground)]",
              state === "current" && "text-[var(--chat-muted-foreground)]"
            )}
          >
            {statusText}
          </div>
        )}

        {/* Outline sub-items (expanded) */}
        {hasSections && expanded && (
          <div className="mt-1.5 space-y-0.5">
            {outlineSections!.map(section => (
              <div
                key={section.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-mono",
                  section.status === "complete"
                    ? "text-[var(--chat-foreground)]"
                    : "text-[var(--chat-muted-foreground)]",
                  // Indent level-3 sections
                  (section.level ?? 2) >= 3 && "pl-3"
                )}
              >
                {/* Check/circle icon */}
                <span className="shrink-0 w-3 text-center">
                  {section.status === "complete" ? "✓" : "○"}
                </span>
                <span className="truncate">{section.judul}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Pass outline data to MilestoneItem in main component**

In the `SidebarProgress` component, update the `STAGE_ORDER.map` block (lines 422-438). We need to extract outline sections and pass them to `MilestoneItem`.

Before the `return` statement (around line 396), add a helper to get outline sections:

```ts
  // Extract outline sections for sub-item display
  const outlineData = stageData?.outline as Record<string, unknown> | undefined
  const allOutlineSections = (outlineData?.sections ?? []) as OutlineSection[]
```

Then update the `.map` block:

```tsx
          {STAGE_ORDER.map((stageId, index) => {
            const state = getMilestoneState(stageId)
            const rewindInfo = getRewindInfo(stageId, index)
            const sectionsForStage = allOutlineSections.length > 0
              ? getSectionsForStage(stageId, allOutlineSections)
              : undefined

            return (
              <MilestoneItem
                key={stageId}
                stageId={stageId}
                index={index}
                state={state}
                isLast={index === STAGE_ORDER.length - 1}
                canRewind={state === "completed" && rewindInfo.canRewind}
                rewindReason={rewindInfo.reason}
                onRewindClick={() => handleStageClick(stageId, index)}
                outlineSections={sectionsForStage}
                isCurrentStage={state === "current"}
              />
            )
          })}
```

**Step 5: Add useRef import**

Add `useRef` to the React imports at line 3:

```ts
import { useState, useCallback, useRef } from "react"
```

**Step 6: Verify the app compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in SidebarProgress.tsx

**Step 7: Visual verification**

Start the dev server and navigate to a conversation with an active paper session that has an outline. Verify:
1. Stages with outline sections show sub-items
2. Current stage is auto-expanded
3. Completed stages show count badge when collapsed
4. Clicking a stage header toggles expand/collapse
5. Checkmark (✓) shows for complete sections, circle (○) for incomplete

Run: `npm run dev` (manual visual check)

**Step 8: Commit**

```bash
git add src/components/chat/sidebar/SidebarProgress.tsx
git commit -m "feat(paper): add outline sub-items to SidebarProgress timeline"
```

---

### Task 8: Update outline stage instruction for section ID convention

**Files:**
- Modify: `src/lib/ai/paper-stages/finalization.ts`

**Step 1: Read current OUTLINE_INSTRUCTIONS**

The `OUTLINE_INSTRUCTIONS` in `src/lib/ai/paper-stages/finalization.ts` needs a new section enforcing that level-1 section IDs must use official stage IDs.

**Step 2: Add section ID convention to OUTLINE_INSTRUCTIONS**

Find the OUTPUT section in `OUTLINE_INSTRUCTIONS` and add before it:

```
===============================================================================
⚠️ KONVENSI SECTION ID - WAJIB DIIKUTI!
===============================================================================

Level-1 section IDs (bab utama) HARUS menggunakan stage ID resmi berikut:
- pendahuluan
- tinjauan_literatur
- metodologi
- hasil
- diskusi
- kesimpulan
- daftar_pustaka
- lampiran

Contoh BENAR:
  { id: "pendahuluan", judul: "Pendahuluan", level: 1, parentId: null }
  { id: "pendahuluan.latar", judul: "Latar Belakang", level: 2, parentId: "pendahuluan" }

Contoh SALAH:
  { id: "bab1", judul: "Pendahuluan", level: 1 }  ← ID tidak match stage!
  { id: "chapter_intro", judul: "Pendahuluan", level: 1 }  ← ID non-standar!

Ini penting agar auto-check checklist berfungsi. Jika ID tidak match stage ID,
section tersebut TIDAK akan otomatis di-centang saat stage di-approve.
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/ai/paper-stages/finalization.ts
git commit -m "feat(paper): enforce section ID convention in outline instructions"
```

---

## Phase 2: Mid-Course Edit (Fitur B)

### Task 9: Add validateOutlineEdit helper

**Files:**
- Modify: `src/lib/paper/outline-utils.ts`
- Modify: `src/lib/paper/__tests__/outline-utils.test.ts`

**Step 1: Write the failing tests**

Append to test file:

```ts
import {
  // ... existing imports
  validateOutlineEdit,
} from "../outline-utils"

// ============================================================================
// validateOutlineEdit
// ============================================================================

describe("validateOutlineEdit", () => {
  it("accepts adding a level-2 section under existing level-1", () => {
    const result = validateOutlineEdit(
      { action: "add", sectionId: "pendahuluan.tujuan", parentId: "pendahuluan", judul: "Tujuan Penelitian" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(true)
  })

  it("rejects adding a section under non-existent parent", () => {
    const result = validateOutlineEdit(
      { action: "add", sectionId: "x.y", parentId: "nonexistent", judul: "Test" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("tidak ditemukan")
  })

  it("rejects editing a level-1 section", () => {
    const result = validateOutlineEdit(
      { action: "edit", sectionId: "pendahuluan", judul: "Changed" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("level 1")
  })

  it("accepts editing a level-2 section", () => {
    const result = validateOutlineEdit(
      { action: "edit", sectionId: "pendahuluan.latar", judul: "Latar Belakang Masalah" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(true)
  })

  it("rejects removing a level-1 section", () => {
    const result = validateOutlineEdit(
      { action: "remove", sectionId: "pendahuluan" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(false)
  })

  it("rejects removing a section that has children", () => {
    const result = validateOutlineEdit(
      { action: "remove", sectionId: "tinjauan_literatur.teori" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("children")
  })

  it("accepts removing a leaf level-2 section", () => {
    const result = validateOutlineEdit(
      { action: "remove", sectionId: "pendahuluan.latar" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(true)
  })

  it("rejects editing non-existent section", () => {
    const result = validateOutlineEdit(
      { action: "edit", sectionId: "nonexistent", judul: "Test" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(false)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: FAIL — `validateOutlineEdit` is not exported

**Step 3: Implement validateOutlineEdit**

Add to `src/lib/paper/outline-utils.ts`:

```ts
export interface OutlineEdit {
  action: "add" | "edit" | "remove"
  sectionId: string
  parentId?: string
  judul?: string
  estimatedWordCount?: number
}

/**
 * Validate a single outline edit operation.
 *
 * Rules:
 * - Level 1 sections cannot be edited or removed
 * - Add: parentId must exist, new section must be level 2 or 3
 * - Edit: section must exist and be level 2 or 3
 * - Remove: section must exist, be level 2 or 3, and have no children
 */
export function validateOutlineEdit(
  edit: OutlineEdit,
  sections: OutlineSection[]
): { valid: boolean; reason?: string } {
  const sectionMap = new Map(sections.map(s => [s.id, s]))

  if (edit.action === "add") {
    if (!edit.parentId) {
      return { valid: false, reason: "parentId wajib untuk action 'add'" }
    }
    const parent = sectionMap.get(edit.parentId)
    if (!parent) {
      return { valid: false, reason: `Parent section '${edit.parentId}' tidak ditemukan` }
    }
    const newLevel = (parent.level ?? 1) + 1
    if (newLevel > 3) {
      return { valid: false, reason: "Maksimum nesting level adalah 3" }
    }
    return { valid: true }
  }

  if (edit.action === "edit") {
    const section = sectionMap.get(edit.sectionId)
    if (!section) {
      return { valid: false, reason: `Section '${edit.sectionId}' tidak ditemukan` }
    }
    if (!section.parentId) {
      return { valid: false, reason: "Tidak bisa mengedit section level 1 (bab utama)" }
    }
    return { valid: true }
  }

  if (edit.action === "remove") {
    const section = sectionMap.get(edit.sectionId)
    if (!section) {
      return { valid: false, reason: `Section '${edit.sectionId}' tidak ditemukan` }
    }
    if (!section.parentId) {
      return { valid: false, reason: "Tidak bisa menghapus section level 1 (bab utama)" }
    }
    const hasChildren = sections.some(s => s.parentId === edit.sectionId)
    if (hasChildren) {
      return { valid: false, reason: "Section masih punya children, hapus children terlebih dahulu" }
    }
    return { valid: true }
  }

  return { valid: false, reason: `Unknown action: ${edit.action}` }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/paper/outline-utils.ts src/lib/paper/__tests__/outline-utils.test.ts
git commit -m "feat(paper): add validateOutlineEdit helper with tests"
```

---

### Task 10: Implement updateOutlineSections mutation

**Files:**
- Modify: `convex/paperSessions.ts`
- Modify: `convex/paperSessions/outlineAutoCheck.ts`

**Step 1: Add validateOutlineEdit to outlineAutoCheck.ts**

Copy the `OutlineEdit` interface and `validateOutlineEdit` function from `src/lib/paper/outline-utils.ts` to `convex/paperSessions/outlineAutoCheck.ts` (since Convex cannot import from `src/`).

Add at the bottom of `convex/paperSessions/outlineAutoCheck.ts`:

```ts
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
```

**Step 2: Add updateOutlineSections mutation to paperSessions.ts**

Add import at top of `convex/paperSessions.ts`:

```ts
import { autoCheckOutlineSections, resetAutoCheckedSections, validateOutlineEdit, applyOutlineEdits } from "./paperSessions/outlineAutoCheck"
```

Add mutation at the end of file (before the closing), after `getRewindHistory`:

```ts
/**
 * Update outline sections mid-course (add/edit/remove subbabs).
 * Only level 2/3 sections can be modified. Level 1 (bab utama) are locked.
 * Maximum 5 edits per call.
 */
export const updateOutlineSections = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        edits: v.array(v.object({
            action: v.union(v.literal("add"), v.literal("edit"), v.literal("remove")),
            sectionId: v.string(),
            parentId: v.optional(v.string()),
            judul: v.optional(v.string()),
            estimatedWordCount: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        await requireAuthUserId(ctx, args.userId);
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        // Guard: max 5 edits per call
        if (args.edits.length > 5) {
            throw new Error("Maksimum 5 edit per panggilan");
        }

        if (args.edits.length === 0) {
            throw new Error("Tidak ada edit yang diberikan");
        }

        // Guard: outline must exist
        const stageData = session.stageData as Record<string, Record<string, unknown>> | undefined;
        const outlineData = stageData?.outline as Record<string, unknown> | undefined;
        const sections = outlineData?.sections as Array<Record<string, unknown>> | undefined;

        if (!sections || sections.length === 0) {
            throw new Error("Outline belum ada. Selesaikan stage outline terlebih dahulu.");
        }

        // Guard: must be after outline stage (index > 2)
        const currentStage = session.currentStage as PaperStageId;
        const stageIndex = STAGE_ORDER.indexOf(currentStage);
        if (stageIndex <= 2) {
            throw new Error("Edit outline hanya tersedia setelah stage outline di-approve");
        }

        const now = Date.now();
        const result = applyOutlineEdits(
            sections as Parameters<typeof applyOutlineEdits>[0],
            args.edits,
            currentStage,
            now
        );

        // Update stageData.outline
        const updatedStageData = { ...session.stageData } as Record<string, Record<string, unknown>>;
        updatedStageData.outline = {
            ...updatedStageData.outline,
            sections: result.sections as unknown as Record<string, unknown>[],
            completenessScore: result.completenessScore,
            totalWordCount: result.totalWordCount,
            lastEditedAt: now,
            lastEditedFromStage: currentStage,
        };

        await ctx.db.patch(args.sessionId, {
            stageData: updatedStageData,
            updatedAt: now,
        });

        console.log(
            `[updateOutlineSections] stage=${currentStage} edits=${args.edits.length} updated=${result.updatedCount} new_completeness=${result.completenessScore}%`
        );

        return {
            success: true,
            updatedSectionCount: result.updatedCount,
            newCompleteness: result.completenessScore,
            warnings: result.warnings.length > 0 ? result.warnings : undefined,
        };
    },
});
```

**Step 3: Verify Convex compiles**

Run: `npx convex dev --once --typecheck=enable 2>&1 | tail -10`
Expected: No type errors

**Step 4: Commit**

```bash
git add convex/paperSessions/outlineAutoCheck.ts convex/paperSessions.ts
git commit -m "feat(paper): add updateOutlineSections mutation for mid-course edits"
```

---

### Task 11: Expose updateOutlineSections in usePaperSession hook

**Files:**
- Modify: `src/lib/hooks/usePaperSession.ts`

**Step 1: Add mutation and wrapper function**

Add after `rewindToStageMutation` (line 108):

```ts
    const updateOutlineSectionsMutation = useMutation(api.paperSessions.updateOutlineSections);
```

Add wrapper function after `rewindToStage` (before `getStageStartIndex` around line 196):

```ts
    // Living Outline Checklist: Mid-course edit
    const updateOutlineSections = async (
        userId: Id<"users">,
        edits: Array<{
            action: "add" | "edit" | "remove"
            sectionId: string
            parentId?: string
            judul?: string
            estimatedWordCount?: number
        }>
    ) => {
        if (!session) return { success: false, error: "No session" };
        try {
            return await updateOutlineSectionsMutation({
                sessionId: session._id,
                userId,
                edits,
            });
        } catch (error) {
            console.error("Failed to update outline sections:", error);
            return { success: false, error: String(error) };
        }
    };
```

Add `updateOutlineSections` to the return object (around line 226):

```ts
    return {
        // ... existing properties
        updateOutlineSections,
        // ... existing properties
    };
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/hooks/usePaperSession.ts
git commit -m "feat(paper): expose updateOutlineSections in usePaperSession hook"
```

---

### Task 12: Build inline edit UI in SidebarProgress

**Files:**
- Modify: `src/components/chat/sidebar/SidebarProgress.tsx`

**Step 1: Add edit state and UI to MilestoneItem**

This task adds an "Edit Outline" button and inline edit form to the expanded outline sub-items. Key UX:
- "Edit Outline" button appears on expanded sections (only after outline stage, index > 2)
- Inline edit: text fields become editable, + to add, × to remove
- "Simpan" calls `updateOutlineSections`, "Batal" discards

Add to imports at top:

```ts
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
```

Wait — `usePaperSession` and `useCurrentUser` are already imported in the parent `SidebarProgress` component. The cleanest approach: pass `onEditSections` callback from parent to MilestoneItem.

Update `MilestoneItemProps`:

```ts
interface MilestoneItemProps {
  stageId: PaperStageId
  index: number
  state: MilestoneState
  isLast: boolean
  canRewind: boolean
  rewindReason?: string
  onRewindClick?: () => void
  outlineSections?: OutlineSection[]
  isCurrentStage?: boolean
  canEditOutline?: boolean
  onEditOutlineSections?: (edits: Array<{
    action: "add" | "edit" | "remove"
    sectionId: string
    parentId?: string
    judul?: string
  }>) => Promise<void>
}
```

In MilestoneItem, add edit mode state and UI:

```tsx
  const [isEditing, setIsEditing] = useState(false)
  const [editSections, setEditSections] = useState<OutlineSection[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const handleStartEdit = useCallback(() => {
    setEditSections(outlineSections ? [...outlineSections] : [])
    setIsEditing(true)
  }, [outlineSections])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditSections([])
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!onEditOutlineSections || !outlineSections) return

    // Compute diffs between original and edited
    const edits: Array<{ action: "add" | "edit" | "remove"; sectionId: string; parentId?: string; judul?: string }> = []
    const originalMap = new Map(outlineSections.map(s => [s.id, s]))
    const editedMap = new Map(editSections.map(s => [s.id, s]))

    // Removed sections
    for (const orig of outlineSections) {
      if (!editedMap.has(orig.id)) {
        edits.push({ action: "remove", sectionId: orig.id })
      }
    }

    // Added sections
    for (const edited of editSections) {
      if (!originalMap.has(edited.id)) {
        edits.push({
          action: "add",
          sectionId: edited.id,
          parentId: edited.parentId ?? undefined,
          judul: edited.judul,
        })
      }
    }

    // Edited sections (title changed)
    for (const edited of editSections) {
      const orig = originalMap.get(edited.id)
      if (orig && orig.judul !== edited.judul) {
        edits.push({ action: "edit", sectionId: edited.id, judul: edited.judul })
      }
    }

    if (edits.length === 0) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onEditOutlineSections(edits)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }, [editSections, outlineSections, onEditOutlineSections])

  const handleEditSectionTitle = useCallback((sectionId: string, newTitle: string) => {
    setEditSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, judul: newTitle } : s
    ))
  }, [])

  const handleRemoveSection = useCallback((sectionId: string) => {
    setEditSections(prev => prev.filter(s => s.id !== sectionId))
  }, [])

  const handleAddSection = useCallback(() => {
    // Add a new section under the level-1 parent (stageId)
    const newId = `${stageId}.new_${Date.now()}`
    setEditSections(prev => [...prev, {
      id: newId,
      judul: "",
      level: 2,
      parentId: stageId,
    }])
  }, [stageId])
```

Then update the outline sub-items rendering section:

```tsx
        {/* Outline sub-items */}
        {hasSections && expanded && !isEditing && (
          <div className="mt-1.5 space-y-0.5">
            {outlineSections!.map(section => (
              <div
                key={section.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-mono",
                  section.status === "complete"
                    ? "text-[var(--chat-foreground)]"
                    : "text-[var(--chat-muted-foreground)]",
                  (section.level ?? 2) >= 3 && "pl-3"
                )}
              >
                <span className="shrink-0 w-3 text-center">
                  {section.status === "complete" ? "✓" : "○"}
                </span>
                <span className="truncate">{section.judul}</span>
              </div>
            ))}
            {/* Edit button */}
            {canEditOutline && (
              <button
                onClick={(e) => { e.stopPropagation(); handleStartEdit() }}
                className="mt-1 text-[10px] font-mono text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] transition-colors"
              >
                Edit Outline
              </button>
            )}
          </div>
        )}

        {/* Inline edit mode */}
        {hasSections && expanded && isEditing && (
          <div className="mt-1.5 space-y-1">
            {editSections.map(section => (
              <div
                key={section.id}
                className={cn(
                  "flex items-center gap-1 text-xs font-mono",
                  (section.level ?? 2) >= 3 && "pl-3"
                )}
              >
                {/* Level-1 sections are disabled */}
                {!section.parentId ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[var(--chat-muted-foreground)] truncate cursor-not-allowed opacity-50">
                        {section.judul}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-mono text-xs">
                      Bab utama tidak bisa diubah
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <input
                      type="text"
                      value={section.judul ?? ""}
                      onChange={(e) => handleEditSectionTitle(section.id, e.target.value)}
                      className="flex-1 bg-transparent border-b border-[var(--chat-border)] text-[var(--chat-foreground)] outline-none px-0 py-0.5 text-xs font-mono"
                      placeholder="Judul subbab..."
                    />
                    <button
                      onClick={() => handleRemoveSection(section.id)}
                      className="shrink-0 text-[var(--chat-muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                      aria-label="Hapus subbab"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAddSection}
                className="text-[10px] font-mono text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] transition-colors"
              >
                + Tambah
              </button>
              <div className="flex-1" />
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="text-[10px] font-mono text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="text-[10px] font-mono font-semibold text-[var(--chat-success)] hover:opacity-80 transition-colors"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        )}
```

**Step 2: Wire up onEditOutlineSections from parent**

In the `SidebarProgress` main component, add:

```ts
  // Determine if outline can be edited (after outline stage, index > 2)
  const canEditOutline = currentIndex > 2 && allOutlineSections.length > 0
```

Add the edit handler:

```ts
  const handleEditOutlineSections = useCallback(async (
    edits: Array<{
      action: "add" | "edit" | "remove"
      sectionId: string
      parentId?: string
      judul?: string
    }>
  ) => {
    if (!user?._id) return
    await updateOutlineSections(user._id, edits)
  }, [user?._id, updateOutlineSections])
```

Extract `updateOutlineSections` from `usePaperSession`:

```ts
  const {
    session,
    isPaperMode,
    currentStage,
    stageData,
    rewindToStage,
    updateOutlineSections,
    isLoading,
  } = usePaperSession(conversationId as Id<"conversations"> | undefined)
```

Pass to MilestoneItem in the `.map`:

```tsx
                outlineSections={sectionsForStage}
                isCurrentStage={state === "current"}
                canEditOutline={canEditOutline}
                onEditOutlineSections={handleEditOutlineSections}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Visual verification**

Start dev server and navigate to a paper session past outline stage. Verify:
1. "Edit Outline" button appears in expanded stages
2. Click enters inline edit mode
3. Can edit subbab titles, add new, remove existing
4. Level-1 sections are disabled with tooltip
5. "Simpan" persists changes, "Batal" discards

Run: `npm run dev` (manual visual check)

**Step 5: Commit**

```bash
git add src/components/chat/sidebar/SidebarProgress.tsx
git commit -m "feat(paper): add inline outline edit UI in SidebarProgress"
```

---

### Task 13: Final integration test and cleanup

**Files:**
- All modified files from Tasks 1-12

**Step 1: Run all tests**

Run: `npx vitest run src/lib/paper/__tests__/outline-utils.test.ts`
Expected: All tests PASS

**Step 2: Run full test suite**

Run: `npm run test`
Expected: All tests PASS (no regressions)

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 4: Run type check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 5: Verify Convex functions**

Run: `npx convex dev --once --typecheck=enable 2>&1 | tail -10`
Expected: Pushed successfully

**Step 6: Commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(paper): final cleanup for living outline checklist"
```

---

## Acceptance Criteria Checklist

| # | Criteria | Task |
|---|----------|------|
| 1 | Stage X approved → outline sections matching X become `complete` | Task 5 |
| 2 | `completenessScore` recalculated after each auto-check | Tasks 3, 5 |
| 3 | User can add/edit/remove subbab (level 2/3) after outline approved | Tasks 10, 12 |
| 4 | Level 1 sections locked — enforced backend + UI | Tasks 9, 10, 12 |
| 5 | Rewind resets auto-checked sections from invalidated stages | Tasks 4, 6 |
| 6 | SidebarProgress shows outline sub-items with expand/collapse | Task 7 |
| 7 | Timeline unchanged when outline not yet created (stage 1-3) | Task 7 |
| 8 | Auto-check failure does not block approveStage | Task 5 |

## File Summary

| File | Action | Task |
|------|--------|------|
| `src/lib/paper/stage-types.ts` | Modify | 1 |
| `src/lib/paper/outline-utils.ts` | Create | 2, 3, 4, 9 |
| `src/lib/paper/__tests__/outline-utils.test.ts` | Create | 2, 3, 4, 9 |
| `convex/paperSessions/outlineAutoCheck.ts` | Create | 5, 10 |
| `convex/paperSessions.ts` | Modify | 5, 6, 10 |
| `src/lib/ai/paper-stages/finalization.ts` | Modify | 8 |
| `src/lib/hooks/usePaperSession.ts` | Modify | 11 |
| `src/components/chat/sidebar/SidebarProgress.tsx` | Modify | 7, 12 |
