"use client"

import { NavArrowLeft } from "iconoir-react"
import type { Id, Doc } from "../../../../convex/_generated/dataModel"

interface MobileArtifactListProps {
  artifacts: Doc<"artifacts">[]
  onSelect: (artifactId: Id<"artifacts">) => void
  onBack: () => void
}

export function MobileArtifactList({
  artifacts,
  onSelect,
  onBack,
}: MobileArtifactListProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--chat-background)] md:hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[color:var(--chat-border)] px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 font-mono text-xs text-[var(--chat-info)]"
        >
          <NavArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <span className="flex-1 text-center font-mono text-sm font-semibold text-[var(--chat-foreground)]">
          Artifacts ({artifacts.length})
        </span>
        {/* Spacer to balance back button */}
        <div className="w-16" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {artifacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--chat-muted-foreground)]">
            <p className="font-mono text-sm">Belum ada artifact</p>
          </div>
        ) : (
          <div className="space-y-2">
            {artifacts.map((artifact) => {
              const isInvalidated =
                artifact.invalidatedAt !== undefined &&
                artifact.invalidatedAt !== null
              return (
                <button
                  key={artifact._id}
                  onClick={() => onSelect(artifact._id)}
                  className={`w-full rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-card)] px-4 py-3 text-left transition-colors hover:bg-[var(--chat-accent)] ${
                    isInvalidated ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-[var(--chat-foreground)]">
                      {artifact.title}
                    </span>
                    {isInvalidated && (
                      <span className="shrink-0 rounded-badge bg-[var(--chat-muted)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                        Outdated
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-[var(--chat-muted-foreground)]">
                    <span>{artifact.type}</span>
                    <span>v{artifact.version}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
