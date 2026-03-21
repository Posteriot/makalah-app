import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { embedTexts, embedQuery } from "@/lib/ai/embedding"

const { mockGatewayTextEmbeddingModel, mockEmbedMany, mockEmbed } = vi.hoisted(() => ({
  mockGatewayTextEmbeddingModel: vi.fn().mockReturnValue("mock-model"),
  mockEmbedMany: vi.fn().mockResolvedValue({
    embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
  }),
  mockEmbed: vi.fn().mockResolvedValue({
    embedding: [0.1, 0.2, 0.3],
  }),
}))

vi.mock("@ai-sdk/gateway", () => ({
  gateway: {
    textEmbeddingModel: mockGatewayTextEmbeddingModel,
  },
}))

vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return {
    ...original,
    embedMany: mockEmbedMany,
    embed: mockEmbed,
  }
})

describe("embedTexts", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => { vi.clearAllMocks() })

  it("returns embeddings for multiple texts", async () => {
    const result = await embedTexts(["text one", "text two"])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([0.1, 0.2, 0.3])
    expect(result[1]).toEqual([0.4, 0.5, 0.6])
    expect(mockGatewayTextEmbeddingModel).toHaveBeenCalledWith("google/gemini-embedding-001")
    expect(mockEmbedMany).toHaveBeenCalledWith({
      model: "mock-model",
      values: ["text one", "text two"],
      providerOptions: {
        google: {
          outputDimensionality: 768,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    })
  })

  it("returns empty array for empty input", async () => {
    const result = await embedTexts([])
    expect(result).toEqual([])
  })

  it("fails fast on hard quota exhaustion instead of retrying", async () => {
    const quotaError = Object.assign(new Error("You exceeded your current quota, please check your plan and billing details."), {
      statusCode: 429,
      responseBody: JSON.stringify({
        error: {
          status: "RESOURCE_EXHAUSTED",
          message: "You exceeded your current quota, please check your plan and billing details.",
        },
      }),
    })
    mockEmbedMany.mockRejectedValueOnce(quotaError)

    await expect(embedTexts(["quota hit"])).rejects.toThrow(/current quota/i)
    expect(mockEmbedMany).toHaveBeenCalledTimes(1)
  })
})

describe("embedQuery", () => {
  afterEach(() => { vi.clearAllMocks() })

  it("returns single embedding for query", async () => {
    const result = await embedQuery("search query")
    expect(result).toEqual([0.1, 0.2, 0.3])
    expect(mockEmbed).toHaveBeenCalledWith({
      model: "mock-model",
      value: "search query",
      providerOptions: {
        google: {
          outputDimensionality: 768,
          taskType: "RETRIEVAL_QUERY",
        },
      },
    })
  })
})
