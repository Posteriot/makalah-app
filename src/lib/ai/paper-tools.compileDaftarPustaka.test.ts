import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPaperTools } from "./paper-tools"
import { fetchMutation, fetchQuery } from "convex/nextjs"

vi.mock("ai", () => ({
  tool: (config: unknown) => config,
}))

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
}))

vi.mock("../convex/retry", () => ({
  retryQuery: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  retryMutation: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}))

type MockSession = {
  _id: string
  currentStage: string
}

const getCompileTool = () => {
  const tools = createPaperTools({
    userId: "user_1" as never,
    conversationId: "conv_1" as never,
  }) as Record<string, { execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>> }>

  return tools.compileDaftarPustaka
}

describe("createPaperTools.compileDaftarPustaka", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("mode preview: compile tanpa persist dan return sample incomplete max 5", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    const fetchMutationMock = vi.mocked(fetchMutation)

    fetchQueryMock.mockResolvedValue({
      _id: "session_preview",
      currentStage: "gagasan",
    } as MockSession)

    fetchMutationMock.mockResolvedValue({
      success: true,
      mode: "preview",
      stage: "gagasan",
      compiled: {
        entries: [
          { title: "A", isComplete: false, sourceStage: "gagasan" },
          { title: "B", isComplete: false, sourceStage: "topik" },
          { title: "C", isComplete: false, sourceStage: "pendahuluan" },
          { title: "D", isComplete: false, sourceStage: "tinjauan_literatur" },
          { title: "E", isComplete: false, sourceStage: "diskusi" },
          { title: "F", isComplete: false, sourceStage: "kesimpulan" },
        ],
        totalCount: 6,
        incompleteCount: 6,
        duplicatesMerged: 1,
      },
      warnings: ["preview kosong"],
    })

    const result = await getCompileTool().execute({ mode: "preview" })

    expect(result.success).toBe(true)
    expect(result.mode).toBe("preview")
    expect(result.totalCount).toBe(6)
    expect(result.incompleteCount).toBe(6)
    expect(result.duplicatesMerged).toBe(1)
    expect(result.warning).toContain("preview kosong")

    const samples = result.previewIncompleteSamples as Array<{ title: string }>
    expect(samples).toHaveLength(5)
    expect(samples[0]?.title).toBe("A")
    expect(samples[4]?.title).toBe("E")

    expect(fetchMutationMock).toHaveBeenCalledTimes(1)
    expect(fetchMutationMock.mock.calls[0]?.[1]).toMatchObject({
      sessionId: "session_preview",
      mode: "preview",
      includeWebSearchReferences: true,
    })
  })

  it("default mode persist (backward-compatible): compile + updateStageData", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    const fetchMutationMock = vi.mocked(fetchMutation)

    fetchQueryMock.mockResolvedValue({
      _id: "session_persist",
      currentStage: "daftar_pustaka",
    } as MockSession)

    fetchMutationMock
      .mockResolvedValueOnce({
        success: true,
        mode: "persist",
        stage: "daftar_pustaka",
        compiled: {
          entries: [{ title: "Ref 1", isComplete: true }],
          totalCount: 1,
          incompleteCount: 0,
          duplicatesMerged: 0,
        },
        warnings: [],
      })
      .mockResolvedValueOnce({})

    const result = await getCompileTool().execute({
      ringkasan: "Total 1 referensi lengkap",
      ringkasanDetail: "Tidak ada duplikat",
    })

    expect(result.success).toBe(true)
    expect(result.mode).toBe("persist")
    expect(result.totalCount).toBe(1)

    expect(fetchMutationMock).toHaveBeenCalledTimes(2)
    expect(fetchMutationMock.mock.calls[0]?.[1]).toMatchObject({
      sessionId: "session_persist",
      mode: "persist",
      includeWebSearchReferences: true,
    })

    expect(fetchMutationMock.mock.calls[1]?.[1]).toMatchObject({
      sessionId: "session_persist",
      stage: "daftar_pustaka",
      data: {
        ringkasan: "Total 1 referensi lengkap",
        ringkasanDetail: "Tidak ada duplikat",
        entries: [{ title: "Ref 1", isComplete: true }],
        totalCount: 1,
        incompleteCount: 0,
        duplicatesMerged: 0,
      },
    })
  })

  it("mode persist wajib ringkasan", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    const fetchMutationMock = vi.mocked(fetchMutation)

    fetchQueryMock.mockResolvedValue({
      _id: "session_missing_ringkasan",
      currentStage: "daftar_pustaka",
    } as MockSession)

    const result = await getCompileTool().execute({ mode: "persist" })

    expect(result.success).toBe(false)
    expect(result.error).toContain("butuh field ringkasan")
    expect(fetchMutationMock).not.toHaveBeenCalled()
  })
})
