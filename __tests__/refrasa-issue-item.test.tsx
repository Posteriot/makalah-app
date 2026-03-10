import { render, screen } from "@testing-library/react"
import { RefrasaIssueItem } from "@/components/refrasa/RefrasaIssueItem"
import type { RefrasaIssue } from "@/lib/refrasa/types"

describe("RefrasaIssueItem", () => {
  it("render severity info sesuai style token terbaru", () => {
    const issue: RefrasaIssue = {
      type: "sentence_pattern",
      category: "naturalness",
      message: "Pola kalimat seragam",
      severity: "info",
    }

    render(<RefrasaIssueItem issue={issue} />)

    const badge = screen.getByText("INFO")
    expect(badge).toHaveClass("bg-[var(--chat-secondary)]")
    expect(badge).toHaveClass("text-[var(--chat-secondary-foreground)]")
  })
})
