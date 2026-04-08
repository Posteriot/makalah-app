import { describe, expect, it, vi } from "vitest"

import { classifyRevisionIntent } from "./revision-intent-classifier"

vi.mock("./classify", () => ({
  classifyIntent: vi.fn(),
}))

const mockModel = { modelId: "test-model" } as Parameters<typeof classifyRevisionIntent>[0]["model"]

describe("classifyRevisionIntent", () => {
  it("detects explicit revision intent", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        hasRevisionIntent: true,
        confidence: 0.92,
        reason: "Explicit revision verb",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyRevisionIntent({
      lastUserContent: "revisi abstrak",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.hasRevisionIntent).toBe(true)
    expect(result!.output.confidence).toBeGreaterThan(0.6)
  })

  it("detects implicit revision intent", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        hasRevisionIntent: true,
        confidence: 0.85,
        reason: "Implicit revision — user wants to improve content",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyRevisionIntent({
      lastUserContent: "buat yang lebih baik",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.hasRevisionIntent).toBe(true)
  })

  it("returns no revision intent for informational", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        hasRevisionIntent: false,
        confidence: 0.9,
        reason: "Informational question, not revision",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyRevisionIntent({
      lastUserContent: "bagaimana cara export?",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.hasRevisionIntent).toBe(false)
  })

  it("returns null on classifier failure", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce(null)

    const result = await classifyRevisionIntent({
      lastUserContent: "ubah judul",
      model: mockModel,
    })

    expect(result).toBeNull()
  })

  it("returns null for empty input", async () => {
    const { classifyIntent } = await import("./classify")
    const mockedClassify = vi.mocked(classifyIntent)
    mockedClassify.mockClear()

    const result = await classifyRevisionIntent({
      lastUserContent: "",
      model: mockModel,
    })

    expect(result).toBeNull()
    expect(mockedClassify).not.toHaveBeenCalled()
  })

  it("clamps confidence to 0..1", async () => {
    const { classifyIntent } = await import("./classify")
    vi.mocked(classifyIntent).mockResolvedValueOnce({
      output: {
        hasRevisionIntent: true,
        confidence: 1.5,
        reason: "Over-confident model",
      },
      metadata: { classifierVersion: "1.0.0" },
    })

    const result = await classifyRevisionIntent({
      lastUserContent: "revisi",
      model: mockModel,
    })

    expect(result).not.toBeNull()
    expect(result!.output.confidence).toBeLessThanOrEqual(1)
  })
})
