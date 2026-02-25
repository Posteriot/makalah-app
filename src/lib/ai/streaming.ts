import { streamText, type CoreMessage } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createGateway } from "@ai-sdk/gateway"
import { configCache } from "./config-cache"

const MIN_THINKING_BUDGET = 0
const MAX_THINKING_BUDGET = 32768
const TOOL_HEAVY_THINKING_CAP = 96

export type ReasoningTraceMode = "off" | "curated" | "transparent"
export type ReasoningTarget = "primary" | "fallback"
export type ReasoningExecutionProfile = "tool-heavy" | "narrative"

export interface ReasoningSlotSettings {
  provider: string
  model: string
  supported: boolean
  thinkingBudget: number
}

export interface ReasoningSettings {
  enabled: boolean
  traceMode: ReasoningTraceMode
  primary: ReasoningSlotSettings
  fallback: ReasoningSlotSettings
}

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
  // IMPORTANT: When per-provider keys are undefined, prefer ENV vars over legacy slot-based keys
  // because legacy keys can be WRONG after provider swap (keys don't swap with providers)
  const normalizeKey = (value?: string) => value?.trim() || ""

  // Resolve Gateway key: DB per-provider → ENV → legacy slot-based (last resort)
  const gatewayKey = config.gatewayApiKey !== undefined
    ? normalizeKey(config.gatewayApiKey)
    : (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY || "")

  // Resolve OpenRouter key: DB per-provider → ENV → legacy slot-based (last resort)
  const openrouterKey = config.openrouterApiKey !== undefined
    ? normalizeKey(config.openrouterApiKey)
    : (process.env.OPENROUTER_API_KEY || "")
  const resolveKeyForProvider = (provider: string) => {
    if (provider === "vercel-gateway") return gatewayKey
    if (provider === "openrouter") return openrouterKey
    return ""
  }

  const result = {
    primary: {
      provider: config.primaryProvider,
      model: config.primaryModel,
      apiKey: resolveKeyForProvider(config.primaryProvider),
    },
    fallback: {
      provider: config.fallbackProvider,
      model: config.fallbackModel,
      apiKey: resolveKeyForProvider(config.fallbackProvider),
    },
    temperature: config.temperature,
    topP: config.topP,
    maxTokens: config.maxTokens,
    reasoning: {
      enabled: config.reasoningEnabled,
      traceMode: config.reasoningTraceMode,
      thinkingBudgetPrimary: config.thinkingBudgetPrimary,
      thinkingBudgetFallback: config.thinkingBudgetFallback,
    },
    // Web search settings
    webSearch: {
      primaryEnabled: config.primaryWebSearchEnabled,
      fallbackEnabled: config.fallbackWebSearchEnabled,
      fallbackEngine: config.fallbackWebSearchEngine,
      fallbackMaxResults: config.fallbackWebSearchMaxResults,
    },
    // Context window settings (for W2 context budget monitor)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primaryContextWindow: (config as any).primaryContextWindow as number | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fallbackContextWindow: (config as any).fallbackContextWindow as number | undefined,
  }

  return result
}

/**
 * Get web search configuration from database
 * Used by route.ts to determine if web search should be enabled
 *
 * @returns Web search config with defaults
 */
export async function getWebSearchConfig() {
  const config = await configCache.get()

  if (!config) {
    // Return defaults if no config (fallback behavior)
    return {
      primaryEnabled: true,
      fallbackEnabled: true,
      fallbackEngine: "auto" as const,
      fallbackMaxResults: 5,
    }
  }

  return {
    primaryEnabled: config.primaryWebSearchEnabled,
    fallbackEnabled: config.fallbackWebSearchEnabled,
    fallbackEngine: config.fallbackWebSearchEngine as "auto" | "native" | "exa",
    fallbackMaxResults: config.fallbackWebSearchMaxResults,
  }
}

/**
 * Create AI SDK model instance based on provider type
 */
function createProviderModel(provider: string, model: string, apiKey: string) {
  if (provider === "vercel-gateway") {
    // Vercel AI Gateway (https://ai-gateway.vercel.sh/v1)
    const resolvedApiKey =
      apiKey || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY

    if (!resolvedApiKey) {
      throw new Error("API key ENV tidak ditemukan untuk Vercel AI Gateway")
    }

    const gateway = createGateway({
      apiKey: resolvedApiKey,
    })

    // Ensure google prefix is present for Gemini models if missing.
    const targetModel = (model.includes("gemini") && !model.includes("/"))
      ? `google/${model}`
      : model

    return gateway(targetModel)
  } else if (provider === "openrouter") {
    // OpenRouter: Use official @openrouter/ai-sdk-provider
    // IMPORTANT: This provider handles model ID correctly and doesn't have
    // the reasoning model detection bug that @ai-sdk/openai has with prefixed
    // model IDs like "openai/gpt-4o" (which gets incorrectly detected as reasoning model)
    const resolvedApiKey = apiKey || process.env.OPENROUTER_API_KEY

    if (!resolvedApiKey) {
      throw new Error("API key ENV tidak ditemukan untuk OpenRouter")
    }

    const openrouter = createOpenRouter({
      apiKey: resolvedApiKey,
    })

    // Use .chat() method for chat models (recommended per documentation)
    return openrouter.chat(model)
  } else {
    throw new Error(`Unknown provider: ${provider}`)
  }
}

function clampThinkingBudget(rawBudget: number): number {
  if (!Number.isFinite(rawBudget)) return MIN_THINKING_BUDGET
  return Math.max(
    MIN_THINKING_BUDGET,
    Math.min(MAX_THINKING_BUDGET, Math.round(rawBudget))
  )
}

function supportsGeminiThinking(provider: string, model: string): boolean {
  const normalizedModel = model.toLowerCase()
  return provider === "vercel-gateway" && normalizedModel.includes("gemini")
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
 *
 * MODEL-AGNOSTIC WEB SEARCH:
 * When `enableWebSearch` is true, appends `:online` suffix to the model ID.
 * This works with ANY model on OpenRouter - the model ID comes from database config
 * (Admin Panel), not hardcoded. Examples:
 * - "openai/gpt-5.1" → "openai/gpt-5.1:online"
 * - "google/gemini-2.5-flash" → "google/gemini-2.5-flash:online"
 * - "anthropic/claude-3.5-sonnet" → "anthropic/claude-3.5-sonnet:online"
 *
 * @param options.enableWebSearch - If true, append `:online` suffix for web search capability
 */
export async function getOpenRouterModel(options?: {
  enableWebSearch?: boolean
}) {
  const config = await getProviderConfig()

  // Base model from database config (single source of truth)
  const baseModel = config.fallback.model
  const provider = config.fallback.provider

  // Append :online suffix if web search enabled (model-agnostic)
  const enableOnline = !!options?.enableWebSearch && provider === "openrouter"
  const modelId = enableOnline ? `${baseModel}:online` : baseModel

  return createProviderModel(
    provider,
    modelId,
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
 * Get reasoning settings from active config.
 * Runtime only applies provider options when model/provider is compatible.
 */
export async function getReasoningSettings(): Promise<ReasoningSettings> {
  const config = await getProviderConfig()
  const primaryBudget = clampThinkingBudget(config.reasoning.thinkingBudgetPrimary)
  const fallbackBudget = clampThinkingBudget(config.reasoning.thinkingBudgetFallback)

  return {
    enabled: config.reasoning.enabled,
    traceMode: config.reasoning.traceMode,
    primary: {
      provider: config.primary.provider,
      model: config.primary.model,
      supported: supportsGeminiThinking(config.primary.provider, config.primary.model),
      thinkingBudget: primaryBudget,
    },
    fallback: {
      provider: config.fallback.provider,
      model: config.fallback.model,
      supported: supportsGeminiThinking(config.fallback.provider, config.fallback.model),
      thinkingBudget: fallbackBudget,
    },
  }
}

/**
 * Build providerOptions for reasoning/thinking.
 * Uses Google thinkingConfig only when compatible.
 */
export function buildReasoningProviderOptions(options: {
  settings: ReasoningSettings
  target: ReasoningTarget
  profile: ReasoningExecutionProfile
}) {
  const slot = options.target === "primary" ? options.settings.primary : options.settings.fallback
  if (!options.settings.enabled || !slot.supported) {
    return undefined
  }

  const narrativeBudget = clampThinkingBudget(slot.thinkingBudget)
  const toolHeavyBudget = clampThinkingBudget(Math.min(narrativeBudget, TOOL_HEAVY_THINKING_CAP))
  const budget = options.profile === "tool-heavy" ? toolHeavyBudget : narrativeBudget

  return {
    google: {
      thinkingConfig: {
        thinkingBudget: budget,
        includeThoughts: options.settings.traceMode === "transparent",
      },
    },
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
    reasoning: {
      enabled: config.reasoning.enabled,
      traceMode: config.reasoning.traceMode,
      thinkingBudgetPrimary: config.reasoning.thinkingBudgetPrimary,
      thinkingBudgetFallback: config.reasoning.thinkingBudgetFallback,
    },
    primaryContextWindow: config.primaryContextWindow,
    fallbackContextWindow: config.fallbackContextWindow,
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
