import { useMutation } from "convex/react"
import { useEffect, useRef } from "react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

/**
 * Hook to cleanup empty conversations when user enters chat.
 * Runs once on mount when userId is available.
 * Non-blocking - errors are logged but don't interrupt user flow.
 */
export function useCleanupEmptyConversations(userId: Id<"users"> | null | undefined) {
    const cleanupMutation = useMutation(api.conversations.cleanupEmptyConversations)
    const hasRunRef = useRef(false)

    useEffect(() => {
        // Only run once per mount, when userId is available
        if (!userId || hasRunRef.current) return

        hasRunRef.current = true

        // Fire and forget - don't block UI
        cleanupMutation({ userId })
            .then((result) => {
                if (result.deletedCount > 0) {
                    console.log(`[Cleanup] Deleted ${result.deletedCount} empty conversations`)
                }
            })
            .catch((error) => {
                // Non-blocking, just log
                console.error("[Cleanup] Failed to cleanup empty conversations:", error)
            })
    }, [userId, cleanupMutation])
}
