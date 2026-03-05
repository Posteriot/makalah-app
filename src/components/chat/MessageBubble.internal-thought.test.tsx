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

vi.mock("./SearchStatusIndicator", () => ({
  SearchStatusIndicator: () => null,
}))

vi.mock("./MarkdownRenderer", () => ({
  MarkdownRenderer: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}))

describe("MessageBubble internal-thought separation", () => {
  it("renders separated internal-thought block in italic with thin separators", () => {
    const message = {
      id: "m-internal-1",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Bentar ya, aku cari dulu informasinya. Oke, ini ringkasannya: poin A.",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    expect(screen.getByText(/Oke, ini ringkasannya: poin A\./)).toBeInTheDocument()

    const internalBlock = screen.getByTestId("internal-thought-block")
    expect(internalBlock).toHaveTextContent(/Bentar ya, aku cari dulu informasinya\./)
    expect(internalBlock.className).toContain("italic")
    expect(internalBlock.className).toContain("border-y")
  })

  it("uses server-provided data-internal-thought when available", () => {
    const message = {
      id: "m-internal-2",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Ini jawaban final tanpa preamble.",
        },
        {
          type: "data-internal-thought",
          data: {
            text: "Oke, gue cek dulu satu hal.",
          },
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    expect(screen.getByText(/Ini jawaban final tanpa preamble\./)).toBeInTheDocument()
    expect(screen.getByTestId("internal-thought-block")).toHaveTextContent(
      /Oke, gue cek dulu satu hal\./
    )
  })

  it("renders internal-only block when public text is empty", () => {
    const message = {
      id: "m-internal-3",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Tunggu bentar ya, gue cari dulu.",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    expect(screen.getByTestId("internal-thought-block")).toHaveTextContent(
      /Tunggu bentar ya, gue cari dulu\./
    )
  })
})
