import { render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"
import { describe, expect, it, vi } from "vitest"
import { MessageBubble } from "./MessageBubble"

vi.mock("./QuickActions", () => ({
  QuickActions: () => null,
}))

vi.mock("./ArtifactIndicator", () => ({
  ArtifactIndicator: () => null,
}))

vi.mock("./ToolStateIndicator", () => ({
  ToolStateIndicator: () => null,
}))

vi.mock("./SourcesIndicator", () => ({
  SourcesIndicator: () => null,
}))

vi.mock("./MarkdownRenderer", () => ({
  MarkdownRenderer: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}))

describe("MessageBubble search status", () => {
  it("renders custom error message from data-search payload", () => {
    const message = {
      id: "m1",
      role: "assistant",
      parts: [
        {
          type: "data-search",
          data: {
            status: "error",
            message: "Tool pencarian tidak tersedia",
          },
        },
        { type: "text", text: "Respons fallback" },
      ],
    } as unknown as UIMessage

    render(
      <MessageBubble
        message={message}
        persistProcessIndicators
      />
    )

    expect(screen.getByText("Tool pencarian tidak tersedia")).toBeInTheDocument()
  })
})
