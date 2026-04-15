import * as Sentry from "@sentry/nextjs"
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, generateText, Output, type ModelMessage } from "ai"
import { z } from "zod"

import { getSystemPrompt } from "@/lib/ai/chat-config"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { retryMutation, retryQuery, retryDelay } from "@/lib/convex/retry"
import {
    acceptChatRequest,
    resolveConversation,
    resolveAttachments,
    persistUserMessage,
    validateChoiceInteraction,
    resolveRunLane,
} from "@/lib/chat-harness/entry"
// normalizeWebSearchUrl, enrichSourcesWithFetchedTitles → now in executor/build-on-finish-handler.ts
// createPaperTools → now in executor/build-tool-registry.ts
// checkSourceBodyParity → now in executor/build-tool-registry.ts
import { createPaperToolTracker } from "@/lib/ai/paper-tools"
import { getPaperModeSystemPrompt } from "@/lib/ai/paper-mode-prompt"
// classifyRevisionIntent → now in executor/build-on-finish-handler.ts
import { ACTIVE_SEARCH_STAGES, PASSIVE_SEARCH_STAGES } from "@/lib/ai/stage-skill-contracts"
import { getStageLabel, type PaperStageId } from "../../../../convex/paperSessions/constants"
import {
    isStageResearchIncomplete,
    getPaperToolsOnlyNote,
    getResearchIncompleteNote,
    getFunctionToolsModeNote,
    STAGE_RESEARCH_REQUIREMENTS,
} from "@/lib/ai/paper-search-helpers"
import {
    checkContextBudget,
    getContextWindow,
} from "@/lib/ai/context-budget"
import { runCompactionChain, type CompactableMessage } from "@/lib/ai/context-compaction"
import {
    recordUsageAfterOperation,
} from "@/lib/billing/enforcement"
import { logAiTelemetry, classifyError } from "@/lib/ai/telemetry"
import { getSearchSkill, composeSkillInstructions, type SkillContext } from "@/lib/ai/skills"
// createCuratedTraceController, createReasoningLiveAccumulator → now in executor/build-step-stream.ts
import type { PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"
// buildUserFacingSearchPayload now handled by orchestrator
import type { JsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
// pipeYamlRender, pipePlanCapture, SPEC_DATA_PART_TYPE, applySpecPatch → now in executor/build-step-stream.ts
// UNFENCED_PLAN_REGEX, planSpecSchema, autoCompletePlanOnValidation → now in executor/build-on-finish-handler.ts
import { type PlanSpec } from "@/lib/ai/harness/plan-spec"
import type { Spec } from "@json-render/core"
import { CHOICE_YAML_SYSTEM_PROMPT } from "@/lib/json-render/choice-yaml-prompt"
// shouldAttemptRescue → now in executor/build-on-finish-handler.ts
import { compileChoiceSpec } from "@/lib/json-render/compile-choice-spec"
// sanitizeChoiceOutcome, paperRecoveryLeakagePattern → now in executor modules
import {
    classifyAttachmentHealth,
    resolveAttachmentRuntimeEnv,
} from "@/lib/chat/attachment-health"
import {
    executeWebSearch,
    buildRetrieverChain,
    resolveSearchExecutionMode,
    type SearchExecutionMode,
} from "@/lib/ai/web-search"
import {
    buildStoredReferenceInventoryItems,
    inferSearchResponseMode,
} from "@/lib/ai/web-search/reference-presentation"
import {
    buildDeterministicExactSourcePrepareStep,
    buildExactSourceInspectionRouterNote,
    buildExactSourceInspectionSystemMessage,
    buildSourceInventoryContext,
    buildSourceProvenanceSystemMessage,
    shouldIncludeRawSourcesContextForExactFollowup,
} from "@/lib/ai/exact-source-guardrails"
import { resolveExactSourceFollowup, type ExactSourceConversationMessage } from "@/lib/ai/exact-source-followup"
import { buildToolRegistry, buildStepStream, saveAssistantMessage } from "@/lib/chat-harness/executor"

export async function POST(req: Request) {
    try {
        // ════════════════════════════════════════════════════════════════
        // Entry boundary (Phase 1) — auth, parsing, billing, conversation,
        // attachments, user message persistence
        // ════════════════════════════════════════════════════════════════
        const accepted = await acceptChatRequest(req)
        if (accepted instanceof Response) return accepted

        const conversation = await resolveConversation({
            conversationId: accepted.conversationId,
            userId: accepted.userId,
            firstUserContent: accepted.firstUserContent,
            fetchQueryWithToken: accepted.fetchQueryWithToken,
            fetchMutationWithToken: accepted.fetchMutationWithToken,
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
        })
        if (msgResult instanceof Response) return msgResult

        // Aliases for downstream code — Phase 3+ will remove these when
        // context assembly and executor are extracted.
        const messages = accepted.messages
        const currentConversationId = conversation.conversationId
        const userId = accepted.userId
        const convexToken = accepted.convexToken
        const fetchQueryWithToken = accepted.fetchQueryWithToken
        const fetchMutationWithToken = accepted.fetchMutationWithToken
        const requestId = accepted.requestId
        const billingContext = accepted.billingContext
        const firstUserContent = accepted.firstUserContent
        const effectiveFileIds = attachments.effectiveFileIds
        const attachmentResolution = attachments.attachmentResolution
        const requestedAttachmentModeNormalized = attachments.attachmentMode
        const hasAttachmentSignal = attachments.hasAttachmentSignal
        const attachmentAwarenessInstruction = attachments.attachmentAwarenessInstruction
        const choiceInteractionEvent = accepted.choiceInteractionEvent
        const maybeUpdateTitleFromAI = conversation.maybeUpdateTitleFromAI
        const requestStartedAt = accepted.requestStartedAt
        const requestFileIdsLength = Array.isArray(accepted.requestFileIds) ? accepted.requestFileIds.length : 0
        const replaceAttachmentContext = accepted.replaceAttachmentContext
        const clearAttachmentContext = accepted.clearAttachmentContext
        const convexOptions = { token: convexToken }

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

        // buildLeakageSnippet extracted to executor/build-step-stream.ts

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
        })
        if (choiceResult instanceof Response) return choiceResult
        const { resolvedWorkflow, choiceContextNote } = choiceResult

        // Update billing context with paper session info (must happen after paperSession fetch)
        if (paperSession) {
            billingContext.operationType = "paper_generation"
        }

        // Run lane assembly (provisional run identity for Phase 6+ persistence)
        const lane = resolveRunLane({
            requestId,
            conversationId: currentConversationId,
            isNewConversation: conversation.isNewConversation,
        })

        // Unified search skill instance
        const skill = getSearchSkill()

        function buildSkillContext(overrides?: Partial<SkillContext>): SkillContext {
            return {
                isPaperMode: !!paperModePrompt,
                currentStage: paperSession?.currentStage ?? null,
                hasRecentSources: false,
                availableSources: [],
                ...overrides,
            }
        }

        // Flow Detection: Auto-detect paper intent and inject reminder if no session
        const lastUserMessage = messages[messages.length - 1]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastUserContent = lastUserMessage?.role === "user"
            ? ((lastUserMessage as any).content ||
                lastUserMessage.parts?.find((p): p is { type: "text"; text: string } => p.type === "text")?.text ||
                "")
            : ""
        const normalizedLastUserContent =
            typeof lastUserContent === "string" ? lastUserContent.trim() : ""

        // Completed session guard moved post-router — see after search decision block

        const recentConversationMessagesForExactSource: ExactSourceConversationMessage[] = messages
            .slice(0, -1)
            .map((message: {
                role?: string
                content?: string
                parts?: Array<{ type?: string; text?: string }>
            }) => {
                const extractedContent = message?.parts?.find((part) => part.type === "text")?.text

                if ((message?.role !== "user" && message?.role !== "assistant") || !extractedContent?.trim()) {
                    return null
                }

                return {
                    role: message.role,
                    content: extractedContent.trim(),
                }
            })
            .filter(
                (
                    message: ExactSourceConversationMessage | null
                ): message is ExactSourceConversationMessage => message !== null
            )

        // attachmentAwarenessInstruction is now computed inside resolveAttachments (Phase 1)
        const isFirstTurnWithAttachment = effectiveFileIds.length > 0 && messages.filter((m: { role?: string }) => m?.role === "user").length <= 1
        const getStageSearchPolicy = (stage: PaperStageId | "completed" | undefined | null) => {
            if (!stage || stage === "completed") return "none"
            if (ACTIVE_SEARCH_STAGES.includes(stage)) return "active"
            if (PASSIVE_SEARCH_STAGES.includes(stage)) return "passive"
            return "none"
        }

        // ════════════════════════════════════════════════════════════════
        // Phase 2 Task 2.3.1: File Context Limits (Paper Mode Only)
        // ════════════════════════════════════════════════════════════════
        // Phase 2 Task 2.3.1 updated 2026-04-10: Raised limits for Gemini 2.5 Flash 1M context.
        // Previous values (6000/20000) were legacy from 8K-32K context era.
        // New values target full academic paper support: 80K chars (~20K tokens) per file,
        // 240K chars (~60K tokens) total = 7.5% of 800K token budget threshold.
        // Files exceeding per-file limit receive a truncation marker directing the model
        // to use quoteFromSource or searchAcrossSources tools for deeper content.
        const MAX_FILE_CONTEXT_CHARS_PER_FILE = 80000
        const MAX_FILE_CONTEXT_CHARS_TOTAL = 240000

        // Task 6.1-6.4: Fetch file records dan inject context
        let fileContext = ""
        let docFileCount = 0
        let imageFileCount = 0
        let docExtractionSuccessCount = 0
        let docExtractionPendingCount = 0
        let docExtractionFailedCount = 0
        let docContextChars = 0
        const omittedFileNames: string[] = []  // 2026-04-10: track files omitted due to budget cap
        if (effectiveFileIds.length > 0) {
            let files = await fetchQueryWithToken(api.files.getFilesByIds, {
                userId: userId as Id<"users">,
                fileIds: effectiveFileIds,
            })

            // Wait for pending extractions (max 8 seconds, poll every 500ms)
            const hasPending = files.some(
                (f: { extractionStatus?: string }) => !f.extractionStatus || f.extractionStatus === "pending"
            )
            if (hasPending) {
                for (let attempt = 0; attempt < 16; attempt++) {
                    await retryDelay(500)
                    files = await fetchQueryWithToken(api.files.getFilesByIds, {
                        userId: userId as Id<"users">,
                        fileIds: effectiveFileIds,
                    })
                    const stillPending = files.some(
                        (f: { extractionStatus?: string }) => !f.extractionStatus || f.extractionStatus === "pending"
                    )
                    if (!stillPending) break
                }
            }

            // Check if paper mode is active (use paperModePrompt as indicator)
            const isPaperModeForFiles = !!paperModePrompt
            let totalCharsUsed = 0

            // Format file context based on extraction status
            for (const file of files) {
                const isImageFile = file.type?.startsWith("image/")
                if (isImageFile) {
                    imageFileCount += 1
                    continue
                }

                docFileCount += 1

                // Check if we've exceeded total limit (paper mode only)
                // 2026-04-10: Changed from break to continue + omitted tracking so the model
                // knows additional files exist beyond the budget and can fetch them via tools
                if (isPaperModeForFiles && totalCharsUsed >= MAX_FILE_CONTEXT_CHARS_TOTAL) {
                    omittedFileNames.push(file.name)
                    continue
                }

                fileContext += `[File: ${file.name}]\n`

                if (!file.extractionStatus || file.extractionStatus === "pending") {
                    // Extraction didn't complete within timeout
                    docExtractionPendingCount += 1
                    fileContext += "⏳ File sedang diproses. Coba kirim ulang pesan dalam beberapa detik.\n\n"
                } else if (file.extractionStatus === "success" && file.extractedText) {
                    // Task 6.2-6.3: Extract and format text
                    // Task 2.3.1: Apply per-file limit in paper mode
                    // 2026-04-10: Added truncation marker so the model knows when content is partial
                    const originalLength = file.extractedText.length
                    let textToAdd = file.extractedText
                    let wasTruncated = false

                    if (isPaperModeForFiles && textToAdd.length > MAX_FILE_CONTEXT_CHARS_PER_FILE) {
                        textToAdd = textToAdd.slice(0, MAX_FILE_CONTEXT_CHARS_PER_FILE)
                        wasTruncated = true
                    }

                    // Check remaining total budget
                    if (isPaperModeForFiles) {
                        const remainingBudget = MAX_FILE_CONTEXT_CHARS_TOTAL - totalCharsUsed
                        if (textToAdd.length > remainingBudget) {
                            textToAdd = textToAdd.slice(0, remainingBudget)
                            wasTruncated = true
                        }
                        totalCharsUsed += textToAdd.length
                    }

                    docExtractionSuccessCount += 1
                    docContextChars += textToAdd.length
                    fileContext += textToAdd
                    if (wasTruncated) {
                        fileContext += `\n\n⚠️ File truncated at ${textToAdd.length} chars (original: ${originalLength} chars). Full content accessible via quoteFromSource or searchAcrossSources tools.\n\n`
                    } else {
                        fileContext += "\n\n"
                    }
                } else if (file.extractionStatus === "failed") {
                    // Task 6.6: Handle failed state
                    docExtractionFailedCount += 1
                    const errorMsg = file.extractionError || "Unknown error"
                    fileContext += `❌ File gagal diproses: ${errorMsg}\n\n`
                } else {
                    docExtractionFailedCount += 1
                }
            }

            // 2026-04-10: Emit omitted-files notice so the model knows additional files exist
            if (omittedFileNames.length > 0) {
                fileContext += `\n⚠️ Additional file(s) omitted from File Context due to total budget limit: ${omittedFileNames.join(", ")}. Full content accessible via quoteFromSource or searchAcrossSources tools when user asks about them.\n\n`
            }
        }
        if (hasAttachmentSignal) {
            const health = classifyAttachmentHealth({
                effectiveFileIdsLength: effectiveFileIds.length,
                docFileCount,
                imageFileCount,
                docExtractionSuccessCount,
                docExtractionPendingCount,
                docExtractionFailedCount,
                docContextChars,
            })
            const runtimeEnv = resolveAttachmentRuntimeEnv({
                vercel: process.env.VERCEL,
                nodeEnv: process.env.NODE_ENV,
            })

            void retryMutation(
                () =>
                    fetchMutationWithToken(api.attachmentTelemetry.logAttachmentTelemetry, {
                        requestId,
                        userId: userId as Id<"users">,
                        conversationId: currentConversationId as Id<"conversations">,
                        runtimeEnv,
                        requestedAttachmentMode: requestedAttachmentModeNormalized,
                        resolutionReason: attachmentResolution.reason,
                        requestFileIdsLength,
                        effectiveFileIdsLength: effectiveFileIds.length,
                        replaceAttachmentContext: replaceAttachmentContext === true,
                        clearAttachmentContext: clearAttachmentContext === true,
                        docFileCount,
                        imageFileCount,
                        docExtractionSuccessCount,
                        docExtractionPendingCount,
                        docExtractionFailedCount,
                        docContextChars,
                        // Field name kept for telemetry schema compatibility. Semantic updated 2026-04-10:
                        // previously meant "forced first-response review instruction fired",
                        // now means "first-turn attachment acknowledgment directive fired".
                        attachmentFirstResponseForced: isFirstTurnWithAttachment,
                        healthStatus: health.healthStatus,
                        failureReason: health.failureReason,
                    }),
                "attachmentTelemetry.logAttachmentTelemetry"
            ).catch((telemetryError) => {
                console.warn("[ATTACH-TELEMETRY] Failed to record attachment telemetry", telemetryError)
            })
        }
        // Convert UIMessages to model messages format
        const rawModelMessages = await convertToModelMessages(messages)

        // ════════════════════════════════════════════════════════════════
        // Sanitize messages untuk menghindari ZodError dari OpenRouter
        // Tool call messages dari history bisa punya format yang tidak kompatibel
        // ════════════════════════════════════════════════════════════════
        const modelMessages = rawModelMessages
            .map((msg) => {
                // Skip messages dengan role yang tidak valid
                const validRoles = ["user", "assistant", "system"]
                if (!validRoles.includes(msg.role)) {
                    return null
                }

                // Handle content array - preserve text AND file parts
                if (Array.isArray(msg.content)) {
                    // Keep text and file parts (images via native multimodal)
                    const meaningfulParts = msg.content.filter(
                        (part) =>
                            typeof part === "object" &&
                            part !== null &&
                            "type" in part &&
                            (part.type === "text" || part.type === "file")
                    )

                    if (meaningfulParts.length === 0) {
                        return null
                    }

                    // If only text parts, join as string (backward compat)
                    const hasFileParts = meaningfulParts.some((p) => p.type === "file")
                    if (!hasFileParts) {
                        const textContent = meaningfulParts
                            .filter((p): p is { type: "text"; text: string } => p.type === "text" && "text" in p && typeof p.text === "string")
                            .map((p) => p.text)
                            .join("\n")
                        return { ...msg, content: textContent }
                    }

                    // Mixed content (text + file) — keep as array for multimodal
                    return { ...msg, content: meaningfulParts }
                }

                return msg
            })
            .filter((msg): msg is NonNullable<typeof msg> => msg !== null) as ModelMessage[]
            // Type assertion diperlukan karena:
            // 1. Tool messages (role: "tool") sudah di-filter out di atas
            // 2. Content sudah diconvert ke string untuk semua messages
            // 3. TypeScript tidak bisa infer ini dari runtime checks

        // ════════════════════════════════════════════════════════════════
        // Phase 2 Task 2.1.1: Message Trimming (Paper Mode Only)
        // Legacy: Superseded by context compaction chain (P1-P4).
        // TODO: Remove after compaction chain is validated in production.
        // ════════════════════════════════════════════════════════════════
        const MAX_CHAT_HISTORY_PAIRS = 20 // 20 pairs = 40 messages max
        const isPaperMode = !!paperModePrompt
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

        let trimmedModelMessages = modelMessages
        if (isPaperMode && modelMessages.length > MAX_CHAT_HISTORY_PAIRS * 2) {
            trimmedModelMessages = modelMessages.slice(-MAX_CHAT_HISTORY_PAIRS * 2)
        }

        // ════════════════════════════════════════════════════════════════
        // Artifact Sources Context: Fetch recent web search sources from database
        // This enables AI to pass sources to createArtifact tool
        // ════════════════════════════════════════════════════════════════
        let sourcesContext = ""
        let sourceInventoryContext = ""
        let hasRecentSourcesInDb = false
        let recentSourcesList: Array<{ url: string; title: string; publishedAt?: number }> = []
        let availableExactSources: Array<{
            sourceId: string
            originalUrl: string
            resolvedUrl: string
            title?: string
            siteName?: string
            author?: string
            publishedAt?: string
            documentKind?: "html" | "pdf" | "unknown"
        }> = []
        try {
            const recentSources = await fetchQueryWithToken(api.messages.getRecentSources, {
                conversationId: currentConversationId as Id<"conversations">,
                limit: 5,
            })

            if (recentSources && recentSources.length > 0) {
                hasRecentSourcesInDb = true
                recentSourcesList = recentSources
                const sourcesJson = JSON.stringify(recentSources, null, 2)
                sourcesContext = `AVAILABLE_WEB_SOURCES (dari hasil web search sebelumnya):
${sourcesJson}`
            }
        } catch (sourcesError) {
            console.error("[route] Failed to fetch recent sources:", sourcesError)
            // Non-blocking - continue without sources context
        }

        try {
            const exactSources = await fetchQueryWithToken(
                api.sourceDocuments.listSourceSummariesByConversation,
                {
                    conversationId: currentConversationId as Id<"conversations">,
                }
            )

            if (Array.isArray(exactSources) && exactSources.length > 0) {
                availableExactSources = exactSources
            }
        } catch (exactSourcesError) {
            console.error("[route] Failed to fetch exact source summaries:", exactSourcesError)
        }
        const classifierModel = await (await import("@/lib/ai/streaming")).getGatewayModel()
        const exactSourceResolution = await resolveExactSourceFollowup({
            lastUserMessage: normalizedLastUserContent,
            recentMessages: recentConversationMessagesForExactSource,
            availableExactSources,
            model: classifierModel,
        })
        console.log(`[EXACT-SOURCE-RESOLUTION] mode=${exactSourceResolution.mode} reason=${exactSourceResolution.reason}${exactSourceResolution.mode === "force-inspect" ? ` matchedSourceId=${exactSourceResolution.matchedSource.sourceId.slice(0, 60)}` : ""}`)
        const shouldIncludeRawSourcesContext =
            shouldIncludeRawSourcesContextForExactFollowup(exactSourceResolution)
        const shouldIncludeExactInspectionSystemMessage =
            exactSourceResolution.mode !== "clarify"
        const shouldIncludeRecentSourceSkillInstructions =
            hasRecentSourcesInDb && shouldIncludeRawSourcesContext
        sourceInventoryContext = buildSourceInventoryContext({
            recentSources: recentSourcesList,
            exactSources: availableExactSources,
        })

        // Task 6.4: Inject file context BEFORE user messages
        // Task Group 3: Inject paper mode prompt if paper session exists
        // Flow Detection: Inject paper workflow reminder if intent detected but no session
        const fullMessagesBase = [
            { role: "system" as const, content: systemPrompt },
            ...(paperModePrompt
                ? [{ role: "system" as const, content: paperModePrompt }]
                : []),
            ...(fileContext
                ? [{ role: "system" as const, content: `File Context:\n\n${fileContext}` }]
                : []),
            ...(attachmentAwarenessInstruction
                ? [{ role: "system" as const, content: attachmentAwarenessInstruction }]
                : []),
            ...(sourcesContext && shouldIncludeRawSourcesContext
                ? [{ role: "system" as const, content: sourcesContext }]
                : []),
            ...(sourceInventoryContext
                ? [{ role: "system" as const, content: sourceInventoryContext }]
                : []),
            ...(shouldIncludeExactInspectionSystemMessage
                ? [buildExactSourceInspectionSystemMessage()]
                : []),
            buildSourceProvenanceSystemMessage(),
            ...(() => {
                if (!shouldIncludeRecentSourceSkillInstructions) return []
                const instr = composeSkillInstructions(buildSkillContext({
                    hasRecentSources: true,
                    availableSources: recentSourcesList,
                }))
                return instr ? [{ role: "system" as const, content: instr }] : []
            })(),
            ...(choiceContextNote
                ? [{ role: "system" as const, content: choiceContextNote }]
                : freeTextContextNote
                    ? [{ role: "system" as const, content: freeTextContextNote }]
                    : []),
            ...(isDraftingStage
                ? [{ role: "system" as const, content: CHOICE_YAML_SYSTEM_PROMPT }]
                : []),
            // Hard enforcement note for review/finalization workflow stages
            ...(() => {
                if (!paperStageScope || !paperSession) return []
                const stage = paperStageScope
                const status = paperSession.stageStatus as string
                const isReviewFinalization = [
                    "hasil", "diskusi", "kesimpulan", "pembaruan_abstrak",
                    "daftar_pustaka", "lampiran", "judul"
                ].includes(stage)

                if (!isReviewFinalization) return []

                const lines: string[] = [
                    "WORKFLOW RESPONSE DISCIPLINE (MANDATORY):",
                    "- Do NOT narrate internal tool failures, retries, repair attempts, or technical diagnostics to the user.",
                    "- Do NOT say 'mohon tunggu', 'ada kesalahan teknis', 'saya akan coba lagi', 'memperbaiki format', or similar.",
                    "- If a tool fails but you recover in the same turn, present ONLY the successful outcome.",
                    "- Only expose errors to the user when the turn cannot complete and user action is required.",
                    "- Keep final response to 1-3 sentences maximum for workflow turns.",
                ]

                // Deterministic daftar_pustaka revision chain
                if (stage === "daftar_pustaka" && status === "revision") {
                    lines.push(
                        "DAFTAR PUSTAKA REVISION — EXACT CHAIN:",
                        "1. compileDaftarPustaka({ mode: 'persist' })",
                        "2. updateArtifact (system will auto-resolve artifact ID — supply any ID)",
                        "3. submitStageForValidation()",
                        "Do NOT deviate. Do NOT call createArtifact. Do NOT call compileDaftarPustaka({ mode: 'preview' }) in this turn.",
                    )
                }

                return [{ role: "system" as const, content: lines.join("\n") }]
            })(),
            // Completed-state dynamic note: always injected for completed sessions.
            // If pre-stream guard short-circuits (workflow confusion), this note is unused.
            // If model runs (informational/revision), this overrides closing-only constraints.
            ...(() => {
                if (paperSession?.currentStage !== "completed") return []
                return [{ role: "system" as const, content:
                    "COMPLETED SESSION — FOLLOW-UP OVERRIDE:\n" +
                    "The paper is completed. If the user asks a follow-up question, answer it.\n" +
                    "Artifact re-display requests are handled by the system before reaching you.\n" +
                    "For informational or revision follow-up questions that do reach you, answer concisely. You may use readArtifact only when you need to inspect artifact content for answering a question.\n" +
                    "You MAY answer questions about artifacts, sidebar, progress, export.\n" +
                    "You MAY help with revision if the user explicitly asks to revise a stage.\n" +
                    "Keep answers concise. Do NOT output choice cards. Do NOT pretend the session is still in progress.\n" +
                    "If the user's message is just a generic acknowledgment (oke, lanjut, setuju), use the default closing response from the completed stage instructions."
                }]
            })(),
            ...trimmedModelMessages,
        ]

        // Import streamText and model helpers
        const {
            getGatewayModel,
            getOpenRouterModel,
            getProviderSettings,
            getReasoningSettings,
            buildReasoningProviderOptions,
            getModelNames,
            getWebSearchConfig,
        } = await import("@/lib/ai/streaming")
        const { streamText } = await import("ai")
        const providerSettings = await getProviderSettings()
        const reasoningSettings = await getReasoningSettings()
        const modelNames = await getModelNames()
        const webSearchConfig = await getWebSearchConfig()
        const samplingOptions = {
            temperature: providerSettings.temperature,
            ...(providerSettings.topP !== undefined ? { topP: providerSettings.topP } : {}),
            ...(providerSettings.maxTokens !== undefined ? { maxTokens: providerSettings.maxTokens } : {}),
        }

        // ════════════════════════════════════════════════════════════════
        // W2: Context Budget Monitor — estimate token usage and prune if needed
        // ════════════════════════════════════════════════════════════════
        const estimateModelMessageChars = (msgs: Array<{ role: string; content: string | unknown }>): number => {
            return msgs.reduce((total, msg) => {
                if (typeof msg.content === "string") {
                    return total + msg.content.length
                }
                return total
            }, 0)
        }

        const contextWindow = getContextWindow(modelNames.primaryContextWindow)
        const totalChars = estimateModelMessageChars(fullMessagesBase)
        const budget = checkContextBudget(totalChars, contextWindow)

        const usagePercent = Math.round((budget.totalTokens / budget.threshold) * 100)
        console.info(
            `[Context Budget] ${budget.totalTokens.toLocaleString()} tokens estimated (${usagePercent}% of ${budget.threshold.toLocaleString()} threshold) | ${fullMessagesBase.length} messages | model: ${modelNames.primary.model}, window: ${contextWindow.toLocaleString()}`
        )

        // ════════════════════════════════════════════════════════════════
        // Context Compaction Layer — threshold-based priority chain
        // Runs BEFORE brute prune. Brute prune remains as safety net.
        // ════════════════════════════════════════════════════════════════
        let effectiveBudget = budget
        if (budget.shouldCompact) {
            const compactionResult = await runCompactionChain(
                fullMessagesBase as CompactableMessage[],
                {
                    contextWindow,
                    compactionThreshold: budget.compactionThreshold,
                    isPaperMode,
                    paperSession: paperSession ? {
                        currentStage: (paperSession as { currentStage: string }).currentStage,
                        stageMessageBoundaries: (paperSession as { stageMessageBoundaries?: { stage: string; firstMessageId: string; lastMessageId: string; messageCount: number }[] }).stageMessageBoundaries,
                        paperMemoryDigest: (paperSession as { paperMemoryDigest?: { stage: string; decision: string; timestamp: number; superseded?: boolean }[] }).paperMemoryDigest,
                    } : null,
                    getModel: async () => getGatewayModel(),
                },
                (msg) => (msg as { id?: string }).id || undefined,
            )

            fullMessagesBase.length = 0
            fullMessagesBase.push(...compactionResult.messages as typeof fullMessagesBase[number][])

            // Re-estimate after compaction — use post-compaction budget for prune decision
            const postCompactionChars = estimateModelMessageChars(fullMessagesBase)
            effectiveBudget = checkContextBudget(postCompactionChars, contextWindow)
            console.info(
                `[Context Compaction] Post-compaction: ${effectiveBudget.totalTokens.toLocaleString()} tokens (${Math.round((effectiveBudget.totalTokens / effectiveBudget.compactionThreshold) * 100)}% of compaction threshold) | resolved at ${compactionResult.resolvedAtPriority}`
            )
        }

        if (effectiveBudget.shouldPrune) {
            console.warn(
                `[Context Budget] Pruning: ${effectiveBudget.totalTokens} tokens > ${effectiveBudget.threshold} threshold. Messages: ${fullMessagesBase.length}`
            )
            // Keep system messages at the front, prune only conversation messages
            const systemMessages = fullMessagesBase.filter(m => m.role === "system")
            const conversationMessages = fullMessagesBase.filter(m => m.role !== "system")
            const keepLastN = 50
            const prunedConversation = conversationMessages.length > keepLastN
                ? conversationMessages.slice(-keepLastN)
                : conversationMessages
            fullMessagesBase.length = 0
            fullMessagesBase.push(...systemMessages, ...prunedConversation)
        }

        if (effectiveBudget.shouldWarn && !effectiveBudget.shouldPrune) {
            console.info(
                `[Context Budget] Warning: ${effectiveBudget.totalTokens} tokens approaching threshold ${effectiveBudget.threshold}.`
            )
        }

        const getSearchEvidenceFromStageData = (session: {
            currentStage?: string
            stageData?: Record<string, unknown>
        } | null): boolean | null => {
            if (!session || !session.stageData || !session.currentStage) {
                return null
            }

            const stageData = session.stageData as Record<string, unknown>
            switch (session.currentStage) {
                case "gagasan": {
                    const data = stageData.gagasan as { referensiAwal?: unknown[] } | undefined
                    const minCount = STAGE_RESEARCH_REQUIREMENTS.gagasan?.minCount ?? 1
                    return Array.isArray(data?.referensiAwal) && data.referensiAwal.length >= minCount
                }
                case "tinjauan_literatur": {
                    const data = stageData.tinjauan_literatur as { referensi?: unknown[] } | undefined
                    const minCount = STAGE_RESEARCH_REQUIREMENTS.tinjauan_literatur?.minCount ?? 1
                    return Array.isArray(data?.referensi) && data.referensi.length >= minCount
                }
                case "daftar_pustaka": {
                    const data = stageData.daftar_pustaka as { entries?: unknown[] } | undefined
                    const minCount = STAGE_RESEARCH_REQUIREMENTS.daftar_pustaka?.minCount ?? 1
                    return Array.isArray(data?.entries) && data.entries.length >= minCount
                }
                default:
                    return null
            }
        }

        const hasStageArtifact = (session: {
            currentStage?: string
            stageData?: Record<string, unknown>
        } | null): boolean => {
            if (!session?.stageData || !session.currentStage) return false
            if (session.currentStage === "completed") return false
            const data = session.stageData[session.currentStage] as Record<string, unknown> | undefined
            return !!data?.artifactId
        }

        const buildForcedSyncStatusMessage = (session: {
            currentStage?: string
            stageStatus?: string
            isDirty?: boolean
        } | null): string => {
            const stageCode = session?.currentStage
            const stageLabel = stageCode && stageCode !== "completed"
                ? `${getStageLabel(stageCode as PaperStageId)} (${stageCode})`
                : stageCode === "completed"
                    ? "All stages completed"
                    : "Unknown"
            const stageStatus = session?.stageStatus ?? "unknown"
            const dirty = session?.isDirty === true

            const lines = [
                "Session status synced successfully.",
                "",
                `- Active stage: ${stageLabel}`,
                `- Stage status: ${stageStatus}`,
                `- Dirty context: ${dirty ? "true" : "false"}`,
            ]

            if (stageStatus === "pending_validation" && dirty) {
                lines.push(
                    "",
                    "Data not yet synced. Request revision first so sync/draft update can proceed."
                )
            } else {
                lines.push(
                    "",
                    "Sync complete. Continue with instructions for the current active stage."
                )
            }

            return lines.join("\n")
        }

        // Helper: detect if previous turns already have search results (sources)
        // STAGE-AWARE logic:
        // 1. stageData evidence is AUTHORITATIVE (if exists, search is definitely done)
        // 2. For ACTIVE stages without stageData evidence, check RECENT messages (last 1 turn)
        //    - This catches "search done but not yet saved" scenario
        //    - Checks last 3 assistant messages for sources field or explicit search-done phrases
        // 3. For PASSIVE stages, check more messages (last 3) as fallback
        const hasPreviousSearchResults = (msgs: unknown[], session: {
            currentStage?: string
            stageData?: Record<string, unknown>
        } | null): boolean => {
            const stageEvidence = getSearchEvidenceFromStageData(session)

            // stageData has evidence → search done (authoritative)
            if (stageEvidence === true) {
                return true
            }

            // For ACTIVE stages (stageEvidence === false), check recent assistant messages.
            // This catches "search done but save tool failed" scenario without forcing repeated search loops.
            if (stageEvidence === false) {
                const recentAssistantMsgs = msgs
                    .filter((m): m is { role: string; content?: string; sources?: unknown } =>
                        typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
                    )
                    .slice(-3)

                for (const msg of recentAssistantMsgs) {
                    // Data-based signal: message has actual sources data from web search
                    const hasSources = "sources" in msg
                        && Array.isArray((msg as { sources?: unknown }).sources)
                        && ((msg as { sources: unknown[] }).sources).length > 0
                    if (hasSources) return true
                }
                return false
            }

            // PASSIVE/unknown stage (stageEvidence === null) → check more messages as fallback
            const recentAssistantMsgs = msgs
                .filter((m): m is { role: string; content?: string; sources?: unknown } =>
                    typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
                )
                .slice(-3)

            for (const msg of recentAssistantMsgs) {
                // Data-based signal: message has actual sources data from web search
                const hasSources = "sources" in msg
                    && Array.isArray((msg as { sources?: unknown }).sources)
                    && ((msg as { sources: unknown[] }).sources).length > 0
                if (hasSources) return true
            }
            return false
        }

        const decideWebSearchMode = async (options: {
            model: unknown
            recentMessages: unknown[]
            isPaperMode: boolean
            currentStage: PaperStageId | "completed" | undefined | null
            stagePolicy: "active" | "passive" | "none"
            previousSearchDone: boolean
            previousSearchSourceCount?: number
            researchStatus?: { incomplete: boolean; requirement?: string }
            ragChunksAvailable?: boolean
        }): Promise<{ enableWebSearch: boolean; confidence: number; reason: string; intentType: string }> => {
            const paperModeContext = options.isPaperMode
                ? `

IMPORTANT CONTEXT - PAPER MODE ACTIVE:
Current stage: ${options.currentStage ?? "unknown"}
Stage policy: ${options.stagePolicy.toUpperCase()}
Research status: ${options.researchStatus?.incomplete
    ? `INCOMPLETE — ${options.researchStatus.requirement}`
    : "complete (sufficient references exist)"}
Previous search: ${options.previousSearchDone
    ? `done (${options.previousSearchSourceCount ?? "unknown"} sources found)`
    : "not done yet"}

Stage policy rules (MUST follow):
- ACTIVE policy: enable search if the conversation needs factual data, references, or the user/AI
  expressed intent to search. Even if the user sends a short confirmation like "ya" or "ok",
  consider what the AI previously proposed — if AI asked "shall I search?", the confirmation
  means YES to search.
- PASSIVE policy: enable search ONLY if the user EXPLICITLY requests it (e.g., "cari referensi",
  "search for..."). Do NOT enable for general discussion.
- If previous search is done AND research is complete, prefer enableWebSearch=false
  UNLESS the user explicitly asks for MORE references/data.
- If research is INCOMPLETE and no search has been done, strongly prefer enableWebSearch=true.
${options.ragChunksAvailable ? `
RAG SOURCE CHUNKS AVAILABLE:
Stored source content from previous searches is available for follow-up inspection without a new web search.
${buildExactSourceInspectionRouterNote(options.ragChunksAvailable).trimStart()}` : ""}`
                : ""

            const routerPrompt = `You are a "router" that decides whether the response to the user MUST use web search.

Purpose:
- enableWebSearch = true if:
  (A) user requests internet/search/references, OR
  (B) AI will include references/literature/sources in its response, OR
  (C) AI needs FACTUAL DATA (statistics, numbers, facts, names, dates, events) that risks being wrong if hallucinated.
- IMPORTANT: To PREVENT HALLUCINATION, always enableWebSearch = true if the response requires specific factual data.
- Set false ONLY if: user requests save/approve of existing data, OR the response is purely opinion/discussion without factual claims.
${paperModeContext}

INTENT CLASSIFICATION — you MUST set intentType to one of these values:

1. "sync_request" — User wants to sync/check session state (e.g., "sinkronkan", "cek state",
   "status sesi", "status terbaru", "lanjut dari state"). Always set enableWebSearch=false.

2. "compile_daftar_pustaka" — User wants to compile/preview bibliography (daftar pustaka).
   Always set enableWebSearch=false.

3. "save_submit" — User wants to save, submit, or approve the current stage draft
   (e.g., "simpan", "save", "submit", "approve", "approved", "disetujui",
   "selesaikan tahap", "approve & lanjut"). Always set enableWebSearch=false.

4. "search" — User requests search/references/factual data, or AI needs factual data.
   Set enableWebSearch=true. Reason explains what data is needed.

5. "discussion" — Pure discussion, opinion, or workflow action without factual claims.
   Set enableWebSearch=false. Reason explains why no search needed.

Priority: sync_request > compile_daftar_pustaka > save_submit > search > discussion

Output rules:
- Output MUST be one JSON object ONLY.
- NO markdown, NO backticks, NO explanation outside JSON.
- confidence 0..1.

JSON schema:
{
  "enableWebSearch": boolean,
  "confidence": number,
  "reason": string,
  "intentType": "search" | "discussion" | "sync_request" | "compile_daftar_pustaka" | "save_submit"
}`

            const routerSchema = z.object({
                enableWebSearch: z.boolean(),
                confidence: z.number().min(0).max(1),
                reason: z.string().max(500),
                intentType: z.enum([
                    "search",
                    "discussion",
                    "sync_request",
                    "compile_daftar_pustaka",
                    "save_submit",
                ]),
            })

            const runStructuredRouter = async () => {
                const { output } = await generateText({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    model: options.model as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    messages: [{ role: "system", content: routerPrompt }, ...(options.recentMessages as any[])],
                    output: Output.object({ schema: routerSchema }),
                    temperature: 0.2,
                })
                return output
            }

            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    const result = await runStructuredRouter()
                    return {
                        enableWebSearch: result.enableWebSearch,
                        confidence: result.confidence,
                        reason: result.reason,
                        intentType: result.intentType,
                    }
                } catch {
                    // Retry on failure
                }
            }

            const { text } = await generateText({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                model: options.model as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                messages: [{ role: "system", content: routerPrompt }, ...(options.recentMessages as any[])],
                temperature: 0.2,
            })

            const raw = text.trim()
            const cleaned = raw
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/```$/i, "")
                .trim()

            const start = cleaned.indexOf("{")
            const end = cleaned.lastIndexOf("}")
            if (start < 0 || end < 0 || end <= start) {
                return { enableWebSearch: true, confidence: 0, reason: "router_failure_safe_default", intentType: "search" as const }
            }

            try {
                const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
                    enableWebSearch?: unknown
                    confidence?: unknown
                    reason?: unknown
                    intentType?: unknown
                }

                const enableWebSearch = parsed.enableWebSearch === true
                const confidenceRaw = typeof parsed.confidence === "number" ? parsed.confidence : 0
                const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0
                const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 240) : ""
                const intentType = typeof parsed.intentType === "string"
                    && ["search", "discussion", "sync_request", "compile_daftar_pustaka", "save_submit"].includes(parsed.intentType)
                    ? parsed.intentType as "search" | "discussion" | "sync_request" | "compile_daftar_pustaka" | "save_submit"
                    : enableWebSearch ? "search" : "discussion"

                return { enableWebSearch, confidence, reason, intentType }
            } catch {
                return { enableWebSearch: true, confidence: 0, reason: "router_failure_safe_default", intentType: "search" as const }
            }
        }

        // Reasoning trace sanitization helpers extracted to:
        // src/lib/chat-harness/executor/save-assistant-message.ts

        // Resolve current plan snapshot for message persistence.
        // Reads the latest _plan from the paper session's stageData for the active stage.
        const getCurrentPlanSnapshot = (): PlanSpec | undefined => {
            if (!paperSession?.stageData || !paperStageScope) return undefined
            const sd = paperSession.stageData as Record<string, Record<string, unknown>>
            return (sd[paperStageScope]?._plan as PlanSpec | undefined) ?? undefined
        }

        // saveAssistantMessage extracted to executor/save-assistant-message.ts
        // Standalone calls (search path, unavailable response) use the imported version.
        // The buildOnFinishHandler calls saveAssistantMessage internally for primary/fallback paths.
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
            isPaperMode: !!paperModePrompt,
        })

        // 7. Stream AI Response - Dual Provider with Fallback
        // Hoist enableWebSearch so it's accessible in catch block for fallback
        let enableWebSearch = false

        const telemetryStartTime = Date.now()
        const reasoningTraceEnabled = reasoningSettings.traceMode === "curated" || reasoningSettings.traceMode === "transparent"
        const isTransparentReasoning = reasoningSettings.traceMode === "transparent"
        const getTraceModeLabel = (isPaper: boolean, webSearch: boolean): "normal" | "paper" | "websearch" => {
            if (webSearch) return "websearch"
            if (isPaper) return "paper"
            return "normal"
        }

        // getToolNameFromChunk and createReasoningAccumulator extracted to
        // executor/build-step-stream.ts

        // Hoist for catch block accessibility (fallback provider needs these)
        let shouldForceGetCurrentPaperState = false
        let shouldForceSubmitValidation = false
        let missingArtifactNote = ""

        const createSearchUnavailableResponse = async (input: {
            reasonCode: string
            message: string
            usedModel: string
            provider?: "vercel-gateway" | "openrouter"
            telemetryFallbackReason?: string
        }) => {
            await saveAssistantMessageLocal(input.message, undefined, input.usedModel, undefined, undefined, undefined, getCurrentPlanSnapshot())
            const blockedTelemetryContext = {
                ...skillTelemetryContext,
                fallbackReason: input.telemetryFallbackReason ?? input.reasonCode,
            }

            logAiTelemetry({
                token: convexToken,
                userId: userId as Id<"users">,
                conversationId: currentConversationId as Id<"conversations">,
                provider: input.provider ?? (modelNames.primary.provider as "vercel-gateway" | "openrouter"),
                model: input.usedModel,
                isPrimaryProvider: true,
                failoverUsed: false,
                toolUsed: "web_search",
                mode: "websearch",
                success: false,
                errorType: "search_unavailable",
                errorMessage: input.message,
                latencyMs: Date.now() - telemetryStartTime,
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

        const createStoredReferenceInventoryResponse = async (input: {
            introText: string
            items: Array<{
                sourceId?: string
                title: string
                url: string | null
                verificationStatus: "verified_content" | "unverified_link" | "unavailable"
                documentKind?: "html" | "pdf" | "unknown"
            }>
            usedModel: string
        }) => {
            const normalizedSources = input.items
                .filter((item) => typeof item.url === "string" && item.url.trim().length > 0)
                .map((item) => ({
                    url: item.url as string,
                    title: item.title,
                }))

            await saveAssistantMessageLocal(
                input.introText,
                normalizedSources.length > 0 ? normalizedSources : undefined,
                input.usedModel,
                undefined, undefined, undefined,
                getCurrentPlanSnapshot(),
            )

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

        // Reactive revision chain enforcer — active during pending_validation only.
        // Does NOT detect intent (no regex). Model decides freely at step 0.
        // After model commits to revision (calls requestRevision), harness
        // enforces the full chain: updateArtifact → submitStageForValidation.
        const isRevisionActive = paperSession?.stageStatus === "pending_validation" || paperSession?.stageStatus === "revision"
        const revisionChainEnforcer = isRevisionActive
            ? ({ steps, stepNumber }: {
                steps: Array<{ toolCalls?: Array<{ toolName: string }> }>;
                stepNumber: number;
              }) => {
                // During revision status: force tool call at step 0 (model must act, not discuss)
                // During pending_validation: step 0 free (model decides whether to revise or discuss)
                if (stepNumber === 0) {
                    if (paperSession?.stageStatus === "revision") {
                        console.info(`[REVISION][chain-enforcer] step=0 status=revision → required`)
                        return { toolChoice: "required" as const }
                    }
                    return undefined
                }

                const prevToolNames = steps[stepNumber - 1]?.toolCalls?.map(tc => tc.toolName) ?? []

                if (prevToolNames.includes("requestRevision")) {
                    console.info(`[REVISION][chain-enforcer] step=${stepNumber} prev=${prevToolNames.join(",")} → required`)
                    return { toolChoice: "required" as const }
                }
                if (prevToolNames.includes("updateStageData")) {
                    console.info(`[REVISION][chain-enforcer] step=${stepNumber} prev=${prevToolNames.join(",")} → required`)
                    return { toolChoice: "required" as const }
                }
                if (prevToolNames.includes("updateArtifact") || prevToolNames.includes("createArtifact")) {
                    // Only force submit if artifact tool actually succeeded
                    if (paperToolTracker?.sawUpdateArtifactSuccess || paperToolTracker?.sawCreateArtifactSuccess) {
                        console.info(`[REVISION][chain-enforcer] step=${stepNumber} prev=${prevToolNames.join(",")} → submitStageForValidation`)
                        return { toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const }
                    }
                    // Artifact tool was called but failed — let model retry freely
                    console.info(`[REVISION][chain-enforcer] step=${stepNumber} prev=${prevToolNames.join(",")} → artifact failed, allowing retry`)
                    return { toolChoice: "required" as const }
                }

                return undefined
              }
            : undefined

        const isCompileThenFinalize = resolvedWorkflow?.action === "compile_then_finalize"

        // Artifact-enforcer only activates on finalize/compile/special actions.
        // continue_discussion = model keeps discussing, no forced artifact chain.
        const shouldEnforceArtifactChain =
            resolvedWorkflow?.action !== "continue_discussion"

        // Plan completion gate: if plan exists with incomplete tasks,
        // don't enforce artifact chain on finalize — let model continue discussion.
        const currentPlan = (paperSession?.stageData as Record<string, Record<string, unknown>> | undefined)
            ?.[paperStageScope ?? ""]?._plan as PlanSpec | undefined
        const planHasIncompleteTasks = currentPlan?.tasks?.some(
            (t: { status: string }) => t.status !== "complete"
        ) ?? false

        if (shouldEnforceArtifactChain && planHasIncompleteTasks && resolvedWorkflow?.action === "finalize_stage") {
            console.info(`[PLAN-GATE] enforcer downgraded: plan has incomplete tasks (${currentPlan?.tasks.filter((t: { status: string }) => t.status === "complete").length}/${currentPlan?.tasks.length} complete)`)
        }

        const draftingChoiceArtifactEnforcer =
            choiceInteractionEvent && paperStageScope && paperSession?.stageStatus === "drafting"
            && shouldEnforceArtifactChain && !(planHasIncompleteTasks && resolvedWorkflow?.action === "finalize_stage")
                ? ({ steps, stepNumber }: {
                    steps: Array<{ toolCalls?: Array<{ toolName: string }> }>;
                    stepNumber: number;
                  }) => {
                    // Use completed steps array for state — NOT paperToolTracker which
                    // updates during tool execution (after prepareStep already ran).
                    const allPrevToolNames = steps.flatMap(s => s.toolCalls?.map(tc => tc.toolName) ?? [])
                    const sawCompile = allPrevToolNames.includes("compileDaftarPustaka")
                    const sawUpdateStageData = allPrevToolNames.includes("updateStageData")
                    const sawCreateArtifact = allPrevToolNames.includes("createArtifact")
                    const sawUpdateArtifact = allPrevToolNames.includes("updateArtifact")
                    const sawSubmit = allPrevToolNames.includes("submitStageForValidation")
                    const sawArtifact = sawCreateArtifact || sawUpdateArtifact

                    // compile_then_finalize: compileDaftarPustaka(persist) first
                    if (isCompileThenFinalize && !sawCompile) {
                        console.info(`[CHOICE][artifact-enforcer] step=${stepNumber} stage=${paperStageScope} → compileDaftarPustaka (compile_then_finalize)`)
                        return { toolChoice: { type: "tool", toolName: "compileDaftarPustaka" } as const }
                    }

                    // Chain: updateStageData → createArtifact → submitStageForValidation
                    if (!sawUpdateStageData && !sawArtifact) {
                        console.info(`[CHOICE][artifact-enforcer] step=${stepNumber} stage=${paperStageScope} → updateStageData (chain start)`)
                        return { toolChoice: { type: "tool", toolName: "updateStageData" } as const }
                    }

                    if (sawUpdateStageData && !sawArtifact) {
                        console.info(`[CHOICE][artifact-enforcer] step=${stepNumber} stage=${paperStageScope} → createArtifact`)
                        return { toolChoice: { type: "tool", toolName: "createArtifact" } as const }
                    }

                    if (sawArtifact && !sawSubmit) {
                        console.info(`[CHOICE][artifact-enforcer] step=${stepNumber} stage=${paperStageScope} → submitStageForValidation`)
                        return { toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const }
                    }

                    return undefined
                  }
                : undefined

        // Universal reactive enforcer: when model voluntarily starts tool chain
        // (from ANY turn — choice card or free-text), force chain completion.
        // Step 0 is free — model decides whether to discuss or finalize.
        // After model calls updateStageData, chain is forced: createArtifact → submit.
        // This closes the gap where continue_discussion + updateStageData left chain incomplete.
        let enforcerStepStartTime = Date.now()
        const universalReactiveEnforcer =
            paperStageScope && paperSession?.stageStatus === "drafting"
                ? ({ steps, stepNumber }: {
                    steps: Array<{ toolCalls?: Array<{ toolName: string }> }>;
                    stepNumber: number;
                  }) => {
                    // Log elapsed time for previous step (step N prepareStep tells us step N-1 duration)
                    if (stepNumber > 0) {
                        const prevStepTools = steps[stepNumber - 1]?.toolCalls?.map(tc => tc.toolName).join(",") ?? "text"
                        const elapsed = Date.now() - enforcerStepStartTime
                        console.info(`[STEP-TIMING] step=${stepNumber - 1} stage=${paperStageScope} tools=[${prevStepTools}] elapsed=${elapsed}ms`)
                    }
                    enforcerStepStartTime = Date.now()

                    if (stepNumber === 0) return undefined

                    const allPrevToolNames = steps.flatMap(s => s.toolCalls?.map(tc => tc.toolName) ?? [])
                    const sawUpdateStageData = allPrevToolNames.includes("updateStageData")

                    // Only activate after model voluntarily called updateStageData
                    if (!sawUpdateStageData) return undefined

                    const sawCreateArtifact = allPrevToolNames.includes("createArtifact")
                    const sawUpdateArtifact = allPrevToolNames.includes("updateArtifact")
                    const sawSubmit = allPrevToolNames.includes("submitStageForValidation")
                    const sawArtifact = sawCreateArtifact || sawUpdateArtifact

                    if (!sawArtifact) {
                        console.info(`[REACTIVE-ENFORCER] step=${stepNumber} stage=${paperStageScope} → createArtifact`)
                        return { toolChoice: { type: "tool", toolName: "createArtifact" } as const }
                    }

                    if (!sawSubmit) {
                        console.info(`[REACTIVE-ENFORCER] step=${stepNumber} stage=${paperStageScope} → submitStageForValidation`)
                        return { toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const }
                    }

                    return undefined
                  }
                : undefined

        try {
            const model = await getGatewayModel()

            // Router: tentukan apakah request ini perlu mode websearch.
            // Web search uses separate models (Perplexity/Grok/Google Grounding Gemini) — no tool mixing constraint.
            const recentForRouter = modelMessages.slice(-8)
            const currentStage = paperSession?.currentStage as PaperStageId | "completed" | undefined
            const stagePolicy = getStageSearchPolicy(currentStage)
            console.log("[F1-F6-TEST] SearchPolicy", { stage: currentStage, policy: stagePolicy })
            const searchAlreadyDone = hasPreviousSearchResults(modelMessages, paperSession)
                || (!paperSession && hasRecentSourcesInDb)
            if (choiceInteractionEvent) {
                console.info("[PAPER][post-choice-search-context]", {
                    stage: choiceInteractionEvent.stage,
                    searchAlreadyDone,
                    recentSourcesCount: recentSourcesList.length,
                    hasRecentSourcesInDb,
                    ragChunksAvailable: null,
                })
            }
            // Check if RAG chunks are available for this conversation.
            // When chunks exist, the normal chat path (with RAG tools) can answer
            // follow-up questions about cited sources without a new web search.
            let ragChunksAvailable = false
            try {
                ragChunksAvailable = await fetchQuery(
                    api.sourceChunks.hasChunks,
                    { conversationId: currentConversationId as Id<"conversations"> },
                    convexOptions,
                )
            } catch {
                // Non-critical — if check fails, don't block the flow
            }
            if (choiceInteractionEvent) {
                console.info("[PAPER][post-choice-search-context-rag]", {
                    stage: choiceInteractionEvent.stage,
                    searchAlreadyDone,
                    recentSourcesCount: recentSourcesList.length,
                    hasRecentSourcesInDb,
                    ragChunksAvailable,
                })
            }
            // ════════════════════════════════════════════════════════════════
            // Search Mode Decision — Unified LLM Router
            // Pre-router guardrails (structural/data) → LLM router → post-decision notes
            // ════════════════════════════════════════════════════════════════
            let activeStageSearchReason = ""
            let activeStageSearchNote = ""
            let searchRequestedByPolicy = false
            let isSyncRequest = false
            let isSaveSubmitIntent = false
            let isCompileBibliographyIntent = false
            let routerIntentType: string | undefined

            // --- Pre-router guardrails (structural state only, NO regex intent detection) ---
            // Intent detection is the LLM router's job. Regex cannot scale to language
            // variation (Indonesian, Javanese, English, slang, etc.) and will miss edge
            // cases that cause users to lose search functionality silently.

            // --- Harness plan guard: gagasan first turn = NO SEARCH ---
            // On first prompt in gagasan stage (no plan, no stageData), model should
            // discuss the idea first, emit plan, and offer search via choice card.
            // This eliminates ~30s blank screen from auto-search.
            const isGagasanFirstTurn = currentStage === "gagasan"
                && !choiceInteractionEvent
                && !searchAlreadyDone
                && !(paperSession?.stageData as Record<string, Record<string, unknown>> | undefined)?.gagasan?._plan

            if (isGagasanFirstTurn) {
                searchRequestedByPolicy = false
                activeStageSearchReason = "gagasan_first_turn_discuss_first"
                activeStageSearchNote = "First turn: model discusses idea and offers search via choice card"
                console.info(`[SearchDecision] Gagasan first turn: blocking auto-search — model discusses first, offers search via choice card`)
            } else if (exactSourceResolution.mode === "force-inspect") {
                // Exact source follow-up already matched a unique stored source.
                // Block search — the model should use inspectSourceDocument instead.
                // Without this guard, the LLM search router can override force-inspect
                // and trigger a new web search for a URL that's already stored.
                searchRequestedByPolicy = false
                activeStageSearchReason = "exact_source_force_inspect"
                console.log(`[SearchDecision] Exact source force-inspect: blocking search, matched sourceId=${exactSourceResolution.matchedSource.sourceId.slice(0, 60)}`)
            } else {
                // --- Unified LLM router for ALL stages (ACTIVE + PASSIVE + chat) ---
                const { incomplete, requirement } = paperSession
                    ? isStageResearchIncomplete(
                        paperSession.stageData as Record<string, unknown> | undefined,
                        currentStage as PaperStageId
                      )
                    : { incomplete: false, requirement: undefined }

                const routerStart = Date.now()
                const webSearchDecision = await decideWebSearchMode({
                    model,
                    recentMessages: recentForRouter,
                    isPaperMode: !!paperModePrompt,
                    currentStage,
                    stagePolicy,
                    previousSearchDone: searchAlreadyDone,
                    previousSearchSourceCount: undefined,
                    ragChunksAvailable,
                    researchStatus: { incomplete, requirement },
                })
                console.log(`[⏱ LATENCY] searchRouter=${Date.now() - routerStart}ms decision=${webSearchDecision.enableWebSearch ? "SEARCH" : "NO-SEARCH"} intent=${webSearchDecision.intentType} confidence=${webSearchDecision.confidence}`)

                // Capture router intent for downstream sync/compile detection
                routerIntentType = webSearchDecision.intentType

                // Trust the router decision. Router prompt handles stage policy rules.
                // PASSIVE stages: router prompt says "ONLY if user EXPLICITLY requests."
                // Router failure: safe default (enableWebSearch=true) — search is never harmful.
                searchRequestedByPolicy = !paperModePrompt
                    ? webSearchDecision.enableWebSearch
                    : stagePolicy === "none"
                        ? false  // completed paper, no search
                        : webSearchDecision.enableWebSearch

                activeStageSearchReason = webSearchDecision.reason

                // Post-decision: inject appropriate system note
                if (!searchRequestedByPolicy && !!paperModePrompt) {
                    if (incomplete) {
                        activeStageSearchNote = getResearchIncompleteNote(
                            currentStage as string,
                            requirement ?? ""
                        )
                    } else if (searchAlreadyDone) {
                        activeStageSearchNote = getFunctionToolsModeNote("Search completed")
                    } else {
                        activeStageSearchNote = getPaperToolsOnlyNote(currentStage as string)
                    }
                    console.log("[F1-F6-TEST] NoteInjected", { stage: currentStage, type: incomplete ? "research_incomplete" : searchAlreadyDone ? "search_done" : "tools_only" })
                }

                console.log(
                    `[SearchDecision] Unified router: ${activeStageSearchReason}, ` +
                    `confidence: ${webSearchDecision.confidence}, ` +
                    `searchAlreadyDone: ${searchAlreadyDone}, ` +
                    `searchRequestedByPolicy: ${searchRequestedByPolicy}`
                )
                console.log("[F1-F6-TEST] SearchDecision", { stage: currentStage, policy: stagePolicy, search: searchRequestedByPolicy, reason: activeStageSearchReason, note: activeStageSearchNote ? "injected" : "none" })

                // Post-router sync detection via intentType
                isSyncRequest = !!paperModePrompt
                    && webSearchDecision.intentType === "sync_request"

                if (isSyncRequest) {
                    searchRequestedByPolicy = false
                    activeStageSearchReason = "sync_request"
                    activeStageSearchNote = getFunctionToolsModeNote("Session state sync")
                    console.log("[SearchDecision] Router detected sync request: enableWebSearch=false")
                }

                // Post-router compile detection via intentType
                const isCompileIntent = !!paperModePrompt
                    && webSearchDecision.intentType === "compile_daftar_pustaka"

                if (isCompileIntent) {
                    isCompileBibliographyIntent = true
                    searchRequestedByPolicy = false
                    activeStageSearchReason = "compile_daftar_pustaka"
                    activeStageSearchNote = getFunctionToolsModeNote("Compile bibliography")
                    console.log("[SearchDecision] Router detected compile intent: enableWebSearch=false")
                }

                // Post-router save/submit detection via intentType
                isSaveSubmitIntent = !!paperModePrompt
                    && webSearchDecision.intentType === "save_submit"

            }

            // Build retriever chain once — reused for both mode resolution and execution
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
            })

            const searchExecutionMode = resolveSearchExecutionMode({
                searchRequired: searchRequestedByPolicy,
                retrievers: retrieverChain.map((entry) => ({
                    name: entry.retriever.name as SearchExecutionMode,
                    enabled: true, // chain only contains enabled retrievers
                    modelId: entry.retrieverConfig.modelId,
                })),
            })
            console.log(
                `[SearchExecution] mode=${searchExecutionMode}, searchRequired=${searchRequestedByPolicy},`,
                `chain=[${retrieverChain.map((e) => e.retriever.name).join(",")}]`
            )
            let searchUnavailableReasonCode: string | undefined

            if (searchExecutionMode === "blocked_unavailable") {
                enableWebSearch = false
                searchUnavailableReasonCode = "search_required_but_unavailable"
            } else if (searchExecutionMode === "off") {
                enableWebSearch = false
            } else {
                // Any retriever name means web search is enabled
                enableWebSearch = true
            }

            if (!enableWebSearch && paperModePrompt && !activeStageSearchNote) {
                activeStageSearchNote = getPaperToolsOnlyNote(currentStage as string)
            }

            // Observability: explicit first-turn flow detection
            if (isGagasanFirstTurn && !enableWebSearch) {
                console.info(`[HARNESS-FLOW] gagasan-first-turn: discuss-first → tools path (no search). Model will emit plan + discussion + search choice card.`)
            }

            const requestedResponseMode = await inferSearchResponseMode({
                lastUserMessage: normalizedLastUserContent,
                model,
            })
            const shouldServeStoredReferenceInventory =
                requestedResponseMode === "reference_inventory" &&
                hasRecentSourcesInDb &&
                !enableWebSearch &&
                !isSyncRequest &&
                !isSaveSubmitIntent &&
                !isCompileBibliographyIntent &&
                paperSession?.stageStatus !== "pending_validation" &&
                paperSession?.stageStatus !== "revision"

            if (shouldServeStoredReferenceInventory) {
                const inventoryItems = buildStoredReferenceInventoryItems({
                    recentSources: recentSourcesList,
                    exactSources: availableExactSources,
                })

                return createStoredReferenceInventoryResponse({
                    introText: "Berikut semua sumber yang sudah tersimpan dari penelusuran sebelumnya.",
                    items: inventoryItems,
                    usedModel: modelNames.primary.model,
                })
            }

            if (searchUnavailableReasonCode) {
                return createSearchUnavailableResponse({
                    reasonCode: searchUnavailableReasonCode,
                    message: "Pencarian web tidak tersedia saat ini. Saya belum bisa memberikan jawaban faktual tanpa sumber. Coba lagi beberapa saat.",
                    usedModel: modelNames.primary.model,
                    telemetryFallbackReason: searchUnavailableReasonCode,
                })
            }

            shouldForceGetCurrentPaperState = !enableWebSearch
                && !!paperModePrompt
                && isSyncRequest
                && paperSession?.stageStatus !== "pending_validation"
                && paperSession?.stageStatus !== "revision"

            // Force submit validation when user explicitly requests save/submit
            shouldForceSubmitValidation = !enableWebSearch
                && !!paperModePrompt
                && !shouldForceGetCurrentPaperState
                && isSaveSubmitIntent
                && paperSession?.stageStatus === "drafting"
                && hasStageArtifact(paperSession)

            missingArtifactNote = !shouldForceSubmitValidation
                && !!paperModePrompt
                && !hasStageArtifact(paperSession)
                && paperSession?.stageStatus === "drafting"
                && isSaveSubmitIntent
                ? `\n⚠️ ARTIFACT NOT YET CREATED for this stage. You MUST call createArtifact() with the content saved in updateStageData BEFORE calling submitStageForValidation(). Make sure to include the 'sources' parameter if AVAILABLE_WEB_SOURCES exist.\n`
                : ""

            const forcedToolTelemetryName = shouldForceGetCurrentPaperState
                ? "getCurrentPaperState"
                : undefined
            const telemetrySkillContext = forcedToolTelemetryName
                ? { ...skillTelemetryContext, fallbackReason: "explicit_sync_request" }
                : skillTelemetryContext

            const primaryReasoningProviderOptions = buildReasoningProviderOptions({
                settings: reasoningSettings,
                target: "primary",
                profile: "narrative",
            })

            const fullMessagesGateway = enableWebSearch
                ? [
                    fullMessagesBase[0],
                    // Inject research incomplete note if applicable (ACTIVE stage override)
                    ...(activeStageSearchNote && activeStageSearchReason === "research_incomplete"
                        ? [{ role: "system" as const, content: activeStageSearchNote }]
                        : []),
                    ...fullMessagesBase.slice(1),
                ]
                : [
                    fullMessagesBase[0],
                    // Inject paper tools only note when search disabled in paper mode (ACTIVE stage override)
                    ...(activeStageSearchNote && paperModePrompt && !enableWebSearch
                        ? [{ role: "system" as const, content: activeStageSearchNote }]
                        : []),
                    ...(missingArtifactNote
                        ? [{ role: "system" as const, content: missingArtifactNote }]
                        : []),
                    ...fullMessagesBase.slice(1),
                ]

            const forcedToolChoice = shouldForceSubmitValidation
                    ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
                    : undefined
            // Explicit sync mode: force 2-step flow
            // step 0: force getCurrentPaperState, step 1: force plain answer (no tools)
            const maxToolSteps = shouldForceGetCurrentPaperState
                    ? 2
                    : 5
            const deterministicSyncPrepareStep = shouldForceGetCurrentPaperState
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
            const shouldApplyDeterministicExactSourceRouting =
                !enableWebSearch &&
                !shouldForceGetCurrentPaperState &&
                !shouldForceSubmitValidation &&
                // Allow force-inspect during pending_validation/revision — the
                // exact metadata request is orthogonal to the revision flow.
                // revisionChainEnforcer does not conflict because force-inspect
                // completes in 2 steps (tool + text) before any revision chain.
                (exactSourceResolution.mode === "force-inspect" || (
                    paperSession?.stageStatus !== "pending_validation" &&
                    paperSession?.stageStatus !== "revision"
                )) &&
                availableExactSources.length > 0
            const primaryExactSourceRoutePlan = shouldApplyDeterministicExactSourceRouting
                ? buildDeterministicExactSourcePrepareStep({
                    messages: fullMessagesGateway as Array<{ role: "system" | "user" | "assistant"; content: string }>,
                    resolution: exactSourceResolution,
                })
                : {
                    messages: fullMessagesGateway,
                    prepareStep: undefined,
                    maxToolSteps: undefined as number | undefined,
                }
            // Primary reasoning trace state — managed internally by buildStepStream

            // ════════════════════════════════════════════════════════════════
            // WEB SEARCH: Orchestrator-based two-pass flow
            // Phase 1: Silent search via retriever chain (agnostic, priority-ordered)
            // Phase 2: Compose with skill instructions, stream to client
            // ════════════════════════════════════════════════════════════════
            if (enableWebSearch) {
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
                let fallbackComposeModel: Awaited<ReturnType<typeof getOpenRouterModel>> | undefined
                try {
                    fallbackComposeModel = await getOpenRouterModel({ enableWebSearch: false })
                } catch {
                    // Non-fatal: websearch compose still works, just without inner failover
                }

                return await executeWebSearch({
                    requestId,
                    conversationId: currentConversationId as string,
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
                    reasoningProviderOptions: primaryReasoningProviderOptions ?? undefined,
                    traceMode: getTraceModeLabel(!!paperModePrompt, true),
                    requestStartedAt,
                    isDraftingStage,
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

                        // ──── Fallback choice card for search responses ────
                        // If compose model didn't emit a yaml-spec choice card during search,
                        // inject a default so user isn't stranded without interaction options.
                        let searchChoiceSpec = result.capturedChoiceSpec ?? undefined
                        if (
                            !(searchChoiceSpec && (searchChoiceSpec as { root?: string }).root) &&
                            paperStageScope &&
                            paperSession?.stageStatus === "drafting"
                        ) {
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
                            searchChoiceSpec = fallbackSpec as unknown as typeof searchChoiceSpec
                            console.info(`[CHOICE-CARD][fallback-injected][search] stage=${paperStageScope} reason=compose_did_not_emit_choice_card`)
                        }

                        // ──── Save assistant message ────
                        const searchPlanSnapshot = result.capturedPlanSpec ?? getCurrentPlanSnapshot()

                        // Observability: log what planSnapshot will be persisted (search path)
                        if (searchPlanSnapshot && paperStageScope) {
                            const snap = searchPlanSnapshot as PlanSpec
                            const taskDetail = snap.tasks.map((t: { status: string; label: string }, i: number) => `${i}:${t.status}:${t.label.slice(0, 40)}`).join(", ")
                            console.info(`[PLAN-SNAPSHOT][search] stage=${paperStageScope} tasks=${snap.tasks.length} detail=[${taskDetail}]`)
                        }

                        await saveAssistantMessageLocal(
                            searchText,
                            result.sources.length > 0 ? result.sources : undefined,
                            combinedModelName,
                            result.reasoningSnapshot,
                            searchChoiceSpec && (searchChoiceSpec as { root?: string }).root ? searchChoiceSpec : undefined,
                            undefined, // uiMessageId — not used in search path
                            searchPlanSnapshot,
                        )

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
                                userId: billingContext.userId,
                                conversationId: currentConversationId as Id<"conversations">,
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
                            userId: userId as Id<"users">,
                            conversationId: currentConversationId as Id<"conversations">,
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

            const primaryMessageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

            // ── Primary stream: buildStepStream replaces inline streamText + createUIMessageStream ──
            const primaryPrepareStep = (() => {
                const forceInspect = primaryExactSourceRoutePlan.prepareStep
                const chainedEnforcer = (params: { stepNumber: number; steps: Array<{ toolCalls?: Array<{ toolName: string }> }> }) =>
                    revisionChainEnforcer?.(params) ?? draftingChoiceArtifactEnforcer?.(params) ?? universalReactiveEnforcer?.(params)
                if (forceInspect && (revisionChainEnforcer || draftingChoiceArtifactEnforcer || universalReactiveEnforcer)) {
                    return (params: { stepNumber: number; steps: Array<{ toolCalls?: Array<{ toolName: string }> }> }) =>
                        forceInspect(params) ?? chainedEnforcer(params)
                }
                return chainedEnforcer ?? forceInspect ?? deterministicSyncPrepareStep
            })()

            return buildStepStream({
                executionConfig: {
                    model,
                    messages: primaryExactSourceRoutePlan.messages,
                    tools,
                    prepareStep: primaryPrepareStep,
                    stopWhen: undefined, // buildStepStream uses stepCountIs internally
                    maxSteps: primaryExactSourceRoutePlan.maxToolSteps ?? maxToolSteps,
                    modelName: modelNames.primary.model,
                    toolChoice: forcedToolChoice,
                    providerOptions: primaryReasoningProviderOptions,
                    samplingOptions,
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
                    isCompileThenFinalize,
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
                    // Primary-only feature flags: all enabled
                    enableGroundingExtraction: true,
                    enableSourceTitleEnrichment: true,
                    enableRevisionClassifier: true,
                    enablePlanSpecFallbackExtraction: true,
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
                    buildForcedSyncStatusMessage,
                    getCurrentPlanSnapshot,
                    enforcerStepStartTime,
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
            // ════════════════════════════════════════════

            // ════════════════════════════════════════════════════════════════
            // FALLBACK: OpenRouter without web search
            // (Web search failover is now handled by the orchestrator's retriever chain)
            // ════════════════════════════════════════════════════════════════

            const fallbackTelemetryContext = skillTelemetryContext
            const fallbackReasoningProviderOptions = buildReasoningProviderOptions({
                settings: reasoningSettings,
                target: "fallback",
                profile: "narrative",
            })

            // Fallback WITHOUT web search — extracted to buildStepStream
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
                const shouldApplyFallbackDeterministicExactSourceRouting =
                    !enableWebSearch &&
                    !shouldForceGetCurrentPaperState &&
                    !shouldForceSubmitValidation &&
                    (exactSourceResolution.mode === "force-inspect" || (
                        paperSession?.stageStatus !== "pending_validation" &&
                        paperSession?.stageStatus !== "revision"
                    )) &&
                    availableExactSources.length > 0
                const fallbackMessageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
                const fallbackBaseMessages = missingArtifactNote
                    ? [
                        fullMessagesBase[0],
                        { role: "system" as const, content: missingArtifactNote },
                        ...fullMessagesBase.slice(1),
                    ]
                    : fullMessagesBase
                const fallbackExactSourceRoutePlan = shouldApplyFallbackDeterministicExactSourceRouting
                    ? buildDeterministicExactSourcePrepareStep({
                        messages: fallbackBaseMessages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
                        resolution: exactSourceResolution,
                    })
                    : {
                        messages: fallbackBaseMessages,
                        prepareStep: undefined,
                        maxToolSteps: undefined as number | undefined,
                    }

                const fallbackPrepareStep = (() => {
                    const forceInspect = fallbackExactSourceRoutePlan.prepareStep
                    const chainedEnforcer = (params: { stepNumber: number; steps: Array<{ toolCalls?: Array<{ toolName: string }> }> }) =>
                        revisionChainEnforcer?.(params) ?? draftingChoiceArtifactEnforcer?.(params) ?? universalReactiveEnforcer?.(params)
                    if (forceInspect && (revisionChainEnforcer || draftingChoiceArtifactEnforcer || universalReactiveEnforcer)) {
                        return (params: { stepNumber: number; steps: Array<{ toolCalls?: Array<{ toolName: string }> }> }) =>
                            forceInspect(params) ?? chainedEnforcer(params)
                    }
                    return chainedEnforcer ?? forceInspect ?? fallbackDeterministicSyncPrepareStep
                })()

                const fallbackTransparent = isTransparentReasoning && reasoningSettings.fallback.supported

                return buildStepStream({
                    executionConfig: {
                        model: fallbackModel,
                        messages: fallbackExactSourceRoutePlan.messages,
                        tools,
                        prepareStep: fallbackPrepareStep,
                        stopWhen: undefined,
                        maxSteps: fallbackExactSourceRoutePlan.maxToolSteps ?? fallbackMaxToolSteps,
                        modelName: modelNames.fallback.model,
                        toolChoice: fallbackForcedToolChoice,
                        providerOptions: fallbackReasoningProviderOptions,
                        samplingOptions,
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
                        isCompileThenFinalize,
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
                        // Fallback: all primary-only feature flags disabled
                        enableGroundingExtraction: false,
                        enableSourceTitleEnrichment: false,
                        enableRevisionClassifier: false,
                        enablePlanSpecFallbackExtraction: false,
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
                        buildForcedSyncStatusMessage,
                        getCurrentPlanSnapshot,
                        enforcerStepStartTime: undefined,
                    },
                    reasoningTraceEnabled,
                    enablePlanCapture: !!paperStageScope,
                    enableYamlRender: isDraftingStage,
                    transparentReasoningEnabled: fallbackTransparent,
                    traceMode: getTraceModeLabel(!!paperModePrompt, false),
                    logTag: "[fallback]",
                })
            }

            // Fallback always runs without web search
            // (web search failover is handled by the orchestrator's retriever chain)
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
