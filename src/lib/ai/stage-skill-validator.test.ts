import { describe, expect, it } from "vitest"
import { validateStageSkillContent } from "./stage-skill-validator"

const VALID_GAGASAN_CONTENT = `
## Objective
Define a feasible research idea with clear novelty.

## Input Context
Read user intent, prior approved summaries, and available references.

## Web Search
Policy: active.
When factual evidence, references, or literature data is needed, express your search
intent clearly in your response (e.g., "Saya akan mencari referensi tentang X" or
"Perlu mencari data pendukung untuk Y"). The orchestrator detects this intent and
executes web search automatically in the next turn.
IMPORTANT: Web search and function tools cannot run in the same turn. After search
results arrive, use function tools to save findings.
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
Never fabricate references and never skip user confirmation before submit.

## Done Criteria
Stage draft is agreed, artifact is created, and draft is ready for validation.
`

describe("validateStageSkillContent", () => {
  it("passes valid content with new Web Search + Function Tools sections", () => {
    const result = validateStageSkillContent({
      stageScope: "gagasan",
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      content: VALID_GAGASAN_CONTENT,
    })

    expect(result.ok).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(result.metadata.declaredSearchPolicy).toBe("active")
  })

  it("detects search policy from Web Search section", () => {
    const passiveContent = VALID_GAGASAN_CONTENT.replace("Policy: active.", "Policy: passive.")
    const result = validateStageSkillContent({
      stageScope: "gagasan",
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      content: passiveContent,
    })

    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.code === "search_policy_mismatch")).toBe(true)
  })

  it("rejects content missing Function Tools section", () => {
    const noFunctionTools = VALID_GAGASAN_CONTENT.replace(/## Function Tools[\s\S]*?(?=## Output Contract)/, "")
    const result = validateStageSkillContent({
      stageScope: "gagasan",
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      content: noFunctionTools,
    })

    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.code === "missing_section_function_tools")).toBe(true)
  })

  it("rejects content missing createArtifact in Function Tools", () => {
    const noCreateArtifact = VALID_GAGASAN_CONTENT.replace(
      "- createArtifact — create stage output artifact\n",
      ""
    )
    const result = validateStageSkillContent({
      stageScope: "gagasan",
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      content: noCreateArtifact,
    })

    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.code === "missing_create_artifact_in_function_tools")).toBe(true)
  })

  it("rejects persist compile instruction on non-daftar_pustaka stage", () => {
    const result = validateStageSkillContent({
      stageScope: "gagasan",
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      content: `${VALID_GAGASAN_CONTENT}\ncompileDaftarPustaka({ mode: "persist" })`,
    })

    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.code === "persist_compile_forbidden")).toBe(true)
  })

  it("rejects output keys outside STAGE_KEY_WHITELIST", () => {
    const result = validateStageSkillContent({
      stageScope: "gagasan",
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      content: VALID_GAGASAN_CONTENT.replace("- novelty", "- novelty\n- unknownOutputKey"),
    })

    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.code === "output_keys_not_whitelisted")).toBe(true)
  })

  it("rejects low-confidence non-English content", () => {
    const result = validateStageSkillContent({
      stageScope: "gagasan",
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Instruksi tahap gagasan untuk sistem ini.",
      content: `
## Objective
Susun ringkasan tahap dengan bahasa Indonesia.

## Input Context
Baca data tahap dan referensi yang tersedia.

## Web Search
Policy: active.
Cari referensi yang relevan.

## Function Tools
Allowed:
- updateStageData

## Output Contract
Required:
- ringkasan

## Guardrails
Jangan melompat tahap.

## Done Criteria
Selesai saat user setuju.
`,
    })

    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.code === "non_english_content")).toBe(true)
  })
})
