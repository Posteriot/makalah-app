"use client"

import { useRef, useEffect } from "react"
import { SendIcon, SquareIcon, FileIcon } from "lucide-react"
import { FileUploadButton } from "./FileUploadButton"
import { Id } from "../../../convex/_generated/dataModel"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

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
        <div className="py-4 px-5 border-t bg-chat-input">
            {uploadedFileIds.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {uploadedFileIds.map((id) => (
                        <div key={id} className="flex items-center gap-2 bg-muted p-2 rounded text-xs text-muted-foreground whitespace-nowrap">
                            <FileIcon className="h-3 w-3" />
                            <span>File attached</span>
                        </div>
                    ))}
                </div>
            )}
            <form onSubmit={onSubmit} className="flex gap-3 items-start">
                {/* Attachment Button */}
                <div className="flex-none pt-3">
                    <FileUploadButton
                        conversationId={conversationId}
                        onFileUploaded={onFileUploaded}
                    />
                </div>

                {/* Input Field */}
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        className="w-full border border-border rounded-lg p-3 resize-none bg-background focus:outline-none focus:border-primary min-h-[88px] text-sm leading-relaxed"
                        value={input}
                        onChange={onInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ketik pertanyaan atau instruksi tentang paper Anda..."
                        disabled={isLoading && false}
                        rows={3}
                        aria-label="Message input"
                    />
                </div>

                {/* Send/Stop Button - Transparent style matching mockup */}
                {isLoading ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={handleStop}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-3"
                                aria-label="Stop generating response"
                            >
                                <SquareIcon className="h-5 w-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Stop generating</TooltipContent>
                    </Tooltip>
                ) : (
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                        aria-label="Send message"
                    >
                        <SendIcon className="h-5 w-5" />
                    </button>
                )}
            </form>
        </div>
    )
}
