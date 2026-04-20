import { describe, it, expect } from "vitest"
import { shouldAttemptRescue, resolveChoiceWorkflow } from "../choice-workflow-registry"

describe("shouldAttemptRescue", () => {
  const emptyTracker = {
    sawCreateArtifactSuccess: false,
    sawUpdateArtifactSuccess: false,
    sawSubmitValidationSuccess: false,
    sawUpdateStageData: false,
  }

  it("allows deterministic rescue for judul special finalize", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "judul",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    const result = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: { ...emptyTracker },
    })
    expect(result.shouldRescue).toBe(true)
    expect(result.reason).toBe("incomplete_finalize_tool_chain")
  })

  it("allows rescue for lampiran special finalize with incomplete chain", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "lampiran",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    const result = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: {
        ...emptyTracker,
        sawUpdateStageData: true,
      },
    })
    expect(result.shouldRescue).toBe(true)
  })

  it("skips rescue when tool chain is complete", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "judul",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    const result = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: {
        sawCreateArtifactSuccess: true,
        sawUpdateArtifactSuccess: false,
        sawSubmitValidationSuccess: true,
        sawUpdateStageData: true,
      },
    })
    expect(result.shouldRescue).toBe(false)
    expect(result.reason).toBe("tool_chain_complete")
  })

  it("skips rescue for stages without deterministic_rescue policy", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "topik",
      workflowAction: "finalize_stage",
      stageStatus: "drafting",
    })
    const result = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: { ...emptyTracker },
    })
    expect(result.shouldRescue).toBe(false)
    expect(result.reason).toBe("no_rescue_policy")
  })

  it("skips rescue for continue_discussion even on rescue-eligible stage", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "judul",
      workflowAction: "continue_discussion",
      stageStatus: "drafting",
    })
    const result = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: { ...emptyTracker },
    })
    expect(result.shouldRescue).toBe(false)
    // resolveChoiceWorkflow sets fallbackPolicy to "no_rescue" for discussion turns,
    // so no_rescue_policy fires before the discussion_turn check
    expect(result.reason).toBe("no_rescue_policy")
  })

  it("skips rescue via discussion_turn when workflow has rescue policy but action is discussion", () => {
    // Synthetic case: manually construct a workflow with rescue policy but discussion action
    const result = shouldAttemptRescue({
      resolvedWorkflow: {
        action: "continue_discussion",
        workflowClass: "discussion_choice",
        toolStrategy: "none",
        prosePolicy: "discussion_only",
        fallbackPolicy: "deterministic_rescue",
        reason: "test_synthetic",
        contractVersion: "v2",
      },
      paperToolTracker: { ...emptyTracker },
    })
    expect(result.shouldRescue).toBe(false)
    expect(result.reason).toBe("discussion_turn")
  })

  it("allows rescue for hasil special finalize", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "hasil",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    const result = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: {
        ...emptyTracker,
        sawUpdateStageData: true,
      },
    })
    expect(result.shouldRescue).toBe(true)
  })

  it("skips rescue when only artifact succeeded but no submit", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "judul",
      workflowAction: "special_finalize",
      stageStatus: "drafting",
    })
    const result = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: {
        sawCreateArtifactSuccess: true,
        sawUpdateArtifactSuccess: false,
        sawSubmitValidationSuccess: false,
        sawUpdateStageData: true,
      },
    })
    // Artifact exists but no submit — still needs rescue
    expect(result.shouldRescue).toBe(true)
    expect(result.reason).toBe("incomplete_finalize_tool_chain")
  })

  it("skips rescue for daftar_pustaka (no_rescue policy)", () => {
    const workflow = resolveChoiceWorkflow({
      stage: "daftar_pustaka",
      workflowAction: "compile_then_finalize",
      stageStatus: "drafting",
    })
    const result = shouldAttemptRescue({
      resolvedWorkflow: workflow,
      paperToolTracker: { ...emptyTracker },
    })
    expect(result.shouldRescue).toBe(false)
    expect(result.reason).toBe("no_rescue_policy")
  })
})
