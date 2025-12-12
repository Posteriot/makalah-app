"use server"

import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const aiGatewayUrl = process.env.AI_GATEWAY_URL
const aiGatewayApiKey =
  process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_TOKEN

const openRouterApiKey = process.env.OPENROUTER_API_KEY

const gatewayOpenAI =
  aiGatewayUrl && aiGatewayApiKey
    ? createOpenAI({
        apiKey: aiGatewayApiKey,
        baseURL: aiGatewayUrl,
      })
    : null

const openRouterOpenAI = openRouterApiKey
  ? createOpenAI({
      apiKey: openRouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "Makalah App",
      },
    })
  : null

function getGatewayModel() {
  if (!gatewayOpenAI) {
    throw new Error("AI Gateway is not configured (URL or API key missing)")
  }

  return gatewayOpenAI("gpt-4o-mini")
}

function getOpenRouterModel() {
  if (!openRouterOpenAI) {
    throw new Error("OpenRouter API key is not configured")
  }

  return openRouterOpenAI("gpt-4o-mini")
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
