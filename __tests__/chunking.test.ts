import { describe, it, expect } from "vitest"
import { chunkContent } from "@/lib/ai/chunking"

describe("chunkContent", () => {
  it("returns single chunk for short content", () => {
    const chunks = chunkContent("Short text under 500 tokens.")
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toBe("Short text under 500 tokens.")
    expect(chunks[0].chunkIndex).toBe(0)
  })

  it("splits by section headings", () => {
    const md = "## Introduction\n\nFirst section content that is long enough to be meaningful for embedding purposes and analysis.\n\n## Methodology\n\nSecond section content that describes the research methodology in sufficient detail."
    const chunks = chunkContent(md)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks[0].metadata.sectionHeading).toBe("Introduction")
    expect(chunks[1].metadata.sectionHeading).toBe("Methodology")
  })

  it("splits long paragraphs at sentence boundary", () => {
    const longParagraph = Array(50).fill("This is a complete sentence about research findings.").join(" ")
    const chunks = chunkContent(longParagraph)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.content.trimEnd()).toMatch(/[.!?]$/)
    }
  })

  it("merges consecutive short paragraphs", () => {
    const md = "Short para 1.\n\nShort para 2.\n\nShort para 3.\n\nShort para 4."
    const chunks = chunkContent(md)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toContain("Short para 1")
    expect(chunks[0].content).toContain("Short para 4")
  })

  it("skips chunks shorter than 50 chars", () => {
    const md = "## Title\n\nOk.\n\n## Real Section\n\nThis is a real section with enough content to be meaningful for embedding and retrieval purposes in the RAG pipeline."
    const chunks = chunkContent(md)
    const contents = chunks.map(c => c.content)
    expect(contents.every(c => c.length >= 50)).toBe(true)
  })

  it("returns empty array for empty input", () => {
    expect(chunkContent("")).toEqual([])
    expect(chunkContent("   ")).toEqual([])
  })

  it("preserves chunkIndex ordering", () => {
    const md = "## A\n\n" + "Content A. ".repeat(100) + "\n\n## B\n\n" + "Content B. ".repeat(100)
    const chunks = chunkContent(md)
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i)
    }
  })
})
