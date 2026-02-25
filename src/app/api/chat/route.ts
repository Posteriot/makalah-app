import { generateTitle } from "@/lib/ai/title-generator"
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, generateObject, generateText, tool, type ToolSet, type ModelMessage, stepCountIs } from "ai"
import { z } from "zod"
import type { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google"

import { isAuthenticated, getToken } from "@/lib/auth-server"
import { getSystemPrompt } from "@/lib/ai/chat-config"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { retryMutation } from "@/lib/convex/retry"
import { normalizeWebSearchUrl } from "@/lib/citations/apaWeb"
import { enrichSourcesWithFetchedTitles } from "@/lib/citations/webTitle"
import { normalizeCitations, type NormalizedCitation } from "@/lib/citations/normalizer"
import { createPaperTools } from "@/lib/ai/paper-tools"
import { getPaperModeSystemPrompt } from "@/lib/ai/paper-mode-prompt"
import { hasPaperWritingIntent } from "@/lib/ai/paper-intent-detector"
import { PAPER_WORKFLOW_REMINDER } from "@/lib/ai/paper-workflow-reminder"
import { type PaperStageId } from "../../../../convex/paperSessions/constants"
import {
    isStageResearchIncomplete,
    aiIndicatedSearchIntent,
    aiIndicatedSaveIntent,
    isExplicitSaveSubmitRequest,
    isExplicitMoreSearchRequest,
    isUserConfirmation,
    getLastAssistantMessage,
    PAPER_TOOLS_ONLY_NOTE,
    getResearchIncompleteNote,
    getFunctionToolsModeNote,
} from "@/lib/ai/paper-search-helpers"
import {
    checkContextBudget,
    getContextWindow,
} from "@/lib/ai/context-budget"
import {
    checkQuotaBeforeOperation,
    recordUsageAfterOperation,
    createQuotaExceededResponse,
    type OperationType,
} from "@/lib/billing/enforcement"
import { logAiTelemetry, classifyError } from "@/lib/ai/telemetry"
import { enforceArtifactSourcesPolicy } from "@/lib/ai/artifact-sources-policy"
import { createCuratedTraceController, type PersistedCuratedTraceSnapshot } from "@/lib/ai/curated-trace"

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
                await new Promise((resolve) => setTimeout(resolve, attempt * 150))
            }
        }
        if (!convexToken) {
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
        const { messages, conversationId, fileIds } = body

        // 3. Get Convex User ID
        const userId = await fetchQueryWithToken(api.chatHelpers.getMyUserId, {})
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
                .catch(err => console.error("Background title generation error:", err))
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

            if (userContent) {
                await retryMutation(
                    () => fetchMutationWithToken(api.messages.createMessage, {
                        conversationId: currentConversationId as Id<"conversations">,
                        role: "user",
                        content: userContent,
                        fileIds: fileIds ? (fileIds as Id<"files">[]) : undefined,
                    }),
                    "messages.createMessage(user)"
                )
            }
        }

        // 6. Prepare System Prompt & Context
        const systemPrompt = await getSystemPrompt()

        // Task Group 3: Fetch paper mode system prompt if paper session exists
        const paperModePrompt = await getPaperModeSystemPrompt(
            currentConversationId as Id<"conversations">,
            convexToken
        )
        const paperSession = paperModePrompt
            ? await fetchQueryWithToken(api.paperSessions.getByConversation, {
                conversationId: currentConversationId as Id<"conversations">,
            })
            : null

        // Update billing context with paper session info
        if (paperSession) {
            billingContext.operationType = "paper_generation"
        }

        // Flow Detection: Auto-detect paper intent and inject reminder if no session
        const lastUserMessage = messages[messages.length - 1]
        const lastUserContent = lastUserMessage?.role === "user"
            ? (lastUserMessage.content ||
                lastUserMessage.parts?.find((p: { type: string; text?: string }) => p.type === "text")?.text ||
                "")
            : ""

        let paperWorkflowReminder = ""
        if (!paperModePrompt && lastUserContent && hasPaperWritingIntent(lastUserContent)) {
            paperWorkflowReminder = PAPER_WORKFLOW_REMINDER
        }

        const isExplicitSearchRequest = (text: string) => {
            const normalized = text.toLowerCase()
            const patterns = [
                /\bcari(kan)?\b/,
                /\bmencari\b/,
                /\bsearch\b/,
                /\bpencarian\b/,
                /\bgoogle\b/,
                /\binternet\b/,
                /\btautan\b/,
                /\blink\b/,
                /\burl\b/,
                /\breferensi\b/,
                /\bliteratur\b/,
                /\bsumber\b/,
                /\bdata terbaru\b/,
                /\bberita terbaru\b/,
            ]
            return patterns.some((pattern) => pattern.test(normalized))
        }

        const ACTIVE_SEARCH_STAGES: PaperStageId[] = [
            "gagasan",
            "topik",
            "pendahuluan",
            "tinjauan_literatur",
            "metodologi",
            "diskusi",
        ]
        const PASSIVE_SEARCH_STAGES: PaperStageId[] = [
            "outline",
            "abstrak",
            "hasil",
            "kesimpulan",
            "daftar_pustaka",
            "lampiran",
            "judul",
        ]

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
        if (fileIds && fileIds.length > 0) {
            const files = await fetchQueryWithToken(api.files.getFilesByIds, {
                userId: userId as Id<"users">,
                fileIds: fileIds as Id<"files">[],
            })

            // Check if paper mode is active (use paperModePrompt as indicator)
            const isPaperModeForFiles = !!paperModePrompt
            let totalCharsUsed = 0

            // Format file context based on extraction status
            for (const file of files) {
                // Check if we've exceeded total limit (paper mode only)
                if (isPaperModeForFiles && totalCharsUsed >= MAX_FILE_CONTEXT_CHARS_TOTAL) {
                    break
                }

                fileContext += `[File: ${file.name}]\n`

                if (!file.extractionStatus || file.extractionStatus === "pending") {
                    // Task 6.6: Handle pending state
                    fileContext += "⏳ File sedang diproses, belum bisa dibaca oleh AI.\n\n"
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

                    fileContext += textToAdd + "\n\n"
                } else if (file.extractionStatus === "failed") {
                    // Task 6.6: Handle failed state
                    const errorMsg = file.extractionError || "Unknown error"
                    fileContext += `❌ File gagal diproses: ${errorMsg}\n\n`
                }
            }
        }

        // Convert UIMessages to model messages format
        const rawModelMessages = convertToModelMessages(messages)

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

                // Handle content array - convert to string
                if (Array.isArray(msg.content)) {
                    // Extract text content dari array
                    const textParts = msg.content
                        .filter((part): part is { type: "text"; text: string } =>
                            typeof part === "object" &&
                            part !== null &&
                            "type" in part &&
                            part.type === "text" &&
                            "text" in part &&
                            typeof part.text === "string"
                        )
                        .map((part) => part.text)

                    // Jika tidak ada text parts, skip message ini
                    if (textParts.length === 0) {
                        return null
                    }

                    return {
                        ...msg,
                        content: textParts.join("\n"),
                    }
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
        // ════════════════════════════════════════════════════════════════
        const MAX_CHAT_HISTORY_PAIRS = 20 // 20 pairs = 40 messages max
        const isPaperMode = !!paperModePrompt

        let trimmedModelMessages = modelMessages
        if (isPaperMode && modelMessages.length > MAX_CHAT_HISTORY_PAIRS * 2) {
            trimmedModelMessages = modelMessages.slice(-MAX_CHAT_HISTORY_PAIRS * 2)
        }

        // ════════════════════════════════════════════════════════════════
        // Artifact Sources Context: Fetch recent web search sources from database
        // This enables AI to pass sources to createArtifact tool
        // ════════════════════════════════════════════════════════════════
        let sourcesContext = ""
        let hasRecentSourcesInDb = false
        try {
            const recentSources = await fetchQueryWithToken(api.messages.getRecentSources, {
                conversationId: currentConversationId as Id<"conversations">,
                limit: 5,
            })

            if (recentSources && recentSources.length > 0) {
                hasRecentSourcesInDb = true
                const sourcesJson = JSON.stringify(recentSources, null, 2)
                sourcesContext = `
AVAILABLE_WEB_SOURCES (dari hasil web search sebelumnya):
${sourcesJson}

PENTING: Jika kamu membuat artifact yang BERBASIS informasi dari sumber-sumber di atas,
WAJIB pass array sources ini ke parameter 'sources' di tool createArtifact atau updateArtifact.
Ini memungkinkan inline citation [1], [2] berfungsi dengan benar di artifact.`
            }
        } catch (sourcesError) {
            console.error("[route] Failed to fetch recent sources:", sourcesError)
            // Non-blocking - continue without sources context
        }

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
            ...(sourcesContext
                ? [{ role: "system" as const, content: sourcesContext }]
                : []),
            ...trimmedModelMessages,
        ]

        // Import streamText and model helpers
        const {
            getGatewayModel,
            getOpenRouterModel,
            getGoogleSearchTool,
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

        if (budget.shouldPrune) {
            console.warn(
                `[Context Budget] Pruning: ${budget.totalTokens} tokens > ${budget.threshold} threshold. Messages: ${fullMessagesBase.length}`
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

        if (budget.shouldWarn && !budget.shouldPrune) {
            console.info(
                `[Context Budget] Warning: ${budget.totalTokens} tokens approaching threshold ${budget.threshold}.`
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
                    return Array.isArray(data?.referensiAwal) && data?.referensiAwal.length > 0
                }
                case "topik": {
                    const data = stageData.topik as { referensiPendukung?: unknown[] } | undefined
                    return Array.isArray(data?.referensiPendukung) && data?.referensiPendukung.length > 0
                }
                case "tinjauan_literatur": {
                    const data = stageData.tinjauan_literatur as { referensi?: unknown[] } | undefined
                    return Array.isArray(data?.referensi) && data?.referensi.length > 0
                }
                case "pendahuluan": {
                    const data = stageData.pendahuluan as { sitasiAPA?: unknown[] } | undefined
                    return Array.isArray(data?.sitasiAPA) && data?.sitasiAPA.length > 0
                }
                case "diskusi": {
                    const data = stageData.diskusi as { sitasiTambahan?: unknown[] } | undefined
                    return Array.isArray(data?.sitasiTambahan) && data?.sitasiTambahan.length > 0
                }
                case "daftar_pustaka": {
                    const data = stageData.daftar_pustaka as { entries?: unknown[] } | undefined
                    return Array.isArray(data?.entries) && data?.entries.length > 0
                }
                default:
                    return null
            }
        }

        const hasStageRingkasan = (session: {
            currentStage?: string
            stageData?: Record<string, unknown>
        } | null): boolean => {
            if (!session || !session.stageData || !session.currentStage) {
                return false
            }
            if (session.currentStage === "completed") {
                return false
            }

            const stageKey = session.currentStage
            const stageEntry = session.stageData[stageKey] as { ringkasan?: unknown } | undefined
            return typeof stageEntry?.ringkasan === "string" && stageEntry.ringkasan.trim().length > 0
        }

        // Helper: detect if previous turns already have search results (sources)
        // STAGE-AWARE logic:
        // 1. stageData evidence is AUTHORITATIVE (if exists, search is definitely done)
        // 2. For ACTIVE stages without stageData evidence, check RECENT messages (last 1 turn)
        //    - This catches "search done but not yet saved" scenario
        //    - Limited to 1 turn to avoid false positives from old stage citations
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
                    .filter((m): m is { role: string; content?: string } =>
                        typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
                    )
                    .slice(-3)

                for (const msg of recentAssistantMsgs) {
                    const content = typeof msg.content === "string" ? msg.content : ""
                    // Check for citations / search evidence in recent messages
                    if (/\[\d+(?:,\s*\d+)*\]/.test(content)) return true
                    if (/berdasarkan hasil pencarian/i.test(content)) return true
                    if (/menurut .+\(\d{4}\)/i.test(content)) return true
                    if (/saya telah melakukan pencarian/i.test(content)) return true
                    if (/rangkuman temuan/i.test(content)) return true
                }
                return false
            }

            // PASSIVE/unknown stage (stageEvidence === null) → check more messages as fallback
            const recentAssistantMsgs = msgs
                .filter((m): m is { role: string; content?: string } =>
                    typeof m === "object" && m !== null && "role" in m && (m as { role: string }).role === "assistant"
                )
                .slice(-3) // Check last 3 assistant messages

            for (const msg of recentAssistantMsgs) {
                const content = typeof msg.content === "string" ? msg.content : ""
                // Check for inline citation markers [1], [2], [1,2], [1,2,3], etc.
                if (/\[\d+(?:,\s*\d+)*\]/.test(content)) return true
                // Check for common patterns indicating search was done
                if (/berdasarkan hasil pencarian/i.test(content)) return true
                if (/menurut .+\(\d{4}\)/i.test(content)) return true // APA citation pattern
            }
            return false
        }

        // Helper: detect if user message is a confirmation/approval (should prefer paper tools over search)
        const isUserConfirmationMessage = (text: string): boolean => {
            if (isExplicitSearchRequest(text)) {
                return false
            }
            const normalized = text.toLowerCase().trim()
            // Short confirmations
            if (normalized.length <= 400) {
                const confirmationPatterns = [
                    /^(ya|yes|ok|oke|okay|yup|yep|sip|siap|baik|boleh)\.?$/i,
                    /^setuju\.?$/i,
                    /^lanjut(kan)?\.?$/i,
                    /^silakan\.?$/i,
                    /^approve\.?$/i,
                    /^simpan\.?$/i,
                    /^save\.?$/i,
                    /sudah (bagus|oke|ok|baik)/i,
                    /tidak ada (revisi|perubahan)/i,
                    /sudah sesuai/i,
                    /sudah puas/i,
                ]
                if (confirmationPatterns.some(p => p.test(normalized))) return true
            }
            return false
        }

        const decideWebSearchMode = async (options: {
            model: unknown
            recentMessages: unknown[]
            isPaperMode: boolean
            currentStage: PaperStageId | "completed" | undefined | null
            stagePolicy: "active" | "passive" | "none"
            searchAlreadyDone: boolean
            isUserConfirmation: boolean
        }): Promise<{ enableWebSearch: boolean; confidence: number; reason: string }> => {
            // CRITICAL: If user is confirming/approving, prefer paper tools for save/artifact
            if (options.isUserConfirmation && options.isPaperMode) {
                return {
                    enableWebSearch: false,
                    confidence: 0.95,
                    reason: "user_confirmation_prefer_paper_tools"
                }
            }

            // CRITICAL: If search was already done in previous turns, prefer paper tools
            // This prevents the "stuck in search mode" bug
            if (options.searchAlreadyDone && options.isPaperMode) {
                return {
                    enableWebSearch: false,
                    confidence: 0.9,
                    reason: "search_already_done_prefer_paper_tools"
                }
            }

            const paperModeContext = options.isPaperMode
                ? `

KONTEKS PENTING - PAPER MODE AKTIF:
Current stage: ${options.currentStage ?? "unknown"}
Stage policy: ${options.stagePolicy.toUpperCase()}

Aturan stage policy (HARUS dipatuhi):
- Jika policy = PASSIVE: enableWebSearch = true HANYA jika user EKSPLISIT minta search.
- Jika policy = ACTIVE: enableWebSearch boleh true jika user minta search atau model butuh data faktual.

Catatan tambahan:
- Referensi dan data faktual HARUS dari web search, TIDAK BOLEH di-hallucinate.
- Set false jika user meminta simpan/approve hasil yang sudah ada, ATAU semua data sudah tersedia dari pencarian sebelumnya.`
                : ""

            const routerPrompt = `Anda adalah "router" yang memutuskan apakah jawaban untuk user WAJIB memakai pencarian web (tool google_search).

Tujuan:
- enableWebSearch = true jika:
  (A) user meminta cek internet/pencarian/referensi, ATAU
  (B) AI akan menyertakan referensi/literatur/sumber dalam jawabannya, ATAU
  (C) AI membutuhkan DATA FAKTUAL (statistik, angka, fakta, nama, tanggal, peristiwa) yang berisiko salah jika di-hallucinate.
- PENTING: Untuk MENCEGAH HALUSINASI, selalu enableWebSearch = true jika jawaban memerlukan data faktual yang spesifik.
- Set false HANYA jika: user meminta simpan/approve data yang sudah ada, ATAU jawaban murni opini/diskusi tanpa klaim faktual.
${paperModeContext}

Aturan output:
- Output HARUS satu JSON object SAJA.
- TANPA markdown, TANPA backticks, TANPA penjelasan di luar JSON.
- confidence 0..1.

JSON schema:
{
  "enableWebSearch": boolean,
  "confidence": number,
  "reason": string
}`

            const routerSchema = z.object({
                enableWebSearch: z.boolean(),
                confidence: z.number().min(0).max(1),
                reason: z.string().max(500),
            })

            const runStructuredRouter = async () => {
                const { object } = await generateObject({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    model: options.model as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    messages: [{ role: "system", content: routerPrompt }, ...(options.recentMessages as any[])],
                    schema: routerSchema,
                    temperature: 0.2,
                })
                return object
            }

            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    const result = await runStructuredRouter()
                    return {
                        enableWebSearch: result.enableWebSearch,
                        confidence: result.confidence,
                        reason: result.reason,
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
                return { enableWebSearch: false, confidence: 0, reason: "router_invalid_json_shape" }
            }

            try {
                const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
                    enableWebSearch?: unknown
                    confidence?: unknown
                    reason?: unknown
                }

                const enableWebSearch = parsed.enableWebSearch === true
                const confidenceRaw = typeof parsed.confidence === "number" ? parsed.confidence : 0
                const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0
                const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 240) : ""

                return { enableWebSearch, confidence, reason }
            } catch {
                return { enableWebSearch: false, confidence: 0, reason: "router_json_parse_failed" }
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
                    trace.headline || "Agen lagi memproses jawaban...",
                    "Agen lagi memproses jawaban."
                ),
                traceMode: trace.traceMode === "transparent" ? "transparent" : "curated",
                completedAt: Number.isFinite(trace.completedAt) ? trace.completedAt : Date.now(),
                steps,
            }
        }

        const saveAssistantMessage = async (
            content: string,
            sources?: { url: string; title: string; publishedAt?: number | null }[],
            usedModel?: string, // Model name from config (primary or fallback)
            reasoningTrace?: PersistedCuratedTraceSnapshot
        ) => {
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
                    },
                    sources: normalizedSources && normalizedSources.length > 0 ? normalizedSources : undefined,
                    reasoningTrace: sanitizeReasoningTraceForPersistence(reasoningTrace),
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

Supported types: flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, mindmap, timeline, journey, gitgraph, quadrantChart, xychart, block-beta, sankey-beta.

📚 SOURCES: Jika konten artifact BERASAL dari hasil web search sebelumnya, WAJIB pass parameter 'sources' dengan URL dan judul dari referensi yang digunakan. Ini memastikan inline citations [1], [2] di artifact terhubung ke sumber yang benar.`,
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
                        const policy = enforceArtifactSourcesPolicy({
                            hasRecentSourcesInDb,
                            sources,
                            operation: "createArtifact",
                        })
                        if (!policy.allowed) {
                            return {
                                success: false,
                                error: policy.error,
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

                        return {
                            success: true,
                            artifactId: result.artifactId,
                            title,
                            message: `Artifact "${title}" berhasil dibuat. User dapat melihatnya di panel artifact.`,
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error)
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

📚 SOURCES: Jika update konten BERASAL dari hasil web search, WAJIB pass parameter 'sources' dengan array sumber referensi. Sources dari versi sebelumnya akan otomatis dipertahankan jika tidak di-pass.

PENTING: Gunakan artifactId yang ada di context percakapan atau yang diberikan AI sebelumnya.`,
                inputSchema: z.object({
                    artifactId: z.string()
                        .describe("ID dari artifact yang akan di-update. Harus artifact yang sudah ada."),
                    content: z.string().min(10)
                        .describe("Konten baru untuk artifact (akan menggantikan konten sebelumnya)"),
                    title: z.string().max(200).optional()
                        .describe("Judul baru (opsional). Jika tidak diisi, judul lama dipertahankan."),
                    sources: z.array(z.object({
                        url: z.string(),
                        title: z.string(),
                        publishedAt: z.number().optional(),
                    })).optional()
                        .describe("Web sources jika update berbasis web search. Jika tidak diisi, sources dari versi sebelumnya dipertahankan."),
                }),
                execute: async ({ artifactId, content, title, sources }) => {
                    try {
                        const policy = enforceArtifactSourcesPolicy({
                            hasRecentSourcesInDb,
                            sources,
                            operation: "updateArtifact",
                        })
                        if (!policy.allowed) {
                            return {
                                success: false,
                                error: policy.error,
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

                        return {
                            success: true,
                            newArtifactId: result.artifactId,
                            oldArtifactId: artifactId,
                            version: result.version,
                            message: `Artifact berhasil di-update ke versi ${result.version}. User dapat melihat versi baru di panel artifact.`,
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        console.error("[updateArtifact] Failed:", errorMessage)
                        return {
                            success: false,
                            error: `Gagal update artifact: ${errorMessage}`,
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

        // Helper: accumulate reasoning deltas and emit progressive thought events
        function createReasoningAccumulator(opts: {
            traceId: string
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            writer: { write: (data: any) => void }
            ensureStart: () => void
            enabled: boolean
        }) {
            let buffer = ""
            let chunkCount = 0
            const { sanitizeReasoningDelta } = require("@/lib/ai/reasoning-sanitizer") as typeof import("@/lib/ai/reasoning-sanitizer")

            return {
                onReasoningDelta: (delta: string) => {
                    if (!opts.enabled || !delta) return
                    buffer += delta
                    chunkCount += 1

                    if (chunkCount % 3 === 0 || delta.length > 100) {
                        const sanitized = sanitizeReasoningDelta(delta)
                        if (sanitized.trim()) {
                            opts.ensureStart()
                            opts.writer.write({
                                type: "data-reasoning-thought",
                                id: `${opts.traceId}-thought-${chunkCount}`,
                                data: {
                                    traceId: opts.traceId,
                                    delta: sanitized,
                                    ts: Date.now(),
                                },
                            })
                        }
                    }
                },
                getFullReasoning: () => buffer,
                hasReasoning: () => buffer.length > 0,
            }
        }

        try {
            const model = await getGatewayModel()

            // Inject Google Search Tool for Gateway (Primary) only
            const googleSearchTool = await getGoogleSearchTool()
            const wrappedGoogleSearchTool = googleSearchTool ?? null

            // Router: tentukan apakah request ini perlu mode websearch.
            // Catatan penting: AI SDK tidak bisa mix provider-defined tools (google_search) dengan function tools dalam 1 request.
            // Jadi kita pilih salah satu tools set per request.
            const recentForRouter = modelMessages.slice(-8)
            const currentStage = paperSession?.currentStage as PaperStageId | "completed" | undefined
            const stagePolicy = getStageSearchPolicy(currentStage)
            const searchAlreadyDone = hasPreviousSearchResults(modelMessages, paperSession) || hasRecentSourcesInDb

            // Force disable web search if paper intent detected but no session yet
            // This allows AI to call startPaperSession tool first before any web search
            const forcePaperToolsMode = !!paperWorkflowReminder && !paperModePrompt

            // ════════════════════════════════════════════════════════════════
            // ACTIVE STAGE OVERRIDE: Deterministic search decision
            // Bypasses non-deterministic LLM router for ACTIVE stages
            // 3-Layer Protection:
            // 1. Task-based: Check stageData completion (referensi fields)
            // 2. Intent-based: Check AI's previous promise to search
            // 3. Language-based: Check explicit save/submit patterns
            // ════════════════════════════════════════════════════════════════
            let activeStageSearchReason = ""
            let activeStageSearchNote = ""

            if (stagePolicy === "active" && paperSession && !forcePaperToolsMode) {
                // Layer 1: Task-based - check if research is incomplete
                const { incomplete, requirement } = isStageResearchIncomplete(
                    paperSession.stageData as Record<string, unknown> | undefined,
                    currentStage as PaperStageId
                )

                // Layer 2: Intent-based - check AI's previous promise
                const lastAssistantMsg = getLastAssistantMessage(modelMessages as Array<{ role: string; content?: string | unknown }>)
                const aiPromisedSearch = lastAssistantMsg ? aiIndicatedSearchIntent(lastAssistantMsg) : false
                const aiPromisedSave = lastAssistantMsg ? aiIndicatedSaveIntent(lastAssistantMsg) : false

                // Layer 3: Language-based - check user's explicit request
                const userWantsToSave = isExplicitSaveSubmitRequest(lastUserContent)
                const userConfirms = isUserConfirmation(lastUserContent)

                // Decision logic (deterministic, prioritized)
                // Key insight: User intent (save/search) should be respected over automatic decisions
                if (searchAlreadyDone) {
                    // Priority 1: Search already done - only enable if user EXPLICITLY wants MORE
                    const wantsMoreSearch = isExplicitMoreSearchRequest(lastUserContent)
                    if (wantsMoreSearch) {
                        enableWebSearch = !!wrappedGoogleSearchTool
                        activeStageSearchReason = "user_wants_more_search"
                    } else {
                        enableWebSearch = false
                        activeStageSearchReason = "search_already_done"
                        activeStageSearchNote = getFunctionToolsModeNote("Search selesai")
                    }
                } else if (userWantsToSave) {
                    // Priority 2: User explicitly wants to save → no search
                    enableWebSearch = false
                    activeStageSearchReason = "explicit_save_request"
                } else if (aiPromisedSave && userConfirms) {
                    // Priority 3: AI promised to save AND user confirms → honor save intent
                    // e.g., AI: "Saya akan menyimpan..." → User: "Lakukan"
                    enableWebSearch = false
                    activeStageSearchReason = "ai_promised_save_user_confirms"
                } else if (userConfirms && !aiPromisedSearch) {
                    // Priority 3b: User confirmation without explicit search promise
                    // Prefer paper tools to avoid repetitive search loops.
                    enableWebSearch = false
                    activeStageSearchReason = "user_confirmation_prefer_paper_tools"
                } else if (aiPromisedSearch) {
                    // Priority 4: AI promised search → honor search promise
                    enableWebSearch = !!wrappedGoogleSearchTool
                    activeStageSearchReason = "ai_promised_search"
                } else if (incomplete) {
                    // Priority 5: Research incomplete → suggest search (but don't force if user doesn't want)
                    enableWebSearch = !!wrappedGoogleSearchTool
                    activeStageSearchReason = "research_incomplete"
                    activeStageSearchNote = getResearchIncompleteNote(currentStage as string, requirement!)
                } else {
                    // Priority 5: Default → FUNCTION TOOLS (safer default)
                    enableWebSearch = false
                    activeStageSearchReason = "active_stage_default_function_tools"
                    activeStageSearchNote = PAPER_TOOLS_ONLY_NOTE
                }

                // Inject note when search is disabled in paper mode
                if (!enableWebSearch && paperModePrompt && !activeStageSearchNote) {
                    activeStageSearchNote = PAPER_TOOLS_ONLY_NOTE
                }

                console.log(`[SearchDecision] ACTIVE stage override: ${activeStageSearchReason}, searchAlreadyDone: ${searchAlreadyDone}, enableWebSearch: ${enableWebSearch}`)
            } else {
                // PASSIVE/NONE stages OR no paper session: use existing LLM router logic
                const isUserConfirmation = isUserConfirmationMessage(lastUserContent)
                const webSearchDecision = await decideWebSearchMode({
                    model,
                    recentMessages: recentForRouter,
                    isPaperMode: !!paperModePrompt,
                    currentStage,
                    stagePolicy,
                    searchAlreadyDone,
                    isUserConfirmation,
                })

                const routerFailed = ["router_invalid_json_shape", "router_json_parse_failed"].includes(
                    webSearchDecision.reason
                )
                const explicitSearchRequest = lastUserContent
                    ? isExplicitSearchRequest(lastUserContent)
                    : false
                const explicitSearchFallback = routerFailed && explicitSearchRequest

                const stagePolicyAllowsSearch = !paperModePrompt
                    ? true
                    : (stagePolicy === "active"
                        ? true
                        : stagePolicy === "passive"
                            ? explicitSearchRequest
                            : explicitSearchRequest)

                enableWebSearch = !!wrappedGoogleSearchTool
                    && !forcePaperToolsMode
                    && stagePolicyAllowsSearch
                    && (webSearchDecision.enableWebSearch || explicitSearchFallback || explicitSearchRequest)
            }
            // For ACTIVE stages with explicit save request, force submit validation
            // Use isExplicitSaveSubmitRequest since isUserConfirmation is now scoped to else block
            const shouldForceSubmitValidation = !enableWebSearch
                && !!paperModePrompt
                && (
                    activeStageSearchReason === "explicit_save_request" ||
                    activeStageSearchReason === "ai_promised_save_user_confirms" ||
                    activeStageSearchReason === "user_confirmation_prefer_paper_tools" ||
                    isExplicitSaveSubmitRequest(lastUserContent)
                )
                && paperSession?.stageStatus === "drafting"
                && hasStageRingkasan(paperSession)

            const primaryReasoningProviderOptions = buildReasoningProviderOptions({
                settings: reasoningSettings,
                target: "primary",
                profile: enableWebSearch || shouldForceSubmitValidation ? "tool-heavy" : "narrative",
            })

            const webSearchBehaviorSystemNote = `⚠️ MODE PENCARIAN WEB AKTIF - BACA INI DENGAN TELITI!

CONSTRAINT TEKNIS PENTING:
- Dalam mode ini, HANYA tool "google_search" yang tersedia.
- Tool lain (createArtifact, updateArtifact, updateStageData, submitStageForValidation, renameConversationTitle) TIDAK TERSEDIA dan TIDAK BISA dipanggil.
- Jika Anda mencoba memanggil tool selain google_search, panggilan akan GAGAL.

YANG HARUS ANDA LAKUKAN DI TURN INI:
1) Lakukan pencarian dengan google_search jika diperlukan
2) Rangkum temuan dari pencarian
3) AKHIRI respons Anda di sini - JANGAN coba menyimpan data atau membuat artifact

YANG HARUS ANDA LAKUKAN DI TURN BERIKUTNYA (setelah user merespons):
- Baru di turn berikutnya Anda bisa menyimpan draf (updateStageData) atau membuat artifact (createArtifact)
- Tool-tool tersebut akan tersedia kembali setelah pencarian selesai

TIPS PENCARIAN:
- Hindari halaman listing/tag/homepage sebagai sumber utama
- Utamakan URL artikel/siaran pers yang spesifik
- Tulis klaim faktual secara ringkas per kalimat`

            const fullMessagesGateway = enableWebSearch
                ? [
                    fullMessagesBase[0],
                    { role: "system" as const, content: webSearchBehaviorSystemNote },
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
                    ...fullMessagesBase.slice(1),
                ]

            const gatewayTools: ToolSet = enableWebSearch
                ? ({ google_search: wrappedGoogleSearchTool } as unknown as ToolSet)
                : tools
            // Web search mode: limit to 1 step to prevent AI from trying to call
            // function tools (which don't exist in web search mode) after search
            const maxToolSteps = enableWebSearch ? 1 : 5
            let primaryReasoningTraceController: ReturnType<typeof createCuratedTraceController> | null = null
            let primaryReasoningTraceSnapshot: PersistedCuratedTraceSnapshot | undefined
            let primaryReasoningSourceCount = 0

            const capturePrimaryReasoningSnapshot = () => {
                if (!primaryReasoningTraceController?.enabled) return
                primaryReasoningTraceSnapshot = primaryReasoningTraceController.getPersistedSnapshot()
            }

            const result = streamText({
                model,
                messages: fullMessagesGateway,
                tools: gatewayTools,
                ...(primaryReasoningProviderOptions ? { providerOptions: primaryReasoningProviderOptions } : {}),
                toolChoice: shouldForceSubmitValidation
                    ? { type: "tool", toolName: "submitStageForValidation" }
                    : undefined,
                stopWhen: stepCountIs(maxToolSteps),
                ...samplingOptions,
                onFinish: enableWebSearch
                    ? undefined
                    : async ({ text, providerMetadata, usage }) => {
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

                        if (text) {
                            if (sources && sources.length > 0) {
                                sources = await enrichSourcesWithFetchedTitles(sources, {
                                    concurrency: 4,
                                    timeoutMs: 2500,
                                })
                            }

                            const persistedReasoningTrace = (() => {
                                if (!reasoningTraceEnabled) return undefined
                                if (primaryReasoningTraceSnapshot) return primaryReasoningTraceSnapshot
                                if (!primaryReasoningTraceController?.enabled) return undefined
                                primaryReasoningTraceController.finalize({
                                    outcome: "done",
                                    sourceCount: primaryReasoningSourceCount,
                                })
                                capturePrimaryReasoningSnapshot()
                                return primaryReasoningTraceSnapshot
                            })()

                            await saveAssistantMessage(
                                text,
                                sources,
                                modelNames.primary.model,
                                persistedReasoningTrace
                            )

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
                                }).catch(err => console.error("[Billing] Failed to record usage:", err))
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
                                mode: isPaperMode ? "paper" : "normal",
                                success: true,
                                latencyMs: Date.now() - telemetryStartTime,
                                inputTokens: usage?.inputTokens,
                                outputTokens: usage?.outputTokens,
                            })
                            // ═════════════════════════════════════════════════

                            const minPairsForFinalTitle = Number.parseInt(
                                process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                                10
                            )
                            await maybeUpdateTitleFromAI({
                                assistantText: text,
                                minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                                    ? minPairsForFinalTitle
                                    : 3,
                            })
                        }
                    },
            })

            // Indikator pencarian (inline) untuk grounding web:
            // - Karena `google_search` adalah provider-defined tool, event tool `tool-input-*` bisa nggak muncul sama sekali.
            // - AI SDK merekomendasikan status/progress UI lewat `data-*` parts (Streaming Custom Data).
            // - Jadi kita kirim `data-search` secara optimistis di awal stream, lalu matikan di akhir.
            //   Kalau ternyata tidak ada `source-url` yang muncul, status ditutup sebagai `off`.
            if (enableWebSearch) {
	                const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
	                const searchStatusId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-search`
	                const citedTextId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-cited-text`
	                const citedSourcesId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-cited-sources`
                    const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`
                    const reasoningTrace = createCuratedTraceController({
                        enabled: reasoningTraceEnabled,
                        traceId,
                        mode: getTraceModeLabel(!!paperModePrompt, true),
                        stage: currentStage && currentStage !== "completed" ? currentStage : undefined,
                        webSearchEnabled: true,
                    })
                    primaryReasoningTraceController = reasoningTrace

	                const stream = createUIMessageStream({
	                    execute: async ({ writer }) => {
	                        let started = false
	                        let hasAnySource = false
                        let sourceCount = 0
                        let searchStatusClosed = false
                        let streamedText = ""
                        let lastProviderMetadata: unknown = null

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

                        const ensureSearchStatusShown = () => {
                            ensureStart()
                            writer.write({
                                type: "data-search",
                                id: searchStatusId,
                                data: {
                                    status: "searching",
                                },
                            })
                        }

                        const closeSearchStatus = (finalStatus: "done" | "off" | "error") => {
                            if (searchStatusClosed) return
                            searchStatusClosed = true
                            ensureStart()
                            writer.write({
                                type: "data-search",
                                id: searchStatusId,
                                data: {
                                    status: finalStatus,
                                },
                            })
                        }

                        const reasoningAccumulator = createReasoningAccumulator({
                            traceId,
                            writer,
                            ensureStart,
                            enabled: isTransparentReasoning,
                        })

                        // Optimistis: tampilkan indikator "Mencari..." sejak awal stream (sebelum token ada).
                        ensureSearchStatusShown()
                        emitTrace(reasoningTrace.initialEvents)

                        for await (const chunk of result.toUIMessageStream({
                            sendStart: false,
                            generateMessageId: () => messageId,
                            sendSources: true,
                            sendReasoning: isTransparentReasoning,
                        })) {
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
                                hasAnySource = true
                                sourceCount += 1
                                primaryReasoningSourceCount = sourceCount
                                emitTrace(reasoningTrace.markSourceDetected())
                            }

                            if (chunk.type === "tool-input-start") {
                                const toolName = getToolNameFromChunk(chunk)
                                emitTrace(reasoningTrace.markToolRunning(toolName))
                            }


                            if (
                                "providerMetadata" in chunk &&
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (chunk as any).providerMetadata
                            ) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                lastProviderMetadata = (chunk as any).providerMetadata
                            }

                            if (chunk.type === "text-delta") {
                                streamedText += chunk.delta
                            }

                            if (chunk.type === "finish") {
                                closeSearchStatus(hasAnySource ? "done" : "off")
                                let didFinalizeForPersist = false

                                type SourceWithChunk = {
                                    url: string
                                    title: string
                                    publishedAt?: number | null
                                    chunkIndices: number[]
                                }

                                type GroundingChunk = {
                                    web?: { uri?: string; title?: string }
                                }

                                type GroundingSupport = {
                                    segment?: { endIndex?: number }
                                    groundingChunkIndices?: number[]
                                }

                                type ProviderMetadataWithGoogle = {
                                    google?: GoogleGenerativeAIProviderMetadata
                                }

                                const isRecord = (value: unknown): value is Record<string, unknown> =>
                                    typeof value === "object" && value !== null

                                const hasGroundingMetadata = (value: unknown): value is ProviderMetadataWithGoogle => {
                                    if (!isRecord(value)) return false
                                    if (!("google" in value)) return false
                                    const google = (value as ProviderMetadataWithGoogle).google
                                    return isRecord(google) && "groundingMetadata" in google
                                }

                                const getGroundingChunks = (meta: unknown): GroundingChunk[] | undefined => {
                                    if (!isRecord(meta)) return undefined
                                    const raw = (meta as { groundingChunks?: unknown }).groundingChunks
                                    if (!Array.isArray(raw)) return undefined
                                    return raw.filter((chunk): chunk is GroundingChunk => isRecord(chunk))
                                }

                                const getGroundingSupports = (meta: unknown): GroundingSupport[] | undefined => {
                                    if (!isRecord(meta)) return undefined
                                    const raw = (meta as { groundingSupports?: unknown }).groundingSupports
                                    if (!Array.isArray(raw)) return undefined
                                    return raw.filter((support): support is GroundingSupport => isRecord(support))
                                }

                                const isVertexProxyUrl = (raw: string) => {
                                    try {
                                        const u = new URL(raw)
                                        const host = u.hostname.toLowerCase()
                                        return host === "vertexaisearch.cloud.google.com" || host.startsWith("vertexaisearch.cloud.google.")
                                    } catch {
                                        return false
                                    }
                                }

                                const isLowValueCitationUrl = (raw: string) => {
                                    try {
                                        const u = new URL(raw)
                                        const host = u.hostname.toLowerCase()
                                        const path = u.pathname || "/"
                                        const trimmedPath = path.replace(/\/+$/, "") || "/"
                                        const segments = trimmedPath.split("/").filter(Boolean)

                                        if (path === "/" || path === "") return true
                                        if (/(^|\/)(tag|tags|topik|topic|search)(\/|$)/i.test(path)) return true
                                        if (segments.length === 1) {
                                            const only = segments[0].toLowerCase()
                                            if (["berita", "news", "artikel", "articles", "posts", "post"].includes(only)) return true
                                        }
                                        if ((host === "google.com" || host === "www.google.com") && path === "/search") return true

                                        return false
                                    } catch {
                                        return false
                                    }
                                }

                                const canonicalizeCitationUrl = (raw: string) => {
                                    try {
                                        const u = new URL(raw)
                                        for (const key of Array.from(u.searchParams.keys())) {
                                            if (/^utm_/i.test(key)) u.searchParams.delete(key)
                                        }
                                        u.hash = ""
                                        const out = u.toString()
                                        return out.endsWith("/") ? out.slice(0, -1) : out
                                    } catch {
                                        return raw
                                    }
                                }

                                const stripToPersistedSources = (items: SourceWithChunk[]) =>
                                    items.map((s) => ({
                                        url: s.url,
                                        title: s.title,
                                        ...(typeof s.publishedAt === "number" && Number.isFinite(s.publishedAt)
                                            ? { publishedAt: s.publishedAt }
                                            : {}),
                                    }))

                                const buildChunkIndexToCitationNumber = (items: SourceWithChunk[]) => {
                                    const out = new Map<number, number>()
                                    items.forEach((src, idx) => {
                                        const n = idx + 1
                                        for (const ci of src.chunkIndices) out.set(ci, n)
                                    })
                                    return out
                                }

                                const insertInlineCitations = (
                                    inputText: string,
                                    items: SourceWithChunk[],
                                    groundingSupports: GroundingSupport[] | undefined
                                ) => {
                                    if (!groundingSupports || items.length === 0) return inputText

                                    const chunkToNumber = buildChunkIndexToCitationNumber(items)
                                    if (chunkToNumber.size === 0) return inputText

                                    const insertsMap = new Map<number, Set<number>>()

                                    const isSentenceBoundaryChar = (ch: string) => ch === "." || ch === "?" || ch === "!" || ch === "\n"

                                    const findSentenceEnd = (text: string, pos: number) => {
                                        const clamped = Math.max(0, Math.min(text.length - 1, pos))
                                        for (let i = clamped; i < text.length; i += 1) {
                                            const ch = text[i]
                                            if (!isSentenceBoundaryChar(ch)) continue
                                            if (ch === "\n") return Math.max(0, i - 1)
                                            return i
                                        }
                                        return text.length - 1
                                    }

                                    for (const s of groundingSupports) {
                                        const seg = s?.segment
                                        const endIndex = typeof seg?.endIndex === "number" ? seg.endIndex : null
                                        if (endIndex === null || !Number.isFinite(endIndex)) continue
                                        const indices = Array.isArray(s?.groundingChunkIndices) ? s.groundingChunkIndices : []
                                        const numbersSet = new Set<number>()
                                        for (const rawIndex of indices) {
                                            if (typeof rawIndex !== "number") continue
                                            const mapped = chunkToNumber.get(rawIndex)
                                            if (typeof mapped === "number" && Number.isFinite(mapped)) {
                                                numbersSet.add(mapped)
                                            }
                                        }
                                        const numbers = Array.from(numbersSet).sort((a, b) => a - b)
                                        if (numbers.length === 0) continue

                                        const sentenceEnd = findSentenceEnd(
                                            inputText,
                                            Math.max(0, Math.min(inputText.length - 1, endIndex - 1))
                                        )
                                        const existing = insertsMap.get(sentenceEnd) ?? new Set<number>()
                                        numbers.forEach((n) => existing.add(n))
                                        insertsMap.set(sentenceEnd, existing)
                                    }

                                    if (insertsMap.size === 0) return inputText

                                    const inserts = Array.from(insertsMap.entries())
                                        .map(([at, set]) => ({ at, numbers: Array.from(set).sort((a, b) => a - b) }))
                                        .sort((a, b) => b.at - a.at)

                                    let out = inputText
                                    for (const ins of inserts) {
                                        const marker = ` [${ins.numbers.join(",")}]`
                                        const before = out.slice(0, ins.at + 1)
                                        const after = out.slice(ins.at + 1)
                                        const tail = before.slice(-20)
                                        if (/\[\d+(?:\s*,\s*\d+)*\]\s*$/.test(tail)) continue
                                        out = `${before}${marker}${after}`
                                    }

                                    return out
                                }

                                try {
                                    // providerMetadata kadang tidak ikut kebawa di chunk; ambil dari result sebagai fallback.
                                    const providerMetadataFromResult = await (async () => {
                                        try {
                                            return await Promise.race([
                                                result.providerMetadata,
                                                new Promise<undefined>((resolve) =>
                                                    setTimeout(() => resolve(undefined), 8000)
                                                ),
                                            ])
                                        } catch {
                                            return undefined
                                        }
                                    })()
                                    const preferredProviderMetadata = hasGroundingMetadata(lastProviderMetadata)
                                        ? lastProviderMetadata
                                        : providerMetadataFromResult

                                    const googleMetadata = hasGroundingMetadata(preferredProviderMetadata)
                                        ? preferredProviderMetadata.google
                                        : undefined
                                    const groundingMetadata = googleMetadata?.groundingMetadata
                                    const chunks = getGroundingChunks(groundingMetadata)
                                    const supports = getGroundingSupports(groundingMetadata)

                                    const usedChunkIndices = (() => {
                                        const out = new Set<number>()
                                        if (!supports) return out
                                        for (const s of supports) {
                                            const indices = s?.groundingChunkIndices as unknown
                                            if (!Array.isArray(indices)) continue
                                            for (const raw of indices) {
                                                if (typeof raw === "number" && Number.isFinite(raw)) out.add(raw)
                                            }
                                        }
                                        return out
                                    })()

                                    let sources: SourceWithChunk[] = []
                                    if (chunks) {
                                        const rawSources = chunks
                                            .map((chunk, idx) => ({ chunk, idx }))
                                            .filter(({ idx }) => usedChunkIndices.size === 0 || usedChunkIndices.has(idx))
                                            .map(({ chunk, idx }) => {
                                                const uri = chunk.web?.uri
                                                if (typeof uri === "string" && uri.length > 0) {
                                                    const normalizedUrl = normalizeWebSearchUrl(uri)
                                                    const title = typeof chunk.web?.title === "string" ? chunk.web.title : normalizedUrl
                                                    return {
                                                        url: normalizedUrl,
                                                        title,
                                                        chunkIndex: idx,
                                                    }
                                                }
                                                return null
                                            })
                                            .filter((item): item is { url: string; title: string; chunkIndex: number } => !!item)

                                        sources = rawSources.map((s) => ({
                                            url: s.url,
                                            title: s.title,
                                            chunkIndices: [s.chunkIndex],
                                        }))
                                    }

                                    if (sources.length > 0) {
                                        sources = await enrichSourcesWithFetchedTitles(sources, {
                                            concurrency: 4,
                                            timeoutMs: 2500,
                                        })

                                        const deduped = new Map<string, SourceWithChunk>()
                                        for (const src of sources) {
                                            const key = canonicalizeCitationUrl(src.url)
                                            const existing = deduped.get(key)
                                            if (!existing) {
                                                deduped.set(key, src)
                                                continue
                                            }

                                            const existingIsProxy = isVertexProxyUrl(existing.url)
                                            const currentIsProxy = isVertexProxyUrl(src.url)
                                            if (existingIsProxy && !currentIsProxy) {
                                                deduped.set(key, {
                                                    ...src,
                                                    chunkIndices: Array.from(new Set([...existing.chunkIndices, ...src.chunkIndices])),
                                                })
                                                continue
                                            }

                                            if (!existing.publishedAt && src.publishedAt) {
                                                deduped.set(key, {
                                                    ...existing,
                                                    publishedAt: src.publishedAt,
                                                    chunkIndices: Array.from(new Set([...existing.chunkIndices, ...src.chunkIndices])),
                                                })
                                            } else {
                                                deduped.set(key, {
                                                    ...existing,
                                                    chunkIndices: Array.from(new Set([...existing.chunkIndices, ...src.chunkIndices])),
                                                })
                                            }
                                        }
                                        sources = Array.from(deduped.values())

                                        const hasHighValue = sources.some((s) => !isVertexProxyUrl(s.url) && !isLowValueCitationUrl(s.url))
                                        if (hasHighValue) {
                                            sources = sources.filter((s) => !isVertexProxyUrl(s.url) && !isLowValueCitationUrl(s.url))
                                        } else {
                                            const hasNonProxy = sources.some((s) => !isVertexProxyUrl(s.url))
                                            if (hasNonProxy) sources = sources.filter((s) => !isVertexProxyUrl(s.url))
                                        }
                                    }

                                    const textWithInlineCitations = insertInlineCitations(streamedText, sources, supports)
                                    const persistedSources = sources.length > 0 ? stripToPersistedSources(sources) : undefined

                                    ensureStart()
                                    writer.write({
                                        type: "data-cited-text",
                                        id: citedTextId,
                                        data: { text: textWithInlineCitations },
                                    })

                                    if (persistedSources && persistedSources.length > 0) {
                                        ensureStart()
                                        writer.write({
                                            type: "data-cited-sources",
                                            id: citedSourcesId,
                                            data: { sources: persistedSources },
                                        })
                                    }

                                    if (reasoningAccumulator.hasReasoning()) {
                                        emitTrace(reasoningTrace.populateFromReasoning(
                                            reasoningAccumulator.getFullReasoning()
                                        ))
                                    }

                                    const doneTraceEvents = reasoningTrace.finalize({
                                        outcome: "done",
                                        sourceCount,
                                    })
                                    emitTrace(doneTraceEvents)
                                    didFinalizeForPersist = true
                                    const persistedReasoningTrace = reasoningTrace.enabled
                                        ? reasoningTrace.getPersistedSnapshot()
                                        : undefined

                                    await saveAssistantMessage(
                                        textWithInlineCitations,
                                        persistedSources,
                                        modelNames.primary.model,
                                        persistedReasoningTrace
                                    )

                                    // ──── Auto-persist search references to paper stageData ────
                                    if (paperSession && persistedSources && persistedSources.length > 0) {
                                        try {
                                            await fetchMutationWithToken(api.paperSessions.appendSearchReferences, {
                                                sessionId: paperSession._id,
                                                references: persistedSources.map(s => ({
                                                    url: s.url,
                                                    title: s.title,
                                                    ...(typeof s.publishedAt === "number" && Number.isFinite(s.publishedAt)
                                                        ? { publishedAt: s.publishedAt }
                                                        : {}),
                                                })),
                                            })
                                            console.log(`[Paper] Auto-persisted ${persistedSources.length} search refs to stageData`)
                                        } catch (err) {
                                            console.error("[Paper] Failed to auto-persist search references:", err)
                                            // Non-blocking: don't fail the response stream
                                        }
                                    }
                                    // ───────────────────────────────────────────────────────────

                                    const minPairsForFinalTitle = Number.parseInt(
                                        process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                                        10
                                    )
                                    await maybeUpdateTitleFromAI({
                                        assistantText: textWithInlineCitations,
                                        minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                                            ? minPairsForFinalTitle
                                            : 3,
                                    })

                                    // ═══ BILLING: Record token usage (web search primary) ═══
                                    // Extract usage from finish chunk if available
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const finishUsage = (chunk as any).usage
                                    if (finishUsage) {
                                        await recordUsageAfterOperation({
                                            userId: billingContext.userId,
                                            conversationId: currentConversationId as Id<"conversations">,
                                            sessionId: paperSession?._id,
                                            inputTokens: finishUsage.inputTokens ?? 0,
                                            outputTokens: finishUsage.outputTokens ?? 0,
                                            totalTokens: (finishUsage.inputTokens ?? 0) + (finishUsage.outputTokens ?? 0),
                                            model: modelNames.primary.model,
                                            operationType: "web_search",
                                            convexToken,
                                        }).catch(err => console.error("[Billing] Failed to record usage:", err))
                                    }
                                    // ═══════════════════════════════════════════════════════════

                                    // ═══ TELEMETRY: Primary websearch success ═══
                                    logAiTelemetry({
                                        token: convexToken,
                                        userId: userId as Id<"users">,
                                        conversationId: currentConversationId as Id<"conversations">,
                                        provider: modelNames.primary.provider as "vercel-gateway" | "openrouter",
                                        model: modelNames.primary.model,
                                        isPrimaryProvider: true,
                                        failoverUsed: false,
                                        toolUsed: "google_search",
                                        mode: "websearch",
                                        success: true,
                                        latencyMs: Date.now() - telemetryStartTime,
                                        inputTokens: finishUsage?.inputTokens,
                                        outputTokens: finishUsage?.outputTokens,
                                    })
                                    // ═════════════════════════════════════════════
                                } catch (err) {
                                    console.error("[Chat API] Failed to compute inline citations:", err)
                                }

                                if (!didFinalizeForPersist) {
                                    if (reasoningAccumulator.hasReasoning()) {
                                        emitTrace(reasoningTrace.populateFromReasoning(
                                            reasoningAccumulator.getFullReasoning()
                                        ))
                                    }
                                    emitTrace(reasoningTrace.finalize({
                                        outcome: "done",
                                        sourceCount,
                                    }))
                                }
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "error") {
                                closeSearchStatus("error")
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "error",
                                    sourceCount,
                                    errorNote: "primary-websearch-stream-error",
                                }))
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "abort") {
                                closeSearchStatus(hasAnySource ? "done" : "off")
                                const stoppedTraceEvents = reasoningTrace.finalize({
                                    outcome: "stopped",
                                    sourceCount,
                                })
                                emitTrace(stoppedTraceEvents)
                                const persistedReasoningTrace = reasoningTrace.enabled
                                    ? reasoningTrace.getPersistedSnapshot()
                                    : undefined
                                // Save partial message on abort to prevent data loss
                                if (streamedText.trim()) {
                                    try {
                                        await saveAssistantMessage(
                                            streamedText,
                                            undefined,
                                            modelNames.primary.model,
                                            persistedReasoningTrace
                                        )
                                        console.log("[Chat API] Saved partial message on stream abort")
                                    } catch (err) {
                                        console.error("[Chat API] Failed to save partial message on abort:", err)
                                    }
                                }
                                writer.write(chunk)
                                break
                            }

                            // Tulis chunk normal
                            ensureStart()
                            writer.write(chunk)
                        }
                    },
                })

                return createUIMessageStreamResponse({ stream })
            }

            {
                const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
                const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`
                const reasoningTrace = createCuratedTraceController({
                    enabled: reasoningTraceEnabled,
                    traceId,
                    mode: getTraceModeLabel(!!paperModePrompt, false),
                    stage: currentStage && currentStage !== "completed" ? currentStage : undefined,
                    webSearchEnabled: false,
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

                        const reasoningAccumulator = createReasoningAccumulator({
                            traceId,
                            writer,
                            ensureStart,
                            enabled: isTransparentReasoning,
                        })

                        emitTrace(reasoningTrace.initialEvents)

                        for await (const chunk of result.toUIMessageStream({
                            sendStart: false,
                            generateMessageId: () => messageId,
                            sendReasoning: isTransparentReasoning,
                        })) {
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
                                if (reasoningAccumulator.hasReasoning()) {
                                    emitTrace(reasoningTrace.populateFromReasoning(
                                        reasoningAccumulator.getFullReasoning()
                                    ))
                                }
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "done",
                                    sourceCount,
                                }))
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "error") {
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "error",
                                    sourceCount,
                                    errorNote: "primary-stream-error",
                                }))
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "abort") {
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "stopped",
                                    sourceCount,
                                }))
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
                toolUsed: enableWebSearch ? "google_search" : undefined,
                mode: enableWebSearch ? "websearch" : (isPaperMode ? "paper" : "normal"),
                success: false,
                errorType: primaryErrorInfo.errorType,
                errorMessage: primaryErrorInfo.errorMessage,
                latencyMs: Date.now() - telemetryStartTime,
            })
            // ════════════════════════════════════════════

            // ════════════════════════════════════════════════════════════════
            // FALLBACK: OpenRouter with optional web search
            // Task 2.2-2.6: Enhanced fallback with :online web search support
            // ════════════════════════════════════════════════════════════════

            // Get web search config from database
            const webSearchConfig = await getWebSearchConfig()

            // Determine if web search should be enabled in fallback
            // Requires: 1) primary path wanted web search, AND 2) fallback web search is enabled in config
            const fallbackEnableWebSearch =
                enableWebSearch
                && webSearchConfig.fallbackEnabled
                && modelNames.fallback.provider === "openrouter"

            const fallbackReasoningProviderOptions = buildReasoningProviderOptions({
                settings: reasoningSettings,
                target: "fallback",
                profile: fallbackEnableWebSearch ? "tool-heavy" : "narrative",
            })

            // Task 2.6: Helper to run fallback WITHOUT web search (for error recovery)
            const runFallbackWithoutSearch = async () => {
                let fallbackReasoningTraceController: ReturnType<typeof createCuratedTraceController> | null = null
                let fallbackReasoningTraceSnapshot: PersistedCuratedTraceSnapshot | undefined
                let fallbackReasoningSourceCount = 0
                const captureFallbackReasoningSnapshot = () => {
                    if (!fallbackReasoningTraceController?.enabled) return
                    fallbackReasoningTraceSnapshot = fallbackReasoningTraceController.getPersistedSnapshot()
                }

                const fallbackModel = await getOpenRouterModel({ enableWebSearch: false })
                const result = streamText({
                    model: fallbackModel,
                    messages: fullMessagesBase,
                    tools,
                    ...(fallbackReasoningProviderOptions ? { providerOptions: fallbackReasoningProviderOptions } : {}),
                    stopWhen: stepCountIs(5),
                    ...samplingOptions,
                    onFinish: async ({ text, usage }) => {
                        if (text) {
                            const persistedReasoningTrace = (() => {
                                if (!reasoningTraceEnabled) return undefined
                                if (fallbackReasoningTraceSnapshot) return fallbackReasoningTraceSnapshot
                                if (!fallbackReasoningTraceController?.enabled) return undefined
                                fallbackReasoningTraceController.finalize({
                                    outcome: "done",
                                    sourceCount: fallbackReasoningSourceCount,
                                })
                                captureFallbackReasoningSnapshot()
                                return fallbackReasoningTraceSnapshot
                            })()

                            await saveAssistantMessage(
                                text,
                                undefined,
                                modelNames.fallback.model,
                                persistedReasoningTrace
                            )
                            const minPairsForFinalTitle = Number.parseInt(
                                process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                                10
                            )
                            await maybeUpdateTitleFromAI({
                                assistantText: text,
                                minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                                    ? minPairsForFinalTitle
                                    : 3,
                            })

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
                                }).catch(err => console.error("[Billing] Failed to record usage:", err))
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
                                mode: isPaperMode ? "paper" : "normal",
                                success: true,
                                latencyMs: Date.now() - telemetryStartTime,
                                inputTokens: usage?.inputTokens,
                                outputTokens: usage?.outputTokens,
                            })
                            // ═════════════════════════════════════════════════
                        }
                    },
                })
                const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
                const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`
                const reasoningTrace = createCuratedTraceController({
                    enabled: reasoningTraceEnabled,
                    traceId,
                    mode: getTraceModeLabel(!!paperModePrompt, false),
                    stage: paperSession?.currentStage && paperSession.currentStage !== "completed"
                        ? paperSession.currentStage
                        : undefined,
                    webSearchEnabled: false,
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

                        const fallbackTransparent = isTransparentReasoning && reasoningSettings.fallback.supported
                        const reasoningAccumulator = createReasoningAccumulator({
                            traceId,
                            writer,
                            ensureStart,
                            enabled: fallbackTransparent,
                        })

                        emitTrace(reasoningTrace.initialEvents)

                        for await (const chunk of result.toUIMessageStream({
                            sendStart: false,
                            generateMessageId: () => messageId,
                            sendReasoning: fallbackTransparent,
                        })) {
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
                                if (reasoningAccumulator.hasReasoning()) {
                                    emitTrace(reasoningTrace.populateFromReasoning(
                                        reasoningAccumulator.getFullReasoning()
                                    ))
                                }
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "done",
                                    sourceCount,
                                }))
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "error") {
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "error",
                                    sourceCount,
                                    errorNote: "fallback-stream-error",
                                }))
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "abort") {
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "stopped",
                                    sourceCount,
                                }))
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

            // Task 2.2: Non-web-search fallback (unchanged behavior)
            if (!fallbackEnableWebSearch) {
                return runFallbackWithoutSearch()
            }

            // Task 2.2: Web search mode in fallback
            try {
                const fallbackModel = await getOpenRouterModel({ enableWebSearch: true })

                // Generate unique IDs for stream parts
                const messageId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
                const searchStatusId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-search`
                const citedTextId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-cited-text`
                const citedSourcesId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-cited-sources`
                const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-trace`
                const reasoningTrace = createCuratedTraceController({
                    enabled: reasoningTraceEnabled,
                    traceId,
                    mode: getTraceModeLabel(!!paperModePrompt, true),
                    stage: paperSession?.currentStage && paperSession.currentStage !== "completed"
                        ? paperSession.currentStage
                        : undefined,
                    webSearchEnabled: true,
                })

                const stream = createUIMessageStream({
                    execute: async ({ writer }) => {
                        let started = false
                        let sourceCount = 0
                        let searchStatusClosed = false
                        let streamedText = ""
                        let lastProviderMetadata: unknown = null

                        const ensureStart = () => {
                            if (started) return
                            started = true
                            writer.write({ type: "start", messageId })
                        }

                        const emitTrace = (events: ReturnType<typeof reasoningTrace.markToolRunning>) => {
                            if (!reasoningTrace.enabled || events.length === 0) return
                            ensureStart()
                            for (const event of events) {
                                writer.write(event)
                            }
                        }

                        const closeSearchStatus = (finalStatus: "done" | "off" | "error") => {
                            if (searchStatusClosed) return
                            searchStatusClosed = true
                            ensureStart()
                            writer.write({
                                type: "data-search",
                                id: searchStatusId,
                                data: { status: finalStatus },
                            })
                        }

                        const fallbackTransparent = isTransparentReasoning && reasoningSettings.fallback.supported
                        const reasoningAccumulator = createReasoningAccumulator({
                            traceId,
                            writer,
                            ensureStart,
                            enabled: fallbackTransparent,
                        })

                        // Show searching indicator immediately
                        ensureStart()
                        writer.write({
                            type: "data-search",
                            id: searchStatusId,
                            data: { status: "searching" },
                        })
                        emitTrace(reasoningTrace.initialEvents)

                        // Stream from OpenRouter with :online
                        const result = streamText({
                            model: fallbackModel,
                            messages: fullMessagesBase,
                            // Note: :online handles search internally, no tools needed
                            ...(fallbackReasoningProviderOptions ? { providerOptions: fallbackReasoningProviderOptions } : {}),
                            ...samplingOptions,
                        })

                        for await (const chunk of result.toUIMessageStream({
                            sendStart: false,
                            generateMessageId: () => messageId,
                            sendReasoning: fallbackTransparent,
                        })) {
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
                                emitTrace(reasoningTrace.markSourceDetected())
                            }

                            if (chunk.type === "tool-input-start") {
                                const toolName = getToolNameFromChunk(chunk)
                                emitTrace(reasoningTrace.markToolRunning(toolName))
                            }


                            // Capture provider metadata from chunks
                            if (
                                "providerMetadata" in chunk &&
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (chunk as any).providerMetadata
                            ) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                lastProviderMetadata = (chunk as any).providerMetadata
                            }

                            if (chunk.type === "text-delta") {
                                streamedText += chunk.delta
                            }

                            if (chunk.type === "finish") {
                                let persistedReasoningTrace: PersistedCuratedTraceSnapshot | undefined
                                let didFinalizeForPersist = false
                                // Task 2.3: Extract OpenRouter annotations from response
                                const providerMetadataFromResult = await (async () => {
                                    try {
                                        return await Promise.race([
                                            result.providerMetadata,
                                            new Promise<undefined>((resolve) =>
                                                setTimeout(() => resolve(undefined), 8000)
                                            ),
                                        ])
                                    } catch {
                                        return undefined
                                    }
                                })()

                                const preferredMetadata = lastProviderMetadata ?? providerMetadataFromResult

                                // Task 2.4: Normalize citations using the normalization layer
                                let normalizedCitations: NormalizedCitation[] = []

                                if (preferredMetadata) {
                                    // Try to extract annotations from OpenRouter response
                                    // OpenRouter annotations can be at different paths
                                    normalizedCitations = normalizeCitations(preferredMetadata, 'openrouter')
                                }

                                const hasAnyCitations = normalizedCitations.length > 0
                                sourceCount = Math.max(sourceCount, normalizedCitations.length)
                                closeSearchStatus(hasAnyCitations ? "done" : "off")

                                // Task 2.4: Insert inline citation markers
                                let textWithCitations = streamedText
                                if (hasAnyCitations) {
                                    // Simple inline citation insertion
                                    // For OpenRouter, citations typically come with position data
                                    // Insert [1], [2] markers based on citation order
                                    const insertions: { position: number; marker: string }[] = []
                                    normalizedCitations.forEach((citation, idx) => {
                                        if (citation.endIndex !== undefined) {
                                            insertions.push({
                                                position: citation.endIndex,
                                                marker: ` [${idx + 1}]`,
                                            })
                                        }
                                    })

                                    // Sort by position descending to insert from end
                                    insertions.sort((a, b) => b.position - a.position)
                                    for (const ins of insertions) {
                                        if (ins.position >= 0 && ins.position <= textWithCitations.length) {
                                            textWithCitations =
                                                textWithCitations.slice(0, ins.position) +
                                                ins.marker +
                                                textWithCitations.slice(ins.position)
                                        }
                                    }
                                }

                                // Send cited text
                                ensureStart()
                                writer.write({
                                    type: "data-cited-text",
                                    id: citedTextId,
                                    data: { text: textWithCitations },
                                })

                                // Send cited sources if available
                                if (hasAnyCitations) {
                                    const persistedSources = normalizedCitations.map((c) => ({
                                        url: c.url,
                                        title: c.title,
                                        ...(c.publishedAt ? { publishedAt: c.publishedAt } : {}),
                                    }))

                                    ensureStart()
                                    writer.write({
                                        type: "data-cited-sources",
                                        id: citedSourcesId,
                                        data: { sources: persistedSources },
                                    })

                                    if (reasoningAccumulator.hasReasoning()) {
                                        emitTrace(reasoningTrace.populateFromReasoning(
                                            reasoningAccumulator.getFullReasoning()
                                        ))
                                    }

                                    const doneTraceEvents = reasoningTrace.finalize({
                                        outcome: "done",
                                        sourceCount,
                                    })
                                    emitTrace(doneTraceEvents)
                                    didFinalizeForPersist = true
                                    persistedReasoningTrace = reasoningTrace.enabled
                                        ? reasoningTrace.getPersistedSnapshot()
                                        : undefined

                                    // Task 2.5: Save to database with fallback metadata
                                    await saveAssistantMessage(
                                        textWithCitations,
                                        persistedSources,
                                        `${modelNames.fallback.model}:online`,
                                        persistedReasoningTrace
                                    )

                                    // ──── Auto-persist search references to paper stageData ────
                                    if (paperSession && persistedSources.length > 0) {
                                        try {
                                            await fetchMutationWithToken(api.paperSessions.appendSearchReferences, {
                                                sessionId: paperSession._id,
                                                references: persistedSources.map(s => ({
                                                    url: s.url,
                                                    title: s.title,
                                                    ...(typeof s.publishedAt === "number" && Number.isFinite(s.publishedAt)
                                                        ? { publishedAt: s.publishedAt }
                                                        : {}),
                                                })),
                                            })
                                            console.log(`[Paper][Fallback] Auto-persisted ${persistedSources.length} search refs to stageData`)
                                        } catch (err) {
                                            console.error("[Paper][Fallback] Failed to auto-persist search references:", err)
                                        }
                                    }
                                    // ───────────────────────────────────────────────────────────
                                } else {
                                    if (reasoningAccumulator.hasReasoning()) {
                                        emitTrace(reasoningTrace.populateFromReasoning(
                                            reasoningAccumulator.getFullReasoning()
                                        ))
                                    }

                                    const doneTraceEvents = reasoningTrace.finalize({
                                        outcome: "done",
                                        sourceCount,
                                    })
                                    emitTrace(doneTraceEvents)
                                    didFinalizeForPersist = true
                                    persistedReasoningTrace = reasoningTrace.enabled
                                        ? reasoningTrace.getPersistedSnapshot()
                                        : undefined

                                    // No citations - save without sources
                                    await saveAssistantMessage(
                                        textWithCitations,
                                        undefined,
                                        `${modelNames.fallback.model}:online`,
                                        persistedReasoningTrace
                                    )
                                }

                                // Update title if needed
                                const minPairsForFinalTitle = Number.parseInt(
                                    process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                                    10
                                )
                                await maybeUpdateTitleFromAI({
                                    assistantText: textWithCitations,
                                    minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                                        ? minPairsForFinalTitle
                                        : 3,
                                })

                                // ═══ BILLING: Record token usage (fallback web search) ═══
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const finishUsage = (chunk as any).usage
                                if (finishUsage) {
                                    await recordUsageAfterOperation({
                                        userId: billingContext.userId,
                                        conversationId: currentConversationId as Id<"conversations">,
                                        sessionId: paperSession?._id,
                                        inputTokens: finishUsage.inputTokens ?? 0,
                                        outputTokens: finishUsage.outputTokens ?? 0,
                                        totalTokens: (finishUsage.inputTokens ?? 0) + (finishUsage.outputTokens ?? 0),
                                        model: `${modelNames.fallback.model}:online`,
                                        operationType: "web_search",
                                        convexToken,
                                    }).catch(err => console.error("[Billing] Failed to record usage:", err))
                                }
                                // ═══════════════════════════════════════════════════════════

                                // ═══ TELEMETRY: Fallback websearch success ═══
                                logAiTelemetry({
                                    token: convexToken,
                                    userId: userId as Id<"users">,
                                    conversationId: currentConversationId as Id<"conversations">,
                                    provider: modelNames.fallback.provider as "vercel-gateway" | "openrouter",
                                    model: modelNames.fallback.model,
                                    isPrimaryProvider: false,
                                    failoverUsed: true,
                                    toolUsed: "google_search",
                                    mode: "websearch",
                                    success: true,
                                    latencyMs: Date.now() - telemetryStartTime,
                                    inputTokens: finishUsage?.inputTokens,
                                    outputTokens: finishUsage?.outputTokens,
                                })
                                // ═════════════════════════════════════════════

                                if (!didFinalizeForPersist) {
                                    if (reasoningAccumulator.hasReasoning()) {
                                        emitTrace(reasoningTrace.populateFromReasoning(
                                            reasoningAccumulator.getFullReasoning()
                                        ))
                                    }
                                    emitTrace(reasoningTrace.finalize({
                                        outcome: "done",
                                        sourceCount,
                                    }))
                                }
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "error") {
                                closeSearchStatus("error")
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "error",
                                    sourceCount,
                                    errorNote: "fallback-websearch-stream-error",
                                }))
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "abort") {
                                closeSearchStatus("off")
                                emitTrace(reasoningTrace.finalize({
                                    outcome: "stopped",
                                    sourceCount,
                                }))
                                writer.write(chunk)
                                break
                            }

                            // Forward other chunks
                            ensureStart()
                            writer.write(chunk)
                        }
                    },
                })

                return createUIMessageStreamResponse({ stream })
            } catch (onlineError) {
                // Task 2.6: :online failed, graceful degradation to non-search mode
                console.error("[Fallback] :online stream failed, retrying without search:", onlineError)
                return runFallbackWithoutSearch()
            }
        }

    } catch (error) {
        console.error("Chat API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
