"use client"

import { CheckCircle, EditPencil, NavArrowRight } from "iconoir-react"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { useId } from "react"

interface ArtifactIndicatorProps {
  artifactId: Id<"artifacts">
  title: string
  status?: "created" | "updated"
  version?: number
  onSelect: (id: Id<"artifacts">) => void
}

export function ArtifactIndicator({
  artifactId,
  title,
  status = "created",
  version,
  onSelect,
}: ArtifactIndicatorProps) {
  const hintId = useId()
  const isUpdated = status === "updated"

  return (
    <button
      type="button"
      onClick={() => onSelect(artifactId)}
      className={cn(
        "group w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors duration-150",
        "border-[color:var(--chat-border)] bg-[var(--chat-card)] hover:bg-[var(--chat-accent)] hover:border-[color:var(--chat-border)]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
      )}
      aria-label={`${isUpdated ? "Buka artifak revisi" : "Buka artifak baru"}: ${title}`}
      aria-describedby={hintId}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--chat-muted-foreground)]"
          aria-hidden="true"
        >
          {isUpdated ? <EditPencil className="h-4 w-4" /> : <CheckCircle className="h-5 w-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-[color:var(--chat-muted-foreground)] bg-[var(--chat-card)] px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)]">
              Artifak
            </span>
            {isUpdated && (
              <span
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide",
                  "border-[color:var(--chat-border)] bg-[var(--chat-card)] text-[var(--chat-muted-foreground)]"
                )}
              >
                Revisi
              </span>
            )}
            {typeof version === "number" && Number.isFinite(version) && (
              <span className="rounded-md border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--chat-muted-foreground)]">
                v{version}
              </span>
            )}
          </div>

          <p className="truncate text-sm font-semibold text-[var(--chat-foreground)]">{title}</p>
        </div>

        <span className="mt-1 inline-flex shrink-0 items-center gap-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)] transition-colors group-hover:text-[var(--chat-foreground)]">
          Buka
          <NavArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <span id={hintId} className="sr-only">
        Tekan Enter atau Space untuk membuka artifak di panel kanan.
      </span>
    </button>
  )
}
