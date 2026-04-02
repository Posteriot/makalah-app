import { describe, it, expect } from "vitest"
import {
  parseOptionalChoiceInteractionEvent,
  buildChoiceContextNote,
  isValidationChoiceInteractionEvent,
} from "../choice-request"

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

  it("treats generic confirm option as validation-ready", () => {
    const event = {
      ...baseEvent,
      selectedOptionIds: ["confirm"],
    }
    expect(isValidationChoiceInteractionEvent(event)).toBe(true)
    const note = buildChoiceContextNote(event)
    expect(note).toContain("Mode: validation-ready")
  })

  it("includes custom text when present", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      customText: "Tambahan info",
    })
    expect(note).toContain("Custom note: Tambahan info")
  })
})
