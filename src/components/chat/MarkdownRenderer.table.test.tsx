import { describe, expect, it, beforeAll, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MarkdownRenderer, stripInlineMarkdown } from "./MarkdownRenderer"
import { formatParagraphEndCitations } from "@/lib/citations/paragraph-citation-formatter"

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })

  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })
})

describe("MarkdownRenderer table rendering", () => {
  it("renders a basic table as HTML table", () => {
    const md = [
      "| Header1 | Header2 |",
      "|---|---|",
      "| cell1 | cell2 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders table with domain names in cells", () => {
    const md = [
      "| REFERENSI | DOMAIN/SUMBER | FOKUS |",
      "|---|---|---|",
      "| journal.limudata.co.id | Jurnal Indonesia | Positif |",
      "| itb.ac.id | Universitas ITB | Positif |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
    expect(container.textContent).toContain("journal.limudata.co.id")
  })

  it("renders table with markdown links in cells", () => {
    const md = [
      "| REFERENSI | DOMAIN/SUMBER | FOKUS |",
      "|---|---|---|",
      "| [journal.limudata.co.id](https://journal.limudata.co.id/article/123) | Jurnal Indonesia | Positif |",
      "| [itb.ac.id](https://itb.ac.id/research) | Universitas ITB | Positif |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders table with bare URLs in cells", () => {
    const md = [
      "| REFERENSI | DOMAIN/SUMBER | FOKUS |",
      "|---|---|---|",
      "| https://journal.limudata.co.id/article/123 | Jurnal Indonesia | Positif |",
      "| https://itb.ac.id/research | Universitas ITB | Positif |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders table with curly-braced domains in cells", () => {
    const md = [
      "| REFERENSI | DOMAIN/SUMBER | FOKUS |",
      "|---|---|---|",
      "| {journal.limudata.co.id} | Jurnal Indonesia | Positif |",
      "| {itb.ac.id} | Universitas ITB | Positif |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
    expect(container.textContent).toContain("journal.limudata.co.id")
  })

  it("renders table with citation markers [1] in cells", () => {
    const md = [
      "| REFERENSI | DOMAIN/SUMBER | FOKUS |",
      "|---|---|---|",
      "| [1] | Jurnal Indonesia | Positif |",
      "| [2] | Universitas ITB | Positif |",
    ].join("\n")

    const sources = [
      { url: "https://journal.limudata.co.id/article/123", title: "Jurnal" },
      { url: "https://itb.ac.id/research", title: "ITB" },
    ]

    const { container } = render(<MarkdownRenderer markdown={md} sources={sources} />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders table preceded by intro text with blank line", () => {
    const md = [
      "Berikut hasil analisis:",
      "",
      "| Header1 | Header2 |",
      "|---|---|",
      "| cell1 | cell2 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders table preceded by intro text WITHOUT blank line", () => {
    const md = [
      "Berikut hasil analisis:",
      "| Header1 | Header2 |",
      "|---|---|",
      "| cell1 | cell2 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders table after text processed by formatParagraphEndCitations", () => {
    // Simulate what the backend outputs after processing
    const md = [
      "Berikut hasil analisis: [1,2,3,4,5,6,7,8]",
      "",
      "| REFERENSI | DOMAIN/SUMBER | FOKUS UTAMA | KUTIPAN KUNCI (SINGKAT) |",
      "|---|---|---|---|",
      "| journal.limudata.co.id | Jurnal Indonesia | Positif: Personalisasi, evaluasi otomatis | \"AI memberikan dampak positif\" |",
      "| itb.ac.id | Universitas ITB | Positif: Aksesibilitas, inovasi | \"AI memainkan peran penting\" |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders table end-to-end: model output → formatParagraphEndCitations → MarkdownRenderer", () => {
    // Simulate model compose phase output with markdown links in table
    const modelOutput = [
      "Siap, berikut ringkasan analisis sumber:",
      "",
      "| REFERENSI | DOMAIN/SUMBER | FOKUS UTAMA | KUTIPAN KUNCI (SINGKAT) |",
      "|---|---|---|---|",
      "| [journal.limudata.co.id](https://journal.limudata.co.id/article/123) | Jurnal Indonesia | Positif: Personalisasi, evaluasi otomatis | \"AI memberikan dampak positif\" |",
      "| [itb.ac.id](https://itb.ac.id/research/456) | Universitas ITB | Positif: Aksesibilitas, inovasi | \"AI memainkan peran penting\" |",
      "",
      "Semoga membantu!",
    ].join("\n")

    const sources = [
      { url: "https://journal.limudata.co.id/article/123", title: "Jurnal Indonesia" },
      { url: "https://itb.ac.id/research/456", title: "Universitas ITB" },
    ]

    // Pass through formatParagraphEndCitations (same as backend)
    const processed = formatParagraphEndCitations({
      text: modelOutput,
      sources,
      anchors: sources.map((_, idx) => ({
        position: null as number | null,
        sourceNumbers: [idx + 1],
      })),
    })

    // Verify processed text is valid table format
    const lines = processed.split("\n")
    const tableStart = lines.findIndex((l) => l.trim().startsWith("|") && l.includes("REFERENSI"))
    expect(tableStart).toBeGreaterThanOrEqual(0)

    // Check table header and separator preserved (data rows may have trailing [N])
    expect(lines[tableStart]).toMatch(/^\|.*\|/)
    expect(lines[tableStart + 1]).toMatch(/^\|[-:\s|]+\|/)
    expect(lines[tableStart + 2]).toMatch(/^\|/)

    // Render in MarkdownRenderer
    const { container } = render(<MarkdownRenderer markdown={processed} sources={sources} context="chat" />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders table end-to-end: model output with bare domains → double formatParagraphEndCitations (legacy) → MarkdownRenderer", () => {
    // Simulate: model generates table with bare domains
    const modelOutput = [
      "Ringkasan:",
      "",
      "| REFERENSI | DOMAIN/SUMBER | FOKUS UTAMA |",
      "|---|---|---|",
      "| journal.limudata.co.id | Jurnal Indonesia | Positif |",
      "| itb.ac.id | Universitas ITB | Aksesibilitas |",
      "",
      "Hasil di atas menunjukkan tren positif.",
    ].join("\n")

    const sources = [
      { url: "https://journal.limudata.co.id/article/123", title: "Jurnal Indonesia" },
      { url: "https://itb.ac.id/research/456", title: "Universitas ITB" },
    ]

    // First pass: backend formatParagraphEndCitations
    const backendProcessed = formatParagraphEndCitations({
      text: modelOutput,
      sources,
      anchors: sources.map((_, idx) => ({
        position: null as number | null,
        sourceNumbers: [idx + 1],
      })),
    })

    // Second pass: frontend normalizedLegacyCitedText (same function, no anchors)
    const frontendProcessed = formatParagraphEndCitations({
      text: backendProcessed,
      sources,
      anchors: [],
    })

    // Render in MarkdownRenderer
    const { container } = render(<MarkdownRenderer markdown={frontendProcessed} sources={sources} context="chat" />)
    expect(container.querySelector("table")).not.toBeNull()
  })
  it("renders table with vertical dividers between columns", () => {
    const md = [
      "| A | B | C |",
      "|---|---|---|",
      "| 1 | 2 | 3 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    const ths = container.querySelectorAll("th")
    expect(ths.length).toBe(3)
    const wrapper = container.querySelector("table")?.parentElement
    expect(wrapper?.className).toContain("overflow-x-auto")
  })

  it("renders table headers with sans-serif font (not mono)", () => {
    const md = [
      "| Header1 | Header2 |",
      "|---|---|",
      "| cell1 | cell2 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    const th = container.querySelector("th")
    expect(th?.className).not.toContain("font-mono")
  })
})

describe("stripInlineMarkdown", () => {
  it("strips bold markers", () => {
    expect(stripInlineMarkdown("**bold text**")).toBe("bold text")
  })

  it("strips italic markers", () => {
    expect(stripInlineMarkdown("*italic*")).toBe("italic")
    expect(stripInlineMarkdown("_italic_")).toBe("italic")
  })

  it("strips backtick code", () => {
    expect(stripInlineMarkdown("`code`")).toBe("code")
  })

  it("converts markdown links to label only", () => {
    expect(stripInlineMarkdown("[Google](https://google.com)")).toBe("Google")
  })

  it("handles nested bold + link", () => {
    expect(stripInlineMarkdown("**[link](https://x.com)**")).toBe("link")
  })

  it("leaves plain text unchanged", () => {
    expect(stripInlineMarkdown("hello world")).toBe("hello world")
  })

  it("handles empty string", () => {
    expect(stripInlineMarkdown("")).toBe("")
  })
})

describe("Table responsive card fallback", () => {
  it("renders table normally when columns <= 3 regardless of container width", () => {
    const md = [
      "| A | B | C |",
      "|---|---|---|",
      "| 1 | 2 | 3 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders 4+ column table with data-responsive-table attribute", () => {
    const md = [
      "| A | B | C | D |",
      "|---|---|---|---|",
      "| 1 | 2 | 3 | 4 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    const wrapper = container.querySelector("[data-responsive-table]")
    expect(wrapper).not.toBeNull()
  })
})

describe("Table copy toolbar", () => {
  beforeEach(() => {
    vi.mocked(navigator.clipboard.writeText).mockClear()
  })

  it("renders Copy and Copy Markdown buttons below table", () => {
    const md = [
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
    ].join("\n")

    render(<MarkdownRenderer markdown={md} />)
    expect(screen.getByText("Copy")).toBeTruthy()
    expect(screen.getByText("Copy Markdown")).toBeTruthy()
  })

  it("copies tab-separated plain text on Copy click", async () => {
    const md = [
      "| Name | Value |",
      "|---|---|",
      "| **alpha** | 1 |",
      "| beta | 2 |",
    ].join("\n")

    render(<MarkdownRenderer markdown={md} />)
    fireEvent.click(screen.getByText("Copy"))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "Name\tValue\nalpha\t1\nbeta\t2"
      )
    })
  })

  it("copies markdown source on Copy Markdown click", async () => {
    const md = [
      "| Name | Value |",
      "|---|---|",
      "| alpha | 1 |",
    ].join("\n")

    render(<MarkdownRenderer markdown={md} />)
    fireEvent.click(screen.getByText("Copy Markdown"))

    await waitFor(() => {
      const call = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string
      expect(call).toContain("| Name | Value |")
      expect(call).toContain("| --- | --- |")
      expect(call).toContain("| alpha | 1 |")
    })
  })
})
