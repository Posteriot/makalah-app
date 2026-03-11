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
  PaperSessionsManagerPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="paper-sessions-manager-panel">
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
})
