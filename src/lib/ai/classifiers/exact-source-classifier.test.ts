import { describe, expect, it, vi } from "vitest"

import { classifyExactSourceIntent } from "./exact-source-classifier"

// Mock the classify utility
vi.mock("./classify", () => ({
  classifyIntent: vi.fn(),
}))

const mockModel = { modelId: "test-model" } as Parameters<typeof classifyExactSourceIntent>[0]["model"]

describe("classifyExactSourceIntent", () => {
  // ── Exact detail intent ──

  it("classifies exact detail request (title, author, verbatim quote)", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        mode: "force_inspect",
        sourceIntent: "exact_detail",
        mentionedSourceHint: "neural network optimization",
        needsClarification: false,
        confidence: 0.93,
        reason: "User asks for exact title and author",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyExactSourceIntent({
      lastUserMessage: "what is the full title and author of the neural network optimization paper?",
      availableSourceTitles: ["Neural Network Optimization Techniques", "Deep Learning Survey"],
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.sourceIntent).toBe("exact_detail")
    expect(result!.output.mode).toBe("force_inspect")
    expect(result!.output.mentionedSourceHint).toBe("neural network optimization")
  })

  // ── Summary intent ──

  it("classifies summary request", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        mode: "none",
        sourceIntent: "summary",
        mentionedSourceHint: "deep learning survey",
        needsClarification: false,
        confidence: 0.88,
        reason: "User asks for a summary overview",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyExactSourceIntent({
      lastUserMessage: "summarize the deep learning survey article",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.sourceIntent).toBe("summary")
    expect(result!.output.mode).toBe("none")
  })

  // ── Continuation intent ──

  it("classifies continuation follow-up referencing previous source", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        mode: "force_inspect",
        sourceIntent: "continuation",
        mentionedSourceHint: null,
        needsClarification: false,
        confidence: 0.85,
        reason: "Short follow-up referencing previously discussed source",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyExactSourceIntent({
      lastUserMessage: "the full version?",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.sourceIntent).toBe("continuation")
    expect(result!.output.mode).toBe("force_inspect")
    expect(result!.output.mentionedSourceHint).toBeNull()
  })

  // ── None intent ──

  it("classifies unrelated message as none", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        mode: "none",
        sourceIntent: "none",
        mentionedSourceHint: null,
        needsClarification: false,
        confidence: 0.95,
        reason: "Unrelated general question",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyExactSourceIntent({
      lastUserMessage: "what time is it?",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.sourceIntent).toBe("none")
    expect(result!.output.mode).toBe("none")
  })

  // ── Classifier failure ──

  it("returns null when classifier fails", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce(null)

    const result = await classifyExactSourceIntent({
      lastUserMessage: "show me the title",
      model: mockModel,
    })

    expect(result).toBeNull()
  })

  // ── Empty input pre-check ──

  it("returns null for empty input without calling classifier", async () => {
    const { classifyIntent } = await import("./classify")
    const mockedClassify = vi.mocked(classifyIntent)
    mockedClassify.mockClear()

    const result = await classifyExactSourceIntent({
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

    const result = await classifyExactSourceIntent({
      lastUserMessage: "   \t\n  ",
      model: mockModel,
    })

    expect(result).toBeNull()
    expect(mockedClassify).not.toHaveBeenCalled()
  })

  // ── Confidence clamping ──

  it("clamps confidence above 1.0 to 1.0", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        mode: "force_inspect",
        sourceIntent: "exact_detail",
        mentionedSourceHint: "some paper",
        needsClarification: false,
        confidence: 1.5,
        reason: "Over-confident model",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyExactSourceIntent({
      lastUserMessage: "give me the exact title of some paper",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.confidence).toBe(1.0)
  })

  it("clamps negative confidence to 0 and forces clarify", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        mode: "force_inspect",
        sourceIntent: "exact_detail",
        mentionedSourceHint: null,
        needsClarification: false,
        confidence: -0.3,
        reason: "Negative confidence from model",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyExactSourceIntent({
      lastUserMessage: "title?",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.confidence).toBe(0)
    // Low confidence guard should also trigger
    expect(result!.output.mode).toBe("clarify")
    expect(result!.output.needsClarification).toBe(true)
  })

  // ── Low confidence runtime guard ──

  it("forces clarify when confidence is below 0.6 regardless of model mode", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        mode: "force_inspect",
        sourceIntent: "exact_detail",
        mentionedSourceHint: "some source",
        needsClarification: false,
        confidence: 0.45,
        reason: "Weak signal",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyExactSourceIntent({
      lastUserMessage: "maybe show that source?",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.mode).toBe("clarify")
    expect(result!.output.needsClarification).toBe(true)
    // sourceIntent stays as classified — only mode is overridden
    expect(result!.output.sourceIntent).toBe("exact_detail")
  })

  // ── Available source titles passed as context ──

  it("passes available source titles as context to classifier", async () => {
    const { classifyIntent } = await import("./classify")
    const mockedClassify = vi.mocked(classifyIntent)
    mockedClassify.mockClear()

    mockedClassify.mockResolvedValueOnce({
      output: {
        mode: "force_inspect",
        sourceIntent: "exact_detail",
        mentionedSourceHint: "AI ethics",
        needsClarification: false,
        confidence: 0.9,
        reason: "Source title matched",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    await classifyExactSourceIntent({
      lastUserMessage: "who wrote the AI ethics article?",
      availableSourceTitles: ["AI Ethics in Practice", "Machine Learning Basics"],
      model: mockModel,
    })

    const callArgs = mockedClassify.mock.calls[0]?.[0]
    expect(callArgs).toBeDefined()
    expect(callArgs!.context).toContain("AI Ethics in Practice")
    expect(callArgs!.context).toContain("Machine Learning Basics")
  })
})
