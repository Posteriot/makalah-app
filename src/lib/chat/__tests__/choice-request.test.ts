import { describe, it, expect } from "vitest"
import { parseOptionalChoiceInteractionEvent, buildChoiceContextNote } from "../choice-request"

describe("parseOptionalChoiceInteractionEvent", () => {
  it("returns null when no interactionEvent", () => {
    expect(parseOptionalChoiceInteractionEvent({})).toBeNull()
    expect(parseOptionalChoiceInteractionEvent(null)).toBeNull()
  })

  it("parses a valid event", () => {
    const event = parseOptionalChoiceInteractionEvent({
      interactionEvent: {
        type: "paper.choice.submit",
        version: 1,
        conversationId: "conv-123",
        stage: "gagasan",
        sourceMessageId: "msg-456",
        choicePartId: "msg-456-json-renderer-choice",
        kind: "single-select",
        selectedOptionIds: ["fokus-berpikir-kritis"],
        submittedAt: Date.now(),
      },
    })
    expect(event).not.toBeNull()
    expect(event!.type).toBe("paper.choice.submit")
  })
})

describe("buildChoiceContextNote", () => {
  const baseEvent = {
    type: "paper.choice.submit" as const,
    version: 1 as const,
    conversationId: "conv-123",
    stage: "gagasan",
    sourceMessageId: "msg-456",
    choicePartId: "msg-456-json-renderer-choice",
    kind: "single-select" as const,
    selectedOptionIds: ["fokus-berpikir-kritis"],
    submittedAt: Date.now(),
  }

  it("builds decision-to-draft note for normal choice", () => {
    const note = buildChoiceContextNote(baseEvent)
    expect(note).toContain("USER_CHOICE_DECISION:")
    expect(note).toContain("Mode: decision-to-draft")
    expect(note).toContain("fokus-berpikir-kritis")
  })

  it("builds validation-ready note for validation option", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      selectedOptionIds: ["sudah-cukup-lanjut-validasi"],
    })
    expect(note).toContain("Mode: validation-ready")
    expect(note).toContain("submitStageForValidation")
  })

  it("includes custom text when present", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      customText: "Tambahan info",
    })
    expect(note).toContain("Custom note: Tambahan info")
  })

  it("builds post-choice-title-selection note for judul stage", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "judul",
      selectedOptionIds: ["option-1"],
    })
    expect(note).toContain("Mode: post-choice-title-selection")
    expect(note).toContain("judulTerpilih")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("builds post-choice-artifact-first note for hasil stage", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "hasil",
      selectedOptionIds: ["option-narasi"],
    })
    expect(note).toContain("Mode: post-choice-artifact-first")
    expect(note).toContain("metodePenyajian")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("builds no-appendix-placeholder note for lampiran tidak-ada", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "lampiran",
      selectedOptionIds: ["tidak-ada-lampiran"],
    })
    expect(note).toContain("Mode: no-appendix-placeholder")
    expect(note).toContain("tidakAdaLampiran")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("falls through to decision-to-draft for lampiran with appendix", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "lampiran",
      selectedOptionIds: ["option-tabel-data"],
    })
    expect(note).toContain("Mode: decision-to-draft")
  })
})
