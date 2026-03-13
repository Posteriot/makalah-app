import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatLayout } from "./ChatLayout"

const mockPush = vi.fn()
const mockLoadMore = vi.fn()
const mockDeleteMany = vi.fn()
const mockDeleteAll = vi.fn()
const mockToggleArtifactPanel = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

vi.mock("@/lib/hooks/useConversations", () => ({
  useConversations: () => ({
    conversations: [],
    totalConversationCount: 24,
    createNewConversation: vi.fn(),
    deleteConversation: vi.fn(),
    bulkDeleteConversations: mockDeleteMany,
    deleteAllConversations: mockDeleteAll,
    updateConversationTitle: vi.fn(),
    isLoading: false,
    hasMore: true,
    loadMore: mockLoadMore,
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

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("../ChatSidebar", () => ({
  ChatSidebar: ({
    activePanel,
    hasMoreConversations,
    onLoadMoreConversations,
    onDeleteConversations,
  }: {
    activePanel: string
    hasMoreConversations?: boolean
    onLoadMoreConversations?: () => void
    onDeleteConversations?: (ids: string[]) => Promise<void>
  }) => (
    <div data-testid="chat-sidebar">
      <span>{activePanel}</span>
      <span>{hasMoreConversations ? "has-more" : "done"}</span>
      <button type="button" onClick={() => onLoadMoreConversations?.()}>
        load more
      </button>
      <button type="button" onClick={() => onDeleteConversations?.(["conversation-active"])}>
        bulk delete
      </button>
    </div>
  ),
}))

describe("ChatLayout sidebar tree architecture", () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockLoadMore.mockReset()
    mockDeleteMany.mockReset()
    mockDeleteAll.mockReset()
    mockToggleArtifactPanel.mockReset()

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  it("menyisakan panel kanan hanya untuk artifact viewer", () => {
    render(
      <ChatLayout
        conversationId="conversation-active"
        isArtifactPanelOpen={true}
        onArtifactPanelToggle={mockToggleArtifactPanel}
        artifactPanel={<div data-testid="artifact-panel">artifact-panel</div>}
        artifactCount={2}
      >
        <div>chat-window</div>
      </ChatLayout>
    )

    expect(screen.getByTestId("artifact-panel")).toBeInTheDocument()
    expect(screen.queryByTestId("conversation-manager-panel")).not.toBeInTheDocument()
    expect(screen.queryByTestId("paper-sessions-manager-panel")).not.toBeInTheDocument()
  })

  it("meneruskan mode sidebar tree dan wrapper delete/load more baru", async () => {
    render(
      <ChatLayout
        conversationId="conversation-active"
        artifactPanel={<div data-testid="artifact-panel">artifact-panel</div>}
      >
        <div>chat-window</div>
      </ChatLayout>
    )

    const sidebar = screen.getAllByTestId("chat-sidebar")[0]

    expect(sidebar).toHaveTextContent("chat-history")
    expect(sidebar).toHaveTextContent("has-more")

    fireEvent.click(screen.getAllByRole("button", { name: /load more/i })[0])
    expect(mockLoadMore).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getAllByRole("button", { name: /bulk delete/i })[0])
    await waitFor(() => {
      expect(mockDeleteMany).toHaveBeenCalledWith(["conversation-active"])
      expect(mockPush).toHaveBeenCalledWith("/chat")
    })
  })
})
