"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Skeleton } from "@/components/ui/skeleton"
import { Page, Folder, NavArrowRight, EditPencil, Settings } from "iconoir-react"
import { cn } from "@/lib/utils"
import {
  STAGE_ORDER,
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { useEffect, useState, type MouseEvent } from "react"
import { Id } from "../../../../convex/_generated/dataModel"
import { resolvePaperDisplayTitle } from "@/lib/paper/title-resolver"
import { toast } from "sonner"
import type { ArtifactOpenOptions } from "@/lib/hooks/useArtifactTabs"

/** Options for artifact selection (supports read-only cross-session preview) */
export type ArtifactSelectOpts = ArtifactOpenOptions

interface SidebarPaperSessionsProps {
  currentConversationId: string | null
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: ArtifactSelectOpts) => void
  activeArtifactId?: Id<"artifacts"> | null
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onOpenPaperSessionsManager?: () => void
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
  messageId?: Id<"messages">
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
  onOpenPaperSessionsManager,
  onCloseMobile,
}: SidebarPaperSessionsProps) {
  const { user, isLoading: isUserLoading } = useCurrentUser()

  // Accordion: only one folder expanded at a time.
  // Tracks both manual user selection and auto-expand from active session.
  const [expandedFolderId, setExpandedFolderId] = useState<Id<"paperSessions"> | null>(null)
  const [lastSyncedSessionId, setLastSyncedSessionId] = useState<Id<"paperSessions"> | null>(null)

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

  // Query all sessions for header count only.
  const allSessions = useQuery(
    api.paperSessions.getByUser,
    user?._id ? { userId: user._id } : "skip"
  )
  const allArtifacts = useQuery(
    api.artifacts.listByUser,
    user?._id ? { userId: user._id } : "skip"
  ) as ArtifactItem[] | undefined
  const artifactsByConversation = allArtifacts?.reduce<Record<string, ArtifactItem[]>>((acc, artifact) => {
    const key = String(artifact.conversationId)
    if (!acc[key]) acc[key] = []
    acc[key].push(artifact)
    return acc
  }, {})

  // Auto-expand active session when conversation changes
  const activeSessionId = (session?._id as Id<"paperSessions"> | undefined) ?? null
  if (activeSessionId && activeSessionId !== lastSyncedSessionId) {
    setLastSyncedSessionId(activeSessionId)
    setExpandedFolderId(activeSessionId)
  } else if (!activeSessionId && lastSyncedSessionId) {
    setLastSyncedSessionId(null)
  }

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
        <SidebarPaperSessionsHeader
          sessionCount={allSessions?.length}
          onOpenPaperSessionsManager={onOpenPaperSessionsManager}
        />
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <Page className="h-8 w-8 text-[var(--chat-muted-foreground)] opacity-50 mb-2" />
          <span className="text-sm text-[var(--chat-muted-foreground)] font-medium font-mono">
            Belum ada sesi penyusunan paper.
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

  // No paper session in this conversation — show indicator + other sessions
  if (!isPaperMode || !session) {
    return (
      <div className="flex flex-col h-full">
        <SidebarPaperSessionsHeader
          sessionCount={allSessions?.length}
          onOpenPaperSessionsManager={onOpenPaperSessionsManager}
        />
        {/* No active session indicator */}
        <div className="px-4 py-3 text-center">
          <span className="text-xs text-[var(--chat-muted-foreground)] opacity-60 font-mono">
            Percakapan ini belum memiliki sesi paper
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
      <SidebarPaperSessionsHeader
        sessionCount={allSessions?.length}
        onOpenPaperSessionsManager={onOpenPaperSessionsManager}
      />

      {/* Paper Folder - Active session only */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <PaperFolderItem
          session={sessionItem}
          isExpanded={expandedFolderId === sessionItem._id}
          onToggle={() => setExpandedFolderId(prev => prev === sessionItem._id ? null : sessionItem._id)}
          onArtifactSelect={onArtifactSelect}
          activeArtifactId={activeArtifactId}
          isArtifactPanelOpen={isArtifactPanelOpen}
          onArtifactPanelToggle={onArtifactPanelToggle}
          onCloseMobile={onCloseMobile}
          conversationTitle={conversation?.title}
          onUpdateWorkingTitle={(title) => updateWorkingTitle(user!._id, title)}
          artifacts={artifactsByConversation?.[String(sessionItem.conversationId)]}
        />
      </div>
    </div>
  )
}

function SidebarPaperSessionsHeader({
  sessionCount,
  onOpenPaperSessionsManager,
}: {
  sessionCount?: number
  onOpenPaperSessionsManager?: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[color:var(--chat-border)] px-4 pb-3 pt-5">
      <div className="min-w-0">
        <div className="text-sm font-semibold">Sesi Paper</div>
        <div className="text-[11px] font-mono text-[var(--chat-muted-foreground)]">
          Folder Artifak{typeof sessionCount === "number" ? ` · ${sessionCount} sesi` : ""}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenPaperSessionsManager}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-action bg-transparent",
          "text-[var(--chat-muted-foreground)] transition-colors duration-150",
          "hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-foreground)]"
        )}
        aria-label="Buka panel sesi paper"
        title="Buka panel sesi paper"
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
      </button>
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
  artifacts,
}: {
  session: PaperSessionItem
  isExpanded: boolean
  onToggle: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: ArtifactSelectOpts) => void
  activeArtifactId?: Id<"artifacts"> | null
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
  conversationTitle?: string
  onUpdateWorkingTitle?: (title: string) => Promise<unknown> | undefined
  artifacts?: ArtifactItem[]
}) {
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

  // Status dot — sky for in-progress, green for completed
  const isCompleted = session.currentStage === "completed"
  const statusColorClass = isCompleted
    ? "bg-[var(--chat-success)]"
    : "bg-sky-500 dark:bg-sky-400"

  // Group artifacts by type and get latest version of each
  const latestArtifacts = artifacts
    ? getLatestArtifactVersions(artifacts)
    : []
  const hasArtifacts = latestArtifacts.length > 0

  return (
    <div
      className={cn(
        "mb-0.5 transition-colors",
        isExpanded
          ? "pb-3 bg-[var(--chat-accent)]"
          : ""
      )}
    >
      {/* Folder Header */}
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 px-4 py-2 transition-colors",
          !isExpanded && "rounded-action hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)]"
        )}
        onClick={onToggle}
      >
        {/* Chevron - rotates when expanded */}
        <NavArrowRight
          className={cn(
            "h-4 w-4 text-[var(--chat-muted-foreground)] transition-transform duration-150 shrink-0",
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
        <Folder className="h-[18px] w-[18px] shrink-0 text-sky-500 dark:text-sky-400 [&_path]:fill-current [&_path]:stroke-current" />

        <div
          className="flex flex-1 min-w-0 flex-col"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-1.5">
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
              className="h-7 w-full rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-2 text-[12px] font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
              aria-label="Edit working title"
            />
          ) : (
            <span className="text-xs font-mono font-medium truncate flex-1">
              {displayTitle}
            </span>
          )}

          {!isFinalTitleLocked && (
            <button
              type="button"
              className="h-6 w-6 shrink-0 rounded-action border border-[color:var(--chat-border)] text-[var(--chat-muted-foreground)] transition-colors hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
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
            >
              {isEditingTitle ? (
                <span className="text-[9px] font-mono font-semibold">OK</span>
              ) : (
                <EditPencil className="mx-auto h-3.5 w-3.5" />
              )}
            </button>
          )}
          </div>
          {!isExpanded && (
            <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)] opacity-70 truncate">
              Stage {stageNumber}/{STAGE_ORDER.length}
              {artifacts === undefined ? " · Memuat artifak..." : ` · ${latestArtifacts.length} artifak`}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pl-6 pr-1.5">
          {/* Stage Info - Mechanical Grace: Mono metadata */}
          <div className="px-4 pt-1 pb-2">
            <div className="text-[11px] font-mono text-[var(--chat-muted-foreground)]">
              Stage {stageNumber}/{STAGE_ORDER.length} - {stageLabel}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--chat-muted-foreground)]">
                {artifacts === undefined
                  ? "Memuat artifak..."
                  : hasArtifacts
                    ? `${latestArtifacts.length} artifak`
                    : "Belum ada artifak"}
              </span>
            </div>
          </div>

          {/* Artifact Items */}
          {hasArtifacts &&
            latestArtifacts.map((artifact) => (
              <ArtifactTreeItem
                key={artifact._id}
                artifact={artifact}
                sessionId={session._id}
                sessionTitle={resolvedTitle}
                conversationId={session.conversationId}
                activeArtifactId={activeArtifactId}
                onArtifactSelect={onArtifactSelect}
                isArtifactPanelOpen={isArtifactPanelOpen}
                onArtifactPanelToggle={onArtifactPanelToggle}
                onCloseMobile={onCloseMobile}
              />
            ))}
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
  sessionId,
  sessionTitle,
  conversationId,
  activeArtifactId,
  onArtifactSelect,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
}: {
  artifact: ArtifactItem
  sessionId: Id<"paperSessions">
  sessionTitle: string
  conversationId: Id<"conversations">
  activeArtifactId?: Id<"artifacts"> | null
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: ArtifactSelectOpts) => void
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
      onArtifactSelect(artifact._id, {
        title: artifact.title,
        type: artifact.type,
        origin: "paper-active-session",
        originSessionId: sessionId,
        originSessionTitle: sessionTitle,
        sourceConversationId: conversationId,
        sourceMessageId: artifact.messageId,
        sourceKind: artifact.type === "refrasa" ? "refrasa" : "artifact",
      })
    }
    // Close mobile menu
    onCloseMobile?.()
  }

  return (
    <Link
      href={`/chat/${conversationId}`}
      onClick={handleClick}
      className={cn(
        "my-1 mr-3 flex cursor-pointer items-center gap-2 rounded-action px-3.5 py-2 transition-colors",
        "hover:bg-[var(--chat-accent)]",
        isSelected &&
          "bg-[var(--chat-accent)]"
      )}
      aria-current={isSelected ? "page" : undefined}
    >
      {/* Document Icon / Refrasa Badge */}
      {artifact.type === "refrasa" ? (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[var(--chat-info)] text-[9px] font-mono font-bold text-[var(--chat-info-foreground)]">
          R
        </span>
      ) : (
        <Page
          className="h-4 w-4 shrink-0 text-[var(--chat-muted-foreground)]"
        />
      )}

      {/* File Name */}
      <span className="flex-1 truncate text-xs">{artifact.title}</span>

      {/* Version Badge */}
      <span className="shrink-0 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5 text-[9px] font-mono font-medium text-[var(--chat-secondary-foreground)]">
        v{artifact.version}
      </span>

      {/* Status Badge */}
      {isFinal && (
        <span className="ml-1 shrink-0 rounded-badge border border-[color:var(--chat-success)] bg-[var(--chat-success)] px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-[var(--chat-success-foreground)]">
          FINAL
        </span>
      )}
      {!isFinal && (
        <span className="ml-1 shrink-0 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-muted)] px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-[var(--chat-muted-foreground)]">
          REVISI
        </span>
      )}
    </Link>
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
