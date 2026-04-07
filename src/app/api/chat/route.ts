import * as Sentry from "@sentry/nextjs"
import { generateTitle } from "@/lib/ai/title-generator"
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, generateText, Output, tool, type ToolSet, type ModelMessage, stepCountIs } from "ai"
import { z } from "zod"
import type { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google"

import { isAuthenticated, getToken } from "@/lib/auth-server"
import { getSystemPrompt } from "@/lib/ai/chat-config"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { retryMutation, retryQuery, retryDelay } from "@/lib/convex/retry"
import { normalizeWebSearchUrl } from "@/lib/citations/apaWeb"
import { enrichSourcesWithFetchedTitles } from "@/lib/citations/webTitle"
// isBlockedSourceDomain removed — blocklist enforcement via SKILL.md natural language
// formatParagraphEndCitations now handled by orchestrator
import { createPaperTools, createPaperToolTracker } from "@/lib/ai/paper-tools"
import { checkSourceBodyParity } from "@/lib/ai/skills/web-search-quality/scripts/check-source-body-parity"
import { getPaperModeSystemPrompt } from "@/lib/ai/paper-mode-prompt"
import { hasPaperWritingIntent } from "@/lib/ai/paper-intent-detector"
import { PAPER_WORKFLOW_REMINDER } from "@/lib/ai/paper-workflow-reminder"
import { resolveCompletedSessionHandling, getCompletedSessionClosingMessage, resolveRecallTargetStage } from "@/lib/ai/completed-session"
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
    checkQuotaBeforeOperation,
    recordUsageAfterOperation,
    createQuotaExceededResponse,
    type OperationType,
} from "@/lib/billing/enforcement"
import { logAiTelemetry, classifyError } from "@/lib/ai/telemetry"
import { getSearchSkill, composeSkillInstructions, type SkillContext } from "@/lib/ai/skills"
import {
    createCuratedTraceController,
    type PersistedCuratedTraceSnapshot,
    type ReasoningLiveDataPart,
} from "@/lib/ai/curated-trace"
import { createReasoningLiveAccumulator } from "@/lib/ai/reasoning-live-stream"
// buildUserFacingSearchPayload now handled by orchestrator
import type { JsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
import { pipeYamlRender } from "@json-render/yaml"
import { SPEC_DATA_PART_TYPE, applySpecPatch } from "@json-render/core"
import type { Spec, JsonPatch } from "@json-render/core"
import { CHOICE_YAML_SYSTEM_PROMPT } from "@/lib/json-render/choice-yaml-prompt"
import {
    parseOptionalChoiceInteractionEvent,
    validateChoiceInteractionEvent,
    buildChoiceContextNote,
    shouldFinalizeAfterChoice,
} from "@/lib/chat/choice-request"
import { resolveEffectiveFileIds } from "@/lib/chat/effective-file-ids"
import {
    classifyAttachmentHealth,
    normalizeRequestedAttachmentMode,
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

export async function POST(req: Request) {
    try {
        // 1. Authenticate with BetterAuth
        const isAuthed = await isAuthenticated()
        if (!isAuthed) {
            return new Response("Unauthorized", { status: 401 })
        }

        // 1.1. Ambil token BetterAuth untuk Convex auth guard
        let convexToken: string | null = null
        let tokenError: unknown = null
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                convexToken = (await getToken()) ?? null
                if (convexToken) {
                    break
                }
                tokenError = new Error("Convex auth token missing")
            } catch (error) {
                tokenError = error
            }

            if (attempt < 3) {
                await retryDelay(attempt * 150)
            }
        }
        if (!convexToken) {
            Sentry.captureException(tokenError instanceof Error ? tokenError : new Error(String(tokenError)), {
                tags: { "api.route": "chat", subsystem: "auth" },
            })
            console.error("[Chat API] Failed to get Convex token after retry:", tokenError)
            return new Response("Session token unavailable. Please refresh and retry.", { status: 401 })
        }
        const convexOptions = { token: convexToken }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchQueryWithToken = (ref: any, args: any) => fetchQuery(ref, args, convexOptions)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchMutationWithToken = (ref: any, args: any) => fetchMutation(ref, args, convexOptions)

        // 2. Parse request (AI SDK v5/v6 format)
        const body = await req.json()
        const {
            messages,
            conversationId,
            fileIds: requestFileIds,
            attachmentMode: requestedAttachmentMode,
            replaceAttachmentContext,
            inheritAttachmentContext,
            clearAttachmentContext,
            requestStartedAt: rawRequestStartedAt,
        } = body
        const requestStartedAt =
            typeof rawRequestStartedAt === "number" &&
            Number.isFinite(rawRequestStartedAt) &&
            rawRequestStartedAt > 0
                ? rawRequestStartedAt
                : undefined
        const choiceInteractionEvent = parseOptionalChoiceInteractionEvent(body)
        if (choiceInteractionEvent) {
            console.info(`[CHOICE-CARD][event-received] type=${choiceInteractionEvent.type} stage=${choiceInteractionEvent.stage} selected=${choiceInteractionEvent.selectedOptionIds.join(",")}`)
        }
        const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

        // 3. Get Convex User ID
        const userId = await retryQuery(
            () => fetchQueryWithToken(api.chatHelpers.getMyUserId, {}),
            "chatHelpers.getMyUserId"
        )
        if (!userId) {
            return new Response("User not found in database", { status: 404 })
        }

        // 4. Handle Conversation ID (or Create New)
        let currentConversationId = conversationId
        let isNewConversation = false
        // Extract first user message content (handle AI SDK v5/v6 UIMessage format)
        const firstUserMsg = messages.find((m: { role: string }) => m.role === "user")
        const firstUserContent = firstUserMsg?.content ||
            firstUserMsg?.parts?.find((p: { type: string; text?: string }) => p.type === 'text')?.text ||
            ""

        // ════════════════════════════════════════════════════════════════
        // BILLING: Pre-flight quota check
        // ════════════════════════════════════════════════════════════════
        const lastMsgForQuota = messages[messages.length - 1]
        const lastUserContentForQuota = lastMsgForQuota?.role === "user"
            ? (lastMsgForQuota.content ||
                lastMsgForQuota.parts?.find((p: { type: string; text?: string }) => p.type === "text")?.text ||
                "")
            : ""

        // Determine operation type (will be refined later when we know paper session)
        const initialOperationType: OperationType = "chat_message"

        // Check quota before proceeding
        const quotaCheck = await checkQuotaBeforeOperation(
            userId,
            lastUserContentForQuota,
            initialOperationType,
            convexToken
        )

        if (!quotaCheck.allowed) {
            console.warn("[Billing] Quota check failed:", {
                userId,
                reason: quotaCheck.reason,
                message: quotaCheck.message,
                tier: quotaCheck.tier,
            })
            return createQuotaExceededResponse(quotaCheck)
        }

        // Store for later use in onFinish
        const billingContext = {
            userId,
            quotaWarning: quotaCheck.warning,
            operationType: initialOperationType as OperationType,
        }
        // ════════════════════════════════════════════════════════════════

        if (!currentConversationId) {
            isNewConversation = true
            // Initial placeholder title
            const title = "Percakapan baru"

            currentConversationId = await retryMutation(
                () => fetchMutationWithToken(api.conversations.createConversation, {
                    userId,
                    title,
                }),
                "conversations.createConversation"
            )
        }

        const attachmentContext = await fetchQueryWithToken(
            api.conversationAttachmentContexts.getByConversation,
            {
                conversationId: currentConversationId as Id<"conversations">,
            }
        )

        const attachmentResolution = resolveEffectiveFileIds({
            requestFileIds: Array.isArray(requestFileIds) ? requestFileIds : [],
            conversationContextFileIds: attachmentContext?.activeFileIds ?? [],
            replaceAttachmentContext,
            inheritAttachmentContext,
            clearAttachmentContext,
        })

        const effectiveFileIds = attachmentResolution.effectiveFileIds as Id<"files">[]
        const requestedAttachmentModeNormalized = normalizeRequestedAttachmentMode(requestedAttachmentMode)
        const requestFileIdsLength = Array.isArray(requestFileIds) ? requestFileIds.length : 0
        const hasAttachmentSignal =
            requestFileIdsLength > 0 ||
            effectiveFileIds.length > 0 ||
            clearAttachmentContext === true ||
            requestedAttachmentModeNormalized !== "none"

        if (attachmentResolution.shouldClearContext) {
            await retryMutation(
                () => fetchMutationWithToken(api.conversationAttachmentContexts.clearByConversation, {
                    conversationId: currentConversationId as Id<"conversations">,
                }),
                "conversationAttachmentContexts.clearByConversation"
            )
        } else if (attachmentResolution.shouldUpsertContext) {
            await retryMutation(
                () => fetchMutationWithToken(api.conversationAttachmentContexts.upsertByConversation, {
                    conversationId: currentConversationId as Id<"conversations">,
                    fileIds: effectiveFileIds,
                }),
                "conversationAttachmentContexts.upsertByConversation"
            )
        }

        // Background Title Generation (Fire and Forget)
        if (isNewConversation && firstUserContent) {
            // We don't await this to avoid blocking the response
            generateTitle({ userMessage: firstUserContent })
                .then(async (generatedTitle) => {
                    await fetchMutationWithToken(api.conversations.updateConversation, {
                        conversationId: currentConversationId as Id<"conversations">,
                        title: generatedTitle
                    })
                })
                .catch(err => Sentry.captureException(err, { tags: { subsystem: "title_generation" } }))
        }

        // Helper: update judul conversation berdasarkan aturan AI rename (2x max)
        const maybeUpdateTitleFromAI = async (options: {
            assistantText: string
            minPairsForFinalTitle: number
        }) => {
            const conversation = await fetchQueryWithToken(api.conversations.getConversation, {
                conversationId: currentConversationId as Id<"conversations">,
            })

            if (!conversation) return
            if (conversation.userId !== userId) return
            if (conversation.titleLocked) return

            const currentCount = conversation.titleUpdateCount ?? 0
            if (currentCount >= 2) return

            const placeholderTitles = new Set(["Percakapan baru", "New Chat"])
            const isPlaceholder = placeholderTitles.has(conversation.title)

            // Rename pertama: begitu assistant selesai merespons pertama kali, dan judul masih placeholder
            if (currentCount === 0 && isPlaceholder && firstUserContent && options.assistantText) {
                const generatedTitle = await generateTitle({
                    userMessage: firstUserContent,
                    assistantMessage: options.assistantText,
                })

                await fetchMutationWithToken(api.conversations.updateConversationTitleFromAI, {
                    conversationId: currentConversationId as Id<"conversations">,
                    userId,
                    title: generatedTitle,
                    nextTitleUpdateCount: 1,
                })
            }

            // Rename kedua (final) sengaja nggak otomatis di sini; itu lewat tool,
            // dan baru boleh kalau udah lewat minimal X pasang pesan.
            // Nilai X dipakai buat validasi tool.
            void options.minPairsForFinalTitle
        }

        // 5. Save USER message to Convex
        // Extract content from last message (AI SDK v5/v6 UIMessage format)
        const lastMessage = messages[messages.length - 1]
        if (lastMessage && lastMessage.role === "user") {
            // AI SDK v5/v6: content is in parts array or direct content field
            const userContent = lastMessage.content ||
                lastMessage.parts?.find((p: { type: string; text?: string }) => p.type === 'text')?.text ||
                ""
            const normalizedUserContent = typeof userContent === "string" ? userContent.trim() : ""

            if (!normalizedUserContent && effectiveFileIds.length > 0) {
                return new Response("Attachment membutuhkan teks pendamping minimal 1 karakter.", { status: 400 })
            }

            if (normalizedUserContent) {
                const attachmentMode =
                    requestedAttachmentMode === "explicit" || requestedAttachmentMode === "inherit"
                        ? requestedAttachmentMode
                        : (attachmentResolution.reason === "explicit" ? "explicit" : "inherit")

                await retryMutation(
                    () => fetchMutationWithToken(api.messages.createMessage, {
                        conversationId: currentConversationId as Id<"conversations">,
                        role: "user",
                        content: userContent,
                        fileIds: effectiveFileIds.length > 0 ? effectiveFileIds : undefined,
                        attachmentMode,
                        ...(lastMessage.id ? { uiMessageId: lastMessage.id } : {}),
                    }),
                    "messages.createMessage(user)"
                )
            }
        }

        // 6. Prepare System Prompt & Context
        const systemPrompt = await getSystemPrompt()

        // Task Group 3: Fetch paper mode system prompt if paper session exists
        const paperModeContext = await getPaperModeSystemPrompt(
            currentConversationId as Id<"conversations">,
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
        const isHasilPostChoice = choiceInteractionEvent?.stage === "hasil"
        const paperToolTracker = createPaperToolTracker()

        let choiceContextNote: string | undefined
        let choiceFinalizeDecision: { finalize: boolean; reason: string } | undefined
        if (choiceInteractionEvent) {
            try {
                validateChoiceInteractionEvent({
                    event: choiceInteractionEvent,
                    conversationId: currentConversationId,
                    currentStage: paperStageScope ?? null,
                    isPaperMode: !!paperModePrompt,
                    stageStatus: paperSession?.stageStatus as string | undefined,
                })
            } catch (validationError) {
                const errorMsg = validationError instanceof Error ? validationError.message : String(validationError);
                if (errorMsg.includes("CHOICE_REJECTED_STALE_STATE")) {
                    console.warn(`[stale-choice-rejected] stage=${choiceInteractionEvent.stage} stageStatus=${paperSession?.stageStatus} sourceMessageId=${choiceInteractionEvent.sourceMessageId} submittedAt=${choiceInteractionEvent.submittedAt}`);
                    return new Response(
                        JSON.stringify({
                            error: "CHOICE_REJECTED_STALE_STATE",
                            message: "Pilihan ini sudah tidak berlaku karena state draft sudah berubah. Silakan gunakan chat atau panel validasi yang aktif.",
                            stage: choiceInteractionEvent.stage,
                            stageStatus: paperSession?.stageStatus,
                        }),
                        { status: 409, headers: { "Content-Type": "application/json" } }
                    );
                }
                throw validationError; // re-throw non-stale errors
            }
            const choiceStageData = paperSession?.stageData as Record<string, Record<string, unknown> | undefined> | undefined
            const currentStageChoiceData = choiceStageData?.[choiceInteractionEvent.stage]
            const hasExistingArtifact = !!currentStageChoiceData?.artifactId

            // Compute finalize decision via reusable helper — decisionMode from card metadata is primary signal
            choiceFinalizeDecision = shouldFinalizeAfterChoice({
                stage: choiceInteractionEvent.stage as PaperStageId,
                stageData: currentStageChoiceData as Record<string, unknown> | undefined,
                hasExistingArtifact,
                decisionMode: choiceInteractionEvent.decisionMode,
            })

            choiceContextNote = buildChoiceContextNote(choiceInteractionEvent, {
                hasExistingArtifact,
                forceFinalize: choiceFinalizeDecision.finalize,
            })

            // Observability: log choice commit semantics
            if (choiceFinalizeDecision.finalize) {
                console.info(`[CHOICE][commit-point-finalize] stage=${choiceInteractionEvent.stage} reason=${choiceFinalizeDecision.reason} selected=${choiceInteractionEvent.selectedOptionIds.join(",")}`)
            } else {
                console.info(`[CHOICE][exploration-loop] stage=${choiceInteractionEvent.stage} reason=${choiceFinalizeDecision.reason} selected=${choiceInteractionEvent.selectedOptionIds.join(",")}`)
            }
        }

        // Update billing context with paper session info
        if (paperSession) {
            billingContext.operationType = "paper_generation"
        }

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
        const lastUserContent = lastUserMessage?.role === "user"
            ? (lastUserMessage.content ||
                lastUserMessage.parts?.find((p: { type: string; text?: string }) => p.type === "text")?.text ||
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

        let paperWorkflowReminder = ""
        if (!paperModePrompt && lastUserContent && hasPaperWritingIntent(lastUserContent)) {
            paperWorkflowReminder = PAPER_WORKFLOW_REMINDER
        }
        const userMessageCount = Array.isArray(messages)
            ? messages.filter((message: { role?: string }) => message?.role === "user").length
            : 0
        // Attachment first-response: structural check only (file present + first message + short text).
        // No regex probe patterns — the model can judge user intent from the message itself.
        // The instruction tells the model HOW to respond when files are attached, not IF.
        const shouldForceAttachmentFirstResponse =
            effectiveFileIds.length > 0 &&
            requestedAttachmentMode === "explicit" &&
            !paperModePrompt &&
            userMessageCount <= 1 &&
            normalizedLastUserContent.length <= 64
        const attachmentFirstResponseInstruction = shouldForceAttachmentFirstResponse
            ? "Pengguna baru saja melampirkan file secara eksplisit. Jawaban pertama WAJIB langsung mengulas isi file terlampir. DILARANG membuka dengan perkenalan umum, profil asisten, atau daftar kemampuan. Kalimat pertama harus langsung menjelaskan inti isi dokumen yang dilampirkan."
            : ""
        const getStageSearchPolicy = (stage: PaperStageId | "completed" | undefined | null) => {
            if (!stage || stage === "completed") return "none"
            if (ACTIVE_SEARCH_STAGES.includes(stage)) return "active"
            if (PASSIVE_SEARCH_STAGES.includes(stage)) return "passive"
            return "none"
        }

        // ════════════════════════════════════════════════════════════════
        // Phase 2 Task 2.3.1: File Context Limits (Paper Mode Only)
        // ════════════════════════════════════════════════════════════════
        const MAX_FILE_CONTEXT_CHARS_PER_FILE = 6000
        const MAX_FILE_CONTEXT_CHARS_TOTAL = 20000

        // Task 6.1-6.4: Fetch file records dan inject context
        let fileContext = ""
        let docFileCount = 0
        let imageFileCount = 0
        let docExtractionSuccessCount = 0
        let docExtractionPendingCount = 0
        let docExtractionFailedCount = 0
        let docContextChars = 0
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
                if (isPaperModeForFiles && totalCharsUsed >= MAX_FILE_CONTEXT_CHARS_TOTAL) {
                    break
                }

                fileContext += `[File: ${file.name}]\n`

                if (!file.extractionStatus || file.extractionStatus === "pending") {
                    // Extraction didn't complete within timeout
                    docExtractionPendingCount += 1
                    fileContext += "⏳ File sedang diproses. Coba kirim ulang pesan dalam beberapa detik.\n\n"
                } else if (file.extractionStatus === "success" && file.extractedText) {
                    // Task 6.2-6.3: Extract and format text
                    // Task 2.3.1: Apply per-file limit in paper mode
                    let textToAdd = file.extractedText
                    if (isPaperModeForFiles && textToAdd.length > MAX_FILE_CONTEXT_CHARS_PER_FILE) {
                        textToAdd = textToAdd.slice(0, MAX_FILE_CONTEXT_CHARS_PER_FILE)
                    }

                    // Check remaining total budget
                    if (isPaperModeForFiles) {
                        const remainingBudget = MAX_FILE_CONTEXT_CHARS_TOTAL - totalCharsUsed
                        if (textToAdd.length > remainingBudget) {
                            textToAdd = textToAdd.slice(0, remainingBudget)
                        }
                        totalCharsUsed += textToAdd.length
                    }

                    docExtractionSuccessCount += 1
                    docContextChars += textToAdd.length
                    fileContext += textToAdd + "\n\n"
                } else if (file.extractionStatus === "failed") {
                    // Task 6.6: Handle failed state
                    docExtractionFailedCount += 1
                    const errorMsg = file.extractionError || "Unknown error"
                    fileContext += `❌ File gagal diproses: ${errorMsg}\n\n`
                } else {
                    docExtractionFailedCount += 1
                }
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
                        attachmentFirstResponseForced: shouldForceAttachmentFirstResponse,
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
        const exactSourceResolution = resolveExactSourceFollowup({
            lastUserMessage: normalizedLastUserContent,
            recentMessages: recentConversationMessagesForExactSource,
            availableExactSources,
        })
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
            ...(paperWorkflowReminder
                ? [{ role: "system" as const, content: paperWorkflowReminder }]
                : []),
            ...(fileContext
                ? [{ role: "system" as const, content: `File Context:\n\n${fileContext}` }]
                : []),
            ...(attachmentFirstResponseInstruction
                ? [{ role: "system" as const, content: attachmentFirstResponseInstruction }]
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

        // Helper for saving assistant message with dynamic model from config
        const MAX_REASONING_TRACE_STEPS = 8
        const MAX_REASONING_TEXT_LENGTH = 240
        const ALLOWED_REASONING_STEP_KEYS = new Set([
            "intent-analysis",
            "paper-context-check",
            "search-decision",
            "source-validation",
            "response-compose",
            "tool-action",
        ])
        const ALLOWED_REASONING_STATUSES = new Set([
            "pending",
            "running",
            "done",
            "skipped",
            "error",
        ])
        const FORBIDDEN_REASONING_PATTERNS = [
            /system\s+prompt/i,
            /developer\s+prompt/i,
            /chain[-\s]?of[-\s]?thought/i,
            /\bcot\b/i,
            /api[\s_-]?key/i,
            /bearer\s+[a-z0-9._-]+/i,
            /\btoken\b/i,
            /\bsecret\b/i,
            /\bpassword\b/i,
            /\bcredential\b/i,
            /internal\s+policy/i,
            /tool\s+schema/i,
        ]

        const truncateReasoningText = (value: string) => value.slice(0, MAX_REASONING_TEXT_LENGTH)
        const collapseSpaces = (value: string) => value.replace(/\s+/g, " ").trim()

        const containsForbiddenReasoningText = (value: string) =>
            FORBIDDEN_REASONING_PATTERNS.some((pattern) => pattern.test(value))

        const sanitizeReasoningText = (value: string, fallback: string) => {
            const withoutCodeFence = value
                .replace(/```[\s\S]*?```/g, " ")
                .replace(/`([^`]+)`/g, "$1")
            const cleaned = collapseSpaces(withoutCodeFence)
            if (!cleaned) return fallback
            if (containsForbiddenReasoningText(cleaned)) return fallback
            return truncateReasoningText(cleaned)
        }

        const normalizeLegacyReasoningNote = (note: string) => {
            const normalized = collapseSpaces(note).toLowerCase()
            if (!normalized) return note

            if (normalized === "web-search-enabled") return "Pencarian web diaktifkan untuk memperkuat jawaban."
            if (normalized === "web-search-disabled") return "Pencarian web tidak diperlukan untuk turn ini."
            if (normalized === "no-web-search") return "Langkah validasi sumber dilewati karena tanpa pencarian web."
            if (normalized === "source-detected") return "Sumber terdeteksi dan sedang diverifikasi."
            if (normalized === "sources-validated") return "Sumber yang dipakai sudah tervalidasi."
            if (normalized === "no-sources-returned") return "Tidak ada sumber valid yang bisa dipakai."
            if (normalized === "tool-running") return "Tool sedang dijalankan untuk membantu proses."
            if (normalized === "tool-done" || normalized === "tool-completed") return "Tool selesai dijalankan."
            if (normalized === "no-tool-detected-yet" || normalized === "no-tool-call") return "Tidak ada tool tambahan yang diperlukan."
            if (normalized === "stream-error") return "Terjadi kendala pada aliran respons."
            if (normalized === "stopped-by-user-or-stream-abort") return "Proses dihentikan sebelum jawaban selesai."

            return note
        }

        const sanitizeReasoningMode = (mode: unknown): "normal" | "paper" | "websearch" | undefined => {
            if (mode === "normal" || mode === "paper" || mode === "websearch") return mode
            return undefined
        }

        const sanitizeReasoningStatus = (status: unknown): "pending" | "running" | "done" | "skipped" | "error" => {
            if (typeof status === "string" && ALLOWED_REASONING_STATUSES.has(status)) {
                return status as "pending" | "running" | "done" | "skipped" | "error"
            }
            return "pending"
        }

        const sanitizeReasoningTraceForPersistence = (
            trace?: PersistedCuratedTraceSnapshot
        ): PersistedCuratedTraceSnapshot | undefined => {
            if (!trace || (trace.traceMode !== "curated" && trace.traceMode !== "transparent")) return undefined
            const rawSteps = Array.isArray(trace.steps) ? trace.steps.slice(0, MAX_REASONING_TRACE_STEPS) : []
            const steps = rawSteps
                .map((step) => {
                    if (!step || typeof step !== "object") return null
                    if (typeof step.stepKey !== "string" || !ALLOWED_REASONING_STEP_KEYS.has(step.stepKey)) return null

                    const sanitizedMeta = step.meta
                        ? {
                            ...(sanitizeReasoningMode(step.meta.mode)
                                ? { mode: sanitizeReasoningMode(step.meta.mode) }
                                : {}),
                            ...(step.meta.stage
                                ? { stage: sanitizeReasoningText(step.meta.stage, "Tahap tidak tersedia.") }
                                : {}),
                            ...(step.meta.note
                                ? {
                                    note: sanitizeReasoningText(
                                        normalizeLegacyReasoningNote(step.meta.note),
                                        "Detail aktivitas disederhanakan demi keamanan."
                                    ),
                                }
                                : {}),
                            ...(typeof step.meta.sourceCount === "number" && Number.isFinite(step.meta.sourceCount)
                                ? { sourceCount: Math.max(0, Math.floor(step.meta.sourceCount)) }
                                : {}),
                            ...(step.meta.toolName
                                ? {
                                    toolName: sanitizeReasoningText(
                                        step.meta.toolName.replace(/[^a-zA-Z0-9:_-]/g, " "),
                                        "tool"
                                    ),
                                }
                                : {}),
                        }
                        : undefined

                    return {
                        stepKey: step.stepKey,
                        label: sanitizeReasoningText(step.label, "Langkah reasoning"),
                        status: sanitizeReasoningStatus(step.status),
                        ...(typeof step.progress === "number" && Number.isFinite(step.progress)
                            ? { progress: Math.max(0, Math.min(100, step.progress)) }
                            : {}),
                        ts: Number.isFinite(step.ts) ? step.ts : Date.now(),
                        ...(typeof step.thought === "string" && step.thought.trim()
                            ? { thought: (() => { const t = step.thought.trim(); return sanitizeReasoningText(t.length > 600 ? t.slice(0, 597) + "..." : t, "Detail reasoning."); })() }
                            : {}),
                        ...(sanitizedMeta && Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {}),
                    }
                })
                .filter((step): step is NonNullable<typeof step> => Boolean(step))
            if (steps.length === 0) return undefined

            return {
                version: trace.version === 2 ? 2 : 1,
                headline: sanitizeReasoningText(
                    trace.headline || "",
                    ""
                ),
                traceMode: trace.traceMode === "transparent" ? "transparent" : "curated",
                completedAt: Number.isFinite(trace.completedAt) ? trace.completedAt : Date.now(),
                ...(typeof trace.durationSeconds === "number" && Number.isFinite(trace.durationSeconds)
                    ? { durationSeconds: trace.durationSeconds }
                    : {}),
                ...(typeof trace.rawReasoning === "string" && trace.rawReasoning.trim()
                    ? { rawReasoning: trace.rawReasoning }
                    : {}),
                steps,
            }
        }

        const saveAssistantMessage = async (
            content: string,
            sources?: { url: string; title: string; publishedAt?: number | null }[],
            usedModel?: string, // Model name from config (primary or fallback)
            reasoningTrace?: PersistedCuratedTraceSnapshot,
            jsonRendererChoice?: JsonRendererChoicePayload | Spec,
            uiMessageId?: string
        ) => {
            const sanitizedReasoningTrace = sanitizeReasoningTraceForPersistence(reasoningTrace)
            const normalizedSources = sources
                ?.map((source) => ({
                    url: source.url,
                    title: source.title,
                    ...(typeof source.publishedAt === "number" && Number.isFinite(source.publishedAt)
                        ? { publishedAt: source.publishedAt }
                        : {}),
                }))
                .filter((source) => source.url && source.title)
            await retryMutation(
                () => fetchMutationWithToken(api.messages.createMessage, {
                    conversationId: currentConversationId as Id<"conversations">,
                    role: "assistant",
                    content: content,
                    metadata: {
                        model: usedModel ?? modelNames.primary.model, // From database config
                        ...(uiMessageId ? { uiMessageId } : {}),
                    },
                    sources: normalizedSources && normalizedSources.length > 0 ? normalizedSources : undefined,
                    reasoningTrace: sanitizedReasoningTrace,
                    ...(jsonRendererChoice
                        ? { jsonRendererChoice: JSON.stringify(jsonRendererChoice) }
                        : {}),
                    ...(uiMessageId ? { uiMessageId } : {}),
                }),
                "messages.createMessage(assistant)"
            )
        }

        // ============================================================
        // ARTIFACT TOOLS - Creates and updates standalone deliverable content
        // ============================================================
        const tools = {
            createArtifact: tool({
                description: `Create a NEW artifact for standalone, non-conversational content that the user might want to edit, copy, or export.

⚠️ PENTING: Jika artifact untuk stage/konten ini SUDAH ADA dan ditandai 'invalidated' (karena rewind), gunakan updateArtifact sebagai gantinya. JANGAN buat artifact baru untuk konten yang sudah punya artifact sebelumnya.

USE THIS TOOL WHEN generating:
✓ Paper outlines and structures (type: "outline")
✓ Draft sections: Introduction, Methodology, Results, Discussion, Conclusion (type: "section")
✓ Code snippets for data analysis in Python, R, JavaScript, TypeScript (type: "code")
✓ Tables and formatted data (type: "table")
✓ Bibliography entries and citations (type: "citation")
✓ LaTeX mathematical formulas (type: "formula")
✓ Research summaries and abstracts (type: "section")
✓ Paraphrased paragraphs (type: "section")
✓ Charts and graphs: bar, line, pie (type: "chart", format: "json")
✓ Diagrams: flowchart, sequence, class, state, ER, gantt, mindmap, timeline, pie (type: "code", format: "markdown", content: raw mermaid syntax WITHOUT fences)

DO NOT use this tool for:
✗ Explanations and teaching
✗ Discussions about concepts
✗ Questions and clarifications
✗ Suggestions and feedback
✗ Meta-conversation about writing process
✗ Short answers (less than 3 sentences)
✗ Updating existing/invalidated artifacts (use updateArtifact instead)

When using this tool, always provide a clear, descriptive title (max 50 chars).

📊 CHARTS: For charts/graphs, use type "chart" with format "json". Content must be a valid JSON string.

Bar chart example:
{"chartType":"bar","title":"Publikasi per Tahun","xAxisLabel":"Tahun","yAxisLabel":"Jumlah","data":[{"name":"2020","value":150},{"name":"2021","value":200},{"name":"2022","value":280}],"series":[{"dataKey":"value","name":"Publikasi","color":"#f59e0b"}]}

Line chart example:
{"chartType":"line","title":"Tren Penelitian","xAxisLabel":"Tahun","yAxisLabel":"Jumlah","data":[{"name":"2020","value":50},{"name":"2021","value":80},{"name":"2022","value":120}],"series":[{"dataKey":"value","name":"Penelitian","color":"#0ea5e9"}]}

Pie chart example:
{"chartType":"pie","title":"Distribusi Metode","data":[{"name":"Kualitatif","value":35},{"name":"Kuantitatif","value":45},{"name":"Mixed","value":20}]}

Rules: "data" is array of objects with "name" (label) + numeric field(s). "series" defines which numeric fields to plot (optional for pie, auto-detected if omitted). Content MUST be valid JSON — no comments, no trailing commas.

📐 DIAGRAMS (Mermaid): For visual diagrams (flowcharts, sequence diagrams, class diagrams, etc.), use type "code" with format "markdown". Content is RAW mermaid syntax — NO \`\`\`mermaid fences, just the diagram code directly.

Flowchart example:
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E

Sequence diagram example:
sequenceDiagram
    participant U as User
    participant S as Server
    U->>S: Request
    S-->>U: Response

Supported types: flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, mindmap, timeline, journey, gitgraph, quadrantChart, xychart, block-beta, sankey-beta.`,
                inputSchema: z.object({
                    type: z.enum(["code", "outline", "section", "table", "citation", "formula", "chart"])
                        .describe("The type of artifact to create"),
                    title: z.string().max(200)
                        .describe("Short, descriptive title for the artifact (max 200 chars). Examples: 'Introduction Draft', 'Data Analysis Code', 'Research Outline'"),
                    content: z.string().min(10)
                        .describe("The actual content of the artifact"),
                    format: z.enum(["markdown", "latex", "python", "r", "javascript", "typescript", "json"]).optional()
                        .describe("Format of the content. Use 'markdown' for text, language name for code, 'json' for charts"),
                    description: z.string().optional()
                        .describe("Optional brief description of what the artifact contains"),
                    sources: z.array(z.object({
                        url: z.string(),
                        title: z.string(),
                        publishedAt: z.number().optional(),
                    })).optional()
                        .describe("Web sources from previous web search turn. Pass this if artifact content references web search results. Format: [{url, title, publishedAt?}]"),
                }),
                execute: async ({ type, title, content, format, description, sources }) => {
                    try {
                        // Guard: block createArtifact when a valid artifact already exists (pending_validation OR revision).
                        // During revision, model should use updateArtifact to create v2/v3 — not createArtifact.
                        // createArtifact is only allowed as exceptional fallback when artifact is missing/invalidated.
                        if (paperSession?.stageStatus === "pending_validation" || paperSession?.stageStatus === "revision") {
                            const currentStageData = (paperSession.stageData as Record<string, Record<string, unknown>>)?.[paperSession.currentStage];
                            const existingArtifactId = currentStageData?.artifactId as string | undefined;

                            let artifactIsValid = false;
                            if (existingArtifactId) {
                                try {
                                    const existingArtifact = await fetchQueryWithToken(api.artifacts.get, {
                                        artifactId: existingArtifactId as Id<"artifacts">,
                                        userId: userId as Id<"users">,
                                    });
                                    artifactIsValid = !!existingArtifact && !existingArtifact.invalidatedAt;
                                } catch {
                                    artifactIsValid = false;
                                }
                            }

                            if (artifactIsValid) {
                                console.log(`[create-artifact-blocked-valid-exists] stage=${paperSession.currentStage} stageStatus=${paperSession.stageStatus} artifactId=${existingArtifactId}`);
                                return {
                                    success: false,
                                    errorCode: "CREATE_BLOCKED_VALID_EXISTS",
                                    retryable: false,
                                    error: "A valid artifact already exists for this stage. Use updateArtifact to create a new version instead of createArtifact.",
                                    nextAction: "Call updateArtifact with the revised content. Do NOT use createArtifact when a valid artifact exists.",
                                }
                            }

                            // Artifact missing/invalidated/inaccessible — allow createArtifact as exceptional fallback.
                            // Auto-rescue only for pending_validation (revision is already correct state).
                            if (paperSession.stageStatus === "pending_validation") {
                                try {
                                    const rescueResult = await fetchMutationWithToken(api.paperSessions.autoRescueRevision, {
                                        sessionId: paperSession._id,
                                        userId: userId as Id<"users">,
                                        source: "createArtifact",
                                    });
                                    if (rescueResult.rescued) {
                                        console.log(`[create-artifact-fallback-no-valid] stage=${paperSession.currentStage} — auto-rescued, proceeding with createArtifact`);
                                        const refreshed = await fetchQueryWithToken(api.paperSessions.getByConversation, {
                                            conversationId: currentConversationId
                                        });
                                        if (refreshed) Object.assign(paperSession, refreshed);
                                    }
                                } catch (autoRescueError) {
                                    console.error("[createArtifact] Auto-rescue failed:", autoRescueError);
                                    return {
                                        success: false,
                                        errorCode: "AUTO_RESCUE_FAILED",
                                        retryable: true,
                                        error: "Failed to auto-transition stage to revision. Try calling requestRevision explicitly first.",
                                        nextAction: "Call requestRevision(feedback) first, then retry createArtifact.",
                                    };
                                }
                            }
                        }

                        const refValidation = skill.checkReferences({
                            toolName: 'createArtifact',
                            claimedSources: sources,
                            availableSources: recentSourcesList,
                            hasRecentSources: hasRecentSourcesInDb,
                        })
                        logAiTelemetry({
                            token: convexToken,
                            userId: userId as Id<"users">,
                            conversationId: currentConversationId as Id<"conversations">,
                            provider: modelNames.primary.provider as "vercel-gateway" | "openrouter",
                            model: "tool-validation",
                            isPrimaryProvider: true,
                            failoverUsed: false,
                            mode: isPaperMode ? "paper" : "normal",
                            success: refValidation.valid,
                            latencyMs: 0,
                            searchSkillApplied: true,
                            searchSkillName: "reference-integrity",
                            searchSkillAction: refValidation.valid ? "validated" : "rejected",
                            referencesClaimed: sources?.length ?? 0,
                            referencesMatched: refValidation.valid ? (sources?.length ?? 0) : 0,
                        })
                        if (!refValidation.valid) {
                            return {
                                success: false,
                                error: refValidation.error,
                            }
                        }

                        // Source-body parity check: content reference inventory must match attached sources
                        if (sources && sources.length > 0) {
                            const parityCheck = checkSourceBodyParity({ content, sources })
                            if (!parityCheck.valid) {
                                console.warn(`[source-body-parity-rejected] tool=createArtifact level=${parityCheck.level} sources=${sources.length}`)
                                return {
                                    success: false,
                                    errorCode: "SOURCE_BODY_PARITY_MISMATCH",
                                    retryable: true,
                                    error: parityCheck.error,
                                    nextAction: "Fix the artifact content to match attached sources count, or add an explicit subset disclaimer.",
                                }
                            }
                        }

                        const result = await retryMutation(
                            () => fetchMutationWithToken(api.artifacts.create, {
                                conversationId: currentConversationId as Id<"conversations">,
                                userId: userId as Id<"users">,
                                type,
                                title,
                                content,
                                format,
                                description,
                                sources,
                            }),
                            "artifacts.create"
                        )

                        // Auto-link artifactId to paper session stageData
                        if (paperSession) {
                            try {
                                await fetchMutationWithToken(api.paperSessions.updateStageData, {
                                    sessionId: paperSession._id,
                                    stage: paperSession.currentStage,
                                    data: { artifactId: result.artifactId },
                                })
                            } catch {
                                // Non-critical: artifact exists but not linked to stage
                                console.warn("[createArtifact] Auto-link artifactId to stageData failed")
                            }
                        }

                        console.log("[F1-F6-TEST] createArtifact", { stage: paperSession?.currentStage, artifactId: result.artifactId, title })
                        if (paperToolTracker) paperToolTracker.sawCreateArtifactSuccess = true
                        return {
                            success: true,
                            artifactId: result.artifactId,
                            title,
                            message: `Artifact "${title}" berhasil dibuat. User dapat melihatnya di panel artifact.`,
                            nextAction: "⚠️ MANDATORY: Artifact is created successfully. Do NOT restate the draft content in chat. Do NOT output markdown headings, fenced code blocks, or paragraphs from the artifact. Do NOT mention technical issues, errors, partial saves, or source/title problems — the operation SUCCEEDED. Respond with MAX 2-3 sentences ONLY: (1) confirm artifact was created, (2) direct user to review in artifact panel, (3) call submitStageForValidation() NOW.",
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        Sentry.captureException(error, { tags: { subsystem: "artifact" } })
                        console.error("[createArtifact] Failed:", errorMessage)
                        return {
                            success: false,
                            error: `Gagal membuat artifact: ${errorMessage}`,
                        }
                    }
                },
            }),
            updateArtifact: tool({
                description: `Update an existing artifact with new content, creating a new version.

⚠️ WAJIB gunakan tool ini untuk artifact yang ditandai 'invalidated' (karena rewind).
JANGAN gunakan createArtifact untuk artifact yang sudah ada - gunakan updateArtifact.

USE THIS TOOL WHEN:
✓ User meminta revisi artifact yang sudah ada
✓ Artifact ditandai 'invalidated' setelah rewind ke stage sebelumnya
✓ User ingin memperbaiki atau mengubah konten artifact sebelumnya
✓ Perlu membuat versi baru dari artifact yang sudah ada

Tool ini akan:
1. Membuat versi baru dari artifact (immutable versioning)
2. Versi baru otomatis bersih dari flag invalidation
3. Versi lama tetap tersimpan sebagai history

PENTING: Gunakan artifactId yang ada di context percakapan atau yang diberikan AI sebelumnya.`,
                inputSchema: z.object({
                    artifactId: z.string()
                        .describe("ID of the artifact to update. Must be an existing artifact."),
                    content: z.string().min(10)
                        .describe("New content for the artifact (replaces previous content)"),
                    title: z.string().max(200).optional()
                        .describe("New title (optional). If not provided, previous title is retained."),
                    sources: z.array(z.object({
                        url: z.string(),
                        title: z.string(),
                        publishedAt: z.number().optional(),
                    })).optional()
                        .describe("Web sources if update is based on web search. If not provided, sources from previous version are retained."),
                }),
                execute: async ({ artifactId: modelArtifactId, content, title, sources }) => {
                    try {
                        // Route-level auto-rescue for updateArtifact path.
                        // convex/artifacts.ts:update does NOT go through paperSessions.updateStageData,
                        // so the backend auto-rescue in updateStageData does not cover this path.
                        // Uses autoRescueRevision (NOT requestRevision) to preserve trigger provenance.
                        if (paperSession?.stageStatus === "pending_validation") {
                            try {
                                const rescueResult = await fetchMutationWithToken(api.paperSessions.autoRescueRevision, {
                                    sessionId: paperSession._id,
                                    userId: userId as Id<"users">,
                                    source: "updateArtifact",
                                });
                                if (rescueResult.rescued) {
                                    // Refresh paperSession reference so downstream code sees updated stageStatus
                                    const refreshed = await fetchQueryWithToken(api.paperSessions.getByConversation, {
                                        conversationId: currentConversationId
                                    });
                                    if (refreshed) Object.assign(paperSession, refreshed);
                                }
                            } catch (autoRescueError) {
                                console.error("[updateArtifact] Auto-rescue failed:", autoRescueError);
                                return {
                                    success: false,
                                    errorCode: "AUTO_RESCUE_FAILED",
                                    retryable: true,
                                    error: "Failed to auto-transition stage to revision. Try calling requestRevision explicitly first.",
                                    nextAction: "Call requestRevision(feedback) first, then retry updateArtifact.",
                                };
                            }
                        }

                        // Auto-resolve artifactId from stage data when model supplies invalid ID
                        let artifactId = modelArtifactId
                        if (paperSession) {
                            const stageDataMap = paperSession.stageData as Record<string, Record<string, unknown> | undefined> | undefined
                            const stageArtifactId = stageDataMap?.[paperSession.currentStage]?.artifactId as string | undefined
                            if (stageArtifactId && stageArtifactId !== modelArtifactId) {
                                console.warn(`[updateArtifact] Auto-resolved artifactId: model supplied "${modelArtifactId}", using stage artifactId "${stageArtifactId}"`)
                                artifactId = stageArtifactId
                            }
                        }

                        const refValidation = skill.checkReferences({
                            toolName: 'updateArtifact',
                            claimedSources: sources,
                            availableSources: recentSourcesList,
                            hasRecentSources: hasRecentSourcesInDb,
                        })
                        logAiTelemetry({
                            token: convexToken,
                            userId: userId as Id<"users">,
                            conversationId: currentConversationId as Id<"conversations">,
                            provider: modelNames.primary.provider as "vercel-gateway" | "openrouter",
                            model: "tool-validation",
                            isPrimaryProvider: true,
                            failoverUsed: false,
                            mode: isPaperMode ? "paper" : "normal",
                            success: refValidation.valid,
                            latencyMs: 0,
                            searchSkillApplied: true,
                            searchSkillName: "reference-integrity",
                            searchSkillAction: refValidation.valid ? "validated" : "rejected",
                            referencesClaimed: sources?.length ?? 0,
                            referencesMatched: refValidation.valid ? (sources?.length ?? 0) : 0,
                        })
                        if (!refValidation.valid) {
                            return {
                                success: false,
                                error: refValidation.error,
                            }
                        }

                        // Source-body parity check: content reference inventory must match attached sources
                        if (sources && sources.length > 0) {
                            const parityCheck = checkSourceBodyParity({ content, sources })
                            if (!parityCheck.valid) {
                                console.warn(`[source-body-parity-rejected] tool=updateArtifact level=${parityCheck.level} sources=${sources.length}`)
                                return {
                                    success: false,
                                    errorCode: "SOURCE_BODY_PARITY_MISMATCH",
                                    retryable: true,
                                    error: parityCheck.error,
                                    nextAction: "Fix the artifact content to match attached sources count, or add an explicit subset disclaimer.",
                                }
                            }
                        }

                        const result = await retryMutation(
                            () => fetchMutationWithToken(api.artifacts.update, {
                                artifactId: artifactId as Id<"artifacts">,
                                userId: userId as Id<"users">,
                                content,
                                title,
                                sources,
                            }),
                            "artifacts.update"
                        )

                        console.log("[F1-F6-TEST] updateArtifact", { stage: paperSession?.currentStage, artifactId })
                        if (paperToolTracker) paperToolTracker.sawUpdateArtifactSuccess = true
                        return {
                            success: true,
                            newArtifactId: result.artifactId,
                            oldArtifactId: artifactId,
                            version: result.version,
                            message: `Artifact berhasil di-update ke versi ${result.version}. User dapat melihat versi baru di panel artifact.`,
                            nextAction: "⚠️ Artifact updated. Do NOT repeat the revised content in chat. Respond with MAX 2-3 sentences confirming the update and directing user to review in artifact panel.",
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        Sentry.captureException(error, { tags: { subsystem: "artifact" } })
                        console.error("[updateArtifact] Failed:", errorMessage)
                        return {
                            success: false,
                            error: `Gagal update artifact: ${errorMessage}`,
                        }
                    }
                },
            }),
            readArtifact: tool({
                description: `Baca isi lengkap sebuah artifact berdasarkan ID-nya. Gunakan tool ini jika perlu merujuk konten artifact secara utuh (bukan hanya summary singkat di system prompt).

USE THIS TOOL WHEN:
✓ Perlu membaca ulang artifact dari stage sebelumnya sebagai rujukan
✓ User bertanya tentang isi spesifik sebuah artifact
✓ Perlu mengecek konten lengkap sebelum menulis revisi atau stage berikutnya
✓ Perlu memverifikasi detail yang mungkin ter-truncate di summary

Tool ini mengembalikan: title, type, version, content lengkap, dan sources (jika ada).
Artifact ID bisa didapat dari ARTIFACT SUMMARY di system prompt atau dari getCurrentPaperState().`,
                inputSchema: z.object({
                    artifactId: z.string()
                        .describe("ID artifact yang ingin dibaca."),
                }),
                execute: async ({ artifactId }) => {
                    if (!artifactId?.trim()) {
                        return { success: false, error: "artifactId tidak boleh kosong." }
                    }
                    try {
                        const artifact = await fetchQueryWithToken(api.artifacts.get, {
                            artifactId: artifactId as Id<"artifacts">,
                            userId: userId as Id<"users">,
                        })

                        if (!artifact) {
                            return {
                                success: false,
                                error: "Artifact tidak ditemukan atau tidak memiliki akses.",
                            }
                        }

                        return {
                            success: true,
                            artifactId: artifact._id,
                            title: artifact.title,
                            type: artifact.type,
                            version: artifact.version,
                            content: artifact.content,
                            format: artifact.format ?? null,
                            sources: artifact.sources ?? [],
                            createdAt: artifact.createdAt,
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        Sentry.captureException(error, { tags: { subsystem: "artifact" } })
                        console.error("[readArtifact] Failed:", errorMessage)
                        return {
                            success: false,
                            error: `Gagal membaca artifact: ${errorMessage}`,
                        }
                    }
                },
            }),
            renameConversationTitle: tool({
                description: `Ganti judul conversation secara final ketika kamu benar-benar sudah yakin dengan tujuan utama user.

Aturan:
- Maksimal 2 kali update judul oleh AI per conversation.
- Jangan panggil kalau user sudah mengganti judul sendiri.
- Panggil ini hanya ketika kamu yakin judul finalnya stabil (tidak akan berubah lagi).
- Judul maksimal 50 karakter.`,
                inputSchema: z.object({
                    title: z.string().min(3).max(50).describe("Judul final conversation (maks 50 karakter)"),
                }),
                execute: async ({ title }) => {
                    try {
                        const conversation = await fetchQueryWithToken(api.conversations.getConversation, {
                            conversationId: currentConversationId as Id<"conversations">,
                        })

                        if (!conversation) {
                            return { success: false, error: "Conversation tidak ditemukan" }
                        }
                        if (conversation.userId !== userId) {
                            return { success: false, error: "Tidak memiliki akses" }
                        }
                        if (conversation.titleLocked) {
                            return { success: false, error: "Judul sudah dikunci oleh user" }
                        }

                        const currentCount = conversation.titleUpdateCount ?? 0
                        if (currentCount >= 2) {
                            return { success: false, error: "Batas update judul AI sudah tercapai" }
                        }
                        if (currentCount < 1) {
                            return { success: false, error: "Judul awal belum terbentuk" }
                        }

                        const minPairsForFinalTitle = Number.parseInt(
                            process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                            10
                        )
                        const effectiveMinPairs = Number.isFinite(minPairsForFinalTitle)
                            ? minPairsForFinalTitle
                            : 3

                        const counts = await fetchQueryWithToken(api.messages.countMessagePairsForConversation, {
                            conversationId: currentConversationId as Id<"conversations">,
                            userId,
                        })

                        if ((counts?.pairCount ?? 0) < effectiveMinPairs) {
                            return {
                                success: false,
                                error: `Belum cukup putaran percakapan (butuh minimal ${effectiveMinPairs} pasang pesan)`,
                            }
                        }

                        await fetchMutationWithToken(api.conversations.updateConversationTitleFromAI, {
                            conversationId: currentConversationId as Id<"conversations">,
                            userId,
                            title,
                            nextTitleUpdateCount: 2,
                        })

                        return { success: true, title: title.trim().slice(0, 50) }
                    } catch (error) {
                        console.error("Failed to rename conversation title:", error)
                        return { success: false, error: "Gagal mengubah judul conversation" }
                    }
                },
            }),
            // Task Group 3: Paper Writing Workflow Tools
            ...createPaperTools({
                userId: userId as Id<"users">,
                conversationId: currentConversationId as Id<"conversations">,
                convexToken,
                availableSources: recentSourcesList,
                hasRecentSources: hasRecentSourcesInDb,
                toolTracker: paperToolTracker,
            }),
        } satisfies ToolSet

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

        const getToolNameFromChunk = (chunk: unknown): string | undefined => {
            if (!chunk || typeof chunk !== "object" || !("type" in chunk)) return undefined
            const maybeChunk = chunk as { type?: unknown; toolName?: unknown }
            const type = typeof maybeChunk.type === "string" ? maybeChunk.type : ""
            if (type === "tool-input-start" || type === "tool-call" || type === "tool-result") {
                return typeof maybeChunk.toolName === "string" ? maybeChunk.toolName : undefined
            }
            return undefined
        }

        // Helper: accumulate reasoning deltas and emit progressive live reasoning events
        function createReasoningAccumulator(opts: {
            traceId: string
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            writer: { write: (data: any) => void }
            ensureStart: () => void
            enabled: boolean
        }) {
            const liveAccumulator = createReasoningLiveAccumulator({
                traceId: opts.traceId,
                enabled: opts.enabled,
            })

            const emitCompatThought = (part: ReasoningLiveDataPart) => {
                opts.writer.write({
                    type: "data-reasoning-thought",
                    id: `${part.id}-compat`,
                    data: {
                        traceId: part.data.traceId,
                        delta: part.data.text,
                        ts: part.data.ts,
                    },
                })
            }

            return {
                onReasoningDelta: (delta: string) => {
                    const livePart = liveAccumulator.onReasoningDelta(delta)
                    if (!livePart) return

                    opts.ensureStart()
                    opts.writer.write(livePart)
                    emitCompatThought(livePart)
                },
                finalize: () => {
                    const livePart = liveAccumulator.finalize()
                    if (!livePart) return

                    opts.ensureStart()
                    opts.writer.write(livePart)
                    emitCompatThought(livePart)
                },
                getFullReasoning: () => liveAccumulator.getFullReasoning(),
                hasReasoning: () => liveAccumulator.hasReasoning(),
            }
        }

        // Hoist for catch block accessibility (fallback provider needs these)
        let shouldForceGetCurrentPaperState = false
        let shouldForceSubmitValidation = false
        let shouldForceRequestRevision = false
        let missingArtifactNote = ""

        const createSearchUnavailableResponse = async (input: {
            reasonCode: string
            message: string
            usedModel: string
            provider?: "vercel-gateway" | "openrouter"
            telemetryFallbackReason?: string
        }) => {
            await saveAssistantMessage(input.message, undefined, input.usedModel)
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

            await saveAssistantMessage(
                input.introText,
                normalizedSources.length > 0 ? normalizedSources : undefined,
                input.usedModel,
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
            // Force disable web search if paper intent detected but no session yet
            // This allows AI to call startPaperSession tool first before any web search
            const forcePaperToolsMode = !!paperWorkflowReminder && !paperModePrompt

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

            if (forcePaperToolsMode) {
                // No paper session yet — block search so model calls startPaperSession first.
                // Search will be available on the next turn once session is created.
                // Do NOT try to regex-detect "does user want search" — let the session
                // creation happen first, then the router handles search on the next turn.
                searchRequestedByPolicy = false
                activeStageSearchReason = "force_paper_tools_mode"
                console.log("[SearchDecision] Force paper tools: no session yet, blocking search until session created")
            } else if (!paperModePrompt && userMessageCount <= 1 && !searchAlreadyDone) {
                // Fast path: first message in chat mode → always search (skip LLM router)
                searchRequestedByPolicy = true
                activeStageSearchReason = "first_message_chat_mode"
                console.log("[SearchDecision] Fast path: first chat message, skip router")
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

                // Capture router intent for completed-session guard (outer scope).
                // IMPORTANT: The completed-session guard at ~line 2176 depends on this value.
                // If you add a fast-path that skips the router for completed sessions,
                // the guard will silently fall back to regex-only mode.
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

            // ════════════════════════════════════════════════════════════════
            // PRE-STREAM GUARD: Completed session containment (post-router)
            // Uses router intent as primary signal, regex only as fallback.
            // Moved here from early pre-stream to leverage router intentType.
            // ════════════════════════════════════════════════════════════════
            if (paperSession?.currentStage === "completed") {
                const completedDecision = resolveCompletedSessionHandling({
                    routerIntent: routerIntentType,
                    routerReason: activeStageSearchReason || undefined,
                    lastUserContent: normalizedLastUserContent,
                    hasChoiceInteractionEvent: !!choiceInteractionEvent,
                })

                console.info(
                    `[PAPER][completed-prestream] decision=${completedDecision.handling} ` +
                    `source=${completedDecision.source} reason=${completedDecision.reason}`
                )

                if (completedDecision.handling === "short_circuit_closing") {
                    const completedClosingMessage = getCompletedSessionClosingMessage()

                    // Generate consistent messageId for both persist and stream
                    const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

                    // Persist to DB with uiMessageId parity
                    await retryMutation(
                        () => fetchMutationWithToken(api.messages.createMessage, {
                            conversationId: currentConversationId as Id<"conversations">,
                            role: "assistant",
                            content: completedClosingMessage,
                            metadata: {
                                model: "system-completed-guard",
                                uiMessageId: messageId,
                            },
                            uiMessageId: messageId,
                        }),
                        "messages.createMessage(assistant-completed-prestream)"
                    )

                    // Stream to client
                    const textId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-text`
                    const stream = createUIMessageStream({
                        execute: async ({ writer }) => {
                            writer.write({ type: "start", messageId })
                            writer.write({ type: "text-start", id: textId })
                            writer.write({ type: "text-delta", id: textId, delta: completedClosingMessage })
                            writer.write({ type: "text-end", id: textId })
                            writer.write({ type: "finish", finishReason: "stop" })
                        },
                    })

                    return createUIMessageStreamResponse({ stream })
                }

                if (completedDecision.handling === "server_owned_artifact_recall") {
                    // Resolve target stage from user text
                    const targetStage = resolveRecallTargetStage(normalizedLastUserContent)
                    const stageData = paperSession.stageData as Record<string, Record<string, unknown> | undefined> | undefined
                    const targetArtifactId = targetStage
                        ? (stageData?.[targetStage]?.artifactId as string | undefined)
                        : undefined

                    if (targetArtifactId) {
                        // Fetch artifact data
                        const artifact = await retryQuery(
                            () => fetchQueryWithToken(api.artifacts.get, {
                                artifactId: targetArtifactId as Id<"artifacts">,
                                userId: userId as Id<"users">,
                            }),
                            "artifacts.get(completed-recall)"
                        )

                        if (!artifact) {
                            // Artifact exists in stageData but missing from DB (deleted/corrupted)
                            console.warn(`[PAPER][completed-recall] artifact ${targetArtifactId} not found in DB for stage=${targetStage}`)

                            const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
                            const notFoundText = `Artifact untuk tahap ${getStageLabel(targetStage!).toLowerCase()} tidak ditemukan. Kemungkinan sudah dihapus atau belum tersedia.`
                            const textId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-text`

                            await retryMutation(
                                () => fetchMutationWithToken(api.messages.createMessage, {
                                    conversationId: currentConversationId as Id<"conversations">,
                                    role: "assistant",
                                    content: notFoundText,
                                    metadata: {
                                        model: "system-completed-recall",
                                        uiMessageId: messageId,
                                    },
                                    uiMessageId: messageId,
                                }),
                                "messages.createMessage(assistant-completed-recall-notfound)"
                            )

                            const stream = createUIMessageStream({
                                execute: async ({ writer }) => {
                                    writer.write({ type: "start", messageId })
                                    writer.write({ type: "text-start", id: textId })
                                    writer.write({ type: "text-delta", id: textId, delta: notFoundText })
                                    writer.write({ type: "text-end", id: textId })
                                    writer.write({ type: "finish", finishReason: "stop" })
                                },
                            })

                            return createUIMessageStreamResponse({ stream })
                        }

                        if (artifact) {
                            console.info(`[PAPER][completed-recall] targetStage=${targetStage} artifactId=${targetArtifactId}`)

                            const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
                            const stageLabel = getStageLabel(targetStage!)
                            const proseText = `Menampilkan kembali artifact ${stageLabel.toLowerCase()}.`
                            const toolCallId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-tool`
                            const textId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-text`

                            // Persist prose to DB
                            await retryMutation(
                                () => fetchMutationWithToken(api.messages.createMessage, {
                                    conversationId: currentConversationId as Id<"conversations">,
                                    role: "assistant",
                                    content: proseText,
                                    metadata: {
                                        model: "system-completed-recall",
                                        uiMessageId: messageId,
                                        recallArtifactId: artifact._id,
                                    },
                                    uiMessageId: messageId,
                                }),
                                "messages.createMessage(assistant-completed-recall)"
                            )

                            // Build tool output matching readArtifact shape
                            const toolOutput = {
                                success: true,
                                artifactId: artifact._id,
                                title: artifact.title,
                                type: artifact.type,
                                version: artifact.version,
                                content: artifact.content,
                                format: artifact.format ?? null,
                                sources: artifact.sources ?? [],
                                createdAt: artifact.createdAt,
                            }

                            // Stream: prose + tool-readArtifact simulation
                            const stream = createUIMessageStream({
                                execute: async ({ writer }) => {
                                    writer.write({ type: "start", messageId })
                                    // Text part
                                    writer.write({ type: "text-start", id: textId })
                                    writer.write({ type: "text-delta", id: textId, delta: proseText })
                                    writer.write({ type: "text-end", id: textId })
                                    // Tool simulation: input + output
                                    writer.write({
                                        type: "tool-input-available",
                                        toolCallId,
                                        toolName: "readArtifact",
                                        input: { artifactId: targetArtifactId },
                                    })
                                    writer.write({
                                        type: "tool-output-available",
                                        toolCallId,
                                        output: toolOutput,
                                    })
                                    writer.write({ type: "finish", finishReason: "stop" })
                                },
                            })

                            return createUIMessageStreamResponse({ stream })
                        }
                    }

                    // Fallback: target unresolvable — system-owned clarification
                    console.info(`[PAPER][completed-recall] unresolved target for request="${normalizedLastUserContent.slice(0, 80)}"`)

                    const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
                    const clarificationText = "Saya belum bisa menentukan artifact yang dimaksud. Sebutkan tahapnya, misalnya: judul, abstrak, pendahuluan, atau lampiran."
                    const textId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-text`

                    await retryMutation(
                        () => fetchMutationWithToken(api.messages.createMessage, {
                            conversationId: currentConversationId as Id<"conversations">,
                            role: "assistant",
                            content: clarificationText,
                            metadata: {
                                model: "system-completed-recall",
                                uiMessageId: messageId,
                            },
                            uiMessageId: messageId,
                        }),
                        "messages.createMessage(assistant-completed-recall-clarify)"
                    )

                    const stream = createUIMessageStream({
                        execute: async ({ writer }) => {
                            writer.write({ type: "start", messageId })
                            writer.write({ type: "text-start", id: textId })
                            writer.write({ type: "text-delta", id: textId, delta: clarificationText })
                            writer.write({ type: "text-end", id: textId })
                            writer.write({ type: "finish", finishReason: "stop" })
                        },
                    })

                    return createUIMessageStreamResponse({ stream })
                }
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

            const requestedResponseMode = inferSearchResponseMode({
                lastUserMessage: normalizedLastUserContent,
            })
            const shouldServeStoredReferenceInventory =
                requestedResponseMode === "reference_inventory" &&
                hasRecentSourcesInDb &&
                !enableWebSearch &&
                !isSyncRequest &&
                !isSaveSubmitIntent &&
                !isCompileBibliographyIntent

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
            let primaryReasoningTraceController: ReturnType<typeof createCuratedTraceController> | null = null
            let primaryReasoningTraceSnapshot: PersistedCuratedTraceSnapshot | undefined
            let primaryReasoningSourceCount = 0

            const capturePrimaryReasoningSnapshot = () => {
                if (!primaryReasoningTraceController?.enabled) return
                primaryReasoningTraceSnapshot = primaryReasoningTraceController.getPersistedSnapshot()
            }

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
                    paperWorkflowReminder: paperWorkflowReminder || undefined,
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

                        // ──── Save assistant message ────
                        await saveAssistantMessage(
                            result.text,
                            result.sources.length > 0 ? result.sources : undefined,
                            combinedModelName,
                            result.reasoningSnapshot,
                            result.capturedChoiceSpec ?? undefined,
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
                            assistantText: result.text,
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
            let capturedChoiceSpec: Spec | null = null

            const result = streamText({
                model,
                messages: primaryExactSourceRoutePlan.messages,
                tools,
                ...(primaryReasoningProviderOptions ? { providerOptions: primaryReasoningProviderOptions } : {}),
                toolChoice: forcedToolChoice,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                prepareStep: (primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep) as any,
                stopWhen: stepCountIs(primaryExactSourceRoutePlan.maxToolSteps ?? maxToolSteps),
                ...samplingOptions,
                onFinish: async ({ text, providerMetadata, usage }) => {
                        let sources: { url: string; title: string; publishedAt?: number | null }[] | undefined

                        const googleMetadata = providerMetadata?.google as unknown as GoogleGenerativeAIProviderMetadata | undefined
                        const groundingMetadata = googleMetadata?.groundingMetadata
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const chunks = (groundingMetadata as any)?.groundingChunks as any[] | undefined

                        if (chunks) {
                            sources = chunks
                                .map((chunk) => {
                                    if (chunk.web?.uri) {
                                        const normalizedUrl = normalizeWebSearchUrl(chunk.web.uri)
                                        return {
                                            url: normalizedUrl,
                                            title: chunk.web.title || normalizedUrl,
                                        }
                                    }
                                    return null
                                })
                                .filter(Boolean) as { url: string; title: string; publishedAt?: number | null }[]
                        }

                        const rawText = typeof text === "string" ? text.trim() : ""
                        // Strip yaml-spec fences from persisted text — pipeYamlRender strips
                        // them from the stream but onFinish receives raw model output
                        const normalizedText = rawText.replace(
                            /```yaml-spec[\s\S]*?```/g,
                            ""
                        ).replace(/\n{3,}/g, "\n\n").trim()
                        const shouldPersistForcedSyncFallback = shouldForceGetCurrentPaperState && normalizedText.length === 0
                        let persistedContent = shouldPersistForcedSyncFallback
                            ? buildForcedSyncStatusMessage(paperSession)
                            : normalizedText

                        // Hasil post-choice observability
                        if (isHasilPostChoice && normalizedText.length > 0) {
                            if (
                                paperToolTracker.sawSubmitValidationArtifactMissing &&
                                paperToolTracker.sawCreateArtifactSuccess &&
                                !paperToolTracker.sawSubmitValidationSuccess
                            ) {
                                console.warn("[HASIL][ordering-bug] submitStageForValidation failed before artifact existed, createArtifact succeeded later, but submit was not retried.")
                            }
                            if (
                                paperToolTracker.sawUpdateStageData &&
                                !paperToolTracker.sawCreateArtifactSuccess &&
                                !paperToolTracker.sawSubmitValidationSuccess
                            ) {
                                console.warn("[HASIL][partial-save-stall] updateStageData called but createArtifact and submitStageForValidation were not called. Tool chain incomplete.")
                            }
                            if (
                                /panel validasi|approve|revisi/i.test(normalizedText) &&
                                !paperToolTracker.sawSubmitValidationSuccess
                            ) {
                                console.warn("[HASIL][false-validation-claim] response mentioned validation flow without successful submitStageForValidation.")
                            }
                            if (
                                /aku akan menyusun|draf ini akan|berikut adalah draf/i.test(normalizedText) &&
                                !paperToolTracker.sawCreateArtifactSuccess
                            ) {
                                console.warn("[HASIL][prose-leakage] post-choice response previewed draft content in chat before artifact creation.")
                            }
                        }

                        // Daftar pustaka observability
                        if (paperStageScope === "daftar_pustaka" && normalizedText.length > 0) {
                            if (
                                paperToolTracker.sawCompileDaftarPustakaPersist &&
                                !paperToolTracker.sawCreateArtifactSuccess &&
                                !paperToolTracker.sawUpdateArtifactSuccess
                            ) {
                                console.warn("[DAFTAR_PUSTAKA][compiled-but-no-artifact] persist compilation succeeded but no artifact tool followed.")
                            }
                            if (
                                /kesalahan teknis|maafkan aku|saya akan coba|memperbaiki/i.test(normalizedText) &&
                                (paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess)
                            ) {
                                console.warn("[PAPER][nonfatal-error-leakage] response exposed internal failure narration even though artifact was created successfully.")
                            }
                            if (
                                paperSession?.stageStatus === "revision" &&
                                paperToolTracker.sawCreateArtifactSuccess &&
                                !paperToolTracker.sawUpdateArtifactSuccess
                            ) {
                                console.warn("[DAFTAR_PUSTAKA][revision-create-instead-of-update] revision turn created new artifact instead of updating existing one.")
                            }
                            if (
                                (paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess) &&
                                !paperToolTracker.sawSubmitValidationSuccess
                            ) {
                                console.warn("[DAFTAR_PUSTAKA][artifact-without-submit] artifact created/updated but submitStageForValidation was not called.")
                            }
                        }

                        // Detect: model answered revision-like intent without calling any tools
                        if (paperSession?.stageStatus === "pending_validation"
                            && !paperToolTracker.sawRequestRevision
                            && !paperToolTracker.sawUpdateStageData
                            && !paperToolTracker.sawCreateArtifactSuccess
                            && !paperToolTracker.sawUpdateArtifactSuccess) {
                            const revisionSignals = /\b(revisi|edit|ubah|ganti|perbaiki|resend|generate ulang|tulis ulang|koreksi|buat ulang|ulangi|dari awal)\b/i;
                            if (normalizedLastUserContent && revisionSignals.test(normalizedLastUserContent)) {
                                console.warn(`[revision-intent-answered-without-tools] stage=${paperSession.currentStage} — model responded to apparent revision intent with prose only`);
                            }
                        }

                        // Generic cross-stage partial-save-stall detection (post-choice commit point)
                        if (choiceInteractionEvent && paperStageScope) {
                            const wasCommitPoint = choiceInteractionEvent.decisionMode === "commit"
                                || (choiceFinalizeDecision?.finalize === true)
                            if (wasCommitPoint
                                && paperToolTracker.sawUpdateStageData
                                && !paperToolTracker.sawCreateArtifactSuccess
                                && !paperToolTracker.sawUpdateArtifactSuccess
                                && !paperToolTracker.sawSubmitValidationSuccess) {
                                console.warn(`[CHOICE][partial-save-stall] stage=${paperStageScope} — commit-point choice resulted in updateStageData only, no artifact or submit`)
                            }
                        }

                        // Outcome-gated persisted content: replace noisy model text with clean system message
                        // for review/finalization workflow stages where tools succeeded
                        if (paperStageScope && normalizedText.length > 0) {
                            const isReviewStage = ["hasil", "diskusi", "kesimpulan", "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul"].includes(paperStageScope)
                            const hasArtifactSuccess = paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess
                            const hasLeakage = /kesalahan teknis|maafkan aku|saya akan coba|memperbaiki|mohon tunggu|coba lagi|ada kendala/i.test(normalizedText)

                            if (isReviewStage && hasArtifactSuccess && hasLeakage) {
                                if (paperToolTracker.sawSubmitValidationSuccess) {
                                    persistedContent = "Artefak sudah diperbarui. Silakan review di panel validasi."
                                    console.info("[PAPER][outcome-gated] replaced noisy persisted text with clean success_with_validation message")
                                } else {
                                    persistedContent = "Artefak sudah dibuat/diperbarui, tetapi belum dikirim ke panel validasi."
                                    console.info("[PAPER][outcome-gated] replaced noisy persisted text with clean success_without_validation message")
                                }
                            }
                        }

                        // System-owned closing message for completed session
                        if (
                            paperSession?.currentStage === "completed" &&
                            normalizedText.length > 0 &&
                            /tool_code|sekarang kita masuk ke tahap|yaml-spec|```yaml/i.test(normalizedText)
                        ) {
                            persistedContent = "Semua tahap penyusunan makalah sudah selesai dan disetujui.\n\nRiwayat percakapan di sidebar menyimpan artifact dari setiap tahap, mulai dari gagasan awal sampai pemilihan judul. Linimasa progres juga sudah penuh, menandakan seluruh tahapan penyusunan makalah telah terlewati."
                            console.info("[PAPER][completed-guard] replaced corrupt/off-context model output with system-owned closing message")
                        }

                        // Server-owned fallback: lampiran "tidak ada" path
                        // If model failed to create placeholder artifact, server does it
                        const NO_APPENDIX_IDS = new Set(["tidak-ada-lampiran", "option-tidak-ada-lampiran", "no-appendix"])
                        if (
                            paperStageScope === "lampiran" &&
                            choiceInteractionEvent?.stage === "lampiran" &&
                            choiceInteractionEvent.selectedOptionIds.some(id => NO_APPENDIX_IDS.has(id.trim().toLowerCase())) &&
                            paperToolTracker.sawUpdateStageData &&
                            !paperToolTracker.sawCreateArtifactSuccess &&
                            !paperToolTracker.sawUpdateArtifactSuccess
                        ) {
                            console.info("[LAMPIRAN][server-fallback] model failed to create placeholder artifact, server creating it now")
                            try {
                                // Read alasanTidakAda from stageData if available
                                const lampiranStageData = (paperSession!.stageData as Record<string, Record<string, unknown> | undefined> | undefined)?.["lampiran"]
                                const alasan = typeof lampiranStageData?.alasanTidakAda === "string" ? lampiranStageData.alasanTidakAda : ""
                                const placeholderContent = alasan
                                    ? `Tidak ada lampiran.\n\nAlasan: ${alasan}`
                                    : "Tidak ada lampiran."

                                const placeholderResult = await retryMutation(
                                    () => fetchMutationWithToken(api.artifacts.create, {
                                        conversationId: currentConversationId as Id<"conversations">,
                                        userId: userId as Id<"users">,
                                        type: "section",
                                        title: "Lampiran",
                                        content: placeholderContent,
                                    }),
                                    "artifacts.create(lampiran-placeholder)"
                                ) as { artifactId: string }

                                // Link artifact to stage
                                try {
                                    await retryMutation(
                                        () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                                            sessionId: paperSession!._id,
                                            stage: "lampiran",
                                            data: { artifactId: placeholderResult.artifactId },
                                        }),
                                        "paperSessions.updateStageData(lampiran-link)"
                                    )
                                } catch { /* non-critical */ }

                                // Submit for validation
                                await retryMutation(
                                    () => fetchMutationWithToken(api.paperSessions.submitForValidation, {
                                        sessionId: paperSession!._id,
                                    }),
                                    "paperSessions.submitForValidation(lampiran)"
                                )
                                paperToolTracker.sawCreateArtifactSuccess = true
                                paperToolTracker.sawSubmitValidationSuccess = true
                                persistedContent = "Tidak ada lampiran untuk paper ini. Silakan review di panel validasi."
                                console.info("[LAMPIRAN][server-fallback] placeholder artifact created and submitted for validation")
                            } catch (fallbackErr) {
                                console.error("[LAMPIRAN][server-fallback] failed:", fallbackErr)
                            }
                        }

                        // Server-owned fallback: judul title selection
                        if (
                            paperStageScope === "judul" &&
                            choiceInteractionEvent?.stage === "judul" &&
                            !paperToolTracker.sawUpdateStageData &&
                            !paperToolTracker.sawCreateArtifactSuccess &&
                            !paperToolTracker.sawUpdateArtifactSuccess &&
                            normalizedText.length > 0
                        ) {
                            console.info("[JUDUL][server-fallback] model failed to execute tool calls, server completing judul lifecycle")
                            try {
                                // Deterministic title resolution from choice card payload
                                let selectedTitle: string | undefined
                                try {
                                    const sourceMsg = await retryQuery(
                                        () => fetchQueryWithToken(api.messages.getMessageByUiMessageId, {
                                            uiMessageId: choiceInteractionEvent.sourceMessageId,
                                            conversationId: currentConversationId as Id<"conversations">,
                                        }),
                                        "messages.getMessageByUiMessageId(judul-source)"
                                    ) as { jsonRendererChoice?: string } | null
                                    if (sourceMsg?.jsonRendererChoice) {
                                        const spec = JSON.parse(sourceMsg.jsonRendererChoice)
                                        const selectedId = choiceInteractionEvent.selectedOptionIds[0]
                                        // Search elements for matching optionId
                                        const elements = spec?.elements ?? {}
                                        for (const el of Object.values(elements) as Array<{ type?: string; props?: { optionId?: string; label?: string } }>) {
                                            if (el?.type === "ChoiceOptionButton" && el?.props?.optionId === selectedId && el?.props?.label) {
                                                selectedTitle = el.props.label
                                                break
                                            }
                                        }
                                        if (selectedTitle) {
                                            console.info(`[JUDUL][server-fallback] resolved title from choice payload: "${selectedTitle}"`)
                                        } else {
                                            console.warn(`[JUDUL][server-fallback][selected-option-unresolved] option ${selectedId} not found in spec elements`)
                                        }
                                    } else {
                                        console.warn("[JUDUL][server-fallback][source-message-missing-choice-payload] no jsonRendererChoice in source message")
                                    }
                                } catch (resolveErr) {
                                    console.warn("[JUDUL][server-fallback] choice payload resolution failed, falling back to text extraction:", resolveErr)
                                }
                                // Fallback: extract from model text if deterministic resolution failed
                                if (!selectedTitle) {
                                    const titleMatch = normalizedText.match(/judulTerpilih["\s:]*"([^"]+)"/i)
                                        ?? normalizedText.match(/judul[^"]*"([^"]{20,})"/)
                                        ?? normalizedText.match(/["""]([^"""]{20,})["""]/)
                                    selectedTitle = titleMatch?.[1]?.trim()
                                }

                                if (selectedTitle) {
                                    await retryMutation(
                                        () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                                            sessionId: paperSession!._id,
                                            stage: "judul",
                                            data: { judulTerpilih: selectedTitle, alasanPemilihan: "Dipilih oleh user via choice card." },
                                        }),
                                        "paperSessions.updateStageData(judul-fallback)"
                                    )

                                    // Revision-aware: updateArtifact if exists, createArtifact if not
                                    const judulStageData = (paperSession!.stageData as Record<string, Record<string, unknown> | undefined> | undefined)?.["judul"]
                                    const existingJudulArtifactId = judulStageData?.artifactId as string | undefined

                                    if (existingJudulArtifactId) {
                                        await retryMutation(
                                            () => fetchMutationWithToken(api.artifacts.update, {
                                                artifactId: existingJudulArtifactId as Id<"artifacts">,
                                                userId: userId as Id<"users">,
                                                content: `Judul Terpilih:\n\n${selectedTitle}`,
                                                title: "Pemilihan Judul",
                                            }),
                                            "artifacts.update(judul-fallback)"
                                        )
                                        paperToolTracker.sawUpdateArtifactSuccess = true
                                    } else {
                                        const judulArtifact = await retryMutation(
                                            () => fetchMutationWithToken(api.artifacts.create, {
                                                conversationId: currentConversationId as Id<"conversations">,
                                                userId: userId as Id<"users">,
                                                type: "section",
                                                title: "Pemilihan Judul",
                                                content: `Judul Terpilih:\n\n${selectedTitle}`,
                                            }),
                                            "artifacts.create(judul-fallback)"
                                        ) as { artifactId: string }

                                        try {
                                            await retryMutation(
                                                () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                                                    sessionId: paperSession!._id,
                                                    stage: "judul",
                                                    data: { artifactId: judulArtifact.artifactId },
                                                }),
                                                "paperSessions.updateStageData(judul-link)"
                                            )
                                        } catch { /* non-critical */ }
                                    }

                                    await retryMutation(
                                        () => fetchMutationWithToken(api.paperSessions.submitForValidation, {
                                            sessionId: paperSession!._id,
                                        }),
                                        "paperSessions.submitForValidation(judul-fallback)"
                                    )
                                    paperToolTracker.sawCreateArtifactSuccess = true
                                    paperToolTracker.sawSubmitValidationSuccess = true
                                    persistedContent = `Judul "${selectedTitle}" sudah dipilih. Silakan review di panel validasi.`
                                    console.info("[JUDUL][server-fallback] title saved, artifact created, submitted for validation")
                                } else {
                                    console.warn("[JUDUL][server-fallback] could not extract title from model response")
                                }
                            } catch (fallbackErr) {
                                console.error("[JUDUL][server-fallback] failed:", fallbackErr)
                            }
                        }

                        if (normalizedText.length > 0 && sources && sources.length > 0) {
                            sources = await enrichSourcesWithFetchedTitles(sources, {
                                concurrency: 4,
                                timeoutMs: 5000,
                            })
                        }

                        if (persistedContent.length > 0) {
                            const persistedReasoningTrace = (() => {
                                if (!reasoningTraceEnabled) return undefined
                                if (!primaryReasoningTraceController?.enabled) return undefined
                                if (!primaryReasoningTraceSnapshot) {
                                    primaryReasoningTraceController.finalize({
                                        outcome: "done",
                                        sourceCount: primaryReasoningSourceCount,
                                    })
                                }
                                capturePrimaryReasoningSnapshot()
                                return primaryReasoningTraceSnapshot
                            })()



                            await saveAssistantMessage(
                                persistedContent,
                                normalizedText.length > 0 ? sources : undefined,
                                modelNames.primary.model,
                                persistedReasoningTrace,
                                capturedChoiceSpec && capturedChoiceSpec.root ? capturedChoiceSpec : undefined,
                                primaryMessageId
                            )
                        }

                        // ═══ BILLING: Record token usage ═══
                        if (usage) {
                            await recordUsageAfterOperation({
                                userId: billingContext.userId,
                                conversationId: currentConversationId as Id<"conversations">,
                                sessionId: paperSession?._id,
                                inputTokens: usage.inputTokens ?? 0,
                                outputTokens: usage.outputTokens ?? 0,
                                totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
                                model: modelNames.primary.model,
                                operationType: billingContext.operationType,
                                convexToken,
                            }).catch(err => Sentry.captureException(err, { tags: { subsystem: "billing" } }))
                        }
                        // ═══════════════════════════════════

                        // ═══ TELEMETRY: Primary non-websearch success ═══
                        logAiTelemetry({
                            token: convexToken,
                            userId: userId as Id<"users">,
                            conversationId: currentConversationId as Id<"conversations">,
                            provider: modelNames.primary.provider as "vercel-gateway" | "openrouter",
                            model: modelNames.primary.model,
                            isPrimaryProvider: true,
                            failoverUsed: false,
                            toolUsed: forcedToolTelemetryName,
                            mode: isPaperMode ? "paper" : "normal",
                            success: true,
                            latencyMs: Date.now() - telemetryStartTime,
                            inputTokens: usage?.inputTokens,
                            outputTokens: usage?.outputTokens,
                            ...telemetrySkillContext,
                        })
                        // ═════════════════════════════════════════════════

                        if (normalizedText.length > 0) {
                            const minPairsForFinalTitle = Number.parseInt(
                                process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                                10
                            )
                            await maybeUpdateTitleFromAI({
                                assistantText: normalizedText,
                                minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                                    ? minPairsForFinalTitle
                                    : 3,
                            })
                        }
                    },
            })

            {
                const messageId = primaryMessageId
                const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`
                const reasoningTrace = createCuratedTraceController({
                    enabled: reasoningTraceEnabled,
                    traceId,
                    mode: getTraceModeLabel(!!paperModePrompt, false),
                    stage: currentStage && currentStage !== "completed" ? currentStage : undefined,
                    webSearchEnabled: false,
                    startedAt: requestStartedAt,
                })
                primaryReasoningTraceController = reasoningTrace

                const stream = createUIMessageStream({
                    execute: async ({ writer }) => {
                        let started = false
                        let sourceCount = 0

                        const ensureStart = () => {
                            if (started) return
                            started = true
                            writer.write({ type: "start", messageId })
                        }

                        const emitTrace = (events: ReturnType<typeof reasoningTrace.markToolRunning>) => {
                            if (!reasoningTrace.enabled) return
                            capturePrimaryReasoningSnapshot()
                            if (events.length === 0) return
                            ensureStart()
                            for (const event of events) {
                                writer.write(event)
                            }
                        }

                        const emitDurationPart = () => {
                            if (!reasoningTrace.enabled) return
                            const snapshot = reasoningTrace.getPersistedSnapshot()
                            if (typeof snapshot.durationSeconds !== "number" || !Number.isFinite(snapshot.durationSeconds)) return
                            ensureStart()
                            writer.write({
                                type: "data-reasoning-duration",
                                id: `${traceId}-duration`,
                                data: {
                                    traceId,
                                    seconds: snapshot.durationSeconds,
                                },
                            })
                        }

                        const reasoningAccumulator = createReasoningAccumulator({
                            traceId,
                            writer,
                            ensureStart,
                            enabled: isTransparentReasoning,
                        })

                        emitTrace(reasoningTrace.initialEvents)

                        const uiStream = result.toUIMessageStream({
                            sendStart: false,
                            generateMessageId: () => messageId,
                            sendReasoning: isTransparentReasoning,
                        })
                        const yamlTransformedStream = isDraftingStage
                            ? pipeYamlRender(uiStream)
                            : uiStream

                        // ReadableStream from pipeYamlRender may not have [Symbol.asyncIterator]
                        // in all runtimes, so use a reader-based async generator
                        async function* iterateStream<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
                            const reader = stream.getReader()
                            try {
                                while (true) {
                                    const { done, value } = await reader.read()
                                    if (done) break
                                    yield value
                                }
                            } finally {
                                reader.releaseLock()
                            }
                        }

                        for await (const chunk of iterateStream(yamlTransformedStream)) {
                            // Capture data-spec parts emitted by pipeYamlRender for DB persistence
                            if ((chunk as { type?: string }).type === SPEC_DATA_PART_TYPE) {
                                try {
                                    const data = (chunk as { data?: { type?: string; patch?: JsonPatch; spec?: Spec } }).data
                                    if (data?.type === "patch" && data.patch) {
                                        // Accumulate patches into a running spec
                                        if (!capturedChoiceSpec) {
                                            capturedChoiceSpec = { root: "", elements: {} } as Spec
                                        }
                                        applySpecPatch(capturedChoiceSpec, data.patch)
                                    } else if (data?.type === "flat" && data.spec) {
                                        // If a flat spec is emitted, use it directly
                                        capturedChoiceSpec = data.spec
                                    }
                                } catch { /* spec capture error — non-critical */ }
                            }

                            if (chunk.type === "reasoning-start" || chunk.type === "reasoning-delta" || chunk.type === "reasoning-end") {
                                if (chunk.type === "reasoning-delta") {
                                    reasoningAccumulator.onReasoningDelta(
                                        typeof (chunk as { delta?: unknown }).delta === "string"
                                            ? (chunk as { delta?: unknown }).delta as string
                                            : ""
                                    )
                                }
                                continue
                            }

                            if (chunk.type === "source-url") {
                                sourceCount += 1
                                primaryReasoningSourceCount = sourceCount
                                emitTrace(reasoningTrace.markSourceDetected())
                            }

                            if (chunk.type === "tool-input-start") {
                                const toolName = getToolNameFromChunk(chunk)
                                emitTrace(reasoningTrace.markToolRunning(toolName))
                            }


                            if (chunk.type === "finish") {
                                // Log captured YAML spec for persistence
                                if (capturedChoiceSpec && capturedChoiceSpec.root) {
                                    const elementTypes = Object.entries(capturedChoiceSpec.elements || {}).map(([id, el]) => `${id}:${(el as {type?:string}).type ?? '?'}`).join(", ")
                                    const hasSubmitBtn = Object.values(capturedChoiceSpec.elements || {}).some((el) => (el as {type?:string}).type === "ChoiceSubmitButton")
                                    console.info(`[CHOICE-CARD][yaml-capture] primary stage=${paperStageScope} specKeys=${Object.keys(capturedChoiceSpec).join(",")}`)
                                    console.info(`[F1-F6-TEST] ChoiceCardSpec { elements: "${elementTypes}", hasSubmitButton: ${hasSubmitBtn} }`)
                                }

                                if (reasoningAccumulator.hasReasoning()) {
                                    emitTrace(reasoningTrace.populateFromReasoning(
                                        reasoningAccumulator.getFullReasoning()
                                    ))
                                }
                                reasoningAccumulator.finalize()
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "done",
                                    sourceCount,
                                }))
                                emitDurationPart()
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "error") {
                                reasoningAccumulator.finalize()
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "error",
                                    sourceCount,
                                    errorNote: "primary-stream-error",
                                }))
                                emitDurationPart()
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "abort") {
                                reasoningAccumulator.finalize()
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "stopped",
                                    sourceCount,
                                }))
                                emitDurationPart()
                                writer.write(chunk)
                                break
                            }

                            ensureStart()
                            writer.write(chunk)
                        }
                    },
                })

                return createUIMessageStreamResponse({ stream })
            }
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

            // Task 2.6: Helper to run fallback WITHOUT web search (for error recovery)
            const runFallbackWithoutSearch = async () => {
                let fallbackReasoningTraceController: ReturnType<typeof createCuratedTraceController> | null = null
                let fallbackReasoningTraceSnapshot: PersistedCuratedTraceSnapshot | undefined
                let fallbackReasoningSourceCount = 0
                let fallbackCapturedChoiceSpec: Spec | null = null
                const captureFallbackReasoningSnapshot = () => {
                    if (!fallbackReasoningTraceController?.enabled) return
                    fallbackReasoningTraceSnapshot = fallbackReasoningTraceController.getPersistedSnapshot()
                }

                const fallbackModel = await getOpenRouterModel({ enableWebSearch: false })
                const fallbackForcedToolChoice = shouldForceSubmitValidation
                    ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
                    : shouldForceRequestRevision
                    ? ({ type: "tool", toolName: "requestRevision" } as const)
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

                const result = streamText({
                    model: fallbackModel,
                    messages: fallbackExactSourceRoutePlan.messages,
                    tools,
                    ...(fallbackReasoningProviderOptions ? { providerOptions: fallbackReasoningProviderOptions } : {}),
                    toolChoice: fallbackForcedToolChoice,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    prepareStep: (fallbackExactSourceRoutePlan.prepareStep ?? fallbackDeterministicSyncPrepareStep) as any,
                    stopWhen: stepCountIs(fallbackExactSourceRoutePlan.maxToolSteps ?? fallbackMaxToolSteps),
                    ...samplingOptions,
                    onFinish: async ({ text, usage }) => {
                        const rawText = typeof text === "string" ? text.trim() : ""
                        // Strip yaml-spec fences from persisted text — pipeYamlRender strips
                        // them from the stream but onFinish receives raw model output
                        const normalizedText = rawText.replace(
                            /```yaml-spec[\s\S]*?```/g,
                            ""
                        ).replace(/\n{3,}/g, "\n\n").trim()
                        const shouldPersistForcedSyncFallback = shouldForceGetCurrentPaperState && normalizedText.length === 0
                        let persistedContent = shouldPersistForcedSyncFallback
                            ? buildForcedSyncStatusMessage(paperSession)
                            : normalizedText

                        // Hasil post-choice observability (fallback path — parity with primary)
                        if (isHasilPostChoice && normalizedText.length > 0) {
                            if (
                                paperToolTracker.sawSubmitValidationArtifactMissing &&
                                paperToolTracker.sawCreateArtifactSuccess &&
                                !paperToolTracker.sawSubmitValidationSuccess
                            ) {
                                console.warn("[HASIL][ordering-bug][fallback] submitStageForValidation failed before artifact existed, createArtifact succeeded later, but submit was not retried.")
                            }
                            if (
                                paperToolTracker.sawUpdateStageData &&
                                !paperToolTracker.sawCreateArtifactSuccess &&
                                !paperToolTracker.sawSubmitValidationSuccess
                            ) {
                                console.warn("[HASIL][partial-save-stall][fallback] updateStageData called but createArtifact and submitStageForValidation were not called. Tool chain incomplete.")
                            }
                            if (
                                /panel validasi|approve|revisi/i.test(normalizedText) &&
                                !paperToolTracker.sawSubmitValidationSuccess
                            ) {
                                console.warn("[HASIL][false-validation-claim][fallback] response mentioned validation flow without successful submitStageForValidation.")
                            }
                            if (
                                /aku akan menyusun|draf ini akan|berikut adalah draf/i.test(normalizedText) &&
                                !paperToolTracker.sawCreateArtifactSuccess
                            ) {
                                console.warn("[HASIL][prose-leakage][fallback] post-choice response previewed draft content in chat before artifact creation.")
                            }
                        }

                        // Daftar pustaka observability (fallback path)
                        if (paperStageScope === "daftar_pustaka" && normalizedText.length > 0) {
                            if (
                                paperToolTracker.sawCompileDaftarPustakaPersist &&
                                !paperToolTracker.sawCreateArtifactSuccess &&
                                !paperToolTracker.sawUpdateArtifactSuccess
                            ) {
                                console.warn("[DAFTAR_PUSTAKA][compiled-but-no-artifact][fallback] persist compilation succeeded but no artifact tool followed.")
                            }
                            if (
                                /kesalahan teknis|maafkan aku|saya akan coba|memperbaiki/i.test(normalizedText) &&
                                (paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess)
                            ) {
                                console.warn("[PAPER][nonfatal-error-leakage][fallback] response exposed internal failure narration even though artifact was created successfully.")
                            }
                            if (
                                paperSession?.stageStatus === "revision" &&
                                paperToolTracker.sawCreateArtifactSuccess &&
                                !paperToolTracker.sawUpdateArtifactSuccess
                            ) {
                                console.warn("[DAFTAR_PUSTAKA][revision-create-instead-of-update][fallback] revision turn created new artifact instead of updating existing one.")
                            }
                            if (
                                (paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess) &&
                                !paperToolTracker.sawSubmitValidationSuccess
                            ) {
                                console.warn("[DAFTAR_PUSTAKA][artifact-without-submit][fallback] artifact created/updated but submitStageForValidation was not called.")
                            }
                        }

                        // System-owned closing message for completed session (fallback parity)
                        if (
                            paperSession?.currentStage === "completed" &&
                            normalizedText.length > 0 &&
                            /tool_code|sekarang kita masuk ke tahap|yaml-spec|```yaml/i.test(normalizedText)
                        ) {
                            persistedContent = "Semua tahap penyusunan makalah sudah selesai dan disetujui.\n\nRiwayat percakapan di sidebar menyimpan artifact dari setiap tahap, mulai dari gagasan awal sampai pemilihan judul. Linimasa progres juga sudah penuh, menandakan seluruh tahapan penyusunan makalah telah terlewati."
                            console.info("[PAPER][completed-guard][fallback] replaced corrupt/off-context model output with system-owned closing message")
                        }

                        // Server-owned fallback: lampiran "tidak ada" path (fallback parity)
                        const FALLBACK_NO_APPENDIX_IDS = new Set(["tidak-ada-lampiran", "option-tidak-ada-lampiran", "no-appendix"])
                        if (
                            paperStageScope === "lampiran" &&
                            choiceInteractionEvent?.stage === "lampiran" &&
                            choiceInteractionEvent.selectedOptionIds.some(id => FALLBACK_NO_APPENDIX_IDS.has(id.trim().toLowerCase())) &&
                            paperToolTracker.sawUpdateStageData &&
                            !paperToolTracker.sawCreateArtifactSuccess &&
                            !paperToolTracker.sawUpdateArtifactSuccess
                        ) {
                            console.info("[LAMPIRAN][server-fallback][fallback] model failed to create placeholder artifact, server creating it now")
                            try {
                                const lampiranStageData = (paperSession!.stageData as Record<string, Record<string, unknown> | undefined> | undefined)?.["lampiran"]
                                const alasan = typeof lampiranStageData?.alasanTidakAda === "string" ? lampiranStageData.alasanTidakAda : ""
                                const placeholderContent = alasan
                                    ? `Tidak ada lampiran.\n\nAlasan: ${alasan}`
                                    : "Tidak ada lampiran."

                                const placeholderResult = await retryMutation(
                                    () => fetchMutationWithToken(api.artifacts.create, {
                                        conversationId: currentConversationId as Id<"conversations">,
                                        userId: userId as Id<"users">,
                                        type: "section",
                                        title: "Lampiran",
                                        content: placeholderContent,
                                    }),
                                    "artifacts.create(lampiran-placeholder-fallback)"
                                ) as { artifactId: string }

                                try {
                                    await retryMutation(
                                        () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                                            sessionId: paperSession!._id,
                                            stage: "lampiran",
                                            data: { artifactId: placeholderResult.artifactId },
                                        }),
                                        "paperSessions.updateStageData(lampiran-link-fallback)"
                                    )
                                } catch { /* non-critical */ }

                                await retryMutation(
                                    () => fetchMutationWithToken(api.paperSessions.submitForValidation, {
                                        sessionId: paperSession!._id,
                                    }),
                                    "paperSessions.submitForValidation(lampiran-fallback)"
                                )
                                paperToolTracker.sawCreateArtifactSuccess = true
                                paperToolTracker.sawSubmitValidationSuccess = true
                                persistedContent = "Tidak ada lampiran untuk paper ini. Silakan review di panel validasi."
                                console.info("[LAMPIRAN][server-fallback][fallback] placeholder artifact created and submitted for validation")
                            } catch (fallbackErr) {
                                console.error("[LAMPIRAN][server-fallback][fallback] failed:", fallbackErr)
                            }
                        }

                        // Server-owned fallback: judul (fallback path parity)
                        if (
                            paperStageScope === "judul" &&
                            choiceInteractionEvent?.stage === "judul" &&
                            !paperToolTracker.sawUpdateStageData &&
                            !paperToolTracker.sawCreateArtifactSuccess &&
                            !paperToolTracker.sawUpdateArtifactSuccess &&
                            normalizedText.length > 0
                        ) {
                            console.info("[JUDUL][server-fallback][fallback] model failed to execute tool calls, server completing judul lifecycle")
                            try {
                                // Deterministic title resolution from choice card payload (fallback path)
                                let selectedTitle: string | undefined
                                try {
                                    const sourceMsg = await retryQuery(
                                        () => fetchQueryWithToken(api.messages.getMessageByUiMessageId, {
                                            uiMessageId: choiceInteractionEvent.sourceMessageId,
                                            conversationId: currentConversationId as Id<"conversations">,
                                        }),
                                        "messages.getMessageByUiMessageId(judul-source-fb)"
                                    ) as { jsonRendererChoice?: string } | null
                                    if (sourceMsg?.jsonRendererChoice) {
                                        const spec = JSON.parse(sourceMsg.jsonRendererChoice)
                                        const selectedId = choiceInteractionEvent.selectedOptionIds[0]
                                        const elements = spec?.elements ?? {}
                                        for (const el of Object.values(elements) as Array<{ type?: string; props?: { optionId?: string; label?: string } }>) {
                                            if (el?.type === "ChoiceOptionButton" && el?.props?.optionId === selectedId && el?.props?.label) {
                                                selectedTitle = el.props.label
                                                break
                                            }
                                        }
                                        if (selectedTitle) {
                                            console.info(`[JUDUL][server-fallback][fallback] resolved title from choice payload: "${selectedTitle}"`)
                                        } else {
                                            console.warn(`[JUDUL][server-fallback][fallback][selected-option-unresolved] option ${selectedId} not found in spec elements`)
                                        }
                                    } else {
                                        console.warn("[JUDUL][server-fallback][fallback][source-message-missing-choice-payload] no jsonRendererChoice in source message")
                                    }
                                } catch (resolveErr) {
                                    console.warn("[JUDUL][server-fallback][fallback] choice payload resolution failed:", resolveErr)
                                }
                                if (!selectedTitle) {
                                    const titleMatch = normalizedText.match(/judulTerpilih["\s:]*"([^"]+)"/i)
                                        ?? normalizedText.match(/judul[^"]*"([^"]{20,})"/)
                                        ?? normalizedText.match(/["""]([^"""]{20,})["""]/)
                                    selectedTitle = titleMatch?.[1]?.trim()
                                }

                                if (selectedTitle) {
                                    await retryMutation(
                                        () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                                            sessionId: paperSession!._id,
                                            stage: "judul",
                                            data: { judulTerpilih: selectedTitle, alasanPemilihan: "Dipilih oleh user via choice card." },
                                        }),
                                        "paperSessions.updateStageData(judul-fallback-fb)"
                                    )

                                    const judulStageDataFb = (paperSession!.stageData as Record<string, Record<string, unknown> | undefined> | undefined)?.["judul"]
                                    const existingJudulArtifactIdFb = judulStageDataFb?.artifactId as string | undefined

                                    if (existingJudulArtifactIdFb) {
                                        await retryMutation(
                                            () => fetchMutationWithToken(api.artifacts.update, {
                                                artifactId: existingJudulArtifactIdFb as Id<"artifacts">,
                                                userId: userId as Id<"users">,
                                                content: `Judul Terpilih:\n\n${selectedTitle}`,
                                                title: "Pemilihan Judul",
                                            }),
                                            "artifacts.update(judul-fallback-fb)"
                                        )
                                        paperToolTracker.sawUpdateArtifactSuccess = true
                                    } else {
                                        const judulArtifact = await retryMutation(
                                            () => fetchMutationWithToken(api.artifacts.create, {
                                                conversationId: currentConversationId as Id<"conversations">,
                                                userId: userId as Id<"users">,
                                                type: "section",
                                                title: "Pemilihan Judul",
                                                content: `Judul Terpilih:\n\n${selectedTitle}`,
                                            }),
                                            "artifacts.create(judul-fallback-fb)"
                                        ) as { artifactId: string }

                                        try {
                                            await retryMutation(
                                                () => fetchMutationWithToken(api.paperSessions.updateStageData, {
                                                    sessionId: paperSession!._id,
                                                    stage: "judul",
                                                    data: { artifactId: judulArtifact.artifactId },
                                                }),
                                                "paperSessions.updateStageData(judul-link-fb)"
                                            )
                                        } catch { /* non-critical */ }
                                    }

                                    await retryMutation(
                                        () => fetchMutationWithToken(api.paperSessions.submitForValidation, {
                                            sessionId: paperSession!._id,
                                        }),
                                        "paperSessions.submitForValidation(judul-fallback-fb)"
                                    )
                                    paperToolTracker.sawCreateArtifactSuccess = true
                                    paperToolTracker.sawSubmitValidationSuccess = true
                                    persistedContent = `Judul "${selectedTitle}" sudah dipilih. Silakan review di panel validasi.`
                                    console.info("[JUDUL][server-fallback][fallback] title saved, artifact created, submitted for validation")
                                } else {
                                    console.warn("[JUDUL][server-fallback][fallback] could not extract title from model response")
                                }
                            } catch (fallbackErr) {
                                console.error("[JUDUL][server-fallback][fallback] failed:", fallbackErr)
                            }
                        }

                        // Outcome-gated persisted content (fallback path)
                        if (paperStageScope && normalizedText.length > 0) {
                            const isReviewStage = ["hasil", "diskusi", "kesimpulan", "pembaruan_abstrak", "daftar_pustaka", "lampiran", "judul"].includes(paperStageScope)
                            const hasArtifactSuccess = paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess
                            const hasLeakage = /kesalahan teknis|maafkan aku|saya akan coba|memperbaiki|mohon tunggu|coba lagi|ada kendala/i.test(normalizedText)

                            if (isReviewStage && hasArtifactSuccess && hasLeakage) {
                                if (paperToolTracker.sawSubmitValidationSuccess) {
                                    persistedContent = "Artefak sudah diperbarui. Silakan review di panel validasi."
                                    console.info("[PAPER][outcome-gated][fallback] replaced noisy persisted text with clean success_with_validation message")
                                } else {
                                    persistedContent = "Artefak sudah dibuat/diperbarui, tetapi belum dikirim ke panel validasi."
                                    console.info("[PAPER][outcome-gated][fallback] replaced noisy persisted text with clean success_without_validation message")
                                }
                            }
                        }

                        if (persistedContent.length > 0) {
                            const persistedReasoningTrace = (() => {
                                if (!reasoningTraceEnabled) return undefined
                                if (!fallbackReasoningTraceController?.enabled) return undefined
                                if (!fallbackReasoningTraceSnapshot) {
                                    fallbackReasoningTraceController.finalize({
                                        outcome: "done",
                                        sourceCount: fallbackReasoningSourceCount,
                                    })
                                }
                                captureFallbackReasoningSnapshot()
                                return fallbackReasoningTraceSnapshot
                            })()

                            await saveAssistantMessage(
                                persistedContent,
                                undefined,
                                modelNames.fallback.model,
                                persistedReasoningTrace,
                                fallbackCapturedChoiceSpec && fallbackCapturedChoiceSpec.root ? fallbackCapturedChoiceSpec : undefined,
                                fallbackMessageId
                            )
                        }
                        if (normalizedText.length > 0) {
                            const minPairsForFinalTitle = Number.parseInt(
                                process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                                10
                            )
                            await maybeUpdateTitleFromAI({
                                assistantText: normalizedText,
                                minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                                    ? minPairsForFinalTitle
                                    : 3,
                            })
                        }

                        // ═══ BILLING: Record token usage (fallback) ═══
                        if (usage) {
                            await recordUsageAfterOperation({
                                userId: billingContext.userId,
                                conversationId: currentConversationId as Id<"conversations">,
                                sessionId: paperSession?._id,
                                inputTokens: usage.inputTokens ?? 0,
                                outputTokens: usage.outputTokens ?? 0,
                                totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
                                model: modelNames.fallback.model,
                                operationType: billingContext.operationType,
                                convexToken,
                            }).catch(err => Sentry.captureException(err, { tags: { subsystem: "billing" } }))
                        }
                        // ═══════════════════════════════════════════════

                        // ═══ TELEMETRY: Fallback non-websearch success ═══
                        logAiTelemetry({
                            token: convexToken,
                            userId: userId as Id<"users">,
                            conversationId: currentConversationId as Id<"conversations">,
                            provider: modelNames.fallback.provider as "vercel-gateway" | "openrouter",
                            model: modelNames.fallback.model,
                            isPrimaryProvider: false,
                            failoverUsed: true,
                            toolUsed: undefined,
                            mode: isPaperMode ? "paper" : "normal",
                            success: true,
                            latencyMs: Date.now() - telemetryStartTime,
                            inputTokens: usage?.inputTokens,
                            outputTokens: usage?.outputTokens,
                            ...fallbackTelemetryContext,
                        })
                        // ═════════════════════════════════════════════════
                    },
                })
                const messageId = fallbackMessageId
                const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`
                const reasoningTrace = createCuratedTraceController({
                    enabled: reasoningTraceEnabled,
                    traceId,
                    mode: getTraceModeLabel(!!paperModePrompt, false),
                    stage: paperSession?.currentStage && paperSession.currentStage !== "completed"
                        ? paperSession.currentStage
                        : undefined,
                    webSearchEnabled: false,
                    startedAt: requestStartedAt,
                })
                fallbackReasoningTraceController = reasoningTrace

                const stream = createUIMessageStream({
                    execute: async ({ writer }) => {
                        let started = false
                        let sourceCount = 0

                        const ensureStart = () => {
                            if (started) return
                            started = true
                            writer.write({ type: "start", messageId })
                        }

                        const emitTrace = (events: ReturnType<typeof reasoningTrace.markToolRunning>) => {
                            if (!reasoningTrace.enabled) return
                            captureFallbackReasoningSnapshot()
                            if (events.length === 0) return
                            ensureStart()
                            for (const event of events) {
                                writer.write(event)
                            }
                        }

                        const emitDurationPart = () => {
                            if (!reasoningTrace.enabled) return
                            const snapshot = reasoningTrace.getPersistedSnapshot()
                            if (typeof snapshot.durationSeconds !== "number" || !Number.isFinite(snapshot.durationSeconds)) return
                            ensureStart()
                            writer.write({
                                type: "data-reasoning-duration",
                                id: `${traceId}-duration`,
                                data: {
                                    traceId,
                                    seconds: snapshot.durationSeconds,
                                },
                            })
                        }

                        const fallbackTransparent = isTransparentReasoning && reasoningSettings.fallback.supported
                        const reasoningAccumulator = createReasoningAccumulator({
                            traceId,
                            writer,
                            ensureStart,
                            enabled: fallbackTransparent,
                        })

                        emitTrace(reasoningTrace.initialEvents)

                        const fallbackUiStream = result.toUIMessageStream({
                            sendStart: false,
                            generateMessageId: () => messageId,
                            sendReasoning: fallbackTransparent,
                        })
                        const fallbackYamlStream = isDraftingStage
                            ? pipeYamlRender(fallbackUiStream)
                            : fallbackUiStream

                        // ReadableStream from pipeYamlRender may not have [Symbol.asyncIterator]
                        async function* iterateFallbackStream<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
                            const reader = stream.getReader()
                            try {
                                while (true) {
                                    const { done, value } = await reader.read()
                                    if (done) break
                                    yield value
                                }
                            } finally {
                                reader.releaseLock()
                            }
                        }

                        for await (const chunk of iterateFallbackStream(fallbackYamlStream)) {
                            // Capture data-spec parts emitted by pipeYamlRender for DB persistence
                            if ((chunk as { type?: string }).type === SPEC_DATA_PART_TYPE) {
                                try {
                                    const data = (chunk as { data?: { type?: string; patch?: JsonPatch; spec?: Spec } }).data
                                    if (data?.type === "patch" && data.patch) {
                                        if (!fallbackCapturedChoiceSpec) {
                                            fallbackCapturedChoiceSpec = { root: "", elements: {} } as Spec
                                        }
                                        applySpecPatch(fallbackCapturedChoiceSpec, data.patch)
                                    } else if (data?.type === "flat" && data.spec) {
                                        fallbackCapturedChoiceSpec = data.spec
                                    }
                                } catch { /* spec capture error — non-critical */ }
                            }

                            if (chunk.type === "reasoning-start" || chunk.type === "reasoning-delta" || chunk.type === "reasoning-end") {
                                if (chunk.type === "reasoning-delta") {
                                    reasoningAccumulator.onReasoningDelta(
                                        typeof (chunk as { delta?: unknown }).delta === "string"
                                            ? (chunk as { delta?: unknown }).delta as string
                                            : ""
                                    )
                                }
                                continue
                            }

                            if (chunk.type === "source-url") {
                                sourceCount += 1
                                fallbackReasoningSourceCount = sourceCount
                                emitTrace(reasoningTrace.markSourceDetected())
                            }

                            if (chunk.type === "tool-input-start") {
                                const toolName = getToolNameFromChunk(chunk)
                                emitTrace(reasoningTrace.markToolRunning(toolName))
                            }


                            if (chunk.type === "finish") {
                                // Log captured YAML spec for persistence
                                if (fallbackCapturedChoiceSpec && fallbackCapturedChoiceSpec.root) {
                                    console.info(`[CHOICE-CARD][yaml-capture] fallback stage=${paperStageScope} specKeys=${Object.keys(fallbackCapturedChoiceSpec).join(",")}`)
                                }

                                if (reasoningAccumulator.hasReasoning()) {
                                    emitTrace(reasoningTrace.populateFromReasoning(
                                        reasoningAccumulator.getFullReasoning()
                                    ))
                                }
                                reasoningAccumulator.finalize()
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "done",
                                    sourceCount,
                                }))
                                emitDurationPart()
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "error") {
                                reasoningAccumulator.finalize()
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "error",
                                    sourceCount,
                                    errorNote: "fallback-stream-error",
                                }))
                                emitDurationPart()
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "abort") {
                                reasoningAccumulator.finalize()
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "stopped",
                                    sourceCount,
                                }))
                                emitDurationPart()
                                writer.write(chunk)
                                break
                            }

                            ensureStart()
                            writer.write(chunk)
                        }
                    },
                })

                return createUIMessageStreamResponse({ stream })
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
