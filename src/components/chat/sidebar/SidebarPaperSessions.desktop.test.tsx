import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SidebarPaperSessions } from "./SidebarPaperSessions"

const mockUseQuery = vi.fn()
const mockUsePaperSession = vi.fn()
const mockUseCurrentUser = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("@/lib/hooks/usePaperSession", () => ({
  usePaperSession: (...args: unknown[]) => mockUsePaperSession(...args),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: (...args: unknown[]) => mockUseCurrentUser(...args),
}))

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe("SidebarPaperSessions desktop", () => {
  const activeSession = {
    _id: "session-active",
    conversationId: "conversation-active",
    workingTitle: "Draft aktif",
    paperTitle: undefined,
    currentStage: "topik",
    stageStatus: "drafting",
    _creationTime: 1,
    updatedAt: 10,
  }

  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUseCurrentUser.mockReturnValue({
      user: { _id: "user-1" },
      isLoading: false,
    })

    mockUsePaperSession.mockReturnValue({
      session: activeSession,
      isPaperMode: true,
      currentStage: "topik",
      isLoading: false,
      updateWorkingTitle: vi.fn(),
    })

    let userScopedQueryCount = 0
    mockUseQuery.mockImplementation((queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined

      if (typeof args === "object" && args !== null && "userId" in args) {
        userScopedQueryCount += 1
        if (userScopedQueryCount === 1) {
          return [
            activeSession,
            {
              _id: "session-other",
              conversationId: "conversation-other",
              workingTitle: "Draft lain",
              paperTitle: undefined,
              currentStage: "outline",
              stageStatus: "drafting",
              _creationTime: 2,
              updatedAt: 20,
            },
          ]
        }

        return [
          {
            _id: "artifact-1",
            title: "Pendahuluan",
            type: "section",
            version: 1,
            conversationId: "conversation-active",
            createdAt: 1,
          },
        ]
      }

      if (typeof args === "object" && args !== null && "conversationId" in args) {
        return { title: "Percakapan aktif" }
      }

      return undefined
    })
  })

  it("menampilkan trigger settings dan tidak lagi merender section sesi lainnya", () => {
    const onOpenPaperSessionsManager = vi.fn()

    render(
      <SidebarPaperSessions
        currentConversationId="conversation-active"
        onOpenPaperSessionsManager={onOpenPaperSessionsManager}
      />
    )

    const trigger = screen.getByRole("button", { name: /buka panel sesi paper/i })
    fireEvent.click(trigger)

    expect(onOpenPaperSessionsManager).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Sesi Lainnya")).not.toBeInTheDocument()
  })

  it("tetap merender sesi aktif pada sidebar", () => {
    render(
      <SidebarPaperSessions
        currentConversationId="conversation-active"
        onOpenPaperSessionsManager={vi.fn()}
      />
    )

    expect(screen.getByText("Sesi Paper")).toBeInTheDocument()
    expect(screen.getByText(/Folder Artifak/i)).toBeInTheDocument()
    expect(screen.getByText("Draft_aktif")).toBeInTheDocument()
  })

  it("menampilkan loading artifak saat query artifak belum selesai", () => {
    let userScopedQueryCount = 0
    mockUseQuery.mockImplementation((queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined

      if (typeof args === "object" && args !== null && "userId" in args) {
        userScopedQueryCount += 1
        if (userScopedQueryCount === 1) {
          return [activeSession]
        }

        return undefined
      }

      if (typeof args === "object" && args !== null && "conversationId" in args) {
        return { title: "Percakapan aktif" }
      }

      return undefined
    })

    render(
      <SidebarPaperSessions
        currentConversationId="conversation-active"
        onOpenPaperSessionsManager={vi.fn()}
      />
    )

    expect(screen.getByText(/memuat artifak/i)).toBeInTheDocument()
  })

  it("mengirim origin paper-active-session saat artifact sesi aktif diklik", () => {
    const onArtifactSelect = vi.fn()

    render(
      <SidebarPaperSessions
        currentConversationId="conversation-active"
        onOpenPaperSessionsManager={vi.fn()}
        onArtifactSelect={onArtifactSelect}
      />
    )

    fireEvent.click(screen.getByText("Pendahuluan"))

    expect(onArtifactSelect).toHaveBeenCalledWith("artifact-1", {
      title: "Pendahuluan",
      type: "section",
      origin: "paper-active-session",
      originSessionId: "session-active",
      originSessionTitle: "Draft aktif",
      sourceConversationId: "conversation-active",
      sourceKind: "artifact",
    })
  })
})
