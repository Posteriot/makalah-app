import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatSidebar } from "./ChatSidebar"

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: {
      _id: "user-1",
      role: "user",
      subscriptionStatus: "gratis",
    },
  }),
}))

vi.mock("./sidebar/SidebarChatHistory", () => ({
  SidebarChatHistory: () => <div data-testid="sidebar-history-tree">history tree</div>,
}))

vi.mock("./sidebar/SidebarProgress", () => ({
  SidebarProgress: () => <div data-testid="sidebar-progress-panel">progress panel</div>,
}))

vi.mock("@/components/billing/CreditMeter", () => ({
  CreditMeter: ({ className }: { className?: string }) => (
    <div data-testid="credit-meter" className={className}>
      credit meter
    </div>
  ),
}))

vi.mock("@/components/layout/header/UserDropdown", () => ({
  UserDropdown: () => <button type="button">User menu</button>,
}))

describe("ChatSidebar mobile footer", () => {
  it("memisahkan area scroll dengan footer tetap untuk credit meter dan user menu", () => {
    render(
      <ChatSidebar
        activePanel="chat-history"
        conversations={[]}
        currentConversationId={null}
        onNewChat={vi.fn()}
        onDeleteConversation={vi.fn()}
        onDeleteConversations={vi.fn(async () => undefined)}
        onDeleteAllConversations={vi.fn(async () => undefined)}
      />
    )

    const content = screen.getByTestId("chat-sidebar-content")
    const footer = screen.getByTestId("chat-sidebar-footer")

    expect(content.className).toContain("min-h-0")
    expect(content.className).toContain("flex-1")
    expect(footer.className).toContain("shrink-0")
    expect(screen.getByTestId("credit-meter")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /user menu/i })).toBeInTheDocument()
  })
})
