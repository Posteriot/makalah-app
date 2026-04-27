import { describe, expect, it } from "vitest"
import { shouldAutoOpenSettledArtifactFallback, isValidationPanelEligible } from "./ChatWindow"

// ────────────────────────────────────────────────────────────────
// Regression test: UI reveal sequencing invariant
//
// Required user-facing order for drafting stages:
//   1. Response text (streamed)
//   2. Artifact panel (opens after text paints)
//   3. Validation panel (appears after artifact reveal)
//
// The state-driven sequencing uses:
//   - `artifactRevealDone`: gates validation panel render
//   - `status !== 'streaming'`: blocks during active stream
//   - `shouldAutoOpenSettledArtifactFallback`: gates fallback path
//   - `isValidationPanelEligible`: production gate used in render
//
// These tests import the PRODUCTION helpers so regressions in the
// actual render gate are caught, not just a test-local replica.
// ────────────────────────────────────────────────────────────────

describe("shouldAutoOpenSettledArtifactFallback", () => {
  it("blocks during streaming (active turn)", () => {
    expect(shouldAutoOpenSettledArtifactFallback({
      chatStatus: "streaming",
      optimisticPendingValidation: true,
      stageStatus: "pending_validation",
    })).toBe(false)
  })

  it("blocks during submitted (message in flight)", () => {
    expect(shouldAutoOpenSettledArtifactFallback({
      chatStatus: "submitted",
      optimisticPendingValidation: true,
      stageStatus: "pending_validation",
    })).toBe(false)
  })

  it("blocks when stopped (user cancelled)", () => {
    expect(shouldAutoOpenSettledArtifactFallback({
      chatStatus: "stopped",
      optimisticPendingValidation: false,
      stageStatus: "pending_validation",
    })).toBe(false)
  })

  it("allows on ready when pending_validation", () => {
    expect(shouldAutoOpenSettledArtifactFallback({
      chatStatus: "ready",
      optimisticPendingValidation: false,
      stageStatus: "pending_validation",
    })).toBe(true)
  })

  it("allows on ready when optimisticPendingValidation", () => {
    expect(shouldAutoOpenSettledArtifactFallback({
      chatStatus: "ready",
      optimisticPendingValidation: true,
      stageStatus: "drafting",
    })).toBe(true)
  })

  it("blocks on ready when not pending validation", () => {
    expect(shouldAutoOpenSettledArtifactFallback({
      chatStatus: "ready",
      optimisticPendingValidation: false,
      stageStatus: "drafting",
    })).toBe(false)
  })

  it("allows on error when pending_validation (recovery path)", () => {
    expect(shouldAutoOpenSettledArtifactFallback({
      chatStatus: "error",
      optimisticPendingValidation: false,
      stageStatus: "pending_validation",
    })).toBe(true)
  })
})

describe("isValidationPanelEligible (production gate)", () => {
  // Tests the ACTUAL exported function used in the ChatWindow render gate.
  // If the render condition changes, these tests will fail — preventing
  // silent regressions in the reveal sequencing invariant.

  it("blocks during streaming even if stageStatus=pending_validation", () => {
    expect(isValidationPanelEligible({
      chatStatus: "streaming",
      artifactRevealDone: true,
      stageStatus: "pending_validation",
      optimisticPendingValidation: false,
    })).toBe(false)
  })

  it("blocks when artifact reveal is pending", () => {
    expect(isValidationPanelEligible({
      chatStatus: "ready",
      artifactRevealDone: false,
      stageStatus: "pending_validation",
      optimisticPendingValidation: false,
    })).toBe(false)
  })

  it("allows after artifact reveal completes", () => {
    expect(isValidationPanelEligible({
      chatStatus: "ready",
      artifactRevealDone: true,
      stageStatus: "pending_validation",
      optimisticPendingValidation: true,
    })).toBe(true)
  })

  it("allows immediately when no artifact (artifactRevealDone default true)", () => {
    expect(isValidationPanelEligible({
      chatStatus: "ready",
      artifactRevealDone: true,
      stageStatus: "drafting",
      optimisticPendingValidation: true,
    })).toBe(true)
  })

  it("blocks when neither pending source is true", () => {
    expect(isValidationPanelEligible({
      chatStatus: "ready",
      artifactRevealDone: true,
      stageStatus: "drafting",
      optimisticPendingValidation: false,
    })).toBe(false)
  })

  it("double gate: streaming + artifactRevealDone=false both block", () => {
    expect(isValidationPanelEligible({
      chatStatus: "streaming",
      artifactRevealDone: false,
      stageStatus: "pending_validation",
      optimisticPendingValidation: true,
    })).toBe(false)
  })
})
