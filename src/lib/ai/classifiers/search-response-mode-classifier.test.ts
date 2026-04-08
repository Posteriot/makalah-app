import { describe, expect, it, vi } from "vitest"

import { classifySearchResponseMode } from "./search-response-mode-classifier"

// Mock the classify utility
vi.mock("./classify", () => ({
  classifyIntent: vi.fn(),
}))

const mockModel = { modelId: "test-model" } as Parameters<typeof classifySearchResponseMode>[0]["model"]

describe("classifySearchResponseMode", () => {
  // ── Synthesis intent ──

  it("classifies general question as synthesis", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        responseMode: "synthesis",
        confidence: 0.93,
        reason: "User asking a factual question expecting a narrative answer",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifySearchResponseMode({
      lastUserMessage: "what are the effects of climate change on agriculture",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.responseMode).toBe("synthesis")
    expect(result!.output.confidence).toBeGreaterThan(0.6)
  })

  // ── Reference inventory intent ──

  it("classifies source listing request as reference_inventory", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        responseMode: "reference_inventory",
        confidence: 0.91,
        reason: "User explicitly requesting source list",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifySearchResponseMode({
      lastUserMessage: "show me the sources and citations you used",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.responseMode).toBe("reference_inventory")
  })

  // ── Another reference inventory variant ──

  it("classifies link request as reference_inventory", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        responseMode: "reference_inventory",
        confidence: 0.88,
        reason: "User wants links and PDF references",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifySearchResponseMode({
      lastUserMessage: "give me all the links and pdf references",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.responseMode).toBe("reference_inventory")
  })

  // ── Classifier failure ──

  it("returns null when classifier fails", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce(null)

    const result = await classifySearchResponseMode({
      lastUserMessage: "tell me about quantum computing",
      model: mockModel,
    })

    expect(result).toBeNull()
  })

  // ── Empty input pre-check ──

  it("returns null for empty input without calling classifier", async () => {
    const { classifyIntent } = await import("./classify")
    const mockedClassify = vi.mocked(classifyIntent)
    mockedClassify.mockClear()

    const result = await classifySearchResponseMode({
      lastUserMessage: "",
      model: mockModel,
    })

    expect(result).toBeNull()
    expect(mockedClassify).not.toHaveBeenCalled()
  })

  it("returns null for whitespace-only input without calling classifier", async () => {
    const { classifyIntent } = await import("./classify")
    const mockedClassify = vi.mocked(classifyIntent)
    mockedClassify.mockClear()

    const result = await classifySearchResponseMode({
      lastUserMessage: "   \t\n  ",
      model: mockModel,
    })

    expect(result).toBeNull()
    expect(mockedClassify).not.toHaveBeenCalled()
  })

  // ── Confidence clamping ──

  it("clamps confidence above 1 to 1", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        responseMode: "synthesis",
        confidence: 1.5,
        reason: "Over-confident model",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifySearchResponseMode({
      lastUserMessage: "explain photosynthesis",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.confidence).toBe(1)
  })

  it("clamps negative confidence to 0", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        responseMode: "reference_inventory",
        confidence: -0.3,
        reason: "Negative confidence edge case",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifySearchResponseMode({
      lastUserMessage: "list all references",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.confidence).toBe(0)
  })

  // ── Passes correct arguments to classifyIntent ──

  it("passes schema, system prompt, and user message to classifyIntent", async () => {
    const { classifyIntent } = await import("./classify")
    const mockedClassify = vi.mocked(classifyIntent)
    mockedClassify.mockResolvedValueOnce({
      output: {
        responseMode: "synthesis",
        confidence: 0.85,
        reason: "General question",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    await classifySearchResponseMode({
      lastUserMessage: "how does machine learning work",
      model: mockModel,
    })

    expect(mockedClassify).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: "how does machine learning work",
        systemPrompt: expect.stringContaining("synthesis"),
        schema: expect.any(Object),
        model: mockModel,
      })
    )
  })
})
