"use client"

import { useChat } from "@ai-sdk/react"
import { UIMessage, DefaultChatTransport } from "ai"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { useMessages } from "@/lib/hooks/useMessages"
import { Menu, WarningCircle, Refresh, Sparks, Page, Search } from "iconoir-react"
import { Id } from "../../../convex/_generated/dataModel"
import { useMutation, useQuery, useConvexAuth } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { PaperValidationPanel } from "../paper/PaperValidationPanel"
import { useUser } from "@clerk/nextjs"
import { TemplateGrid, type Template } from "./messages/TemplateGrid"
import { QuotaWarningBanner } from "./QuotaWarningBanner"

interface ChatWindowProps {
  conversationId: string | null
  onMobileMenuClick?: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
}

export function ChatWindow({ conversationId, onMobileMenuClick, onArtifactSelect }: ChatWindowProps) {
  const router = useRouter()
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const scrollRafRef = useRef<number | null>(null)
  const pendingScrollToBottomRef = useRef(false)
  const wasGeneratingRef = useRef(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [input, setInput] = useState("")
  const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>([])
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  const { user: clerkUser } = useUser()
  const userId = useQuery(api.chatHelpers.getUserId, clerkUser?.id ? { clerkUserId: clerkUser.id } : "skip")
  const createConversation = useMutation(api.conversations.createConversation)

  const isValidConvexId = (value: string | null): value is string =>
    typeof value === "string" && /^[a-z0-9]{32}$/.test(value)
  const safeConversationId = isValidConvexId(conversationId)
    ? (conversationId as Id<"conversations">)
    : null

  const { isAuthenticated } = useConvexAuth()

  const {
    isPaperMode,
    stageStatus,
    stageLabel,
    stageData,
    approveStage,
    requestRevision,
    markStageAsDirty,
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
  const isAuthSettled = !clerkUser?.id || userId !== undefined

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

  const { messages, sendMessage, status, setMessages, regenerate, error } = useChat({
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
      toast.info("Feedback revisi telah dikirim ke AI.")
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
  const handleStartNewChat = async () => {
    if (!userId || isCreatingChat) return
    setIsCreatingChat(true)
    try {
      const newId = await createConversation({ userId })
      if (newId) {
        router.push(`/chat/${newId}`)
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
      toast.error("Gagal membuat percakapan baru")
    } finally {
      setIsCreatingChat(false)
    }
  }

  // Landing page empty state (no conversation selected)
  // ChatInput is persistent — always visible at bottom, even in start state
  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-border/50 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Open mobile menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Makalah Chat</span>
          <div className="w-9" />
        </div>

        {/* Empty State Content — fills available space above ChatInput */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-shell bg-slate-200 flex items-center justify-center">
              <Sparks className="w-8 h-8 text-slate-500" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-narrative text-xl font-medium tracking-tight">Selamat Datang di Makalah Chat</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Asisten AI untuk membantu riset, menulis makalah ilmiah, dan menjawab pertanyaan akademik.
                Mulai percakapan baru atau pilih dari riwayat di sidebar.
              </p>
            </div>

            {/* Template Cards */}
            <div className="grid grid-cols-1 gap-3 text-left text-sm">
              <div className="flex items-start gap-3 p-3 rounded-shell border-hairline bg-card/90 backdrop-blur-[1px]">
                <Page className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-interface text-sm font-medium">Tulis Makalah</p>
                  <p className="text-interface text-xs text-muted-foreground">Panduan step-by-step menulis paper akademik</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-shell border-hairline bg-card/90 backdrop-blur-[1px]">
                <Search className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-interface text-sm font-medium">Riset & Referensi</p>
                  <p className="text-interface text-xs text-muted-foreground">Cari jurnal dan sumber ilmiah terpercaya</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Persistent ChatInput — always visible, even in start state */}
        <ChatInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={async (e) => {
            e.preventDefault()
            if (!input.trim()) return
            await handleStartNewChat()
          }}
          isLoading={isCreatingChat}
          conversationId={conversationId}
          uploadedFileIds={uploadedFileIds}
          onFileUploaded={handleFileUploaded}
        />
      </div>
    )
  }

  // Handle invalid/not-found conversation
  if (conversationNotFound) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="md:hidden p-4 border-b border-border/50 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Open mobile menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Makalah Chat</span>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            {/* Mechanical Grace: Rose error color */}
            <WarningCircle className="h-12 w-12 mx-auto mb-4 text-rose-500/50" />
            <p className="mb-2 font-mono">Percakapan tidak ditemukan</p>
            <p className="text-sm opacity-75 font-mono">Percakapan mungkin telah dihapus atau URL tidak valid.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden p-4 border-b border-border/50 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Open mobile menu">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold">Makalah Chat</span>
      </div>

      {/* Quota Warning Banner */}
      <QuotaWarningBanner className="mx-4 mt-4" />

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden p-0 relative flex flex-col">
        {/* Message Container - padding handled at item level for Virtuoso compatibility */}
        <div className="flex-1 overflow-hidden relative py-4">
          {(isHistoryLoading || isConversationLoading) && messages.length === 0 ? (
            // Loading skeleton - px-6 for consistent spacing
            <div className="space-y-4 px-6">
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
            // Empty state with TemplateGrid - px-6 for consistent spacing
            <div className="flex flex-col items-center justify-center h-full px-6">
              <TemplateGrid onTemplateSelect={handleTemplateSelect} />
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
                  <div className="pb-4 px-6">
                    <MessageBubble
                      key={message.id}
                      message={displayMessage}
                      onEdit={handleEdit}
                      onArtifactSelect={onArtifactSelect}
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
                  <div className="pb-4 px-6">
                    {/* Paper Validation Panel - renders before ThinkingIndicator */}
                    {isPaperMode && stageStatus === "pending_validation" && userId && status !== 'streaming' && (
                      <PaperValidationPanel
                        stageLabel={stageLabel}
                        onApprove={handleApprove}
                        onRevise={handleRevise}
                        isLoading={isLoading}
                      />
                    )}
                    <ThinkingIndicator visible={status === 'submitted'} />
                    <div className="h-4" />
                  </div>
                )
              }}
            />
          )}

          {/* Error State Overlay - Mechanical Grace: Rose error */}
          {error && (
            <div className="absolute bottom-4 left-6 right-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-action flex items-center justify-between text-sm shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <WarningCircle className="h-4 w-4" />
                <span className="font-mono">Gagal mengirim pesan.</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleRegenerate()} className="bg-background hover:bg-accent h-7 text-xs font-mono border-rose-500/30 hover:border-rose-500/50">
                <Refresh className="h-3 w-3 mr-1" />
                Coba Lagi
              </Button>
            </div>
          )}

        </div>

        {/* Input Area */}
        <ChatInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          conversationId={conversationId}
          uploadedFileIds={uploadedFileIds}
          onFileUploaded={handleFileUploaded}
        />
      </div>
    </div>
  )
}
