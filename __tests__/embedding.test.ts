import { describe, it, expect, vi, afterEach } from "vitest"
import { embedTexts, embedQuery } from "@/lib/ai/embedding"

vi.mock("@ai-sdk/google", () => ({
  google: {
    textEmbeddingModel: vi.fn().mockReturnValue("mock-model"),
  },
}))

vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return {
    ...original,
    embedMany: vi.fn().mockResolvedValue({
      embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
    }),
    embed: vi.fn().mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
    }),
  }
})

describe("embedTexts", () => {
  afterEach(() => { vi.clearAllMocks() })

  it("returns embeddings for multiple texts", async () => {
    const result = await embedTexts(["text one", "text two"])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([0.1, 0.2, 0.3])
    expect(result[1]).toEqual([0.4, 0.5, 0.6])
  })

  it("returns empty array for empty input", async () => {
    const result = await embedTexts([])
    expect(result).toEqual([])
  })
})

describe("embedQuery", () => {
  afterEach(() => { vi.clearAllMocks() })

  it("returns single embedding for query", async () => {
    const result = await embedQuery("search query")
    expect(result).toEqual([0.1, 0.2, 0.3])
  })
})
