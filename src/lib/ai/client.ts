"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

const aiGatewayUrl = process.env.AI_GATEWAY_URL
const aiGatewayApiKey =
  process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_TOKEN

const openRouterApiKey = process.env.OPENROUTER_API_KEY

function getGatewayModel() {
  if (!aiGatewayUrl || !aiGatewayApiKey) {
    throw new Error("AI Gateway is not configured (URL or API key missing)")
  }

  return openai("gpt-4o-mini", {
    baseURL: aiGatewayUrl,
    apiKey: aiGatewayApiKey,
  })
}

function getOpenRouterModel() {
  if (!openRouterApiKey) {
    throw new Error("OpenRouter API key is not configured")
  }

  const referer = process.env.APP_URL ?? "http://localhost:3000"

  return openai("gpt-4o-mini", {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: openRouterApiKey,
    headers: {
      "HTTP-Referer": referer,
      "X-Title": "Makalah App",
    },
  })
}

/**
 * Basic helper that calls the primary model via Vercel AI Gateway,
 * and falls back to OpenRouter if the primary path fails.
 */
export async function basicGenerateText(prompt: string): Promise<string> {
  // Try primary via AI Gateway
  try {
    const model = getGatewayModel()
    const { text } = await generateText({
      model,
      prompt,
    })
    return text
  } catch (error) {
    // Fallback to OpenRouter if configured
    if (openRouterApiKey) {
      const fallbackModel = getOpenRouterModel()
      const { text } = await generateText({
        model: fallbackModel,
        prompt,
      })
      return text
    }

    throw error
  }
}

