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

  function makeSnapshotRecord(revision: number, title: string) {
    return {
      _id: `snapshot_${revision}`,
      revision,
      isAvailable: true,
      title,
      titleSource: "paper_title",
      sections: [],
      pageEstimate: 1,
      status: "growing",
      sourceArtifactRefs: [],
    }
  }

  it("membaca availability, latest snapshot, view state, dan viewed snapshot lalu menurunkan updatePending", () => {
    mockUseQuery
      .mockReturnValueOnce({
        isAvailable: true,
        availableAtRevision: 4,
      })
      .mockReturnValueOnce(makeSnapshotRecord(4, "Judul Revisi 4"))
      .mockReturnValueOnce({
        _id: "view_1",
        lastViewedRevision: 3,
        viewedAt: 100,
      })
      .mockReturnValueOnce(makeSnapshotRecord(3, "Judul Revisi 3"))

    const { result } = renderHook(() =>
      useNaskah("paperSessions_1" as never),
    )

    expect(result.current.availability?.isAvailable).toBe(true)
    expect(result.current.latestSnapshot?.revision).toBe(4)
    expect(result.current.viewedSnapshot?.revision).toBe(3)
    expect(result.current.viewState?.lastViewedRevision).toBe(3)
    expect(result.current.updatePending).toBe(true)
  })

  it("viewedSnapshot di-skip ketika user belum punya view state", () => {
    mockUseQuery
      .mockReturnValueOnce({
        isAvailable: true,
        availableAtRevision: 4,
      })
      .mockReturnValueOnce(makeSnapshotRecord(4, "Judul Revisi 4"))
      .mockReturnValueOnce(null) // viewState is null = first visit
      .mockReturnValueOnce(undefined) // viewedSnapshot query would be skipped

    renderHook(() => useNaskah("paperSessions_1" as never))

    // Fourth call is the getSnapshotByRevision query; must be "skip" when
    // lastViewedRevision is undefined.
    expect(mockUseQuery).toHaveBeenNthCalledWith(4, expect.anything(), "skip")
  })

  it("skip semua query ketika sessionId belum ada", () => {
    renderHook(() => useNaskah(undefined))

    expect(mockUseQuery).toHaveBeenNthCalledWith(1, expect.anything(), "skip")
    expect(mockUseQuery).toHaveBeenNthCalledWith(2, expect.anything(), "skip")
    expect(mockUseQuery).toHaveBeenNthCalledWith(3, expect.anything(), "skip")
    expect(mockUseQuery).toHaveBeenNthCalledWith(4, expect.anything(), "skip")
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
    expect(mockUseQuery).toHaveBeenNthCalledWith(
      4,
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
      .mockReturnValueOnce(makeSnapshotRecord(4, "Judul Revisi 4"))
      .mockReturnValueOnce({
        _id: "view_1",
        lastViewedRevision: 3,
        viewedAt: 100,
      })
      .mockReturnValueOnce(makeSnapshotRecord(3, "Judul Revisi 3"))

    const { result } = renderHook(() =>
      useNaskah("paperSessions_1" as never),
    )

    await act(async () => {
      await result.current.markViewed()
    })

    expect(mockMarkViewedMutation).toHaveBeenCalledWith({
      sessionId: "paperSessions_1",
      revision: 4,
    })
  })
})
