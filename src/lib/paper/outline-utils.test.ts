import { describe, it, expect } from "vitest"
import {
  getRootStageId,
  getSectionsForStage,
  calculateCompleteness,
  recalculateTotalWordCount,
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
