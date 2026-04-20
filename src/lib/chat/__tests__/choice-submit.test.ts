import { describe, it, expect } from "vitest"
import { buildChoiceInteractionEvent, buildChoiceSyntheticText } from "../choice-submit"

describe("buildChoiceInteractionEvent", () => {
  it("builds a valid event", () => {
    const event = buildChoiceInteractionEvent({
      conversationId: "conv-123",
      sourceMessageId: "msg-456",
      choicePartId: "msg-456-json-renderer-choice",
      stage: "gagasan",
      kind: "single-select",
      selectedOptionId: "fokus-berpikir-kritis",
      customText: "Saya ingin fokus pada aspek ini",
    })
    expect(event.type).toBe("paper.choice.submit")
    expect(event.version).toBe(1)
    expect(event.selectedOptionIds).toEqual(["fokus-berpikir-kritis"])
    expect(event.customText).toBe("Saya ingin fokus pada aspek ini")
    expect(event.submittedAt).toBeGreaterThan(0)
  })

  it("includes workflowAction in built event when provided", () => {
    const event = buildChoiceInteractionEvent({
      conversationId: "conv-123",
      sourceMessageId: "msg-456",
      choicePartId: "msg-456-json-renderer-choice",
      stage: "gagasan",
      kind: "single-select",
      selectedOptionId: "fokus-berpikir-kritis",
      workflowAction: "finalize_stage",
    })
    expect(event.workflowAction).toBe("finalize_stage")
  })

  it("omits workflowAction when not provided (legacy path)", () => {
    const event = buildChoiceInteractionEvent({
      conversationId: "conv-123",
      sourceMessageId: "msg-456",
      choicePartId: "msg-456-json-renderer-choice",
      stage: "gagasan",
      kind: "single-select",
      selectedOptionId: "fokus-berpikir-kritis",
    })
    expect(event.workflowAction).toBeUndefined()
  })

  it("omits customText when empty", () => {
    const event = buildChoiceInteractionEvent({
      conversationId: "conv-123",
      sourceMessageId: "msg-456",
      choicePartId: "msg-456-json-renderer-choice",
      stage: "gagasan",
      kind: "single-select",
      selectedOptionId: "fokus-berpikir-kritis",
      customText: "   ",
    })
    expect(event.customText).toBeUndefined()
  })
})

describe("buildChoiceSyntheticText", () => {
  it("builds display text with option label", () => {
    const text = buildChoiceSyntheticText({
      stage: "gagasan",
      selectedOptionId: "fokus-berpikir-kritis",
      selectedLabel: "Fokus berpikir kritis",
    })
    expect(text).toContain("[Choice: gagasan]")
    expect(text).toContain("Pilihan: Fokus berpikir kritis")
  })

  it("includes custom text when provided", () => {
    const text = buildChoiceSyntheticText({
      stage: "gagasan",
      selectedOptionId: "fokus-berpikir-kritis",
      selectedLabel: "Fokus berpikir kritis",
      customText: "Catatan tambahan",
    })
    expect(text).toContain("Catatan user: Catatan tambahan")
  })
})
