"use client"

import { useRef, useEffect } from "react"
import { Send, Page } from "iconoir-react"
import { FileUploadButton } from "./FileUploadButton"
import { Id } from "../../../convex/_generated/dataModel"

interface ChatInputProps {
    input: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    isLoading: boolean
    conversationId: string | null
    uploadedFileIds: Id<"files">[]
    onFileUploaded: (fileId: Id<"files">) => void
}

export function ChatInput({ input, onInputChange, onSubmit, isLoading, conversationId, uploadedFileIds, onFileUploaded }: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = "auto"
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
        }
    }, [input])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            const form = e.currentTarget.form
            if (form) form.requestSubmit()
        }
    }

    return (
        <div className="py-4 bg-transparent" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
            {uploadedFileIds.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {uploadedFileIds.map((id) => (
                        <div key={id} className="flex items-center gap-2 bg-muted p-2 rounded-badge text-xs font-mono text-muted-foreground whitespace-nowrap">
                            <Page className="h-3 w-3" />
                            <span>File attached</span>
                        </div>
                    ))}
                </div>
            )}
            <form onSubmit={onSubmit} className="flex">
                <div className="grid w-full grid-cols-[auto_1fr_auto] items-end gap-x-2 gap-y-2 rounded-lg border border-slate-300/60 bg-card/90 px-3 py-2 dark:border-slate-700/60">
                    {/* Input Field */}
                    <div className="col-span-3">
                        <textarea
                            ref={textareaRef}
                            className="w-full resize-none bg-transparent focus:outline-none min-h-[88px] px-2 py-1 text-interface text-sm leading-relaxed placeholder:text-sm"
                            value={input}
                            onChange={onInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Kirim percakapan..."
                            disabled={isLoading && false}
                            rows={3}
                            aria-label="Message input"
                        />
                    </div>

                    {/* Attachment Button */}
                    <div className="flex-none">
                        <FileUploadButton
                            conversationId={conversationId}
                            onFileUploaded={onFileUploaded}
                        />
                    </div>

                    <div />

                    {/* Send Button - dims when loading */}
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover-slash bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </form>
        </div>
    )
}
