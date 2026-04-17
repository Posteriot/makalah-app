import { describe, expect, it } from "vitest"
import { shouldAutoOpenSettledArtifactFallback } from "./ChatWindow"

describe("shouldAutoOpenSettledArtifactFallback", () => {
  // ── Active states: must block ──

  it("blocks fallback during submitted (turn not yet streaming)", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "submitted",
        optimisticPendingValidation: true,
        stageStatus: "pending_validation",
      })
    ).toBe(false)
  })

  it("blocks fallback during streaming (turn still active)", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "streaming",
        optimisticPendingValidation: true,
        stageStatus: "pending_validation",
      })
    ).toBe(false)
  })

  it("blocks fallback when user manually stopped (partial artifact)", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "stopped",
        optimisticPendingValidation: true,
        stageStatus: "pending_validation",
      })
    ).toBe(false)
  })

  // ── Terminal states: allowed when validation signal present ──

  it("allows fallback on ready + optimistic pending validation", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "ready",
        optimisticPendingValidation: true,
        stageStatus: "drafting",
      })
    ).toBe(true)
  })

  it("allows fallback on ready + Convex stageStatus pending_validation", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "ready",
        optimisticPendingValidation: false,
        stageStatus: "pending_validation",
      })
    ).toBe(true)
  })

  it("allows fallback on error + pending signal (recovery path)", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "error",
        optimisticPendingValidation: false,
        stageStatus: "pending_validation",
      })
    ).toBe(true)

    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "error",
        optimisticPendingValidation: true,
        stageStatus: "drafting",
      })
    ).toBe(true)
  })

  // ── Terminal but no validation signal: must block ──

  it("blocks fallback on ready without any validation signal", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "ready",
        optimisticPendingValidation: false,
        stageStatus: "drafting",
      })
    ).toBe(false)
  })

  it("blocks fallback on error without any validation signal", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "error",
        optimisticPendingValidation: false,
        stageStatus: "drafting",
      })
    ).toBe(false)
  })
})
