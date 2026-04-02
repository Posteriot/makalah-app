import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchQuery } from "convex/nextjs"
import { getPaperModeSystemPrompt } from "./paper-mode-prompt"
import { resolveStageInstructions } from "./stage-skill-resolver"

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
}))

vi.mock("./stage-skill-resolver", () => ({
  resolveStageInstructions: vi.fn(),
}))

describe("getPaperModeSystemPrompt - stage skill integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("return none source saat tidak ada paper session", async () => {
    vi.mocked(fetchQuery).mockResolvedValueOnce(null)

    const result = await getPaperModeSystemPrompt("conv_1" as never, "token-1", "req-1")

    expect(result.prompt).toBe("")
    expect(result.stageInstructionSource).toBe("none")
    expect(result.skillResolverFallback).toBe(false)
    expect(resolveStageInstructions).not.toHaveBeenCalled()
  })

  it("pakai instruksi dari active skill dan expose metadata resolver", async () => {
    vi.mocked(fetchQuery)
      .mockResolvedValueOnce({
        _id: "session_1",
        currentStage: "abstrak",
        stageStatus: "drafting",
        userId: "user_1",
        stageData: {},
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    vi.mocked(resolveStageInstructions).mockResolvedValueOnce({
      instructions: "## Objective\nWrite an abstract with concise scope.",
      source: "skill",
      skillResolverFallback: false,
      skillId: "abstrak-skill",
      version: 3,
    })

    const result = await getPaperModeSystemPrompt("conv_1" as never, "token-2", "req-2")

    expect(resolveStageInstructions).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "abstrak",
        convexToken: "token-2",
        requestId: "req-2",
      })
    )
    expect(result.stageInstructionSource).toBe("skill")
    expect(result.skillResolverFallback).toBe(false)
    expect(result.activeSkillId).toBe("abstrak-skill")
    expect(result.activeSkillVersion).toBe(3)
    expect(result.prompt).toContain("Write an abstract with concise scope.")
    expect(result.prompt).toContain("Tahap: Penyusunan Abstrak")
  })

  it("fallback metadata diteruskan saat resolver mengembalikan fallback", async () => {
    vi.mocked(fetchQuery)
      .mockResolvedValueOnce({
        _id: "session_2",
        currentStage: "gagasan",
        stageStatus: "revision",
        userId: "user_2",
        stageData: {},
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    vi.mocked(resolveStageInstructions).mockResolvedValueOnce({
      instructions: "Fallback gagasan instruction",
      source: "fallback",
      skillResolverFallback: true,
      fallbackReason: "runtime_validation_failed",
      skillId: "gagasan-skill",
      version: 2,
    })

    const result = await getPaperModeSystemPrompt("conv_2" as never, "token-3", "req-3")

    expect(result.stageInstructionSource).toBe("fallback")
    expect(result.skillResolverFallback).toBe(true)
    expect(result.fallbackReason).toBe("runtime_validation_failed")
    expect(result.prompt).toContain("Fallback gagasan instruction")
    expect(result.prompt).toContain("REVISION MODE")
  })

  it("menyertakan konteks artifact aktif agar revisi memakai updateArtifact", async () => {
    vi.mocked(fetchQuery)
      .mockResolvedValueOnce({
        _id: "session_3",
        currentStage: "gagasan",
        stageStatus: "revision",
        userId: "user_3",
        stageData: {
          gagasan: {
            artifactId: "artifact_active_1",
          },
        },
      })
      .mockResolvedValueOnce([
        {
          _id: "artifact_active_1",
          title: "Gagasan Paper",
          content: "Konten artifact aktif",
          version: 2,
        },
      ])
      .mockResolvedValueOnce([])

    vi.mocked(resolveStageInstructions).mockResolvedValueOnce({
      instructions: "Fallback gagasan instruction",
      source: "fallback",
      skillResolverFallback: true,
      fallbackReason: "runtime_validation_failed",
    })

    const result = await getPaperModeSystemPrompt("conv_3" as never, "token-4", "req-4")

    expect(result.prompt).toContain("ACTIVE STAGE ARTIFACT EXISTS")
    expect(result.prompt).toContain("Artifact ID: artifact_active_1")
    expect(result.prompt).toContain("MUST use updateArtifact")
    expect(result.prompt).toContain("Do NOT call createArtifact")
  })
})
