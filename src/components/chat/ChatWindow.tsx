"use client"

import { useChat } from "@ai-sdk/react"
import { UIMessage, DefaultChatTransport } from "ai"
import { useEffect, useState, useRef, useMemo } from "react"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { useMessages } from "@/lib/hooks/useMessages"
import { MessageSquareIcon, MenuIcon, AlertCircleIcon, RotateCcwIcon } from "lucide-react"
import { Id } from "../../../convex/_generated/dataModel"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface ChatWindowProps {
  conversationId: string | null
  onMobileMenuClick?: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
}

export function ChatWindow({ conversationId, onMobileMenuClick, onArtifactSelect }: ChatWindowProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const [input, setInput] = useState("")
  const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>([])

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
    // Only sync if:
    // 1. We have a conversationId
    // 2. History has loaded (not loading and we have data)
    // 3. We haven't synced this conversation yet
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
        annotations: msg.fileIds ? [{ type: 'file_ids', fileIds: msg.fileIds }] : undefined
      })) as unknown as UIMessage[]

      setMessages(mappedMessages)
      syncedConversationRef.current = conversationId
    }

    // Reset sync tracking when conversation changes
    if (conversationId !== syncedConversationRef.current && syncedConversationRef.current !== null) {
      syncedConversationRef.current = null
    }
  }, [conversationId, historyMessages, isHistoryLoading, setMessages])

  const isLoading = status !== 'ready' && status !== 'error'

  // Ref handle for Virtuoso is sufficient for auto-scroll via followOutput prop

  // Manual handlers for Vercel AI SDK v5
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleFileUploaded = (fileId: Id<"files">) => {
    setUploadedFileIds(prev => [...prev, fileId])
  }

  const handleEdit = async (messageId: string, newContent: string) => {
    if (!conversationId) return

    try {
      // 1. Mutate Backend: Update text and delete subsequent messages
      await editAndTruncate({
        messageId: messageId as Id<"messages">,
        content: newContent,
        conversationId: conversationId as Id<"conversations">
      })

      // 2. Mutate Local State: Truncate messages after the edited one
      const messageIndex = messages.findIndex(m => m.id === messageId)
      if (messageIndex !== -1) {
        const truncatedMessages = messages.slice(0, messageIndex + 1)
        // Update the content of the last message (the edited one)
        truncatedMessages[messageIndex] = {
          ...truncatedMessages[messageIndex],
          parts: [{ type: 'text', text: newContent }]
        } as unknown as UIMessage

        setMessages(truncatedMessages)

        // 3. Trigger Regenerate
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

    // AI SDK v5/v6: Use sendMessage with text
    sendMessage({ text: input })
    setInput("")
    setUploadedFileIds([])
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="md:hidden p-4 border-b flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Open mobile menu">
            <MenuIcon className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Makalah Chat</span>
          <div className="w-9" /> {/* Spacer */}
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

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden p-4 relative">
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
            <MessageSquareIcon className="h-12 w-12 mb-4" />
            <p>Mulai percakapan baru...</p>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            totalCount={messages.length}
            itemContent={(index, message) => (
              <div className="pb-4">
                <MessageBubble
                  key={message.id}
                  message={message}
                  conversationId={conversationId}
                  onEdit={handleEdit}
                  onArtifactSelect={onArtifactSelect}
                />
              </div>
            )}
            followOutput="auto"
            initialTopMostItemIndex={messages.length - 1}
            style={{ height: "100%" }}
          />
        )}

        {/* Error State Overlay/Bottom Banner */}
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
  )
}
