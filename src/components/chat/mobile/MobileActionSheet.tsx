"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { toast } from "sonner"
import { Plus, Page, EditPencil, Trash } from "iconoir-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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

interface MobileActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: Id<"conversations"> | null
  onViewArtifacts: () => void
  onNewChat: () => void
}

export function MobileActionSheet({
  open,
  onOpenChange,
  conversationId,
  onViewArtifacts,
  onNewChat,
}: MobileActionSheetProps) {
  const router = useRouter()
  const { user } = useCurrentUser()
  const inputRef = useRef<HTMLInputElement>(null)

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteConversation = useMutation(api.conversations.deleteConversation)
  const updateTitle = useMutation(api.conversations.updateConversationTitleFromUser)

  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  )

  const artifacts = useQuery(
    api.artifacts.listByConversation,
    conversationId && user?._id
      ? { conversationId, userId: user._id }
      : "skip"
  )

  const artifactCount = artifacts?.length ?? 0

  // Reset rename state when sheet closes
  useEffect(() => {
    if (!open) {
      setIsRenaming(false)
      setRenameValue("")
      setIsSaving(false)
    }
  }, [open])

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  function handleClose() {
    onOpenChange(false)
  }

  function handleNewChat() {
    onNewChat()
    handleClose()
  }

  function handleViewArtifacts() {
    onViewArtifacts()
    handleClose()
  }

  function handleStartRename() {
    setRenameValue(conversation?.title ?? "")
    setIsRenaming(true)
  }

  async function handleSaveRename() {
    if (!conversationId || !user?._id) return

    const trimmed = renameValue.trim()
    if (!trimmed) {
      toast.error("Judul tidak boleh kosong")
      return
    }
    if (trimmed.length > 50) {
      toast.error("Judul maksimal 50 karakter")
      return
    }

    setIsSaving(true)
    try {
      await updateTitle({
        conversationId,
        userId: user._id,
        title: trimmed,
      })
      toast.success("Judul berhasil diubah")
      handleClose()
    } catch {
      toast.error("Gagal mengubah judul")
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelRename() {
    setIsRenaming(false)
    setRenameValue("")
  }

  function handleDeleteClick() {
    setShowDeleteConfirm(true)
  }

  async function handleConfirmDelete() {
    if (!conversationId) return

    setIsDeleting(true)
    try {
      await deleteConversation({ conversationId })
      toast.success("Percakapan berhasil dihapus")
      setShowDeleteConfirm(false)
      handleClose()
      router.push("/chat")
    } catch {
      toast.error("Gagal menghapus percakapan")
    } finally {
      setIsDeleting(false)
    }
  }

  const actionButtonClass =
    "flex w-full items-center gap-3 px-4 py-3 font-mono text-sm text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)] transition-colors duration-50 active:bg-[var(--chat-accent)]"

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-xl border-t border-[var(--chat-border)] bg-[var(--chat-background)] p-0 [&>button]:hidden"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-8 rounded-full bg-[var(--chat-muted-foreground)]/30" />
          </div>

          <SheetHeader className="sr-only">
            <SheetTitle>Opsi percakapan</SheetTitle>
          </SheetHeader>

          {isRenaming ? (
            /* Rename mode */
            <div className="px-4 pb-4 pt-2">
              <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                Edit Judul
              </label>
              <input
                ref={inputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename()
                  if (e.key === "Escape") handleCancelRename()
                }}
                maxLength={50}
                className="w-full rounded-action border border-[var(--chat-border)] bg-[var(--chat-background)] px-3 py-2 font-mono text-sm text-[var(--chat-foreground)] placeholder:text-[var(--chat-muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--chat-accent)]"
                placeholder="Judul percakapan..."
              />
              <div className="mt-1 text-right font-mono text-xs text-[var(--chat-muted-foreground)]">
                {renameValue.length}/50
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleCancelRename}
                  disabled={isSaving}
                  className="flex-1 rounded-action border border-[var(--chat-border)] px-3 py-2 font-mono text-sm text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-accent)] transition-colors duration-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveRename}
                  disabled={isSaving || !renameValue.trim()}
                  className="flex-1 rounded-action bg-[var(--chat-foreground)] px-3 py-2 font-mono text-sm text-[var(--chat-background)] hover:opacity-90 transition-opacity duration-50 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          ) : (
            /* Action list */
            <div className="pb-2">
              {/* Chat Baru */}
              <button onClick={handleNewChat} className={actionButtonClass}>
                <Plus className="size-4 shrink-0" strokeWidth={1.5} />
                <span>Chat Baru</span>
              </button>

              {/* Lihat Artifacts — only when count > 0 */}
              {artifactCount > 0 && (
                <button onClick={handleViewArtifacts} className={actionButtonClass}>
                  <Page className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>Lihat Artifacts ({artifactCount})</span>
                </button>
              )}

              {/* Edit Judul — only when conversation exists */}
              {conversationId && conversation && (
                <button onClick={handleStartRename} className={actionButtonClass}>
                  <EditPencil className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>Edit Judul</span>
                </button>
              )}

              {/* Hapus Percakapan — only when conversation exists */}
              {conversationId && conversation && (
                <button
                  onClick={handleDeleteClick}
                  className="flex w-full items-center gap-3 px-4 py-3 font-mono text-sm text-[var(--chat-destructive)] hover:bg-[var(--chat-accent)] transition-colors duration-50 active:bg-[var(--chat-accent)]"
                >
                  <Trash className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>Hapus Percakapan</span>
                </button>
              )}

              {/* Separator + Batal */}
              <div className="border-t border-[var(--chat-border)] mt-1" />
              <button
                onClick={handleClose}
                className="flex w-full items-center justify-center px-4 py-3 font-mono text-sm text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-accent)] transition-colors duration-50 active:bg-[var(--chat-accent)]"
              >
                Batal
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[var(--chat-background)] border-[var(--chat-border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-[var(--chat-foreground)]">
              Hapus Percakapan?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-sm text-[var(--chat-muted-foreground)]">
              Percakapan ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="font-mono text-sm border-[var(--chat-border)] text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-accent)]"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="font-mono text-sm bg-[var(--chat-destructive)] text-white hover:bg-[var(--chat-destructive)]/90"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
