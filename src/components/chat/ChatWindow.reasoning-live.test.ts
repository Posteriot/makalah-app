import { describe, expect, it } from "vitest"
import type { UIMessage } from "ai"
import { extractLiveReasoningSnapshot } from "./ChatWindow"

describe("extractLiveReasoningSnapshot", () => {
  it("memprioritaskan snapshot live terakhir yang tidak kosong", () => {
    const message = {
      id: "assistant-1",
      role: "assistant",
      parts: [
        {
          type: "data-reasoning-live",
          data: {
            traceId: "trace-1",
            text: "Memetakan konteks awal.",
            ts: 1,
          },
        },
        {
          type: "data-reasoning-live",
          data: {
            traceId: "trace-1",
            text: "Memetakan konteks awal lalu memverifikasi asumsi.",
            ts: 2,
          },
        },
      ],
    } as unknown as UIMessage

    expect(extractLiveReasoningSnapshot(message)).toBe(
      "Memetakan konteks awal lalu memverifikasi asumsi."
    )
  })

  it("mengabaikan snapshot live kosong", () => {
    const message = {
      id: "assistant-2",
      role: "assistant",
      parts: [
        {
          type: "data-reasoning-live",
          data: {
            traceId: "trace-2",
            text: "   ",
            ts: 1,
          },
        },
      ],
    } as unknown as UIMessage

    expect(extractLiveReasoningSnapshot(message)).toBeNull()
  })
})
