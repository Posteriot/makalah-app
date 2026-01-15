# Streaming Core - `src/lib/ai/streaming.ts`

Gue tulis detail komponen inti streaming supaya lo ngerti alur provider dan pencarian web.

## Ringkasan

Modul ini menangani:
- Load config dari DB lewat `configCache`
- Resolusi API key per provider
- Pembuatan model instance (Gateway / OpenRouter)
- Sampling settings (temperature, topP, maxTokens)
- Tool google_search
- Config pencarian web fallback

## Dependensi

```ts
import { streamText, type CoreMessage } from "ai"
import { createGateway } from "@ai-sdk/gateway"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { configCache } from "./config-cache"
```

## Mapping ENV Key

```ts
if (!process.env.AI_GATEWAY_API_KEY && process.env.VERCEL_AI_GATEWAY_API_KEY) {
  process.env.AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY
}
```

## Error Custom

```ts
export class AIProviderConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AIProviderConfigError"
  }
}
```

## getProviderConfig()

```ts
async function getProviderConfig() {
  const config = await configCache.get()
  if (!config) throw new AIProviderConfigError("...")

  const gatewayKey = config.gatewayApiKey !== undefined
    ? config.gatewayApiKey.trim()
    : (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY || "")

  const openrouterKey = config.openrouterApiKey !== undefined
    ? config.openrouterApiKey.trim()
    : (process.env.OPENROUTER_API_KEY || "")

  return {
    primary: { provider, model, apiKey },
    fallback: { provider, model, apiKey },
    temperature,
    topP,
    maxTokens,
    webSearch: {
      primaryEnabled,
      fallbackEnabled,
      fallbackEngine,
      fallbackMaxResults,
    },
  }
}
```

Catatan:
- `gatewayApiKey`/`openrouterApiKey` disimpan di DB. Kalau kosong, `createProviderModel()` masih fallback ke ENV.
- `primaryApiKey`/`fallbackApiKey` legacy tidak dipakai langsung di sini.

## createProviderModel()

```ts
function createProviderModel(provider: string, model: string, apiKey: string) {
  if (provider === "vercel-gateway") {
    const resolvedApiKey = apiKey || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY
    if (!resolvedApiKey) throw new Error("API key ENV tidak ditemukan untuk Vercel AI Gateway")
    const gateway = createGateway({ apiKey: resolvedApiKey })
    const targetModel = model.includes("gemini") && !model.includes("/") ? `google/${model}` : model
    return gateway(targetModel)
  }

  if (provider === "openrouter") {
    const resolvedApiKey = apiKey || process.env.OPENROUTER_API_KEY
    if (!resolvedApiKey) throw new Error("API key ENV tidak ditemukan untuk OpenRouter")
    const openrouter = createOpenRouter({ apiKey: resolvedApiKey })
    return openrouter.chat(model)
  }

  throw new Error(`Unknown provider: ${provider}`)
}
```

## streamChatResponse (deprecated)

Masih ada, tapi tidak dipakai di chat route.
- Pakai `temperature` + `topP` dari config.
- `maxTokens` tidak dipakai di fungsi ini.

## Helper Model

```ts
export async function getGatewayModel() { ... }
export async function getOpenRouterModel(options?: { enableWebSearch?: boolean }) { ... }
export async function getProviderSettings() { ... }
export async function getModelNames() { ... }
```

`getOpenRouterModel({ enableWebSearch: true })` menambahkan suffix `:online` jika provider fallback = `openrouter`.

## getWebSearchConfig()

```ts
export async function getWebSearchConfig() {
  const config = await configCache.get()
  if (!config) {
    return {
      primaryEnabled: true,
      fallbackEnabled: true,
      fallbackEngine: "auto",
      fallbackMaxResults: 5,
    }
  }

  return {
    primaryEnabled: config.primaryWebSearchEnabled,
    fallbackEnabled: config.fallbackWebSearchEnabled,
    fallbackEngine: config.fallbackWebSearchEngine,
    fallbackMaxResults: config.fallbackWebSearchMaxResults,
  }
}
```

## getGoogleSearchTool()

```ts
export async function getGoogleSearchTool() {
  try {
    const { google } = await import("@ai-sdk/google")
    const toolFactory = google.tools?.googleSearch
    if (!toolFactory) return null
    return typeof toolFactory === "function" ? toolFactory({}) : toolFactory
  } catch (error) {
    console.error("[Streaming] Failed to load Google Search tool:", error)
    return null
  }
}
```

## Logging yang Ada

```
[getProviderConfig] DEBUG: ...
[createProviderModel] DEBUG: ...
[createProviderModel] Gateway resolved key: ...
[createProviderModel] OpenRouter resolved key: ...
[Fallback] Model: ...
[Streaming] Failed to load Google Search tool: ...
```
