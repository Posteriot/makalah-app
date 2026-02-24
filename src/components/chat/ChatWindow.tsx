"use client"

import { useChat } from "@ai-sdk/react"
import { UIMessage, DefaultChatTransport } from "ai"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { ChatProcessStatusBar } from "./ChatProcessStatusBar"
import { useMessages } from "@/lib/hooks/useMessages"
import { SidebarExpand, WarningCircle, Refresh, ChatPlusIn, FastArrowRightSquare, NavArrowDown, SunLight, HalfMoon } from "iconoir-react"
import { useTheme } from "next-themes"
import { Id } from "../../../convex/_generated/dataModel"
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

interface ChatWindowProps {
  conversationId: string | null
  onMobileMenuClick?: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  onShowArtifactList?: () => void
}

type ProcessVisualStatus = "submitted" | "streaming" | "ready" | "error" | "stopped"
const PENDING_STARTER_PROMPT_KEY = "chat:pending-starter-prompt"

interface PendingStarterPromptPayload {
  conversationId: string
  prompt: string
  createdAt: number
}

function setPendingStarterPrompt(conversationId: string, prompt: string) {
  if (typeof window === "undefined") return
  const payload: PendingStarterPromptPayload = {
    conversationId,
    prompt,
    createdAt: Date.now(),
  }
  window.sessionStorage.setItem(PENDING_STARTER_PROMPT_KEY, JSON.stringify(payload))
}

function consumePendingStarterPrompt(conversationId: string): string | null {
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

    window.sessionStorage.removeItem(PENDING_STARTER_PROMPT_KEY)
    return parsed.prompt.trim()
  } catch {
    window.sessionStorage.removeItem(PENDING_STARTER_PROMPT_KEY)
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ChatWindow({ conversationId, onMobileMenuClick, onArtifactSelect, onShowArtifactList }: ChatWindowProps) {
  const router = useRouter()
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const scrollRafRef = useRef<number | null>(null)
  const pendingScrollToBottomRef = useRef(false)
  const wasGeneratingRef = useRef(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [input, setInput] = useState("")
  const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>([])
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [showEditDeleteSheet, setShowEditDeleteSheet] = useState(false)
  const [showPaperSessionsSheet, setShowPaperSessionsSheet] = useState(false)
  const [pendingRewindTarget, setPendingRewindTarget] = useState<PaperStageId | null>(null)
  const [isRewindSubmitting, setIsRewindSubmitting] = useState(false)
  const [processUi, setProcessUi] = useState<{
    visible: boolean
    status: ProcessVisualStatus
    progress: number
    message: string
  }>({
    visible: false,
    status: "ready",
    progress: 0,
    message: "",
  })
  const processIntervalRef = useRef<number | null>(null)
  const processHideTimeoutRef = useRef<number | null>(null)
  const previousStatusRef = useRef<string>("ready")
  const stoppedManuallyRef = useRef(false)
  const starterPromptAttemptedForConversationRef = useRef<string | null>(null)

  const { data: session } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const userId = useQuery(api.chatHelpers.getUserId, session?.user?.id ? { betterAuthUserId: session.user.id } : "skip")
  const createConversation = useMutation(api.conversations.createConversation)

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

  // 2. Initialize useChat with AI SDK v5/v6 API
  const editAndTruncate = useMutation(api.messages.editAndTruncateConversation)

  // Create transport with custom body for conversationId
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          conversationId: safeConversationId,
          fileIds: uploadedFileIds,
        },
      }),
    [safeConversationId, uploadedFileIds]
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

  // Auto-send pending starter prompt after redirect from landing state.
  useEffect(() => {
    if (!conversationId || !isAuthenticated) return
    if (status !== "ready") return
    if (isHistoryLoading) return
    if (messages.length > 0) return
    if (starterPromptAttemptedForConversationRef.current === conversationId) return

    starterPromptAttemptedForConversationRef.current = conversationId
    const pendingPrompt = consumePendingStarterPrompt(conversationId)
    if (!pendingPrompt) return

    pendingScrollToBottomRef.current = true
    sendMessage({ text: pendingPrompt })
  }, [conversationId, isAuthenticated, isHistoryLoading, messages.length, sendMessage, status])


  // 3. Sync history messages to useChat state - only when conversation changes or history first loads
  useEffect(() => {
    if (
      conversationId &&
      !isHistoryLoading &&
      historyMessages &&
      syncedConversationRef.current !== conversationId
    ) {
      const mappedMessages = historyMessages.map(msg => ({
        id: msg._id,
        role: msg.role as "user" | "assistant" | "system" | "data",
        content: msg.content,
        parts: [{ type: 'text', text: msg.content } as const],
        annotations: msg.fileIds ? [{ type: 'file_ids', fileIds: msg.fileIds }] : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sources: (msg as any).sources,
      })) as unknown as UIMessage[]

      setMessages(mappedMessages)
      syncedConversationRef.current = conversationId
    }

    if (conversationId !== syncedConversationRef.current && syncedConversationRef.current !== null) {
      syncedConversationRef.current = null
    }
  }, [conversationId, historyMessages, isHistoryLoading, setMessages])

  const isLoading = status !== 'ready' && status !== 'error'
  const isGenerating = status === "submitted" || status === "streaming"

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
    const prevStatus = previousStatusRef.current
    const hadGeneratingStatus = prevStatus === "submitted" || prevStatus === "streaming"

    if (status === "submitted") {
      clearProcessTimers()
      stoppedManuallyRef.current = false
      setProcessUi({
        visible: true,
        status: "submitted",
        progress: 8,
        message: "Menyiapkan respons...",
      })
    } else if (status === "streaming") {
      clearProcessTimers()
      setProcessUi((prev) => ({
        visible: true,
        status: "streaming",
        progress: Math.max(prev.progress, 16),
        message: "Agen menyusun jawaban...",
      }))
      processIntervalRef.current = window.setInterval(() => {
        setProcessUi((prev) => {
          if (!prev.visible) return prev
          const nextProgress = Math.min(prev.progress + (prev.progress < 70 ? 4 : 2), 92)
          return { ...prev, progress: nextProgress }
        })
      }, 220)
    } else if (status === "ready" && hadGeneratingStatus) {
      clearProcessTimers()
      const wasStoppedManually = stoppedManuallyRef.current
      setProcessUi({
        visible: true,
        status: wasStoppedManually ? "stopped" : "ready",
        progress: 100,
        message: wasStoppedManually ? "Proses dihentikan" : "Respons selesai",
      })
      processHideTimeoutRef.current = window.setTimeout(() => {
        setProcessUi((prev) => ({ ...prev, visible: false }))
        stoppedManuallyRef.current = false
      }, 900)
    } else if (status === "error" && hadGeneratingStatus) {
      clearProcessTimers()
      setProcessUi({
        visible: true,
        status: "error",
        progress: 100,
        message: "Terjadi kendala saat memproses jawaban",
      })
      processHideTimeoutRef.current = window.setTimeout(() => {
        setProcessUi((prev) => ({ ...prev, visible: false }))
      }, 1500)
      stoppedManuallyRef.current = false
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

  const handleFileUploaded = (fileId: Id<"files">) => {
    setUploadedFileIds(prev => [...prev, fileId])
  }

  const handleRegenerate = (options?: { markDirty?: boolean }) => {
    if (isPaperMode && options?.markDirty !== false) {
      markStageAsDirty()
    }
    regenerate()
  }

  const handleStopGeneration = useCallback(() => {
    if (!isGenerating) return
    stoppedManuallyRef.current = true
    stop()
  }, [isGenerating, stop])

  const handleEdit = async (messageId: string, newContent: string) => {
    if (!safeConversationId) return

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
        pendingScrollToBottomRef.current = true
        sendMessage({ text: newContent })
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
    if (!input.trim() || isLoading) return

    pendingScrollToBottomRef.current = true
    sendMessage({ text: input })
    setInput("")
    setUploadedFileIds([])
  }

  const handleApprove = async () => {
    if (!userId) return
    try {
      await approveStage(userId)
      // Auto-send message agar AI aware dan bisa lanjutkan ke tahap berikutnya
      sendMessage({ text: `[Approved: ${stageLabel}] Lanjut ke tahap berikutnya.` })
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
      sendMessage({ text: `[Revisi untuk ${stageLabel}]\n\n${feedback}` })
      toast.info("Feedback revisi telah dikirim ke agen.")
    } catch (error) {
      console.error("Failed to request revision:", error)
      toast.error("Gagal mengirim feedback revisi.")
    }
  }

  // Handler for template selection
  const handleTemplateSelect = (template: Template) => {
    if (isLoading) return

    pendingScrollToBottomRef.current = true
    sendMessage({ text: template.message })
  }

  // Handler for starting new chat from empty state
  const handleStartNewChat = async (initialPrompt?: string) => {
    if (!userId || isCreatingChat) return
    const normalizedPrompt = initialPrompt?.trim() ?? ""
    setIsCreatingChat(true)
    try {
      const newId = await createConversation({ userId })
      if (newId) {
        if (normalizedPrompt) {
          setPendingStarterPrompt(newId, normalizedPrompt)
          setInput("")
        }
        router.push(`/chat/${newId}`)
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
      toast.error("Gagal membuat percakapan baru")
    } finally {
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
          <div className="shrink-0 flex items-center justify-between px-3 pt-[env(safe-area-inset-top,0px)]">
            <button
              onClick={onMobileMenuClick}
              className="p-2 -ml-1 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
              aria-label="Open sidebar"
            >
              <SidebarExpand className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 -mr-1 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
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
              if (!input.trim()) return
              await handleStartNewChat(input.trim())
            }}
            isLoading={isCreatingChat}
            isGenerating={false}
            conversationId={conversationId}
            uploadedFileIds={uploadedFileIds}
            onFileUploaded={handleFileUploaded}
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
              strictCmsMode
            />
          </div>

          {/* Persistent ChatInput — always visible, even in start state */}
          <ChatInput
            input={input}
            onInputChange={handleInputChange}
            onSubmit={async (e) => {
              e.preventDefault()
              if (!input.trim()) return
              await handleStartNewChat(input.trim())
            }}
            isLoading={isCreatingChat}
            isGenerating={false}
            conversationId={conversationId}
            uploadedFileIds={uploadedFileIds}
            onFileUploaded={handleFileUploaded}
          />
        </div>
      </div>
    )
  }

  // Handle invalid/not-found conversation
  if (conversationNotFound) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="md:hidden px-3 pt-[env(safe-area-inset-top,0px)] border-b border-[color:var(--chat-border)] bg-[var(--chat-background)]">
          <div className="flex items-center justify-between h-11">
            <button
              onClick={onMobileMenuClick}
              className="p-2 -ml-1 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
              aria-label="Open sidebar"
            >
              <SidebarExpand className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 -mr-1 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
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
      <div className="md:hidden px-3 pt-[env(safe-area-inset-top,0px)] border-b border-[color:var(--chat-border)] bg-[var(--chat-background)]">
        <div className="flex items-center gap-1 h-11">
          {/* Hamburger */}
          <button
            onClick={onMobileMenuClick}
            className="p-2 -ml-1 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Open sidebar"
          >
            <SidebarExpand className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {/* Tappable title — opens Edit/Delete sheet */}
          <button
            onClick={() => setShowEditDeleteSheet(true)}
            className="flex-1 flex items-center gap-1 min-w-0 active:bg-[var(--chat-accent)] rounded-action px-1.5 py-1 transition-colors duration-50"
          >
            <span className="truncate text-sm font-sans font-medium text-[var(--chat-foreground)]">
              {conversation?.title || "Percakapan baru"}
            </span>
            <NavArrowDown className="h-3 w-3 shrink-0 text-[var(--chat-muted-foreground)]" strokeWidth={1.5} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Toggle theme"
          >
            <SunLight className="h-5 w-5 hidden dark:block" strokeWidth={1.5} />
            <HalfMoon className="h-5 w-5 block dark:hidden" strokeWidth={1.5} />
          </button>

          {/* New chat */}
          <button
            onClick={() => router.push("/chat")}
            className="p-2 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Chat baru"
          >
            <ChatPlusIn className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {/* Paper sessions sheet toggle */}
          <button
            onClick={() => setShowPaperSessionsSheet(true)}
            className="-mr-1 p-2 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Paper sessions"
          >
            <FastArrowRightSquare className="h-5 w-5" strokeWidth={1.5} />
          </button>
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
              <div className="hidden md:block">
                <TemplateGrid
                  onTemplateSelect={handleTemplateSelect}
                  onSidebarLinkClick={handleSidebarLinkClick}
                  disabled={isLoading}
                  strictCmsMode
                />
              </div>
              <div className="md:hidden">
                <TemplateGrid
                  onTemplateSelect={handleTemplateSelect}
                  onSidebarLinkClick={handleSidebarLinkClick}
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            // Messages list
            <Virtuoso
              ref={virtuosoRef}
              data={messages}
              totalCount={messages.length}
              itemContent={(index, message) => {
                const historyMsg = historyMessages && historyMessages[index]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const persistedSources = (historyMsg && historyMsg.role === message.role) ? (historyMsg as any).sources : undefined

                const displayMessage = {
                  ...message,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  sources: (message as any).sources || persistedSources
                } as UIMessage

                return (
                  <div className="pb-4" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
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
                    />
                  </div>
                )
              }}
              atBottomStateChange={setIsAtBottom}
              atBottomThreshold={160}
              followOutput={(atBottom) => {
                if (pendingScrollToBottomRef.current) return "auto"
                if (isGenerating) return atBottom ? "auto" : false
                return atBottom ? "smooth" : false
              }}
              initialTopMostItemIndex={messages.length - 1}
              style={{ height: "100%" }}
              components={{
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
          message={processUi.message}
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
          isGenerating={isGenerating}
          onStop={handleStopGeneration}
          conversationId={conversationId}
          uploadedFileIds={uploadedFileIds}
          onFileUploaded={handleFileUploaded}
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
