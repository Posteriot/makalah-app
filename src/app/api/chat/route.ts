import { generateTitle } from "@/lib/ai/title-generator"
import { convertToModelMessages, tool, type ToolSet, stepCountIs } from "ai"
import { z } from "zod"
import type { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google"

import { auth } from "@clerk/nextjs/server"
import { getSystemPrompt } from "@/lib/ai/chat-config"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { normalizeWebSearchUrl } from "@/lib/citations/apaWeb"
import { enrichSourcesWithFetchedTitles } from "@/lib/citations/webTitle"

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
        const fullMessages = [
            { role: "system" as const, content: systemPrompt },
            ...(fileContext
                ? [{ role: "system" as const, content: `File Context:\n\n${fileContext}` }]
                : []),
            ...modelMessages,
        ]

        // Import streamText and model helpers
        const { getGatewayModel, getOpenRouterModel, getGoogleSearchTool } = await import("@/lib/ai/streaming")
        const { streamText } = await import("ai")

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
                    title: z.string().max(50)
                        .describe("Short, descriptive title for the artifact (max 50 chars). Examples: 'Introduction Draft', 'Data Analysis Code', 'Research Outline'"),
                    content: z.string().min(10)
                        .describe("The actual content of the artifact"),
                    format: z.enum(["markdown", "latex", "python", "r", "javascript", "typescript"]).optional()
                        .describe("Format of the content. Use 'markdown' for text, language name for code"),
                    description: z.string().optional()
                        .describe("Optional brief description of what the artifact contains"),
                }),
                execute: async ({ type, title, content, format, description }) => {
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

                        return {
                            success: true,
                            artifactId: result.artifactId,
                            title,
                            message: `Artifact "${title}" berhasil dibuat. User dapat melihatnya di panel artifact.`,
                        }
                    } catch (error) {
                        console.error("Failed to create artifact:", error)
                        return {
                            success: false,
                            error: "Gagal membuat artifact. Silakan coba lagi.",
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
        } satisfies ToolSet

        // 7. Stream AI Response - Dual Provider with Fallback
        try {
            const model = await getGatewayModel()
            console.log("[Chat API] Using Gateway model:", model)

            // Inject Google Search Tool for Gateway (Primary) only
            const googleSearchTool = await getGoogleSearchTool()
            const gatewayTools = {
                ...tools,
                ...(googleSearchTool ? { google_search: googleSearchTool } : {})
            }

            const result = streamText({
                model,
                messages: fullMessages,
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
            return result.toUIMessageStreamResponse()
        } catch (error) {
            console.error("Gateway stream failed, trying fallback...", error)
            // Fallback: OpenRouter
            const fallbackModel = await getOpenRouterModel()
            console.log("[Chat API] Using OpenRouter fallback")
            const result = streamText({
                model: fallbackModel,
                messages: fullMessages,
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
