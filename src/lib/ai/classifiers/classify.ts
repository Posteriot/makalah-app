import { generateText, Output, type LanguageModel } from "ai"
import type { z } from "zod"

/**
 * Generic semantic classifier using generateText + Output.object().
 *
 * Wraps the AI SDK structured output pattern for all classifier domains.
 * Returns null on any error (timeout, parse failure, model error) —
 * callers must always have a safe default fallback.
 */
export async function classifyIntent<T extends z.ZodType>(options: {
  schema: T
  systemPrompt: string
  userMessage: string
  context?: string
  model: LanguageModel
}): Promise<z.infer<T> | null> {
  const { schema, systemPrompt, userMessage, context, model } = options

  const prompt = context
    ? `${userMessage}\n\n---\nAdditional context:\n${context}`
    : userMessage

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      system: systemPrompt,
      prompt,
      temperature: 0,
    })

    if (output == null) {
      return null
    }

    return output as z.infer<T>
  } catch (error) {
    console.error("[classifier] classification failed:", error)
    return null
  }
}
