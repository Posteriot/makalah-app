import { describe, expect, it } from "vitest"
import type { UIMessage } from "ai"
import { extractReasoningDurationSeconds, resolveProcessElapsedSeconds } from "./ChatWindow"

describe("extractReasoningDurationSeconds", () => {
  it("memprioritaskan data-reasoning-duration dari stream hidup", () => {
    const message = {
      id: "assistant-live",
      role: "assistant",
      parts: [
        {
          type: "data-reasoning-duration",
          data: { seconds: 10.274 },
        },
      ],
      reasoningTrace: {
        durationSeconds: 11.6,
      },
    } as unknown as UIMessage

    expect(extractReasoningDurationSeconds(message)).toBe(10.274)
  })

  it("fallback ke reasoningTrace duration saat data part tidak ada", () => {
    const message = {
      id: "assistant-persisted",
      role: "assistant",
      parts: [],
      reasoningTrace: {
        durationSeconds: 8.995,
      },
    } as unknown as UIMessage

    expect(extractReasoningDurationSeconds(message)).toBe(8.995)
  })

  it("memaksa final elapsed pakai persisted duration saat sudah tersedia", () => {
    expect(resolveProcessElapsedSeconds(13.3, 11.758)).toBe(11.758)
  })

  it("tetap pakai live elapsed kalau persisted duration belum ada", () => {
    expect(resolveProcessElapsedSeconds(13.3)).toBe(13.3)
  })
})
