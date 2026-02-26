import { describe, expect, it } from "vitest"
import { validateStageSkillContent } from "./stage-skill-validator"

const VALID_GAGASAN_CONTENT = `
## Objective
Define a feasible research idea with clear novelty.

## Input Context
Read user intent, prior approved summaries, and available references.

## Tool Policy
Allowed:
- google_search (active mode)
- updateStageData
- createArtifact
- compileDaftarPustaka (mode: preview)
Disallowed:
- compileDaftarPustaka (mode: persist)
- stage jumping

## Output Contract
Required:
- ringkasan
Recommended:
- ringkasanDetail
- ideKasar
- analisis
- angle
- novelty

## Guardrails
Never fabricate references and never skip user confirmation before submit.

## Done Criteria
Stage draft is agreed, ringkasan is stored, and draft is ready for validation.
`

describe("validateStageSkillContent", () => {
  it("passes valid English content", () => {
    const result = validateStageSkillContent({
      stageScope: "gagasan",
      skillId: "gagasan-skill",
      name: "gagasan-skill",
      description: "Stage instruction for gagasan in Makalah AI paper workflow.",
      content: VALID_GAGASAN_CONTENT,
    })

    expect(result.ok).toBe(true)
    expect(result.issues).toHaveLength(0)
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

## Tool Policy
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
