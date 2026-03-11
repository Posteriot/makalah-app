"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"

interface DeleteAllConversationsDialogProps {
  open: boolean
  totalCount: number
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function DeleteAllConversationsDialog({
  open,
  totalCount,
  onOpenChange,
  onConfirm,
}: DeleteAllConversationsDialogProps) {
  const [confirmText, setConfirmText] = useState("")

  const canConfirm = confirmText.trim() === "HAPUS"

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setConfirmText("")
        }
        onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent data-chat-scope="" className="border-[color:var(--chat-border)] bg-[var(--chat-card)] text-[var(--chat-foreground)]">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-[var(--chat-foreground)]">
            Hapus semua percakapan?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--chat-muted-foreground)]">
            {totalCount} percakapan akan hilang permanen. Ketik <span className="font-mono font-semibold text-[var(--chat-foreground)]">HAPUS</span> untuk melanjutkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="delete-all-confirmation"
            className="text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-[var(--chat-muted-foreground)]"
          >
            Ketik HAPUS untuk melanjutkan
          </label>
          <Input
            id="delete-all-confirmation"
            aria-label="Ketik HAPUS untuk melanjutkan"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            className="border-[color:var(--chat-border)] bg-[var(--chat-background)] text-[var(--chat-foreground)]"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-[color:var(--chat-border)] bg-[var(--chat-background)] text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm}
            onClick={() => void onConfirm()}
            className="border-0 bg-[var(--chat-destructive)] text-[var(--chat-destructive-foreground)] hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            Hapus semua sekarang
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
