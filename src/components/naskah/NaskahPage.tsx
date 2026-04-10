"use client"

import type { NaskahCompiledSnapshot } from "@/lib/naskah/types"
import { NaskahHeader } from "./NaskahHeader"
import { NaskahPreview } from "./NaskahPreview"
import { NaskahSidebar } from "./NaskahSidebar"

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
  return (
    <div className="flex h-full flex-col bg-[var(--chat-background)]">
      <NaskahHeader
        title={snapshot.title}
        titleSource={snapshot.titleSource}
        status={snapshot.status}
        pageEstimate={snapshot.pageEstimate}
        updatePending={updatePending}
        onRefresh={onRefresh}
      />

      {snapshot.isAvailable ? (
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 border-r border-[color:var(--chat-border)]">
            <NaskahSidebar sections={snapshot.sections} />
          </aside>
          <main className="min-w-0 flex-1">
            <NaskahPreview
              title={snapshot.title}
              sections={snapshot.sections}
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
