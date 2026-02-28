"use client"

import { useChat } from "@ai-sdk/react"
import { UIMessage, DefaultChatTransport } from "ai"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { ChatProcessStatusBar } from "./ChatProcessStatusBar"
import type { ReasoningTraceStep, ReasoningTraceStatus } from "./ReasoningTracePanel"
import { useMessages } from "@/lib/hooks/useMessages"
import { SidebarExpand, WarningCircle, Refresh, ChatPlusIn, FastArrowUpSquare, FastArrowDownSquare, NavArrowDown, SunLight, HalfMoon } from "iconoir-react"
import { useTheme } from "next-themes"
import { Id } from "../../../convex/_generated/dataModel"
import { AttachedFileMeta } from "@/lib/types/attached-file"
import { useMutation, useQuery, useConvexAuth } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { PaperValidationPanel } from "../paper/PaperValidationPanel"
import { useSession } from "@/lib/auth-client"
import { TemplateGrid, type Template } from "./messages/TemplateGrid"
import { QuotaWarningBanner } from "./QuotaWarningBanner"
import { MobileEditDeleteSheet } from "./mobile/MobileEditDeleteSheet"
import { MobilePaperSessionsSheet } from "./mobile/MobilePaperSessionsSheet"
import { MobileProgressBar } from "./mobile/MobileProgressBar"
import { RewindConfirmationDialog } from "../paper/RewindConfirmationDialog"
import type { PaperStageId } from "../../../convex/paperSessions/constants"

/** Minimal artifact shape from Convex query (only fields we need for signal reconstruction) */
interface ConversationArtifact {
  _id: Id<"artifacts">
  _creationTime: number
  title: string
  version: number
  messageId?: Id<"messages">
  parentId?: Id<"artifacts">
  type: string
}

interface ChatWindowProps {
  conversationId: string | null
  onMobileMenuClick?: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  /** All artifacts for this conversation (for persisted artifact signals after refresh) */
  artifacts?: ConversationArtifact[]
}

type ChatListRow =
  | {
    kind: "message"
    message: UIMessage
    index: number
  }
  | {
    kind: "pending-indicator"
  }

type ProcessVisualStatus = "submitted" | "streaming" | "ready" | "error" | "stopped"
const PENDING_STARTER_PROMPT_KEY = "chat:pending-starter-prompt"

interface PendingStarterPromptPayload {
  conversationId: string
  prompt: string
}

function setPendingStarterPrompt(conversationId: string, prompt: string) {
  if (typeof window === "undefined") return
  const payload: PendingStarterPromptPayload = {
    conversationId,
    prompt,
  }
  window.sessionStorage.setItem(PENDING_STARTER_PROMPT_KEY, JSON.stringify(payload))
}

function readPendingStarterPrompt(conversationId: string): string | null {
  if (typeof window === "undefined") return null

  const raw = window.sessionStorage.getItem(PENDING_STARTER_PROMPT_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<PendingStarterPromptPayload>
    if (
      typeof parsed.conversationId !== "string" ||
      typeof parsed.prompt !== "string" ||
      parsed.conversationId !== conversationId ||
      !parsed.prompt.trim()
    ) {
      return null
    }

    return parsed.prompt.trim()
  } catch {
    window.sessionStorage.removeItem(PENDING_STARTER_PROMPT_KEY)
    return null
  }
}

function clearPendingStarterPrompt(conversationId: string) {
  if (typeof window === "undefined") return
  const raw = window.sessionStorage.getItem(PENDING_STARTER_PROMPT_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as Partial<PendingStarterPromptPayload>
    if (parsed.conversationId === conversationId) {
      window.sessionStorage.removeItem(PENDING_STARTER_PROMPT_KEY)
    }
  } catch {
    window.sessionStorage.removeItem(PENDING_STARTER_PROMPT_KEY)
  }
}

const REASONING_STEP_ORDER = [
  "intent-analysis",
  "paper-context-check",
  "search-decision",
  "source-validation",
  "response-compose",
  "tool-action",
] as const

const REASONING_STATUS_SET = new Set<ReasoningTraceStatus>([
  "pending",
  "running",
  "done",
  "skipped",
  "error",
])

interface PersistedReasoningTraceStepRaw {
  stepKey?: unknown
  label?: unknown
  status?: unknown
  progress?: unknown
  ts?: unknown
  meta?: unknown
}

interface PersistedReasoningTraceRaw {
  headline?: unknown
  steps?: unknown
}

function parseReasoningMeta(meta: unknown): ReasoningTraceStep["meta"] | undefined {
  if (!meta || typeof meta !== "object") return undefined

  const value = meta as {
    note?: unknown
    sourceCount?: unknown
    toolName?: unknown
    stage?: unknown
    mode?: unknown
  }

  const parsed: ReasoningTraceStep["meta"] = {
    ...(typeof value.note === "string" ? { note: value.note } : {}),
    ...(typeof value.sourceCount === "number" && Number.isFinite(value.sourceCount)
      ? { sourceCount: value.sourceCount }
      : {}),
    ...(typeof value.toolName === "string" ? { toolName: value.toolName } : {}),
    ...(typeof value.stage === "string" ? { stage: value.stage } : {}),
    ...(value.mode === "normal" || value.mode === "paper" || value.mode === "websearch"
      ? { mode: value.mode as "normal" | "paper" | "websearch" }
      : {}),
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined
}

function extractReasoningTraceSteps(uiMessage: UIMessage): ReasoningTraceStep[] {
  const byStepKey = new Map<string, ReasoningTraceStep>()

  for (const part of uiMessage.parts ?? []) {
    if (!part || typeof part !== "object") continue

    const maybeDataPart = part as unknown as { type?: string; data?: unknown }
    if (maybeDataPart.type !== "data-reasoning-trace") continue
    if (!maybeDataPart.data || typeof maybeDataPart.data !== "object") continue

    const data = maybeDataPart.data as {
      traceId?: unknown
      stepKey?: unknown
      label?: unknown
      status?: unknown
      progress?: unknown
      ts?: unknown
      meta?: unknown
    }

    if (typeof data.traceId !== "string") continue
    if (typeof data.stepKey !== "string") continue
    if (typeof data.label !== "string") continue
    if (typeof data.status !== "string" || !REASONING_STATUS_SET.has(data.status as ReasoningTraceStatus)) continue

    const progress =
      typeof data.progress === "number" && Number.isFinite(data.progress)
        ? Math.max(0, Math.min(100, Math.round(data.progress)))
        : 0

    const parsedStep: ReasoningTraceStep = {
      traceId: data.traceId,
      stepKey: data.stepKey,
      label: data.label,
      status: data.status as ReasoningTraceStatus,
      progress,
      ...(typeof data.ts === "number" && Number.isFinite(data.ts) ? { ts: data.ts } : {}),
      ...(typeof (data as { thought?: unknown }).thought === "string"
        ? { thought: (data as { thought?: unknown }).thought as string }
        : {}),
    }

    const parsedMeta = parseReasoningMeta(data.meta)
    if (parsedMeta) parsedStep.meta = parsedMeta

    byStepKey.set(data.stepKey, parsedStep)
  }

  if (byStepKey.size === 0) {
    const persistedTrace = (uiMessage as unknown as { reasoningTrace?: PersistedReasoningTraceRaw }).reasoningTrace
    if (persistedTrace && typeof persistedTrace === "object" && Array.isArray(persistedTrace.steps)) {
      for (const rawStep of persistedTrace.steps as PersistedReasoningTraceStepRaw[]) {
        if (!rawStep || typeof rawStep !== "object") continue
        if (typeof rawStep.stepKey !== "string") continue
        if (typeof rawStep.label !== "string") continue
        if (typeof rawStep.status !== "string") continue
        if (!REASONING_STATUS_SET.has(rawStep.status as ReasoningTraceStatus)) continue

        const progress =
          typeof rawStep.progress === "number" && Number.isFinite(rawStep.progress)
            ? Math.max(0, Math.min(100, Math.round(rawStep.progress)))
            : 0
        const parsedMeta = parseReasoningMeta(rawStep.meta)

        byStepKey.set(rawStep.stepKey, {
          traceId: uiMessage.id,
          stepKey: rawStep.stepKey,
          label: rawStep.label,
          status: rawStep.status as ReasoningTraceStatus,
          progress,
          ...(typeof rawStep.ts === "number" && Number.isFinite(rawStep.ts) ? { ts: rawStep.ts } : {}),
          ...(parsedMeta ? { meta: parsedMeta } : {}),
          ...(typeof (rawStep as { thought?: unknown }).thought === "string"
            ? { thought: (rawStep as { thought?: unknown }).thought as string }
            : {}),
        })
      }
    }
  }

  const ordered = REASONING_STEP_ORDER
    .map((stepKey) => byStepKey.get(stepKey))
    .filter((step): step is ReasoningTraceStep => Boolean(step))

  return ordered
}

function extractLiveThought(uiMessage: UIMessage): string | null {
  let lastThought: string | null = null

  for (const part of uiMessage.parts ?? []) {
    if (!part || typeof part !== "object") continue
    const dataPart = part as { type?: unknown; data?: unknown }
    if (dataPart.type !== "data-reasoning-thought") continue
    if (!dataPart.data || typeof dataPart.data !== "object") continue

    const data = dataPart.data as { delta?: unknown }
    if (typeof data.delta === "string" && data.delta.trim()) {
      lastThought = data.delta.trim()
    }
  }

  return lastThought
}

const TEMPLATE_LABELS = new Set([
  "Memahami kebutuhan user",
  "Memeriksa konteks paper aktif",
  "Menentukan kebutuhan pencarian web",
  "Memvalidasi sumber referensi",
  "Menyusun jawaban final",
  "Menjalankan aksi pendukung",
])

function isTemplateLabel(label: string): boolean {
  return TEMPLATE_LABELS.has(label)
}

function extractReasoningHeadline(uiMessage: UIMessage, steps: ReasoningTraceStep[]): string | null {
  for (const part of uiMessage.parts ?? []) {
    if (!part || typeof part !== "object") continue
    const dataPart = part as { type?: unknown; data?: unknown }
    if (dataPart.type !== "data-reasoning-headline") continue
    if (!dataPart.data || typeof dataPart.data !== "object") continue

    const data = dataPart.data as { text?: unknown }
    if (typeof data.text === "string" && data.text.trim()) {
      return data.text.trim()
    }
  }

  const persistedTrace = (uiMessage as unknown as { reasoningTrace?: PersistedReasoningTraceRaw }).reasoningTrace
  if (persistedTrace && typeof persistedTrace.headline === "string" && persistedTrace.headline.trim()) {
    return persistedTrace.headline.trim()
  }

  if (steps.length === 0) return null

  const running = steps.find((step) => step.status === "running")
  if (running) {
    if (isTemplateLabel(running.label)) return "Berpikir..."
    return running.label
  }

  const errored = steps.find((step) => step.status === "error")
  if (errored) return `Terjadi kendala saat ${lowerFirst(errored.label)}.`

  return "Selesai menyusun jawaban."
}

function lowerFirst(input: string) {
  if (!input) return input
  return input.charAt(0).toLowerCase() + input.slice(1)
}

function PendingAssistantLaneIndicator() {
  return (
    <div
      className="flex justify-start"
      role="status"
      aria-live="polite"
      aria-label="Agen sedang menyusun respons"
    >
      <div className="flex items-center gap-2 text-[var(--chat-muted-foreground)]">
        <span className="h-2.5 w-2.5 rounded-full bg-current animate-chat-assistant-loader-orb" />
        <span className="relative h-[2px] w-28 overflow-hidden rounded-full bg-[var(--chat-muted)]">
          <span className="absolute left-0 top-0 h-full w-12 rounded-full bg-current animate-chat-assistant-loader-bar" />
        </span>
      </div>
    </div>
  )
}

export function ChatWindow({ conversationId, onMobileMenuClick, onArtifactSelect, artifacts: conversationArtifacts }: ChatWindowProps) {
  const router = useRouter()
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const scrollRafRef = useRef<number | null>(null)
  const pendingScrollToBottomRef = useRef(false)
  const wasGeneratingRef = useRef(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isAwaitingAssistantStart, setIsAwaitingAssistantStart] = useState(false)
  const [input, setInput] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileMeta[]>([])
  const [isAttachmentDraftDirty, setIsAttachmentDraftDirty] = useState(false)
  const [imageDataUrls, setImageDataUrls] = useState<Map<string, string>>(new Map())
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [showEditDeleteSheet, setShowEditDeleteSheet] = useState(false)
  const [showPaperSessionsSheet, setShowPaperSessionsSheet] = useState(false)
  const [pendingRewindTarget, setPendingRewindTarget] = useState<PaperStageId | null>(null)
  const [isRewindSubmitting, setIsRewindSubmitting] = useState(false)
  const [processUi, setProcessUi] = useState<{
    visible: boolean
    status: ProcessVisualStatus
    progress: number
    elapsedSeconds: number
  }>({
    visible: false,
    status: "ready",
    progress: 0,
    elapsedSeconds: 0,
  })
  const processIntervalRef = useRef<number | null>(null)
  const processHideTimeoutRef = useRef<number | null>(null)
  const processStartedAtRef = useRef<number | null>(null)
  const previousStatusRef = useRef<string>("ready")
  const stoppedManuallyRef = useRef(false)
  const starterPromptLastAttemptAtRef = useRef(new Map<string, number>())
  const starterPromptPendingHistorySyncRef = useRef<string | null>(null)

  const { data: session } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const userId = useQuery(api.chatHelpers.getUserId, session?.user?.id ? { betterAuthUserId: session.user.id } : "skip")
  const createConversation = useMutation(api.conversations.createConversation)
  const clearAttachmentContextMutation = useMutation(api.conversationAttachmentContexts.clearByConversation)

  const isValidConvexId = (value: string | null): value is string =>
    typeof value === "string" && /^[a-z0-9]{32}$/.test(value)
  const safeConversationId = isValidConvexId(conversationId)
    ? (conversationId as Id<"conversations">)
    : null

  const { isAuthenticated } = useConvexAuth()

  const {
    session: paperSession,
    isPaperMode,
    stageStatus,
    stageLabel,
    stageData,
    approveStage,
    requestRevision,
    markStageAsDirty,
    rewindToStage,
    getStageStartIndex,
  } = usePaperSession(safeConversationId ?? undefined)

  // Track which conversation has been synced to prevent infinite loops
  const syncedConversationRef = useRef<string | null>(null)

  // 0. Check if conversation exists (for invalid conversationId handling)
  const conversation = useQuery(
    api.conversations.getConversation,
    safeConversationId && isAuthenticated ? { conversationId: safeConversationId } : "skip"
  )

  // Auth is fully settled when userId query has resolved (not loading)
  // This prevents showing "not found" during auth sync race condition
  const isAuthSettled = !session?.user?.id || userId !== undefined

  // Loading if: query is loading OR auth is still settling (for newly created conversations)
  const isConversationLoading =
    safeConversationId !== null && (conversation === undefined || !isAuthSettled)
  // Only show "not found" when auth is fully settled AND conversation query returned null
  const conversationNotFound =
    conversationId !== null &&
    isAuthSettled &&
    (safeConversationId === null || conversation === null)

  // 1. Fetch history from Convex
  const { messages: historyMessages, isLoading: isHistoryLoading } = useMessages(
    safeConversationId ? safeConversationId : null
  )

  const activeAttachmentContext = useQuery(
    api.conversationAttachmentContexts.getByConversation,
    safeConversationId && isAuthenticated ? { conversationId: safeConversationId } : "skip"
  )
  const activeContextFileIds = useMemo(
    () => activeAttachmentContext?.activeFileIds ?? [],
    [activeAttachmentContext]
  )

  // Collect all fileIds from history for file metadata lookup
  const historyFileIds = useMemo(() => {
    if (!historyMessages && activeContextFileIds.length === 0) return []
    const ids = new Set<string>()
    for (const msg of historyMessages ?? []) {
      if (msg.fileIds) {
        for (const fid of msg.fileIds) ids.add(fid)
      }
    }
    for (const fid of activeContextFileIds) {
      ids.add(fid)
    }
    return Array.from(ids)
  }, [historyMessages, activeContextFileIds])

  const historyFiles = useQuery(
    api.files.getFilesByIds,
    userId && historyFileIds.length > 0
      ? { userId, fileIds: historyFileIds as Id<"files">[] }
      : "skip"
  )

  const fileMetaMap = useMemo(() => {
    const map = new Map<string, { name: string; size: number; type: string }>()
    if (historyFiles) {
      for (const f of historyFiles) {
        if (f) {
          map.set(f._id, {
            name: f.name,
            size: f.size,
            type: f.type,
          })
        }
      }
    }
    return map
  }, [historyFiles])

  const fileNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const [fileId, meta] of fileMetaMap) {
      map.set(fileId, meta.name)
    }
    return map
  }, [fileMetaMap])

  const activeContextAttachments = useMemo(() => {
    return activeContextFileIds
      .map((fileId) => {
        const meta = fileMetaMap.get(fileId)
        if (!meta) return null
        return {
          fileId: fileId as Id<"files">,
          name: meta.name,
          size: meta.size,
          type: meta.type,
        } satisfies AttachedFileMeta
      })
      .filter((file): file is AttachedFileMeta => file !== null)
  }, [activeContextFileIds, fileMetaMap])

  useEffect(() => {
    setIsAttachmentDraftDirty(false)
    setAttachedFiles([])
    setImageDataUrls(new Map())
  }, [safeConversationId])

  useEffect(() => {
    if (isAttachmentDraftDirty) return

    if (activeContextFileIds.length === 0) {
      if (attachedFiles.length > 0) {
        setAttachedFiles([])
      }
      return
    }

    const hasAllMetadata = activeContextFileIds.every((fileId) => fileMetaMap.has(fileId))
    if (!hasAllMetadata) return

    const nextIds = activeContextAttachments.map((file) => file.fileId).join("|")
    const currentIds = attachedFiles.map((file) => file.fileId).join("|")
    if (nextIds !== currentIds) {
      setAttachedFiles(activeContextAttachments)
    }
  }, [
    activeContextAttachments,
    activeContextFileIds,
    attachedFiles,
    fileMetaMap,
    isAttachmentDraftDirty,
  ])

  // Paper mode: Convert history messages to permission-compatible format
  const permissionMessages = useMemo(() => {
    if (!historyMessages) return []
    return historyMessages.map((msg) => ({
      createdAt: msg.createdAt ?? 0,
      role: msg.role,
    }))
  }, [historyMessages])

  // Paper mode: Calculate current stage start index
  const currentStageStartIndex = useMemo(() => {
    if (!isPaperMode || permissionMessages.length === 0) return 0
    return getStageStartIndex(permissionMessages)
  }, [isPaperMode, permissionMessages, getStageStartIndex])

  // Build message → artifact map for persisted artifact signals (survives page refresh)
  // Matches artifacts to the assistant message they were created during, using temporal proximity
  const messageArtifactMap = useMemo(() => {
    const map = new Map<string, ConversationArtifact[]>()
    if (!conversationArtifacts || !historyMessages || historyMessages.length === 0) return map

    for (const artifact of conversationArtifacts) {
      // Skip refrasa artifacts — they have their own display flow
      if (artifact.type === "refrasa") continue

      // Direct match by messageId (if set)
      if (artifact.messageId) {
        const existing = map.get(artifact.messageId) ?? []
        existing.push(artifact)
        map.set(artifact.messageId, existing)
        continue
      }

      // Temporal matching: artifact was created between the previous message
      // and this assistant message (during streaming)
      const artifactTime = artifact._creationTime
      for (let i = 0; i < historyMessages.length; i++) {
        const msg = historyMessages[i]
        if (msg.role !== "assistant") continue

        const prevMsg = historyMessages[i - 1]
        const prevTime = prevMsg?.createdAt ?? 0
        const msgTime = msg.createdAt ?? Infinity

        if (artifactTime > prevTime && artifactTime <= msgTime) {
          const existing = map.get(msg._id) ?? []
          existing.push(artifact)
          map.set(msg._id, existing)
          break
        }
      }
    }

    return map
  }, [conversationArtifacts, historyMessages])

  // 2. Initialize useChat with AI SDK v5/v6 API
  const editAndTruncate = useMutation(api.messages.editAndTruncateConversation)

  // Refs to always read latest attachment state at request time (bypasses useChat stale transport bug)
  const attachedFilesRef = useRef(attachedFiles)
  attachedFilesRef.current = attachedFiles
  const imageDataUrlsRef = useRef(imageDataUrls)
  imageDataUrlsRef.current = imageDataUrls

  // Create transport with lazy body function — evaluated fresh at each request
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          conversationId: safeConversationId,
        }),
      }),
    [safeConversationId]
  )

  type CreatedArtifact = { artifactId: Id<"artifacts">; title?: string }

  const extractCreatedArtifacts = (uiMessage: UIMessage): CreatedArtifact[] => {
    const created: CreatedArtifact[] = []

    for (const part of uiMessage.parts ?? []) {
      if (!part || typeof part !== "object") continue

      const maybeToolPart = part as unknown as {
        type?: unknown
        state?: unknown
        output?: unknown
        result?: unknown
      }

      if (maybeToolPart.type !== "tool-createArtifact") continue

      const okState =
        maybeToolPart.state === "output-available" || maybeToolPart.state === "result"
      if (!okState) continue

      const maybeOutput = (maybeToolPart.output ?? maybeToolPart.result) as unknown as {
        success?: unknown
        artifactId?: unknown
        title?: unknown
      } | null

      if (!maybeOutput || maybeOutput.success !== true) continue
      if (typeof maybeOutput.artifactId !== "string") continue

      created.push({
        artifactId: maybeOutput.artifactId as Id<"artifacts">,
        title: typeof maybeOutput.title === "string" ? maybeOutput.title : undefined,
      })
    }

    return created
  }

  const { messages, sendMessage, status, setMessages, regenerate, stop, error } = useChat({
    transport,
    onFinish: ({ message }) => {
      const createdArtifacts = extractCreatedArtifacts(message)
      if (createdArtifacts.length > 0 && onArtifactSelect) {
        // Auto-open artifact panel dengan artifact terbaru yang dibuat
        onArtifactSelect(createdArtifacts[createdArtifacts.length - 1].artifactId)
      }
    },
    onError: (err) => {
      toast.error("Terjadi kesalahan: " + (err.message || "Gagal memproses pesan"))
    }
  })

  type AttachmentSendMode = "inherit" | "replace" | "clear"

  const areSameFileIdSets = useCallback((left: string[], right: string[]) => {
    if (left.length !== right.length) return false
    const rightSet = new Set(right)
    return left.every((value) => rightSet.has(value))
  }, [])

  const annotateLatestUserMessage = useCallback((files: AttachedFileMeta[]) => {
    if (files.length === 0) return

    const allFileIds = files.map((file) => file.fileId)
    const allFileNames = files.map((file) => file.name)
    const allFileSizes = files.map((file) => file.size)
    const allFileTypes = files.map((file) => file.type)

    setTimeout(() => {
      setMessages((prev) => {
        const targetUserIdx = [...prev]
          .map((msg, idx) => ({ msg, idx }))
          .reverse()
          .find(({ msg }) => msg.role === "user")?.idx ?? -1
        if (targetUserIdx < 0) return prev

        const updated = [...prev]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = updated[targetUserIdx] as any
        const existingAnnotations = Array.isArray(msg.annotations) ? msg.annotations : []
        const hasFileIdsAnnotation = existingAnnotations.some(
          (annotation: { type?: string }) => annotation?.type === "file_ids"
        )
        if (!hasFileIdsAnnotation) {
          msg.annotations = [
            ...existingAnnotations,
            {
              type: "file_ids",
              fileIds: allFileIds,
              fileNames: allFileNames,
              fileSizes: allFileSizes,
              fileTypes: allFileTypes,
            },
          ]
        }
        return updated
      })
    }, 0)
  }, [setMessages])

  const buildImageFileParts = useCallback((files: AttachedFileMeta[]) => {
    const currentImageDataUrls = imageDataUrlsRef.current

    return files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        type: "file" as const,
        mediaType: file.type,
        filename: file.name,
        url: currentImageDataUrls.get(file.fileId) ?? "",
      }))
      .filter((file) => file.url !== "")
  }, [])

  const resolveComposerAttachmentIntent = useCallback(() => {
    const draftFiles = attachedFilesRef.current
    const draftFileIds = draftFiles.map((file) => file.fileId)
    const contextFileIds = activeContextFileIds
    const hasAttachmentDelta =
      isAttachmentDraftDirty || !areSameFileIdSets(draftFileIds, contextFileIds)

    if (hasAttachmentDelta) {
      if (draftFileIds.length === 0 && contextFileIds.length > 0) {
        return {
          mode: "clear" as const,
          files: [] as AttachedFileMeta[],
        }
      }

      return {
        mode: "replace" as const,
        files: draftFiles,
      }
    }

    return {
      mode: "inherit" as const,
      files: activeContextAttachments,
    }
  }, [activeContextAttachments, activeContextFileIds, areSameFileIdSets, isAttachmentDraftDirty])

  const sendUserMessageWithContext = useCallback((params: {
    text: string
    mode: AttachmentSendMode
    filesForContext?: AttachedFileMeta[]
    imageFileParts?: Array<{
      type: "file"
      mediaType: string
      filename?: string
      url: string
    }>
    inheritedAnnotationFiles?: AttachedFileMeta[]
  }) => {
    const {
      text,
      mode,
      filesForContext = [],
      imageFileParts = [],
      inheritedAnnotationFiles = [],
    } = params

    setIsAwaitingAssistantStart(true)
    pendingScrollToBottomRef.current = true

    const body: {
      fileIds?: Id<"files">[]
      inheritAttachmentContext?: boolean
      clearAttachmentContext?: boolean
    } = {}

    if (mode === "clear") {
      body.clearAttachmentContext = true
      body.inheritAttachmentContext = false
    } else if (mode === "replace") {
      body.fileIds = filesForContext.map((file) => file.fileId)
      body.inheritAttachmentContext = false
    } else {
      body.inheritAttachmentContext = true
    }

    if (imageFileParts.length > 0) {
      sendMessage({ text, files: imageFileParts }, { body })
    } else {
      sendMessage({ text }, { body })
    }

    if (mode === "replace") {
      annotateLatestUserMessage(filesForContext)
      setIsAttachmentDraftDirty(false)
      return
    }

    if (mode === "clear") {
      setIsAttachmentDraftDirty(false)
      return
    }

    if (mode === "inherit") {
      annotateLatestUserMessage(inheritedAnnotationFiles)
    }
  }, [annotateLatestUserMessage, sendMessage])

  const sendMessageWithPendingIndicator = useCallback((text: string) => {
    const composerIntent = resolveComposerAttachmentIntent()
    const imageFileParts =
      composerIntent.mode === "replace"
        ? buildImageFileParts(composerIntent.files)
        : []

    sendUserMessageWithContext({
      text,
      mode: composerIntent.mode,
      filesForContext: composerIntent.files,
      imageFileParts,
      inheritedAnnotationFiles: activeContextAttachments,
    })
  }, [
    activeContextAttachments,
    buildImageFileParts,
    resolveComposerAttachmentIntent,
    sendUserMessageWithContext,
  ])

  // Auto-send pending starter prompt after redirect from landing state.
  useEffect(() => {
    if (!conversationId || !isAuthenticated) return
    if (status !== "ready") return
    if (isHistoryLoading) return
    if (messages.length > 0) return
    if ((historyMessages?.length ?? 0) > 0) return

    const pendingPrompt = readPendingStarterPrompt(conversationId)
    if (!pendingPrompt) return

    const now = Date.now()
    const lastAttemptAt = starterPromptLastAttemptAtRef.current.get(conversationId) ?? 0
    if (now - lastAttemptAt < 2000) return

    starterPromptLastAttemptAtRef.current.set(conversationId, now)
    // Avoid syncing empty history snapshot while starter prompt is still optimistic in UI.
    starterPromptPendingHistorySyncRef.current = conversationId
    setIsAwaitingAssistantStart(true)
    pendingScrollToBottomRef.current = true

    const composerIntent = resolveComposerAttachmentIntent()
    const imageFileParts =
      composerIntent.mode === "replace"
        ? buildImageFileParts(composerIntent.files)
        : []

    if (process.env.NODE_ENV !== "production") {
      console.info("[ATTACH-DIAG][starter] sending", {
        attachedCount: composerIntent.files.length,
        fileIds: composerIntent.files.map((file) => file.fileId),
        mode: composerIntent.mode,
        imageCount: imageFileParts.length,
        docCount: composerIntent.files.filter((file) => !file.type.startsWith("image/")).length,
      })
    }

    sendUserMessageWithContext({
      text: pendingPrompt,
      mode: composerIntent.mode,
      filesForContext: composerIntent.files,
      imageFileParts,
      inheritedAnnotationFiles: activeContextAttachments,
    })
  }, [
    activeContextAttachments,
    buildImageFileParts,
    conversationId,
    historyMessages,
    isAuthenticated,
    isHistoryLoading,
    messages.length,
    resolveComposerAttachmentIntent,
    sendUserMessageWithContext,
    status,
  ])

  // Clear pending starter prompt only after we have concrete message data.
  useEffect(() => {
    if (!conversationId) return
    const hasMessages = messages.length > 0 || (historyMessages?.length ?? 0) > 0
    if (!hasMessages) return

    clearPendingStarterPrompt(conversationId)
    starterPromptLastAttemptAtRef.current.delete(conversationId)
    if (starterPromptPendingHistorySyncRef.current === conversationId) {
      starterPromptPendingHistorySyncRef.current = null
    }
  }, [conversationId, historyMessages, messages.length])


  // 3. Sync history messages to useChat state - only when conversation changes or history first loads
  useEffect(() => {
    if (
      conversationId &&
      !isHistoryLoading &&
      historyMessages &&
      syncedConversationRef.current !== conversationId
    ) {
      const hasPendingStarterPromptSync =
        starterPromptPendingHistorySyncRef.current === conversationId

      // Only call setMessages when there are actual messages to sync.
      // For new conversations (0 messages), skip setMessages to avoid
      // overwriting useChat state that auto-send effect (above) may have
      // already populated via sendMessage in the same render commit.
      if (historyMessages.length === 0) {
        if (!hasPendingStarterPromptSync) {
          syncedConversationRef.current = conversationId
        }
        return
      }

      const mappedMessages = historyMessages.map((msg) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawReasoningTrace = (msg as any).reasoningTrace as PersistedReasoningTraceRaw | undefined
        const reasoningTrace =
          rawReasoningTrace &&
          typeof rawReasoningTrace === "object" &&
          Array.isArray(rawReasoningTrace.steps)
            ? rawReasoningTrace
            : undefined

        const traceId = `persisted-${msg._id}`
        const persistedTraceParts = reasoningTrace
          ? (reasoningTrace.steps as PersistedReasoningTraceStepRaw[])
              .filter((step) => step && typeof step === "object")
              .map((step) => ({
                type: "data-reasoning-trace",
                id: `${traceId}-${typeof step.stepKey === "string" ? step.stepKey : "step"}`,
                data: {
                  traceId,
                  stepKey: typeof step.stepKey === "string" ? step.stepKey : "unknown-step",
                  label: typeof step.label === "string" ? step.label : "Langkah reasoning",
                  status:
                    typeof step.status === "string" && REASONING_STATUS_SET.has(step.status as ReasoningTraceStatus)
                      ? step.status
                      : "pending",
                  progress:
                    typeof step.progress === "number" && Number.isFinite(step.progress)
                      ? Math.max(0, Math.min(100, Math.round(step.progress)))
                      : 0,
                  ...(typeof step.ts === "number" && Number.isFinite(step.ts) ? { ts: step.ts } : {}),
                  ...(step.meta && typeof step.meta === "object" ? { meta: step.meta } : {}),
                },
              }))
          : []

        return {
          id: msg._id,
          role: msg.role as "user" | "assistant" | "system" | "data",
          content: msg.content,
          fileIds: msg.fileIds,
          parts: [{ type: "text", text: msg.content } as const, ...persistedTraceParts],
          annotations: msg.fileIds
            ? [
                {
                  type: "file_ids",
                  fileIds: msg.fileIds,
                  fileNames: msg.fileIds.map((fid: string) => fileMetaMap.get(fid)?.name ?? ""),
                  fileSizes: msg.fileIds.map((fid: string) => fileMetaMap.get(fid)?.size ?? -1),
                  fileTypes: msg.fileIds.map((fid: string) => fileMetaMap.get(fid)?.type ?? ""),
                },
              ]
            : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sources: (msg as any).sources,
          ...(reasoningTrace ? { reasoningTrace } : {}),
        }
      }) as unknown as UIMessage[]

      setMessages(mappedMessages)
      syncedConversationRef.current = conversationId
      if (hasPendingStarterPromptSync) {
        starterPromptPendingHistorySyncRef.current = null
      }
    }

    if (conversationId !== syncedConversationRef.current && syncedConversationRef.current !== null) {
      syncedConversationRef.current = null
    }
    if (
      conversationId !== starterPromptPendingHistorySyncRef.current &&
      starterPromptPendingHistorySyncRef.current !== null
    ) {
      starterPromptPendingHistorySyncRef.current = null
    }
  }, [conversationId, historyMessages, isHistoryLoading, setMessages, fileMetaMap])

  const isLoading = status !== 'ready' && status !== 'error'
  const isGenerating = status === "submitted" || status === "streaming"
  const hasPendingAssistantGeneration = isGenerating || isAwaitingAssistantStart
  const hasStandalonePendingIndicator =
    hasPendingAssistantGeneration &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role !== "assistant"

  const chatRows = useMemo<ChatListRow[]>(() => {
    const rows: ChatListRow[] = messages.map((message, index) => ({
      kind: "message",
      message,
      index,
    }))

    if (hasStandalonePendingIndicator) {
      rows.push({ kind: "pending-indicator" })
    }

    return rows
  }, [messages, hasStandalonePendingIndicator])

  const activeReasoningState = useMemo(() => {
    const assistants = [...messages].reverse().filter((msg) => msg.role === "assistant")
    for (const assistant of assistants) {
      const steps = extractReasoningTraceSteps(assistant)
      const liveThought = extractLiveThought(assistant)
      const headline = liveThought || extractReasoningHeadline(assistant, steps)
      if (steps.length > 0 || headline) {
        return {
          steps,
          headline,
        }
      }
    }

    return {
      steps: [] as ReasoningTraceStep[],
      headline: null as string | null,
    }
  }, [messages])

  const clearProcessTimers = useCallback(() => {
    if (processIntervalRef.current !== null) {
      window.clearInterval(processIntervalRef.current)
      processIntervalRef.current = null
    }
    if (processHideTimeoutRef.current !== null) {
      window.clearTimeout(processHideTimeoutRef.current)
      processHideTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setIsAwaitingAssistantStart(false)
      return
    }
    if (status === "ready" || status === "error") {
      setIsAwaitingAssistantStart(false)
    }
  }, [status])

  useEffect(() => {
    const prevStatus = previousStatusRef.current
    const hadGeneratingStatus = prevStatus === "submitted" || prevStatus === "streaming"

    if (status === "submitted") {
      clearProcessTimers()
      stoppedManuallyRef.current = false
      processStartedAtRef.current = Date.now()
      setProcessUi({
        visible: true,
        status: "submitted",
        progress: 8,
        elapsedSeconds: 0,
      })
    } else if (status === "streaming") {
      clearProcessTimers()
      if (processStartedAtRef.current === null) {
        processStartedAtRef.current = Date.now()
      }
      setProcessUi((prev) => ({
        visible: true,
        status: "streaming",
        progress: Math.max(prev.progress, 16),
        elapsedSeconds: Math.max(prev.elapsedSeconds, 1),
      }))
      processIntervalRef.current = window.setInterval(() => {
        setProcessUi((prev) => {
          if (!prev.visible) return prev
          const nextProgress = Math.min(prev.progress + (prev.progress < 70 ? 4 : 2), 92)
          const elapsed = processStartedAtRef.current
            ? Math.max(1, Math.round((Date.now() - processStartedAtRef.current) / 1000))
            : Math.max(prev.elapsedSeconds, 1)
          return { ...prev, progress: nextProgress, elapsedSeconds: elapsed }
        })
      }, 220)
    } else if (status === "ready" && hadGeneratingStatus) {
      clearProcessTimers()
      const wasStoppedManually = stoppedManuallyRef.current
      const elapsed = processStartedAtRef.current
        ? Math.max(1, Math.round((Date.now() - processStartedAtRef.current) / 1000))
        : 1
      setProcessUi({
        visible: true,
        status: wasStoppedManually ? "stopped" : "ready",
        progress: 100,
        elapsedSeconds: elapsed,
      })
      stoppedManuallyRef.current = false
      processStartedAtRef.current = null
    } else if (status === "error" && hadGeneratingStatus) {
      clearProcessTimers()
      const elapsed = processStartedAtRef.current
        ? Math.max(1, Math.round((Date.now() - processStartedAtRef.current) / 1000))
        : 1
      setProcessUi({
        visible: true,
        status: "error",
        progress: 100,
        elapsedSeconds: elapsed,
      })
      processHideTimeoutRef.current = window.setTimeout(() => {
        setProcessUi((prev) => ({ ...prev, visible: false }))
      }, 1500)
      stoppedManuallyRef.current = false
      processStartedAtRef.current = null
    }

    previousStatusRef.current = status
  }, [status, clearProcessTimers])

  useEffect(() => {
    return () => clearProcessTimers()
  }, [clearProcessTimers])

  const scheduleScrollToBottom = useCallback((behavior: "auto" | "smooth" = "auto") => {
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current)
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      if (messages.length === 0) return
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: "end",
        behavior,
      })
    })
  }, [messages.length])

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!pendingScrollToBottomRef.current) return
    pendingScrollToBottomRef.current = false
    scheduleScrollToBottom("auto")
  }, [messages.length, scheduleScrollToBottom])

  const lastMessageText = useMemo(() => {
    const last = messages[messages.length - 1]
    if (!last) return ""
    const maybeContent = (last as { content?: string }).content
    if (typeof maybeContent === "string") return maybeContent
    const textPart = last.parts?.find((part) => part.type === "text") as
      | { text?: string }
      | undefined
    return textPart?.text ?? ""
  }, [messages])

  useEffect(() => {
    if (!isGenerating) return
    if (!isAtBottom) return
    scheduleScrollToBottom("auto")
  }, [isGenerating, isAtBottom, scheduleScrollToBottom, lastMessageText])

  useEffect(() => {
    if (wasGeneratingRef.current && !isGenerating) {
      if (!isAtBottom) {
        wasGeneratingRef.current = isGenerating
        return
      }
      scheduleScrollToBottom("auto")
    }
    wasGeneratingRef.current = isGenerating
  }, [isGenerating, isAtBottom, scheduleScrollToBottom])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleFileAttached = (file: AttachedFileMeta) => {
    setIsAttachmentDraftDirty(true)
    setAttachedFiles((prev) => [...prev, file])
  }

  const handleFileRemoved = (fileId: Id<"files">) => {
    setIsAttachmentDraftDirty(true)
    setAttachedFiles((prev) => prev.filter((f) => f.fileId !== fileId))
    setImageDataUrls((prev) => {
      const next = new Map(prev)
      next.delete(fileId)
      return next
    })
  }

  const handleImageDataUrl = (fileId: Id<"files">, dataUrl: string) => {
    setImageDataUrls((prev) => new Map(prev).set(fileId, dataUrl))
  }

  const handleClearAttachmentContext = useCallback(async () => {
    if (!safeConversationId) return
    try {
      await clearAttachmentContextMutation({ conversationId: safeConversationId })
      setIsAttachmentDraftDirty(false)
      setAttachedFiles([])
      setImageDataUrls(new Map())
      toast.success("Attachment context dibersihkan.")
    } catch (clearError) {
      console.error("Failed to clear attachment context:", clearError)
      toast.error("Gagal membersihkan attachment context.")
    }
  }, [clearAttachmentContextMutation, safeConversationId])

  const handleRegenerate = (options?: { markDirty?: boolean }) => {
    if (isPaperMode && options?.markDirty !== false) {
      markStageAsDirty()
    }
    setIsAwaitingAssistantStart(true)
    pendingScrollToBottomRef.current = true
    regenerate()
  }

  const handleStopGeneration = useCallback(() => {
    if (!hasPendingAssistantGeneration) return
    setIsAwaitingAssistantStart(false)
    stoppedManuallyRef.current = true
    stop()
  }, [hasPendingAssistantGeneration, stop])

  const handleEdit = async (payload: {
    messageId: string
    newContent: string
    fileIds: string[]
    fileNames: string[]
    fileSizes: number[]
    fileTypes: string[]
  }) => {
    if (!safeConversationId) return
    const { messageId, newContent, fileIds, fileNames, fileSizes, fileTypes } = payload

    // Resolve the actual Convex ID
    // Client-generated IDs (from sendMessage) are ~16 chars, mixed case
    // Convex IDs are 32 chars, lowercase alphanumeric
    let actualMessageId: Id<"messages">
    const isValidConvexId = /^[a-z0-9]{32}$/.test(messageId)

    if (isValidConvexId) {
      actualMessageId = messageId as Id<"messages">
    } else {
      // For client-generated IDs, find the corresponding Convex ID from historyMessages
      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex !== -1 && historyMessages?.[messageIndex]) {
        const historyMsg = historyMessages[messageIndex]
        const currentMsg = messages[messageIndex]
        // Verify it's the same message by checking role
        if (historyMsg.role === currentMsg.role) {
          actualMessageId = historyMsg._id
        } else {
          toast.error("Pesan belum tersimpan. Tunggu sebentar lalu coba lagi.")
          return
        }
      } else {
        toast.error("Pesan belum tersimpan. Tunggu sebentar lalu coba lagi.")
        return
      }
    }

    try {
      // 1. Delete the edited message and all subsequent from DB
      await editAndTruncate({
        messageId: actualMessageId,
        content: newContent, // Passed for backwards compat, but not used by mutation
        conversationId: safeConversationId,
      })

      // 2. Mark stage as dirty in paper mode
      if (isPaperMode) {
        markStageAsDirty()
      }

      // 3. Truncate local messages to BEFORE the edited message
      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex !== -1) {
        const truncatedMessages = messages.slice(0, messageIndex)
        setMessages(truncatedMessages)

        // 4. Send the edited content as a new message - this triggers AI response
        const editedMessage = messages[messageIndex]
        const imageFileParts = (editedMessage.parts ?? [])
          .filter((part): part is {
            type: "file"
            mediaType: string
            filename?: string
            url: string
          } => {
            if (part.type !== "file") return false
            const maybeFile = part as {
              mediaType?: unknown
              url?: unknown
            }
            return (
              typeof maybeFile.mediaType === "string" &&
              maybeFile.mediaType.startsWith("image/") &&
              typeof maybeFile.url === "string" &&
              maybeFile.url.length > 0
            )
          })
          .map((part) => ({
            type: "file" as const,
            mediaType: part.mediaType,
            filename: part.filename,
            url: part.url,
          }))

        const fallbackFileNames = fileIds.map((fid) => fileMetaMap.get(fid)?.name ?? "")
        const fallbackFileSizes = fileIds.map((fid) => fileMetaMap.get(fid)?.size ?? -1)
        const fallbackFileTypes = fileIds.map((fid) => fileMetaMap.get(fid)?.type ?? "")
        const allFileNames = fileNames.length === fileIds.length ? fileNames : fallbackFileNames
        const allFileSizes = fileSizes.length === fileIds.length ? fileSizes : fallbackFileSizes
        const allFileTypes = fileTypes.length === fileIds.length ? fileTypes : fallbackFileTypes
        const editedAttachmentFiles = fileIds.map((fileId, index) => ({
          fileId: fileId as Id<"files">,
          name: allFileNames[index] ?? fileMetaMap.get(fileId)?.name ?? "file",
          size: allFileSizes[index] ?? fileMetaMap.get(fileId)?.size ?? 0,
          type: allFileTypes[index] ?? fileMetaMap.get(fileId)?.type ?? "application/octet-stream",
        }))

        sendUserMessageWithContext({
          text: newContent || ".",
          mode: editedAttachmentFiles.length > 0 ? "replace" : "inherit",
          filesForContext: editedAttachmentFiles,
          imageFileParts,
          inheritedAnnotationFiles: activeContextAttachments,
        })
      } else {
        // Edge case: message not found in local state (should not happen normally)
        toast.error("Pesan tidak ditemukan. Silakan refresh halaman.")
      }

    } catch (error) {
      console.error("Failed to edit and resend:", error)
      toast.error("Gagal mengedit pesan. Silakan coba lagi.")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return
    if (isLoading) return

    const composerIntent = resolveComposerAttachmentIntent()
    const imageFileParts =
      composerIntent.mode === "replace"
        ? buildImageFileParts(composerIntent.files)
        : []

    if (process.env.NODE_ENV !== "production") {
      console.info("[ATTACH-DIAG][submit] sending", {
        attachedCount: composerIntent.files.length,
        fileIds: composerIntent.files.map((file) => file.fileId),
        mode: composerIntent.mode,
        imageCount: imageFileParts.length,
        docCount: composerIntent.files.filter((file) => !file.type.startsWith("image/")).length,
      })
    }

    sendUserMessageWithContext({
      text: input,
      mode: composerIntent.mode,
      filesForContext: composerIntent.files,
      imageFileParts,
      inheritedAnnotationFiles: activeContextAttachments,
    })
    setInput("")
  }

  const handleApprove = async () => {
    if (!userId) return
    try {
      await approveStage(userId)
      // Auto-send message agar AI aware dan bisa lanjutkan ke tahap berikutnya
      sendMessageWithPendingIndicator(`[Approved: ${stageLabel}] Lanjut ke tahap berikutnya.`)
    } catch (error) {
      console.error("Failed to approve stage:", error)
      toast.error("Gagal menyetujui tahap.")
    }
  }

  const handleRevise = async (feedback: string) => {
    if (!userId) return
    try {
      await requestRevision(userId, feedback)
      // Bug fix 6.6.1: Send feedback as user message so AI can see it
      sendMessageWithPendingIndicator(`[Revisi untuk ${stageLabel}]\n\n${feedback}`)
      toast.info("Feedback revisi telah dikirim ke agen.")
    } catch (error) {
      console.error("Failed to request revision:", error)
      toast.error("Gagal mengirim feedback revisi.")
    }
  }

  // Handler for template selection
  const handleTemplateSelect = (template: Template) => {
    if (isLoading) return

    sendMessageWithPendingIndicator(template.message)
  }

  // Handler for starting new chat from empty state
  const handleStartNewChat = async (initialPrompt?: string) => {
    if (!userId || isCreatingChat) return
    const normalizedPrompt = initialPrompt?.trim() ?? ""
    setIsCreatingChat(true)
    try {
      const newId = await createConversation({ userId })
      if (!newId) {
        setIsCreatingChat(false)
        return
      }

      if (normalizedPrompt) {
        setPendingStarterPrompt(newId, normalizedPrompt)
      }

      // Keep navigation as the final state transition for this component path.
      router.push(`/chat/${newId}`)
      return
    } catch (error) {
      console.error("Failed to create conversation:", error)
      toast.error("Gagal membuat percakapan baru")
      setIsCreatingChat(false)
    }
  }

  const handleStarterPromptClick = async (promptText: string) => {
    if (isLoading || isCreatingChat) return
    await handleStartNewChat(promptText)
  }

  const handleSidebarLinkClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const isDesktop = window.matchMedia("(min-width: 768px)").matches

    if (isDesktop) {
      const expandSidebarButton = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Expand sidebar"]'
      )
      expandSidebarButton?.click()
      return
    }

    onMobileMenuClick?.()
  }

  // Mobile rewind handler — opens confirmation dialog
  const handleMobileRewindRequest = useCallback((targetStage: PaperStageId) => {
    setPendingRewindTarget(targetStage)
  }, [])

  const handleRewindConfirm = useCallback(async () => {
    if (!pendingRewindTarget || !userId) return
    setIsRewindSubmitting(true)
    try {
      const result = await rewindToStage(userId, pendingRewindTarget)
      if (result.success) {
        toast.success("Berhasil kembali ke tahap sebelumnya.")
      } else {
        const errorMsg = "error" in result && typeof result.error === "string" ? result.error : "Gagal melakukan rewind."
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error("Rewind failed:", error)
      toast.error("Gagal melakukan rewind.")
    } finally {
      setIsRewindSubmitting(false)
      setPendingRewindTarget(null)
    }
  }, [pendingRewindTarget, userId, rewindToStage])

  // Landing page empty state (no conversation selected)
  // ChatInput is persistent — always visible at bottom, even in start state
  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile: Same content as desktop, adapted layout */}
        <div className="md:hidden flex-1 flex flex-col min-h-0">
          {/* Header: sidebar expand + theme toggle */}
          <div className="shrink-0 flex items-center justify-between h-11 px-3 pt-[calc(env(safe-area-inset-top,0px)+0.375rem)]">
            <button
              onClick={onMobileMenuClick}
              className="text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-50"
              aria-label="Open sidebar"
            >
              <SidebarExpand className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-50"
              aria-label="Toggle theme"
            >
              <SunLight className="h-5 w-5 hidden dark:block" strokeWidth={1.5} />
              <HalfMoon className="h-5 w-5 block dark:hidden" strokeWidth={1.5} />
            </button>
          </div>
          {/* TemplateGrid — scrollable so it shrinks when keyboard opens */}
          <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-6">
            <TemplateGrid
              onTemplateSelect={(template) =>
                void handleStarterPromptClick(template.message)
              }
              onSidebarLinkClick={handleSidebarLinkClick}
              disabled={isCreatingChat}
            />
          </div>
          {/* ChatInput — shrink-0 so it stays visible above keyboard */}
          <ChatInput
            input={input}
            onInputChange={handleInputChange}
            onSubmit={async (e) => {
              e.preventDefault()
              if (!input.trim() && attachedFiles.length === 0) return
              await handleStartNewChat(input.trim())
            }}
            isLoading={isCreatingChat}
            isGenerating={false}
            conversationId={conversationId}
            attachedFiles={attachedFiles}
            onFileAttached={handleFileAttached}
            onFileRemoved={handleFileRemoved}
            onImageDataUrl={handleImageDataUrl}
          />
        </div>

        {/* Desktop: Existing empty state (unchanged) */}
        <div className="hidden md:flex flex-1 flex-col h-full overflow-hidden">
          {/* Empty State Content — fills available space above ChatInput */}
          <div className="flex-1 flex items-center justify-center p-6">
            <TemplateGrid
              onTemplateSelect={(template) =>
                void handleStarterPromptClick(template.message)
              }
              onSidebarLinkClick={handleSidebarLinkClick}
              disabled={isCreatingChat}
            />
          </div>

          {/* Persistent ChatInput — always visible, even in start state */}
          <ChatInput
            input={input}
            onInputChange={handleInputChange}
            onSubmit={async (e) => {
              e.preventDefault()
              if (!input.trim() && attachedFiles.length === 0) return
              await handleStartNewChat(input.trim())
            }}
            isLoading={isCreatingChat}
            isGenerating={false}
            conversationId={conversationId}
            attachedFiles={attachedFiles}
            onFileAttached={handleFileAttached}
            onFileRemoved={handleFileRemoved}
            onImageDataUrl={handleImageDataUrl}
          />
        </div>
      </div>
    )
  }

  // Handle invalid/not-found conversation
  if (conversationNotFound) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="md:hidden px-3 pt-[calc(env(safe-area-inset-top,0px)+0.375rem)] bg-[var(--chat-background)]">
          <div className="flex items-center justify-between h-11">
            <button
              onClick={onMobileMenuClick}
              className="shrink-0 text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-50"
              aria-label="Open sidebar"
            >
              <SidebarExpand className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="shrink-0 text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-50"
              aria-label="Toggle theme"
            >
              <SunLight className="h-5 w-5 hidden dark:block" strokeWidth={1.5} />
              <HalfMoon className="h-5 w-5 block dark:hidden" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[var(--chat-muted-foreground)]">
            {/* Mechanical Grace: Rose error color */}
            <WarningCircle className="h-12 w-12 mx-auto mb-4 text-[var(--chat-destructive)]" />
            <p className="mb-2 font-sans">Percakapan tidak ditemukan</p>
            <p className="text-sm opacity-75 font-sans">Percakapan mungkin telah dihapus atau URL tidak valid.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden px-3 pt-[calc(env(safe-area-inset-top,0px)+0.375rem)] bg-[var(--chat-background)]">
        <div className="flex items-center h-11">
          {/* Left group: sidebar + theme */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onMobileMenuClick}
              className="text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-50"
              aria-label="Open sidebar"
            >
              <SidebarExpand className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-50"
              aria-label="Toggle theme"
            >
              <SunLight className="h-5 w-5 hidden dark:block" strokeWidth={1.5} />
              <HalfMoon className="h-5 w-5 block dark:hidden" strokeWidth={1.5} />
            </button>
          </div>

          {/* Tappable title — centered, opens Edit/Delete sheet */}
          <button
            onClick={() => setShowEditDeleteSheet(true)}
            className="flex-1 flex items-center justify-center gap-1 min-w-0 active:bg-[var(--chat-accent)] rounded-action px-1.5 py-1 transition-colors duration-50"
          >
            <span className="truncate text-sm font-sans font-medium text-[var(--chat-foreground)]">
              {conversation?.title || "Percakapan baru"}
            </span>
            <NavArrowDown className="h-3 w-3 shrink-0 text-[var(--chat-muted-foreground)]" strokeWidth={1.5} />
          </button>

          {/* Right group: new chat + paper sessions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push("/chat")}
              className="text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-50"
              aria-label="Chat baru"
            >
              <ChatPlusIn className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setShowPaperSessionsSheet((prev) => !prev)}
              className={
                showPaperSessionsSheet
                  ? "text-[var(--chat-foreground)] transition-colors duration-150"
                  : "text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-150"
              }
              aria-label={showPaperSessionsSheet ? "Tutup paper sessions" : "Buka paper sessions"}
              aria-pressed={showPaperSessionsSheet}
            >
              {showPaperSessionsSheet ? (
                <FastArrowDownSquare className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <FastArrowUpSquare className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quota Warning Banner */}
      <QuotaWarningBanner className="mx-4 mt-4" />

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden p-0 relative flex flex-col">
        {/* Message Container - padding handled at item level for Virtuoso compatibility */}
        <div className="flex-1 overflow-hidden relative py-2">
          {(isHistoryLoading || isConversationLoading) && messages.length === 0 ? (
            // Loading skeleton - keep horizontal boundary in sync with ChatInput
            <div className="space-y-4" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
              <div className="flex justify-start">
                <Skeleton className="h-12 w-[60%] rounded-action" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-12 w-[60%] rounded-action" />
              </div>
              <div className="flex justify-start">
                <Skeleton className="h-24 w-[70%] rounded-action" />
              </div>
            </div>
          ) : messages.length === 0 ? (
            // Empty state with horizontal boundary in sync with ChatInput
            <div className="flex flex-col items-center justify-center h-full" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
              <TemplateGrid
                onTemplateSelect={handleTemplateSelect}
                onSidebarLinkClick={handleSidebarLinkClick}
                disabled={isLoading}
              />
            </div>
          ) : (
            // Messages list
            <Virtuoso
              ref={virtuosoRef}
              data={chatRows}
              itemContent={(_, row) => {
                if (row.kind === "pending-indicator") {
                  return (
                    <div className="pb-4" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
                      <PendingAssistantLaneIndicator />
                    </div>
                  )
                }

                const { message, index } = row
                const historyMsg = historyMessages && historyMessages[index]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const persistedSources = (historyMsg && historyMsg.role === message.role) ? (historyMsg as any).sources : undefined

                const displayMessage = {
                  ...message,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  sources: (message as any).sources || persistedSources
                } as UIMessage
                const shouldShowPendingIndicatorBeforeMessage =
                  hasPendingAssistantGeneration &&
                  index === messages.length - 1 &&
                  message.role === "assistant"

                return (
                  <div className="pb-4" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
                    {shouldShowPendingIndicatorBeforeMessage && (
                      <div className="pb-2">
                        <PendingAssistantLaneIndicator />
                      </div>
                    )}
                    <MessageBubble
                      key={message.id}
                      message={displayMessage}
                      onEdit={handleEdit}
                      onArtifactSelect={onArtifactSelect}
                      persistProcessIndicators={
                        isGenerating &&
                        index === messages.length - 1 &&
                        message.role === "assistant"
                      }
                      // Paper mode edit permission props
                      isPaperMode={isPaperMode}
                      messageIndex={index}
                      currentStageStartIndex={currentStageStartIndex}
                      allMessages={permissionMessages}
                      stageData={stageData}
                      // Persisted artifact signals (survive page refresh)
                      persistedArtifacts={historyMsg ? messageArtifactMap.get(historyMsg._id) : undefined}
                      // File name lookup for history messages
                      fileNameMap={fileNameMap}
                      fileMetaMap={fileMetaMap}
                    />
                  </div>
                )
              }}
              atBottomStateChange={setIsAtBottom}
              atBottomThreshold={160}
              followOutput={(atBottom) => {
                if (pendingScrollToBottomRef.current) return "auto"
                if (hasPendingAssistantGeneration) return atBottom ? "auto" : false
                return atBottom ? "smooth" : false
              }}
              initialTopMostItemIndex={chatRows.length - 1}
              style={{ height: "100%", overflowX: "hidden" }}
              components={{
                Header: () => <div className="pt-4" />,
                Footer: () => (
                  <div className="pb-4" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
                    {/* Paper Validation Panel - footer area before input */}
                    {isPaperMode && stageStatus === "pending_validation" && userId && status !== 'streaming' && (
                      <PaperValidationPanel
                        stageLabel={stageLabel}
                        onApprove={handleApprove}
                        onRevise={handleRevise}
                        isLoading={isLoading}
                        isDirty={paperSession?.isDirty === true}
                      />
                    )}
                    <div className="h-4" />
                  </div>
                )
              }}
            />
          )}

          {/* Error State Overlay - Mechanical Grace: Rose error */}
          {error && (
            <div
              className="absolute bottom-4 bg-[var(--chat-destructive)] border border-[color:var(--chat-destructive)] text-[var(--chat-destructive-foreground)] p-3 rounded-action flex items-center justify-between text-sm shadow-sm backdrop-blur-sm"
              style={{
                left: "var(--chat-input-pad-x, 5rem)",
                right: "var(--chat-input-pad-x, 5rem)",
              }}
            >
              <div className="flex items-center gap-2">
                <WarningCircle className="h-4 w-4" />
                <span className="font-mono">Gagal mengirim pesan.</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleRegenerate()} className="bg-[var(--chat-background)] hover:bg-[var(--chat-accent)] h-7 text-xs font-mono border-[color:var(--chat-destructive)] hover:border-[color:var(--chat-destructive)]">
                <Refresh className="h-3 w-3 mr-1" />
                Coba Lagi
              </Button>
            </div>
          )}

        </div>

        <ChatProcessStatusBar
          visible={processUi.visible}
          status={processUi.status}
          progress={processUi.progress}
          elapsedSeconds={processUi.elapsedSeconds}
          reasoningSteps={activeReasoningState.steps}
          reasoningHeadline={activeReasoningState.headline}
        />

        {/* Mobile Paper Progress Bar */}
        {isPaperMode && paperSession?.currentStage && (
          <MobileProgressBar
            currentStage={paperSession.currentStage as PaperStageId}
            stageStatus={stageStatus ?? "drafting"}
            stageData={stageData}
            onRewindRequest={handleMobileRewindRequest}
          />
        )}

        {/* Input Area */}
        <ChatInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isGenerating={hasPendingAssistantGeneration}
          onStop={handleStopGeneration}
          conversationId={conversationId}
          attachedFiles={attachedFiles}
          onFileAttached={handleFileAttached}
          onFileRemoved={handleFileRemoved}
          onImageDataUrl={handleImageDataUrl}
          onClearAttachmentContext={handleClearAttachmentContext}
        />
      </div>

      {/* Mobile Edit/Delete Sheet */}
      <MobileEditDeleteSheet
        open={showEditDeleteSheet}
        onOpenChange={setShowEditDeleteSheet}
        conversationId={safeConversationId}
      />

      {/* Mobile Paper Sessions Sheet */}
      <MobilePaperSessionsSheet
        open={showPaperSessionsSheet}
        onOpenChange={setShowPaperSessionsSheet}
        conversationId={safeConversationId}
        onArtifactSelect={onArtifactSelect}
      />

      {/* Rewind Confirmation Dialog (mobile progress bar) */}
      {isPaperMode && paperSession?.currentStage && (
        <RewindConfirmationDialog
          open={pendingRewindTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPendingRewindTarget(null)
              setIsRewindSubmitting(false)
            }
          }}
          targetStage={pendingRewindTarget}
          currentStage={paperSession.currentStage}
          onConfirm={handleRewindConfirm}
          isSubmitting={isRewindSubmitting}
        />
      )}
    </div>
  )
}
