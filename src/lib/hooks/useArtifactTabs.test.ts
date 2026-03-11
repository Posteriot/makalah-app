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
})
