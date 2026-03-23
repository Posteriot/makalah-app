import { describe, expect, it, vi, afterEach } from "vitest"
import { createCuratedTraceController } from "./curated-trace"

describe("createCuratedTraceController", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("menyimpan durationSeconds di persisted snapshot setelah finalize", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-23T04:37:08.000Z"))

    const controller = createCuratedTraceController({
      enabled: true,
      traceId: "trace-1",
      mode: "paper",
      webSearchEnabled: false,
    })

    vi.setSystemTime(new Date("2026-03-23T04:37:18.200Z"))
    controller.finalize({
      outcome: "done",
      sourceCount: 0,
    })

    const snapshot = controller.getPersistedSnapshot()

    expect(snapshot.durationSeconds).toBe(10.2)
  })

  it("memprioritaskan startedAt eksternal agar durasi konsisten lintas client dan server", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-23T04:43:23.000Z"))

    const controller = createCuratedTraceController({
      enabled: true,
      traceId: "trace-2",
      mode: "normal",
      webSearchEnabled: false,
      startedAt: new Date("2026-03-23T04:43:12.100Z").getTime(),
    })

    controller.finalize({
      outcome: "done",
      sourceCount: 0,
    })

    const snapshot = controller.getPersistedSnapshot()

    expect(snapshot.durationSeconds).toBe(10.9)
  })
})
