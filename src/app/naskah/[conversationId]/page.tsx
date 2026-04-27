"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { NaskahPage } from "@/components/naskah/NaskahPage"
import { NaskahShell } from "@/components/naskah/NaskahShell"
import { useNaskah } from "@/lib/hooks/useNaskah"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import type {
  NaskahCompiledSnapshot,
  NaskahSection,
  NaskahSectionKey,
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

function areSidebarStatesEqual(
  left: {
    isAvailable: boolean
    sections: NaskahSection[]
    highlightedSectionKeys: NaskahSectionKey[]
  },
  right: {
    isAvailable: boolean
    sections: NaskahSection[]
    highlightedSectionKeys: NaskahSectionKey[]
  },
) {
  if (left.isAvailable !== right.isAvailable) {
    return false
  }

  if (left.sections.length !== right.sections.length) {
    return false
  }

  for (let index = 0; index < left.sections.length; index += 1) {
    if (left.sections[index]?.key !== right.sections[index]?.key) {
      return false
    }

    if (left.sections[index]?.label !== right.sections[index]?.label) {
      return false
    }
  }

  if (
    left.highlightedSectionKeys.length !== right.highlightedSectionKeys.length
  ) {
    return false
  }

  for (
    let index = 0;
    index < left.highlightedSectionKeys.length;
    index += 1
  ) {
    if (left.highlightedSectionKeys[index] !== right.highlightedSectionKeys[index]) {
      return false
    }
  }

  return true
}

export default function NaskahConversationPage() {
  const params = useParams<{ conversationId: string }>()
  const conversationId = params.conversationId
  const safeConversationId =
    typeof conversationId === "string" && conversationId.length > 0
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
  const [sidebarState, setSidebarState] = useState<{
    isAvailable: boolean
    sections: NaskahSection[]
    highlightedSectionKeys: NaskahSectionKey[]
  }>(() => ({
    isAvailable: visibleSnapshot.isAvailable,
    sections: visibleSnapshot.isAvailable ? visibleSnapshot.sections : [],
    highlightedSectionKeys: [],
  }))

  const handleSidebarStateChange = useCallback(
    (nextState: {
      isAvailable: boolean
      sections: NaskahSection[]
      highlightedSectionKeys: NaskahSectionKey[]
    }) => {
      setSidebarState((currentState) =>
        areSidebarStatesEqual(currentState, nextState)
          ? currentState
          : nextState,
      )
    },
    [],
  )

  // Sync snapshot-derived sidebar state. The setState inside this
  // effect is the canonical "sync external prop into local state"
  // pattern — the snapshot is the external source of truth.
  useEffect(() => {
    const nextState = {
      isAvailable: visibleSnapshot.isAvailable,
      sections: visibleSnapshot.isAvailable ? visibleSnapshot.sections : [],
      highlightedSectionKeys: [],
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarState((currentState) =>
      areSidebarStatesEqual(currentState, nextState)
        ? currentState
        : nextState,
    )
  }, [conversationId, visibleSnapshot])

  if (isSessionLoading || isLoading) {
    return (
      <NaskahShell
        conversationId={conversationId}
        isSidebarAvailable={false}
        sidebarSections={[]}
        highlightedSectionKeys={[]}
      >
        <div className="flex h-full items-center justify-center text-sm text-[var(--chat-muted-foreground)]">
          Memuat naskah...
        </div>
      </NaskahShell>
    )
  }

  return (
    <NaskahShell
      conversationId={conversationId}
      isSidebarAvailable={sidebarState.isAvailable}
      sidebarSections={sidebarState.sections}
      highlightedSectionKeys={sidebarState.highlightedSectionKeys}
    >
      <NaskahPage
        snapshot={visibleSnapshot}
        latestSnapshot={latestSnapshot ?? undefined}
        updatePending={effectiveUpdatePending}
        onRefresh={markViewed}
        onSidebarStateChange={handleSidebarStateChange}
      />
    </NaskahShell>
  )
}
