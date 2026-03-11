"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ConversationManagerTable } from "@/components/chat/workspace-manager/ConversationManagerTable"
import { WorkspacePanelShell } from "./WorkspacePanelShell"

const PAGE_SIZE = 10

interface ConversationManagerPanelProps {
  currentConversationId?: string | null
  onClose: () => void
}

export function ConversationManagerPanel({
  currentConversationId = null,
  onClose,
}: ConversationManagerPanelProps) {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const bulkDeleteConversations = useMutation(api.conversations.bulkDeleteConversations)
  const deleteAllConversations = useMutation(api.conversations.deleteAllConversations)
  const deleteConversation = useMutation(api.conversations.deleteConversation)

  const paginatedConversations = useQuery(
    api.conversations.listConversationsPaginated,
    user?._id
      ? {
          userId: user._id,
          page,
          pageSize: PAGE_SIZE,
        }
      : "skip"
  )

  const handleRedirectIfCurrentConversationDeleted = (ids: string[]) => {
    if (currentConversationId && ids.includes(currentConversationId)) {
      router.push("/chat")
    }
  }

  const content = (() => {
    if (isUserLoading || paginatedConversations === undefined) {
      return (
        <ConversationManagerTable
          items={[]}
          totalCount={0}
          page={page}
          pageSize={PAGE_SIZE}
          isLoading={true}
          onPageChange={setPage}
          onDeleteSingle={async () => {}}
        />
      )
    }

    if (!user) {
      return (
        <div className="px-5 py-4 text-sm text-[var(--chat-muted-foreground)]">
          Data percakapan belum tersedia. Muat ulang halaman chat.
        </div>
      )
    }

    return (
      <ConversationManagerTable
        key={`${paginatedConversations.page}:${paginatedConversations.items.map((item) => item._id).join(":")}`}
        items={paginatedConversations.items}
        totalCount={paginatedConversations.totalCount}
        page={paginatedConversations.page}
        pageSize={paginatedConversations.pageSize}
        isLoading={false}
        onPageChange={setPage}
        onDeleteSingle={async (id) => {
          await deleteConversation({ conversationId: id as never })
          handleRedirectIfCurrentConversationDeleted([id])
          const remainingCount = Math.max(0, paginatedConversations.totalCount - 1)
          const nextTotalPages = Math.max(
            1,
            Math.ceil(remainingCount / paginatedConversations.pageSize)
          )
          if (page > nextTotalPages) {
            setPage(nextTotalPages)
          }
        }}
        onDeleteSelected={async (ids) => {
          if (ids.length === 0) return
          await bulkDeleteConversations({ conversationIds: ids as never })
          handleRedirectIfCurrentConversationDeleted(ids)
          const remainingCount = Math.max(0, paginatedConversations.totalCount - ids.length)
          const nextTotalPages = Math.max(
            1,
            Math.ceil(remainingCount / paginatedConversations.pageSize)
          )
          if (page > nextTotalPages) {
            setPage(nextTotalPages)
          }
        }}
        onDeleteAll={async () => {
          await deleteAllConversations({})
          if (currentConversationId) {
            router.push("/chat")
          }
          if (page !== 1) {
            setPage(1)
          }
        }}
      />
    )
  })()

  return (
    <WorkspacePanelShell title="Kelola Percakapan" onClose={onClose}>
      {content}
    </WorkspacePanelShell>
  )
}
