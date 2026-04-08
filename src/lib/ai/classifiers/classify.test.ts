import { describe, expect, it, vi } from "vitest"

import { classifyIntent } from "./classify"
import { CompletedSessionClassifierSchema } from "./schemas"

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
      intent: "revision",
      handling: "allow_normal_ai",
      targetStage: null,
      needsClarification: false,
      confidence: 0.9,
      reason: "User explicitly requested revision",
    }

    mockedGenerateText.mockResolvedValueOnce({
      output: mockOutput,
    } as Awaited<ReturnType<typeof generateText>>)

    const result = await classifyIntent({
      schema: CompletedSessionClassifierSchema,
      systemPrompt: "Classify user intent in a completed paper session.",
      userMessage: "revisi abstrak",
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
      schema: CompletedSessionClassifierSchema,
      systemPrompt: "Classify user intent.",
      userMessage: "lihat abstrak",
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
      schema: CompletedSessionClassifierSchema,
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
        intent: "other",
        handling: "clarify",
        targetStage: null,
        needsClarification: true,
        confidence: 0.4,
        reason: "Ambiguous input",
      },
    } as Awaited<ReturnType<typeof generateText>>)

    await classifyIntent({
      schema: CompletedSessionClassifierSchema,
      systemPrompt: "You are a classifier.",
      userMessage: "hmm yang tadi",
      model: mockModel,
    })

    // Verify Output.object was called with the schema
    expect(mockedOutputObject).toHaveBeenCalledWith({
      schema: CompletedSessionClassifierSchema,
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
        intent: "artifact_recall",
        handling: "server_owned_artifact_recall",
        targetStage: "abstrak",
        needsClarification: false,
        confidence: 0.85,
        reason: "User wants to see abstrak artifact",
      },
    } as Awaited<ReturnType<typeof generateText>>)

    await classifyIntent({
      schema: CompletedSessionClassifierSchema,
      systemPrompt: "Classify intent.",
      userMessage: "lihat abstrak",
      context: "Router reason: artifact retrieval requested",
      model: mockModel,
    })

    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Router reason: artifact retrieval requested"),
      })
    )
  })
})
