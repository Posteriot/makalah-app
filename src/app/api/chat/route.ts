import { generateTitle } from "@/lib/ai/title-generator"
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, generateText, tool, type ToolSet, stepCountIs } from "ai"
import { z } from "zod"
import type { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google"

import { auth } from "@clerk/nextjs/server"
import { getSystemPrompt } from "@/lib/ai/chat-config"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { normalizeWebSearchUrl } from "@/lib/citations/apaWeb"
import { enrichSourcesWithFetchedTitles } from "@/lib/citations/webTitle"
import { createPaperTools } from "@/lib/ai/paper-tools"
import { getPaperModeSystemPrompt } from "@/lib/ai/paper-mode-prompt"
import { hasPaperWritingIntent } from "@/lib/ai/paper-intent-detector"
import { PAPER_WORKFLOW_REMINDER } from "@/lib/ai/paper-workflow-reminder"

export async function POST(req: Request) {
    try {
        // 1. Authenticate with Clerk
        const { userId: clerkUserId } = await auth()
        if (!clerkUserId) {
            return new Response("Unauthorized", { status: 401 })
        }

        // 2. Parse request (AI SDK v5/v6 format)
        const body = await req.json()
        const { messages, conversationId, fileIds } = body

        // 3. Get Convex User ID
        const userId = await fetchQuery(api.chatHelpers.getUserId, { clerkUserId })
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

        if (!currentConversationId) {
            isNewConversation = true
            // Initial placeholder title
            const title = "Percakapan baru"

            currentConversationId = await fetchMutation(api.conversations.createConversation, {
                userId,
                title,
            })
        }

        // Background Title Generation (Fire and Forget)
        if (isNewConversation && firstUserContent) {
            // We don't await this to avoid blocking the response
            generateTitle({ userMessage: firstUserContent })
                .then(async (generatedTitle) => {
                    await fetchMutation(api.conversations.updateConversation, {
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
            const conversation = await fetchQuery(api.conversations.getConversation, {
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

                await fetchMutation(api.conversations.updateConversationTitleFromAI, {
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
                await fetchMutation(api.messages.createMessage, {
                    conversationId: currentConversationId as Id<"conversations">,
                    role: "user",
                    content: userContent,
                    fileIds: fileIds ? (fileIds as Id<"files">[]) : undefined,
                })
            }
        }

        // 6. Prepare System Prompt & Context
        const systemPrompt = await getSystemPrompt()

        // Task Group 3: Fetch paper mode system prompt if paper session exists
        const paperModePrompt = await getPaperModeSystemPrompt(currentConversationId as Id<"conversations">)

        // Flow Detection: Auto-detect paper intent and inject reminder if no session
        let paperWorkflowReminder = ""
        if (!paperModePrompt) {
            // No active paper session - check if user has paper writing intent
            const lastUserMessage = messages[messages.length - 1]
            const lastUserContent = lastUserMessage?.role === "user"
                ? (lastUserMessage.content ||
                    lastUserMessage.parts?.find((p: { type: string; text?: string }) => p.type === 'text')?.text ||
                    "")
                : ""

            if (lastUserContent && hasPaperWritingIntent(lastUserContent)) {
                paperWorkflowReminder = PAPER_WORKFLOW_REMINDER
                console.log("[Chat API] Paper intent detected, injecting workflow reminder")
            }
        }

        // Task 6.1-6.4: Fetch file records dan inject context
        let fileContext = ""
        if (fileIds && fileIds.length > 0) {
            const files = await fetchQuery(api.files.getFilesByIds, {
                fileIds: fileIds as Id<"files">[],
            })

            // Format file context based on extraction status
            for (const file of files) {
                fileContext += `[File: ${file.name}]\n`

                if (!file.extractionStatus || file.extractionStatus === "pending") {
                    // Task 6.6: Handle pending state
                    fileContext += "⏳ File sedang diproses, belum bisa dibaca oleh AI.\n\n"
                } else if (file.extractionStatus === "success" && file.extractedText) {
                    // Task 6.2-6.3: Extract and format text
                    fileContext += file.extractedText + "\n\n"
                } else if (file.extractionStatus === "failed") {
                    // Task 6.6: Handle failed state
                    const errorMsg = file.extractionError || "Unknown error"
                    fileContext += `❌ File gagal diproses: ${errorMsg}\n\n`
                }
            }
        }

        // Convert UIMessages to model messages format
        const modelMessages = convertToModelMessages(messages)

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
            ...modelMessages,
        ]

        // Import streamText and model helpers
        const { getGatewayModel, getOpenRouterModel, getGoogleSearchTool } = await import("@/lib/ai/streaming")
        const { streamText } = await import("ai")

        const decideWebSearchMode = async (options: {
            model: unknown
            recentMessages: unknown[]
        }): Promise<{ enableWebSearch: boolean; confidence: number; reason: string }> => {
            const routerPrompt = `Anda adalah "router" yang memutuskan apakah jawaban untuk user WAJIB memakai pencarian web (tool google_search).

Tujuan:
- enableWebSearch = true HANYA jika (A) user meminta cek internet/pencarian secara eksplisit, ATAU (B) pertanyaan butuh data faktual terbaru/real-time sehingga tanpa internet berisiko salah.
- Jika pertanyaan bisa dijawab tanpa data terbaru, set false.

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

        // Helper for saving
        // Helper for saving
        const saveAssistantMessage = async (content: string, sources?: { url: string; title: string }[]) => {
            await fetchMutation(api.messages.createMessage, {
                conversationId: currentConversationId as Id<"conversations">,
                role: "assistant",
                content: content,
                metadata: {
                    model: "google/gemini-2.5-flash-lite", // or dynamic
                },
                sources: sources && sources.length > 0 ? sources : undefined,
            })
        }

        // ============================================================
        // ARTIFACT TOOL - Creates standalone deliverable content
        // ============================================================
        const tools = {
            createArtifact: tool({
                description: `Create an artifact for standalone, non-conversational content that the user might want to edit, copy, or export.

USE THIS TOOL WHEN generating:
✓ Paper outlines and structures (type: "outline")
✓ Draft sections: Introduction, Methodology, Results, Discussion, Conclusion (type: "section")
✓ Code snippets for data analysis in Python, R, JavaScript, TypeScript (type: "code")
✓ Tables and formatted data (type: "table")
✓ Bibliography entries and citations (type: "citation")
✓ LaTeX mathematical formulas (type: "formula")
✓ Research summaries and abstracts (type: "section")
✓ Paraphrased paragraphs (type: "section")

DO NOT use this tool for:
✗ Explanations and teaching
✗ Discussions about concepts
✗ Questions and clarifications
✗ Suggestions and feedback
✗ Meta-conversation about writing process
✗ Short answers (less than 3 sentences)

When using this tool, always provide a clear, descriptive title (max 50 chars).`,
                inputSchema: z.object({
                    type: z.enum(["code", "outline", "section", "table", "citation", "formula"])
                        .describe("The type of artifact to create"),
                    title: z.string().max(200)
                        .describe("Short, descriptive title for the artifact (max 200 chars). Examples: 'Introduction Draft', 'Data Analysis Code', 'Research Outline'"),
                    content: z.string().min(10)
                        .describe("The actual content of the artifact"),
                    format: z.enum(["markdown", "latex", "python", "r", "javascript", "typescript"]).optional()
                        .describe("Format of the content. Use 'markdown' for text, language name for code"),
                    description: z.string().optional()
                        .describe("Optional brief description of what the artifact contains"),
                }),
                execute: async ({ type, title, content, format, description }) => {
                    // Debug logging untuk diagnosis
                    console.log("[createArtifact] Attempting to create artifact:", {
                        type,
                        title,
                        contentLength: content?.length ?? 0,
                        format,
                        conversationId: currentConversationId,
                        userId,
                    })

                    try {
                        const result = await fetchMutation(api.artifacts.create, {
                            conversationId: currentConversationId as Id<"conversations">,
                            userId: userId as Id<"users">,
                            type,
                            title,
                            content,
                            format,
                            description,
                        })

                        console.log("[createArtifact] Success:", { artifactId: result.artifactId, title })

                        return {
                            success: true,
                            artifactId: result.artifactId,
                            title,
                            message: `Artifact "${title}" berhasil dibuat. User dapat melihatnya di panel artifact.`,
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        console.error("[createArtifact] Failed:", {
                            error: errorMessage,
                            type,
                            title,
                            contentLength: content?.length ?? 0,
                            conversationId: currentConversationId,
                            userId,
                        })
                        return {
                            success: false,
                            error: `Gagal membuat artifact: ${errorMessage}`,
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
                        const conversation = await fetchQuery(api.conversations.getConversation, {
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

                        const counts = await fetchQuery(api.messages.countMessagePairsForConversation, {
                            conversationId: currentConversationId as Id<"conversations">,
                            userId,
                        })

                        if ((counts?.pairCount ?? 0) < effectiveMinPairs) {
                            return {
                                success: false,
                                error: `Belum cukup putaran percakapan (butuh minimal ${effectiveMinPairs} pasang pesan)`,
                            }
                        }

                        await fetchMutation(api.conversations.updateConversationTitleFromAI, {
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
            }),
        } satisfies ToolSet

        // 7. Stream AI Response - Dual Provider with Fallback
        try {
            const model = await getGatewayModel()
            console.log("[Chat API] Using Gateway model:", model)

            // Inject Google Search Tool for Gateway (Primary) only
            const googleSearchTool = await getGoogleSearchTool()
            const wrappedGoogleSearchTool = googleSearchTool ?? null

            // Router: tentukan apakah request ini perlu mode websearch.
            // Catatan penting: AI SDK tidak bisa mix provider-defined tools (google_search) dengan function tools dalam 1 request.
            // Jadi kita pilih salah satu tools set per request.
            const recentForRouter = modelMessages.slice(-8)
            const webSearchDecision = await decideWebSearchMode({
                model,
                recentMessages: recentForRouter,
            })

            const enableWebSearch = webSearchDecision.enableWebSearch && !!wrappedGoogleSearchTool

            console.log("[WebSearchRouter] Decision:", {
                enableWebSearch,
                confidence: webSearchDecision.confidence,
                reason: webSearchDecision.reason,
            })

            const webSearchBehaviorSystemNote = `KETENTUAN PENCARIAN WEB (google_search):
1) Gunakan tool google_search HANYA jika Anda memerlukan data faktual terbaru atau jika user memintanya secara eksplisit.
2) Jika Anda melakukan pencarian, Anda TIDAK BOLEH memanggil tool createArtifact dalam langkah (turn) yang sama.
3) Selesaikan pencarian dan diskusi data terlebih dahulu, baru kemudian buat artifact di langkah berikutnya jika diperlukan.`

            const fullMessagesGateway = enableWebSearch
                ? [
                    fullMessagesBase[0],
                    { role: "system" as const, content: webSearchBehaviorSystemNote },
                    ...fullMessagesBase.slice(1),
                ]
                : fullMessagesBase

            const gatewayTools: ToolSet = enableWebSearch
                ? ({ google_search: wrappedGoogleSearchTool } as unknown as ToolSet)
                : tools

            console.log("[Chat API] Gateway Tools Configured:", {
                webSearchModeEnabled: enableWebSearch,
                hasCreateArtifact: !!gatewayTools.createArtifact,
                hasGoogleSearch: !!gatewayTools.google_search,
                googleSearchType: typeof gatewayTools.google_search,
                // Debug: provider-defined tools should be objects with `type: "provider-defined"`.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                googleSearchToolTypeField: (gatewayTools.google_search as any)?.type,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                googleSearchToolIdField: (gatewayTools.google_search as any)?.id,
            })

            const result = streamText({
                model,
                messages: fullMessagesGateway,
                tools: gatewayTools,
                stopWhen: stepCountIs(5),
                temperature: 0.7,
                onFinish: async ({ text, providerMetadata }) => {
                    let sources: { url: string; title: string }[] | undefined

                    // Task 2.2: Extract sources from groundingMetadata (BEFORE saving message)
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
                            .filter(Boolean) as { url: string; title: string }[]
                    }

                    if (text) {
                        if (sources && sources.length > 0) {
                            sources = await enrichSourcesWithFetchedTitles(sources, {
                                concurrency: 4,
                                timeoutMs: 2500,
                            })
                        }

                        await saveAssistantMessage(text, sources)

                        // Task 2.3: Extract and log Grounding Metadata
                        if (groundingMetadata) {
                            console.log("[Chat API] Grounding Metadata received:", JSON.stringify(groundingMetadata, null, 2))
                        }

                        // Rename pertama dilakukan setelah assistant selesai merespons
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

                const stream = createUIMessageStream({
                    execute: async ({ writer }) => {
                        let started = false
                        let hasAnySource = false
                        let searchStatusClosed = false

                        const ensureStart = () => {
                            if (started) return
                            started = true
                            writer.write({ type: "start", messageId })
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

                        // Optimistis: tampilkan indikator "Mencari..." sejak awal stream (sebelum token ada).
                        ensureSearchStatusShown()

                        for await (const chunk of result.toUIMessageStream({
                            sendStart: false,
                            generateMessageId: () => messageId,
                            sendSources: true,
                        })) {
                            if (chunk.type === "source-url") {
                                hasAnySource = true
                            }

                            if (chunk.type === "finish") {
                                closeSearchStatus(hasAnySource ? "done" : "off")
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "error") {
                                closeSearchStatus("error")
                                writer.write(chunk)
                                break
                            }

                            if (chunk.type === "abort") {
                                closeSearchStatus(hasAnySource ? "done" : "off")
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

            return result.toUIMessageStreamResponse()
        } catch (error) {
            console.error("Gateway stream failed, trying fallback...", error)
            // Fallback: OpenRouter
            const fallbackModel = await getOpenRouterModel()
            console.log("[Chat API] Using OpenRouter fallback")
            const result = streamText({
                model: fallbackModel,
                messages: fullMessagesBase,
                tools,
                stopWhen: stepCountIs(5),
                temperature: 0.7,
                onFinish: async ({ text }) => {
                    if (text) {
                        await saveAssistantMessage(text)
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
            return result.toUIMessageStreamResponse()
        }

    } catch (error) {
        console.error("Chat API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
