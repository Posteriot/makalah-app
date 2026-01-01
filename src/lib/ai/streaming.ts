import { streamText, type CoreMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createVercel } from "@ai-sdk/vercel"
import { configCache } from "./config-cache"

// Vercel AI SDK expects AI_GATEWAY_API_KEY for native gateway integration
if (!process.env.AI_GATEWAY_API_KEY && process.env.VERCEL_AI_GATEWAY_API_KEY) {
  process.env.AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY
}

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
        model: "google/gemini-2.5-flash-lite", // Format: provider/model-id
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
    // Vercel AI Gateway Native Integration via provider instance.
    const vercel = createVercel({
      apiKey: apiKey || process.env.VERCEL_AI_GATEWAY_API_KEY,
    })

    // Ensure google prefix is present for Gemini models if missing.
    const targetModel = (model.includes("gemini") && !model.includes("/"))
      ? `google/${model}`
      : model

    console.log(`[Streaming] Using Vercel Gateway Model Instance: ${targetModel}`)
    return vercel(targetModel)
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
  return createProviderModel(
    config.primary.provider,
    config.primary.model,
    config.primary.apiKey
  )
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

/**
 * Get the Google Search tool definition
 * Returns null if initialization fails (graceful degradation)
 * Async to support dynamic imports (cleaner bundle/lint compliance)
 */
export async function getGoogleSearchTool() {
  try {
    const { google } = await import("@ai-sdk/google")
    // Native Google Search tool from the provider (provider-defined tool factory)
    // Note: This requires GOOGLE_GENERATIVE_AI_API_KEY to be set in env (when using google provider directly).
    const toolFactory = google.tools?.googleSearch

    if (!toolFactory) {
      console.warn("[Streaming] Native Google Search tool factory not found in SDK export.")
      return null
    }

    // @ai-sdk/google exposes provider-defined tools as factories (functions).
    // We must call the factory to get a tool instance to pass into `streamText({ tools })`.
    if (typeof toolFactory === "function") {
      const toolInstance = toolFactory({})
      console.log("[Streaming] Google Search Tool initialized successfully from @ai-sdk/google")
      return toolInstance
    }

    // Defensive fallback: if SDK ever changes shape and returns an instance directly.
    console.log("[Streaming] Google Search Tool returned as non-function (unexpected), using as-is")
    return toolFactory
  } catch (error) {
    console.error("[Streaming] Failed to load Google Search tool:", error)
    return null
  }
}
