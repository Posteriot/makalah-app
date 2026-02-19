"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Skeleton } from "@/components/ui/skeleton"
import { Page, Folder, NavArrowRight, EditPencil } from "iconoir-react"
import { cn } from "@/lib/utils"
import {
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { useEffect, useState, type MouseEvent } from "react"
import { Id } from "../../../../convex/_generated/dataModel"
import { resolvePaperDisplayTitle } from "@/lib/paper/title-resolver"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarPaperSessionsProps {
  currentConversationId: string | null
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  activeArtifactId?: Id<"artifacts"> | null
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
}

interface PaperSessionItem {
  _id: Id<"paperSessions">
  conversationId: Id<"conversations">
  workingTitle?: string
  paperTitle?: string
  currentStage: string
  stageStatus: string
  _creationTime: number
  updatedAt?: number
}

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

/**
 * SidebarPaperSessions - Paper session folder for ACTIVE conversation
 *
 * Displays paper session for the currently active conversation only.
 * Behavior matches SidebarProgress - shows content based on currentConversationId.
 * Multi-tab support: automatically updates when user switches tabs.
 *
 * Matches mockup: sky folder icon, status dots, and artifact items with badges.
 */
export function SidebarPaperSessions({
  currentConversationId,
  onArtifactSelect,
  activeArtifactId,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
}: SidebarPaperSessionsProps) {
  const { user, isLoading: isUserLoading } = useCurrentUser()

  // Single folder expanded state (default: expanded)
  const [isExpanded, setIsExpanded] = useState(true)

  // Query paper session for ACTIVE conversation only (like SidebarProgress)
  const {
    session,
    isPaperMode,
    currentStage,
    isLoading,
    updateWorkingTitle,
  } = usePaperSession(
    currentConversationId as Id<"conversations"> | undefined
  )

  const conversation = useQuery(
    api.conversations.getConversation,
    currentConversationId
      ? { conversationId: currentConversationId as Id<"conversations"> }
      : "skip"
  )

  // Initial state before any conversation is selected
  if (!currentConversationId) {
    return (
      <div className="flex flex-col h-full">
        <div className="pt-5 px-4 pb-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Sesi Paper</div>
          <div className="text-[11px] font-mono text-muted-foreground/70 mt-1">
            Folder Artifak
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <Page className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <span className="text-sm text-muted-foreground/70 font-medium font-mono">
            Belum ada sesi penyusunan paper. Silakan mulai percakapan baru.
          </span>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading || isUserLoading || !user) {
    return (
      <div className="flex flex-col h-full">
        {/* Header skeleton */}
        <div className="pt-5 px-4 pb-3">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        {/* Items skeleton */}
        <div className="py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-[18px] w-[18px]" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state - no paper session in this conversation (matches SidebarProgress)
  if (!isPaperMode || !session) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="pt-5 px-4 pb-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Sesi Paper</div>
          <div className="text-[11px] font-mono text-muted-foreground/70 mt-1">
            Folder Artifak
          </div>
        </div>
        {/* Empty state - same messaging as SidebarProgress */}
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <Page className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <span className="text-sm text-muted-foreground/70 font-medium font-mono mb-1">
            Tidak ada paper aktif
          </span>
          <span className="text-xs text-muted-foreground/50 font-mono">
            Percakapan ini bukan sesi penulisan paper
          </span>
        </div>
      </div>
    )
  }

  // Build session item from usePaperSession data
  const sessionItem: PaperSessionItem = {
    _id: session._id as Id<"paperSessions">,
    conversationId: session.conversationId as Id<"conversations">,
    workingTitle: session.workingTitle,
    paperTitle: session.paperTitle,
    currentStage: currentStage as string,
    stageStatus: session.stageStatus as string,
    _creationTime: session._creationTime,
    updatedAt: session.updatedAt,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - padding 20px 16px 12px 16px, no border */}
      <div className="pt-5 px-4 pb-3">
        <div className="text-base font-semibold">Sesi Paper</div>
        <div className="text-[13px] font-mono text-muted-foreground">
          Folder Artifak
        </div>
      </div>

      {/* Paper Folder - Single session for active conversation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <PaperFolderItem
          session={sessionItem}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          onArtifactSelect={onArtifactSelect}
          activeArtifactId={activeArtifactId}
          isArtifactPanelOpen={isArtifactPanelOpen}
          onArtifactPanelToggle={onArtifactPanelToggle}
          onCloseMobile={onCloseMobile}
          conversationTitle={conversation?.title}
          onUpdateWorkingTitle={(title) => updateWorkingTitle(user!._id, title)}
          userId={user!._id}
        />
      </div>
    </div>
  )
}

/**
 * PaperFolderItem - Individual paper folder with artifacts
 */
function PaperFolderItem({
  session,
  isExpanded,
  onToggle,
  onArtifactSelect,
  activeArtifactId,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
  conversationTitle,
  onUpdateWorkingTitle,
  userId,
}: {
  session: PaperSessionItem
  isExpanded: boolean
  onToggle: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  activeArtifactId?: Id<"artifacts"> | null
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
  conversationTitle?: string
  onUpdateWorkingTitle?: (title: string) => Promise<unknown> | undefined
  userId: Id<"users">
}) {
  // Query artifacts for this paper session's conversation
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    isExpanded
      ? { conversationId: session.conversationId, userId }
      : "skip"
  ) as ArtifactItem[] | undefined

  const stageNumber = getStageNumber(
    session.currentStage as PaperStageId | "completed"
  )
  const stageLabel = getStageLabel(
    session.currentStage as PaperStageId | "completed"
  )
  const { displayTitle: resolvedTitle } = resolvePaperDisplayTitle({
    paperTitle: session.paperTitle,
    workingTitle: session.workingTitle,
    conversationTitle,
  })
  const displayTitle = resolvedTitle.replace(/\s+/g, "_")
  const isFinalTitleLocked =
    typeof session.paperTitle === "string" && session.paperTitle.trim().length > 0

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(resolvedTitle)
  const [isSavingTitle, setIsSavingTitle] = useState(false)

  useEffect(() => {
    if (!isEditingTitle) {
      setDraftTitle(resolvedTitle)
    }
  }, [resolvedTitle, isEditingTitle])

  const handleStartEditTitle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (isFinalTitleLocked) {
      toast.error("Judul final sudah ditetapkan. Working title dikunci.")
      return
    }

    setDraftTitle(resolvedTitle)
    setIsEditingTitle(true)
  }

  const handleCancelEditTitle = () => {
    setDraftTitle(resolvedTitle)
    setIsEditingTitle(false)
  }

  const handleSaveWorkingTitle = async () => {
    if (!onUpdateWorkingTitle || isFinalTitleLocked) return
    const normalizedDraftTitle = draftTitle.trim().replace(/\s+/g, " ")

    if (!normalizedDraftTitle) {
      toast.error("Working title tidak boleh kosong.")
      return
    }

    if (normalizedDraftTitle === resolvedTitle) {
      setIsEditingTitle(false)
      return
    }

    setIsSavingTitle(true)
    try {
      await onUpdateWorkingTitle(normalizedDraftTitle)
      setIsEditingTitle(false)
      toast.success("Working title berhasil diperbarui.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui working title.")
    } finally {
      setIsSavingTitle(false)
    }
  }

  // Status color - Mechanical Grace: Sky for in-progress, Emerald for completed
  const isCompleted = session.currentStage === "completed"
  const statusColorClass = isCompleted ? "bg-emerald-500" : "bg-sky-500"

  // Group artifacts by type and get latest version of each
  const latestArtifacts = artifacts
    ? getLatestArtifactVersions(artifacts)
    : []
  const hasArtifacts = latestArtifacts.length > 0

  return (
    <div className="mb-0.5">
      {/* Folder Header */}
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-action border border-transparent px-4 py-2 transition-colors",
          "hover:border-border/40 hover:bg-accent/60"
        )}
        onClick={onToggle}
      >
        {/* Chevron - rotates when expanded */}
        <NavArrowRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-150 shrink-0",
            isExpanded && "rotate-90"
          )}
        />

        {/* Status Dot - 8px, Mechanical Grace: Sky for in-progress */}
        <div
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            statusColorClass
          )}
        />

        {/* Folder Icon - Solid sky style */}
        <Folder className="h-[18px] w-[18px] shrink-0 text-sky-600 dark:text-sky-400 [&_path]:fill-current [&_path]:stroke-current" />

        <div
          className="flex flex-1 min-w-0 items-center gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          {isEditingTitle ? (
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleSaveWorkingTitle()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  handleCancelEditTitle()
                }
              }}
              onBlur={() => {
                void handleSaveWorkingTitle()
              }}
              disabled={isSavingTitle}
              autoFocus
              className="h-7 w-full rounded-action border border-border/70 bg-background px-2 text-[12px] font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
              aria-label="Edit working title"
            />
          ) : (
            <span className="text-[13px] font-mono font-medium truncate flex-1">
              {displayTitle}
            </span>
          )}

          {!isFinalTitleLocked && (
            <button
              type="button"
              className="h-6 w-6 shrink-0 rounded-action border border-border/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                if (isEditingTitle) {
                  event.stopPropagation()
                  void handleSaveWorkingTitle()
                  return
                }
                handleStartEditTitle(event)
              }}
              disabled={isSavingTitle}
              aria-label={isEditingTitle ? "Simpan working title" : "Edit working title"}
              title={isEditingTitle ? "Simpan" : "Edit working title"}
            >
              {isEditingTitle ? (
                <span className="text-[9px] font-mono font-semibold">OK</span>
              ) : (
                <EditPencil className="mx-auto h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pl-6 pr-1.5">
          {/* Stage Info - Mechanical Grace: Mono metadata */}
          <div className="px-4 pt-1 pb-2">
            <div className="text-[11px] font-mono text-muted-foreground/90">
              Stage {stageNumber}/13 - {stageLabel}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-badge border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {hasArtifacts ? `${latestArtifacts.length} artifak` : "Belum ada artifak"}
              </span>
            </div>
          </div>

          {/* Artifact Items */}
          {hasArtifacts ? (
            <TooltipProvider delayDuration={300}>
              {latestArtifacts.map((artifact) => (
                <ArtifactTreeItem
                  key={artifact._id}
                  artifact={artifact}
                  conversationId={session.conversationId}
                  activeArtifactId={activeArtifactId}
                  onArtifactSelect={onArtifactSelect}
                  isArtifactPanelOpen={isArtifactPanelOpen}
                  onArtifactPanelToggle={onArtifactPanelToggle}
                  onCloseMobile={onCloseMobile}
                />
              ))}
            </TooltipProvider>
          ) : (
            <div className="text-[11px] font-mono text-muted-foreground/70 py-2 px-4 uppercase">
              Belum ada artifak
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ArtifactTreeItem - Individual artifact item in the tree
 */
function ArtifactTreeItem({
  artifact,
  conversationId,
  activeArtifactId,
  onArtifactSelect,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
}: {
  artifact: ArtifactItem
  conversationId: Id<"conversations">
  activeArtifactId?: Id<"artifacts"> | null
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
}) {
  // Determine if artifact is "final" (validated/not invalidated)
  const isFinal = !artifact.invalidatedAt
  const isSelected = activeArtifactId === artifact._id

  const handleClick = () => {
    // Open artifact panel if not open
    if (!isArtifactPanelOpen && onArtifactPanelToggle) {
      onArtifactPanelToggle()
    }
    // Select this artifact
    if (onArtifactSelect) {
      onArtifactSelect(artifact._id)
    }
    // Close mobile menu
    onCloseMobile?.()
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/chat/${conversationId}`}
          onClick={handleClick}
          className={cn(
            "my-1 mr-3 flex cursor-pointer items-center gap-2 rounded-action border px-3.5 py-2 transition-colors",
            "border-transparent hover:bg-slate-300 dark:hover:bg-slate-600/60",
            isSelected && "border-slate-300/90 bg-slate-50 shadow-[inset_0_1px_0_var(--border-hairline-soft)] dark:border-slate-700 dark:bg-slate-900/60"
          )}
          aria-current={isSelected ? "page" : undefined}
        >
          {/* Document Icon / Refrasa Badge */}
          {artifact.type === "refrasa" ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-amber-500/20 text-[9px] font-mono font-bold text-amber-700 dark:text-amber-300">
              R
            </span>
          ) : (
            <Page
              className={cn(
                "h-4 w-4 shrink-0",
                isFinal ? "text-slate-500 dark:text-slate-200" : "text-amber-600 dark:text-amber-300"
              )}
            />
          )}

          {/* File Name */}
          <span className="flex-1 truncate text-[13px]">{artifact.title}</span>

          {/* Version Badge */}
          <span className="shrink-0 rounded-badge border border-border/60 bg-sky-500/90 px-1.5 py-0.5 text-[9px] font-mono font-medium text-slate-50">
            v{artifact.version}
          </span>

          {/* Status Badge */}
          {isFinal && (
            <span className="ml-1 shrink-0 rounded-badge border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-slate-600 dark:text-slate-50 dark:bg-emerald-500/80">
              FINAL
            </span>
          )}
          {!isFinal && (
            <span className="ml-1 shrink-0 rounded-badge border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-amber-700 dark:text-amber-300">
              REVISI
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="font-mono text-xs">
        {artifact.title}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Get latest version of each artifact (by title/type)
 * Groups artifacts and returns only the highest version of each
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

  // Orphan refrasas (source not in latest list — safety net)
  const placedIds = new Set(result.map((a) => a._id))
  for (const r of refrasas) {
    if (!placedIds.has(r._id)) result.push(r)
  }

  return result
}

export default SidebarPaperSessions
