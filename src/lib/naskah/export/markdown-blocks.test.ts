import { describe, expect, it } from "vitest"
import { parseInlineRuns, parseNaskahMarkdown } from "./markdown-blocks"

describe("parseInlineRuns", () => {
  it("returns plain text when no formatting markers exist", () => {
    expect(parseInlineRuns("hello world")).toEqual([
      { text: "hello world" },
    ])
  })

  it("extracts **bold** runs", () => {
    expect(parseInlineRuns("a **bold** b")).toEqual([
      { text: "a " },
      { text: "bold", bold: true },
      { text: " b" },
    ])
  })

  it("extracts *italic* runs", () => {
    expect(parseInlineRuns("a *italic* b")).toEqual([
      { text: "a " },
      { text: "italic", italic: true },
      { text: " b" },
    ])
  })

  it("handles mixed bold and italic in one line", () => {
    const runs = parseInlineRuns("**Bagi Siswa:** Memberikan *chatbot* interaktif.")
    expect(runs).toEqual([
      { text: "Bagi Siswa:", bold: true },
      { text: " Memberikan " },
      { text: "chatbot", italic: true },
      { text: " interaktif." },
    ])
  })

  it("returns a single plain run for empty string", () => {
    expect(parseInlineRuns("")).toEqual([{ text: "" }])
  })
})

describe("parseNaskahMarkdown", () => {
  it("returns empty array for empty input", () => {
    expect(parseNaskahMarkdown("")).toEqual([])
  })

  it("parses a heading", () => {
    const blocks = parseNaskahMarkdown("## Latar Belakang")
    expect(blocks).toEqual([
      {
        type: "heading",
        level: 2,
        runs: [{ text: "Latar Belakang" }],
      },
    ])
  })

  it("parses heading levels 1 through 4", () => {
    const md = "# H1\n\n## H2\n\n### H3\n\n#### H4"
    const blocks = parseNaskahMarkdown(md)
    expect(blocks.map((b) => (b as { level: number }).level)).toEqual([
      1, 2, 3, 4,
    ])
  })

  it("parses a plain paragraph", () => {
    const blocks = parseNaskahMarkdown("Penelitian ini bertujuan.")
    expect(blocks).toEqual([
      {
        type: "paragraph",
        runs: [{ text: "Penelitian ini bertujuan." }],
      },
    ])
  })

  it("joins multi-line paragraphs with a space", () => {
    const md = "Line one.\nLine two."
    const blocks = parseNaskahMarkdown(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe("paragraph")
    expect((blocks[0] as { runs: { text: string }[] }).runs[0].text).toBe(
      "Line one. Line two.",
    )
  })

  it("parses an ordered list", () => {
    const md = "1. Pertama\n2. Kedua\n3. Ketiga"
    const blocks = parseNaskahMarkdown(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe("list")
    const list = blocks[0] as { ordered: boolean; items: unknown[][] }
    expect(list.ordered).toBe(true)
    expect(list.items).toHaveLength(3)
  })

  it("parses an unordered list", () => {
    const md = "- Alpha\n- Beta"
    const blocks = parseNaskahMarkdown(md)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe("list")
    const list = blocks[0] as { ordered: boolean; items: unknown[][] }
    expect(list.ordered).toBe(false)
    expect(list.items).toHaveLength(2)
  })

  it("parses a realistic academic section", () => {
    const md = [
      "## Latar Belakang",
      "",
      "Perkembangan pesat teknologi **kecerdasan buatan** (AI).",
      "",
      "## Rumusan Masalah",
      "",
      "1. Bagaimana desain interaksi *chatbot* LLM?",
      "2. Apa saja faktor kunci?",
    ].join("\n")

    const blocks = parseNaskahMarkdown(md)
    expect(blocks).toHaveLength(4)
    expect(blocks[0].type).toBe("heading")
    expect(blocks[1].type).toBe("paragraph")
    expect(blocks[2].type).toBe("heading")
    expect(blocks[3].type).toBe("list")
  })
})
