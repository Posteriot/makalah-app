/**
 * Conversation Resolution
 *
 * Creates a new conversation if no ID is provided, fires background title
 * generation, and returns a closure that can update the title from AI after
 * the assistant responds.
 */

import * as Sentry from "@sentry/nextjs"
import { generateTitle } from "@/lib/ai/title-generator"
import { retryMutation } from "@/lib/convex/retry"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { ConvexFetchQuery, ConvexFetchMutation } from "../types"

export async function resolveConversation(params: {
    conversationId: Id<"conversations"> | undefined
    userId: Id<"users">
    firstUserContent: string
    fetchQueryWithToken: ConvexFetchQuery
    fetchMutationWithToken: ConvexFetchMutation
}): Promise<{
    conversationId: Id<"conversations">
    isNewConversation: boolean
    maybeUpdateTitleFromAI: (opts: {
        assistantText: string
        minPairsForFinalTitle: number
    }) => Promise<void>
}> {
    const {
        userId,
        firstUserContent,
        fetchQueryWithToken,
        fetchMutationWithToken,
    } = params

    let currentConversationId = params.conversationId
    let isNewConversation = false

    if (!currentConversationId) {
        isNewConversation = true
        const title = "Percakapan baru"

        currentConversationId = await retryMutation(
            () =>
                fetchMutationWithToken(api.conversations.createConversation, {
                    userId,
                    title,
                }),
            "conversations.createConversation"
        )
    }

    // Background Title Generation (Fire and Forget)
    if (isNewConversation && firstUserContent) {
        generateTitle({ userMessage: firstUserContent })
            .then(async (generatedTitle) => {
                await fetchMutationWithToken(
                    api.conversations.updateConversation,
                    {
                        conversationId:
                            currentConversationId as Id<"conversations">,
                        title: generatedTitle,
                    }
                )
            })
            .catch((err) =>
                Sentry.captureException(err, {
                    tags: { subsystem: "title_generation" },
                })
            )
    }

    // Closure: update conversation title based on AI rename rules (2x max)
    const maybeUpdateTitleFromAI = async (options: {
        assistantText: string
        minPairsForFinalTitle: number
    }) => {
        const conversation = await fetchQueryWithToken(
            api.conversations.getConversation,
            {
                conversationId:
                    currentConversationId as Id<"conversations">,
            }
        )

        if (!conversation) return
        if (conversation.userId !== userId) return
        if (conversation.titleLocked) return

        const currentCount = conversation.titleUpdateCount ?? 0
        if (currentCount >= 2) return

        const placeholderTitles = new Set(["Percakapan baru", "New Chat"])
        const isPlaceholder = placeholderTitles.has(conversation.title)

        // First rename: once assistant finishes first response and title is still placeholder
        if (
            currentCount === 0 &&
            isPlaceholder &&
            firstUserContent &&
            options.assistantText
        ) {
            const generatedTitle = await generateTitle({
                userMessage: firstUserContent,
                assistantMessage: options.assistantText,
            })

            await fetchMutationWithToken(
                api.conversations.updateConversationTitleFromAI,
                {
                    conversationId:
                        currentConversationId as Id<"conversations">,
                    userId,
                    title: generatedTitle,
                    nextTitleUpdateCount: 1,
                }
            )
        }

        // Second rename (final) is not automatic here; it goes through a tool,
        // and only allowed after at least X message pairs.
        // X is used for tool validation.
        void options.minPairsForFinalTitle
    }

    return {
        conversationId: currentConversationId as Id<"conversations">,
        isNewConversation,
        maybeUpdateTitleFromAI,
    }
}
