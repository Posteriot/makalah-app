import type { LanguageModel } from "ai"

import { classifyIntent, type ClassifierResult } from "./classify"
import {
  ExactSourceClassifierSchema,
  type ExactSourceClassifierOutput,
} from "./schemas"

const SYSTEM_PROMPT = `You are a semantic intent classifier for source follow-up requests in a research assistant context.

The user has previously received search results containing specific sources (articles, papers, web pages). Your job is to classify whether their current message is requesting detailed information about a specific source.

Classify the user's message into one of these source intents:
- "exact_detail": The user wants precise, verbatim information from a specific source — title, author, publication date, exact quote, paragraph, or word-for-word content.
- "summary": The user wants a condensed overview, summary, key takeaways, or impact assessment of a source — not verbatim details.
- "continuation": The user is sending a short follow-up that references a previously discussed source without naming it explicitly. Typically a brief phrase or question implying "that one" or "the one we just discussed."
- "none": The message has no source-related intent. It is a general question, unrelated remark, or new topic.

Based on the source intent, choose the appropriate mode:
- "force_inspect": The user clearly wants details from a specific source AND you can identify which source they mean (from the message or available source list).
- "clarify": The user wants source details but it is ambiguous which source they mean, or multiple sources could match.
- "none": Not a source-related request at all.

For mentionedSourceHint:
- Extract any source identifier the user mentions: a title fragment, domain name, author name, or URL fragment.
- Set to null if the user does not mention any identifiable source reference.

Rules:
- Short follow-up phrases that reference a previous source context (e.g., "the full version?", "that one", "the complete title?") should be classified as continuation intent with force_inspect mode — they imply the user wants more from a recently discussed source.
- If the user asks for a summary or overview without requesting exact details, classify as summary intent with none mode — summaries do not require source inspection.
- If the user mentions a source but their intent is ambiguous, set needsClarification to true and mode to clarify.
- If confidence is below 0.6, set needsClarification to true.`

/**
 * Classify whether a user message expresses intent to inspect an exact source.
 *
 * Replaces regex-based heuristics (EXACT_SOURCE_PATTERNS, NON_EXACT_SUMMARY_PATTERNS,
 * CONTINUATION_PATTERNS, CONTINUATION_CUES) with semantic classification.
 *
 * The classifier determines INTENT only — source matching logic (finding which source
 * the user refers to) remains in exact-source-followup.ts.
 *
 * Returns null on classifier failure or empty input — caller must use safe default.
 */
export async function classifyExactSourceIntent(options: {
  lastUserMessage: string
  availableSourceTitles?: string[]
  model: LanguageModel
}): Promise<ClassifierResult<ExactSourceClassifierOutput> | null> {
  const { lastUserMessage, availableSourceTitles, model } = options

  // Deterministic pre-check: empty/whitespace input should not be sent to model.
  if (!lastUserMessage.trim()) {
    return null
  }

  const context = availableSourceTitles?.length
    ? `Available sources from previous search results:\n${availableSourceTitles.map((t) => `- "${t}"`).join("\n")}`
    : undefined

  const result = await classifyIntent({
    schema: ExactSourceClassifierSchema,
    systemPrompt: SYSTEM_PROMPT,
    userMessage: lastUserMessage,
    context,
    model,
  })

  if (!result) {
    return null
  }

  // Post-validation: enforce runtime guards that must not depend on model compliance

  // Guard 0: clamp confidence to 0..1 (schema no longer constrains this to avoid provider rejection)
  result.output.confidence = Math.max(0, Math.min(1, result.output.confidence))

  // Guard 1: low confidence → force clarify
  if (result.output.confidence < 0.6) {
    result.output.mode = "clarify"
    result.output.needsClarification = true
  }

  return result
}
