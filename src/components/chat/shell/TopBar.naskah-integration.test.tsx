import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatLayout } from "@/components/chat/layout/ChatLayout"

const mockPush = vi.fn()
const mockUsePaperSession = vi.fn()
const mockUseNaskah = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/chat/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: vi.fn(),
  }),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { _id: "users_1", firstName: "Erik" },
    isLoading: false,
  }),
}))

vi.mock("@/lib/hooks/useConversations", () => ({
  useConversations: () => ({
    conversations: [],
    totalConversationCount: 0,
    createNewConversation: vi.fn(),
    deleteConversation: vi.fn(),
    bulkDeleteConversations: vi.fn(),
    deleteAllConversations: vi.fn(),
    updateConversationTitle: vi.fn(),
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
  }),
}))

vi.mock("@/lib/hooks/usePaperSession", () => ({
  usePaperSession: (...args: unknown[]) => mockUsePaperSession(...args),
}))

vi.mock("@/lib/hooks/useNaskah", () => ({
  useNaskah: (...args: unknown[]) => mockUseNaskah(...args),
}))

vi.mock("@/components/layout/header", () => ({
  UserDropdown: () => <div data-testid="user-dropdown" />,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/ui/PanelResizer", () => ({
  PanelResizer: () => <div data-testid="panel-resizer" />,
}))

vi.mock("@/components/chat/ChatSidebar", () => ({
  ChatSidebar: () => <div data-testid="chat-sidebar" />,
}))

vi.mock("@/components/chat/shell/ActivityBar", () => ({
  ActivityBar: () => <div data-testid="activity-bar" />,
}))

describe("TopBar naskah integration", () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockUsePaperSession.mockReset()
    mockUseNaskah.mockReset()

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })

    mockUsePaperSession.mockReturnValue({
      session: { _id: "paperSessions_1" },
    })
    mockUseNaskah.mockReturnValue({
      availability: { isAvailable: false },
      updatePending: false,
    })
  })

  it("tidak menampilkan entry point Pratinjau saat session belum available", () => {
    render(
      <ChatLayout conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>chat-body</div>
      </ChatLayout>,
    )

    expect(
      screen.queryByRole("link", { name: /pratinjau/i }),
    ).not.toBeInTheDocument()
  })

  it("menampilkan entry point Pratinjau dan titik update saat session available dan pending", () => {
    mockUseNaskah.mockReturnValue({
      availability: { isAvailable: true },
      updatePending: true,
    })

    render(
      <ChatLayout conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>chat-body</div>
      </ChatLayout>,
    )

    const naskahLink = screen.getByRole("link", { name: /pratinjau/i })
    expect(naskahLink).toHaveAttribute(
      "href",
      "/naskah/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    )
    expect(screen.getByTestId("naskah-update-dot")).toBeInTheDocument()
  })
})
