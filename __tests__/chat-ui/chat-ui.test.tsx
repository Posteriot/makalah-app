/**
 * Chat UI Tests
 * Task 3.1: Write 4-6 focused tests untuk chat UI components
 *
 * Tests:
 * 1. TemplateGrid renders templates dan triggers actions
 * 2. MessageBubble enhanced styling
 * 3. Paper validation panel styling updates
 * 4. Empty state renders TemplateGrid
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

// Components to test
import { TemplateGrid } from "@/components/chat/messages/TemplateGrid"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { PaperValidationPanel } from "@/components/paper/PaperValidationPanel"
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator"

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/chat",
}))

vi.mock("convex/react", () => ({
  useQuery: () => [],
  useMutation: () => vi.fn(),
}))

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { id: "test-user" } }),
}))

describe("TemplateGrid", () => {
  it("renders 4 template cards", () => {
    const handleSelect = vi.fn()
    render(<TemplateGrid onTemplateSelect={handleSelect} />)

    expect(screen.getByText("Dampak AI dalam Pendidikan")).toBeInTheDocument()
    expect(screen.getByText("Machine Learning untuk Prediksi")).toBeInTheDocument()
    expect(screen.getByText("Metodologi Penelitian")).toBeInTheDocument()
    expect(screen.getByText("Thesis vs Disertasi vs Skripsi")).toBeInTheDocument()
  })

  it("triggers onTemplateSelect saat template di-click", () => {
    const handleSelect = vi.fn()
    render(<TemplateGrid onTemplateSelect={handleSelect} />)

    fireEvent.click(screen.getByText("Dampak AI dalam Pendidikan"))
    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: "dampak-ai-pendidikan",
    }))
  })
})

describe("MessageBubble Styling", () => {
  const mockUserMessage = {
    id: "msg-1",
    role: "user" as const,
    content: "Test message content",
    parts: [{ type: "text" as const, text: "Test message content" }],
  }

  const mockAssistantMessage = {
    id: "msg-2",
    role: "assistant" as const,
    content: "AI response content",
    parts: [{ type: "text" as const, text: "AI response content" }],
  }

  it("user message renders dengan correct styling", () => {
    const { container } = render(<MessageBubble message={mockUserMessage} />)

    // Outer wrapper should align to the right
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass("flex")
    expect(wrapper).toHaveClass("justify-end")

    // Inner bubble div should have user message background (Mechanical Grace)
    const bubble = wrapper.querySelector("div.bg-slate-200")
    expect(bubble).toBeInTheDocument()
    expect(bubble).toHaveClass("rounded-shell")
  })

  it("assistant message renders dengan correct styling", () => {
    const { container } = render(<MessageBubble message={mockAssistantMessage} />)

    // Outer wrapper should not be right-aligned
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).not.toHaveClass("justify-end")

    // Assistant message uses full width layout without user bubble styling
    const bubble = wrapper.querySelector("div.bg-user-message-bg")
    expect(bubble).not.toBeInTheDocument()
  })
})

describe("PaperValidationPanel Styling", () => {
  it("renders dengan card styling dan correct structure", () => {
    const handleApprove = vi.fn()
    const handleRevise = vi.fn()

    render(
      <PaperValidationPanel
        stageLabel="Gagasan"
        onApprove={handleApprove}
        onRevise={handleRevise}
      />
    )

    // Check panel renders with correct elements
    expect(screen.getByText(/Validasi Tahap:/)).toBeInTheDocument()
    // "Gagasan" is inside the h3 but as separate text node
    const heading = screen.getByRole("heading", { level: 3 })
    expect(heading.textContent).toContain("Gagasan")
    expect(screen.getByRole("button", { name: /Revisi/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Approve/i })).toBeInTheDocument()
  })

  it("buttons have correct styling classes", () => {
    const handleApprove = vi.fn()
    const handleRevise = vi.fn()

    render(
      <PaperValidationPanel
        stageLabel="Gagasan"
        onApprove={handleApprove}
        onRevise={handleRevise}
      />
    )

    // Check button styling
    const approveBtn = screen.getByRole("button", { name: /Approve/i })
    expect(approveBtn).toHaveClass("bg-green-600")

    const reviseBtn = screen.getByRole("button", { name: /Revisi/i })
    expect(reviseBtn).toHaveClass("border-slate-400")
  })
})

describe("ThinkingIndicator Styling", () => {
  it("renders dengan correct styling saat visible", () => {
    render(<ThinkingIndicator visible={true} />)

    const indicator = screen.getByRole("status")
    expect(indicator).toBeInTheDocument()
    // Mechanical Grace: transparent bg, no border, no rounded
    expect(indicator).toHaveClass("bg-transparent")
    expect(indicator).toHaveClass("border-0")
  })

  it("has animated dots", () => {
    const { container } = render(<ThinkingIndicator visible={true} />)

    // Check for 3 animated dots (Mechanical Grace: bg-slate-500, not bg-muted-foreground)
    const dots = container.querySelectorAll("span.rounded-full.bg-slate-500")
    expect(dots.length).toBe(3)
  })

  it("does not render saat not visible", () => {
    render(<ThinkingIndicator visible={false} />)

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
