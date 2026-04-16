import * as Sentry from "@sentry/nextjs"
import type { ModelMessage } from "ai"

import { getSystemPrompt } from "@/lib/ai/chat-config"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import {
    acceptChatRequest,
    resolveConversation,
    resolveAttachments,
    persistUserMessage,
    validateChoiceInteraction,
    resolveRunLane,
} from "@/lib/chat-harness/entry"
import { createPaperToolTracker } from "@/lib/ai/paper-tools"
import { getPaperModeSystemPrompt } from "@/lib/ai/paper-mode-prompt"
import { getSearchSkill } from "@/lib/ai/skills"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import { type PlanSpec } from "@/lib/ai/harness/plan-spec"
import type { Spec } from "@json-render/core"
import { logAiTelemetry, classifyError } from "@/lib/ai/telemetry"
import { buildToolRegistry, buildStepStream, saveAssistantMessage } from "@/lib/chat-harness/executor"
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"
import type { JsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
import {
    assembleStepContext,
    buildExactSourceRouting,
    buildForcedSyncStatusMessage,
} from "@/lib/chat-harness/context"
import { evaluateRuntimePolicy } from "@/lib/chat-harness/policy"
import { createRunStore, createEventStore } from "@/lib/chat-harness/persistence"

export async function POST(req: Request) {
    try {
        // ════════════════════════════════════════════════════════════════
        // Entry boundary (Phase 1) — auth, parsing, billing, conversation,
        // attachments, user message persistence
        // ════════════════════════════════════════════════════════════════
        const accepted = await acceptChatRequest(req)
        if (accepted instanceof Response) return accepted

        // Persistence adapters — single instance per request, shared across
        // entry/executor/policy/verification phases. `fetchMutationWithToken`
        // is already user-scoped from acceptChatRequest.
        const runStore = createRunStore({ fetchMutation: accepted.fetchMutationWithToken })
        const eventStore = createEventStore({ fetchMutation: accepted.fetchMutationWithToken })

        const conversation = await resolveConversation({
            conversationId: accepted.conversationId,
            userId: accepted.userId,
            firstUserContent: accepted.firstUserContent,
            fetchQueryWithToken: accepted.fetchQueryWithToken,
            fetchMutationWithToken: accepted.fetchMutationWithToken,
        })

        // Run lane — creates harnessRuns row + emits run_started BEFORE we
        // persist the user message so downstream events have a runId.
        const lane = await resolveRunLane({
            requestId: accepted.requestId,
            conversationId: conversation.conversationId,
            userId: accepted.userId,
            isNewConversation: conversation.isNewConversation,
            runStore,
            eventStore,
            fetchQuery: accepted.fetchQueryWithToken,
        })

        const attachments = await resolveAttachments({
            conversationId: conversation.conversationId,
            messages: accepted.messages,
            requestFileIds: accepted.requestFileIds,
            requestedAttachmentMode: accepted.requestedAttachmentMode,
            replaceAttachmentContext: accepted.replaceAttachmentContext,
            inheritAttachmentContext: accepted.inheritAttachmentContext,
            clearAttachmentContext: accepted.clearAttachmentContext,
            fetchQueryWithToken: accepted.fetchQueryWithToken,
            fetchMutationWithToken: accepted.fetchMutationWithToken,
        })

        const msgResult = await persistUserMessage({
            messages: accepted.messages,
            conversationId: conversation.conversationId,
            effectiveFileIds: attachments.effectiveFileIds,
            requestedAttachmentMode: accepted.requestedAttachmentMode,
            attachmentResolution: attachments.attachmentResolution,
            fetchMutationWithToken: accepted.fetchMutationWithToken,
            eventStore,
            lane,
            userId: accepted.userId,
        })
        if (msgResult instanceof Response) return msgResult

        // Aliases for downstream code
        const currentConversationId = conversation.conversationId
        const userId = accepted.userId
        const convexToken = accepted.convexToken
        const fetchQueryWithToken = accepted.fetchQueryWithToken
        const fetchMutationWithToken = accepted.fetchMutationWithToken
        const requestId = accepted.requestId
        const billingContext = accepted.billingContext
        const choiceInteractionEvent = accepted.choiceInteractionEvent
        const maybeUpdateTitleFromAI = conversation.maybeUpdateTitleFromAI
        const requestStartedAt = accepted.requestStartedAt

        // 6. Prepare System Prompt & Context
        const systemPrompt = await getSystemPrompt()

        // Task Group 3: Fetch paper mode system prompt if paper session exists
        const paperModeContext = await getPaperModeSystemPrompt(
            currentConversationId as Id<"conversations">,
            userId as Id<"users">,
            convexToken,
            requestId
        )
        const paperModePrompt = paperModeContext.prompt
        const skillResolverFallback = paperModeContext.skillResolverFallback
        const paperSession = paperModePrompt
            ? await fetchQueryWithToken(api.paperSessions.getByConversation, {
                conversationId: currentConversationId as Id<"conversations">,
            })
            : null
        const paperStageScope =
            paperSession && paperSession.currentStage !== "completed"
                ? (paperSession.currentStage as PaperStageId)
                : undefined
        const isDraftingStage = !!paperStageScope && paperSession?.stageStatus === "drafting"
        // Detect post-edit-resend-reset: stage is drafting but stageData is empty/minimal (only revisionCount)
        const currentStageDataKeys = paperSession?.stageData
            ? Object.keys((paperSession.stageData as Record<string, Record<string, unknown>>)[paperSession.currentStage] ?? {}).filter(k => k !== "revisionCount")
            : []
        const isPostEditResendReset = !!paperStageScope && paperSession?.stageStatus === "drafting" && currentStageDataKeys.length === 0
        console.info(`[PAPER][session-resolve] stage=${paperSession?.currentStage ?? "none"} status=${paperSession?.stageStatus ?? "none"} hasPrompt=${!!paperModePrompt} skillFallback=${skillResolverFallback} stageInstructionSource=${paperModeContext.stageInstructionSource}${isPostEditResendReset ? " postEditResendReset=true" : ""}`)
        const isHasilPostChoice = choiceInteractionEvent?.stage === "hasil"
        const paperToolTracker = createPaperToolTracker()
        const paperTurnObservability: {
            firstLeakageMatch: string | null
            firstLeakageSnippet: string | null
            firstLeakageAtMs: number | null
            createArtifactAtMs: number | null
            updateArtifactAtMs: number | null
        } = {
            firstLeakageMatch: null,
            firstLeakageSnippet: null,
            firstLeakageAtMs: null,
            createArtifactAtMs: null,
            updateArtifactAtMs: null,
        }

        // Free-text context note: when user sends a regular message (no choice card),
        // inject stage-aware context so model quality approaches choice card level.
        let freeTextContextNote: string | undefined
        if (!choiceInteractionEvent && paperStageScope && isDraftingStage) {
            const sd = (paperSession?.stageData as Record<string, Record<string, unknown>> | undefined)?.[paperStageScope]
            const plan = sd?._plan as { tasks?: { label: string; status: string }[] } | undefined
            const hasArtifact = !!sd?.artifactId
            const completedTasks = plan?.tasks?.filter(t => t.status === "complete").length ?? 0
            const totalTasks = plan?.tasks?.length ?? 0
            const allTasksComplete = totalTasks > 0 && completedTasks === totalTasks

            const lines: string[] = [
                `═══ FREE-TEXT TURN CONTEXT ═══`,
                `Stage: ${paperStageScope} | Status: drafting | Plan: ${totalTasks === 0 ? "not yet generated" : `${completedTasks}/${totalTasks} tasks complete`}`,
                ``,
                `The user is responding via free text, not a choice card button.`,
                `Interpret their message as a direction choice — they may be:`,
                `- Selecting a direction from your previous suggestions`,
                `- Asking to continue discussion on a specific aspect`,
                `- Requesting to finalize the stage`,
                ``,
                `Respond as if they selected the most relevant option from your last response.`,
                `Do NOT ask them to use a button or re-present the same options.`,
            ]

            if (allTasksComplete && !hasArtifact) {
                lines.push(
                    ``,
                    `NOTE: All plan tasks are complete but no artifact has been created yet.`,
                    `If the user's message indicates agreement or readiness to proceed,`,
                    `treat it as a finalize signal: updateStageData → createArtifact → submitStageForValidation.`,
                )
            }

            lines.push(`═══════════════════════════════`)
            freeTextContextNote = lines.join("\n")
            console.info(`[FREE-TEXT-CONTEXT] stage=${paperStageScope} plan=${totalTasks === 0 ? "none" : `${completedTasks}/${totalTasks}`} hasArtifact=${hasArtifact} finalizeHint=${allTasksComplete && !hasArtifact}`)
        }

        // Choice validation (depends on paperSession from context assembly above)
        const choiceResult = await validateChoiceInteraction({
            choiceInteractionEvent,
            conversationId: currentConversationId,
            paperSession,
            paperStageScope,
            paperModePrompt,
            eventStore,
            lane,
            userId: userId as Id<"users">,
        })
        if (choiceResult instanceof Response) return choiceResult
        const { resolvedWorkflow, choiceContextNote } = choiceResult

        // Update billing context with paper session info (must happen after paperSession fetch)
        if (paperSession) {
            billingContext.operationType = "paper_generation"
        }

        const isPaperMode = !!paperModePrompt

        // Skill telemetry context
        const skillTelemetryContext = isPaperMode
            ? {
                skillResolverFallback,
                stageScope: paperStageScope,
                stageInstructionSource: paperModeContext.stageInstructionSource,
                activeSkillId: paperModeContext.activeSkillId,
                activeSkillVersion: paperModeContext.activeSkillVersion,
                fallbackReason: paperModeContext.fallbackReason,
            }
            : {}

        // ════════════════════════════════════════════════════════════════
        // Context Assembly (Phase 3) — orchestrated by assembleStepContext
        // ════════════════════════════════════════════════════════════════
        const stepContext = await assembleStepContext({
            accepted,
            conversation,
            attachments,
            paperSession,
            paperModePrompt,
            paperStageScope,
            isDraftingStage,
            isHasilPostChoice,
            isPostEditResendReset,
            choiceContextNote,
            freeTextContextNote,
            resolvedWorkflow,
            systemPrompt,
            skillTelemetryContext,
            skillResolverFallback,
        })
        if (stepContext instanceof Response) return stepContext

        // ── Aliases from stepContext for downstream code ───────────────
        const { model, modelNames } = stepContext
        const enableWebSearch = stepContext.searchDecision.enableWebSearch
        const normalizedLastUserContent = stepContext.normalizedLastUserContent
        const recentSourcesList = stepContext.recentSourcesList
        const hasRecentSourcesInDb = stepContext.hasRecentSourcesInDb
        const exactSourceResolution = stepContext.exactSourceResolution
        const availableExactSources = stepContext.availableExactSources
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reasoningSettings = stepContext.reasoningSettings as any
        const shouldForceGetCurrentPaperState = !!stepContext.forcedSyncPrepareStep
        const shouldForceSubmitValidation = !!stepContext.forcedToolChoice
        const missingArtifactNote = stepContext.missingArtifactNote ?? ""

        // Resolve current plan snapshot for message persistence.
        const getCurrentPlanSnapshot = (): PlanSpec | undefined => {
            if (!paperSession?.stageData || !paperStageScope) return undefined
            const sd = paperSession.stageData as Record<string, Record<string, unknown>>
            return (sd[paperStageScope]?._plan as PlanSpec | undefined) ?? undefined
        }

        // saveAssistantMessage wrapper for standalone calls
        const saveAssistantMessageLocal = async (
            content: string,
            sources?: { url: string; title: string; publishedAt?: number | null }[],
            usedModel?: string,
            reasoningTrace?: PersistedCuratedTraceSnapshot,
            jsonRendererChoice?: JsonRendererChoicePayload | Spec,
            uiMessageId?: string,
            planSnapshot?: unknown,
        ) => {
            await saveAssistantMessage({
                conversationId: currentConversationId as Id<"conversations">,
                content,
                sources,
                usedModel: usedModel ?? modelNames.primary.model,
                reasoningTrace,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                jsonRendererChoice: jsonRendererChoice as any,
                uiMessageId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                planSnapshot: planSnapshot as any,
                fetchMutationWithToken,
            })
        }

        // Unified search skill instance
        const skill = getSearchSkill()

        // ============================================================
        // TOOL REGISTRY — extracted to executor/build-tool-registry.ts
        // ============================================================
        const tools = buildToolRegistry({
            conversationId: currentConversationId as Id<"conversations">,
            userId: userId as Id<"users">,
            paperSession,
            paperStageScope,
            paperToolTracker,
            paperTurnObservability,
            resolvedWorkflow,
            fetchQueryWithToken,
            fetchMutationWithToken,
            skill,
            recentSourcesList,
            hasRecentSourcesInDb,
            convexToken,
            modelProvider: modelNames.primary.provider,
            isPaperMode,
        })

        // ════════════════════════════════════════════════════════════════
        // RUNTIME POLICY — evaluates all enforcers & composes prepareStep
        // ════════════════════════════════════════════════════════════════
        const policyDecision = evaluateRuntimePolicy({
            enforcerContext: {
                paperSession,
                paperStageScope,
                paperToolTracker,
                resolvedWorkflow,
                choiceInteractionEvent,
            },
            exactSourceRouting: stepContext.exactSourceRouting,
            forcedSyncPrepareStep: stepContext.forcedSyncPrepareStep,
            forcedToolChoice: stepContext.forcedToolChoice,
        })

        // ════════════════════════════════════════════════════════════════
        // STREAM EXECUTION — Primary + Fallback
        // ════════════════════════════════════════════════════════════════

        const telemetryStartTime = Date.now()
        const reasoningTraceEnabled = reasoningSettings.traceMode === "curated" || reasoningSettings.traceMode === "transparent"
        const isTransparentReasoning = reasoningSettings.traceMode === "transparent"
        const getTraceModeLabel = (isPaper: boolean, webSearch: boolean): "normal" | "paper" | "websearch" => {
            if (webSearch) return "websearch"
            if (isPaper) return "paper"
            return "normal"
        }

        const forcedToolTelemetryName = shouldForceGetCurrentPaperState
            ? "getCurrentPaperState"
            : undefined
        const telemetrySkillContext = forcedToolTelemetryName
            ? { ...skillTelemetryContext, fallbackReason: "explicit_sync_request" }
            : skillTelemetryContext

        try {
            const primaryMessageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

            // ── Primary stream: buildStepStream ──
            return buildStepStream({
                executionConfig: {
                    model,
                    messages: stepContext.messages,
                    tools,
                    prepareStep: policyDecision.prepareStep,
                    stopWhen: undefined,
                    maxSteps: stepContext.maxSteps,
                    modelName: modelNames.primary.model,
                    toolChoice: stepContext.toolChoice,
                    providerOptions: stepContext.providerOptions,
                    samplingOptions: stepContext.samplingOptions,
                    runStore,
                    eventStore,
                },
                onFinishConfig: {
                    conversationId: currentConversationId as Id<"conversations">,
                    userId: userId as Id<"users">,
                    modelName: modelNames.primary.model,
                    model,
                    requestId,
                    convexToken,
                    billingContext,
                    paperSession,
                    paperStageScope,
                    paperToolTracker,
                    paperTurnObservability,
                    resolvedWorkflow,
                    choiceInteractionEvent,
                    isCompileThenFinalize: policyDecision.isCompileThenFinalize,
                    normalizedLastUserContent,
                    lane,
                    maybeUpdateTitleFromAI,
                    fetchQueryWithToken,
                    fetchMutationWithToken,
                    requestStartedAt,
                    isDraftingStage,
                    isHasilPostChoice,
                    buildLeakageSnippet: (text: string, matchIndex: number, matchValue: string) => {
                        const start = Math.max(0, matchIndex - 120)
                        const end = Math.min(text.length, matchIndex + matchValue.length + 120)
                        return text.slice(start, end).replace(/\s+/g, " ").trim()
                    },
                    enableGroundingExtraction: true,
                    enableSourceTitleEnrichment: true,
                    enableRevisionClassifier: true,
                    enablePlanSpecFallbackExtraction: true,
                    runStore,
                    eventStore,
                },
                streamContext: {
                    messageId: primaryMessageId,
                    reasoningTrace: {
                        enabled: reasoningTraceEnabled,
                        controller: null,
                        snapshot: undefined,
                        sourceCount: 0,
                        captureSnapshot: () => {},
                    },
                    telemetry: {
                        provider: modelNames.primary.provider,
                        model: modelNames.primary.model,
                        isPrimaryProvider: true,
                        failoverUsed: false,
                        toolUsed: forcedToolTelemetryName,
                        mode: isPaperMode ? "paper" : "normal",
                        startTime: telemetryStartTime,
                        skillContext: telemetrySkillContext,
                    },
                    shouldForceGetCurrentPaperState,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    buildForcedSyncStatusMessage: buildForcedSyncStatusMessage as any,
                    getCurrentPlanSnapshot,
                    enforcerStepStartTime: policyDecision.stepTimingRef.current,
                    activeStep: null,
                },
                reasoningTraceEnabled,
                enablePlanCapture: !!paperStageScope,
                enableYamlRender: isDraftingStage,
                transparentReasoningEnabled: isTransparentReasoning,
                traceMode: getTraceModeLabel(!!paperModePrompt, false),
                logTag: "",
            })
        } catch (error) {
            console.error("Gateway stream failed, trying fallback:", error)
            Sentry.addBreadcrumb({
                category: "ai.failover",
                message: `Primary provider failed, switching to fallback`,
                level: "warning",
                data: { errorType: classifyError(error).errorType },
            })

            // ═══ TELEMETRY: Primary provider failure ═══
            const primaryErrorInfo = classifyError(error)
            logAiTelemetry({
                token: convexToken,
                userId: userId as Id<"users">,
                conversationId: currentConversationId as Id<"conversations">,
                provider: modelNames.primary.provider as "vercel-gateway" | "openrouter",
                model: modelNames.primary.model,
                isPrimaryProvider: true,
                failoverUsed: false,
                toolUsed: enableWebSearch ? "perplexity_search" : undefined,
                mode: enableWebSearch ? "websearch" : (isPaperMode ? "paper" : "normal"),
                success: false,
                errorType: primaryErrorInfo.errorType,
                errorMessage: primaryErrorInfo.errorMessage,
                latencyMs: Date.now() - telemetryStartTime,
                ...skillTelemetryContext,
            })

            // ════════════════════════════════════════════════════════════════
            // FALLBACK: OpenRouter without web search
            // ════════════════════════════════════════════════════════════════

            const fallbackTelemetryContext = skillTelemetryContext
            const {
                getOpenRouterModel,
                buildReasoningProviderOptions,
            } = await import("@/lib/ai/streaming")

            const fallbackReasoningProviderOptions = buildReasoningProviderOptions({
                settings: reasoningSettings,
                target: "fallback",
                profile: "narrative",
            })

            const runFallbackWithoutSearch = async () => {
                const fallbackModel = await getOpenRouterModel({ enableWebSearch: false })
                const fallbackForcedToolChoice = shouldForceSubmitValidation
                    ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
                    : undefined
                const fallbackMaxToolSteps = shouldForceGetCurrentPaperState ? 2 : 5
                const fallbackDeterministicSyncPrepareStep = shouldForceGetCurrentPaperState
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

                // Re-derive exact source routing for fallback messages
                // (uses the same base messages from stepContext, minus the primary routing)
                const fallbackExactSourceRouting = buildExactSourceRouting({
                    exactSourceResolution,
                    enableWebSearch: false,
                    forcedSyncPrepareStep: stepContext.forcedSyncPrepareStep,
                    forcedToolChoice: fallbackForcedToolChoice,
                    availableExactSources,
                    messages: stepContext.messages,
                    stageStatus: paperSession?.stageStatus as string | undefined,
                })

                const fallbackMessageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

                // Re-evaluate policy for fallback with its own exact source routing.
                // buildExactSourceRouting returns a different shape than ExactSourceRoutingResult,
                // so we adapt it to the expected interface.
                const fallbackPolicyDecision = evaluateRuntimePolicy({
                    enforcerContext: {
                        paperSession,
                        paperStageScope,
                        paperToolTracker,
                        resolvedWorkflow,
                        choiceInteractionEvent,
                    },
                    exactSourceRouting: {
                        mode: fallbackExactSourceRouting.prepareStep ? "force-inspect" : "none",
                        matchedSourceId: stepContext.exactSourceRouting.matchedSourceId,
                        prepareStep: fallbackExactSourceRouting.prepareStep,
                    },
                    forcedSyncPrepareStep: fallbackDeterministicSyncPrepareStep,
                    forcedToolChoice: fallbackForcedToolChoice,
                })

                const fallbackTransparent = isTransparentReasoning && reasoningSettings.fallback.supported

                return buildStepStream({
                    executionConfig: {
                        model: fallbackModel,
                        messages: fallbackExactSourceRouting.messages,
                        tools,
                        prepareStep: fallbackPolicyDecision.prepareStep,
                        stopWhen: undefined,
                        maxSteps: fallbackExactSourceRouting.maxToolSteps ?? fallbackMaxToolSteps,
                        modelName: modelNames.fallback.model,
                        toolChoice: fallbackForcedToolChoice,
                        providerOptions: fallbackReasoningProviderOptions,
                        samplingOptions: stepContext.samplingOptions,
                        runStore,
                        eventStore,
                    },
                    onFinishConfig: {
                        conversationId: currentConversationId as Id<"conversations">,
                        userId: userId as Id<"users">,
                        modelName: modelNames.fallback.model,
                        model: fallbackModel,
                        requestId,
                        convexToken,
                        billingContext,
                        paperSession,
                        paperStageScope,
                        paperToolTracker,
                        paperTurnObservability,
                        resolvedWorkflow,
                        choiceInteractionEvent,
                        isCompileThenFinalize: fallbackPolicyDecision.isCompileThenFinalize,
                        normalizedLastUserContent,
                        lane,
                        maybeUpdateTitleFromAI,
                        fetchQueryWithToken,
                        fetchMutationWithToken,
                        requestStartedAt,
                        isDraftingStage,
                        isHasilPostChoice,
                        buildLeakageSnippet: (text: string, matchIndex: number, matchValue: string) => {
                            const start = Math.max(0, matchIndex - 120)
                            const end = Math.min(text.length, matchIndex + matchValue.length + 120)
                            return text.slice(start, end).replace(/\s+/g, " ").trim()
                        },
                        enableGroundingExtraction: false,
                        enableSourceTitleEnrichment: false,
                        enableRevisionClassifier: false,
                        enablePlanSpecFallbackExtraction: false,
                        runStore,
                        eventStore,
                    },
                    streamContext: {
                        messageId: fallbackMessageId,
                        reasoningTrace: {
                            enabled: reasoningTraceEnabled,
                            controller: null,
                            snapshot: undefined,
                            sourceCount: 0,
                            captureSnapshot: () => {},
                        },
                        telemetry: {
                            provider: modelNames.fallback.provider,
                            model: modelNames.fallback.model,
                            isPrimaryProvider: false,
                            failoverUsed: true,
                            toolUsed: undefined,
                            mode: isPaperMode ? "paper" : "normal",
                            startTime: telemetryStartTime,
                            skillContext: fallbackTelemetryContext,
                        },
                        shouldForceGetCurrentPaperState,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    buildForcedSyncStatusMessage: buildForcedSyncStatusMessage as any,
                        getCurrentPlanSnapshot,
                        enforcerStepStartTime: undefined,
                        activeStep: null,
                    },
                    reasoningTraceEnabled,
                    enablePlanCapture: !!paperStageScope,
                    enableYamlRender: isDraftingStage,
                    transparentReasoningEnabled: fallbackTransparent,
                    traceMode: getTraceModeLabel(!!paperModePrompt, false),
                    logTag: "[fallback]",
                })
            }

            return runFallbackWithoutSearch()
        }

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                "api.route": "chat",
            },
        })
        console.error("Chat API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
