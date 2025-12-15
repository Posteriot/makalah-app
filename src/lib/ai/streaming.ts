import { streamText, type CoreMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { configCache } from "./config-cache"

// ============================================================================
// DYNAMIC PROVIDER CONFIGURATION
// ============================================================================

/**
 * Load AI provider configuration from cache/database
 * Falls back to hardcoded config if no active config in DB
 */
async function getProviderConfig() {
  const config = await configCache.get()

  // Fallback to hardcoded config if no active config in database
  if (!config) {
    console.log("[Streaming] No active config in DB, using hardcoded fallback")
    return {
      primary: {
        provider: "vercel-gateway",
        model: "google/gemini-2.5-flash-lite",
        apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY!,
      },
      fallback: {
        provider: "openrouter",
        model: "google/gemini-2.5-flash-lite",
        apiKey: process.env.OPENROUTER_API_KEY!,
      },
      temperature: 0.7,
    }
  }

  // Use API keys from database config (stored as plain text)
  console.log(`[Streaming] Using DB config: ${config.name} v${config.version}`)

  return {
    primary: {
      provider: config.primaryProvider,
      model: config.primaryModel,
      apiKey: config.primaryApiKey, // Plain text from DB
    },
    fallback: {
      provider: config.fallbackProvider,
      model: config.fallbackModel,
      apiKey: config.fallbackApiKey, // Plain text from DB
    },
    temperature: config.temperature,
  }
}

/**
 * Create AI SDK model instance based on provider type
 */
function createProviderModel(provider: string, model: string, apiKey: string) {
  if (provider === "vercel-gateway") {
    // Vercel AI Gateway: model ID as string, automatic routing
    // Note: For gateway, we use the global VERCEL_AI_GATEWAY_API_KEY from env
    // The apiKey parameter is ignored for gateway (can't override env key)
    return model
  } else if (provider === "openrouter") {
    // OpenRouter: createOpenAI with custom config
    const openRouterOpenAI = createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "Makalah App",
      },
    })
    return openRouterOpenAI(model)
  } else {
    throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Stream chat response with dynamic provider configuration
 * Automatically falls back to fallback provider on primary failure
 */
export async function streamChatResponse(
  messages: CoreMessage[],
  options?: {
    temperature?: number
    maxTokens?: number
  }
) {
  const config = await getProviderConfig()

  try {
    // Try primary provider
    const primaryModel = createProviderModel(
      config.primary.provider,
      config.primary.model,
      config.primary.apiKey
    )

    console.log(`[Streaming] Using primary: ${config.primary.provider}/${config.primary.model}`)

    return await streamText({
      model: primaryModel,
      messages,
      temperature: options?.temperature ?? config.temperature,
    })
  } catch (error) {
    // Fallback provider on error
    console.error("[Streaming] Primary provider failed, using fallback:", error)

    const fallbackModel = createProviderModel(
      config.fallback.provider,
      config.fallback.model,
      config.fallback.apiKey
    )

    console.log(`[Streaming] Using fallback: ${config.fallback.provider}/${config.fallback.model}`)

    return await streamText({
      model: fallbackModel,
      messages,
      temperature: options?.temperature ?? config.temperature,
    })
  }
}

// ============================================================================
// LEGACY FUNCTIONS (Backward Compatibility)
// ============================================================================

/**
 * @deprecated Use streamChatResponse() instead
 * Kept for backward compatibility during migration
 */
export async function getGatewayModel() {
  const config = await getProviderConfig()
  return config.primary.model
}

/**
 * @deprecated Use streamChatResponse() instead
 * Kept for backward compatibility during migration
 */
export async function getOpenRouterModel() {
  const config = await getProviderConfig()
  return createProviderModel(
    config.fallback.provider,
    config.fallback.model,
    config.fallback.apiKey
  )
}
