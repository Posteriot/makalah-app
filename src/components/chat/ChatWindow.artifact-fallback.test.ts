import { describe, expect, it } from "vitest"
import { shouldAutoOpenSettledArtifactFallback } from "./ChatWindow"

describe("shouldAutoOpenSettledArtifactFallback", () => {
  it("menolak auto-open saat turn masih submitted atau streaming", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "submitted",
        optimisticPendingValidation: true,
        stageStatus: "pending_validation",
      })
    ).toBe(false)

    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "streaming",
        optimisticPendingValidation: true,
        stageStatus: "pending_validation",
      })
    ).toBe(false)
  })

  it("mengizinkan fallback hanya setelah turn settled", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "ready",
        optimisticPendingValidation: true,
        stageStatus: "drafting",
      })
    ).toBe(true)

    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "ready",
        optimisticPendingValidation: false,
        stageStatus: "pending_validation",
      })
    ).toBe(true)
  })

  it("tetap menolak saat turn settled tapi belum ada sinyal validation", () => {
    expect(
      shouldAutoOpenSettledArtifactFallback({
        chatStatus: "ready",
        optimisticPendingValidation: false,
        stageStatus: "drafting",
      })
    ).toBe(false)
  })
})
