/**
 * Chat Layout Tests
 * Task 1.1: Write 4-6 focused tests untuk layout components
 *
 * Tests:
 * 1. CSS Grid layout renders dengan struktur 6-column
 * 2. Activity Bar panel switching (3 states)
 * 3. Sidebar collapse/expand behavior
 * 4. Resizer drag constraints (min/max width)
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

// Components to be created
import { ChatLayout } from "@/components/chat/layout/ChatLayout"
import { ActivityBar } from "@/components/chat/shell/ActivityBar"
import { useResizer } from "@/components/chat/layout/useResizer"
import { renderHook, act } from "@testing-library/react"

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/chat",
}))

// Mock Convex
vi.mock("convex/react", () => ({
  useQuery: () => [],
  useMutation: () => vi.fn(),
}))

// Mock Clerk - need all exports used by components
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { id: "test-user", firstName: "Test", lastName: "User" } }),
  useClerk: () => ({ signOut: vi.fn() }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock useCurrentUser hook
vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: {
      _id: "test-user-id",
      clerkUserId: "test-clerk-id",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "user",
      subscriptionStatus: "free",
    },
    isLoading: false,
  }),
}))

// Mock useConversations hook
vi.mock("@/lib/hooks/useConversations", () => ({
  useConversations: () => ({
    conversations: [],
    createNewConversation: vi.fn(),
    deleteConversation: vi.fn(),
    updateConversationTitle: vi.fn(),
    isLoading: false,
  }),
}))

// Mock useTabState hook
vi.mock("@/lib/hooks/useTabState", () => ({
  useTabState: () => ({
    tabs: [],
    activeTabId: null,
    openTab: vi.fn(),
    closeTab: vi.fn(),
    closeAllTabs: vi.fn(),
    setActiveTab: vi.fn(),
    updateTabTitle: vi.fn(),
  }),
}))

describe("ChatLayout", () => {
  it("renders dengan struktur 6-column CSS Grid", () => {
    render(
      <ChatLayout conversationId={null}>
        <div data-testid="main-content">Main Content</div>
      </ChatLayout>
    )

    const layout = screen.getByTestId("chat-layout")
    expect(layout).toBeInTheDocument()
    expect(layout).toHaveClass("grid")
  })

  it("sidebar collapse mengubah grid columns", () => {
    // conversationId=null triggers auto-collapse via useEffect
    render(
      <ChatLayout conversationId={null}>
        <div>Main Content</div>
      </ChatLayout>
    )

    const layout = screen.getByTestId("chat-layout")
    // With conversationId=null, sidebar auto-collapses
    expect(layout).toHaveClass("sidebar-collapsed")
  })
})

describe("ActivityBar", () => {
  it("renders 3 panel buttons (chat-history, paper, progress)", () => {
    const handlePanelChange = vi.fn()

    render(
      <ActivityBar
        activePanel="chat-history"
        onPanelChange={handlePanelChange}
        isSidebarCollapsed={false}
        onToggleSidebar={() => {}}
      />
    )

    // ActivityBar uses aria-label="<label> panel" format
    expect(screen.getByRole("button", { name: /chat history panel/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sesi paper panel/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /linimasa progres panel/i })).toBeInTheDocument()
  })

  it("switching panel calls onPanelChange dengan correct value", () => {
    const handlePanelChange = vi.fn()

    render(
      <ActivityBar
        activePanel="chat-history"
        onPanelChange={handlePanelChange}
        isSidebarCollapsed={false}
        onToggleSidebar={() => {}}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /sesi paper panel/i }))
    expect(handlePanelChange).toHaveBeenCalledWith("paper")

    fireEvent.click(screen.getByRole("button", { name: /linimasa progres panel/i }))
    expect(handlePanelChange).toHaveBeenCalledWith("progress")
  })

  it("auto-expands sidebar saat item clicked jika collapsed", () => {
    const handlePanelChange = vi.fn()
    const handleToggleSidebar = vi.fn()

    render(
      <ActivityBar
        activePanel="chat-history"
        onPanelChange={handlePanelChange}
        isSidebarCollapsed={true}
        onToggleSidebar={handleToggleSidebar}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /paper/i }))

    // Should expand sidebar when collapsed and panel is clicked
    expect(handleToggleSidebar).toHaveBeenCalled()
    expect(handlePanelChange).toHaveBeenCalledWith("paper")
  })
})

describe("useResizer", () => {
  it("enforces min/max width constraints", () => {
    const { result } = renderHook(() =>
      useResizer({
        defaultWidth: 280,
        minWidth: 180,
        maxWidth: 500,
        collapseThreshold: 100,
      })
    )

    // Try to set width below min
    act(() => {
      result.current.setWidth(100)
    })
    expect(result.current.width).toBe(180)

    // Try to set width above max
    act(() => {
      result.current.setWidth(600)
    })
    expect(result.current.width).toBe(500)

    // Set width within range
    act(() => {
      result.current.setWidth(300)
    })
    expect(result.current.width).toBe(300)
  })

  it("collapses when width below collapse threshold", () => {
    const { result } = renderHook(() =>
      useResizer({
        defaultWidth: 280,
        minWidth: 180,
        maxWidth: 500,
        collapseThreshold: 100,
      })
    )

    // Trigger collapse by setting very low during drag
    act(() => {
      result.current.handleDrag(50) // Simulate drag to 50px
    })

    expect(result.current.isCollapsed).toBe(true)
  })

  it("double-click resets to default width", () => {
    const { result } = renderHook(() =>
      useResizer({
        defaultWidth: 280,
        minWidth: 180,
        maxWidth: 500,
        collapseThreshold: 100,
      })
    )

    // Change width
    act(() => {
      result.current.setWidth(350)
    })
    expect(result.current.width).toBe(350)

    // Double-click reset
    act(() => {
      result.current.resetToDefault()
    })
    expect(result.current.width).toBe(280)
  })
})
