"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ConversationManagerTable } from "./ConversationManagerTable"

const PAGE_SIZE = 10

export function WorkspaceManagerConversationPanel() {
  const [page, setPage] = useState(1)
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const bulkDeleteConversations = useMutation(api.conversations.bulkDeleteConversations)
  const deleteAllConversations = useMutation(api.conversations.deleteAllConversations)

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

  if (isUserLoading || paginatedConversations === undefined) {
    return (
      <ConversationManagerTable
        items={[]}
        totalCount={0}
        page={page}
        pageSize={PAGE_SIZE}
        isLoading={true}
        onPageChange={setPage}
      />
    )
  }

  if (!user) {
    return (
      <div className="rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] p-4 text-sm text-[var(--chat-muted-foreground)]">
        User belum siap dimuat. Coba refresh halaman ini.
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
      onDeleteSelected={async (ids) => {
        if (ids.length === 0) return
        await bulkDeleteConversations({ conversationIds: ids as never })
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
        if (page !== 1) {
          setPage(1)
        }
      }}
    />
  )
}
