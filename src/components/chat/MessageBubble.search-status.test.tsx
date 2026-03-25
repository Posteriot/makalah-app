import { render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"
import { describe, expect, it, vi } from "vitest"
import { MessageBubble } from "./MessageBubble"

vi.mock("./QuickActions", () => ({
  QuickActions: ({ content }: { content: string }) => <div data-testid="quick-actions-content">{content}</div>,
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
    expect(screen.getAllByText(/\[1\]/).length).toBeGreaterThan(0)
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

    expect(screen.getAllByText(/Fakta pertama menunjukkan tren adopsi AI\. \[1\]/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Fakta kedua memperlihatkan dampak di kelas\. \[2\]/).length).toBeGreaterThan(0)
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
    expect(screen.getAllByText(/Ini fallback jawaban tanpa sumber\./).length).toBeGreaterThan(0)
    expect(screen.getByTestId("internal-thought-block")).toHaveTextContent(/Bentar ya, aku cari dulu\./)
  })

  it("keeps search status visible when a reference inventory payload is present", () => {
    const message = {
      id: "m-search-inventory",
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
          type: "data-reference-inventory",
          data: {
            responseMode: "reference_inventory",
            introText: "Berikut inventaris referensi yang ditemukan.",
            items: [
              {
                sourceId: "s1",
                title: "Paper A",
                url: "https://example.com/a.pdf",
                verificationStatus: "unverified_link",
                documentKind: "pdf",
              },
            ],
          },
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} persistProcessIndicators />)

    expect(screen.getByText("Tool pencarian tidak tersedia")).toBeInTheDocument()
    expect(screen.queryByText(/^Link:\s*$/i)).not.toBeInTheDocument()
  })

  it("renders inventory intro from cited text fallback when stream omits introText", () => {
    const message = {
      id: "m-search-inventory-fallback",
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
          type: "data-cited-text",
          data: {
            text: "Berikut inventaris referensi yang ditemukan.",
          },
        },
        {
          type: "data-reference-inventory",
          data: {
            responseMode: "reference_inventory",
            items: [
              {
                sourceId: "s1",
                title: "Paper A",
                url: "https://example.com/a.pdf",
                verificationStatus: "unverified_link",
                documentKind: "pdf",
              },
            ],
          },
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} persistProcessIndicators />)

    expect(screen.getByText("Tool pencarian tidak tersedia")).toBeInTheDocument()
    expect(screen.getByTestId("reference-inventory-body")).toHaveTextContent(
      "Berikut inventaris referensi yang ditemukan."
    )
  })

  it("feeds quick actions with structured inventory text instead of raw placeholder links", () => {
    const message = {
      id: "m-search-inventory-copy",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "1. Paper A\nLink:\n",
        },
        {
          type: "data-reference-inventory",
          data: {
            responseMode: "reference_inventory",
            introText: "Berikut inventaris referensi yang ditemukan.",
            items: [
              {
                sourceId: "s1",
                title: "Paper A",
                url: "https://example.com/a.pdf",
                verificationStatus: "unverified_link",
                documentKind: "pdf",
              },
              {
                sourceId: "s2",
                title: "Paper B",
                url: null,
                verificationStatus: "unavailable",
                documentKind: "html",
              },
            ],
          },
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    const copiedContent = screen.getByTestId("quick-actions-content")
    expect(copiedContent).toHaveTextContent("Berikut inventaris referensi yang ditemukan.")
    expect(copiedContent).toHaveTextContent("URL: https://example.com/a.pdf")
    expect(copiedContent).toHaveTextContent("Status: URL tidak tersedia")
    expect(copiedContent).not.toHaveTextContent(/\bLink:\b/)
  })
})
