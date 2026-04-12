import { describe, it, expect } from "vitest"
import { resolveChoiceWorkflow, shouldAttemptRescue } from "../choice-workflow-registry"
import { sanitizeChoiceOutcome } from "../choice-outcome-guard"

describe("choice workflow observability", () => {
  it("resolver result includes resolution path metadata", () => {
    const result = resolveChoiceWorkflow({
      stage: "topik",
      workflowAction: "finalize_stage",
      stageStatus: "drafting",
    })
    expect(result).toMatchObject({
      action: "finalize_stage",
      workflowClass: "choice_finalize",
      reason: "workflow_action_finalize_stage",
      contractVersion: "v2",
    })
  })

  it("resolver captures both workflowAction and decisionMode inputs for audit", () => {
    // When both are present, workflowAction wins but legacy input is still traceable via contractVersion
    const v2Result = resolveChoiceWorkflow({
      stage: "topik",
      workflowAction: "continue_discussion",
      decisionMode: "commit",
      stageStatus: "drafting",
    })
    expect(v2Result.contractVersion).toBe("v2")
    expect(v2Result.action).toBe("continue_discussion")

    const legacyResult = resolveChoiceWorkflow({
      stage: "topik",
      decisionMode: "commit",
      stageStatus: "drafting",
    })
    expect(legacyResult.contractVersion).toBe("legacy")
    expect(legacyResult.action).toBe("finalize_stage")
  })

  it("resolver records stage context at resolution time", () => {
    const result = resolveChoiceWorkflow({
      stage: "gagasan",
      workflowAction: "continue_discussion",
      stageStatus: "drafting",
    })
    expect(result.reason).toContain("workflow_action")
    expect(result.workflowClass).toBe("discussion_choice")
  })

  it("outcome guard distinguishes prose violation types", () => {
    const falseDraft = sanitizeChoiceOutcome({
      action: "continue_discussion",
      text: "Berikut adalah draf. Silakan review di panel validasi.",
      hasArtifactSuccess: false,
      submittedForValidation: false,
    })
    expect(falseDraft.violationType).toBe("false_draft_handoff")

    const leakage = sanitizeChoiceOutcome({
      action: "finalize_stage",
      text: "Ada kendala teknis. Maaf saya akan coba lagi.",
      hasArtifactSuccess: true,
      submittedForValidation: true,
    })
    expect(leakage.violationType).toBe("recovery_leakage")

    const clean = sanitizeChoiceOutcome({
      action: "finalize_stage",
      text: "Outline sudah siap.",
      hasArtifactSuccess: true,
      submittedForValidation: true,
    })
    expect(clean.violationType).toBe("none")
  })

  it("rescue check marks rescue triggered and fallback policy", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "judul",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    expect(workflow.fallbackPolicy).toBe("deterministic_rescue")

    const rescueResult = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: {
        sawCreateArtifactSuccess: false,
        sawUpdateArtifactSuccess: false,
        sawSubmitValidationSuccess: false,
        sawUpdateStageData: false,
      },
    })
    expect(rescueResult.shouldRescue).toBe(true)
    expect(rescueResult.reason).toBe("incomplete_finalize_tool_chain")
  })
})
