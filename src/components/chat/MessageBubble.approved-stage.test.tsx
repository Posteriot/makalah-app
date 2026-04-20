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

vi.mock("./SourcesIndicator", () => ({
  SourcesIndicator: () => null,
}))

vi.mock("./MarkdownRenderer", () => ({
  MarkdownRenderer: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}))

describe("MessageBubble approved stage copy", () => {
  it("renders explicit next-stage copy for an early stage without lifecycle lock text", () => {
    const message = {
      id: "approved-gagasan",
      role: "user",
      parts: [
        {
          type: "text",
          text: "[Approved: Gagasan Paper] Tahap Gagasan Paper disetujui. Lanjut ke tahap berikutnya, yakni Penentuan Topik.",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    expect(screen.getByText("Tahap tervalidasi")).toBeInTheDocument()
    expect(
      screen.getByText("Tahap Gagasan Paper disetujui. Lanjut ke tahap berikutnya, yakni Penentuan Topik.")
    ).toBeInTheDocument()
    expect(screen.queryByText("Lifecycle artifak: terkunci")).not.toBeInTheDocument()
    expect(screen.queryByText(/^Lanjut ke tahap berikutnya\.$/)).not.toBeInTheDocument()
  })

  it("renders the factual next stage for a middle stage", () => {
    const message = {
      id: "approved-diskusi",
      role: "user",
      parts: [
        {
          type: "text",
          text: "[Approved: Diskusi] Tahap Diskusi disetujui. Lanjut ke tahap berikutnya, yakni Kesimpulan.",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    expect(
      screen.getByText("Tahap Diskusi disetujui. Lanjut ke tahap berikutnya, yakni Kesimpulan.")
    ).toBeInTheDocument()
    expect(screen.queryByText("Lifecycle artifak: terkunci")).not.toBeInTheDocument()
  })

  it("upgrades legacy generic approved text into a full stage-specific sentence", () => {
    const message = {
      id: "approved-legacy-generic",
      role: "user",
      parts: [
        {
          type: "text",
          text: "[Approved: Gagasan Paper] Lanjut ke tahap berikutnya.",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    expect(
      screen.getByText("Tahap Gagasan Paper disetujui. Lanjut ke tahap berikutnya, yakni Penentuan Topik.")
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Lanjut ke tahap berikutnya\.$/)).not.toBeInTheDocument()
  })

  it("renders final-stage completion copy instead of a next-stage sentence", () => {
    const message = {
      id: "approved-final",
      role: "user",
      parts: [
        {
          type: "text",
          text: "[Approved: Pemilihan Judul] Tahap Pemilihan Judul disetujui. Semua tahap selesai.",
        },
      ],
    } as unknown as UIMessage

    render(<MessageBubble message={message} />)

    expect(screen.getByText("Tahap Pemilihan Judul disetujui. Semua tahap selesai.")).toBeInTheDocument()
    expect(screen.queryByText(/Lanjut ke tahap berikutnya/)).not.toBeInTheDocument()
    expect(screen.queryByText("Lifecycle artifak: terkunci")).not.toBeInTheDocument()
  })
})
