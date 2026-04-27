import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ChatProcessStatusBar } from "./ChatProcessStatusBar"

describe("ChatProcessStatusBar (stripped progress indicator)", () => {
  it("shows progress bar and percentage during streaming", () => {
    render(
      <ChatProcessStatusBar
        status="streaming"
        progress={48}
      />
    )

    expect(screen.getByText("48%")).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("returns null when not processing", () => {
    const { container } = render(
      <ChatProcessStatusBar
        status="ready"
        progress={100}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it("clamps progress to 0-100 range", () => {
    render(
      <ChatProcessStatusBar
        status="streaming"
        progress={150}
      />
    )

    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("renders thinking dots during streaming", () => {
    const { container } = render(
      <ChatProcessStatusBar
        status="submitted"
        progress={0}
      />
    )

    const dots = container.querySelectorAll(".animate-chat-thought-dot")
    expect(dots.length).toBe(3)
  })
})
