import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatLayout } from "./ChatLayout"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

vi.mock("@/lib/hooks/useConversations", () => ({
  useConversations: () => ({
    conversations: [],
    totalConversationCount: 0,
    createNewConversation: vi.fn(),
    deleteConversation: vi.fn(),
    updateConversationTitle: vi.fn(),
    isLoading: false,
  }),
}))

vi.mock("../shell/ActivityBar", () => ({
  ActivityBar: () => <div data-testid="activity-bar" />,
}))

vi.mock("../shell/TopBar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}))

vi.mock("@/components/ui/PanelResizer", () => ({
  PanelResizer: () => <div data-testid="panel-resizer" />,
}))

vi.mock("../workspace-panel/ConversationManagerPanel", () => ({
  ConversationManagerPanel: () => <div data-testid="conversation-manager-panel">conversation-manager</div>,
}))

vi.mock("../workspace-panel/PaperSessionsManagerPanel", () => ({
  PaperSessionsManagerPanel: ({
    onClose,
    onArtifactSelect,
    initialView,
    initialSessionId,
    onSelectionChange,
  }: {
    onClose: () => void
    onArtifactSelect?: (artifactId: string, opts?: Record<string, unknown>) => void
    initialView?: "root" | "session-folder"
    initialSessionId?: string | null
    onSelectionChange?: (selection: { view: "root" } | { view: "session-folder"; sessionId: string; sessionTitle: string }) => void
  }) => (
    <div data-testid="paper-sessions-manager-panel">
      <div data-testid="paper-panel-state">
        {initialView ?? "root"}:{initialSessionId ?? "none"}
      </div>
      <button
        type="button"
        onClick={() =>
          onSelectionChange?.({
            view: "session-folder",
            sessionId: "session-other",
            sessionTitle: "Draft lain",
          })
        }
      >
        pilih folder draft lain
      </button>
      <button
        type="button"
        onClick={() =>
          onArtifactSelect?.("artifact-2", {
            readOnly: true,
            origin: "paper-session-manager-folder",
            originSessionId: "session-other",
            originSessionTitle: "Draft lain",
            sourceConversationId: "conversation-other",
            sourceKind: "artifact",
            title: "Pendahuluan",
            type: "section",
          })
        }
      >
        buka artifact folder
      </button>
      <button type="button" onClick={onClose}>
        tutup panel sesi paper
      </button>
      paper-sessions-manager
    </div>
  ),
}))

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("../ChatSidebar", () => ({
  ChatSidebar: ({
    onOpenPaperSessionsManager,
  }: {
    onOpenPaperSessionsManager?: () => void
  }) => (
    <div>
      <button type="button" onClick={() => onOpenPaperSessionsManager?.()}>
        buka panel sesi paper
      </button>
    </div>
  ),
}))

describe("ChatLayout workspace panel orchestration", () => {
  beforeEach(() => {
    mockPush.mockReset()
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it("membuka panel sesi paper dan menyembunyikan artifact sementara", () => {
    render(
      <ChatLayout
        conversationId="conversation-active"
        isArtifactPanelOpen={true}
        artifactPanel={<div data-testid="artifact-panel">artifact-panel</div>}
        activeArtifactId={"artifact-1" as never}
        artifactCount={1}
      >
        <div>chat-window</div>
      </ChatLayout>
    )

    expect(screen.getByTestId("artifact-panel")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /buka panel sesi paper/i })[0])

    expect(screen.getByTestId("paper-sessions-manager-panel")).toBeInTheDocument()
    expect(screen.queryByTestId("artifact-panel")).not.toBeInTheDocument()
  })

  it("menutup panel sesi paper dan memulihkan artifact panel", () => {
    render(
      <ChatLayout
        conversationId="conversation-active"
        isArtifactPanelOpen={true}
        artifactPanel={<div data-testid="artifact-panel">artifact-panel</div>}
        onArtifactPanelToggle={vi.fn()}
        activeArtifactId={"artifact-1" as never}
        artifactCount={1}
      >
        <div>chat-window</div>
      </ChatLayout>
    )

    fireEvent.click(screen.getAllByRole("button", { name: /buka panel sesi paper/i })[0])
    fireEvent.click(screen.getByRole("button", { name: /tutup panel sesi paper/i }))

    expect(screen.getByTestId("artifact-panel")).toBeInTheDocument()
  })

  it("memulihkan panel sesi paper ke folder yang sama saat kembali dari artifact", () => {
    const MockArtifactPanel = ({
      onReturnToPaperSession,
    }: {
      onReturnToPaperSession?: () => void
    }) => (
      <div data-testid="artifact-panel">
        <button type="button" onClick={() => onReturnToPaperSession?.()}>
          kembali ke folder paper
        </button>
      </div>
    )

    render(
      <ChatLayout
        conversationId="conversation-active"
        isArtifactPanelOpen={true}
        onArtifactPanelToggle={vi.fn()}
        onArtifactSelect={vi.fn()}
        artifactPanel={<MockArtifactPanel />}
        activeArtifactId={"artifact-1" as never}
        artifactCount={1}
      >
        <div>chat-window</div>
      </ChatLayout>
    )

    fireEvent.click(screen.getAllByRole("button", { name: /buka panel sesi paper/i })[0])
    fireEvent.click(screen.getByRole("button", { name: /pilih folder draft lain/i }))
    fireEvent.click(screen.getByRole("button", { name: /buka artifact folder/i }))

    expect(screen.getByTestId("artifact-panel")).toBeInTheDocument()
    expect(screen.queryByTestId("paper-sessions-manager-panel")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /kembali ke folder paper/i }))

    expect(screen.getByTestId("paper-sessions-manager-panel")).toBeInTheDocument()
    expect(screen.getByTestId("paper-panel-state")).toHaveTextContent("session-folder:session-other")
  })

  it("memulihkan panel sesi paper ke root saat kembali ke semua sesi", () => {
    const MockArtifactPanel = ({
      onReturnToPaperRoot,
    }: {
      onReturnToPaperRoot?: () => void
    }) => (
      <div data-testid="artifact-panel">
        <button type="button" onClick={() => onReturnToPaperRoot?.()}>
          kembali ke semua sesi paper
        </button>
      </div>
    )

    render(
      <ChatLayout
        conversationId="conversation-active"
        isArtifactPanelOpen={true}
        onArtifactPanelToggle={vi.fn()}
        onArtifactSelect={vi.fn()}
        artifactPanel={<MockArtifactPanel />}
        activeArtifactId={"artifact-1" as never}
        artifactCount={1}
      >
        <div>chat-window</div>
      </ChatLayout>
    )

    fireEvent.click(screen.getAllByRole("button", { name: /buka panel sesi paper/i })[0])
    fireEvent.click(screen.getByRole("button", { name: /pilih folder draft lain/i }))
    fireEvent.click(screen.getByRole("button", { name: /buka artifact folder/i }))
    fireEvent.click(screen.getByRole("button", { name: /kembali ke semua sesi paper/i }))

    expect(screen.getByTestId("paper-sessions-manager-panel")).toBeInTheDocument()
    expect(screen.getByTestId("paper-panel-state")).toHaveTextContent("root:none")
  })
})
