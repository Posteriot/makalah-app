"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { NaskahCompiledSnapshot } from "@/lib/naskah/types"
import { NaskahHeader } from "./NaskahHeader"
import { NaskahPreview } from "./NaskahPreview"
import type { NaskahSection, NaskahSectionKey } from "@/lib/naskah/types"

const HIGHLIGHT_DURATION_MS = 3_000

interface NaskahPageProps {
  /**
   * The snapshot the user is currently viewing. Per D-018, this MUST be
   * the revision the user last acknowledged (viewedSnapshot from the
   * route), not the latest available. The only exception is first visit,
   * where the route falls back to the latest since there is no prior
   * viewed revision.
   */
  snapshot: NaskahCompiledSnapshot
  /**
   * The newest compiled snapshot available for this session, if it
   * differs from `snapshot`. When `updatePending` is true, `handleRefresh`
   * swaps visible to this value and computes the section diff against
   * the previous visible snapshot for the post-refresh highlight.
   */
  latestSnapshot?: NaskahCompiledSnapshot
  updatePending: boolean
  /** Called when the user clicks the in-page Update button. */
  onRefresh?: () => void
  onSidebarStateChange?: (state: {
    isAvailable: boolean
    sections: NaskahSection[]
    highlightedSectionKeys: NaskahSectionKey[]
  }) => void
}

/**
 * Top-level Naskah page shell.
 *
 * Always renders the header. Branches the body area on
 * `snapshot.isAvailable`:
 *
 *   - true  → renders the header + paper preview
 *   - false → renders a workspace-oriented "belum ada section"
 *             empty state. Preview is NOT rendered at all in this
 *             branch. The sidebar lives in NaskahShell and is synced
 *             through `onSidebarStateChange`.
 *
 * Per D-012 the page opens normally even when growing — the empty
 * state is a workspace placeholder, not an error screen.
 *
 * Per D-018 manual refresh contract, the component MUST NOT swap
 * visibleSnapshot just because a newer snapshot prop arrives. The swap
 * happens only when the user clicks Update, at which point the diff is
 * computed and the highlight is applied.
 */
export function NaskahPage({
  snapshot,
  latestSnapshot,
  updatePending,
  onRefresh,
  onSidebarStateChange,
}: NaskahPageProps) {
  const [visibleSnapshot, setVisibleSnapshot] = useState(snapshot)
  const [highlightedSectionKeys, setHighlightedSectionKeys] = useState<
    NaskahCompiledSnapshot["sections"][number]["key"][]
  >([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Actual rendered page count reported by NaskahPreview's pagination
  // engine. Falls back to the compiler's character-based estimate
  // until the first measurement fires. `null` = not yet measured.
  const [actualPageCount, setActualPageCount] = useState<number | null>(null)
  const handlePageCountChange = useCallback((count: number) => {
    setActualPageCount(count)
  }, [])
  const [zoomLevel, setZoomLevel] = useState(1)
  const visibleRevisionRef = useRef<number | null>(
    getSnapshotRevision(snapshot),
  )

  useEffect(() => {
    const nextRevision = getSnapshotRevision(snapshot)
    const visibleRevision = visibleRevisionRef.current

    // First mount: accept whatever the route gave us.
    if (visibleRevision == null) {
      setVisibleSnapshot(snapshot)
      visibleRevisionRef.current = nextRevision
      return
    }

    // Same-revision prop update (e.g., subscription refetch returning
    // the same row shape): pick up field corrections without treating it
    // as a transition.
    if (nextRevision === visibleRevision) {
      setVisibleSnapshot(snapshot)
      return
    }

    // Revision changed while updatePending is active: per D-018 do NOT
    // auto-consume pending state. Hold the visible snapshot until the
    // user clicks Update. In the new route flow this branch should not
    // fire — the route passes a stable viewedSnapshot prop — but the
    // defensive guard covers any upstream race (e.g., reactive refetch
    // ordering) so the component contract stays honest.
    if (updatePending) {
      return
    }

    // Revision changed and not pending: this is a legitimate server
    // cascade after markViewed committed (or a route-level swap for
    // another reason). Swap without highlight; handleRefresh already
    // applied the highlight if the transition was user-initiated.
    setVisibleSnapshot(snapshot)
    visibleRevisionRef.current = nextRevision
  }, [snapshot, updatePending])

  useEffect(() => {
    if (highlightedSectionKeys.length === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedSectionKeys([])
    }, HIGHLIGHT_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [highlightedSectionKeys])

  const activeSnapshot = visibleSnapshot

  useEffect(() => {
    onSidebarStateChange?.({
      isAvailable: activeSnapshot.isAvailable,
      sections: activeSnapshot.isAvailable ? activeSnapshot.sections : [],
      highlightedSectionKeys,
    })
  }, [activeSnapshot, highlightedSectionKeys, onSidebarStateChange])

  const handleRefresh = async () => {
    // Target = the newest snapshot we have a handle to. Prefer the
    // explicit latestSnapshot prop (route's view of what the user will
    // see post-refresh); fall back to the current snapshot prop if the
    // route did not pass one (should not happen in production).
    const target = latestSnapshot ?? snapshot
    const changedKeys = getChangedSectionKeys(visibleSnapshot, target)

    setIsRefreshing(true)
    try {
      await onRefresh?.()
      // Optimistically swap the visible snapshot. The server cascade
      // will rerender with a matching `snapshot` prop, which the
      // useEffect above will handle as a same-revision no-op.
      setVisibleSnapshot(target)
      visibleRevisionRef.current = getSnapshotRevision(target)
      setHighlightedSectionKeys(changedKeys)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--chat-background)]">
      <NaskahHeader
        title={activeSnapshot.title}
        titleSource={activeSnapshot.titleSource}
        status={activeSnapshot.status}
        pageCount={actualPageCount ?? activeSnapshot.pageEstimate}
        updatePending={updatePending}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        downloadSections={activeSnapshot.sections}
        downloadEnabled={activeSnapshot.isAvailable}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
      />

      {activeSnapshot.isAvailable ? (
        <div className="min-h-0 flex-1">
          <main className="h-full min-w-0">
            <NaskahPreview
              title={activeSnapshot.title}
              sections={activeSnapshot.sections}
              onPageCountChange={handlePageCountChange}
              zoomLevel={zoomLevel}
            />
          </main>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6">
          <p className="max-w-md text-center text-sm text-[var(--chat-muted-foreground)]">
            Belum ada section yang masuk ke naskah. Section akan muncul
            setelah proses validasi berjalan.
          </p>
        </div>
      )}
    </div>
  )
}

function getSnapshotRevision(
  snapshot: NaskahCompiledSnapshot,
): number | null {
  return "revision" in snapshot && typeof snapshot.revision === "number"
    ? snapshot.revision
    : null
}

function getChangedSectionKeys(
  previousSnapshot: NaskahCompiledSnapshot,
  nextSnapshot: NaskahCompiledSnapshot,
): NaskahCompiledSnapshot["sections"][number]["key"][] {
  const previousSectionsByKey = new Map(
    previousSnapshot.sections.map((section) => [section.key, section.content]),
  )

  return nextSnapshot.sections
    .filter((section) => previousSectionsByKey.get(section.key) !== section.content)
    .map((section) => section.key)
}
