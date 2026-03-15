"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import {
  EditPencil,
  NavArrowRight,
  Page,
  RefreshDouble,
  Settings,
  Trash,
  Xmark,
} from "iconoir-react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { PaperSessionBadge } from "@/components/paper"
import { formatRelativeTime } from "@/lib/date/formatters"
import { cn } from "@/lib/utils"
import type { ArtifactOpenOptions } from "@/lib/hooks/useArtifactTabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getStageNumber, type PaperStageId } from "../../../../convex/paperSessions/constants"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface SidebarChatHistoryProps {
  conversations: Array<{
    _id: Id<"conversations">
    title: string
    lastMessageAt: number
  }>
  totalConversationCount?: number
  currentConversationId: string | null
  onDeleteConversation: (id: Id<"conversations">) => Promise<void> | void
  onDeleteConversations: (ids: Id<"conversations">[]) => Promise<unknown>
  onDeleteAllConversations: () => Promise<unknown>
  onUpdateConversationTitle?: (id: Id<"conversations">, title: string) => Promise<unknown>
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: ArtifactOpenOptions) => void
  activeArtifactId?: Id<"artifacts"> | null
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  manageRequestNonce?: number
  onManageModeChange?: (isManageMode: boolean) => void
  onSelectionCountChange?: (count: number, isAll: boolean) => void
  manageHeaderLabel?: string
  onToggleManageMode?: () => void
}

interface PaperSessionListItem {
  _id: Id<"paperSessions">
  conversationId: Id<"conversations">
  workingTitle?: string
  paperTitle?: string
  currentStage: string
}

interface ArtifactListItem {
  _id: Id<"artifacts">
  conversationId: Id<"conversations">
  title: string
  type: string
  version: number
  sourceArtifactId?: Id<"artifacts">
  messageId?: Id<"messages">
  createdAt: number
}

interface ConversationTreeFile {
  _id: Id<"artifacts">
  title: string
  type: string
  version: number
  sourceArtifactId?: Id<"artifacts">
  messageId?: Id<"messages">
}

interface ConversationTreeNode {
  conversationId: Id<"conversations">
  title: string
  lastMessageAt: number
  paperSession: PaperSessionListItem | null
  latestFiles: ConversationTreeFile[]
}

const INLINE_LOADING_PLACEHOLDER_COUNT = 4

const TREE_CONNECTOR_CLASSES = {
  subtreePaddingLeft: "pl-[2.95rem]",
  branchLine: "absolute left-[-0.2rem] top-[0.95rem] h-px w-[1.05rem]",
} as const

const TREE_STATE_STORAGE_KEY = "chat-sidebar-history-tree-state:v1"

function getLatestFiles(artifacts: ArtifactListItem[]): ConversationTreeFile[] {
  const latestMap = new Map<string, ArtifactListItem>()

  for (const artifact of artifacts) {
    const key = artifact.type === "refrasa"
      ? `refrasa-${artifact.sourceArtifactId ?? artifact.title}`
      : `${artifact.type}-${artifact.title}`
    const existing = latestMap.get(key)

    if (!existing || artifact.version > existing.version) {
      latestMap.set(key, artifact)
    }
  }

  const latestArtifacts = Array.from(latestMap.values())
  const parents = latestArtifacts.filter((artifact) => artifact.type !== "refrasa")
  const refrasas = latestArtifacts.filter((artifact) => artifact.type === "refrasa")

  parents.sort((left, right) => left.createdAt - right.createdAt)

  const ordered: ArtifactListItem[] = []
  for (const parent of parents) {
    ordered.push(parent)
    const children = refrasas
      .filter((artifact) => artifact.sourceArtifactId === parent._id)
      .sort((left, right) => left.createdAt - right.createdAt)
    ordered.push(...children)
  }

  const placedIds = new Set(ordered.map((artifact) => artifact._id))
  for (const artifact of refrasas) {
    if (!placedIds.has(artifact._id)) {
      ordered.push(artifact)
    }
  }

  return ordered.map((artifact) => ({
    _id: artifact._id,
    title: artifact.title,
    type: artifact.type,
    version: artifact.version,
    sourceArtifactId: artifact.sourceArtifactId,
    messageId: artifact.messageId,
  }))
}

function FileTypeBadge({ type, isActive = false }: { type: string; isActive?: boolean }) {
  if (type === "refrasa") {
    return (
      <span
        className={cn(
          "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-mono font-bold",
          isActive
            ? "bg-[color:color-mix(in_oklab,var(--chat-info)_88%,white)] text-[color:color-mix(in_oklab,var(--chat-foreground)_92%,white)] dark:bg-[color:color-mix(in_oklab,var(--chat-info)_76%,white)] dark:text-[color:color-mix(in_oklab,var(--chat-foreground)_92%,white)]"
            : "bg-[var(--chat-info)] text-[var(--chat-info-foreground)]"
        )}
      >
        R
      </span>
    )
  }

  return (
    <Page
      className={cn(
        "mt-0.5 h-4 w-4 shrink-0",
        isActive
          ? "text-[color:color-mix(in_oklab,var(--chat-info)_82%,white)] dark:text-[color:color-mix(in_oklab,var(--chat-info)_72%,white)]"
          : "text-[var(--chat-muted-foreground)]"
      )}
      aria-hidden="true"
    />
  )
}

function FolderNodeIcon({ solid }: { solid: boolean }) {
  const folderPath =
    "M3.75 7.1C3.75 5.86 4.76 4.85 6 4.85h3.23c.61 0 1.2.25 1.62.68l.9.92c.21.22.5.34.8.34H18c1.24 0 2.25 1.01 2.25 2.25v7.21A2.75 2.75 0 0 1 17.5 19H6.5a2.75 2.75 0 0 1-2.75-2.75V7.1Z"

  if (solid) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[1.12rem] w-[1.12rem] text-[color:color-mix(in_oklab,var(--chat-info)_85%,white)] dark:text-[color:color-mix(in_oklab,var(--chat-info)_72%,white)]"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d={folderPath}
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1.12rem] w-[1.12rem] text-[var(--chat-muted-foreground)]"
      aria-hidden="true"
    >
      <path
        d={folderPath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ConversationLoadingPlaceholder() {
  return (
    <div
      data-testid="conversation-loading-placeholder"
      className="flex items-start gap-2 px-3 py-3"
      aria-hidden="true"
    >
      <div className="-mt-[1px] flex h-[1.12rem] w-4 shrink-0 items-center justify-center">
        <span className="h-[1.12rem] w-[1.12rem] rounded-action border border-dashed border-[color:var(--chat-border)]" />
      </div>
      <div className="-mt-[1px] flex h-[1.12rem] w-[1.12rem] shrink-0 items-center justify-center">
        <Skeleton className="h-[1.12rem] w-[1.12rem] rounded-sm" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
    </div>
  )
}

function getFileConnectorStyle(isFirstFile: boolean, isLastFile: boolean) {
  const top = isFirstFile ? "-0.9rem" : "-0.55rem"

  if (isLastFile) {
    return {
      top,
      height: `calc(0.95rem + ${isFirstFile ? "0.9rem" : "0.55rem"})`,
    }
  }

  return {
    top,
    bottom: "-0.55rem",
  }
}

function getTreeConnectorToneClass(isActiveConversation: boolean) {
  return isActiveConversation
    ? "bg-[color:color-mix(in_oklab,var(--chat-sidebar-foreground)_22%,var(--chat-sidebar-accent))]"
    : "bg-[var(--chat-border)]"
}

function readPersistedTreeState(): {
  expandedConversationId: string | null
  manuallyCollapsedConversationIds: string[]
} {
  if (typeof window === "undefined") {
    return {
      expandedConversationId: null,
      manuallyCollapsedConversationIds: [],
    }
  }

  try {
    const raw = window.localStorage.getItem(TREE_STATE_STORAGE_KEY)
    if (!raw) {
      return {
        expandedConversationId: null,
        manuallyCollapsedConversationIds: [],
      }
    }

    const parsed = JSON.parse(raw) as {
      expandedConversationId?: string | null
      manuallyCollapsedConversationIds?: string[]
    }

    return {
      expandedConversationId: parsed.expandedConversationId ?? null,
      manuallyCollapsedConversationIds: Array.isArray(parsed.manuallyCollapsedConversationIds)
        ? parsed.manuallyCollapsedConversationIds
        : [],
    }
  } catch {
    return {
      expandedConversationId: null,
      manuallyCollapsedConversationIds: [],
    }
  }
}

export function SidebarChatHistory({
  conversations,
  totalConversationCount: _totalConversationCount,
  currentConversationId,
  onDeleteConversation,
  onDeleteConversations,
  onDeleteAllConversations,
  onUpdateConversationTitle,
  onArtifactSelect,
  activeArtifactId,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  manageRequestNonce = 0,
  onManageModeChange,
  onSelectionCountChange,
  manageHeaderLabel,
  onToggleManageMode,
}: SidebarChatHistoryProps) {
  const { user } = useCurrentUser()
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const loadMoreLockedRef = useRef(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const lastSyncedConversationIdRef = useRef<string | null>(null)
  const cachedPaperSessionsRef = useRef<PaperSessionListItem[] | undefined>(undefined)
  const cachedArtifactsRef = useRef<ArtifactListItem[] | undefined>(undefined)
  const visibleConversationIds = useMemo(
    () => conversations.map((conversation) => conversation._id),
    [conversations]
  )

  const paperSessions = useQuery(
    api.paperSessions.getByConversationIds,
    user?._id ? { userId: user._id, conversationIds: visibleConversationIds } : "skip"
  ) as PaperSessionListItem[] | undefined
  const artifacts = useQuery(
    api.artifacts.listLatestByConversationIds,
    user?._id ? { userId: user._id, conversationIds: visibleConversationIds } : "skip"
  ) as ArtifactListItem[] | undefined
  const resolvedPaperSessions = paperSessions ?? cachedPaperSessionsRef.current
  const resolvedArtifacts = artifacts ?? cachedArtifactsRef.current

  useEffect(() => {
    if (paperSessions !== undefined) {
      cachedPaperSessionsRef.current = paperSessions
    }
  }, [paperSessions])

  useEffect(() => {
    if (artifacts !== undefined) {
      cachedArtifactsRef.current = artifacts
    }
  }, [artifacts])

  const treeNodes = useMemo<ConversationTreeNode[]>(() => {
    const sessionMap = new Map<string, PaperSessionListItem>(
      (resolvedPaperSessions ?? []).map((session) => [String(session.conversationId), session])
    )
    const artifactsByConversation = new Map<string, ArtifactListItem[]>()

    for (const artifact of resolvedArtifacts ?? []) {
      const key = String(artifact.conversationId)
      const existing = artifactsByConversation.get(key)
      if (existing) {
        existing.push(artifact)
      } else {
        artifactsByConversation.set(key, [artifact])
      }
    }

    return conversations.map((conversation) => {
      const paperSession = sessionMap.get(String(conversation._id)) ?? null
      const latestFiles = paperSession
        ? getLatestFiles(artifactsByConversation.get(String(conversation._id)) ?? [])
        : []

      return {
        conversationId: conversation._id,
        title: conversation.title,
        lastMessageAt: conversation.lastMessageAt,
        paperSession,
        latestFiles,
      }
    })
  }, [conversations, resolvedArtifacts, resolvedPaperSessions])

  const [expandedConversationId, setExpandedConversationId] = useState<Id<"conversations"> | null>(null)
  const [manuallyCollapsedConversationIds, setManuallyCollapsedConversationIds] = useState<string[]>([])
  const [isTreeStateHydrated, setIsTreeStateHydrated] = useState(false)
  const [isManageMode, setIsManageMode] = useState(false)
  const [selectedConversationIds, setSelectedConversationIds] = useState<Id<"conversations">[]>([])
  const [isAllConversationsSelected, setIsAllConversationsSelected] = useState(false)
  const [deleteMode, setDeleteMode] = useState<"selected" | null>(null)
  const [editingId, setEditingId] = useState<Id<"conversations"> | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    onManageModeChange?.(isManageMode)
  }, [isManageMode, onManageModeChange])

  useEffect(() => {
    onSelectionCountChange?.(selectedConversationIds.length, isAllConversationsSelected)
  }, [selectedConversationIds.length, isAllConversationsSelected, onSelectionCountChange])

  useEffect(() => {
    if (isTreeStateHydrated) return

    const persistedState = readPersistedTreeState()
    setExpandedConversationId(
      persistedState.expandedConversationId as Id<"conversations"> | null
    )
    setManuallyCollapsedConversationIds(persistedState.manuallyCollapsedConversationIds)
    setIsTreeStateHydrated(true)
  }, [isTreeStateHydrated])

  useEffect(() => {
    if (manageRequestNonce === 0) return
    setIsManageMode((current) => {
      if (current) {
        setSelectedConversationIds([])
        setIsAllConversationsSelected(false)
      }
      return !current
    })
  }, [manageRequestNonce])

  useEffect(() => {
    if (!isTreeStateHydrated) return
    if (resolvedPaperSessions === undefined || resolvedArtifacts === undefined) return
    if (lastSyncedConversationIdRef.current === currentConversationId) return

    const activeNode = treeNodes.find((node) => String(node.conversationId) === currentConversationId)
    if (activeNode?.latestFiles.length) {
      const isManuallyCollapsed = manuallyCollapsedConversationIds.includes(
        String(activeNode.conversationId)
      )

      setExpandedConversationId(
        isManuallyCollapsed ? null : activeNode.conversationId
      )
    } else if (currentConversationId) {
      setExpandedConversationId(null)
    }

    lastSyncedConversationIdRef.current = currentConversationId
  }, [
    resolvedArtifacts,
    currentConversationId,
    isTreeStateHydrated,
    manuallyCollapsedConversationIds,
    resolvedPaperSessions,
    treeNodes,
  ])

  useEffect(() => {
    if (!isTreeStateHydrated || typeof window === "undefined") return

    window.localStorage.setItem(
      TREE_STATE_STORAGE_KEY,
      JSON.stringify({
        expandedConversationId,
        manuallyCollapsedConversationIds,
      })
    )
  }, [expandedConversationId, isTreeStateHydrated, manuallyCollapsedConversationIds])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    loadMoreLockedRef.current = false
  }, [conversations.length, hasMore])

  useEffect(() => {
    if (!hasMore || !onLoadMore || !scrollRef.current || !loadMoreRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || loadMoreLockedRef.current) return
        loadMoreLockedRef.current = true
        onLoadMore()
      },
      {
        root: scrollRef.current,
        rootMargin: "0px 0px 160px 0px",
        threshold: 0,
      }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  const selectedCount = selectedConversationIds.length
  const remainingConversationCount =
    typeof _totalConversationCount === "number"
      ? Math.max(_totalConversationCount - conversations.length, 0)
      : INLINE_LOADING_PLACEHOLDER_COUNT
  const inlineLoadingPlaceholderCount = isLoadingMore
    ? Math.max(1, Math.min(INLINE_LOADING_PLACEHOLDER_COUNT, remainingConversationCount || INLINE_LOADING_PLACEHOLDER_COUNT))
    : 0

  const handleStartEdit = useCallback((conversationId: Id<"conversations">, title: string) => {
    if (!onUpdateConversationTitle || isManageMode) return
    setEditingId(conversationId)
    setEditValue(title)
  }, [isManageMode, onUpdateConversationTitle])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditValue("")
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !onUpdateConversationTitle) {
      handleCancelEdit()
      return
    }

    const nextTitle = editValue.trim()
    const originalTitle = treeNodes.find((node) => node.conversationId === editingId)?.title ?? ""

    if (!nextTitle || nextTitle === originalTitle) {
      handleCancelEdit()
      return
    }

    if (nextTitle.length > 50) {
      toast.error("Judul maksimal 50 karakter")
      return
    }

    setIsUpdatingTitle(true)
    try {
      await onUpdateConversationTitle(editingId, nextTitle)
    } catch {
      toast.error("Gagal menyimpan judul")
    } finally {
      setIsUpdatingTitle(false)
      handleCancelEdit()
    }
  }, [editValue, editingId, handleCancelEdit, onUpdateConversationTitle, treeNodes])

  const toggleConversationSelection = (conversationId: Id<"conversations">) => {
    setIsAllConversationsSelected(false)
    setSelectedConversationIds((current) =>
      current.includes(conversationId)
        ? current.filter((id) => id !== conversationId)
        : [...current, conversationId]
    )
  }

  const handleToggleSelectAllConversations = () => {
    setIsAllConversationsSelected((current) => {
      const next = !current
      setSelectedConversationIds([])
      return next
    })
  }

  const handleConfirmDelete = async () => {
    if (deleteMode === null) return
    if (!isAllConversationsSelected && selectedConversationIds.length === 0) return

    setIsDeleting(true)
    try {
      if (isAllConversationsSelected) {
        await onDeleteAllConversations()
        setSelectedConversationIds([])
        setIsAllConversationsSelected(false)
      } else if (selectedConversationIds.length === 1) {
        await onDeleteConversation(selectedConversationIds[0])
        setSelectedConversationIds([])
      } else if (selectedConversationIds.length > 1) {
        await onDeleteConversations(selectedConversationIds)
        setSelectedConversationIds([])
      }
      setDeleteMode(null)
      setIsManageMode(false)
      onCloseMobile?.()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleArtifactClick = (node: ConversationTreeNode, file: ConversationTreeFile) => {
    if (!isArtifactPanelOpen) {
      onArtifactPanelToggle?.()
    }

    onArtifactSelect?.(file._id, {
      title: file.title,
      type: file.type,
      readOnly: currentConversationId !== String(node.conversationId),
      sourceConversationId: node.conversationId,
      sourceMessageId: file.messageId,
      sourceKind: file.type === "refrasa" ? "refrasa" : "artifact",
      origin: "chat",
    })

    onCloseMobile?.()
  }

  const handleToggleConversationTree = useCallback((conversationId: Id<"conversations">) => {
    setExpandedConversationId((current) => {
      const willCollapse = current === conversationId

      setManuallyCollapsedConversationIds((existing) => {
        const next = new Set(existing)

        if (willCollapse) {
          next.add(String(conversationId))
        } else {
          next.delete(String(conversationId))
        }

        return Array.from(next)
      })

      return willCollapse ? null : conversationId
    })
  }, [])

  if (isLoading || resolvedPaperSessions === undefined || resolvedArtifacts === undefined) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-[color:var(--chat-border)] px-3 py-2">
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="space-y-2 p-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex flex-col gap-2 px-2 py-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (treeNodes.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[var(--chat-muted-foreground)] opacity-50">
          <div className="mb-2">
            <FolderNodeIcon solid={false} />
          </div>
          <span className="text-xs">Belum ada percakapan</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        {isManageMode ? (
          <div className="shrink-0 border-b border-[color:var(--chat-border)] px-3 pt-3 md:pt-0 flex flex-col">
            {/* Riwayat header — rendered here in manage mode for uniform gap control */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex min-w-0 items-center gap-2 text-[color:color-mix(in_oklab,var(--chat-info)_80%,var(--chat-sidebar-foreground))]">
                <span className="truncate text-sm font-sans font-semibold">
                  Riwayat
                </span>
                {manageHeaderLabel ? (
                  <span className="shrink-0 rounded-badge border px-2 py-0.5 text-[10px] font-mono font-semibold leading-none border-[color:color-mix(in_oklab,var(--chat-info)_24%,var(--chat-border))] bg-[color:color-mix(in_oklab,var(--chat-info)_14%,var(--chat-muted))] text-[color:color-mix(in_oklab,var(--chat-info)_45%,var(--chat-muted-foreground))]">
                    {manageHeaderLabel}
                  </span>
                ) : null}
              </div>
              {onToggleManageMode ? (
                <button
                  type="button"
                  onClick={onToggleManageMode}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-action text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] transition-colors duration-150"
                  aria-label="Tutup mode kelola riwayat"
                >
                  <Xmark className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {/* Select-all + delete action row — mirrors conversation item layout for alignment */}
            <div className="flex items-start gap-2 pb-3">
              <div className="-mt-[1px] flex h-[1.12rem] w-4 shrink-0 items-center justify-center" aria-hidden="true">
                <span className="h-[1.12rem] w-4" />
              </div>
              <div className="-mt-[1px] flex h-[1.12rem] w-[1.12rem] shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={isAllConversationsSelected}
                  onChange={handleToggleSelectAllConversations}
                  className="h-3.5 w-3.5 rounded border border-[color:var(--chat-border)] bg-[var(--chat-sidebar)] accent-[var(--chat-info)]"
                  aria-label={isAllConversationsSelected ? "Batal pilih semua percakapan" : "Pilih semua percakapan"}
                />
              </div>
              <div className="min-w-0 flex-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setDeleteMode("selected")}
                    disabled={!isAllConversationsSelected && selectedCount === 0}
                    className={cn(
                      "-mt-[1px] inline-flex h-[1.12rem] w-[1.12rem] items-center justify-center rounded-action transition-colors",
                      !isAllConversationsSelected && selectedCount === 0
                        ? "cursor-not-allowed text-[var(--chat-muted-foreground)] opacity-45"
                        : "text-[var(--chat-destructive)] hover:bg-[color:color-mix(in_oklab,var(--chat-destructive)_12%,transparent)]"
                    )}
                    aria-label="Hapus percakapan yang dipilih"
                  >
                    <Trash className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs">Hapus</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="shrink-0 px-3 pt-3 pb-2 md:pt-0 md:pb-2.5">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <div className="hidden min-w-0 items-center gap-2 text-[var(--chat-sidebar-foreground)] md:flex">
                  <span className="truncate text-sm font-sans font-semibold">
                    Riwayat
                  </span>
                  <span className="shrink-0 rounded-badge border px-2 py-0.5 text-[10px] font-mono font-semibold border-[color:var(--chat-border)] bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]">
                    {manageHeaderLabel}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2 md:hidden">
                  <span className="truncate text-sm font-sans font-semibold text-[var(--chat-sidebar-foreground)]">
                    Percakapan
                  </span>
                  <span className="shrink-0 rounded-badge border px-2 py-0.5 text-[10px] font-mono font-semibold leading-none border-[color:var(--chat-border)] bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]">
                    {manageHeaderLabel}
                  </span>
                </div>
              </div>
              {onToggleManageMode ? (
                <button
                  type="button"
                  onClick={onToggleManageMode}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-action text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] transition-colors duration-150"
                  aria-label="Buka mode kelola riwayat"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        )}

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="pb-1">
            {treeNodes.map((node) => {
              const hasChildren = node.latestFiles.length > 0
              const isExpanded = expandedConversationId === node.conversationId
              const isActiveConversation = currentConversationId === String(node.conversationId)
              const isEditing = editingId === node.conversationId
              const stageId = node.paperSession?.currentStage as PaperStageId | "completed" | undefined
              const stageNumber = stageId ? getStageNumber(stageId) : null
              const metaLabel = formatRelativeTime(node.lastMessageAt)

              return (
                <div key={node.conversationId}>
                  <div
                    className={cn(
                      "group flex items-start gap-2 px-3 py-3 transition-colors duration-150",
                      isActiveConversation
                        ? "bg-[var(--chat-sidebar-accent)] text-[var(--chat-sidebar-accent-foreground)]"
                        : "hover:bg-[var(--chat-sidebar-accent)]"
                    )}
                  >
                    <div className="-mt-[1px] flex h-[1.12rem] w-4 shrink-0 items-center justify-center">
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => handleToggleConversationTree(node.conversationId)}
                          className="flex h-[1.12rem] w-[1.12rem] items-center justify-center rounded-action text-[var(--chat-muted-foreground)] transition-colors hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)]"
                          aria-label={isExpanded ? "Tutup subtree percakapan" : "Buka subtree percakapan"}
                        >
                          <NavArrowRight
                            className={cn(
                              "h-[0.95rem] w-[0.95rem] text-[var(--chat-muted-foreground)] transition-transform duration-150",
                              isExpanded && "rotate-90"
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        <span className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>

                    {isManageMode ? (
                      <div className="-mt-[1px] flex h-[1.12rem] w-[1.12rem] shrink-0 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isAllConversationsSelected || selectedConversationIds.includes(node.conversationId)}
                          onChange={() => toggleConversationSelection(node.conversationId)}
                          className="h-3.5 w-3.5 rounded border border-[color:var(--chat-border)] bg-[var(--chat-sidebar)] accent-[var(--chat-info)]"
                          aria-label={`Pilih percakapan ${node.title}`}
                        />
                      </div>
                    ) : null}

                    <div className="-mt-[1px] flex h-[1.12rem] w-[1.12rem] shrink-0 items-center justify-center" aria-hidden="true">
                      <FolderNodeIcon solid={hasChildren} />
                    </div>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-start gap-2">
                          <Input
                            ref={editInputRef}
                            value={editValue}
                            onChange={(event) => setEditValue(event.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                void handleSaveEdit()
                              } else if (event.key === "Escape") {
                                event.preventDefault()
                                handleCancelEdit()
                              }
                            }}
                            disabled={isUpdatingTitle}
                            className="h-6 px-1 py-0 text-xs font-medium"
                          />
                          {isUpdatingTitle ? (
                            <RefreshDouble className="mt-1 h-4 w-4 animate-spin text-[var(--chat-muted-foreground)]" />
                          ) : null}
                        </div>
                      ) : (
                        <Link
                          href={`/chat/${node.conversationId}`}
                          onClick={() => onCloseMobile?.()}
                          className="block min-w-0"
                          aria-current={isActiveConversation ? "page" : undefined}
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)] items-start">
                            <span
                              className={cn(
                                "truncate text-[13.5px] leading-[1.2]",
                                hasChildren
                                  ? "font-semibold text-[var(--chat-sidebar-foreground)]"
                                  : "font-medium text-[var(--chat-sidebar-foreground)]"
                              )}
                            >
                              {node.title}
                            </span>
                          </div>
                          <div
                            className="mt-1 truncate text-[11px] font-sans leading-[1.2] text-[var(--chat-muted-foreground)]"
                          >
                            {metaLabel}
                          </div>
                        </Link>
                      )}
                    </div>

                    <div className="mt-0.5 flex shrink-0 items-start gap-1">
                      {!isManageMode && onUpdateConversationTitle ? (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(node.conversationId, node.title)}
                          className="rounded-action p-1 text-[var(--chat-muted-foreground)] opacity-0 transition-all duration-150 hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] group-hover:opacity-100"
                          aria-label={`Ubah judul percakapan ${node.title}`}
                        >
                          <EditPencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                      {node.paperSession && stageNumber ? (
                        <PaperSessionBadge
                          stageNumber={stageNumber}
                          className="shrink-0"
                        />
                      ) : null}
                    </div>
                  </div>

                  {hasChildren && isExpanded ? (
                    <div
                      className={cn(
                        "relative pb-1",
                        TREE_CONNECTOR_CLASSES.subtreePaddingLeft,
                        isActiveConversation && "bg-[var(--chat-sidebar-accent)]"
                      )}
                    >
                      {node.latestFiles.map((file, index) => {
                        const isActiveArtifact = activeArtifactId === file._id
                        const isLastFile = index === node.latestFiles.length - 1
                        const isFirstFile = index === 0

                        return (
                          <button
                            key={file._id}
                            type="button"
                            onClick={() => handleArtifactClick(node, file)}
                            className={cn(
                              "group/file relative flex w-full items-start gap-2 rounded-action pl-5 pr-3 py-1.5 text-left transition-colors duration-150",
                              isActiveConversation
                                ? "hover:bg-[color:color-mix(in_oklab,var(--chat-sidebar-accent)_78%,var(--chat-accent))]"
                                : "hover:bg-[var(--chat-accent)]",
                              isActiveConversation
                                ? "bg-[color:color-mix(in_oklab,var(--chat-sidebar-accent)_38%,transparent)]"
                                : null
                            )}
                          >
                            <span
                              className={cn(
                                "absolute left-[-0.2rem] w-px",
                                getTreeConnectorToneClass(isActiveConversation)
                              )}
                              style={getFileConnectorStyle(isFirstFile, isLastFile)}
                              aria-hidden="true"
                            />
                            <span
                              className={cn(
                                TREE_CONNECTOR_CLASSES.branchLine,
                                getTreeConnectorToneClass(isActiveConversation)
                              )}
                              aria-hidden="true"
                            />
                            <FileTypeBadge type={file.type} isActive={isActiveArtifact} />
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block truncate text-[13.5px] font-medium leading-[1.2]",
                                  isActiveArtifact
                                    ? "text-[color:color-mix(in_oklab,var(--chat-info)_82%,white)] dark:text-[color:color-mix(in_oklab,var(--chat-info)_72%,white)]"
                                    : "text-[var(--chat-sidebar-foreground)]"
                                )}
                              >
                                {file.title}
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 block text-[10px] font-mono leading-[1.15]",
                                  isActiveArtifact
                                    ? "text-[color:color-mix(in_oklab,var(--chat-info)_64%,var(--chat-muted-foreground))]"
                                    : "text-[var(--chat-muted-foreground)]"
                                )}
                              >
                                {file.type === "refrasa" ? "Refrasa" : "Artifak"} · v{file.version}
                              </span>
                            </span>
                            <NavArrowRight
                              className={cn(
                                "mt-0.5 h-3.5 w-3.5 shrink-0",
                                isActiveArtifact
                                  ? "text-[color:color-mix(in_oklab,var(--chat-info)_82%,white)] dark:text-[color:color-mix(in_oklab,var(--chat-info)_72%,white)]"
                                  : "text-[var(--chat-muted-foreground)]"
                              )}
                              aria-hidden="true"
                            />
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}

            {Array.from({ length: inlineLoadingPlaceholderCount }).map((_, index) => (
              <ConversationLoadingPlaceholder key={`conversation-loading-placeholder-${index}`} />
            ))}

            {hasMore ? (
              <div className="px-3 py-3">
                <div
                  ref={loadMoreRef}
                  className={cn(
                    "flex min-h-4 items-center justify-center text-[var(--chat-muted-foreground)]",
                    isLoadingMore && "pt-1"
                  )}
                >
                  {isLoadingMore ? (
                    <RefreshDouble className="h-3.5 w-3.5 animate-spin" aria-label="Memuat percakapan" />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog open={deleteMode !== null} onOpenChange={(open) => !open && setDeleteMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan?</AlertDialogTitle>
            <AlertDialogDescription>
              {isAllConversationsSelected
                ? "Semua percakapan akan dihapus permanen bersama sesi paper, artifact, dan refrasa terkait."
                : "Percakapan yang dicentang akan dihapus permanen bersama sesi paper, artifact, dan refrasa terkait."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDelete()
              }}
              disabled={isDeleting}
              className="bg-[var(--chat-destructive)] text-[var(--chat-destructive-foreground)] hover:bg-[var(--chat-destructive)]"
            >
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshDouble className="h-4 w-4 animate-spin" />
                  Menghapus...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Trash className="h-4 w-4" />
                  Hapus
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
