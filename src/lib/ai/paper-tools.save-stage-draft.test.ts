import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { createPaperTools } from "./paper-tools"

vi.mock("ai", () => ({
  tool: (config: unknown) => config,
}))

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
  fetchAction: vi.fn(),
}))

vi.mock("../convex/retry", () => ({
  retryQuery: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  retryMutation: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}))

type SaveStageDraftExecute = (input: { field: string; value: string }) => Promise<Record<string, unknown>>

const getSaveStageDraftExecute = (): SaveStageDraftExecute => {
  const tools = createPaperTools({
    userId: "user_1" as never,
    conversationId: "conv_1" as never,
    draftSaveGate: { active: true },
  }) as unknown as {
    saveStageDraft?: {
      execute?: SaveStageDraftExecute
    }
  }

  const execute = tools.saveStageDraft?.execute
  if (!execute) {
    throw new Error("saveStageDraft tool tidak punya execute handler")
  }

  return execute
}

describe("createPaperTools.saveStageDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("mendedupe concurrent draft saves dengan field dan value yang sama", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    const fetchMutationMock = vi.mocked(fetchMutation)

    fetchQueryMock.mockResolvedValue({
      _id: "session_1",
      currentStage: "gagasan",
      stageData: { gagasan: {} },
    })

    fetchMutationMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({}), 10)
        })
    )

    const execute = getSaveStageDraftExecute()

    const firstCall = execute({ field: "ideKasar", value: "Rumusan awal" })
    const secondCall = execute({ field: "ideKasar", value: "Rumusan awal" })

    const [firstResult, secondResult] = await Promise.all([firstCall, secondCall])

    expect(fetchMutationMock).toHaveBeenCalledTimes(1)
    expect(firstResult).toMatchObject({
      success: true,
      stage: "gagasan",
      field: "ideKasar",
    })
    expect(secondResult).toMatchObject({
      success: true,
      stage: "gagasan",
      field: "ideKasar",
    })
  })

  it("skip mutation saat nilai draft identik dengan stageData yang sudah tersimpan", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    const fetchMutationMock = vi.mocked(fetchMutation)

    fetchQueryMock.mockResolvedValue({
      _id: "session_1",
      currentStage: "gagasan",
      stageData: {
        gagasan: {
          ideKasar: "Rumusan awal",
        },
      },
    })

    const execute = getSaveStageDraftExecute()
    const result = await execute({ field: "ideKasar", value: "Rumusan awal" })

    expect(result).toMatchObject({
      success: true,
      stage: "gagasan",
      field: "ideKasar",
    })
    expect(fetchMutationMock).not.toHaveBeenCalled()
  })

  it("serializes concurrent saves for different fields — both fire, no parallel writes", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    const fetchMutationMock = vi.mocked(fetchMutation)

    fetchQueryMock.mockResolvedValue({
      _id: "session_1",
      currentStage: "gagasan",
      stageData: { gagasan: {} },
    })

    const callOrder: string[] = []
    fetchMutationMock.mockImplementation(
      (_api: unknown, args: Record<string, unknown>) =>
        new Promise((resolve) => {
          const data = args.data as Record<string, string>
          const field = Object.keys(data)[0]
          callOrder.push(`start:${field}`)
          setTimeout(() => {
            callOrder.push(`end:${field}`)
            resolve({})
          }, 10)
        })
    )

    const execute = getSaveStageDraftExecute()

    // Fire two different fields concurrently
    const [resultA, resultB] = await Promise.all([
      execute({ field: "ideKasar", value: "Ide awal" }),
      execute({ field: "analisis", value: "Analisis awal" }),
    ])

    // Both should succeed
    expect(resultA).toMatchObject({ success: true, field: "ideKasar" })
    expect(resultB).toMatchObject({ success: true, field: "analisis" })

    // Both mutations should fire (different fields = no dedup)
    expect(fetchMutationMock).toHaveBeenCalledTimes(2)

    // Queue serializes: first must finish before second starts
    expect(callOrder).toEqual([
      "start:ideKasar",
      "end:ideKasar",
      "start:analisis",
      "end:analisis",
    ])
  })

  it("queue recovers after first task fails — second task still executes", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    const fetchMutationMock = vi.mocked(fetchMutation)

    fetchQueryMock.mockResolvedValue({
      _id: "session_1",
      currentStage: "gagasan",
      stageData: { gagasan: {} },
    })

    let callCount = 0
    fetchMutationMock.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new Error("Convex OCC simulated failure"))
      }
      return Promise.resolve({})
    })

    const execute = getSaveStageDraftExecute()

    // First call will fail (OCC), second should still succeed
    const firstCall = execute({ field: "ideKasar", value: "Ide A" })
    const secondCall = execute({ field: "analisis", value: "Analisis B" })

    const firstResult = await firstCall
    const secondResult = await secondCall

    // First call fails gracefully (caught by try/catch in execute)
    expect(firstResult).toMatchObject({ success: false })

    // Second call succeeds — queue recovered from first failure
    expect(secondResult).toMatchObject({ success: true, field: "analisis" })

    // Both mutations were attempted
    expect(fetchMutationMock).toHaveBeenCalledTimes(2)
  })
})
