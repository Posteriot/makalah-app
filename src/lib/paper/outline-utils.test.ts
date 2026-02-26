import { describe, it, expect } from "vitest"
import {
  getRootStageId,
  getSectionsForStage,
  calculateCompleteness,
  recalculateTotalWordCount,
  autoCheckOutlineSections,
  resetAutoCheckedSections,
  validateOutlineEdit,
} from "./outline-utils"
import type { OutlineSection } from "./stage-types"

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
    expect(recalculateTotalWordCount(SAMPLE_SECTIONS)).toBe(2000)
  })

  it("returns 0 for empty array", () => {
    expect(recalculateTotalWordCount([])).toBe(0)
  })
})

// ============================================================================
// autoCheckOutlineSections
// ============================================================================

describe("autoCheckOutlineSections", () => {
  it("marks matching child sections as complete with auto checker", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "pendahuluan", now)

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
    expect(result.completenessScore).toBeGreaterThan(0)
  })

  it("skips pre-outline stages", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "gagasan", now)

    expect(result.sectionsChecked).toBe(0)
    expect(result.sections).toEqual(SAMPLE_SECTIONS)
  })

  it("skips stages with no matching sections", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "abstrak", now)

    expect(result.sectionsChecked).toBe(0)
  })

  it("marks level-1 parent as complete when all children are complete", () => {
    const now = 1700000000000
    const result = autoCheckOutlineSections(SAMPLE_SECTIONS, "pendahuluan", now)

    const parent = result.sections.find(s => s.id === "pendahuluan")
    expect(parent?.status).toBe("complete")
    expect(parent?.checkedAt).toBe(now)
    expect(parent?.checkedBy).toBe("auto")
  })

  it("preserves user-checked sections", () => {
    const existingChecked = SAMPLE_SECTIONS.map(s =>
      s.id === "pendahuluan.latar"
        ? { ...s, status: "complete" as const, checkedAt: 1600000000000, checkedBy: "user" as const }
        : s
    )
    const now = 1700000000000
    const result = autoCheckOutlineSections(existingChecked, "pendahuluan", now)

    const latar = result.sections.find(s => s.id === "pendahuluan.latar")
    expect(latar?.checkedBy).toBe("user")
    expect(latar?.checkedAt).toBe(1600000000000)
  })
})

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

    const rumusan = result.sections.find(s => s.id === "pendahuluan.rumusan")
    expect(rumusan?.status).toBe("complete")
    expect(rumusan?.checkedBy).toBe("user")

    const latar = result.sections.find(s => s.id === "pendahuluan.latar")
    expect(latar?.status).toBeUndefined()
    expect(latar?.checkedBy).toBeUndefined()
  })

  it("does not touch sections of non-invalidated stages", () => {
    const result = resetAutoCheckedSections(checkedSections, ["tinjauan_literatur"])

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

  it("rejects adding without parentId", () => {
    const result = validateOutlineEdit(
      { action: "add", sectionId: "new", judul: "Test" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(false)
  })

  it("rejects nesting beyond level 3", () => {
    const result = validateOutlineEdit(
      { action: "add", sectionId: "deep", parentId: "tinjauan_literatur.teori.sub1", judul: "Too Deep" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("level")
  })

  it("rejects adding a section with duplicate sectionId", () => {
    const result = validateOutlineEdit(
      { action: "add", sectionId: "pendahuluan.latar", parentId: "pendahuluan", judul: "Duplikat" },
      SAMPLE_SECTIONS
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("sudah ada")
  })
})
