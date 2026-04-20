import type { ModelMessage } from "ai"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import { getContextWindow } from "@/lib/ai/context-budget"
import type { ParsedChoiceInteractionEvent } from "@/lib/chat/choice-request"
import type { ResolvedChoiceWorkflow } from "@/lib/chat/choice-request"
import type { ConvexFetchQuery, ConvexFetchMutation } from "../types"
import type { ResolvedStepContext } from "./types"

// Module imports
import { convertAndSanitizeMessages } from "./convert-messages"
import { assembleFileContext } from "./assemble-file-context"
import { fetchAndAssembleSourcesContext } from "./fetch-and-assemble-sources"
import { resolveExactSourceFollowupStep } from "./resolve-exact-source-followup"
import { resolveSearchDecision, type SearchDecisionResult } from "./resolve-search-decision"
import { buildExactSourceRouting } from "./build-exact-source-routing"
import { resolveInstructionStack } from "./resolve-instruction-stack"
import { applyContextBudget } from "./apply-context-budget"
import { executeWebSearchPath } from "./execute-web-search-path"
import {
    createSearchUnavailableResponse,
    createStoredReferenceInventoryResponse,
    type ResponseFactoryDeps,
} from "./response-factories"

// ────────────────────────────────────────────────────────────────
// Params
// ────────────────────────────────────────────────────────────────

export interface AssembleStepContextParams {
    // From entry boundary (Phase 1)
    accepted: {
        requestId: string
        userId: Id<"users">
        convexToken: string
        messages: import("ai").UIMessage[]
        requestStartedAt: number | undefined
        billingContext: { userId: Id<"users">; operationType?: string }
        choiceInteractionEvent: ParsedChoiceInteractionEvent | null
        fetchQueryWithToken: ConvexFetchQuery
        fetchMutationWithToken: ConvexFetchMutation
        requestFileIds: unknown[]
        requestedAttachmentMode: unknown
        replaceAttachmentContext: boolean | undefined
        clearAttachmentContext: boolean | undefined
    }
    conversation: {
        conversationId: Id<"conversations">
        isNewConversation: boolean
        maybeUpdateTitleFromAI: (params: {
            assistantText: string
            minPairsForFinalTitle: number
        }) => Promise<void>
    }
    attachments: {
        effectiveFileIds: Id<"files">[]
        attachmentResolution: { reason: "clear" | "explicit" | "inherit" | "none" }
        attachmentMode: string
        hasAttachmentSignal: boolean
        attachmentAwarenessInstruction: string
    }
    // Paper session context (resolved before context assembly)
    paperSession: {
        _id: Id<"paperSessions">
        currentStage: string
        stageStatus?: string
        stageData?: Record<string, unknown>
        stageMessageBoundaries?: { stage: string; firstMessageId: string; lastMessageId: string; messageCount: number }[]
        paperMemoryDigest?: { stage: string; decision: string; timestamp: number; superseded?: boolean }[]
        isDirty?: boolean
    } | null
    paperModePrompt: string | null
    paperStageScope: PaperStageId | undefined
    isDraftingStage: boolean
    isHasilPostChoice: boolean
    isPostEditResendReset: boolean
    choiceContextNote: string | undefined
    freeTextContextNote: string | undefined
    resolvedWorkflow: ResolvedChoiceWorkflow | undefined
    systemPrompt: string
    // Telemetry context computed by caller
    skillTelemetryContext: Record<string, unknown>
    skillResolverFallback: unknown
}

// ────────────────────────────────────────────────────────────────
// Implementation
// ────────────────────────────────────────────────────────────────

/**
 * Orchestrates context assembly for one execution step.
 *
 * Calls extracted context modules in dependency order:
 * 1. convertAndSanitizeMessages — parallel with 2, 3
 * 2. assembleFileContext — parallel with 1, 3
 * 3. fetchAndAssembleSourcesContext — parallel with 1, 2
 * 4. Dynamic imports + model loading
 * 5. resolveExactSourceFollowupStep — needs availableExactSources + model
 * 6. resolveSearchDecision — needs exactSourceResolution + model
 * 7. buildExactSourceRouting — needs 5 + 6
 * 8. resolveInstructionStack — needs 2, 3, 5, 6 outputs
 * 9. applyContextBudget — needs 8 messages
 * 10. executeWebSearchPath — if enableWebSearch → early return Response
 * 11. Return ResolvedStepContext
 *
 * Returns `Response` for early-return paths (search unavailable, reference
 * inventory, web search execution). Otherwise returns `ResolvedStepContext`.
 */
export async function assembleStepContext(
    params: AssembleStepContextParams,
): Promise<ResolvedStepContext | Response> {
    const {
        accepted,
        conversation,
        attachments,
        paperSession,
        paperModePrompt,
        paperStageScope,
        isDraftingStage,
        choiceContextNote,
        freeTextContextNote,
        systemPrompt,
        skillTelemetryContext,
    } = params

    const isPaperMode = !!paperModePrompt
    const conversationId = conversation.conversationId
    const userId = accepted.userId
    const requestId = accepted.requestId
    const fetchQueryWithToken = accepted.fetchQueryWithToken
    const fetchMutationWithToken = accepted.fetchMutationWithToken

    const isFirstTurnWithAttachment = attachments.effectiveFileIds.length > 0
        && accepted.messages.filter((m: { role?: string }) => m?.role === "user").length <= 1

    // ── Steps 1-3: Parallel independent work ──────────────────────
    const [messageResult, fileResult, sourcesResult] = await Promise.all([
        // 1. Convert + sanitize messages
        convertAndSanitizeMessages({
            messages: accepted.messages,
            isPaperMode,
        }),
        // 2. File context assembly
        assembleFileContext({
            effectiveFileIds: attachments.effectiveFileIds,
            isPaperMode,
            conversationId,
            userId,
            requestId,
            fetchQueryWithToken,
            fetchMutationWithToken,
            hasAttachmentSignal: attachments.hasAttachmentSignal,
            requestedAttachmentModeNormalized: attachments.attachmentMode as import("@/lib/chat/attachment-health").RequestedAttachmentMode,
            attachmentResolutionReason: attachments.attachmentResolution.reason,
            requestFileIdsLength: Array.isArray(accepted.requestFileIds) ? accepted.requestFileIds.length : 0,
            replaceAttachmentContext: accepted.replaceAttachmentContext === true,
            clearAttachmentContext: accepted.clearAttachmentContext === true,
            isFirstTurnWithAttachment,
        }),
        // 3. Sources context assembly
        fetchAndAssembleSourcesContext({
            conversationId,
            fetchQueryWithToken,
        }),
    ])

    const { modelMessages, recentConversationMessagesForExactSource, normalizedLastUserContent } = messageResult
    const {
        recentSourcesList,
        availableExactSources,
        hasRecentSourcesInDb,
        sourcesContext,
        sourceInventoryContext,
    } = sourcesResult

    // ── Step 4: Dynamic imports + model loading ────────────────────
    const {
        getGatewayModel,
        getOpenRouterModel,
        getProviderSettings,
        getReasoningSettings,
        buildReasoningProviderOptions,
        getModelNames,
        getWebSearchConfig,
    } = await import("@/lib/ai/streaming")

    const [model, providerSettings, reasoningSettings, modelNames, webSearchConfig] = await Promise.all([
        getGatewayModel(),
        getProviderSettings(),
        getReasoningSettings(),
        getModelNames(),
        getWebSearchConfig(),
    ])

    const samplingOptions = {
        temperature: providerSettings.temperature,
        ...(providerSettings.topP !== undefined ? { topP: providerSettings.topP } : {}),
        ...(providerSettings.maxTokens !== undefined ? { maxTokens: providerSettings.maxTokens } : {}),
    }

    // ── Step 5: Exact source followup resolution ──────────────────
    const exactSourceResult = await resolveExactSourceFollowupStep({
        model,
        lastUserContent: normalizedLastUserContent,
        recentConversationMessages: recentConversationMessagesForExactSource,
        availableExactSources,
        hasRecentSourcesInDb,
    })

    // ── Step 6: Search decision ───────────────────────────────────
    const searchDecision: SearchDecisionResult = await resolveSearchDecision({
        model,
        messages: modelMessages,
        lastUserContent: normalizedLastUserContent,
        paperSession,
        paperStageScope,
        isDraftingStage,
        paperModePrompt,
        exactSourceResolution: exactSourceResult.resolution,
        choiceInteractionEvent: accepted.choiceInteractionEvent,
        availableExactSources,
        webSearchConfig,
        conversationId: conversationId as string,
        convexToken: accepted.convexToken,
        recentSourcesList,
        hasRecentSourcesInDb,
    })

    // ── Early return: reference inventory ──────────────────────────
    if (searchDecision.earlyReturn?.kind === "reference_inventory") {
        const deps = buildResponseFactoryDeps(params, modelNames, hasRecentSourcesInDb, paperSession)
        return createStoredReferenceInventoryResponse(deps, {
            introText: "Berikut semua sumber yang sudah tersimpan dari penelusuran sebelumnya.",
            items: searchDecision.earlyReturn.items,
            usedModel: modelNames.primary.model,
        })
    }

    // ── Early return: search unavailable ───────────────────────────
    if (searchDecision.earlyReturn?.kind === "search_unavailable") {
        const deps = buildResponseFactoryDeps(params, modelNames, hasRecentSourcesInDb, paperSession)
        return createSearchUnavailableResponse(deps, {
            reasonCode: searchDecision.earlyReturn.reasonCode,
            message: searchDecision.earlyReturn.message,
            usedModel: modelNames.primary.model,
            telemetryFallbackReason: searchDecision.earlyReturn.reasonCode,
        })
    }

    const enableWebSearch = searchDecision.enableWebSearch

    // ── Forced sync/submit flags ──────────────────────────────────
    const forcedToolChoice = searchDecision.shouldForceSubmitValidation
        ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
        : undefined

    const forcedSyncPrepareStep = searchDecision.shouldForceGetCurrentPaperState
        ? ({ stepNumber }: { stepNumber: number }) => {
            if (stepNumber === 0) {
                return {
                    toolChoice: { type: "tool", toolName: "getCurrentPaperState" } as const,
                    activeTools: ["getCurrentPaperState"] as string[],
                }
            }
            if (stepNumber === 1) {
                return {
                    toolChoice: "none" as const,
                    activeTools: [] as string[],
                }
            }
            return undefined
        }
        : undefined

    const maxToolSteps = searchDecision.shouldForceGetCurrentPaperState ? 2 : 5

    // ── Step 8: Instruction stack ─────────────────────────────────
    const instructionStack = resolveInstructionStack({
        systemPrompt,
        paperModePrompt,
        fileContext: fileResult.fileContext,
        attachmentAwarenessInstruction: attachments.attachmentAwarenessInstruction,
        sourcesContext,
        sourceInventoryContext,
        exactSourceResolution: exactSourceResult.resolution,
        shouldIncludeRawSourcesContext: exactSourceResult.shouldIncludeRawSourcesContext,
        shouldIncludeExactInspectionSystemMessage: exactSourceResult.shouldIncludeExactInspectionSystemMessage,
        shouldIncludeRecentSourceSkillInstructions: exactSourceResult.shouldIncludeRecentSourceSkillInstructions,
        recentSourcesList,
        choiceContextNote,
        freeTextContextNote,
        isDraftingStage,
        paperStageScope,
        paperSession,
        paperModeActive: isPaperMode,
        currentStage: paperSession?.currentStage ?? null,
        conversationMessages: modelMessages,
    })

    // ── Flatten instruction stack to message array ─────────────────
    const fullMessagesBase: ModelMessage[] = [
        ...instructionStack.entries.map(e => ({
            role: "system" as const,
            content: e.content,
        })),
        ...instructionStack.conversationMessages,
    ]

    // Inject search-related notes
    const fullMessagesWithNotes: ModelMessage[] = enableWebSearch
        ? [
            fullMessagesBase[0],
            ...(searchDecision.activeStageSearchNote && searchDecision.activeStageSearchReason === "research_incomplete"
                ? [{ role: "system" as const, content: searchDecision.activeStageSearchNote }]
                : []),
            ...fullMessagesBase.slice(1),
        ]
        : [
            fullMessagesBase[0],
            ...(searchDecision.activeStageSearchNote && paperModePrompt && !enableWebSearch
                ? [{ role: "system" as const, content: searchDecision.activeStageSearchNote }]
                : []),
            ...(searchDecision.missingArtifactNote
                ? [{ role: "system" as const, content: searchDecision.missingArtifactNote }]
                : []),
            ...fullMessagesBase.slice(1),
        ]

    // ── Step 9: Context budget + compaction ───────────────────────
    const contextWindow = getContextWindow(modelNames.primaryContextWindow)
    const budgetResult = await applyContextBudget({
        messages: fullMessagesWithNotes,
        contextWindow,
        isPaperMode,
        paperStageScope,
        paperSession: paperSession ? {
            currentStage: paperSession.currentStage,
            stageMessageBoundaries: paperSession.stageMessageBoundaries,
            paperMemoryDigest: paperSession.paperMemoryDigest,
        } : null,
        getModel: async () => getGatewayModel(),
    })

    // ── Step 7: Exact source routing (applied to budget-trimmed messages) ──
    const exactRouting = buildExactSourceRouting({
        exactSourceResolution: exactSourceResult.resolution,
        enableWebSearch,
        forcedSyncPrepareStep,
        forcedToolChoice,
        availableExactSources,
        messages: budgetResult.messages,
        stageStatus: params.paperSession?.stageStatus as string | undefined,
    })

    // ── Step 10: Web search early return ──────────────────────────
    if (enableWebSearch) {
        const reasoningProviderOptions = buildReasoningProviderOptions({
            settings: reasoningSettings,
            target: "primary",
            profile: "narrative",
        })

        const { buildRetrieverChain } = await import("@/lib/ai/web-search")
        const retrieverChain = buildRetrieverChain({
            webSearchRetrievers: webSearchConfig.webSearchRetrievers,
            legacyConfig: {
                primaryWebSearchEnabled: webSearchConfig.primaryEnabled,
                fallbackWebSearchEnabled: webSearchConfig.fallbackEnabled,
                webSearchModel: webSearchConfig.webSearchModel,
                webSearchFallbackModel: webSearchConfig.webSearchFallbackModel,
                fallbackWebSearchEngine: webSearchConfig.fallbackEngine,
                fallbackWebSearchMaxResults: webSearchConfig.fallbackMaxResults,
            },
            openrouterApiKey: webSearchConfig.openrouterApiKey ?? "",
            googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        const getCurrentPlanSnapshot = buildGetCurrentPlanSnapshot(paperSession, paperStageScope)
        const telemetryStartTime = Date.now()

        const deps = buildResponseFactoryDeps(params, modelNames, hasRecentSourcesInDb, paperSession)

        const searchResponse = await executeWebSearchPath({
            enableWebSearch: true,
            requestId,
            requestStartedAt: accepted.requestStartedAt,
            conversationId,
            userId,
            convexToken: accepted.convexToken,
            retrieverChain,
            fullMessagesGateway: fullMessagesWithNotes,
            trimmedModelMessages: modelMessages,
            model,
            modelNames,
            getOpenRouterModel,
            systemPrompt,
            paperModePrompt: paperModePrompt || undefined,
            paperStageScope,
            fileContext: fileResult.fileContext || undefined,
            isDraftingStage,
            paperSession,
            samplingOptions,
            reasoningTraceEnabled: reasoningSettings.traceMode === "curated" || reasoningSettings.traceMode === "transparent",
            isTransparentReasoning: reasoningSettings.traceMode === "transparent",
            reasoningProviderOptions: reasoningProviderOptions ?? undefined,
            billingContext: accepted.billingContext as { userId: string; operationType?: string },
            telemetryStartTime,
            telemetrySkillContext: skillTelemetryContext,
            getCurrentPlanSnapshot,
            fetchMutationWithToken,
            maybeUpdateTitleFromAI: conversation.maybeUpdateTitleFromAI,
            createSearchUnavailableResponse: async (input) => {
                return createSearchUnavailableResponse(deps, input)
            },
            getTraceModeLabel: (isPaper: boolean, webSearch: boolean) => {
                if (webSearch) return "websearch"
                if (isPaper) return "paper"
                return "normal"
            },
        })

        if (searchResponse) {
            return searchResponse
        }
    }

    // ── Step 11: Build and return ResolvedStepContext ──────────────
    const reasoningProviderOptions = buildReasoningProviderOptions({
        settings: reasoningSettings,
        target: "primary",
        profile: "narrative",
    })

    const _reasoningTraceEnabled = reasoningSettings.traceMode === "curated" || reasoningSettings.traceMode === "transparent"
    const forcedToolTelemetryName = searchDecision.shouldForceGetCurrentPaperState
        ? "getCurrentPaperState"
        : undefined
    const telemetrySkillContext = forcedToolTelemetryName
        ? { ...skillTelemetryContext, fallbackReason: "explicit_sync_request" }
        : skillTelemetryContext

    return {
        messages: exactRouting.messages,
        toolChoice: exactRouting.toolChoice ?? forcedToolChoice,
        maxSteps: exactRouting.maxToolSteps ?? maxToolSteps,
        samplingOptions,
        providerOptions: reasoningProviderOptions,
        budgetStatus: budgetResult.budgetStatus,
        searchDecision: {
            enableWebSearch: searchDecision.enableWebSearch,
            executionMode: searchDecision.executionMode,
            intentType: searchDecision.intentType,
            confidence: searchDecision.confidence,
            reason: searchDecision.reason,
        },
        exactSourceRouting: {
            mode: exactSourceResult.resolution.mode as "force-inspect" | "clarify" | "none",
            matchedSourceId: exactSourceResult.resolution.mode === "force-inspect"
                ? exactSourceResult.resolution.matchedSource.sourceId
                : undefined,
            prepareStep: exactRouting.prepareStep,
        },
        skillTelemetryContext: {
            skillInstructions: "",
            stageSearchPolicy: "",
            hasRecentSourcesInDb,
            ...telemetrySkillContext,
        },
        model,
        modelNames,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reasoningSettings: reasoningSettings as any,
        webSearchConfig,
        recentSourcesList,
        hasRecentSourcesInDb,
        availableExactSources,
        normalizedLastUserContent,
        exactSourceResolution: exactSourceResult.resolution,
        forcedSyncPrepareStep,
        forcedToolChoice,
        missingArtifactNote: searchDecision.missingArtifactNote || undefined,
    }
}

// ────────────────────────────────────────────────────────────────
// Private helpers
// ────────────────────────────────────────────────────────────────

function buildGetCurrentPlanSnapshot(
    paperSession: AssembleStepContextParams["paperSession"],
    paperStageScope: PaperStageId | undefined,
) {
    return () => {
        if (!paperSession?.stageData || !paperStageScope) return undefined
        const sd = paperSession.stageData as Record<string, Record<string, unknown>>
        return (sd[paperStageScope]?._plan as import("@/lib/ai/harness/plan-spec").PlanSpec | undefined) ?? undefined
    }
}

function buildResponseFactoryDeps(
    params: AssembleStepContextParams,
    modelNames: { primary: { model: string; provider: string }; fallback: { model: string; provider: string } },
    hasRecentSourcesInDb: boolean,
    paperSession: AssembleStepContextParams["paperSession"],
): ResponseFactoryDeps {
    const paperStageScope = params.paperStageScope
    return {
        convexToken: params.accepted.convexToken,
        userId: params.accepted.userId,
        conversationId: params.conversation.conversationId,
        modelNames,
        telemetryStartTime: Date.now(),
        skillTelemetryContext: {
            skillInstructions: "",
            stageSearchPolicy: "",
            hasRecentSourcesInDb,
        },
        getCurrentPlanSnapshot: buildGetCurrentPlanSnapshot(paperSession, paperStageScope),
        fetchMutationWithToken: params.accepted.fetchMutationWithToken,
    }
}
