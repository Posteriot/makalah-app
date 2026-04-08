import { describe, expect, it, vi } from "vitest"

import { classifyCompletedSessionIntent } from "./completed-session-classifier"

// Mock the classify utility
vi.mock("./classify", () => ({
  classifyIntent: vi.fn(),
}))

const mockModel = { modelId: "test-model" } as Parameters<typeof classifyCompletedSessionIntent>[0]["model"]

const VALID_STAGE_IDS = [
  "gagasan", "topik", "outline", "abstrak", "pendahuluan",
  "tinjauan_literatur", "metodologi", "hasil", "diskusi",
  "kesimpulan", "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul",
]

describe("classifyCompletedSessionIntent", () => {
  // ── Revision intent ──

  it("classifies explicit revision request", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        intent: "revision",
        handling: "allow_normal_ai",
        targetStage: null,
        needsClarification: false,
        confidence: 0.92,
        reason: "Explicit revision verb detected",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "revisi abstrak",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.intent).toBe("revision")
    expect(result!.output.handling).toBe("allow_normal_ai")
  })

  // ── Informational intent ──

  it("classifies informational question", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        intent: "informational",
        handling: "allow_normal_ai",
        targetStage: null,
        needsClarification: false,
        confidence: 0.88,
        reason: "User asking a question",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "bagaimana cara export?",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.intent).toBe("informational")
    expect(result!.output.handling).toBe("allow_normal_ai")
  })

  // ── Continuation / closing intent ──

  it("classifies short continuation prompt", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        intent: "continuation",
        handling: "short_circuit_closing",
        targetStage: null,
        needsClarification: false,
        confidence: 0.95,
        reason: "Short continuation signal",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "ok",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.intent).toBe("continuation")
    expect(result!.output.handling).toBe("short_circuit_closing")
  })

  // ── Artifact recall intent ──

  it("classifies artifact recall with target stage", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        intent: "artifact_recall",
        handling: "server_owned_artifact_recall",
        targetStage: "abstrak",
        needsClarification: false,
        confidence: 0.91,
        reason: "User wants to see abstrak artifact",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "lihat abstrak",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.intent).toBe("artifact_recall")
    expect(result!.output.handling).toBe("server_owned_artifact_recall")
    expect(result!.output.targetStage).toBe("abstrak")
  })

  // ── Artifact recall with compound stage name ──

  it("classifies artifact recall with compound stage name", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        intent: "artifact_recall",
        handling: "server_owned_artifact_recall",
        targetStage: "tinjauan_literatur",
        needsClarification: false,
        confidence: 0.89,
        reason: "User wants to see tinjauan literatur",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "tampilkan tinjauan literatur",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.targetStage).toBe("tinjauan_literatur")
  })

  // ── Ambiguous / clarify ──

  it("classifies ambiguous short prompt as needing clarification", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        intent: "other",
        handling: "clarify",
        targetStage: null,
        needsClarification: true,
        confidence: 0.35,
        reason: "Ambiguous short prompt",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "yang tadi",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.handling).toBe("clarify")
    expect(result!.output.needsClarification).toBe(true)
  })

  // ── Error handling ──

  it("returns null when classifier fails", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce(null)

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "lihat abstrak",
      model: mockModel,
    })

    expect(result).toBeNull()
  })

  // ── Router reason context ──

  it("passes routerReason as context to classifier", async () => {
    const { classifyIntent } = await import("./classify")
    const mockedClassify = vi.mocked(classifyIntent)

    mockedClassify.mockResolvedValueOnce({
      output: {
        intent: "artifact_recall",
        handling: "server_owned_artifact_recall",
        targetStage: "judul",
        needsClarification: false,
        confidence: 0.87,
        reason: "Router reason hints at recall",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    await classifyCompletedSessionIntent({
      lastUserContent: "keluarkan lagi artifak judul",
      routerReason: "User is asking to retrieve a previously generated artifact",
      model: mockModel,
    })

    expect(mockedClassify).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.stringContaining("User is asking to retrieve a previously generated artifact"),
      })
    )
  })

  // ── Valid stage IDs in system prompt ──

  it("includes valid stage IDs in system prompt", async () => {
    const { classifyIntent } = await import("./classify")
    const mockedClassify = vi.mocked(classifyIntent)

    mockedClassify.mockResolvedValueOnce({
      output: {
        intent: "other",
        handling: "allow_normal_ai",
        targetStage: null,
        needsClarification: false,
        confidence: 0.7,
        reason: "General message",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    await classifyCompletedSessionIntent({
      lastUserContent: "test",
      validStageIds: VALID_STAGE_IDS,
      model: mockModel,
    })

    const callArgs = mockedClassify.mock.calls[0]?.[0]
    expect(callArgs).toBeDefined()
    expect(callArgs!.systemPrompt).toContain("abstrak")
    expect(callArgs!.systemPrompt).toContain("tinjauan_literatur")
    expect(callArgs!.systemPrompt).toContain("daftar_pustaka")
  })

  // ── Invalid targetStage post-validation ──

  it("forces clarify when model hallucinates invalid targetStage", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        intent: "artifact_recall",
        handling: "server_owned_artifact_recall",
        targetStage: "nonexistent_stage",
        needsClarification: false,
        confidence: 0.8,
        reason: "Model hallucinated a stage",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "lihat nonexistent_stage",
      validStageIds: VALID_STAGE_IDS,
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.targetStage).toBeNull()
    expect(result!.output.handling).toBe("clarify")
    expect(result!.output.needsClarification).toBe(true)
  })

  // ── Low confidence runtime guard ──

  it("forces clarify when confidence is below 0.6 regardless of model handling", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        intent: "revision",
        handling: "allow_normal_ai",
        targetStage: null,
        needsClarification: false,
        confidence: 0.45,
        reason: "Weak revision signal",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyCompletedSessionIntent({
      lastUserContent: "hmm mungkin ubah",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.handling).toBe("clarify")
    expect(result!.output.needsClarification).toBe(true)
    // intent stays as classified — only handling is overridden
    expect(result!.output.intent).toBe("revision")
  })
})
