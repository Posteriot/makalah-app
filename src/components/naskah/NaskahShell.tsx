"use client"

import { useQuery } from "convex/react"
import type { ReactNode } from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { TopBar } from "@/components/chat/shell/TopBar"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useNaskah } from "@/lib/hooks/useNaskah"
import { usePaperSession } from "@/lib/hooks/usePaperSession"

interface NaskahShellProps {
  conversationId: string | null
  children: ReactNode
}

export function NaskahShell({ conversationId, children }: NaskahShellProps) {
  const { user } = useCurrentUser()
  const safeConversationId =
    typeof conversationId === "string" && /^[a-z0-9]{32}$/.test(conversationId)
      ? (conversationId as Id<"conversations">)
      : undefined

  const { session } = usePaperSession(safeConversationId)
  const { availability, updatePending } = useNaskah(session?._id)
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    safeConversationId && user?._id
      ? { conversationId: safeConversationId, userId: user._id }
      : "skip",
  )

  return (
    <div className="flex h-dvh flex-col bg-[var(--chat-background)]">
      <TopBar
        isSidebarCollapsed={false}
        onToggleSidebar={() => {}}
        artifactCount={artifacts?.length ?? 0}
        conversationId={conversationId}
        naskahAvailable={availability?.isAvailable ?? false}
        naskahUpdatePending={updatePending ?? false}
        routeContext="naskah"
      />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
