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

  it("normalizes legacy assistant text with sources into paragraph-end citation markers", () => {
    const legacyMessage = {
      id: "m-legacy-1",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Data adopsi AI naik signifikan menurut laporan terbaru https://example.com/laporan-ai-2026",
        },
      ],
      sources: [
        {
          url: "https://example.com/laporan-ai-2026",
          title: "Laporan AI 2026",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={legacyMessage} />)

    expect(screen.queryByText(/https:\/\/example\.com/i)).not.toBeInTheDocument()
    expect(screen.getByText(/\[1\]/)).toBeInTheDocument()
  })

  it("trusts backend data-cited-text without re-processing", () => {
    const citedTextMessage = {
      id: "m-legacy-2",
      role: "assistant",
      parts: [
        { type: "text", text: "placeholder" },
        {
          type: "data-cited-text",
          data: {
            text: "- Fakta pertama menunjukkan tren adopsi AI. [1]\n- Fakta kedua memperlihatkan dampak di kelas. [2]",
          },
        },
      ],
      sources: [
        { url: "https://example.com/a", title: "Sumber A" },
        { url: "https://example.com/b", title: "Sumber B" },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={citedTextMessage} />)

    expect(screen.getByText(/Fakta pertama menunjukkan tren adopsi AI\. \[1\]/)).toBeInTheDocument()
    expect(screen.getByText(/Fakta kedua memperlihatkan dampak di kelas\. \[2\]/)).toBeInTheDocument()
  })

  it("keeps search status rendering while splitting internal-thought block", () => {
    const message = {
      id: "m-search-internal",
      role: "assistant",
      parts: [
        {
          type: "data-search",
          data: {
            status: "error",
            message: "Tool pencarian tidak tersedia",
          },
        },
        {
          type: "text",
          text: "Bentar ya, aku cari dulu. Ini fallback jawaban tanpa sumber.",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} persistProcessIndicators />)

    expect(screen.getByText("Tool pencarian tidak tersedia")).toBeInTheDocument()
    expect(screen.getByText(/Ini fallback jawaban tanpa sumber\./)).toBeInTheDocument()
    expect(screen.getByTestId("internal-thought-block")).toHaveTextContent(/Bentar ya, aku cari dulu\./)
  })
})
