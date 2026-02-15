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
        "group w-full cursor-pointer rounded-action border px-3 py-2.5 text-left transition-colors duration-150",
        "border-border/65 bg-card/70 hover:bg-accent/35 hover:border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      aria-label={`${isUpdated ? "Buka artifak revisi" : "Buka artifak baru"}: ${title}`}
      aria-describedby={hintId}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-action border",
            isUpdated
              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
          )}
          aria-hidden="true"
        >
          {isUpdated ? <EditPencil className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-badge border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-primary">
              Hasil Artifak
            </span>
            <span
              className={cn(
                "rounded-badge border px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide",
                isUpdated
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              )}
            >
              {isUpdated ? "Revisi" : "Baru"}
            </span>
            {typeof version === "number" && Number.isFinite(version) && (
              <span className="rounded-badge border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                v{version}
              </span>
            )}
          </div>

          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">
            Klik untuk buka di panel artifak
          </p>
        </div>

        <span className="mt-1 inline-flex shrink-0 items-center gap-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground transition-colors group-hover:text-foreground">
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
