"use client"

import { useRef, useEffect } from "react"
import { SendIcon, SquareIcon, FileIcon } from "lucide-react"
import { FileUploadButton } from "./FileUploadButton"
import { Id } from "../../../convex/_generated/dataModel"

interface ChatInputProps {
    input: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    isLoading: boolean
    stop: () => void
    conversationId: string | null
    uploadedFileIds: Id<"files">[]
    onFileUploaded: (fileId: Id<"files">) => void
}

export function ChatInput({ input, onInputChange, onSubmit, isLoading, stop, conversationId, uploadedFileIds, onFileUploaded }: ChatInputProps) {
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

    const handleStop = (e: React.MouseEvent) => {
        e.preventDefault()
        stop()
    }

    return (
        <div className="p-3 md:p-4 border-t bg-background">
            {uploadedFileIds.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {uploadedFileIds.map((id) => (
                        <div key={id} className="flex items-center gap-2 bg-muted p-2 rounded text-xs text-muted-foreground whitespace-nowrap">
                            <FileIcon className="h-3 w-3" />
                            <span>File attached</span>
                        </div>
                    ))}
                </div>
            )}
            <form onSubmit={onSubmit} className="flex gap-2 items-end">
                <div className="flex-none pb-2">
                    <FileUploadButton
                        conversationId={conversationId}
                        onFileUploaded={onFileUploaded}
                    />
                </div>
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        className="w-full border rounded-md p-3 pr-10 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[50px] md:min-h-[60px] text-base md:text-sm"
                        value={input}
                        onChange={onInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ketik pertanyaan atau instruksi tentang paper Anda..."
                        disabled={isLoading && false}
                        rows={1}
                        aria-label="Message input"
                    />
                </div>

                {isLoading ? (
                    <button
                        type="button"
                        onClick={handleStop}
                        className="bg-destructive text-destructive-foreground p-3 rounded-md hover:bg-destructive/90 transition-colors h-[50px] w-[50px] flex items-center justify-center mb-[2px]"
                        title="Stop generating"
                        aria-label="Stop generating response"
                    >
                        <SquareIcon className="h-5 w-5 fill-current" />
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="bg-primary text-primary-foreground p-3 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[50px] w-[50px] flex items-center justify-center mb-[2px]"
                        aria-label="Send message"
                    >
                        <SendIcon className="h-5 w-5" />
                    </button>
                )}
            </form>
        </div>
    )
}
