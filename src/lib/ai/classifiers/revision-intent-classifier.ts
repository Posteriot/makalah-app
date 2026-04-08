import type { LanguageModel } from "ai"

import { classifyIntent, type ClassifierResult } from "./classify"
import { RevisionIntentSchema, type RevisionIntentOutput } from "./schemas"

const SYSTEM_PROMPT = `You are a semantic intent classifier. Your task is to determine whether the user's message expresses an intent to revise, modify, edit, redo, improve, or rewrite existing content.

The user writes in Indonesian. You must understand Indonesian revision-related language.

Revision intent includes:
- Explicit revision verbs (in any language): words meaning revise, change, edit, correct, fix, replace, rewrite, redo, start over
- Implicit revision intent: messages expressing a desire to make something better, try a different approach, or start fresh
- Dissatisfaction implying revision: messages indicating something is wrong, inaccurate, or not meeting expectations

NOT revision intent:
- Questions about content (asking what something contains, how it is formatted)
- Export or download requests
- General discussion or information seeking
- Short continuation or confirmation signals (ok, yes, next, done)
- Requests to view or display existing artifacts without modification

Set hasRevisionIntent to true only if the user clearly wants to change existing content.
Set confidence between 0 and 1. Higher confidence for explicit revision verbs, lower for implicit signals.`

/**
 * Classify whether a user message expresses revision intent.
 *
 * Used in post-stream observability: when model didn't call revision tools
 * but user may have wanted revision. Result is logged, not acted upon.
 *
 * Returns null on failure — caller should take no action.
 */
export async function classifyRevisionIntent(options: {
  lastUserContent: string
  model: LanguageModel
}): Promise<ClassifierResult<RevisionIntentOutput> | null> {
  const { lastUserContent, model } = options

  if (!lastUserContent.trim()) {
    return null
  }

  const result = await classifyIntent({
    schema: RevisionIntentSchema,
    systemPrompt: SYSTEM_PROMPT,
    userMessage: lastUserContent,
    model,
  })

  if (!result) {
    return null
  }

  // Runtime clamp: confidence to 0..1
  result.output.confidence = Math.max(0, Math.min(1, result.output.confidence))

  return result
}
