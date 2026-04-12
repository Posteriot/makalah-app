import { describe, it, expect } from "vitest"
import { sanitizeChoiceOutcome } from "../choice-outcome-guard"

describe("sanitizeChoiceOutcome", () => {
  // --- continue_discussion: false draft handoff ---

  it("sanitizes false draft handoff for continue_discussion", () => {
    const result = sanitizeChoiceOutcome({
      action: "continue_discussion",
      text: "Berikut adalah draf yang akan diajukan. Silakan review di panel validasi.",
      hasArtifactSuccess: false,
      submittedForValidation: false,
    })
    expect(result.text).not.toContain("panel validasi")
    expect(result.text).not.toContain("Berikut adalah draf")
    expect(result.wasModified).toBe(true)
    expect(result.violationType).toBe("false_draft_handoff")
  })

  it("preserves healthy discussion text for continue_discussion", () => {
    const result = sanitizeChoiceOutcome({
      action: "continue_discussion",
      text: "Berdasarkan pilihan ini, kita bisa mempersempit fokus ke aspek kognitif.",
      hasArtifactSuccess: false,
      submittedForValidation: false,
    })
    expect(result.text).toContain("aspek kognitif")
    expect(result.wasModified).toBe(false)
    expect(result.violationType).toBe("none")
  })

  it("returns empty string when all text is false handoff", () => {
    const result = sanitizeChoiceOutcome({
      action: "continue_discussion",
      text: "Silakan review di panel validasi.",
      hasArtifactSuccess: false,
      submittedForValidation: false,
    })
    expect(result.text).toBe("")
    expect(result.violationType).toBe("false_draft_handoff")
  })

  it("keeps non-handoff paragraphs and strips handoff ones", () => {
    const result = sanitizeChoiceOutcome({
      action: "continue_discussion",
      text: "Kita bisa eksplorasi lebih dalam.\n\nSilakan review di panel validasi.\n\nAda beberapa pendekatan lain.",
      hasArtifactSuccess: false,
      submittedForValidation: false,
    })
    expect(result.text).toContain("eksplorasi lebih dalam")
    expect(result.text).toContain("pendekatan lain")
    expect(result.text).not.toContain("panel validasi")
    expect(result.wasModified).toBe(true)
    expect(result.violationType).toBe("false_draft_handoff")
  })

  // --- finalize: recovery leakage ---

  it("keeps healthy prose while removing recovery leakage after finalize", () => {
    const result = sanitizeChoiceOutcome({
      action: "finalize_stage",
      text: "Draft selesai.\n\nMaaf ada kendala teknis.\n\nSilakan review di panel validasi.",
      hasArtifactSuccess: true,
      submittedForValidation: true,
    })
    expect(result.text).toContain("Draft selesai")
    expect(result.text).toContain("panel validasi")
    expect(result.text).not.toContain("kendala teknis")
    expect(result.violationType).toBe("recovery_leakage")
  })

  it("returns lifecycle closing when all text is leakage", () => {
    const result = sanitizeChoiceOutcome({
      action: "finalize_stage",
      text: "Maaf ada kendala teknis. Saya akan coba lagi.",
      hasArtifactSuccess: true,
      submittedForValidation: true,
    })
    expect(result.text).toContain("panel validasi")
    expect(result.violationType).toBe("recovery_leakage")
  })

  it("does not sanitize recovery text when artifact did not succeed", () => {
    const result = sanitizeChoiceOutcome({
      action: "finalize_stage",
      text: "Maaf ada kendala teknis. Saya akan coba lagi.",
      hasArtifactSuccess: false,
      submittedForValidation: false,
    })
    expect(result.text).toContain("kendala teknis")
    expect(result.wasModified).toBe(false)
    expect(result.violationType).toBe("none")
  })

  it("uses not-submitted closing when submittedForValidation is false", () => {
    const result = sanitizeChoiceOutcome({
      action: "finalize_stage",
      text: "Ada kendala teknis yang terjadi.",
      hasArtifactSuccess: true,
      submittedForValidation: false,
    })
    expect(result.text).toContain("belum dikirim ke panel validasi")
    expect(result.violationType).toBe("recovery_leakage")
  })

  // --- no violation ---

  it("passes through clean finalize text", () => {
    const result = sanitizeChoiceOutcome({
      action: "finalize_stage",
      text: "Outline sudah disimpan. Silakan review di panel validasi.",
      hasArtifactSuccess: true,
      submittedForValidation: true,
    })
    // No recovery leakage present — should pass through
    expect(result.wasModified).toBe(false)
    expect(result.violationType).toBe("none")
  })

  it("passes through empty text without modification", () => {
    const result = sanitizeChoiceOutcome({
      action: "continue_discussion",
      text: "",
      hasArtifactSuccess: false,
      submittedForValidation: false,
    })
    expect(result.text).toBe("")
    expect(result.wasModified).toBe(false)
    expect(result.violationType).toBe("none")
  })

  // --- compile_then_finalize and special_finalize also trigger recovery guard ---

  it("sanitizes recovery leakage for compile_then_finalize", () => {
    const result = sanitizeChoiceOutcome({
      action: "compile_then_finalize",
      text: "Ada kesalahan teknis saat menyusun.",
      hasArtifactSuccess: true,
      submittedForValidation: true,
    })
    expect(result.text).toContain("panel validasi")
    expect(result.violationType).toBe("recovery_leakage")
  })
})
