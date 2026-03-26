import { fireEvent, render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { MessageBubble } from "./MessageBubble"
import { SourcesPanel } from "./SourcesPanel"

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
  SourcesIndicator: ({ sources, onOpenSheet }: { sources: Array<Record<string, unknown>>; onOpenSheet?: (sources: Array<Record<string, unknown>>) => void }) => (
    <button type="button" data-testid="sources-indicator" onClick={() => onOpenSheet?.(sources)}>
      Rujukan {sources.length}
    </button>
  ),
}))

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe("MessageBubble reference inventory", () => {
  it("renders reference inventory items from streamed payload", () => {
    const onOpenSources = vi.fn()
    const message = {
      id: "m-ref-inventory",
      role: "assistant",
      parts: [
        { type: "text", text: "placeholder" },
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
        {
          type: "data-cited-sources",
          data: {
            sources: [
              { url: "https://example.com/a.pdf", title: "Paper A" },
            ],
          },
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} onOpenSources={onOpenSources} />)

    expect(screen.getByText("Paper A")).toBeInTheDocument()
    expect(screen.getByText("https://example.com/a.pdf")).toBeInTheDocument()
    expect(screen.queryByText(/^Link:\s*$/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId("sources-indicator"))

    expect(onOpenSources).toHaveBeenCalledWith([
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
    ])
  })

  it("falls back to cited text when inventory introText is absent", () => {
    const message = {
      id: "m-ref-inventory-fallback",
      role: "assistant",
      parts: [
        { type: "text", text: "placeholder" },
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

    render(<MessageBubble message={message} />)

    expect(screen.getByTestId("reference-inventory-body")).toHaveTextContent(
      "Berikut inventaris referensi yang ditemukan."
    )
    expect(screen.getByText("https://example.com/a.pdf")).toBeInTheDocument()
  })

  it("renders the same source contract in the Rujukan panel", () => {
    render(
      <SourcesPanel
        open
        onOpenChange={() => undefined}
        sources={[
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
        ]}
      />
    )

    expect(screen.getByText("Paper A")).toBeInTheDocument()
    expect(screen.getByText("Paper B")).toBeInTheDocument()
    expect(screen.getByText("Tautan belum diverifikasi")).toBeInTheDocument()
    expect(screen.getByText("PDF")).toBeInTheDocument()
    expect(screen.getByText("Tidak tersedia")).toBeInTheDocument()
  })
})
