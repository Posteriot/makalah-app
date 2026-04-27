import { describe, expect, it, vi } from "vitest"

import { classifyIntent } from "./classify"
import { ExactSourceClassifierSchema } from "./schemas"

// Mock the AI SDK generateText
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((opts: { schema: unknown }) => opts),
  },
}))

// Mock model provider — classifyIntent receives a model, doesn't fetch one
const mockModel = { modelId: "test-model" } as Parameters<typeof classifyIntent>[0]["model"]

describe("classifyIntent", () => {
  it("returns output with classifierVersion metadata on success", async () => {
    const { generateText } = await import("ai")
    const mockedGenerateText = vi.mocked(generateText)

    const mockOutput = {
      mode: "force_inspect",
      sourceIntent: "exact_detail",
      mentionedSourceHint: "arxiv paper",
      needsClarification: false,
      confidence: 0.9,
      reason: "User explicitly requested source details",
    }

    mockedGenerateText.mockResolvedValueOnce({
      output: mockOutput,
    } as Awaited<ReturnType<typeof generateText>>)

    const result = await classifyIntent({
      schema: ExactSourceClassifierSchema,
      systemPrompt: "Classify exact source follow-up intent.",
      userMessage: "show me the arxiv paper details",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output).toEqual(mockOutput)
    expect(result!.metadata.classifierVersion).toBe("1.0.0")
  })

  it("returns null when generateText throws an error", async () => {
    const { generateText } = await import("ai")
    const mockedGenerateText = vi.mocked(generateText)

    mockedGenerateText.mockRejectedValueOnce(new Error("Model timeout"))

    const result = await classifyIntent({
      schema: ExactSourceClassifierSchema,
      systemPrompt: "Classify user intent.",
      userMessage: "lihat sumber pertama",
      model: mockModel,
    })

    expect(result).toBeNull()
  })

  it("returns null when generateText returns null output", async () => {
    const { generateText } = await import("ai")
    const mockedGenerateText = vi.mocked(generateText)

    mockedGenerateText.mockResolvedValueOnce({
      output: null,
    } as Awaited<ReturnType<typeof generateText>>)

    const result = await classifyIntent({
      schema: ExactSourceClassifierSchema,
      systemPrompt: "Classify user intent.",
      userMessage: "something",
      model: mockModel,
    })

    expect(result).toBeNull()
  })

  it("passes system prompt, user message, Output.object, and temperature: 0 to generateText", async () => {
    const { generateText, Output } = await import("ai")
    const mockedGenerateText = vi.mocked(generateText)
    const mockedOutputObject = vi.mocked(Output.object)

    mockedGenerateText.mockResolvedValueOnce({
      output: {
        mode: "clarify",
        sourceIntent: "none",
        mentionedSourceHint: null,
        needsClarification: true,
        confidence: 0.4,
        reason: "Ambiguous input",
      },
    } as Awaited<ReturnType<typeof generateText>>)

    await classifyIntent({
      schema: ExactSourceClassifierSchema,
      systemPrompt: "You are a classifier.",
      userMessage: "hmm yang tadi",
      model: mockModel,
    })

    // Verify Output.object was called with the schema
    expect(mockedOutputObject).toHaveBeenCalledWith({
      schema: ExactSourceClassifierSchema,
    })

    // Verify generateText received all required parameters
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: mockModel,
        system: "You are a classifier.",
        prompt: "hmm yang tadi",
        temperature: 0,
      })
    )
  })

  it("includes context in prompt when provided", async () => {
    const { generateText } = await import("ai")
    const mockedGenerateText = vi.mocked(generateText)

    mockedGenerateText.mockResolvedValueOnce({
      output: {
        mode: "force_inspect",
        sourceIntent: "exact_detail",
        mentionedSourceHint: "Nature article",
        needsClarification: false,
        confidence: 0.85,
        reason: "User wants exact details from Nature article",
      },
    } as Awaited<ReturnType<typeof generateText>>)

    await classifyIntent({
      schema: ExactSourceClassifierSchema,
      systemPrompt: "Classify intent.",
      userMessage: "show me the Nature article",
      context: "Router reason: source inspection requested",
      model: mockModel,
    })

    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Router reason: source inspection requested"),
      })
    )
  })
})
