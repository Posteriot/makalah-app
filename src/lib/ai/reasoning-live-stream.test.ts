import { describe, expect, it } from "vitest"
import { createReasoningLiveAccumulator } from "./reasoning-live-stream"

describe("createReasoningLiveAccumulator", () => {
  it("mengirim snapshot live dari buffer penuh dan menandai akhir stream", () => {
    let now = 1_000
    const accumulator = createReasoningLiveAccumulator({
      traceId: "trace-1",
      enabled: true,
      now: () => now,
      minEmitIntervalMs: 1_000,
      minGrowthChars: 1_000,
    })

    const firstPart = accumulator.onReasoningDelta("**Mulai** menimbang opsi.")
    expect(firstPart).not.toBeNull()
    expect(firstPart?.type).toBe("data-reasoning-live")
    expect(firstPart?.data.text).toBe("Mulai menimbang opsi.")
    expect(firstPart?.data.done).toBeUndefined()

    now += 10
    const suppressedPart = accumulator.onReasoningDelta(" lalu mempersempit jawaban.")
    expect(suppressedPart).toBeNull()

    now += 1_010
    const secondPart = accumulator.onReasoningDelta(" sambil mengecek asumsi.")
    expect(secondPart).not.toBeNull()
    expect(secondPart?.data.text).toContain("Mulai menimbang opsi.")
    expect(secondPart?.data.text).toContain("lalu mempersempit jawaban.")
    expect(secondPart?.data.text).toContain("sambil mengecek asumsi.")
    expect(secondPart?.data.done).toBeUndefined()

    expect(accumulator.getFullReasoning()).toBe(
      "**Mulai** menimbang opsi. lalu mempersempit jawaban. sambil mengecek asumsi."
    )
    expect(accumulator.hasReasoning()).toBe(true)

    const finalPart = accumulator.finalize()
    expect(finalPart).not.toBeNull()
    expect(finalPart?.type).toBe("data-reasoning-live")
    expect(finalPart?.data.text).toBe(secondPart?.data.text)
    expect(finalPart?.data.done).toBe(true)
  })
})
