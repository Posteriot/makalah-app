import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import type { Id } from "../../../../convex/_generated/dataModel"
import { logAiTelemetry } from "@/lib/ai/telemetry"
import type { SaveAssistantMessageParams } from "../executor/types"
import { saveAssistantMessage } from "../executor/save-assistant-message"

// ────────────────────────────────────────────────────────────────
// Shared deps that the response factories need from the caller
// ────────────────────────────────────────────────────────────────

export interface ResponseFactoryDeps {
    convexToken: string
    userId: Id<"users">
    conversationId: Id<"conversations">
    modelNames: {
        primary: { model: string; provider: string }
        fallback: { model: string; provider: string }
    }
    telemetryStartTime: number
    skillTelemetryContext: {
        skillInstructions: string
        stageSearchPolicy: string
        hasRecentSourcesInDb: boolean
    }
    getCurrentPlanSnapshot: () => unknown
    fetchMutationWithToken: SaveAssistantMessageParams["fetchMutationWithToken"]
}

// ────────────────────────────────────────────────────────────────
// createSearchUnavailableResponse
// ────────────────────────────────────────────────────────────────

export async function createSearchUnavailableResponse(
    deps: ResponseFactoryDeps,
    input: {
        reasonCode: string
        message: string
        usedModel: string
        provider?: "vercel-gateway" | "openrouter"
        telemetryFallbackReason?: string
    }
) {
    await saveAssistantMessage({
        conversationId: deps.conversationId,
        content: input.message,
        sources: undefined,
        usedModel: input.usedModel,
        reasoningTrace: undefined,
        jsonRendererChoice: undefined,
        uiMessageId: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        planSnapshot: deps.getCurrentPlanSnapshot() as any,
        fetchMutationWithToken: deps.fetchMutationWithToken,
    })

    const blockedTelemetryContext = {
        ...deps.skillTelemetryContext,
        fallbackReason: input.telemetryFallbackReason ?? input.reasonCode,
    }

    logAiTelemetry({
        token: deps.convexToken,
        userId: deps.userId,
        conversationId: deps.conversationId,
        provider: input.provider ?? (deps.modelNames.primary.provider as "vercel-gateway" | "openrouter"),
        model: input.usedModel,
        isPrimaryProvider: true,
        failoverUsed: false,
        toolUsed: "web_search",
        mode: "websearch",
        success: false,
        errorType: "search_unavailable",
        errorMessage: input.message,
        latencyMs: Date.now() - deps.telemetryStartTime,
        ...blockedTelemetryContext,
    })

    const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    const searchStatusId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-search`
    const textId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-text`
    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            writer.write({ type: "start", messageId })
            writer.write({
                type: "data-search",
                id: searchStatusId,
                data: {
                    status: "error",
                    message: input.message,
                    reasonCode: input.reasonCode,
                },
            })
            writer.write({ type: "text-start", id: textId })
            writer.write({ type: "text-delta", id: textId, delta: input.message })
            writer.write({ type: "text-end", id: textId })
            writer.write({ type: "finish", finishReason: "error" })
        },
    })

    return createUIMessageStreamResponse({ stream })
}

// ────────────────────────────────────────────────────────────────
// createStoredReferenceInventoryResponse
// ────────────────────────────────────────────────────────────────

export async function createStoredReferenceInventoryResponse(
    deps: ResponseFactoryDeps,
    input: {
        introText: string
        items: Array<{
            sourceId?: string
            title: string
            url: string | null
            verificationStatus: "verified_content" | "unverified_link" | "unavailable"
            documentKind?: "html" | "pdf" | "unknown"
        }>
        usedModel: string
    }
) {
    const normalizedSources = input.items
        .filter((item) => typeof item.url === "string" && item.url.trim().length > 0)
        .map((item) => ({
            url: item.url as string,
            title: item.title,
        }))

    await saveAssistantMessage({
        conversationId: deps.conversationId,
        content: input.introText,
        sources: normalizedSources.length > 0 ? normalizedSources : undefined,
        usedModel: input.usedModel,
        reasoningTrace: undefined,
        jsonRendererChoice: undefined,
        uiMessageId: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        planSnapshot: deps.getCurrentPlanSnapshot() as any,
        fetchMutationWithToken: deps.fetchMutationWithToken,
    })

    const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    const citedTextId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-cited-text`
    const citedSourcesId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-cited-sources`
    const referenceInventoryId =
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-reference-inventory`

    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            writer.write({ type: "start", messageId })
            writer.write({
                type: "data-cited-text",
                id: citedTextId,
                data: { text: input.introText },
            })
            writer.write({
                type: "data-reference-inventory",
                id: referenceInventoryId,
                data: {
                    responseMode: "reference_inventory",
                    introText: input.introText,
                    items: input.items,
                },
            })
            if (normalizedSources.length > 0) {
                writer.write({
                    type: "data-cited-sources",
                    id: citedSourcesId,
                    data: { sources: normalizedSources },
                })
            }
            writer.write({ type: "finish", finishReason: "stop" })
        },
    })

    return createUIMessageStreamResponse({ stream })
}
