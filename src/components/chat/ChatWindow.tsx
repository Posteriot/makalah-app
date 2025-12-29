"use client"

import { useChat } from "@ai-sdk/react"
import { UIMessage, DefaultChatTransport } from "ai"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { useMessages } from "@/lib/hooks/useMessages"
import { MessageSquareIcon, MenuIcon, AlertCircleIcon, RotateCcwIcon, FileTextIcon } from "lucide-react"
import { Id } from "../../../convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { PaperStageProgress } from "../paper/PaperStageProgress"
import { PaperValidationPanel } from "../paper/PaperValidationPanel"
import { useUser } from "@clerk/nextjs"

interface ChatWindowProps {
  conversationId: string | null
  onMobileMenuClick?: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
}

export function ChatWindow({ conversationId, onMobileMenuClick, onArtifactSelect }: ChatWindowProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const scrollRafRef = useRef<number | null>(null)
  const pendingScrollToBottomRef = useRef(false)
  const wasGeneratingRef = useRef(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [input, setInput] = useState("")
  const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>([])

  const { user: clerkUser } = useUser()
  const userId = useQuery(api.chatHelpers.getUserId, clerkUser?.id ? { clerkUserId: clerkUser.id } : "skip")

  const {
    isPaperMode,
    currentStage,
    stageStatus,
    stageLabel,
    approveStage,
    requestRevision,
  } = usePaperSession(conversationId as Id<"conversations">)

  // Track which conversation has been synced to prevent infinite loops
  const syncedConversationRef = useRef<string | null>(null)

  // 1. Fetch history from Convex
  const { messages: historyMessages, isLoading: isHistoryLoading } = useMessages(conversationId)

  // 2. Initialize useChat with AI SDK v5/v6 API
  const editAndTruncate = useMutation(api.messages.editAndTruncateConversation)

  // Create transport with custom body for conversationId
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: {
      conversationId: conversationId,
      fileIds: uploadedFileIds,
    },
  }), [conversationId, uploadedFileIds])

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

  const { messages, sendMessage, status, stop, setMessages, regenerate, error } = useChat({
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

  const handleEdit = async (messageId: string, newContent: string) => {
    if (!conversationId) return

    try {
      await editAndTruncate({
        messageId: messageId as Id<"messages">,
        content: newContent,
        conversationId: conversationId as Id<"conversations">
      })

      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex !== -1) {
        const truncatedMessages = messages.slice(0, messageIndex + 1)
        truncatedMessages[messageIndex] = {
          ...truncatedMessages[messageIndex],
          parts: [{ type: 'text', text: newContent }]
        } as unknown as UIMessage

        setMessages(truncatedMessages)

        setTimeout(() => {
          regenerate()
        }, 0)
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
      toast.success("Tahap berhasil disetujui!")
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

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="md:hidden p-4 border-b flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Open mobile menu">
            <MenuIcon className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Makalah Chat</span>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquareIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Pilih chat atau mulai chat baru</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden p-4 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Open mobile menu">
          <MenuIcon className="h-5 w-5" />
        </Button>
        <span className="font-semibold">Makalah Chat</span>
      </div>

      {/* Messages Area (Using a flex container to handle stage progress bar) */}
      <div className="flex-1 overflow-hidden p-0 relative flex flex-col">
        {/* Paper Stage Progress Bar */}
        {isPaperMode && currentStage && stageStatus && (
          <div className="border-b bg-background/50 backdrop-blur-sm px-4 py-2 z-10">
            <PaperStageProgress
              currentStage={currentStage as string}
              stageStatus={stageStatus || "drafting"}
            />
          </div>
        )}

        {/* Message Container */}
        <div className="flex-1 overflow-hidden relative p-4">
          {isHistoryLoading && messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex justify-start">
                <Skeleton className="h-12 w-[60%] rounded-lg" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-12 w-[60%] rounded-lg" />
              </div>
              <div className="flex justify-start">
                <Skeleton className="h-24 w-[70%] rounded-lg" />
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquareIcon className="h-12 w-12 mb-4 opacity-50" />
              <p className="mb-6 opacity-50">Mulai percakapan baru...</p>
              {/* Start Paper Quick Action */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary-500/50 text-primary-500 hover:bg-primary-500/10"
                onClick={() => {
                  sendMessage({ text: "Saya ingin menulis paper akademik" })
                }}
              >
                <FileTextIcon className="h-4 w-4" />
                Mulai Menulis Paper
              </Button>
            </div>
          ) : (
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
                  <div className="pb-4">
                    <MessageBubble
                      key={message.id}
                      message={displayMessage}
                      conversationId={conversationId}
                      onEdit={handleEdit}
                      onArtifactSelect={onArtifactSelect}
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
                  <div className="pb-4">
                    <ThinkingIndicator visible={status === 'submitted'} />
                    <div className="h-4" />
                  </div>
                )
              }}
            />
          )}

          {/* Error State Overlay */}
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg flex items-center justify-between text-sm shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <AlertCircleIcon className="h-4 w-4" />
                <span>Gagal mengirim pesan.</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => regenerate()} className="bg-background hover:bg-accent h-7 text-xs border-destructive/20 hover:border-destructive/40">
                <RotateCcwIcon className="h-3 w-3 mr-1" />
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Paper Validation Panel Overlay */}
          {isPaperMode && stageStatus === "pending_validation" && userId && (
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <PaperValidationPanel
                stageLabel={stageLabel}
                onApprove={handleApprove}
                onRevise={handleRevise}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          conversationId={conversationId}
          uploadedFileIds={uploadedFileIds}
          onFileUploaded={handleFileUploaded}
        />
      </div>
    </div>
  )
}
