import { describe, it, expect } from "vitest"
import {
  isDraftSaveSupportedStage,
  isAllowedDraftField,
  getDraftSaveAllowedFields,
} from "../draft-save-fields"

describe("isDraftSaveSupportedStage", () => {
  it("returns true for gagasan", () => {
    expect(isDraftSaveSupportedStage("gagasan")).toBe(true)
  })

  it("returns true for topik", () => {
    expect(isDraftSaveSupportedStage("topik")).toBe(true)
  })

  it("returns false for outline (not in v1)", () => {
    expect(isDraftSaveSupportedStage("outline")).toBe(false)
  })

  it("returns false for unknown stage", () => {
    expect(isDraftSaveSupportedStage("nonexistent")).toBe(false)
  })
})

describe("isAllowedDraftField", () => {
  it("allows ideKasar for gagasan", () => {
    expect(isAllowedDraftField("gagasan", "ideKasar")).toBe(true)
  })

  it("allows analisis for gagasan", () => {
    expect(isAllowedDraftField("gagasan", "analisis")).toBe(true)
  })

  it("rejects referensiAwal for gagasan (auto-persist, not draft-save)", () => {
    expect(isAllowedDraftField("gagasan", "referensiAwal")).toBe(false)
  })

  it("rejects ringkasan for gagasan (belongs to updateStageData)", () => {
    expect(isAllowedDraftField("gagasan", "ringkasan")).toBe(false)
  })

  it("allows definitif for topik", () => {
    expect(isAllowedDraftField("topik", "definitif")).toBe(true)
  })

  it("rejects any field for unsupported stage", () => {
    expect(isAllowedDraftField("outline", "sections")).toBe(false)
  })
})

describe("getDraftSaveAllowedFields", () => {
  it("returns 3 fields for gagasan", () => {
    expect(getDraftSaveAllowedFields("gagasan")).toEqual(["ideKasar", "analisis", "angle"])
  })

  it("returns 4 fields for topik", () => {
    expect(getDraftSaveAllowedFields("topik")).toEqual([
      "definitif", "angleSpesifik", "argumentasiKebaruan", "researchGap",
    ])
  })

  it("returns empty for unsupported stage", () => {
    expect(getDraftSaveAllowedFields("outline")).toEqual([])
  })
})
