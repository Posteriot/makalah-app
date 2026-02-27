"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

export function useMessages(conversationId: string | null) {
    // Validate if string is a valid ID format if needed, but for now we rely on the query to handle or "skip"
    // Convex IDs are opaque strings, but casting string to Id<"conversations"> assumes correctness.

    const messages = useQuery(
        api.messages.getMessages,
        conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
    )

    return {
        messages: messages ?? [],
        isLoading: messages === undefined
    }
}
