import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatSidebar } from "@/components/chat/ChatSidebar"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}))

vi.mock("@/components/chat/sidebar/SidebarChatHistory", () => ({
  SidebarChatHistory: () => <div>mock history</div>,
}))

vi.mock("@/components/chat/sidebar/SidebarPaperSessions", () => ({
  SidebarPaperSessions: () => <div>mock paper</div>,
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

function buildConversation(id: string) {
  return {
    _id: id as never,
    title: `Percakapan ${id}`,
    lastMessageAt: Date.now(),
  }
}

describe("sidebar history count transparency", () => {
  it("menampilkan jumlah sidebar dan total sebenarnya secara eksplisit", () => {
    const conversations = Array.from({ length: 50 }, (_, index) =>
      buildConversation(`conv-${index + 1}`)
    )

    render(
      <ChatSidebar
        activePanel="chat-history"
        conversations={conversations}
        totalConversationCount={1000}
        currentConversationId={null}
        onNewChat={vi.fn()}
        onDeleteConversation={vi.fn()}
      />
    )

    expect(screen.getByText("Riwayat")).toBeInTheDocument()
    expect(screen.getByText("50 dari 1000")).toBeInTheDocument()
  })

  it("tetap transparan saat total tidak melebihi batas sidebar", () => {
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
      />
    )

    expect(screen.getByText("12 dari 12")).toBeInTheDocument()
  })
})
