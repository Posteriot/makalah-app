import { streamText, type CoreMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createGateway } from "@ai-sdk/gateway"
import { configCache } from "./config-cache"

// Vercel AI SDK expects AI_GATEWAY_API_KEY for native gateway integration
if (!process.env.AI_GATEWAY_API_KEY && process.env.VERCEL_AI_GATEWAY_API_KEY) {
  process.env.AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY
}

// ============================================================================
// DYNAMIC PROVIDER CONFIGURATION
// ============================================================================

/**
 * Custom error for missing AI provider configuration
 * Thrown when no active config exists in database
 */
export class AIProviderConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AIProviderConfigError"
  }
}

/**
 * Load AI provider configuration from cache/database
 *
 * IMPORTANT: Database is the SINGLE SOURCE OF TRUTH.
 * No hardcoded fallback - if no active config exists, throws error.
 * This ensures admin panel settings are always respected.
 *
 * @throws {AIProviderConfigError} If no active config in database
 */
async function getProviderConfig() {
  const config = await configCache.get()

  // No hardcoded fallback - database is single source of truth
  // If no active config, fail explicitly so admin knows to configure
  if (!config) {
    throw new AIProviderConfigError(
      "No active AI provider configuration found. " +
      "Please activate a configuration in Admin Panel → AI Providers."
    )
  }

  // Use config from database (single source of truth)
  return {
    primary: {
      provider: config.primaryProvider,
      model: config.primaryModel,
      apiKey: config.primaryApiKey,
    },
    fallback: {
      provider: config.fallbackProvider,
      model: config.fallbackModel,
      apiKey: config.fallbackApiKey,
    },
    temperature: config.temperature,
    topP: config.topP,
    maxTokens: config.maxTokens,
  }
}

/**
 * Create AI SDK model instance based on provider type
 */
function createProviderModel(provider: string, model: string, apiKey: string) {
  if (provider === "vercel-gateway") {
    // Vercel AI Gateway (https://ai-gateway.vercel.sh/v1)
    const gateway = createGateway({
      apiKey: apiKey || process.env.AI_GATEWAY_API_KEY,
    })

    // Ensure google prefix is present for Gemini models if missing.
    const targetModel = (model.includes("gemini") && !model.includes("/"))
      ? `google/${model}`
      : model

    return gateway(targetModel)
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
/**
 * @deprecated streamChatResponse is no longer used by the chat route.
 * Prefer getGatewayModel()/getOpenRouterModel() for fine-grained control.
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

    return await streamText({
      model: primaryModel,
      messages,
      temperature: options?.temperature ?? config.temperature,
      ...(config.topP !== undefined ? { topP: config.topP } : {}),
    })
  } catch (error) {
    // Fallback provider on error
    console.error("[Streaming] Primary provider failed, using fallback:", error)

    const fallbackModel = createProviderModel(
      config.fallback.provider,
      config.fallback.model,
      config.fallback.apiKey
    )

    return await streamText({
      model: fallbackModel,
      messages,
      temperature: options?.temperature ?? config.temperature,
      ...(config.topP !== undefined ? { topP: config.topP } : {}),
    })
  }
}

// ============================================================================
// MODEL HELPERS
// ============================================================================

/**
 * Get primary model instance from active config.
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
 * Get fallback model instance from active config.
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
 * Get sampling settings from active config.
 */
export async function getProviderSettings() {
  const config = await getProviderConfig()
  return {
    temperature: config.temperature,
    topP: config.topP,
    maxTokens: config.maxTokens,
  }
}

/**
 * Get model names from active config (for metadata/logging).
 * Returns provider and model strings, not model instances.
 */
export async function getModelNames() {
  const config = await getProviderConfig()
  return {
    primary: {
      provider: config.primary.provider,
      model: config.primary.model,
    },
    fallback: {
      provider: config.fallback.provider,
      model: config.fallback.model,
    },
  }
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
      return null
    }

    // @ai-sdk/google exposes provider-defined tools as factories (functions).
    // We must call the factory to get a tool instance to pass into `streamText({ tools })`.
    if (typeof toolFactory === "function") {
      const toolInstance = toolFactory({})
      return toolInstance
    }

    // Defensive fallback: if SDK ever changes shape and returns an instance directly.
    return toolFactory
  } catch (error) {
    console.error("[Streaming] Failed to load Google Search tool:", error)
    return null
  }
}
