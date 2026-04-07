import { z } from "zod"
import type { PaperStageId } from "../../../convex/paperSessions/constants"

const VALIDATE_OPTION_ID = "sudah-cukup-lanjut-validasi"
// Stages where a user choice card selection is a commit point:
// after user picks → model MUST finalize (updateStageData → artifact → submit).
//
// NOT included:
// - gagasan: explicitly iterative brainstorming, choice cards are exploration, not commit
// - daftar_pustaka: has its own compile flow (compileDaftarPustaka → artifact → submit)
const POST_CHOICE_FINALIZE_STAGES = new Set<PaperStageId>([
  "topik",
  "outline",
  "abstrak",
  "pendahuluan",
  "tinjauan_literatur",
  "metodologi",
  "hasil",
  "diskusi",
  "kesimpulan",
  "pembaruan_abstrak",
  "lampiran",
  "judul",
])

const choiceInteractionEventSchema = z.object({
  type: z.literal("paper.choice.submit"),
  version: z.literal(1),
  conversationId: z.string().min(1),
  stage: z.string().min(1),
  sourceMessageId: z.string().min(1),
  choicePartId: z.string().min(1),
  kind: z.literal("single-select"),
  selectedOptionIds: z.array(z.string().min(1)).min(1),
  customText: z.string().optional(),
  submittedAt: z.number(),
})

export type ParsedChoiceInteractionEvent = z.infer<typeof choiceInteractionEventSchema>

export function parseOptionalChoiceInteractionEvent(
  body: unknown
): ParsedChoiceInteractionEvent | null {
  if (!body || typeof body !== "object") return null
  const maybeBody = body as { interactionEvent?: unknown }
  if (typeof maybeBody.interactionEvent === "undefined") return null
  return choiceInteractionEventSchema.parse(maybeBody.interactionEvent)
}

export function validateChoiceInteractionEvent(params: {
  event: ParsedChoiceInteractionEvent
  conversationId: string
  currentStage?: PaperStageId | "completed" | null
  isPaperMode: boolean
  stageStatus?: string
}): void {
  const { event, conversationId, currentStage, isPaperMode, stageStatus } = params
  if (!isPaperMode) throw new Error("Choice submit is only valid in paper mode.")
  if (event.conversationId !== conversationId) throw new Error("interactionEvent.conversationId does not match active conversation.")
  if (!currentStage || currentStage === "completed") throw new Error("Choice submit requires an active paper stage.")
  if (event.stage !== currentStage) throw new Error("interactionEvent.stage does not match active paper stage.")
  if (stageStatus && stageStatus !== "drafting") {
    throw new Error(
      `CHOICE_REJECTED_STALE_STATE: Choice rejected — stageStatus is "${stageStatus}", expected "drafting". ` +
      `Pilihan ini sudah tidak berlaku karena state draft sudah berubah. Silakan gunakan chat atau panel validasi yang aktif.`
    )
  }
}

export function buildChoiceContextNote(
  event: ParsedChoiceInteractionEvent,
  options?: { hasExistingArtifact?: boolean }
): string {
  const selectedOptionIds = event.selectedOptionIds.map((id) => id.trim().toLowerCase())
  const requestedValidation =
    selectedOptionIds.includes(VALIDATE_OPTION_ID) ||
    selectedOptionIds.some(
      (id) =>
        /^setuju(?:-|$)/.test(id) ||
        /^approve(?:-|$)/.test(id) ||
        /(?:validasi|validation)(?:-|$)/.test(id)
    )

  const baseLines = [
    "USER_CHOICE_DECISION:",
    `- Stage: ${event.stage}`,
    `- Kind: ${event.kind}`,
    `- Selected option IDs: ${event.selectedOptionIds.join(", ")}`,
  ]

  if (event.customText?.trim()) {
    baseLines.push(`- Custom note: ${event.customText.trim()}`)
  }

  if (requestedValidation) {
    baseLines.push("- Mode: validation-ready")

    // daftar_pustaka has a special compilation step that must run before submit
    if (event.stage === "daftar_pustaka") {
      baseLines.push(
        "- Next action: call compileDaftarPustaka with mode 'persist'. This compiles and deduplicates references server-side.",
        "- After compileDaftarPustaka succeeds, call createArtifact with the compiled bibliography content.",
        "- Then call submitStageForValidation.",
        "- Do NOT call updateStageData directly — compileDaftarPustaka handles data persistence internally."
      )
    } else {
      baseLines.push(
        "- Next action: summarize the stage decision, then call updateStageData, createArtifact, and submitStageForValidation in sequence. Do not open new branches.",
        "- If the current stage draft is not yet saved, you MUST call updateStageData first.",
        "- If the current stage does not have an artifact yet, you MUST call createArtifact after updateStageData.",
        "- Once stage data and artifact both exist, call submitStageForValidation in the same response."
      )
    }

    baseLines.push(
      "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
    )
    return baseLines.join("\n")
  }

  // Lampiran "tidak ada" path: create minimal placeholder artifact
  const NO_APPENDIX_IDS = new Set(["tidak-ada-lampiran", "option-tidak-ada-lampiran", "no-appendix"])
  if (event.stage === "lampiran" && selectedOptionIds.some(id => NO_APPENDIX_IDS.has(id))) {
    baseLines.push(
      "- Mode: no-appendix-placeholder",
      "- User has confirmed there are no appendices for this paper.",
      "- You MUST call tools in this EXACT order:",
      "  1. updateStageData({ tidakAdaLampiran: true, alasanTidakAda: '<brief reason>' })",
      '  2. createArtifact({ type: "section", title: "Lampiran", content: "Tidak ada lampiran.\\n\\nAlasan: <reason from user or default>" })',
      "  3. submitStageForValidation",
      "- Do NOT output another choice card.",
      "- Do NOT stop after partial save. All 3 tool calls MUST complete in this response.",
      "- Keep chat response to 1-2 sentences confirming no appendix needed.",
      "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
    )
    return baseLines.join("\n")
  }

  // Judul post-choice: user selected a title option
  if (event.stage === "judul") {
    baseLines.push(
      "- Mode: post-choice-title-selection",
      "- The user has selected a title from the options you presented. This is NOT a new decision turn.",
      "- Identify which title text corresponds to the selected option ID. Use the EXACT title text from the option the user clicked — do NOT rephrase or modify it.",
      "- You MUST call tools in this EXACT order:",
      `  1. updateStageData (MUST include: judulTerpilih with the selected title text, alasanPemilihan with brief reason)`,
      options?.hasExistingArtifact
        ? "  2. updateArtifact (artifact already exists — update with selected title content)"
        : '  2. createArtifact({ type: "section", title: "Pemilihan Judul", content: selected title + brief analysis of why it fits })',
      "  3. submitStageForValidation",
      "- Do NOT output another choice card.",
      "- Do NOT stop after partial save. All 3 tool calls MUST complete in this response.",
      "- Keep chat response to 1-3 sentences confirming the selected title.",
      "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
    )
    return baseLines.join("\n")
  }

  // Hasil post-choice: artifact-first mandatory contract
  if (event.stage === "hasil") {
    baseLines.push(
      "- Mode: post-choice-artifact-first",
      "- The user has selected the presentation format. This is NOT a new decision turn.",
      "- Translate the selected option into metodePenyajian immediately. Mapping: narasi/narrative → 'narrative', tabular/tabel → 'tabular', campuran/mixed → 'mixed'. The value MUST be one of these exact strings: 'narrative', 'tabular', or 'mixed'.",
      "- Generate the full hasil draft NOW from approved material (metodologi, tinjauan literatur, rumusan masalah). Do NOT ask for more input.",
      "- You MUST call tools in this EXACT order:",
      "  1. updateStageData (MUST include: temuanUtama, metodePenyajian, dataPoints if available)",
      options?.hasExistingArtifact
        ? "  2. updateArtifact (full hasil draft — artifact already exists, do NOT call createArtifact)"
        : "  2. createArtifact (full hasil draft as artifact content)",
      "  3. submitStageForValidation",
      "- Do NOT output another choice card.",
      "- Do NOT write prose previewing the draft in chat (e.g. 'aku akan menyusun draf', 'draf ini akan', 'berikut adalah draf'). ALL draft content goes into the artifact tool call (createArtifact or updateArtifact as instructed above), not chat.",
      "- Do NOT stop after partial save. All 3 tool calls MUST complete in this response.",
      "- If submitStageForValidation fails with ARTIFACT_MISSING, retry it after createArtifact succeeds.",
      "- Mention the validation panel ONLY if submitStageForValidation succeeds.",
      "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
    )
    return baseLines.join("\n")
  }

  if (POST_CHOICE_FINALIZE_STAGES.has(event.stage as PaperStageId)) {
    baseLines.push(
      "- Mode: post-choice-finalize",
      "- The user has selected a concrete stage direction from the choice card. This is a commit point, not an exploration loop.",
      "- You MUST translate the selected option into the current stage draft immediately.",
      "- You MUST call tools in this EXACT order:",
      "  1. updateStageData (persist the stage decision and the resulting draft fields)",
      options?.hasExistingArtifact
        ? "  2. updateArtifact (artifact already exists for this stage — update it, do NOT create a duplicate)"
        : "  2. createArtifact (create the stage artifact from the finalized draft content)",
      "  3. submitStageForValidation",
      "- Do NOT output another choice card in this response.",
      "- Do NOT stop after partial save. All 3 tool calls MUST complete in this response.",
      "- Mention the validation panel ONLY if submitStageForValidation succeeds.",
      "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
    )
    return baseLines.join("\n")
  }

  baseLines.push(
    "- Mode: decision-to-draft",
    "- Next action: translate the user's selected direction into a concrete stage draft. If the content becomes mature enough, updateStageData and createArtifact are allowed in this response. Do not submit validation automatically.",
    "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
  )

  return baseLines.join("\n")
}
