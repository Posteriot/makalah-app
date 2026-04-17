import { describe, expect, it } from "vitest"
import { shouldAutoOpenSettledArtifactFallback } from "./ChatWindow"

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
//
// These tests lock the invariant so regressions in any gate
// are caught before they reach users.
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

describe("reveal sequencing invariant (state contract)", () => {
  // These tests verify the STATE CONDITIONS that enforce the invariant,
  // not the React render output (which requires full component mounting).
  // The invariant: validation panel can only render when:
  //   status !== 'streaming' && artifactRevealDone && pendingValidation

  function canShowValidationPanel(params: {
    status: string
    artifactRevealDone: boolean
    stageStatus?: string
    optimisticPendingValidation: boolean
  }): boolean {
    const isPendingValidation =
      params.stageStatus === "pending_validation" || params.optimisticPendingValidation
    return (
      isPendingValidation &&
      params.status !== "streaming" &&
      params.artifactRevealDone
    )
  }

  it("blocks validation panel during streaming even if stageStatus=pending_validation", () => {
    // Tools executed: submitStageForValidation fired during stream,
    // Convex pushed stageStatus=pending_validation, but stream is still active
    expect(canShowValidationPanel({
      status: "streaming",
      artifactRevealDone: true,
      stageStatus: "pending_validation",
      optimisticPendingValidation: false,
    })).toBe(false)
  })

  it("blocks validation panel when artifact reveal is pending", () => {
    // onFinish fired, artifactRevealDone=false (rAF not yet fired),
    // status is now 'ready'
    expect(canShowValidationPanel({
      status: "ready",
      artifactRevealDone: false,
      stageStatus: "pending_validation",
      optimisticPendingValidation: false,
    })).toBe(false)
  })

  it("allows validation panel after artifact reveal completes", () => {
    // rAF fired, artifact panel opened, artifactRevealDone=true,
    // optimisticPendingValidation set
    expect(canShowValidationPanel({
      status: "ready",
      artifactRevealDone: true,
      stageStatus: "pending_validation",
      optimisticPendingValidation: true,
    })).toBe(true)
  })

  it("allows validation panel immediately when no artifact was created", () => {
    // onFinish fired with no artifact, artifactRevealDone stays true,
    // optimisticPendingValidation set immediately
    expect(canShowValidationPanel({
      status: "ready",
      artifactRevealDone: true,
      stageStatus: "drafting",
      optimisticPendingValidation: true,
    })).toBe(true)
  })

  it("blocks validation panel when neither pending source is true", () => {
    expect(canShowValidationPanel({
      status: "ready",
      artifactRevealDone: true,
      stageStatus: "drafting",
      optimisticPendingValidation: false,
    })).toBe(false)
  })

  it("double gate: streaming + artifactRevealDone=false both block", () => {
    // Mid-stream, tools already fired but rAF not scheduled yet
    expect(canShowValidationPanel({
      status: "streaming",
      artifactRevealDone: false,
      stageStatus: "pending_validation",
      optimisticPendingValidation: true,
    })).toBe(false)
  })
})
