import * as Sentry from "@sentry/nextjs"
import type { LanguageModel } from "ai"
import type { Id } from "../../../../convex/_generated/dataModel"
import { api } from "../../../../convex/_generated/api"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { PlanSpec } from "@/lib/ai/harness/plan-spec"
import type { Spec } from "@json-render/core"
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"
import type { JsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
import { compileChoiceSpec } from "@/lib/json-render/compile-choice-spec"
import { executeWebSearch, type RetrieverChainEntry } from "@/lib/ai/web-search"
import { recordUsageAfterOperation } from "@/lib/billing/enforcement"
import { logAiTelemetry } from "@/lib/ai/telemetry"
import { saveAssistantMessage } from "../executor/save-assistant-message"
import type { ConvexFetchMutation } from "../types"

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface ExecuteWebSearchPathParams {
    enableWebSearch: boolean

    // Request identity
    requestId: string
    requestStartedAt?: number

    // Conversation
    conversationId: Id<"conversations">
    userId: Id<"users">
    convexToken: string

    // Retriever chain
    retrieverChain: RetrieverChainEntry[]

    // Messages
    fullMessagesGateway: Parameters<typeof executeWebSearch>[0]["messages"]
    trimmedModelMessages: Parameters<typeof executeWebSearch>[0]["composeMessages"]

    // Model
    model: LanguageModel
    modelNames: {
        primary: { model: string; provider: string }
        fallback: { model: string; provider: string }
    }
    getOpenRouterModel: (options?: { enableWebSearch?: boolean }) => Promise<LanguageModel>

    // Prompts & context
    systemPrompt: string
    paperModePrompt: string | undefined
    paperStageScope: PaperStageId | undefined
    fileContext: string | undefined
    isDraftingStage: boolean

    // Paper session (nullable — no paper mode means null)
    paperSession: {
        _id: Id<"paperSessions">
        currentStage: string
        stageStatus?: string
        stageData?: unknown
    } | null

    // Sampling & reasoning
    samplingOptions: { temperature?: number; topP?: number }
    reasoningTraceEnabled: boolean
    isTransparentReasoning: boolean
    reasoningProviderOptions: Record<string, unknown> | undefined

    // Billing
    billingContext: { userId: string; operationType?: string }

    // Telemetry
    telemetryStartTime: number
    telemetrySkillContext: Record<string, unknown>

    // Plan & choice helpers
    getCurrentPlanSnapshot: () => PlanSpec | undefined

    // Persistence helpers
    fetchMutationWithToken: ConvexFetchMutation

    // Title generation
    maybeUpdateTitleFromAI: (params: {
        assistantText: string
        minPairsForFinalTitle: number
    }) => Promise<void>

    // Search unavailable response factory
    createSearchUnavailableResponse: (input: {
        reasonCode: string
        message: string
        usedModel: string
        telemetryFallbackReason?: string
    }) => Promise<Response>

    // Trace mode helper
    getTraceModeLabel: (isPaper: boolean, webSearch: boolean) => string
}

// ────────────────────────────────────────────────────────────────
// Execute web search path
// ────────────────────────────────────────────────────────────────

/**
 * Handles the web search execution path (orchestrator two-pass flow).
 *
 * Returns a `Response` if `enableWebSearch` is true and the search path
 * was taken (caller should return immediately).
 * Returns `undefined` if `enableWebSearch` is false (caller continues
 * to the primary stream path).
 */
export async function executeWebSearchPath(
    params: ExecuteWebSearchPathParams,
): Promise<Response | undefined> {
    if (!params.enableWebSearch) {
        return undefined
    }

    const {
        requestId,
        requestStartedAt,
        conversationId,
        userId,
        convexToken,
        retrieverChain,
        fullMessagesGateway,
        trimmedModelMessages,
        model,
        modelNames,
        getOpenRouterModel,
        systemPrompt,
        paperModePrompt,
        paperStageScope,
        fileContext,
        isDraftingStage,
        paperSession,
        samplingOptions,
        reasoningTraceEnabled,
        isTransparentReasoning,
        reasoningProviderOptions,
        billingContext,
        telemetryStartTime,
        telemetrySkillContext,
        getCurrentPlanSnapshot,
        fetchMutationWithToken,
        maybeUpdateTitleFromAI,
        createSearchUnavailableResponse,
        getTraceModeLabel,
    } = params

    // retrieverChain already built above (reused from mode resolution)
    if (retrieverChain.length === 0) {
        return createSearchUnavailableResponse({
            reasonCode: "no_retrievers_configured",
            message: "Pencarian web tidak tersedia saat ini. Saya belum bisa memberikan jawaban faktual tanpa sumber. Coba lagi beberapa saat.",
            usedModel: modelNames.primary.model,
            telemetryFallbackReason: "no_retrievers_configured",
        })
    }

    // Resolve fallback compose model (non-fatal — compose still works without inner failover)
    let fallbackComposeModel: LanguageModel | undefined
    try {
        fallbackComposeModel = await getOpenRouterModel({ enableWebSearch: false })
    } catch {
        // Non-fatal: websearch compose still works, just without inner failover
    }

    return await executeWebSearch({
        requestId,
        conversationId: conversationId as string,
        retrieverChain,
        tavilyApiKey: process.env.TAVILY_API_KEY,
        convexToken: convexToken ?? undefined,
        messages: fullMessagesGateway,
        composeMessages: trimmedModelMessages,
        composeModel: model,
        fallbackComposeModel,
        systemPrompt,
        paperModePrompt: paperModePrompt || undefined,
        currentStage: paperStageScope ?? undefined,
        fileContext: fileContext || undefined,
        samplingOptions,
        retrieverMaxTokens: 4096,
        reasoningTraceEnabled,
        isTransparentReasoning,
        reasoningProviderOptions: reasoningProviderOptions ?? undefined,
        traceMode: getTraceModeLabel(!!paperModePrompt, true),
        requestStartedAt,
        isDraftingStage,
        compileGuaranteedChoiceSpec: (paperStageScope && paperSession?.stageStatus === "drafting")
            ? () => {
                const { spec: fallbackSpec } = compileChoiceSpec({
                    stage: paperStageScope,
                    kind: "single-select",
                    title: "Bagaimana kita akan melanjutkan?",
                    options: [
                        { id: "lanjutkan-diskusi", label: "Lanjutkan diskusi berdasarkan temuan" },
                    ],
                    recommendedId: "lanjutkan-diskusi",
                    appendValidationOption: true,
                })
                return fallbackSpec as unknown as Spec
            }
            : undefined,
        onFinish: async (result) => {
            const retrieverModelName = result.retrieverName || "unknown"
            const combinedModelName = `${retrieverModelName}+${modelNames.primary.model}`

            // Persist plan captured by pipePlanCapture in orchestrator compose stream
            // Full-replace semantics: model is authoritative, harness only validates schema
            if (result.capturedPlanSpec && paperSession?._id && paperStageScope) {
                try {
                    await fetchMutationWithToken(api.paperSessions.updatePlan, {
                        sessionId: paperSession._id,
                        stage: paperStageScope,
                        plan: result.capturedPlanSpec,
                    })
                    console.info(`[PLAN-CAPTURE] persisted (search path) stage=${paperStageScope} tasks=${result.capturedPlanSpec.tasks.length} elapsed=${requestStartedAt ? Date.now() - requestStartedAt : '?'}ms`)
                } catch (e) {
                    console.warn(`[PLAN-CAPTURE] search path persist failed:`, e)
                }
            } else if (paperStageScope) {
                console.info(`[PLAN-CAPTURE] no plan-spec detected in search response (stage=${paperStageScope})`)
            }
            // Strip fenced AND unfenced plan-spec from text BEFORE saving
            const searchText = result.text
                .replace(/```plan-spec[\s\S]*?```/g, "")
                .replace(/(?:^|\n)stage:\s*\w+\s*\nsummary:\s*.+\ntasks:\s*\n(?:\s*-\s*label:\s*.+\n\s*status:\s*(?:complete|in-progress|pending)\s*\n?)+/g, "")
                .replace(/\n{3,}/g, "\n\n").trim()

            // ──── Choice card for search responses ────
            // The orchestrator handles guaranteed fallback emission to the live
            // stream (via compileGuaranteedChoiceSpec callback). Here we just
            // use whatever spec the orchestrator resolved — model or fallback.
            const searchChoiceSpec = result.capturedChoiceSpec ?? undefined
            if (paperStageScope && paperSession?.stageStatus === "drafting") {
                const source = searchChoiceSpec?.root ? "model-or-guaranteed" : "none"
                console.info(`[CHOICE-CARD][guaranteed][search] stage=${paperStageScope} source=${source}`)
            }

            // ──── Save assistant message ────
            const searchPlanSnapshot = result.capturedPlanSpec ?? getCurrentPlanSnapshot()

            // Observability: log what planSnapshot will be persisted (search path)
            if (searchPlanSnapshot && paperStageScope) {
                const snap = searchPlanSnapshot as PlanSpec
                const taskDetail = snap.tasks.map((t: { status: string; label: string }, i: number) => `${i}:${t.status}:${t.label.slice(0, 40)}`).join(", ")
                console.info(`[PLAN-SNAPSHOT][search] stage=${paperStageScope} tasks=${snap.tasks.length} detail=[${taskDetail}]`)
            }

            await saveAssistantMessage({
                conversationId,
                content: searchText,
                sources: result.sources.length > 0 ? result.sources : undefined,
                usedModel: combinedModelName,
                reasoningTrace: result.reasoningSnapshot,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                jsonRendererChoice: searchChoiceSpec && (searchChoiceSpec as { root?: string }).root ? searchChoiceSpec as any : undefined,
                uiMessageId: result.messageId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                planSnapshot: searchPlanSnapshot as any,
                fetchMutationWithToken,
            })

            // Auto-persist search references to paper stageData
            // Awaited (not fire-and-forget) so stageData is updated before
            // stream closes — UnifiedProcessCard task progress reflects immediately.
            if (paperSession && result.sources.length > 0) {
                try {
                    await fetchMutationWithToken(api.paperSessions.appendSearchReferences, {
                        sessionId: paperSession._id,
                        references: result.sources.map(s => ({
                            url: s.url,
                            title: s.title,
                            ...(typeof s.publishedAt === "number" && Number.isFinite(s.publishedAt)
                                ? { publishedAt: s.publishedAt }
                                : {}),
                        })),
                    })
                    console.log(`[Paper] Auto-persisted ${result.sources.length} search refs to stageData`)
                } catch (err) {
                    Sentry.captureException(err, { tags: { subsystem: "paper" } })
                    console.error("[Paper] Failed to auto-persist search references:", err)
                }
            }

            // Auto-title generation
            const minPairsForFinalTitle = Number.parseInt(
                process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                10
            )
            void maybeUpdateTitleFromAI({
                assistantText: searchText,
                minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                    ? minPairsForFinalTitle
                    : 3,
            }).catch(err => Sentry.captureException(err, { tags: { subsystem: "title" } }))

            // BILLING: Record combined search + compose tokens
            const combinedInputTokens = result.usage?.inputTokens ?? 0
            const combinedOutputTokens = result.usage?.outputTokens ?? 0
            if (combinedInputTokens > 0 || combinedOutputTokens > 0) {
                void recordUsageAfterOperation({
                    userId: billingContext.userId as Id<"users">,
                    conversationId,
                    sessionId: paperSession?._id,
                    inputTokens: combinedInputTokens,
                    outputTokens: combinedOutputTokens,
                    totalTokens: combinedInputTokens + combinedOutputTokens,
                    model: combinedModelName,
                    operationType: "web_search",
                    convexToken,
                }).catch(err => Sentry.captureException(err, { tags: { subsystem: "billing" } }))
            }

            // ──── TELEMETRY: Orchestrator two-pass search ────
            const isPrimary = result.retrieverIndex === 0
            logAiTelemetry({
                token: convexToken,
                userId,
                conversationId,
                provider: result.retrieverName === "google-grounding" ? "google-ai-studio" : "openrouter",
                model: combinedModelName,
                isPrimaryProvider: isPrimary,
                failoverUsed: !isPrimary,
                toolUsed: "two_pass_search",
                mode: "websearch",
                success: true,
                latencyMs: Date.now() - telemetryStartTime,
                inputTokens: combinedInputTokens,
                outputTokens: combinedOutputTokens,
                ...telemetrySkillContext,
                searchSkillApplied: true,
                searchSkillName: "source-quality",
                searchSkillAction: result.sources.length > 0 ? "passed" : "all-blocked",
                sourcesPassed: result.sources.length,
                sourcesBlocked: 0,
                attemptedRetrievers: result.attemptedRetrievers,
                retrieverName: result.retrieverName,
            })
        },
    })
}
