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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

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
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground opacity-50">
        <ChatBubble className="h-8 w-8 mb-2" />
        <span className="text-xs">Belum ada percakapan</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {conversations.map((conv) => {
          const paperSession = paperSessionMap.get(conv._id)
          const isEditing = editingId === conv._id
          const hasPaperSession = !!paperSession
          const isExceedingMaxLength = isEditing && editValue.length > 50

          // Shared classes for both Link and div
          const itemClasses = `group flex items-center w-full p-3 transition-colors text-left ${
            currentConversationId === conv._id
              ? "bg-list-selected-bg"
              : "hover:bg-list-hover-bg"
          }`

          // Content yang sama untuk edit mode dan normal mode
          const renderContent = () => (
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleSaveEdit}
                      disabled={isUpdating}
                      className={`h-6 text-sm px-1 py-0 font-medium ${
                        isExceedingMaxLength
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }`}
                      aria-invalid={isExceedingMaxLength}
                    />
                  ) : (
                    <span
                      className="font-medium text-sm truncate"
                      onDoubleClick={(e) => {
                        if (hasPaperSession) return
                        e.preventDefault()
                        e.stopPropagation()
                        handleStartEdit(conv._id, conv.title)
                      }}
                    >
                      {conv.title}
                    </span>
                  )}
                  {paperSession && !isEditing && (
                    <PaperSessionBadge
                      stageNumber={getStageNumber(
                        paperSession.currentStage as PaperStageId | "completed"
                      )}
                    />
                  )}
                </div>
                {!isEditing && (
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(conv.lastMessageAt)}
                  </div>
                )}
              </div>
              {/* Action buttons - hidden saat editing */}
              {!isEditing && (
                <div className="flex items-center gap-0.5">
                  {/* Edit button - hidden untuk paper session */}
                  {!hasPaperSession && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          role="button"
                          tabIndex={0}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleStartEdit(conv._id, conv.title)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              e.stopPropagation()
                              handleStartEdit(conv._id, conv.title)
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-accent rounded-md transition-all focus:opacity-100"
                          aria-label="Edit judul"
                        >
                          <EditPencil className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Edit judul</TooltipContent>
                    </Tooltip>
                  )}
                  {/* Delete button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteClick(conv._id, conv.title)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteClick(conv._id, conv.title)
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all focus:opacity-100"
                        aria-label="Hapus percakapan"
                      >
                        <Trash className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Hapus percakapan</TooltipContent>
                  </Tooltip>
                </div>
              )}
              {/* Loading indicator saat updating */}
              {isEditing && isUpdating && (
                <RefreshDouble className="h-4 w-4 animate-spin text-muted-foreground" />
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
                  disabled={hasPaperSession}
                >
                  <EditPencil className="h-4 w-4 mr-2" />
                  Edit Judul
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => handleDeleteClick(conv._id, conv.title)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Hapus
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan?</AlertDialogTitle>
            <AlertDialogDescription>
              Percakapan{" "}
              <span className="font-medium text-foreground">
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default SidebarChatHistory
