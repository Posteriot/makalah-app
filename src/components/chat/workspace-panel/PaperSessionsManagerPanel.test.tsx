import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PaperSessionsManagerPanel } from "./PaperSessionsManagerPanel"

const mockUseCurrentUser = vi.fn()
const mockUsePaperSession = vi.fn()
const mockUseQuery = vi.fn()
const mockPush = vi.fn()

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: (...args: unknown[]) => mockUseCurrentUser(...args),
}))

vi.mock("@/lib/hooks/usePaperSession", () => ({
  usePaperSession: (...args: unknown[]) => mockUsePaperSession(...args),
}))

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe("PaperSessionsManagerPanel", () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockUseQuery.mockReset()
    mockUseCurrentUser.mockReturnValue({
      user: { _id: "user-1" },
      isLoading: false,
    })
    let callCount = 0
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined
      callCount += 1
      if (callCount === 1) {
        return []
      }
      if (callCount === 2) {
        return []
      }
      return undefined
    })
  })

  it("menampilkan empty state sidebar saat tidak ada sesi sama sekali", () => {
    mockUsePaperSession.mockReturnValue({
      session: undefined,
      isLoading: false,
    })

    render(
      <PaperSessionsManagerPanel
        currentConversationId={null}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText("Sesi Paper Lainnya")).toBeInTheDocument()
    expect(screen.getByText("Belum ada sesi penyusunan paper.")).toBeInTheDocument()
    expect(screen.queryByText("Memuat sesi paper...")).not.toBeInTheDocument()
  })

  it("menampilkan empty state sidebar saat tidak ada sesi nonaktif", () => {
    mockUsePaperSession.mockReturnValue({
      session: {
        _id: "session-active",
      },
      isLoading: false,
    })

    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined
      if (typeof args === "object" && args !== null && "userId" in args) {
        return [
          {
            _id: "session-active",
            conversationId: "conversation-active",
            currentStage: "topik",
          },
        ]
      }
      return undefined
    })

    render(
      <PaperSessionsManagerPanel
        currentConversationId="conversation-active"
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText("Belum ada sesi penyusunan paper.")).toBeInTheDocument()
    expect(screen.queryByText("Memuat sesi paper...")).not.toBeInTheDocument()
  })

  it("membuka detail sesi di dalam panel, lalu artifact readonly yang dapat diklik", () => {
    const onArtifactSelect = vi.fn()
    const onClose = vi.fn()

    mockUsePaperSession.mockReturnValue({
      session: {
        _id: "session-active",
      },
      isLoading: false,
    })

    let callCount = 0
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined
      callCount += 1
      if (callCount === 1 || callCount === 4) {
        return [
          {
            _id: "session-active",
            conversationId: "conversation-active",
            currentStage: "topik",
          },
          {
            _id: "session-other",
            conversationId: "conversation-other",
            workingTitle: "Draft lain",
            currentStage: "outline",
          },
        ]
      }
      if (callCount === 2 || callCount === 5) {
        return [
          {
            _id: "artifact-1",
            title: "Pendahuluan",
            type: "section",
            version: 1,
            conversationId: "conversation-other",
            createdAt: 1,
          },
        ]
      }
      if (typeof args === "object" && args !== null && "conversationId" in args) {
        return { title: "Percakapan sumber" }
      }

      return undefined
    })

    render(
      <PaperSessionsManagerPanel
        currentConversationId="conversation-active"
        onClose={onClose}
        onArtifactSelect={onArtifactSelect}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /buka sesi paper draft lain/i }))

    expect(screen.getByText("Pendahuluan")).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /buka artifak pendahuluan/i }))

    expect(onArtifactSelect).toHaveBeenCalledWith("artifact-1", {
      readOnly: true,
      sourceConversationId: "conversation-other",
      origin: "paper-session-manager-folder",
      originSessionId: "session-other",
      originSessionTitle: "Draft lain",
      sourceKind: "artifact",
      title: "Pendahuluan",
      type: "section",
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("menampilkan status loading saat query artifak belum selesai", () => {
    mockUsePaperSession.mockReturnValue({
      session: {
        _id: "session-active",
      },
      isLoading: false,
    })

    let callCount = 0
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined
      callCount += 1
      if (callCount === 1) {
        return [
          {
            _id: "session-active",
            conversationId: "conversation-active",
            currentStage: "topik",
          },
          {
            _id: "session-other",
            conversationId: "conversation-other",
            workingTitle: "Draft lain",
            currentStage: "outline",
          },
        ]
      }
      if (callCount === 2) {
        return undefined
      }

      if (typeof args === "object" && args !== null && "conversationId" in args) {
        return { title: "Percakapan sumber" }
      }

      return undefined
    })

    render(
      <PaperSessionsManagerPanel
        currentConversationId="conversation-active"
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText("Memuat sesi paper...")).toBeInTheDocument()
  })
})
