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

vi.mock("./UnifiedProcessCard", () => ({
  UnifiedProcessCard: () => <div data-testid="unified-process-card" />,
}))

describe("MessageBubble unified process gating", () => {
  it("does not render the unified process card on older assistant bubbles", () => {
    const message = {
      id: "m-paper-old",
      role: "assistant",
      parts: [{ type: "text", text: "Ringkasan proses" }],
    } as unknown as UIMessage

    render(
      <MessageBubble
        message={message}
        isPaperMode
        messageIndex={0}
        currentStageStartIndex={0}
        allMessages={[
          { createdAt: 1000, role: "assistant" },
          { createdAt: 2000, role: "user" },
        ] as unknown as Array<{ createdAt: number; role: string }>}
        stageData={{
          gagasan: {
            ideKasar: "draft",
          },
        }}
        currentStage="gagasan"
      />
    )

    expect(screen.queryByTestId("unified-process-card")).not.toBeInTheDocument()
  })

  it("renders the unified process card on the latest assistant bubble", () => {
    const message = {
      id: "m-paper-latest",
      role: "assistant",
      parts: [{ type: "text", text: "Ringkasan proses" }],
    } as unknown as UIMessage

    render(
      <MessageBubble
        message={message}
        isPaperMode
        messageIndex={1}
        currentStageStartIndex={0}
        allMessages={[
          { createdAt: 1000, role: "user" },
          { createdAt: 2000, role: "assistant" },
        ] as unknown as Array<{ createdAt: number; role: string }>}
        stageData={{
          gagasan: {
            ideKasar: "draft",
          },
        }}
        currentStage="gagasan"
        isLatestAssistantMessage
      />
    )

    expect(screen.getByTestId("unified-process-card")).toBeInTheDocument()
  })
})
