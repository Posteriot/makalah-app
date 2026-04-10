import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useNaskah } from "./useNaskah"

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockMarkViewedMutation = vi.fn()
const mockUseCurrentUser = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

describe("useNaskah", () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUseMutation.mockReset()
    mockMarkViewedMutation.mockReset()
    mockUseCurrentUser.mockReset()

    mockUseCurrentUser.mockReturnValue({
      user: { _id: "users_1" },
      isLoading: false,
    })

    mockUseMutation.mockReturnValue(mockMarkViewedMutation)
  })

  it("membaca availability, latest snapshot, dan view state lalu menurunkan updatePending", () => {
    mockUseQuery
      .mockReturnValueOnce({
        isAvailable: true,
        availableAtRevision: 4,
      })
      .mockReturnValueOnce({
        _id: "snapshot_4",
        revision: 4,
        isAvailable: true,
        title: "Judul Naskah",
        titleSource: "paper_title",
        sections: [],
        pageEstimate: 1,
        status: "growing",
        sourceArtifactRefs: [],
      })
      .mockReturnValueOnce({
        _id: "view_1",
        lastViewedRevision: 3,
        viewedAt: 100,
      })

    const { result } = renderHook(() =>
      useNaskah("paperSessions_1" as never),
    )

    expect(result.current.availability?.isAvailable).toBe(true)
    expect(result.current.latestSnapshot?.revision).toBe(4)
    expect(result.current.viewState?.lastViewedRevision).toBe(3)
    expect(result.current.updatePending).toBe(true)
  })

  it("skip query ketika sessionId belum ada", () => {
    renderHook(() => useNaskah(undefined))

    expect(mockUseQuery).toHaveBeenNthCalledWith(1, expect.anything(), "skip")
    expect(mockUseQuery).toHaveBeenNthCalledWith(2, expect.anything(), "skip")
    expect(mockUseQuery).toHaveBeenNthCalledWith(3, expect.anything(), "skip")
  })

  it("skip view-state query ketika user belum siap", () => {
    mockUseCurrentUser.mockReturnValue({
      user: null,
      isLoading: true,
    })

    renderHook(() => useNaskah("paperSessions_1" as never))

    expect(mockUseQuery).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      "skip",
    )
    expect(mockUseQuery).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      "skip",
    )
    expect(mockUseQuery).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      "skip",
    )
  })

  it("markViewed terikat ke sessionId, userId, dan latest revision", async () => {
    mockUseQuery
      .mockReturnValueOnce({
        isAvailable: true,
        availableAtRevision: 4,
      })
      .mockReturnValueOnce({
        _id: "snapshot_4",
        revision: 4,
        isAvailable: true,
        title: "Judul Naskah",
        titleSource: "paper_title",
        sections: [],
        pageEstimate: 1,
        status: "growing",
        sourceArtifactRefs: [],
      })
      .mockReturnValueOnce({
        _id: "view_1",
        lastViewedRevision: 3,
        viewedAt: 100,
      })

    const { result } = renderHook(() =>
      useNaskah("paperSessions_1" as never),
    )

    await act(async () => {
      await result.current.markViewed()
    })

    expect(mockMarkViewedMutation).toHaveBeenCalledWith({
      sessionId: "paperSessions_1",
      userId: "users_1",
      revision: 4,
    })
  })
})
