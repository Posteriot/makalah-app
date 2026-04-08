import type { LanguageModel } from "ai"

import { classifyIntent, type ClassifierResult } from "./classify"
import { RevisionIntentSchema, type RevisionIntentOutput } from "./schemas"

const SYSTEM_PROMPT = `You are a semantic intent classifier. Your task is to determine whether the user's message expresses an intent to revise, modify, edit, redo, improve, or rewrite existing content.

Revision intent includes:
- Explicit verbs: revisi, ubah, edit, koreksi, perbaiki, ganti, tulis ulang, buat ulang, ulangi
- Implicit intent: "buat yang lebih baik", "coba pendekatan lain", "dari awal lagi"
- Dissatisfaction implying revision: "ada yang salah", "kurang tepat", "kok gitu"
- English equivalents: revise, edit, redo, rewrite, fix, improve

NOT revision intent:
- Questions about the content: "apa isi abstrak?", "bagaimana formatnya?"
- Export/download requests: "bagaimana export?", "download PDF"
- General discussion or information seeking
- Continuation signals: "ok", "lanjut", "next"
- Artifact recall: "lihat abstrak", "tampilkan outline"

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
