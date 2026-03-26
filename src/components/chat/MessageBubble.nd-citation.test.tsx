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

vi.mock("./MarkdownRenderer", () => ({
  MarkdownRenderer: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}))

vi.mock("./SourcesIndicator", () => ({
  SourcesIndicator: ({ sources }: { sources: Array<Record<string, unknown>> }) => (
    <button type="button" data-testid="sources-indicator">
      Rujukan {sources.length}
    </button>
  ),
}))

describe("MessageBubble n.d citation regression", () => {
  it("does not render fake source indicator for assistant text containing APA n.d token", () => {
    const message = {
      id: "m-legacy-nd",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "IPB University (n.d.) menyoroti isu ini.",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    expect(screen.queryByTestId("sources-indicator")).not.toBeInTheDocument()
    expect(screen.queryByText(/https:\/\/n\.d\/?/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\bN\.d\b/)).not.toBeInTheDocument()
  })
})
