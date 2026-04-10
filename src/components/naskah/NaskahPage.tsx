"use client"

import { useEffect, useRef, useState } from "react"
import type { NaskahCompiledSnapshot } from "@/lib/naskah/types"
import { NaskahHeader } from "./NaskahHeader"
import { NaskahPreview } from "./NaskahPreview"
import { NaskahSidebar } from "./NaskahSidebar"

const HIGHLIGHT_DURATION_MS = 3_000

interface NaskahPageProps {
  snapshot: NaskahCompiledSnapshot
  updatePending: boolean
  /** Optional refresh callback. Wired in Task 4. */
  onRefresh?: () => void
  /**
   * Optional viewed-revision callback. Wired in Task 6 for the
   * pending-state acknowledgement flow. Phase 5 implementation does
   * not invoke it.
   */
  onMarkViewed?: () => void
}

/**
 * Top-level Naskah page shell.
 *
 * Always renders the header. Branches the body area on
 * `snapshot.isAvailable`:
 *
 *   - true  → renders the sidebar + paper preview
 *   - false → renders a workspace-oriented "belum ada section"
 *             empty state. Sidebar and preview are NOT rendered at all
 *             in this branch (they are removed from the DOM, not
 *             visually hidden), so the unavailable contract stays
 *             unambiguous to tests and screen readers.
 *
 * Per D-012 the page opens normally even when growing — the empty
 * state is a workspace placeholder, not an error screen.
 */
export function NaskahPage({
  snapshot,
  updatePending,
  onRefresh,
}: NaskahPageProps) {
  const [visibleSnapshot, setVisibleSnapshot] = useState(snapshot)
  const [pendingSnapshot, setPendingSnapshot] =
    useState<NaskahCompiledSnapshot | null>(null)
  const [highlightedSectionKeys, setHighlightedSectionKeys] = useState<
    NaskahCompiledSnapshot["sections"][number]["key"][]
  >([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const visibleRevisionRef = useRef<number | null>(
    getSnapshotRevision(snapshot),
  )

  useEffect(() => {
    const nextRevision = getSnapshotRevision(snapshot)
    const visibleRevision = visibleRevisionRef.current

    if (visibleRevision == null) {
      setVisibleSnapshot(snapshot)
      visibleRevisionRef.current = nextRevision
      return
    }

    if (nextRevision === visibleRevision) {
      setVisibleSnapshot(snapshot)
      return
    }

    if (updatePending) {
      setPendingSnapshot(snapshot)
      return
    }

    setVisibleSnapshot(snapshot)
    setPendingSnapshot(null)
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

  const handleRefresh = async () => {
    const nextSnapshot = pendingSnapshot ?? snapshot
    const changedKeys = getChangedSectionKeys(visibleSnapshot, nextSnapshot)

    setIsRefreshing(true)
    try {
      await onRefresh?.()
      setVisibleSnapshot(nextSnapshot)
      setPendingSnapshot(null)
      visibleRevisionRef.current = getSnapshotRevision(nextSnapshot)
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
        pageEstimate={activeSnapshot.pageEstimate}
        updatePending={updatePending}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {activeSnapshot.isAvailable ? (
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 border-r border-[color:var(--chat-border)]">
            <NaskahSidebar
              sections={activeSnapshot.sections}
              highlightedSectionKeys={highlightedSectionKeys}
            />
          </aside>
          <main className="min-w-0 flex-1">
            <NaskahPreview
              title={activeSnapshot.title}
              sections={activeSnapshot.sections}
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
