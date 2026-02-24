"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { toast } from "sonner"
import { EditPencil, Trash } from "iconoir-react"
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

interface MobileEditDeleteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: Id<"conversations"> | null
}

export function MobileEditDeleteSheet({
  open,
  onOpenChange,
  conversationId,
}: MobileEditDeleteSheetProps) {
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

  useEffect(() => {
    if (!open) {
      setIsRenaming(false)
      setRenameValue("")
      setIsSaving(false)
    }
  }, [open])

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  function handleClose() {
    onOpenChange(false)
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
      await updateTitle({ conversationId, userId: user._id, title: trimmed })
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
    "flex w-full items-center gap-3 px-5 py-3.5 font-sans text-sm text-[var(--chat-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-shell border-t border-[color:var(--chat-border)] bg-[var(--chat-background)] p-0 [&>button]:hidden"
          data-chat-scope=""
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-[var(--chat-muted)]" />
          </div>
          <SheetHeader className="sr-only">
            <SheetTitle>Edit percakapan</SheetTitle>
          </SheetHeader>

          {isRenaming ? (
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
                className="w-full rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-3 py-2 font-sans text-sm text-[var(--chat-foreground)] placeholder:text-[var(--chat-muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--chat-accent)]"
                placeholder="Judul percakapan..."
              />
              <div className="mt-1 text-right font-sans text-xs text-[var(--chat-muted-foreground)]">
                {renameValue.length}/50
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleCancelRename}
                  disabled={isSaving}
                  className="flex-1 rounded-action border border-[color:var(--chat-border)] px-3 py-2 font-sans text-sm text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveRename}
                  disabled={isSaving || !renameValue.trim()}
                  className="flex-1 rounded-action bg-[var(--chat-foreground)] px-3 py-2 font-sans text-sm text-[var(--chat-background)] active:bg-[var(--chat-secondary-foreground)] transition-colors duration-50 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          ) : (
            <div className="pb-2">
              {conversationId && conversation && (
                <button onClick={handleStartRename} className={actionButtonClass}>
                  <EditPencil className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>Edit Judul</span>
                </button>
              )}
              {conversationId && conversation && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={actionButtonClass}
                >
                  <Trash className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>Hapus Percakapan</span>
                </button>
              )}
              <div className="border-t border-[color:var(--chat-border)] mt-1" />
              <button
                onClick={handleClose}
                className="flex w-full items-center justify-center px-5 py-3.5 font-sans text-sm text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
              >
                Batal
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent
          className="bg-[var(--chat-background)] border border-[color:var(--chat-border)]"
          data-chat-scope=""
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans text-[var(--chat-foreground)]">
              Hapus Percakapan?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-[var(--chat-muted-foreground)]">
              Percakapan ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="font-sans text-sm border-[color:var(--chat-border)] text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)]"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="font-sans text-sm bg-[var(--chat-foreground)] text-[var(--chat-background)] active:opacity-90"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
