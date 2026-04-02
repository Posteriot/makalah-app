import { z } from "zod"
import type { PaperStageId } from "../../../convex/paperSessions/constants"

const VALIDATE_OPTION_ID = "sudah-cukup-lanjut-validasi"

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

export function isValidationChoiceInteractionEvent(
  event: ParsedChoiceInteractionEvent
): boolean {
  const selectedOptionIds = event.selectedOptionIds.map((id) => id.trim().toLowerCase())
  return (
    selectedOptionIds.includes(VALIDATE_OPTION_ID) ||
    selectedOptionIds.some(
      (id) =>
        id === "confirm" ||
        id === "confirmed" ||
        /^setuju(?:-|$)/.test(id) ||
        /^approve(?:-|$)/.test(id) ||
        /(?:validasi|validation)(?:-|$)/.test(id)
    )
  )
}

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
}): void {
  const { event, conversationId, currentStage, isPaperMode } = params
  if (!isPaperMode) throw new Error("Choice submit is only valid in paper mode.")
  if (event.conversationId !== conversationId) throw new Error("interactionEvent.conversationId does not match active conversation.")
  if (!currentStage || currentStage === "completed") throw new Error("Choice submit requires an active paper stage.")
  if (event.stage !== currentStage) throw new Error("interactionEvent.stage does not match active paper stage.")
}

export function buildChoiceContextNote(
  event: ParsedChoiceInteractionEvent
): string {
  const requestedValidation = isValidationChoiceInteractionEvent(event)

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
        "- Next action: call compileDaftarPustaka with mode 'persist' and a ringkasan summarizing the bibliography. This compiles and deduplicates references server-side.",
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

  baseLines.push(
    "- Mode: decision-to-draft",
    "- Next action: translate the user's selected direction into a concrete stage draft. If the content becomes mature enough, updateStageData and createArtifact are allowed in this response. Do not submit validation automatically.",
    "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
  )

  return baseLines.join("\n")
}
