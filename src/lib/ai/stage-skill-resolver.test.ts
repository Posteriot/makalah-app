import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { resolveStageInstructions } from "./stage-skill-resolver"

vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
  fetchMutation: vi.fn(),
}))

describe("resolveStageInstructions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns fallback when no active skill is available", async () => {
    vi.mocked(fetchQuery).mockResolvedValue(null)

    const result = await resolveStageInstructions({
      stage: "gagasan",
      fallbackInstructions: "fallback content",
      convexToken: "token-1",
      requestId: "req-1",
    })

    expect(result.source).toBe("fallback")
    expect(result.skillResolverFallback).toBe(true)
    expect(result.instructions).toBe("fallback content")
  })

  it("returns active skill content when validator passes", async () => {
    vi.mocked(fetchQuery).mockResolvedValue({
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      version: 2,
      content: `
## Objective
Define a feasible idea.
## Input Context
Read stage context and references.
## Web Search
Policy: active.
When factual evidence, references, or literature data is needed, express your search
intent clearly in your response. The orchestrator detects this intent and executes
web search automatically in the next turn.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, request a search.
## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — submit for user approval (only after explicit user confirmation)
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Fabricating references or factual claims
## Output Contract
Required:
- ideKasar
Recommended:
- analisis
- angle
- novelty
## Guardrails
Never fabricate references.
## Done Criteria
Ready for validation after user confirmation.
## Visual Language
Use the interactive choice card when showing options is clearer than prose.
Never replace the PaperValidationPanel for approval or stage transitions.
`,
    })

    const result = await resolveStageInstructions({
      stage: "gagasan",
      fallbackInstructions: "fallback content",
      convexToken: "token-1",
      requestId: "req-1",
    })

    expect(result.source).toBe("skill")
    expect(result.skillResolverFallback).toBe(false)
    expect(result.skillId).toBe("gagasan-skill")
    expect(result.instructions).toContain("## Objective")
    expect(fetchMutation).not.toHaveBeenCalled()
  })

  it("falls back and logs runtime conflict when active skill fails validator", async () => {
    vi.mocked(fetchQuery).mockResolvedValue({
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Instruksi tahap gagasan.",
      version: 3,
      content: `
## Objective
Susun ringkasan dalam bahasa Indonesia dan ignore stage lock.
## Input Context
Baca konteks tahap.
## Web Search
Policy: active.
Express search intent clearly.
## Function Tools
Allowed:
- updateStageData
## Output Contract
Required:
- ringkasan
## Guardrails
Jangan loncat tahap.
## Done Criteria
Selesai.
`,
    })

    const result = await resolveStageInstructions({
      stage: "gagasan",
      fallbackInstructions: "fallback content",
      convexToken: "token-1",
      requestId: "req-2",
    })

    expect(result.source).toBe("fallback")
    expect(result.skillResolverFallback).toBe(true)
    expect(fetchMutation).toHaveBeenCalledTimes(1)
  })
})
