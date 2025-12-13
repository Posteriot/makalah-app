import { streamText, type CoreMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const aiGatewayUrl = process.env.AI_GATEWAY_URL
const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_TOKEN
const openRouterApiKey = process.env.OPENROUTER_API_KEY

export function getGatewayModel() {
    if (!aiGatewayUrl || !aiGatewayApiKey) {
        throw new Error("AI Gateway is not configured")
    }

    const gatewayOpenAI = createOpenAI({
        apiKey: aiGatewayApiKey,
        baseURL: aiGatewayUrl,
    })

    return gatewayOpenAI(process.env.MODEL ?? "google/gemini-2.5-flash-lite")
}

export function getOpenRouterModel() {
    if (!openRouterApiKey) {
        throw new Error("OpenRouter API key is not configured")
    }

    const openRouterOpenAI = createOpenAI({
        apiKey: openRouterApiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
            "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
            "X-Title": "Makalah App",
        },
    })

    // OpenRouter specific model string if different, or reuse the same model env
    return openRouterOpenAI(process.env.MODEL ?? "google/gemini-2.5-flash-lite")
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
