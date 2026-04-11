"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { NaskahPage } from "@/components/naskah/NaskahPage"
import { NaskahShell } from "@/components/naskah/NaskahShell"
import { useNaskah } from "@/lib/hooks/useNaskah"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import type {
  NaskahCompiledSnapshot,
  NaskahTitleSource,
} from "@/lib/naskah/types"
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

  const { session, isLoading: isSessionLoading } = usePaperSession(safeConversationId)
  const {
    availability,
    latestSnapshot,
    viewedSnapshot,
    viewState,
    updatePending,
    markViewed,
    isLoading,
  } = useNaskah(session?._id)

  // D-018 bootstrap: on the user's very first visit to this session's
  // Naskah route, viewState is null (no row). The TopBar dot may have
  // been showing because deriveNaskahUpdatePending treats viewedRev=null
  // as pending. First-visit is NOT an auto-consume of pending state;
  // it's an initialization. Fire markViewed once to create the row so
  // subsequent routes can compute a real diff. We render the latest
  // snapshot immediately AND suppress the banner for this single frame
  // until the mutation commits.
  const bootstrappedRef = useRef(false)
  useEffect(() => {
    if (bootstrappedRef.current) return
    if (isLoading) return
    if (viewState !== null) return
    if (latestSnapshot?.revision == null) return
    bootstrappedRef.current = true
    void markViewed()
  }, [isLoading, viewState, latestSnapshot, markViewed])

  const fallbackTitle =
    (typeof session?.paperTitle === "string" && session.paperTitle.trim()) ||
    (typeof session?.workingTitle === "string" && session.workingTitle.trim()) ||
    "Paper Tanpa Judul"

  const emptyFallbackSnapshot: NaskahCompiledSnapshot = {
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
  }

  // Per D-018: visible snapshot MUST be the revision the user last saw,
  // not the latest. First-visit is the only exception — we show latest
  // because there's no prior revision to fall back to.
  const isFirstVisit = viewState === null
  const visibleSnapshot: NaskahCompiledSnapshot =
    (isFirstVisit
      ? (latestSnapshot ?? emptyFallbackSnapshot)
      : (viewedSnapshot ?? latestSnapshot ?? emptyFallbackSnapshot))

  // On first visit, suppress the banner until bootstrap completes. This
  // prevents a flash of "update pending" copy for content the user is
  // seeing for the first time — there's nothing to "update" from.
  const effectiveUpdatePending = isFirstVisit ? false : updatePending

  if (isSessionLoading || isLoading) {
    return (
      <NaskahShell conversationId={conversationId}>
        <div className="flex h-full items-center justify-center text-sm text-[var(--chat-muted-foreground)]">
          Memuat naskah...
        </div>
      </NaskahShell>
    )
  }

  return (
    <NaskahShell conversationId={conversationId}>
      <NaskahPage
        snapshot={visibleSnapshot}
        latestSnapshot={latestSnapshot ?? undefined}
        updatePending={effectiveUpdatePending}
        onRefresh={markViewed}
      />
    </NaskahShell>
  )
}
