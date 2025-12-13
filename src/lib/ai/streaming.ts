import { streamText, type CoreMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

// AI Provider configuration
const openRouterApiKey = process.env.OPENROUTER_API_KEY

// Primary: Vercel AI Gateway - model ID sebagai string, AI SDK otomatis routing
export function getGatewayModel() {
    return "google/gemini-2.5-flash-lite" as const
}

// Fallback: OpenRouter
export function getOpenRouterModel() {
    if (!openRouterApiKey) {
        throw new Error("OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env.local")
    }

    const openRouterOpenAI = createOpenAI({
        apiKey: openRouterApiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
            "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
            "X-Title": "Makalah App",
        },
    })

    return openRouterOpenAI("google/gemini-2.5-flash-lite")
}

export async function streamChatResponse(
    messages: CoreMessage[],
    options?: {
        temperature?: number
        maxTokens?: number
    }
) {
    try {
        const model = getGatewayModel()
        return await streamText({
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            // maxTokens: options?.maxTokens ?? 2048, // Error: maxTokens not existing in this version
        })
    } catch (error) {
        // Fallback to OpenRouter
        console.error("Gateway failed, falling back to OpenRouter:", error)
        const fallbackModel = getOpenRouterModel()
        return await streamText({
            model: fallbackModel,
            messages,
            temperature: options?.temperature ?? 0.7,
            // maxTokens: options?.maxTokens ?? 2048,
        })
    }
}
