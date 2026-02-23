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
      <div className="flex items-center gap-3 border-b border-[color:var(--chat-border)] px-4 py-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1 font-mono text-xs text-[var(--chat-info)]"
        >
          <NavArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <span className="flex-1 text-center font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--chat-foreground)]">
          REFRASA
        </span>
        {/* Spacer to balance back button */}
        <div className="w-16" />
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
