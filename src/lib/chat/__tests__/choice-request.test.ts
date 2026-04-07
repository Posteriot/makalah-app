import { describe, it, expect } from "vitest"
import { parseOptionalChoiceInteractionEvent, buildChoiceContextNote, validateChoiceInteractionEvent, shouldFinalizeAfterChoice } from "../choice-request"

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

  it("gagasan stays in decision-to-draft when stageData immature (no forceFinalize)", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "gagasan",
      selectedOptionIds: ["fokus-berpikir-kritis"],
    })
    expect(note).toContain("Mode: decision-to-draft")
    expect(note).not.toContain("Mode: post-choice-finalize")
  })

  it("gagasan finalize when forceFinalize is true (mature stageData)", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      stage: "gagasan",
      selectedOptionIds: ["fokus-dampak-negatif"],
    }, { forceFinalize: true })
    expect(note).toContain("Mode: post-choice-finalize")
    expect(note).not.toContain("Mode: decision-to-draft")
  })
})

describe("shouldFinalizeAfterChoice", () => {
  // --- decisionMode as primary signal ---

  it("decisionMode 'commit' overrides everything → finalize", () => {
    const result = shouldFinalizeAfterChoice({
      stage: "gagasan",
      stageData: {},
      decisionMode: "commit",
    })
    expect(result.finalize).toBe(true)
    expect(result.reason).toBe("decision_mode_commit")
  })

  it("decisionMode 'exploration' overrides everything → no finalize", () => {
    // Even for a stage that would normally always finalize
    const result = shouldFinalizeAfterChoice({
      stage: "topik",
      stageData: {},
      decisionMode: "exploration",
    })
    expect(result.finalize).toBe(false)
    expect(result.reason).toBe("decision_mode_exploration")
  })

  it("same stage, exploration card → loop; commit card → finalize", () => {
    const exploration = shouldFinalizeAfterChoice({
      stage: "gagasan",
      stageData: { angle: "X", analisis: "Y" },
      decisionMode: "exploration",
    })
    expect(exploration.finalize).toBe(false)

    const commit = shouldFinalizeAfterChoice({
      stage: "gagasan",
      stageData: { angle: "X", analisis: "Y" },
      decisionMode: "commit",
    })
    expect(commit.finalize).toBe(true)
  })

  it("artifact exists but card is exploration → no auto-finalize", () => {
    const result = shouldFinalizeAfterChoice({
      stage: "gagasan",
      stageData: {},
      hasExistingArtifact: true,
      decisionMode: "exploration",
    })
    expect(result.finalize).toBe(false)
    expect(result.reason).toBe("decision_mode_exploration")
  })

  // --- Fallback: no decisionMode ---

  it("always finalizes for topik, outline, etc. when no decisionMode", () => {
    for (const stage of ["topik", "outline", "abstrak", "pendahuluan", "hasil", "judul"] as const) {
      const result = shouldFinalizeAfterChoice({ stage, stageData: {} })
      expect(result.finalize).toBe(true)
      expect(result.reason).toBe("always_finalize_stage")
    }
  })

  it("gagasan: exploration when stageData immature and no decisionMode", () => {
    const result = shouldFinalizeAfterChoice({
      stage: "gagasan",
      stageData: { ideKasar: "some idea" },
    })
    expect(result.finalize).toBe(false)
    expect(result.reason).toBe("exploration_incomplete")
  })

  it("gagasan: finalize when stageData mature and no decisionMode", () => {
    const result = shouldFinalizeAfterChoice({
      stage: "gagasan",
      stageData: { angle: "dampak negatif AI", analisis: "feasibility analysis" },
    })
    expect(result.finalize).toBe(true)
    expect(result.reason).toBe("stage_data_mature")
  })

  it("gagasan: finalize when artifact exists and no decisionMode", () => {
    const result = shouldFinalizeAfterChoice({
      stage: "gagasan",
      stageData: {},
      hasExistingArtifact: true,
    })
    expect(result.finalize).toBe(true)
    expect(result.reason).toBe("artifact_already_exists")
  })

  it("daftar_pustaka: never finalize (has own compile flow)", () => {
    const result = shouldFinalizeAfterChoice({
      stage: "daftar_pustaka",
      stageData: { entries: ["ref1"] },
      decisionMode: "commit",
    })
    // daftar_pustaka overrides even commit decisionMode
    expect(result.finalize).toBe(false)
    expect(result.reason).toBe("daftar_pustaka_compile_flow")
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

  it("error message includes actual stageStatus for route handler extraction", () => {
    try {
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
        stageStatus: "pending_validation",
      })
      expect.unreachable("should have thrown")
    } catch (error) {
      const msg = (error as Error).message
      expect(msg).toContain("CHOICE_REJECTED_STALE_STATE")
      expect(msg).toContain('"pending_validation"')
      expect(msg).toContain('expected "drafting"')
    }
  })

  it("passes when stageStatus is undefined (backwards compatibility)", () => {
    expect(() =>
      validateChoiceInteractionEvent({
        event: validEvent,
        conversationId: "conv-123",
        currentStage: "outline",
        isPaperMode: true,
      })
    ).not.toThrow()
  })
})
