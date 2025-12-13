"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

export function useMessages(conversationId: string | null) {
    // Validate if string is a valid ID format if needed, but for now we rely on the query to handle or "skip"
    // Convex IDs are opaque strings, but casting string to Id<"conversations"> assumes correctness.

    const messages = useQuery(
        api.messages.getMessages,
        conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
    )

    const createMessageMutation = useMutation(api.messages.createMessage)

    const createMessage = async (
        conversationId: Id<"conversations">,
        role: "user" | "assistant",
        content: string,
        fileIds?: Id<"files">[]
    ) => {
        return await createMessageMutation({
            conversationId,
            role,
            content,
            fileIds,
        })
    }

    return {
        messages: messages ?? [],
        createMessage,
        isLoading: messages === undefined
    }
}
