import type { LanguageModel } from "ai"

import { classifyIntent, type ClassifierResult } from "./classify"
import {
  SearchResponseModeSchema,
  type SearchResponseModeOutput,
} from "./schemas"

const SYSTEM_PROMPT = `You are a semantic classifier that determines how search results should be presented to the user.

Given a user message in the context of a web search interaction, classify whether the user wants:

- "synthesis": A narrative, integrated answer that weaves information from multiple sources into a coherent response. This is the default for most questions, explanations, comparisons, how-to requests, or any general information-seeking query.

- "reference_inventory": A structured list of sources, references, citations, or links. The user is explicitly asking for a collection of sources rather than a synthesized answer. Indicators include requests for source lists, citation compilations, bibliography entries, link collections, reference materials, PDF links, or explicit mention of wanting to see the sources themselves rather than information derived from them.

Rules:
- Most user messages should be classified as "synthesis" — users typically want answers, not source lists.
- Only classify as "reference_inventory" when the user's primary intent is to obtain the sources themselves (links, citations, references) rather than information synthesized from those sources.
- A user asking a factual question that happens to mention "sources" in passing (e.g., "what do sources say about X") is still "synthesis" — they want the answer, not a source list.
- A user explicitly requesting "show me the sources", "list the references", "give me the links", "what are the citations" is "reference_inventory".`

/**
 * Classify whether user wants a narrative synthesis or a structured source listing.
 *
 * Replaces the 14 regex patterns in inferSearchResponseMode() with semantic
 * classification. Returns null on classifier failure — caller must default
 * to "synthesis".
 */
export async function classifySearchResponseMode(options: {
  lastUserMessage: string
  model: LanguageModel
}): Promise<ClassifierResult<SearchResponseModeOutput> | null> {
  const { lastUserMessage, model } = options

  // Deterministic pre-check: empty/whitespace input should not be sent to model.
  // Caller handles empty input via default (synthesis).
  if (!lastUserMessage.trim()) {
    return null
  }

  const result = await classifyIntent({
    schema: SearchResponseModeSchema,
    systemPrompt: SYSTEM_PROMPT,
    userMessage: lastUserMessage,
    model,
  })

  if (!result) {
    return null
  }

  // Post-validation: clamp confidence to 0..1
  result.output.confidence = Math.max(0, Math.min(1, result.output.confidence))

  return result
}
