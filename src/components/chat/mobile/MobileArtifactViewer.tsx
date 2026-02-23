"use client"

import { useRef } from "react"
import { Xmark, EditPencil, Copy, TextBox } from "iconoir-react"
import { ArtifactViewer, type ArtifactViewerRef } from "../ArtifactViewer"
import type { Id } from "../../../../convex/_generated/dataModel"

interface MobileArtifactViewerProps {
  artifactId: Id<"artifacts"> | null
  onClose: () => void
  onRefrasa: (artifactId: Id<"artifacts">) => void
}

export function MobileArtifactViewer({
  artifactId,
  onClose,
  onRefrasa,
}: MobileArtifactViewerProps) {
  const viewerRef = useRef<ArtifactViewerRef>(null)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--chat-background)] md:hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[color:var(--chat-border)] px-4 py-3">
        <button
          onClick={onClose}
          className="shrink-0 rounded-action p-1 text-[var(--chat-muted-foreground)]"
          aria-label="Close"
        >
          <Xmark className="h-5 w-5" />
        </button>
        <span className="flex-1 truncate font-mono text-sm font-semibold text-[var(--chat-foreground)]">
          Artifact
        </span>
      </div>

      {/* Content — ArtifactViewer fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <ArtifactViewer ref={viewerRef} artifactId={artifactId} />
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-around border-t border-[color:var(--chat-border)] bg-[var(--chat-background)] px-4 py-3">
        <button
          onClick={() => viewerRef.current?.startEdit()}
          className="flex items-center gap-1.5 rounded-action bg-[var(--chat-secondary)] px-4 py-2 font-mono text-xs text-[var(--chat-foreground)]"
        >
          <EditPencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={() => {
            if (artifactId) onRefrasa(artifactId)
          }}
          className="flex items-center gap-1.5 rounded-action bg-[var(--chat-secondary)] px-4 py-2 font-mono text-xs text-[var(--chat-foreground)]"
        >
          <TextBox className="h-3.5 w-3.5" />
          Refrasa
        </button>
        <button
          onClick={() => viewerRef.current?.copy()}
          className="flex items-center gap-1.5 rounded-action bg-[var(--chat-secondary)] px-4 py-2 font-mono text-xs text-[var(--chat-foreground)]"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
    </div>
  )
}
