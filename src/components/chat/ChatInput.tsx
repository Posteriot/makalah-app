"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Send, Page, Expand, Xmark } from "iconoir-react"
import { Pause as PauseSolid } from "iconoir-react/solid"
import { FileUploadButton } from "./FileUploadButton"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

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

// Max heights: desktop 200px, mobile 6 lines (~144px)
const DESKTOP_MAX_HEIGHT = 200
const MOBILE_MAX_HEIGHT = 144

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
    const mobileTextareaRef = useRef<HTMLTextAreaElement>(null)
    const fullscreenTextareaRef = useRef<HTMLTextAreaElement>(null)
    const [isMobileFocused, setIsMobileFocused] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Desktop auto-resize (max 200px)
    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = "auto"
            textarea.style.height = `${Math.min(textarea.scrollHeight, DESKTOP_MAX_HEIGHT)}px`
        }
    }, [input])

    // Mobile auto-resize (max 144px / ~6 lines)
    useEffect(() => {
        const textarea = mobileTextareaRef.current
        if (textarea) {
            textarea.style.height = "auto"
            textarea.style.height = `${Math.min(textarea.scrollHeight, MOBILE_MAX_HEIGHT)}px`
        }
    }, [input])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            const form = e.currentTarget.form
            if (form) form.requestSubmit()
        }
    }

    // Mobile: determine if expanded (has text or focused)
    const isMobileExpanded = isMobileFocused || input.length > 0

    // Fullscreen open — focus textarea after mount
    const openFullscreen = useCallback(() => {
        setIsFullscreen(true)
        requestAnimationFrame(() => {
            fullscreenTextareaRef.current?.focus()
        })
    }, [])

    // Fullscreen close — return focus to mobile textarea
    const closeFullscreen = useCallback(() => {
        setIsFullscreen(false)
        requestAnimationFrame(() => {
            mobileTextareaRef.current?.focus()
        })
    }, [])

    // Handle submit and reset states
    const handleMobileSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        onSubmit(e)
        setIsFullscreen(false)
    }, [onSubmit])

    // Shared file attachment chips
    const renderFileChips = () => {
        if (uploadedFileIds.length === 0) return null
        return (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {uploadedFileIds.map((id) => (
                    <div key={id} className="flex items-center gap-2 bg-[var(--chat-muted)] p-2 rounded-badge text-xs font-mono text-[var(--chat-muted-foreground)] whitespace-nowrap">
                        <Page className="h-3 w-3" />
                        <span>File attached</span>
                    </div>
                ))}
            </div>
        )
    }

    // Shared send/stop button
    const renderSendButton = (size: "sm" | "md" = "md") => {
        const btnClass = cn(
            "flex items-center justify-center rounded-action bg-transparent transition-colors duration-150",
            "text-[var(--chat-muted-foreground)]",
            size === "sm" ? "w-8 h-8" : "w-9 h-9",
            // Desktop: hover, Mobile: active
            "hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)]",
            "active:bg-[var(--chat-accent)] active:text-[var(--chat-foreground)]"
        )

        if (isGenerating) {
            return (
                <button
                    type="button"
                    onClick={onStop}
                    className={btnClass}
                    aria-label="Stop generating response"
                >
                    <PauseSolid className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
                </button>
            )
        }

        return (
            <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(btnClass, "disabled:opacity-30 disabled:cursor-not-allowed")}
                aria-label="Send message"
            >
                <Send className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
            </button>
        )
    }

    return (
        <>
            {/* ═══════════════════════════════════════════════
                DESKTOP (≥ md) — unchanged from original
               ═══════════════════════════════════════════════ */}
            <div className="hidden md:block py-4 bg-transparent" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
                {renderFileChips()}
                <form onSubmit={onSubmit} className="flex">
                    <div className="grid w-full grid-cols-[auto_1fr_auto] items-end gap-x-2 gap-y-1 rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)] px-3 py-1.5">
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
                        <div className="col-span-3 mt-0.5 flex items-center justify-between pt-1">
                            <div className="flex-none">
                                <FileUploadButton
                                    conversationId={conversationId}
                                    onFileUploaded={onFileUploaded}
                                />
                            </div>
                            {renderSendButton()}
                        </div>
                    </div>
                </form>
            </div>

            {/* ═══════════════════════════════════════════════
                MOBILE (< md) — 3-state: collapsed → expanded → fullscreen

                State 1 & 2 use INLINE layout (flex items-end):
                  📎 | textarea/placeholder | ⛶ ▶
                Buttons are never in a separate row below — they stay
                inline so iOS keyboard can never clip them.
               ═══════════════════════════════════════════════ */}
            <div className="md:hidden shrink-0 px-3 py-2 bg-transparent">
                {renderFileChips()}
                <form onSubmit={handleMobileSubmit} className="flex">
                    <div
                        className={cn(
                            "flex w-full items-end gap-1 rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)]",
                            "px-2 py-1.5 transition-all duration-150"
                        )}
                    >
                        {/* Left: Attach */}
                        <div className="shrink-0 self-end">
                            <FileUploadButton
                                conversationId={conversationId}
                                onFileUploaded={onFileUploaded}
                            />
                        </div>

                        {/* Center: Textarea or placeholder */}
                        {!isMobileExpanded ? (
                            <div
                                className="flex-1 flex items-center min-h-[32px] cursor-text"
                                onClick={() => {
                                    setIsMobileFocused(true)
                                    requestAnimationFrame(() => mobileTextareaRef.current?.focus())
                                }}
                            >
                                <span className="text-sm text-[var(--chat-muted-foreground)] select-none">
                                    Kirim percakapan...
                                </span>
                            </div>
                        ) : (
                            <textarea
                                ref={mobileTextareaRef}
                                className="flex-1 min-w-0 resize-none bg-transparent focus:outline-none text-sm leading-relaxed text-[var(--chat-foreground)] placeholder:text-sm placeholder:text-[var(--chat-muted-foreground)] py-1"
                                value={input}
                                onChange={onInputChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsMobileFocused(true)}
                                onBlur={() => {
                                    if (!input.trim()) {
                                        setIsMobileFocused(false)
                                    }
                                }}
                                placeholder="Kirim percakapan..."
                                rows={1}
                                aria-label="Message input"
                            />
                        )}

                        {/* Right: Expand (only when expanded) + Send/Stop */}
                        <div className="shrink-0 self-end flex items-center gap-0.5">
                            {isMobileExpanded && (
                                <button
                                    type="button"
                                    onClick={openFullscreen}
                                    className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-action",
                                        "text-[var(--chat-muted-foreground)]",
                                        "active:bg-[var(--chat-accent)] active:text-[var(--chat-foreground)]",
                                        "transition-colors duration-150"
                                    )}
                                    aria-label="Expand to fullscreen"
                                >
                                    <Expand className="h-4 w-4" />
                                </button>
                            )}
                            {renderSendButton("sm")}
                        </div>
                    </div>
                </form>
            </div>

            {/* ═══════════════════════════════════════════════
                MOBILE FULLSCREEN (State 3) — fixed overlay
               ═══════════════════════════════════════════════ */}
            {isFullscreen && (
                <div
                    className="md:hidden fixed inset-0 z-50 flex flex-col bg-[var(--chat-background)]"
                    data-chat-scope=""
                >
                    {/* Header */}
                    <div className="flex items-center h-12 px-3 border-b border-[color:var(--chat-border)] shrink-0">
                        <button
                            type="button"
                            onClick={closeFullscreen}
                            className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-action",
                                "text-[var(--chat-muted-foreground)]",
                                "active:bg-[var(--chat-accent)] active:text-[var(--chat-foreground)]",
                                "transition-colors duration-150"
                            )}
                            aria-label="Close fullscreen"
                        >
                            <Xmark className="h-5 w-5" />
                        </button>
                        <span className="ml-2 text-sm font-sans font-medium text-[var(--chat-foreground)]">
                            Tulis pesan
                        </span>
                    </div>

                    {/* Textarea fills remaining space */}
                    <form onSubmit={handleMobileSubmit} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 px-4 py-3 overflow-y-auto">
                            {renderFileChips()}
                            <textarea
                                ref={fullscreenTextareaRef}
                                className="w-full h-full resize-none bg-transparent focus:outline-none text-sm leading-relaxed text-[var(--chat-foreground)] placeholder:text-sm placeholder:text-[var(--chat-muted-foreground)]"
                                value={input}
                                onChange={onInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Kirim percakapan..."
                                aria-label="Message input (fullscreen)"
                            />
                        </div>

                        {/* Footer toolbar */}
                        <div className="flex items-center justify-between px-3 py-2 border-t border-[color:var(--chat-border)] shrink-0">
                            <FileUploadButton
                                conversationId={conversationId}
                                onFileUploaded={onFileUploaded}
                            />
                            {renderSendButton("sm")}
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
