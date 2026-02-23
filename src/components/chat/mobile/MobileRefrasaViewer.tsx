"use client"

import { NavArrowLeft } from "iconoir-react"
import { RefrasaTabContent } from "@/components/refrasa/RefrasaTabContent"
import type { Id } from "../../../../convex/_generated/dataModel"

interface MobileRefrasaViewerProps {
  artifactId: Id<"artifacts"> | null
  userId: Id<"users">
  onClose: () => void
}

export function MobileRefrasaViewer({
  artifactId,
  userId,
  onClose,
}: MobileRefrasaViewerProps) {
  if (!artifactId) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--chat-background)] md:hidden">
      {/* Header */}
      <div className="border-b border-[color:var(--chat-border)] px-3 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-2 h-11">
          <button
            onClick={onClose}
            className="flex items-center gap-1 p-2 -ml-1 rounded-action font-mono text-xs text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
          >
            <NavArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Kembali
          </button>
          <span className="flex-1 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--chat-foreground)]">
            Refrasa
          </span>
          {/* Spacer to balance back button */}
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <RefrasaTabContent
          artifactId={artifactId}
          userId={userId}
          onTabClose={() => onClose()}
        />
      </div>
    </div>
  )
}
