"use client"

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

interface DeleteSelectedDialogProps {
  open: boolean
  count: number
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function DeleteSelectedDialog({
  open,
  count,
  onOpenChange,
  onConfirm,
}: DeleteSelectedDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-chat-scope="" className="border-[color:var(--chat-border)] bg-[var(--chat-card)] text-[var(--chat-foreground)]">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-[var(--chat-foreground)]">
            Hapus pilihan percakapan?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--chat-muted-foreground)]">
            {count} percakapan terpilih akan dihapus permanen dari workspace ini.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-[color:var(--chat-border)] bg-[var(--chat-background)] text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void onConfirm()}
            className="border-0 bg-[var(--chat-destructive)] text-[var(--chat-destructive-foreground)] hover:opacity-90"
          >
            Ya, hapus pilihan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
