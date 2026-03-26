import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchQuery } from "convex/nextjs"
import { createPaperTools } from "./paper-tools"

vi.mock("ai", () => ({
  tool: (config: unknown) => config,
}))

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
  fetchAction: vi.fn(),
}))

vi.mock("../convex/retry", () => ({
  retryQuery: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  retryMutation: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}))

type InspectToolExecute = (input: Record<string, unknown>) => Promise<Record<string, unknown>>

const getInspectToolExecute = (): InspectToolExecute => {
  const tools = createPaperTools({
    userId: "user_1" as never,
    conversationId: "conv_1" as never,
  }) as unknown as {
    inspectSourceDocument?: {
      execute?: InspectToolExecute
    }
    quoteFromSource?: {
      description?: string
    }
  }

  const execute = tools.inspectSourceDocument?.execute
  if (!execute) {
    throw new Error("inspectSourceDocument tool tidak punya execute handler")
  }

  return execute
}

describe("createPaperTools.inspectSourceDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("mengembalikan metadata exact dan daftar paragraf exact", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    fetchQueryMock.mockResolvedValue({
      title: "Judul Artikel",
      author: "Penulis",
      publishedAt: "2026-03-23",
      siteName: "Contoh Media",
      documentKind: "html",
      paragraphs: [
        { index: 1, text: "Paragraf pertama" },
        { index: 2, text: "Paragraf kedua" },
      ],
    })

    const result = await getInspectToolExecute()({
      sourceId: "https://example.com/article",
      includeMetadata: true,
      includeParagraphs: true,
    })

    expect(result.success).toBe(true)
    expect(result.sourceId).toBe("https://example.com/article")
    expect(result.title).toBe("Judul Artikel")
    expect(result.author).toBe("Penulis")
    expect(result.publishedAt).toBe("2026-03-23")
    expect(result.siteName).toBe("Contoh Media")
    expect(result.documentKind).toBe("html")
    expect(result.exactAvailable).toMatchObject({
      title: true,
      author: true,
      publishedAt: true,
      siteName: true,
      documentKind: true,
      paragraphs: true,
    })
    expect(result.paragraphs).toEqual([
      { index: 1, text: "Paragraf pertama" },
      { index: 2, text: "Paragraf kedua" },
    ])

    expect(fetchQueryMock).toHaveBeenCalledTimes(1)
    expect(fetchQueryMock.mock.calls[0]?.[1]).toMatchObject({
      conversationId: "conv_1",
      sourceId: "https://example.com/article",
    })
  })

  it("mengembalikan paragraf yang diminta secara exact", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    fetchQueryMock.mockResolvedValue({
      title: "Judul Artikel",
      documentKind: "html",
      paragraphs: [
        { index: 1, text: "Paragraf pertama" },
        { index: 2, text: "Paragraf kedua" },
      ],
    })

    const result = await getInspectToolExecute()({
      sourceId: "https://example.com/article",
      paragraphIndex: 2,
    })

    expect(result.success).toBe(true)
    expect(result.requestedParagraph).toEqual({ index: 2, text: "Paragraf kedua" })
    expect(result.paragraphs).toBeUndefined()
    expect(result.title).toBe("Judul Artikel")
    expect(result.documentKind).toBe("html")
  })

  it("gagal kalau source document tidak ditemukan", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    fetchQueryMock.mockResolvedValue(null)

    const result = await getInspectToolExecute()({
      sourceId: "https://example.com/article",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Source document not found")
  })

  it("mengizinkan metadata dan paragraf sengaja dihilangkan", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    fetchQueryMock.mockResolvedValue({
      title: "Judul Artikel",
      author: "Penulis",
      publishedAt: "2026-03-23",
      siteName: "Contoh Media",
      documentKind: "html",
      paragraphs: [
        { index: 1, text: "Paragraf pertama" },
        { index: 2, text: "Paragraf kedua" },
      ],
    })

    const result = await getInspectToolExecute()({
      sourceId: "https://example.com/article",
      includeMetadata: false,
      includeParagraphs: false,
    })

    expect(result.success).toBe(true)
    expect(result.title).toBeUndefined()
    expect(result.author).toBeUndefined()
    expect(result.publishedAt).toBeUndefined()
    expect(result.siteName).toBeUndefined()
    expect(result.documentKind).toBeUndefined()
    expect(result.paragraphs).toBeUndefined()
    expect(result.exactAvailable).toMatchObject({
      title: true,
      author: true,
      publishedAt: true,
      siteName: true,
      documentKind: true,
      paragraphs: true,
    })
  })

  it("gagal kalau paragraphIndex di luar jangkauan", async () => {
    const fetchQueryMock = vi.mocked(fetchQuery)
    fetchQueryMock.mockResolvedValue({
      paragraphs: [{ index: 1, text: "Paragraf pertama" }],
    })

    const result = await getInspectToolExecute()({
      sourceId: "https://example.com/article",
      paragraphIndex: 2,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Paragraph index 2 not found")
  })

  it("quoteFromSource tetap semantik, bukan exact inspection", () => {
    const tools = createPaperTools({
      userId: "user_1" as never,
      conversationId: "conv_1" as never,
    }) as unknown as {
      quoteFromSource?: {
        description?: string
      }
    }

    expect(tools.quoteFromSource?.description).toContain("semantic chunks")
    expect(tools.quoteFromSource?.description).toContain("Do not use this tool to verify exact paragraph positions or exact titles")
  })
})
