"use client"

import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { Folder, NavArrowRight, Page } from "iconoir-react"
import { api } from "@convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { resolvePaperDisplayTitle } from "@/lib/paper/title-resolver"
import { cn } from "@/lib/utils"
import type { ArtifactOpenOptions } from "@/lib/hooks/useArtifactTabs"
import {
  STAGE_ORDER,
  getStageLabel,
  getStageNumber,
  type PaperStageId,
} from "../../../../convex/paperSessions/constants"
import { WorkspacePanelShell } from "./WorkspacePanelShell"

interface PaperSessionsManagerPanelProps {
  currentConversationId?: string | null
  onClose: () => void
  initialView?: "root" | "session-folder"
  initialSessionId?: Id<"paperSessions"> | null
  initialSessionTitle?: string | null
  onSelectionChange?: (selection: {
    view: "root" | "session-folder"
    sessionId?: Id<"paperSessions">
    sessionTitle?: string
  }) => void
  onArtifactSelect?: (
    artifactId: Id<"artifacts">,
    opts?: ArtifactOpenOptions
  ) => void
}

interface PaperSessionListItem {
  _id: Id<"paperSessions">
  conversationId: Id<"conversations">
  workingTitle?: string
  paperTitle?: string
  currentStage: string
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
  const parents = latest.filter((artifact) => artifact.type !== "refrasa")
  const refrasas = latest.filter((artifact) => artifact.type === "refrasa")

  parents.sort((a, b) => a.createdAt - b.createdAt)

  const result: ArtifactItem[] = []
  for (const parent of parents) {
    result.push(parent)
    const children = refrasas.filter((artifact) => artifact.sourceArtifactId === parent._id)
    children.sort((a, b) => a.createdAt - b.createdAt)
    result.push(...children)
  }

  const placedIds = new Set(result.map((artifact) => artifact._id))
  for (const artifact of refrasas) {
    if (!placedIds.has(artifact._id)) {
      result.push(artifact)
    }
  }

  return result
}

export function PaperSessionsManagerPanel({
  currentConversationId = null,
  onClose,
  initialView = "root",
  initialSessionId = null,
  initialSessionTitle: _initialSessionTitle,
  onSelectionChange,
  onArtifactSelect,
}: PaperSessionsManagerPanelProps) {
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const [uncontrolledSelectedSessionId, setUncontrolledSelectedSessionId] = useState<Id<"paperSessions"> | null>(
    initialView === "session-folder" ? initialSessionId : null
  )
  const hasActiveConversation = Boolean(currentConversationId)
  const { session: activeSession, isLoading: rawSessionLoading } = usePaperSession(
    hasActiveConversation
      ? (currentConversationId as Id<"conversations">)
      : undefined
  )
  const isSessionLoading = hasActiveConversation ? rawSessionLoading : false

  const allSessions = useQuery(
    api.paperSessions.getByUser,
    user?._id ? { userId: user._id } : "skip"
  ) as PaperSessionListItem[] | undefined
  const allArtifacts = useQuery(
    api.artifacts.listByUser,
    user?._id ? { userId: user._id } : "skip"
  ) as ArtifactItem[] | undefined

  const otherSessions = useMemo(
    () => allSessions?.filter((session) => session._id !== activeSession?._id) ?? [],
    [activeSession?._id, allSessions]
  )
  const artifactsByConversation = useMemo(() => {
    if (!allArtifacts) return undefined

    return allArtifacts.reduce<Record<string, ArtifactItem[]>>((acc, artifact) => {
      const key = String(artifact.conversationId)
      if (!acc[key]) acc[key] = []
      acc[key].push(artifact)
      return acc
    }, {})
  }, [allArtifacts])

  const selectedSessionId =
    onSelectionChange
      ? (initialView === "session-folder" ? initialSessionId ?? null : null)
      : uncontrolledSelectedSessionId

  const selectedSession = useMemo(
    () => otherSessions.find((session) => session._id === selectedSessionId) ?? null,
    [otherSessions, selectedSessionId]
  )

  const content = (() => {
    if (isUserLoading || isSessionLoading || allSessions === undefined || allArtifacts === undefined) {
      return (
        <div className="px-5 py-4 text-sm text-[var(--chat-muted-foreground)]">
          Memuat sesi paper...
        </div>
      )
    }

    if (!user) {
      return (
        <div className="px-5 py-4 text-sm text-[var(--chat-muted-foreground)]">
          Data sesi paper belum tersedia. Muat ulang halaman chat.
        </div>
      )
    }

    if (otherSessions.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
          <Page
            className="mb-3 h-8 w-8 text-[var(--chat-muted-foreground)] opacity-50"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-[var(--chat-foreground)]">
            Belum ada sesi penyusunan paper.
          </p>
        </div>
      )
    }

    if (selectedSession && user) {
      return (
          <PaperSessionArtifactsView
            session={selectedSession}
            artifacts={artifactsByConversation?.[String(selectedSession.conversationId)]}
            onBack={() => {
              if (onSelectionChange) {
                onSelectionChange({ view: "root" })
                return
              }
              setUncontrolledSelectedSessionId(null)
            }}
            onArtifactSelect={(artifactId, opts) => {
              onArtifactSelect?.(artifactId, opts)
              onClose()
            }}
          />
      )
    }

    return (
      <div className="divide-y divide-[color:var(--chat-border)]">
        {otherSessions.map((session) => (
          <PaperSessionFolderButton
            key={session._id}
            session={session}
            artifacts={artifactsByConversation?.[String(session.conversationId)]}
            onSelect={(selection) => {
              if (onSelectionChange) {
                onSelectionChange(selection)
                return
              }
              setUncontrolledSelectedSessionId(selection.sessionId)
            }}
          />
        ))}
      </div>
    )
  })()

  return (
    <WorkspacePanelShell title="Sesi Paper Lainnya" onClose={onClose}>
      {content}
    </WorkspacePanelShell>
  )
}

function PaperSessionFolderButton({
  session,
  artifacts,
  onSelect,
}: {
  session: PaperSessionListItem
  artifacts?: ArtifactItem[]
  onSelect: (selection: {
    view: "session-folder"
    sessionId: Id<"paperSessions">
    sessionTitle: string
  }) => void
}) {
  const conversation = useQuery(api.conversations.getConversation, {
    conversationId: session.conversationId,
  })

  const latestArtifacts = artifacts ? getLatestArtifactVersions(artifacts) : []
  const { displayTitle } = resolvePaperDisplayTitle({
    paperTitle: session.paperTitle,
    workingTitle: session.workingTitle,
    conversationTitle: conversation?.title,
  })

  const currentStage = session.currentStage as PaperStageId | "completed"
  const stageNumber = getStageNumber(currentStage)
  const stageLabel = getStageLabel(currentStage)
  const stageMeta =
    currentStage === "completed"
      ? "Selesai"
      : `Stage ${stageNumber}/${STAGE_ORDER.length} · ${stageLabel}`

  return (
    <button
      type="button"
      onClick={() =>
        onSelect({
          view: "session-folder",
          sessionId: session._id,
          sessionTitle: displayTitle,
        })
      }
      aria-label={`Buka sesi paper ${displayTitle}`}
      className={cn(
        "flex w-full items-start gap-3 pl-8 pr-5 py-4 text-left transition-colors duration-150",
        "hover:bg-[var(--chat-accent)]"
      )}
    >
      <Folder
        className="mt-0.5 h-[18px] w-[18px] shrink-0 text-sky-500 dark:text-sky-400 [&_path]:fill-current [&_path]:stroke-current"
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-[var(--chat-foreground)]">
          {displayTitle}
        </span>
        <span className="mt-1 text-[11px] font-mono text-[var(--chat-muted-foreground)]">
          {stageMeta}
          {artifacts === undefined ? " · Memuat artifak..." : ` · ${latestArtifacts.length} artifak`}
        </span>
      </span>
      <NavArrowRight
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--chat-muted-foreground)]"
        aria-hidden="true"
      />
    </button>
  )
}

function PaperSessionArtifactsView({
  session,
  artifacts,
  onBack,
  onArtifactSelect,
}: {
  session: PaperSessionListItem
  artifacts?: ArtifactItem[]
  onBack: () => void
  onArtifactSelect?: (
    artifactId: Id<"artifacts">,
    opts?: ArtifactOpenOptions
  ) => void
}) {
  const conversation = useQuery(api.conversations.getConversation, {
    conversationId: session.conversationId,
  })

  const latestArtifacts = artifacts ? getLatestArtifactVersions(artifacts) : []
  const { displayTitle } = resolvePaperDisplayTitle({
    paperTitle: session.paperTitle,
    workingTitle: session.workingTitle,
    conversationTitle: conversation?.title,
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[color:var(--chat-border)] px-5 py-4">
        <div className="flex flex-wrap items-center gap-0.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-action",
              "text-sky-700 transition-colors duration-150 dark:text-sky-300",
              "hover:bg-[var(--chat-accent)] hover:text-sky-800 dark:hover:text-sky-200"
            )}
            aria-label="Kembali ke daftar sesi paper"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 7 5 11l4 4" />
              <path d="M5 11h8.5c3.75 0 5.5 1.75 5.5 5 0 2.15-1.1 3.85-3 5" />
            </svg>
          </button>
          <span
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-action px-1.5 py-0.5 text-left text-[11px] font-mono font-medium leading-none",
              "text-sky-700 dark:text-sky-300"
            )}
          >
            <Folder
              className="h-[15px] w-[15px] shrink-0 text-sky-500 dark:text-sky-400 [&_path]:fill-current [&_path]:stroke-current"
              aria-hidden="true"
            />
            {displayTitle}
          </span>
        </div>
        <div className="mt-2 pl-7">
          <p className="text-[11px] font-mono text-[var(--chat-muted-foreground)]">
            {artifacts === undefined ? "Memuat artifak..." : `${latestArtifacts.length} artifak`}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {artifacts === undefined ? (
          <div className="px-5 py-4 text-sm text-[var(--chat-muted-foreground)]">
            Memuat artifak...
          </div>
        ) : latestArtifacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <Page
              className="mb-3 h-8 w-8 text-[var(--chat-muted-foreground)] opacity-50"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[var(--chat-foreground)]">
              Belum ada artifak pada sesi ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--chat-border)]">
            {latestArtifacts.map((artifact) => (
              <button
                key={artifact._id}
                type="button"
                onClick={() =>
                  onArtifactSelect?.(artifact._id, {
                    readOnly: true,
                    sourceConversationId: session.conversationId,
                    origin: "paper-session-manager-folder",
                    originSessionId: session._id,
                    originSessionTitle: displayTitle,
                    sourceMessageId: artifact.messageId,
                    sourceKind: artifact.type === "refrasa" ? "refrasa" : "artifact",
                    title: artifact.title,
                    type: artifact.type,
                  })
                }
                aria-label={`Buka artifak ${artifact.title}`}
                className={cn(
                  "flex w-full items-start gap-3 pl-11 pr-5 py-4 text-left transition-colors duration-150",
                  "hover:bg-[var(--chat-accent)]"
                )}
              >
                {artifact.type === "refrasa" ? (
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[var(--chat-info)] text-[9px] font-mono font-bold text-[var(--chat-info-foreground)]">
                    R
                  </span>
                ) : (
                  <Page className="mt-0.5 h-4 w-4 shrink-0 text-[var(--chat-muted-foreground)]" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-[var(--chat-foreground)]">
                    {artifact.title}
                  </span>
                  <span className="mt-1 text-[11px] font-mono text-[var(--chat-muted-foreground)]">
                    {artifact.type} · v{artifact.version}
                  </span>
                </span>
                <NavArrowRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--chat-muted-foreground)]"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
