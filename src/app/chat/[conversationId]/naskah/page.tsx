"use client"

import { useQuery } from "convex/react"
import { useParams } from "next/navigation"
import { ChatLayout } from "@/components/chat/layout/ChatLayout"
import { NaskahPage } from "@/components/naskah/NaskahPage"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useNaskah } from "@/lib/hooks/useNaskah"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import type { NaskahCompiledSnapshot, NaskahTitleSource } from "@/lib/naskah/types"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

function deriveFallbackTitleSource(args: {
  paperTitle?: string | null
  workingTitle?: string | null
}): NaskahTitleSource {
  if (typeof args.paperTitle === "string" && args.paperTitle.trim()) {
    return "paper_title"
  }
  if (typeof args.workingTitle === "string" && args.workingTitle.trim()) {
    return "working_title"
  }
  return "fallback"
}

export default function NaskahConversationPage() {
  const params = useParams<{ conversationId: string }>()
  const conversationId = params.conversationId
  const safeConversationId =
    typeof conversationId === "string" && /^[a-z0-9]{32}$/.test(conversationId)
      ? (conversationId as Id<"conversations">)
      : undefined

  const { user } = useCurrentUser()
  const { session, isLoading: isSessionLoading } = usePaperSession(safeConversationId)
  const { availability, latestSnapshot, updatePending, markViewed, isLoading } =
    useNaskah(session?._id)

  const artifacts = useQuery(
    api.artifacts.listByConversation,
    safeConversationId && user?._id
      ? { conversationId: safeConversationId, userId: user._id }
      : "skip",
  )

  const fallbackTitle =
    (typeof session?.paperTitle === "string" && session.paperTitle.trim()) ||
    (typeof session?.workingTitle === "string" && session.workingTitle.trim()) ||
    "Paper Tanpa Judul"

  const snapshot: NaskahCompiledSnapshot =
    latestSnapshot ??
    ({
      isAvailable: availability?.isAvailable ?? false,
      reasonIfUnavailable: availability?.reasonIfUnavailable ?? "empty_session",
      title: fallbackTitle,
      titleSource: deriveFallbackTitleSource({
        paperTitle: session?.paperTitle,
        workingTitle: session?.workingTitle,
      }),
      sections: [],
      pageEstimate: 1,
      status: "growing",
      sourceArtifactRefs: [],
    } satisfies NaskahCompiledSnapshot)

  if (isSessionLoading || isLoading) {
    return (
      <ChatLayout
        conversationId={conversationId}
        artifactCount={artifacts?.length ?? 0}
        routeContext="naskah"
      >
        <div className="flex h-full items-center justify-center text-sm text-[var(--chat-muted-foreground)]">
          Memuat naskah...
        </div>
      </ChatLayout>
    )
  }

  return (
    <ChatLayout
      conversationId={conversationId}
      artifactCount={artifacts?.length ?? 0}
      routeContext="naskah"
    >
      <NaskahPage
        snapshot={snapshot}
        updatePending={updatePending}
        onRefresh={markViewed}
      />
    </ChatLayout>
  )
}
