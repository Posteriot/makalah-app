import { generateTitle } from "@/lib/ai/title-generator"

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

        // 2. Parse request
        const { messages, conversationId, fileIds } = await req.json()

        // 3. Get Convex User ID
        const userId = await fetchQuery(api.chatHelpers.getUserId, { clerkUserId })
        if (!userId) {
            return new Response("User not found in database", { status: 404 })
        }

        // 4. Handle Conversation ID (or Create New)
        let currentConversationId = conversationId
        let isNewConversation = false
        const firstUserContent = messages.find((m: { role: string; content: string }) => m.role === "user")?.content || ""

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

        // 5. Save USER message ...

        // 5. Save USER message to Convex
        // The last message in the array is the new user message
        const lastMessage = messages[messages.length - 1]
        if (lastMessage.role === "user") {
            await fetchMutation(api.messages.createMessage, {
                conversationId: currentConversationId as Id<"conversations">,
                role: "user",
                content: lastMessage.content,
                fileIds: fileIds ? (fileIds as Id<"files">[]) : undefined,
            })
        }

        // 6. Prepare System Prompt & Context
        const systemPrompt = getSystemPrompt()
        // You might append file context here if needed in the future

        const fullMessages = [
            { role: "system", content: systemPrompt },
            ...messages,
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
            const result = await streamText({
                model,
                messages: fullMessages,
                temperature: 0.7,
                onFinish: async ({ text }) => {
                    await saveAssistantMessage(text)
                },
            })
            return result.toTextStreamResponse()
        } catch (error) {
            console.error("Gateway stream failed, trying fallback...", error)
            // Fallback
            const fallbackModel = getOpenRouterModel()
            const result = await streamText({
                model: fallbackModel,
                messages: fullMessages,
                temperature: 0.7,
                onFinish: async ({ text }) => {
                    await saveAssistantMessage(text)
                },
            })
            return result.toTextStreamResponse()
        }

    } catch (error) {
        console.error("Chat API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
