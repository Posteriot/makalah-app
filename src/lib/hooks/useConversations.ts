"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useUser } from "@clerk/nextjs"
import { Id } from "../../../convex/_generated/dataModel"

export function useConversations() {
    const { user } = useUser()
    const clerkUserId = user?.id

    // 1. Resolve Clerk ID to Convex User ID
    const userId = useQuery(
        api.chatHelpers.getUserId,
        clerkUserId ? { clerkUserId } : "skip"
    )

    // 2. Query conversations using Convex User ID
    const conversations = useQuery(
        api.conversations.listConversations,
        userId ? { userId } : "skip"
    )

    // Create conversation mutation
    const createConversationMutation = useMutation(api.conversations.createConversation)
    const deleteConversationMutation = useMutation(api.conversations.deleteConversation)

    const createNewConversation = async () => {
        if (!userId) return null
        const id = await createConversationMutation({
            userId,
            title: "Percakapan baru",
        })
        return id
    }

    const deleteConversation = async (conversationId: Id<"conversations">) => {
        await deleteConversationMutation({ conversationId })
    }

    return {
        conversations: conversations ?? [],
        createNewConversation,
        deleteConversation,
        isLoading: conversations === undefined,
        userId // exposing userId might be useful
    }
}
