import { BLOCKED_DOMAINS } from "./blocked-domains"

/**
 * Search-specific system prompt injected ONLY to Perplexity/Grok search phase.
 * Guides the search model to return diverse, high-quality sources.
 *
 * This is separate from the main app system prompt (persona, tone, etc.)
 * and separate from SKILL.md instructions (sent to Gemini compose phase).
 */
export function getSearchSystemPrompt(): string {
  const blocklist = BLOCKED_DOMAINS.join(", ")

  return `You are a research assistant. Follow these rules:

BLOCKED DOMAINS (never cite):
${blocklist}

Provide thorough, well-sourced answers with inline citations from diverse sources.`
}

/**
 * Augment the last user message with search diversity hints.
 * Perplexity uses the user message as its search query basis,
 * so this directly influences retrieval behavior.
 */
export function augmentUserMessageForSearch<T extends { role: string; content: unknown }>(messages: T[]): T[] {
  const result = [...messages]
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].role === "user" && typeof result[i].content === "string") {
      result[i] = {
        ...result[i],
        content: `${result[i].content}\n\n[Search broadly. Cite at least 10 sources from many different domains. Include both domestic and international sources. Do not over-rely on any single domain.]`,
      }
      break
    }
  }
  return result
}
