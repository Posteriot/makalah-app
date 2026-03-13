import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatSidebar } from "@/components/chat/ChatSidebar"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}))

vi.mock("@/components/chat/sidebar/SidebarChatHistory", () => ({
  SidebarChatHistory: () => <div>mock history</div>,
}))

vi.mock("@/components/chat/sidebar/SidebarProgress", () => ({
  SidebarProgress: () => <div>mock progress</div>,
}))

vi.mock("@/components/billing/CreditMeter", () => ({
  CreditMeter: () => <div>mock credit meter</div>,
}))

vi.mock("@/components/layout/header/UserDropdown", () => ({
  UserDropdown: () => <div>mock user dropdown</div>,
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ user: null }),
}))

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
}))

function buildConversation(id: string) {
  return {
    _id: id as never,
    title: `Percakapan ${id}`,
    lastMessageAt: Date.now(),
  }
}

describe("sidebar history count transparency", () => {
  it("menampilkan jumlah sementara dengan tanda plus saat masih bisa load lagi", () => {
    const conversations = Array.from({ length: 50 }, (_, index) =>
      buildConversation(`conv-${index + 1}`)
    )

    render(
      <ChatSidebar
        activePanel="chat-history"
        conversations={conversations}
        currentConversationId={null}
        onNewChat={vi.fn()}
        onDeleteConversation={vi.fn()}
        onDeleteConversations={vi.fn()}
        onDeleteAllConversations={vi.fn()}
        hasMoreConversations={true}
      />
    )

    expect(screen.getByText("Riwayat")).toBeInTheDocument()
    expect(screen.getByText("50+")).toBeInTheDocument()
  })

  it("tetap bisa menampilkan total eksplisit saat parent memang memberikannya", () => {
    const conversations = Array.from({ length: 12 }, (_, index) =>
      buildConversation(`conv-${index + 1}`)
    )

    render(
      <ChatSidebar
        activePanel="chat-history"
        conversations={conversations}
        totalConversationCount={12}
        currentConversationId={null}
        onNewChat={vi.fn()}
        onDeleteConversation={vi.fn()}
        onDeleteConversations={vi.fn()}
        onDeleteAllConversations={vi.fn()}
      />
    )

    expect(screen.getByText("12 dari 12")).toBeInTheDocument()
  })
})
