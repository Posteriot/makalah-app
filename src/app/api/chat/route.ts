import { generateTitle } from "@/lib/ai/title-generator"
import { convertToModelMessages } from "ai"

import { auth } from "@clerk/nextjs/server"
import { getSystemPrompt } from "@/lib/ai/chat-config"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

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
            const title = "New Chat"

            currentConversationId = await fetchMutation(api.conversations.createConversation, {
                userId,
                title,
            })
        }

        // Background Title Generation (Fire and Forget)
        if (isNewConversation && firstUserContent) {
            // We don't await this to avoid blocking the response
            generateTitle(firstUserContent)
                .then(async (generatedTitle) => {
                    await fetchMutation(api.conversations.updateConversation, {
                        conversationId: currentConversationId as Id<"conversations">,
                        title: generatedTitle
                    })
                })
                .catch(err => console.error("Background title generation error:", err))
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

        // 7. Stream AI Response and Save Assistant Message on Finish

        // Hook into the stream onFinish callback is handled by the client usually, 
        // BUT Vercel AI SDK 'streamText' result object allows `onFinish` in the `streamText` call itself.
        // However, since we wrapped it in `streamChatResponse`, we need to handle persistence differently
        // or pass a callback.
        // For simplicity with `streamText` in a route handler, we often let the client trigger the save 
        // OR we use the `onFinish` callback inside the `streamText` options.

        // REVISION: The `streamChatResponse` helper currently just returns the result. 
        // To persist the ASSISTANT response, we need to capture the full text.
        // The cleanest way in the Next.js App Router with `ai` SDK v3/v4/v5 is to use `onFinish` callback 
        // inside the `streamText` function. But our helper abstracts that.

        // FIX: We should listen to the stream server-side ? 
        // Actually, `result.toDataStreamResponse()` returns a Response object. 
        // Verification: We cannot easily attach a "save to DB" hook AFTER returning the response body 
        // unless we use `streamText({ onFinish: ... })`.

        // STRATEGY: We will modify `src/lib/ai/streaming.ts` later to accept an onFinish callback?
        // OR: We implement the streamText call DIRECTLY here to have access to `onFinish`.
        // Given the constraints, calling `streamText` directly here is safer for the "Save to Convex" requirement.
        // But we have a helper to handle Fallbacks.

        // Let's rely on the CLIENT-SIDE `useChat` hook's `onFinish` to save the assistant message for MVP?
        // NO. Spec says "Save assistant message to Convex after completion" in `CHAT-020`, implying Server-Side.
        // Relying on client is insecure and unreliable.

        // SOLUTION: We will refactor to call the helper, but since the helper returns a `StreamTextResult`, 
        // we can't easily inject onFinish into the already-executed stream.
        // We must pass the save logic INTO the helper or move the helper logic here.
        // Moving helper logic here is better for control, using helper just for Model creation.

        // Let's refactor: Use helper for `getGatewayModel` / `getOpenRouterModel` only.

        // Re-import helpers to just get models
        const { getGatewayModel, getOpenRouterModel } = await import("@/lib/ai/streaming")
        const { streamText } = await import("ai")

        // Helper for saving
        const saveAssistantMessage = async (content: string) => {
            await fetchMutation(api.messages.createMessage, {
                conversationId: currentConversationId as Id<"conversations">,
                role: "assistant",
                content: content,
                metadata: {
                    model: "google/gemini-2.5-flash-lite", // or dynamic
                }
            })
        }

        try {
            const model = getGatewayModel()
            const result = streamText({
                model,
                messages: fullMessages,
                temperature: 0.7,
                onFinish: async ({ text }) => {
                    await saveAssistantMessage(text)
                },
            })
            return result.toUIMessageStreamResponse()
        } catch (error) {
            console.error("Gateway stream failed, trying fallback...", error)
            // Fallback: OpenRouter
            const fallbackModel = getOpenRouterModel()
            const result = streamText({
                model: fallbackModel,
                messages: fullMessages,
                temperature: 0.7,
                onFinish: async ({ text }) => {
                    await saveAssistantMessage(text)
                },
            })
            return result.toUIMessageStreamResponse()
        }

    } catch (error) {
        console.error("Chat API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
