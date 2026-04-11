import { describe, expect, it } from "vitest"
import { splitMarkdownIntoBlocks } from "./split-markdown"

describe("splitMarkdownIntoBlocks", () => {
  it("returns an empty array for empty input", () => {
    expect(splitMarkdownIntoBlocks("")).toEqual([])
  })

  it("returns an empty array for whitespace-only input", () => {
    expect(splitMarkdownIntoBlocks("   \n\n  \n  ")).toEqual([])
  })

  it("returns a single block for content without blank lines", () => {
    expect(splitMarkdownIntoBlocks("Satu blok saja.")).toEqual([
      "Satu blok saja.",
    ])
  })

  it("splits paragraphs separated by a blank line", () => {
    const md = "Paragraf pertama.\n\nParagraf kedua."
    expect(splitMarkdownIntoBlocks(md)).toEqual([
      "Paragraf pertama.",
      "Paragraf kedua.",
    ])
  })

  it("treats multiple blank lines between blocks as a single boundary", () => {
    const md = "Pertama.\n\n\n\n\nKedua."
    expect(splitMarkdownIntoBlocks(md)).toEqual(["Pertama.", "Kedua."])
  })

  it("handles CRLF line endings", () => {
    const md = "Pertama.\r\n\r\nKedua."
    expect(splitMarkdownIntoBlocks(md)).toEqual(["Pertama.", "Kedua."])
  })

  it("splits heading followed by paragraph when separated by blank line", () => {
    const md = "## Latar Belakang\n\nBody paragraf."
    expect(splitMarkdownIntoBlocks(md)).toEqual([
      "## Latar Belakang",
      "Body paragraf.",
    ])
  })

  it("keeps a heading and its body together when not separated by blank line", () => {
    // Tight style: heading immediately followed by body without a blank
    // line in between. Treated as one block. This matches markdown
    // convention — the parser still sees the heading correctly.
    const md = "## Heading\nImmediately following body."
    expect(splitMarkdownIntoBlocks(md)).toEqual([
      "## Heading\nImmediately following body.",
    ])
  })

  it("preserves internal newlines inside a block", () => {
    const md = "Baris satu.\nBaris dua.\n\nBlok kedua."
    expect(splitMarkdownIntoBlocks(md)).toEqual([
      "Baris satu.\nBaris dua.",
      "Blok kedua.",
    ])
  })

  it("strips leading and trailing whitespace per block", () => {
    const md = "   \n  Isi blok.  \n   \n\n  Blok kedua.  "
    expect(splitMarkdownIntoBlocks(md)).toEqual([
      "Isi blok.",
      "Blok kedua.",
    ])
  })

  it("returns a full sequence for a realistic academic paragraph chain", () => {
    const md = [
      "## Latar Belakang",
      "",
      "Perkembangan pesat teknologi kecerdasan buatan (AI).",
      "",
      "## Rumusan Masalah",
      "",
      "Berdasarkan latar belakang di atas, rumusan masalah dalam penelitian ini adalah:",
      "",
      "1. Bagaimana desain interaksi chatbot?",
      "2. Apa saja faktor-faktor kunci?",
    ].join("\n")

    expect(splitMarkdownIntoBlocks(md)).toEqual([
      "## Latar Belakang",
      "Perkembangan pesat teknologi kecerdasan buatan (AI).",
      "## Rumusan Masalah",
      "Berdasarkan latar belakang di atas, rumusan masalah dalam penelitian ini adalah:",
      "1. Bagaimana desain interaksi chatbot?\n2. Apa saja faktor-faktor kunci?",
    ])
  })
})
