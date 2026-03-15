import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useArtifactTabs } from "./useArtifactTabs"

describe("useArtifactTabs", () => {
  it("menyimpan metadata origin paper pada tab artifact", () => {
    const { result } = renderHook(() => useArtifactTabs())

    act(() => {
      result.current.openTab({
        id: "artifact-1" as never,
        title: "Pendahuluan",
        type: "section",
        origin: "paper-session-manager-folder",
        originSessionId: "session-1" as never,
        originSessionTitle: "AI & Personalisasi Pembelajaran Pendidikan Tinggi",
        sourceConversationId: "conversation-1" as never,
        sourceKind: "artifact",
      })
    })

    expect(result.current.openTabs[0]).toMatchObject({
      origin: "paper-session-manager-folder",
      originSessionId: "session-1",
      originSessionTitle: "AI & Personalisasi Pembelajaran Pendidikan Tinggi",
      sourceConversationId: "conversation-1",
      sourceKind: "artifact",
    })
  })

  it("memperbarui metadata origin saat artifact yang sama dibuka dari konteks paper lain", () => {
    const { result } = renderHook(() => useArtifactTabs())

    act(() => {
      result.current.openTab({
        id: "artifact-1" as never,
        title: "Pendahuluan",
        type: "section",
        origin: "chat",
      })
    })

    act(() => {
      result.current.openTab({
        id: "artifact-1" as never,
        title: "Pendahuluan",
        type: "section",
        origin: "paper-active-session",
        originSessionId: "session-active" as never,
        originSessionTitle: "Draft Aktif",
        sourceConversationId: "conversation-active" as never,
        sourceKind: "artifact",
      })
    })

    expect(result.current.openTabs[0]).toMatchObject({
      origin: "paper-active-session",
      originSessionId: "session-active",
      originSessionTitle: "Draft Aktif",
      sourceConversationId: "conversation-active",
      sourceKind: "artifact",
    })
  })

  it("memindahkan active tab ke tetangga kanan lalu kiri saat tab aktif ditutup", () => {
    const { result } = renderHook(() => useArtifactTabs())

    act(() => {
      result.current.openTab({
        id: "artifact-1" as never,
        title: "Satu",
        type: "section",
      })
      result.current.openTab({
        id: "artifact-2" as never,
        title: "Dua",
        type: "section",
      })
      result.current.openTab({
        id: "artifact-3" as never,
        title: "Tiga",
        type: "section",
      })
      result.current.setActiveTab("artifact-2" as never)
    })

    act(() => {
      result.current.closeTab("artifact-2" as never)
    })

    expect(result.current.openTabs.map((tab) => tab.id)).toEqual([
      "artifact-1",
      "artifact-3",
    ])
    expect(result.current.activeTabId).toBe("artifact-3")

    act(() => {
      result.current.closeTab("artifact-3" as never)
    })

    expect(result.current.activeTabId).toBe("artifact-1")
  })
})
