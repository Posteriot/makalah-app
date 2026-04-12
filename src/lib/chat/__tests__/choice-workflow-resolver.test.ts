import { describe, it, expect } from "vitest"
import { resolveChoiceWorkflow } from "../choice-workflow-registry"

describe("resolveChoiceWorkflow", () => {
  it("prefers workflowAction over decisionMode when both present", () => {
    const result = resolveChoiceWorkflow({
      stage: "topik",
      workflowAction: "continue_discussion",
      decisionMode: "commit",
      stageStatus: "drafting",
    })
    expect(result.action).toBe("continue_discussion")
    expect(result.contractVersion).toBe("v2")
    expect(result.reason).toBe("workflow_action_continue_discussion")
  })

  it("marks legacy contract path when workflowAction is missing but decisionMode exists", () => {
    const result = resolveChoiceWorkflow({
      stage: "outline",
      decisionMode: "commit",
      stageStatus: "drafting",
    })
    expect(result.contractVersion).toBe("legacy")
    expect(result.action).toBe("finalize_stage")
  })

  it("returns finalize_stage action for commit decisionMode on legacy path", () => {
    const result = resolveChoiceWorkflow({
      stage: "topik",
      decisionMode: "commit",
      stageStatus: "drafting",
    })
    expect(result.action).toBe("finalize_stage")
    expect(result.contractVersion).toBe("legacy")
  })

  it("returns continue_discussion for exploration decisionMode on legacy path", () => {
    const result = resolveChoiceWorkflow({
      stage: "topik",
      decisionMode: "exploration",
      stageStatus: "drafting",
    })
    expect(result.action).toBe("continue_discussion")
    expect(result.contractVersion).toBe("legacy")
  })

  it("resolves compile_then_finalize for daftar_pustaka", () => {
    const result = resolveChoiceWorkflow({
      stage: "daftar_pustaka",
      workflowAction: "compile_then_finalize",
      stageStatus: "drafting",
    })
    expect(result.workflowClass).toBe("compile_finalize")
    expect(result.toolStrategy).toBe("compile_create_submit")
    expect(result.contractVersion).toBe("v2")
  })

  it("resolves special_finalize for judul stage", () => {
    const result = resolveChoiceWorkflow({
      stage: "judul",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    expect(result.workflowClass).toBe("special_finalize")
    expect(result.fallbackPolicy).toBe("deterministic_rescue")
  })

  it("resolves special_finalize for lampiran stage", () => {
    const result = resolveChoiceWorkflow({
      stage: "lampiran",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    expect(result.workflowClass).toBe("special_finalize")
    expect(result.fallbackPolicy).toBe("deterministic_rescue")
  })

  it("maps gagasan continue_discussion to discussion_choice class", () => {
    const result = resolveChoiceWorkflow({
      stage: "gagasan",
      workflowAction: "continue_discussion",
      stageStatus: "drafting",
    })
    expect(result.workflowClass).toBe("discussion_choice")
    expect(result.toolStrategy).toBe("none")
    expect(result.prosePolicy).toBe("discussion_only")
  })

  it("returns legacy contractVersion when workflowAction is absent", () => {
    const result = resolveChoiceWorkflow({
      stage: "gagasan",
      decisionMode: "exploration",
      stageStatus: "drafting",
    })
    expect(result.contractVersion).toBe("legacy")
  })

  // Legacy bridge tests
  it("legacy: gagasan with mature stageData resolves to finalize", () => {
    const result = resolveChoiceWorkflow({
      stage: "gagasan",
      stageData: { angle: "dampak negatif AI", analisis: "feasibility" },
      stageStatus: "drafting",
    })
    expect(result.action).toBe("finalize_stage")
    expect(result.reason).toBe("legacy_gagasan_mature")
  })

  it("legacy: daftar_pustaka with commit decisionMode resolves to compile_then_finalize", () => {
    const result = resolveChoiceWorkflow({
      stage: "daftar_pustaka",
      decisionMode: "commit",
      stageStatus: "drafting",
    })
    expect(result.action).toBe("compile_then_finalize")
    expect(result.contractVersion).toBe("legacy")
  })

  it("normalizes illegal gagasan + compile_then_finalize to safe discussion fallback", () => {
    const result = resolveChoiceWorkflow({
      stage: "gagasan",
      workflowAction: "compile_then_finalize",
      stageStatus: "drafting",
    })
    expect(result.action).toBe("continue_discussion")
    expect(result.contractVersion).toBe("v2")
    expect(result.reason).toBe("invalid_action_for_stage_fallback")
  })

  it("normalizes illegal topik + special_finalize to safe discussion fallback", () => {
    const result = resolveChoiceWorkflow({
      stage: "topik",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    expect(result.action).toBe("continue_discussion")
    expect(result.reason).toBe("invalid_action_for_stage_fallback")
  })

  it("normalizes validation_ready to safe discussion fallback", () => {
    const result = resolveChoiceWorkflow({
      stage: "outline",
      workflowAction: "validation_ready",
      stageStatus: "drafting",
    })
    expect(result.action).toBe("continue_discussion")
    expect(result.reason).toBe("invalid_action_for_stage_fallback")
  })
})
