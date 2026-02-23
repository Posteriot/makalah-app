"use client"

import { useRef, useEffect } from "react"
import { Send, Page } from "iconoir-react"
import { Pause as PauseSolid } from "iconoir-react/solid"
import { FileUploadButton } from "./FileUploadButton"
import { Id } from "../../../convex/_generated/dataModel"

interface ChatInputProps {
    input: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    isLoading: boolean
    isGenerating?: boolean
    onStop?: () => void
    conversationId: string | null
    uploadedFileIds: Id<"files">[]
    onFileUploaded: (fileId: Id<"files">) => void
}

export function ChatInput({
    input,
    onInputChange,
    onSubmit,
    isLoading,
    isGenerating = false,
    onStop,
    conversationId,
    uploadedFileIds,
    onFileUploaded
}: ChatInputProps) {
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
                        <div key={id} className="flex items-center gap-2 bg-[var(--chat-muted)] p-2 rounded-badge text-xs font-mono text-[var(--chat-muted-foreground)] whitespace-nowrap">
                            <Page className="h-3 w-3" />
                            <span>File attached</span>
                        </div>
                    ))}
                </div>
            )}
            <form onSubmit={onSubmit} className="flex">
                <div className="grid w-full grid-cols-[auto_1fr_auto] items-end gap-x-2 gap-y-1 rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)] px-3 py-1.5">
                    {/* Input Field */}
                    <div className="col-span-3">
                        <textarea
                            ref={textareaRef}
                            className="w-full resize-none bg-transparent focus:outline-none min-h-[72px] px-2 py-0.5 text-sm leading-relaxed text-[var(--chat-foreground)] placeholder:text-sm"
                            value={input}
                            onChange={onInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Kirim percakapan..."
                            disabled={isLoading && false}
                            rows={3}
                            aria-label="Message input"
                        />
                    </div>

                    <div className="col-span-3 mt-0.5 flex items-center justify-between border-t border-[color:var(--chat-border)] pt-1">
                        {/* Attachment Button */}
                        <div className="flex-none">
                            <FileUploadButton
                                conversationId={conversationId}
                                onFileUploaded={onFileUploaded}
                            />
                        </div>

                        {isGenerating ? (
                            <button
                                type="button"
                                onClick={onStop}
                                className="w-9 h-9 flex items-center justify-center rounded-md hover-slash bg-transparent text-[var(--chat-muted-foreground)] hover:rounded-full hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] transition-all"
                                aria-label="Stop generating response"
                            >
                                <PauseSolid className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="w-9 h-9 flex items-center justify-center rounded-md hover-slash bg-transparent text-[var(--chat-muted-foreground)] hover:rounded-full hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Send message"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    )
}
