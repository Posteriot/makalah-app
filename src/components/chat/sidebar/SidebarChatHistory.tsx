"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { RefreshDouble, ChatBubble, Trash, EditPencil } from "iconoir-react"
import { Id } from "../../../../convex/_generated/dataModel"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { PaperSessionBadge } from "@/components/paper"
import { getStageNumber, type PaperStageId } from "../../../../convex/paperSessions/constants"
import { formatRelativeTime } from "@/lib/date/formatters"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface SidebarChatHistoryProps {
  conversations: Array<{
    _id: Id<"conversations">
    title: string
    lastMessageAt: number
  }>
  currentConversationId: string | null
  onDeleteConversation: (id: Id<"conversations">) => void
  onUpdateConversationTitle?: (id: Id<"conversations">, title: string) => Promise<void>
  onCloseMobile?: () => void
  isLoading?: boolean
}

/**
 * SidebarChatHistory - Extracted conversation list from ChatSidebar
 *
 * Features preserved:
 * - Conversation list rendering with paper session badges
 * - Inline edit mode (double-click to edit)
 * - Delete confirmation dialog
 * - Context menu for edit/delete actions
 * - Link-based navigation to /chat/[conversationId]
 */
export function SidebarChatHistory({
  conversations,
  currentConversationId,
  onDeleteConversation,
  onUpdateConversationTitle,
  onCloseMobile,
  isLoading,
}: SidebarChatHistoryProps) {
  const { user } = useCurrentUser()

  // Query paper sessions for current user to show badges
  const paperSessions = useQuery(
    api.paperSessions.getByUser,
    user ? { userId: user._id } : "skip"
  )

  // Create a map of conversationId -> paper session for quick lookup
  const paperSessionMap = new Map(
    paperSessions?.map((session) => [session.conversationId, session]) ?? []
  )

  // State untuk delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<{
    id: Id<"conversations">
    title: string
  } | null>(null)

  // State untuk inline edit mode
  const [editingId, setEditingId] = useState<Id<"conversations"> | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input saat edit mode aktif
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // Handler untuk memulai edit mode
  const handleStartEdit = (id: Id<"conversations">, title: string) => {
    setEditingId(id)
    setEditValue(title)
  }

  // Handler untuk menyimpan edit
  const handleSaveEdit = async () => {
    if (!editingId || !onUpdateConversationTitle) {
      setEditingId(null)
      return
    }

    const trimmedValue = editValue.trim()
    const originalTitle =
      conversations.find((c) => c._id === editingId)?.title ?? ""

    // Skip jika kosong atau tidak berubah
    if (!trimmedValue || trimmedValue === originalTitle) {
      setEditingId(null)
      setEditValue("")
      return
    }

    // Validation: max 50 characters
    if (trimmedValue.length > 50) {
      toast.error("Judul maksimal 50 karakter")
      return
    }

    setIsUpdating(true)
    try {
      await onUpdateConversationTitle(editingId, trimmedValue)
    } catch {
      toast.error("Gagal menyimpan judul")
    } finally {
      setIsUpdating(false)
      setEditingId(null)
      setEditValue("")
    }
  }

  // Handler untuk cancel edit
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue("")
  }

  // Handler keyboard untuk edit input
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  // Handler untuk membuka dialog konfirmasi delete
  const handleDeleteClick = (id: Id<"conversations">, title: string) => {
    setConversationToDelete({ id, title })
    setDeleteDialogOpen(true)
  }

  // Handler untuk konfirmasi delete
  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete.id)
    }
    setDeleteDialogOpen(false)
    setConversationToDelete(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col gap-2 p-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--chat-muted-foreground)] opacity-50">
        <ChatBubble className="h-8 w-8 mb-2" />
        <span className="text-xs">Belum ada percakapan</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <TooltipProvider delayDuration={300}>
          {conversations.map((conv) => {
            const paperSession = paperSessionMap.get(conv._id)
            const isEditing = editingId === conv._id
            const isExceedingMaxLength = isEditing && editValue.length > 50

            // Flat list — no border, no rounded, no shadow. Matches desktop exactly.
            const itemClasses = cn(
              "group flex w-full items-center px-4 py-3.5 text-left transition-colors duration-150",
              currentConversationId === conv._id
                ? "bg-[var(--chat-accent)]"
                : "active:bg-[var(--chat-sidebar-accent)]"
            )

            const renderContent = () => (
              <>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      isEditing
                        ? "flex items-center gap-2"
                        : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                    )}
                  >
                    {isEditing ? (
                      <Input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleSaveEdit}
                        disabled={isUpdating}
                        className={`h-5 text-xs px-1 py-0 font-medium ${
                          isExceedingMaxLength
                            ? "border-[color:var(--chat-destructive)] focus-visible:ring-[var(--chat-destructive)]"
                            : ""
                        }`}
                        aria-invalid={isExceedingMaxLength}
                      />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block min-w-0 font-sans font-medium text-xs text-[var(--chat-sidebar-foreground)] truncate">
                            {conv.title}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          sideOffset={4}
                          className="max-w-[280px] font-mono text-xs"
                        >
                          {conv.title}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {paperSession && !isEditing && (
                      <PaperSessionBadge
                        stageNumber={getStageNumber(
                          paperSession.currentStage as PaperStageId | "completed"
                        )}
                        className="justify-self-end shrink-0"
                      />
                    )}
                  </div>
                  {!isEditing && (
                    <div className="mt-1 text-[11px] text-[var(--chat-muted-foreground)] font-mono">
                      {formatRelativeTime(conv.lastMessageAt)}
                    </div>
                  )}
                </div>
                {/* Loading indicator saat updating */}
                {isEditing && isUpdating && (
                  <RefreshDouble className="h-4 w-4 animate-spin text-[var(--chat-muted-foreground)]" />
                )}
              </>
            )

            return (
              <ContextMenu key={conv._id}>
                <ContextMenuTrigger asChild>
                  {isEditing ? (
                    // Saat editing: gunakan div, BUKAN Link
                    <div className={itemClasses}>{renderContent()}</div>
                  ) : (
                    // Saat tidak editing: gunakan Link untuk navigasi
                    <Link
                      href={`/chat/${conv._id}`}
                      onClick={() => onCloseMobile?.()}
                      className={itemClasses}
                      aria-label={`Select conversation: ${conv.title}`}
                    >
                      {renderContent()}
                    </Link>
                  )}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => handleStartEdit(conv._id, conv.title)}
                  >
                    <EditPencil className="h-4 w-4 mr-2" />
                    Edit Judul
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => handleDeleteClick(conv._id, conv.title)}
                    className="text-[var(--chat-destructive)] focus:text-[var(--chat-destructive)]"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Hapus
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </TooltipProvider>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan?</AlertDialogTitle>
            <AlertDialogDescription>
              Percakapan{" "}
              <span className="font-medium text-[var(--chat-foreground)]">
                &quot;{conversationToDelete?.title}&quot;
              </span>{" "}
              akan dihapus secara permanen. Aksi ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConversationToDelete(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-[var(--chat-destructive)] text-[var(--chat-destructive-foreground)] hover:bg-[var(--chat-destructive)]"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
