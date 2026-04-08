import type { LanguageModel } from "ai"

import { classifyIntent, type ClassifierResult } from "./classify"
import {
  CompletedSessionClassifierSchema,
  type CompletedSessionClassifierOutput,
} from "./schemas"

import { STAGE_ORDER } from "../../../../convex/paperSessions/constants"

const SYSTEM_PROMPT_BASE = `You are a semantic intent classifier for a completed paper-writing session.

The user has already completed all stages of their academic paper. The session is finished.
Your job is to classify what the user wants to do now.

Classify the user's message into one of these intents:
- "revision": The user wants to modify, edit, revise, redo, or improve existing content.
- "informational": The user is asking a question — about the paper, the process, how to export, where to find something, etc.
- "continuation": The user is sending a short confirmation or continuation signal (e.g., "ok", "lanjut", "gas", "sip", "done").
- "artifact_recall": The user wants to see or display a previously generated artifact from a specific paper stage.
- "other": None of the above. The message is ambiguous or doesn't fit any category.

Based on the intent, choose the appropriate handling:
- "short_circuit_closing": For continuation signals — end the session with a closing message.
- "allow_normal_ai": For revision requests and informational questions — let the AI process the message normally.
- "server_owned_artifact_recall": For artifact recall requests — fetch and display the artifact from a specific stage.
- "clarify": When the intent is ambiguous and you are not confident — ask the user to clarify.

Rules:
- If the user starts with a question word (apa, apakah, bagaimana, di mana, kenapa, mengapa), treat it as informational, NOT artifact recall — even if they mention a stage name.
- If the user mentions a display verb (lihat, tampilkan, buka, show, etc.) AND a stage name, that is artifact recall.
- If the user sends ONLY a bare stage name (e.g., just "judul", "abstrak", "outline") WITHOUT a display verb or other context, classify as "other" with handling "clarify" — the intent is ambiguous (could be recall, revision, question, or reference). Do NOT assume artifact recall for bare stage names alone.
- If you classify as artifact_recall, you MUST provide the targetStage from the valid stage list. If you cannot determine the stage, set targetStage to null and needsClarification to true.
- If confidence is below 0.6, set handling to "clarify" and needsClarification to true.
- Empty or whitespace-only messages should be classified as continuation with short_circuit_closing.`

function buildSystemPrompt(validStageIds: readonly string[]): string {
  return `${SYSTEM_PROMPT_BASE}

Valid paper stage IDs (use exactly these values for targetStage):
${validStageIds.map((id) => `- "${id}"`).join("\n")}`
}

/**
 * Classify user intent in a completed paper session using semantic classification.
 *
 * Replaces regex-based fallback heuristics (REVISION_VERB_PATTERN, INFORMATIONAL_PATTERN,
 * CONTINUE_LIKE_PATTERN, RECALL_DISPLAY_VERB, RECALL_ARTIFACT_TARGET, etc.) with
 * structured LLM classification.
 *
 * Returns null on classifier failure — caller must use safe default (allow_normal_ai).
 */
export async function classifyCompletedSessionIntent(options: {
  lastUserContent: string
  routerReason?: string
  validStageIds?: readonly string[]
  model: LanguageModel
}): Promise<ClassifierResult<CompletedSessionClassifierOutput> | null> {
  const {
    lastUserContent,
    routerReason,
    validStageIds = STAGE_ORDER,
    model,
  } = options

  // Deterministic pre-check: empty/whitespace input should not be sent to model.
  // Caller handles empty input via deterministic short_circuit_closing.
  if (!lastUserContent.trim()) {
    return null
  }

  const systemPrompt = buildSystemPrompt(validStageIds)

  const context = routerReason
    ? `Router reason (secondary signal from upstream LLM router): ${routerReason}`
    : undefined

  const result = await classifyIntent({
    schema: CompletedSessionClassifierSchema,
    systemPrompt,
    userMessage: lastUserContent,
    context,
    model,
  })

  if (!result) {
    return null
  }

  // Post-validation: enforce runtime guards that must not depend on model compliance

  // Guard 1: invalid targetStage → force clarify
  if (
    result.output.targetStage !== null &&
    !validStageIds.includes(result.output.targetStage)
  ) {
    result.output.targetStage = null
    result.output.handling = "clarify"
    result.output.needsClarification = true
  }

  // Guard 2: low confidence → force clarify
  if (result.output.confidence < 0.6) {
    result.output.handling = "clarify"
    result.output.needsClarification = true
  }

  // Guard 3: bare stage name without display verb → force clarify
  // Prevents classifier from assuming artifact recall on ambiguous single-word inputs
  const trimmedInput = options.lastUserContent.trim().toLowerCase()
  const isBareInput = !trimmedInput.includes(" ")
  if (
    isBareInput &&
    result.output.handling === "server_owned_artifact_recall" &&
    validStageIds.includes(trimmedInput)
  ) {
    result.output.handling = "clarify"
    result.output.needsClarification = true
    result.output.targetStage = null
  }

  return result
}
