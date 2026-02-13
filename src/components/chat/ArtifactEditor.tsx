"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FloppyDisk, Xmark } from "iconoir-react"

interface ArtifactEditorProps {
    content: string
    onSave: (content: string) => void
    onCancel: () => void
    isLoading?: boolean
}

export function ArtifactEditor({ content, onSave, onCancel, isLoading = false }: ArtifactEditorProps) {
    const [editedContent, setEditedContent] = useState(content)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Focus textarea on mount
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
            // Move cursor to end
            textareaRef.current.setSelectionRange(
                textareaRef.current.value.length,
                textareaRef.current.value.length
            )
        }
    }, [])

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Cmd+Enter or Ctrl+Enter: Save
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            if (editedContent.trim() && !isLoading) {
                onSave(editedContent)
            }
        }
        // Esc: Cancel
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
        <div className="flex flex-col h-full">
            {/* Editor */}
            <div className="flex-1 p-4 overflow-hidden">
                <textarea
                    ref={textareaRef}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-full resize-none bg-muted rounded-action p-4 text-sm font-mono border border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Masukkan konten artifact..."
                    disabled={isLoading}
                    aria-label="Edit artifact content"
                />
            </div>

            {/* Footer with actions */}
            <div className="p-4 border-t flex items-center justify-between">
                <div className="text-xs text-muted-foreground font-mono">
                    {charCount} karakter
                    {hasChanges && (
                        <span className="ml-2 text-amber-500">• Belum disimpan</span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="font-mono"
                    >
                        <Xmark className="h-4 w-4 mr-1" />
                        Batal
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!editedContent.trim() || isLoading}
                        className="font-mono"
                    >
                        <FloppyDisk className="h-4 w-4 mr-1" />
                        {isLoading ? "Menyimpan..." : "Simpan"}
                    </Button>
                </div>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="px-4 pb-2 text-xs text-muted-foreground">
                <kbd className="px-1 py-0.5 bg-muted rounded-badge text-[10px]">⌘</kbd>+<kbd className="px-1 py-0.5 bg-muted rounded-badge text-[10px]">Enter</kbd> simpan • <kbd className="px-1 py-0.5 bg-muted rounded-badge text-[10px]">Esc</kbd> batal
            </div>
        </div>
    )
}
