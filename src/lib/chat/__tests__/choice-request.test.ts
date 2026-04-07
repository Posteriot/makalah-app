import { describe, it, expect } from "vitest"
import { parseOptionalChoiceInteractionEvent, buildChoiceContextNote, validateChoiceInteractionEvent } from "../choice-request"

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

  it("builds post-choice-finalize note for topik stage", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "topik",
      selectedOptionIds: ["topik-ai-personalisasi"],
    })
    expect(note).toContain("Mode: post-choice-finalize")
    expect(note).toContain("updateStageData")
    expect(note).toContain("createArtifact")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("builds post-choice-finalize note for abstrak stage", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "abstrak",
      selectedOptionIds: ["abstrak-problem-first"],
    })
    expect(note).toContain("Mode: post-choice-finalize")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("builds post-choice-finalize note for outline stage with existing artifact", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "outline",
      selectedOptionIds: ["outline-tambah-subbab"],
    }, { hasExistingArtifact: true })
    expect(note).toContain("Mode: post-choice-finalize")
    expect(note).toContain("updateArtifact")
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
    expect(note).toContain("Mode: post-choice-finalize")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("builds post-choice-finalize note for diskusi stage", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "diskusi",
      selectedOptionIds: ["opsi-implikasi-teoritis"],
    })
    expect(note).toContain("Mode: post-choice-finalize")
    expect(note).toContain("updateStageData")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("builds post-choice-finalize note for kesimpulan stage", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "kesimpulan",
      selectedOptionIds: ["opsi-saran-praktis"],
    })
    expect(note).toContain("Mode: post-choice-finalize")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("builds post-choice-finalize note for pembaruan_abstrak stage", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "pembaruan_abstrak",
      selectedOptionIds: ["opsi-perbarui-semua"],
    })
    expect(note).toContain("Mode: post-choice-finalize")
    expect(note).toContain("submitStageForValidation")
    expect(note).not.toContain("Mode: decision-to-draft")
  })

  it("gagasan stays in decision-to-draft (exploration stage)", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "gagasan",
      selectedOptionIds: ["fokus-berpikir-kritis"],
    })
    expect(note).toContain("Mode: decision-to-draft")
    expect(note).not.toContain("Mode: post-choice-finalize")
  })
})

describe("validateChoiceInteractionEvent — stale choice guard", () => {
  const validEvent = {
    type: "paper.choice.submit" as const,
    version: 1 as const,
    conversationId: "conv-123",
    stage: "outline",
    sourceMessageId: "msg-789",
    choicePartId: "msg-789-json-renderer-choice",
    kind: "single-select" as const,
    selectedOptionIds: ["option-1"],
    submittedAt: Date.now(),
  }

  it("accepts choice when stageStatus is drafting", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "drafting",
      })
    ).not.toThrow()
  })

  it("rejects choice when stageStatus is pending_validation", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "pending_validation",
      })
    ).toThrow(/CHOICE_REJECTED_STALE_STATE/)
  })

  it("rejects choice when stageStatus is revision", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "revision",
      })
    ).toThrow(/CHOICE_REJECTED_STALE_STATE/)
  })

  it("rejects choice when stageStatus is approved", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "approved",
      })
    ).toThrow(/CHOICE_REJECTED_STALE_STATE/)
  })
})
