"use client"

import { useCallback, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useSession } from "@/lib/auth-client"
import { Id } from "../../../convex/_generated/dataModel"

const INITIAL_CONVERSATION_LIMIT = 20
const CONVERSATION_LOAD_STEP = 20

export function useConversations() {
  const { data: session } = useSession()
  const betterAuthUserId = session?.user?.id
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_CONVERSATION_LIMIT)

  const userId = useQuery(
    api.chatHelpers.getUserId,
    betterAuthUserId ? { betterAuthUserId } : "skip"
  )

  const allConversations = useQuery(
    api.conversations.listConversations,
    userId ? { userId } : "skip"
  )

  const totalConversationCount = useQuery(
    api.conversations.countConversations,
    userId ? { userId } : "skip"
  )

  const createConversationMutation = useMutation(api.conversations.createConversation)
  const deleteConversationMutation = useMutation(api.conversations.deleteConversation)
  const bulkDeleteConversationsMutation = useMutation(api.conversations.bulkDeleteConversations)
  const deleteAllConversationsMutation = useMutation(api.conversations.deleteAllConversations)
  const updateTitleMutation = useMutation(api.conversations.updateConversationTitleFromUser)

  const resolvedAllConversations = allConversations ?? []
  const resolvedConversations = resolvedAllConversations.slice(0, visibleLimit)
  const resolvedTotalConversationCount = totalConversationCount ?? resolvedAllConversations.length
  const hasMore = resolvedConversations.length < resolvedTotalConversationCount

  const loadMore = useCallback(() => {
    setVisibleLimit((current) => current + CONVERSATION_LOAD_STEP)
  }, [])

  const resetVisibleLimit = useCallback(() => {
    setVisibleLimit(INITIAL_CONVERSATION_LIMIT)
  }, [])

  const createNewConversation = useCallback(async () => {
    if (!userId) return null
    const id = await createConversationMutation({
      userId,
      title: "Percakapan baru",
    })
    return id
  }, [createConversationMutation, userId])

  const deleteConversation = useCallback(async (conversationId: Id<"conversations">) => {
    await deleteConversationMutation({ conversationId })
  }, [deleteConversationMutation])

  const bulkDeleteConversations = useCallback(async (conversationIds: Id<"conversations">[]) => {
    if (conversationIds.length === 0) return { deletedCount: 0 }
    return await bulkDeleteConversationsMutation({ conversationIds })
  }, [bulkDeleteConversationsMutation])

  const deleteAllConversations = useCallback(async () => {
    return await deleteAllConversationsMutation({})
  }, [deleteAllConversationsMutation])

  const updateConversationTitle = useCallback(async (
    conversationId: Id<"conversations">,
    title: string
  ): Promise<{ success: boolean }> => {
    if (!userId) return { success: false }
    try {
      const result = await updateTitleMutation({
        conversationId,
        userId,
        title,
      })
      return result ?? { success: true }
    } catch {
      return { success: false }
    }
  }, [updateTitleMutation, userId])

  return {
    conversations: resolvedConversations,
    totalConversationCount: resolvedTotalConversationCount,
    displayedConversationCount: resolvedConversations.length,
    createNewConversation,
    deleteConversation,
    bulkDeleteConversations,
    deleteAllConversations,
    updateConversationTitle,
    isLoading: allConversations === undefined || totalConversationCount === undefined,
    userId,
    hasMore,
    loadMore,
    visibleLimit,
    resetVisibleLimit,
  }
}
