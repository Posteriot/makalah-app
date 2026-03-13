"use client"

import { useCallback } from "react"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useSession } from "@/lib/auth-client"
import { Id } from "../../../convex/_generated/dataModel"

const INITIAL_CONVERSATION_LIMIT = 20
const CONVERSATION_LOAD_STEP = 20

export function useConversations() {
  const { data: session } = useSession()
  const betterAuthUserId = session?.user?.id

  const userId = useQuery(
    api.chatHelpers.getMyUserId,
    betterAuthUserId ? {} : "skip"
  )

  const {
    results: windowConversations,
    status: paginationStatus,
    loadMore: loadMoreWindow,
  } = usePaginatedQuery(
    api.conversations.listConversationsWindow,
    userId ? { userId } : "skip",
    { initialNumItems: INITIAL_CONVERSATION_LIMIT }
  )

  const createConversationMutation = useMutation(api.conversations.createConversation)
  const deleteConversationMutation = useMutation(api.conversations.deleteConversation)
  const bulkDeleteConversationsMutation = useMutation(api.conversations.bulkDeleteConversations)
  const deleteAllConversationsMutation = useMutation(api.conversations.deleteAllConversations)
  const updateTitleMutation = useMutation(api.conversations.updateConversationTitleFromUser)

  const resolvedConversations = windowConversations
  const hasMore = paginationStatus === "CanLoadMore"

  const loadMore = useCallback(() => {
    loadMoreWindow(CONVERSATION_LOAD_STEP)
  }, [loadMoreWindow])

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
    totalConversationCount: undefined,
    displayedConversationCount: resolvedConversations.length,
    createNewConversation,
    deleteConversation,
    bulkDeleteConversations,
    deleteAllConversations,
    updateConversationTitle,
    isLoading: paginationStatus === "LoadingFirstPage",
    userId,
    hasMore,
    loadMore,
  }
}
