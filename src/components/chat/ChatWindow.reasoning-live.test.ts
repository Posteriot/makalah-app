import { describe, expect, it } from "vitest"
import type { UIMessage } from "ai"
import { extractLiveReasoningSnapshot, extractReasoningTraceMode, resolveLiveReasoningHeadline } from "./ChatWindow"

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

  it("memprioritaskan live snapshot atas legacy thought saat menentukan headline", () => {
    const message = {
      id: "assistant-3",
      role: "assistant",
      parts: [
        {
          type: "data-reasoning-thought",
          data: {
            traceId: "trace-3",
            delta: "Legacy thought lama.",
            ts: 1,
          },
        },
        {
          type: "data-reasoning-live",
          data: {
            traceId: "trace-3",
            text: "Live snapshot terbaru.",
            ts: 2,
          },
        },
      ],
    } as unknown as UIMessage

    expect(resolveLiveReasoningHeadline(message)).toBe("Live snapshot terbaru.")
  })

  it("fallback ke legacy thought saat live snapshot belum ada", () => {
    const message = {
      id: "assistant-4",
      role: "assistant",
      parts: [
        {
          type: "data-reasoning-thought",
          data: {
            traceId: "trace-4",
            delta: "Legacy thought fallback.",
            ts: 1,
          },
        },
      ],
    } as unknown as UIMessage

    expect(resolveLiveReasoningHeadline(message)).toBe("Legacy thought fallback.")
  })

  it("tetap mengambil legacy thought terakhir saat belum ada live signal", () => {
    const message = {
      id: "assistant-legacy-last",
      role: "assistant",
      parts: [
        {
          type: "data-reasoning-thought",
          data: {
            traceId: "trace-legacy-last",
            delta: "Thought lama.",
            ts: 1,
          },
        },
        {
          type: "data-reasoning-thought",
          data: {
            traceId: "trace-legacy-last",
            delta: "Thought terbaru.",
            ts: 2,
          },
        },
      ],
    } as unknown as UIMessage

    expect(resolveLiveReasoningHeadline(message)).toBe("Thought terbaru.")
  })

  it("menghapus headline lama setelah live reset agar compat thought dari attempt gagal tidak bocor", () => {
    const message = {
      id: "assistant-5",
      role: "assistant",
      parts: [
        {
          type: "data-reasoning-thought",
          data: {
            traceId: "trace-5",
            delta: "Thought attempt awal yang gagal.",
            ts: 1,
          },
        },
        {
          type: "data-reasoning-live",
          data: {
            traceId: "trace-5",
            text: "Snapshot awal yang salah.",
            ts: 2,
          },
        },
        {
          type: "data-reasoning-live",
          data: {
            traceId: "trace-5",
            text: "",
            ts: 3,
            reset: true,
          },
        },
      ],
    } as unknown as UIMessage

    expect(extractLiveReasoningSnapshot(message)).toBeNull()
    expect(resolveLiveReasoningHeadline(message)).toBeNull()
  })

  it("tetap mengenali curated mode dari persisted trace", () => {
    const message = {
      id: "assistant-6",
      role: "assistant",
      parts: [],
      reasoningTrace: {
        traceMode: "curated",
      },
    } as unknown as UIMessage

    expect(extractReasoningTraceMode(message, [], null)).toBe("curated")
  })
})
