import { describe, it, expect } from "vitest"
import { filterDraftSaveWarnings } from "../paper-tools-draft-save"

describe("filterDraftSaveWarnings", () => {
  it("filters ringkasan-not-provided warning", () => {
    const warning =
      "Ringkasan not provided. This stage CANNOT be approved without ringkasan. " +
      "Call updateStageData again with the 'ringkasan' field containing the agreed key decisions (max 280 characters)."
    expect(filterDraftSaveWarnings(warning)).toBeUndefined()
  })

  it("preserves unknown-keys warning", () => {
    const warning = "Unknown keys stripped: foo, bar. Use keys matching the schema for stage gagasan."
    expect(filterDraftSaveWarnings(warning)).toBe(warning)
  })

  it("preserves URL validation warning", () => {
    const warning = "ANTI-HALLUCINATION: 2 of 3 references in field 'referensiAwal' do NOT have a URL."
    expect(filterDraftSaveWarnings(warning)).toBe(warning)
  })

  it("filters ringkasan warning but keeps others in combined warning", () => {
    const combined =
      "Unknown keys stripped: foo. Use keys matching the schema for stage gagasan. | " +
      "Ringkasan not provided. This stage CANNOT be approved without ringkasan. " +
      "Call updateStageData again with the 'ringkasan' field containing the agreed key decisions (max 280 characters)."
    const result = filterDraftSaveWarnings(combined)
    expect(result).toContain("Unknown keys stripped")
    expect(result).not.toContain("Ringkasan not provided")
  })

  it("returns undefined for undefined input", () => {
    expect(filterDraftSaveWarnings(undefined)).toBeUndefined()
  })
})
