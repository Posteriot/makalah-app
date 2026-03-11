import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeAll } from "vitest"
import { ChatLayout } from "@/components/chat/layout/ChatLayout"

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("@/components/chat/shell/ActivityBar", () => ({
  ActivityBar: () => <div>activity-bar</div>,
}))

vi.mock("@/components/chat/shell/TopBar", () => ({
  TopBar: ({ onTogglePanel }: { onTogglePanel: () => void }) => (
    <button type="button" onClick={onTogglePanel}>
      toggle-panel
    </button>
  ),
}))

vi.mock("@/components/chat/ChatSidebar", () => ({
  ChatSidebar: ({
    onOpenConversationManager,
  }: {
    onOpenConversationManager?: () => void
  }) => (
    <button type="button" onClick={onOpenConversationManager}>
      open-conversation-manager
    </button>
  ),
}))

vi.mock("@/components/ui/PanelResizer", () => ({
  PanelResizer: () => <div>panel-resizer</div>,
}))

vi.mock("@/components/chat/workspace-panel/ConversationManagerPanel", () => ({
  ConversationManagerPanel: ({ onClose }: { onClose: () => void }) => (
    <div>
      <div>Kelola Percakapan</div>
      <button type="button" onClick={onClose}>
        close-conversation-manager
      </button>
    </div>
  ),
}))

describe("chat layout workspace panel", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it("membuka panel kelola percakapan dan memulihkan artifact saat ditutup", () => {
    render(
      <ChatLayout
        conversationId="conv-1"
        isArtifactPanelOpen={true}
        activeArtifactId={"artifact-1" as never}
        artifactPanel={<div>artifact-body</div>}
      >
        <div>chat-body</div>
      </ChatLayout>
    )

    expect(screen.getByText("artifact-body")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "open-conversation-manager" }))
    expect(screen.getByText("Kelola Percakapan")).toBeInTheDocument()
    expect(screen.queryByText("artifact-body")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "close-conversation-manager" }))
    expect(screen.getByText("artifact-body")).toBeInTheDocument()
  })

  it("menutup panel melalui tombol Escape", () => {
    render(
      <ChatLayout conversationId="conv-1" artifactPanel={<div>artifact-body</div>}>
        <div>chat-body</div>
      </ChatLayout>
    )

    fireEvent.click(screen.getByRole("button", { name: "open-conversation-manager" }))
    expect(screen.getByText("Kelola Percakapan")).toBeInTheDocument()

    fireEvent.keyDown(window, { key: "Escape" })

    expect(screen.queryByText("Kelola Percakapan")).not.toBeInTheDocument()
  })
})
