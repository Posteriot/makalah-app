"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Page, Folder, NavArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"
import {
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { Id } from "../../../../convex/_generated/dataModel"
import { resolvePaperDisplayTitle } from "@/lib/paper/title-resolver"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface ArtifactItem {
  _id: Id<"artifacts">
  title: string
  type: string
  version: number
  conversationId: Id<"conversations">
  invalidatedAt?: number
  sourceArtifactId?: Id<"artifacts">
  createdAt: number
}

interface MobilePaperSessionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: Id<"conversations"> | null
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
}

/**
 * Get latest version of each artifact (by title/type).
 * Groups artifacts and returns only the highest version of each,
 * ordered: parents by createdAt, each followed by its refrasa children.
 */
function getLatestArtifactVersions(artifacts: ArtifactItem[]): ArtifactItem[] {
  const latestMap = new Map<string, ArtifactItem>()

  for (const artifact of artifacts) {
    const key = `${artifact.type}-${artifact.title}`
    const existing = latestMap.get(key)

    if (!existing || artifact.version > existing.version) {
      latestMap.set(key, artifact)
    }
  }

  const latest = Array.from(latestMap.values())

  // Separate parents (non-refrasa) and refrasa
  const parents = latest.filter((a) => a.type !== "refrasa")
  const refrasas = latest.filter((a) => a.type === "refrasa")

  // Sort parents by createdAt ASC (stage order)
  parents.sort((a, b) => a.createdAt - b.createdAt)

  // Build grouped list: each parent followed by its refrasa children
  const result: ArtifactItem[] = []
  for (const parent of parents) {
    result.push(parent)
    const children = refrasas.filter((r) => r.sourceArtifactId === parent._id)
    children.sort((a, b) => a.createdAt - b.createdAt)
    result.push(...children)
  }

  // Orphan refrasas (source not in latest list -- safety net)
  const placedIds = new Set(result.map((a) => a._id))
  for (const r of refrasas) {
    if (!placedIds.has(r._id)) result.push(r)
  }

  return result
}

export function MobilePaperSessionsSheet({
  open,
  onOpenChange,
  conversationId,
  onArtifactSelect,
}: MobilePaperSessionsSheetProps) {
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const [isExpanded, setIsExpanded] = useState(true)

  const { session, isPaperMode, currentStage, isLoading } = usePaperSession(
    conversationId as Id<"conversations"> | undefined
  )

  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId
      ? { conversationId: conversationId as Id<"conversations"> }
      : "skip"
  )

  const artifacts = useQuery(
    api.artifacts.listByConversation,
    conversationId && user?._id
      ? {
          conversationId: conversationId as Id<"conversations">,
          userId: user._id,
        }
      : "skip"
  ) as ArtifactItem[] | undefined

  function handleArtifactClick(artifactId: Id<"artifacts">) {
    onArtifactSelect?.(artifactId)
    onOpenChange(false)
  }

  // Resolve display title
  const { displayTitle: resolvedTitle } = session
    ? resolvePaperDisplayTitle({
        paperTitle: session.paperTitle,
        workingTitle: session.workingTitle,
        conversationTitle: conversation?.title,
      })
    : { displayTitle: "" }
  const displayTitle = resolvedTitle.replace(/\s+/g, "_")

  // Stage info
  const stageNumber = currentStage
    ? getStageNumber(currentStage as PaperStageId | "completed")
    : 0
  const stageLabel = currentStage
    ? getStageLabel(currentStage as PaperStageId | "completed")
    : ""

  // Status dot
  const isCompleted = currentStage === "completed"
  const statusColorClass = isCompleted
    ? "bg-[var(--chat-success)]"
    : "bg-sky-500 dark:bg-sky-400"

  // Latest artifacts
  const latestArtifacts = artifacts
    ? getLatestArtifactVersions(artifacts)
    : []
  const hasArtifacts = latestArtifacts.length > 0

  // Loading / empty content
  function renderContent() {
    // No conversation
    if (!conversationId) {
      return (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <Page
            className="mb-2 h-8 w-8 text-[var(--chat-muted-foreground)] opacity-50"
            strokeWidth={1.5}
          />
          <span className="font-sans text-sm text-[var(--chat-muted-foreground)]">
            Belum ada percakapan aktif
          </span>
        </div>
      )
    }

    // Loading
    if (isLoading || isUserLoading || !user) {
      return (
        <div className="space-y-3 px-4 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-action bg-[var(--chat-muted)]"
            />
          ))}
        </div>
      )
    }

    // No paper session
    if (!isPaperMode || !session) {
      return (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <Page
            className="mb-2 h-8 w-8 text-[var(--chat-muted-foreground)] opacity-50"
            strokeWidth={1.5}
          />
          <span className="mb-1 font-sans text-sm font-medium text-[var(--chat-muted-foreground)]">
            Tidak ada paper aktif di percakapan ini
          </span>
        </div>
      )
    }

    // Paper session with folder
    return (
      <div className="px-2 pb-4">
        {/* Folder header */}
        <button
          type="button"
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-action border border-transparent px-3 py-2.5 transition-colors duration-50",
            "active:border-[color:var(--chat-border)] active:bg-[var(--chat-accent)]"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Chevron */}
          <NavArrowRight
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--chat-muted-foreground)] transition-transform duration-150",
              isExpanded && "rotate-90"
            )}
            strokeWidth={1.5}
          />

          {/* Status dot */}
          <div
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              statusColorClass
            )}
          />

          {/* Folder icon */}
          <Folder
            className="h-[18px] w-[18px] shrink-0 text-sky-500 dark:text-sky-400 [&_path]:fill-current [&_path]:stroke-current"
            strokeWidth={1.5}
          />

          {/* Title */}
          <span className="flex-1 truncate text-left font-sans text-xs font-medium">
            {displayTitle}
          </span>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="pl-6 pr-1">
            {/* Stage info */}
            <div className="px-3 pb-2 pt-1">
              <div className="font-mono text-[11px] text-[var(--chat-muted-foreground)]">
                Stage {stageNumber}/13 - {stageLabel}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--chat-muted-foreground)]">
                  {hasArtifacts
                    ? `${latestArtifacts.length} artifak`
                    : "Belum ada artifak"}
                </span>
              </div>
            </div>

            {/* Artifact items */}
            {hasArtifacts ? (
              latestArtifacts.map((artifact) => {
                const isFinal = !artifact.invalidatedAt

                return (
                  <button
                    key={artifact._id}
                    type="button"
                    className={cn(
                      "my-1 mr-2 flex w-full items-center gap-2 rounded-action border border-transparent px-3 py-2 transition-colors duration-50",
                      "active:bg-[var(--chat-accent)]"
                    )}
                    onClick={() => handleArtifactClick(artifact._id)}
                  >
                    {/* Document icon / Refrasa badge */}
                    {artifact.type === "refrasa" ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[var(--chat-info)] font-mono text-[9px] font-bold text-[var(--chat-info-foreground)]">
                        R
                      </span>
                    ) : (
                      <Page
                        className="h-4 w-4 shrink-0 text-[var(--chat-muted-foreground)]"
                        strokeWidth={1.5}
                      />
                    )}

                    {/* Title */}
                    <span className="flex-1 truncate text-left font-sans text-xs">
                      {artifact.title}
                    </span>

                    {/* Version badge */}
                    <span className="shrink-0 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--chat-secondary-foreground)]">
                      v{artifact.version}
                    </span>

                    {/* Status badge */}
                    {isFinal ? (
                      <span className="ml-1 shrink-0 rounded-badge border border-[color:var(--chat-success)] bg-[var(--chat-success)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[var(--chat-success-foreground)]">
                        FINAL
                      </span>
                    ) : (
                      <span className="ml-1 shrink-0 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-muted)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[var(--chat-muted-foreground)]">
                        REVISI
                      </span>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-2 font-mono text-[11px] uppercase text-[var(--chat-muted-foreground)]">
                Belum ada artifak
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[70vh] rounded-t-shell border-t border-[color:var(--chat-border)] bg-[var(--chat-background)] p-0 [&>button]:hidden"
        data-chat-scope=""
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-[var(--chat-muted)]" />
        </div>

        <SheetHeader className="px-4 pb-3">
          <SheetTitle className="text-left font-sans text-sm font-semibold text-[var(--chat-foreground)]">
            Sesi Paper
          </SheetTitle>
          <p className="font-mono text-[11px] text-[var(--chat-muted-foreground)]">
            Folder Artifak
          </p>
        </SheetHeader>

        <div className="overflow-y-auto pb-4">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  )
}
