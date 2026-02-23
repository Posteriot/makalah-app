"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FloppyDisk, Xmark } from "iconoir-react"
import { cn } from "@/lib/utils"

interface ArtifactEditorProps {
  content: string
  onSave: (content: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function ArtifactEditor({
  content,
  onSave,
  onCancel,
  isLoading = false,
}: ArtifactEditorProps) {
  const [editedContent, setEditedContent] = useState(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditedContent(content)
  }, [content])

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      )
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (editedContent.trim() && !isLoading) {
        onSave(editedContent)
      }
    }

    if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
    }
  }

  const handleSave = () => {
    if (editedContent.trim() && !isLoading) {
      onSave(editedContent)
    }
  }

  const hasChanges = editedContent !== content
  const charCount = editedContent.length

  return (
    <div className="flex h-full flex-col">
      {/* Edit mode header */}
      <div className="border-b border-[color:var(--chat-border)] bg-[var(--chat-card)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)]">
              Mode Edit
            </p>
            <p className="text-xs text-[var(--chat-muted-foreground)]">
              Ubah konten artifak lalu simpan sebagai versi baru.
            </p>
          </div>
          <span
            className={cn(
              "rounded-badge px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide",
              hasChanges
                ? "border border-[color:var(--chat-border)] bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]"
                : "border border-[color:var(--chat-border)] bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]"
            )}
          >
            {hasChanges ? "Draft berubah" : "Tanpa perubahan"}
          </span>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-hidden rounded-shell border border-[color:var(--chat-border)] bg-[var(--chat-background)] shadow-sm">
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-full w-full resize-none bg-transparent p-4 text-sm font-mono leading-relaxed text-[var(--chat-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)] focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="Masukkan konten artifak..."
            disabled={isLoading}
            aria-label="Edit konten artifak"
          />
        </div>
      </div>

      {/* Footer with status + actions + shortcut */}
      <div className="border-t border-[color:var(--chat-border)] bg-[var(--chat-card)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--chat-muted-foreground)]">
            <span>{charCount} karakter</span>
            {isLoading && (
              <span className="inline-flex items-center gap-1 rounded-badge border border-[color:var(--chat-primary)] bg-[var(--chat-primary)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--chat-primary-foreground)]">
                <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                Menyimpan
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
              className="font-mono text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)]"
            >
              <Xmark className="mr-1 h-4 w-4" />
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editedContent.trim() || isLoading}
              className="font-mono"
            >
              <FloppyDisk className="mr-1 h-4 w-4" />
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>

        <div className="mt-2 border-t border-[color:var(--chat-border)] pt-2 text-[11px] text-[var(--chat-muted-foreground)]">
          <span className="font-mono">
            <kbd className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-muted)] px-1 py-0.5 text-[10px]">⌘/Ctrl</kbd>+
            <kbd className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-muted)] px-1 py-0.5 text-[10px]">Enter</kbd> simpan
            {" • "}
            <kbd className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-muted)] px-1 py-0.5 text-[10px]">Esc</kbd> batal
          </span>
        </div>
      </div>
    </div>
  )
}
