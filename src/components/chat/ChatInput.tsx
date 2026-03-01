"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Send, Page, Expand, Xmark, MediaImage, Trash } from "iconoir-react"
import { Pause as PauseSolid } from "iconoir-react/solid"
import { FileUploadButton } from "./FileUploadButton"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { AttachedFileMeta, formatFileSize, isImageType, splitFileName } from "@/lib/types/attached-file"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ChatInputProps {
    input: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    isLoading: boolean
    isGenerating?: boolean
    onStop?: () => void
    conversationId: string | null
    attachedFiles: AttachedFileMeta[]
    contextFiles?: AttachedFileMeta[]
    onFileAttached: (file: AttachedFileMeta) => void
    onFileRemoved: (fileId: Id<"files">) => void
    onContextFileRemoved?: (fileId: Id<"files">) => void
    onImageDataUrl?: (fileId: Id<"files">, dataUrl: string) => void
    onClearAttachmentContext?: () => void
    hasActiveAttachmentContext?: boolean
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
    attachedFiles,
    contextFiles,
    onFileAttached,
    onFileRemoved,
    onContextFileRemoved,
    onImageDataUrl,
    onClearAttachmentContext,
    hasActiveAttachmentContext = false,
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

    const displayedContextFiles = contextFiles ?? attachedFiles

    // Shared context tray
    const renderContextTray = (containerClassName?: string) => {
        const hasContextFiles = displayedContextFiles.length > 0
        const canClearContext = hasContextFiles || hasActiveAttachmentContext

        return (
            <div className={cn("space-y-2", containerClassName)}>
                <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                        <FileUploadButton
                            conversationId={conversationId}
                            onFileUploaded={onFileAttached}
                            onImageDataUrl={onImageDataUrl}
                            ariaLabel="Upload file tambahan konteks"
                            tooltipText="Upload file tambahan konteks"
                            label="+ Konteks"
                        />
                        {hasContextFiles ? (
                            displayedContextFiles.map((file) => {
                                const { baseName, extension } = splitFileName(file.name)

                                return (
                                    <div
                                        key={file.fileId}
                                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-badge border border-[color:var(--chat-info)] bg-[var(--chat-accent)] py-1 pl-2.5 pr-1.5 text-xs font-mono text-[var(--chat-info)]"
                                        title={file.name}
                                    >
                                        {isImageType(file.type) ? (
                                            <MediaImage className="h-3 w-3 shrink-0" />
                                        ) : (
                                            <Page className="h-3 w-3 shrink-0" />
                                        )}
                                        <span className="inline-flex min-w-0 items-baseline">
                                            <span className="max-w-[120px] truncate">{baseName}</span>
                                            {extension && <span className="shrink-0">{extension}</span>}
                                        </span>
                                        <span className="shrink-0 text-[10px] opacity-60">{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onContextFileRemoved) {
                                                    onContextFileRemoved(file.fileId)
                                                    return
                                                }
                                                onFileRemoved(file.fileId)
                                            }}
                                            className="ml-0.5 rounded p-0.5 transition-colors hover:bg-[color:var(--chat-info)]/15"
                                            aria-label={`Hapus file konteks ${file.name}`}
                                        >
                                            <Xmark className="h-3 w-3" />
                                        </button>
                                    </div>
                                )
                            })
                        ) : null}
                    </div>
                    {onClearAttachmentContext && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="inline-flex">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!canClearContext) return
                                            onClearAttachmentContext()
                                        }}
                                        aria-disabled={!canClearContext}
                                        className={cn(
                                            "inline-flex h-8 w-8 items-center justify-center rounded-action border border-[color:var(--chat-border)] text-[var(--chat-muted-foreground)] transition-colors",
                                            canClearContext
                                                ? "hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)]"
                                                : "opacity-40 cursor-not-allowed"
                                        )}
                                        aria-label="Hapus semua"
                                    >
                                        <Trash className="h-4 w-4" />
                                    </button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent className="font-mono text-xs">Hapus semua</TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <div
                    className="h-px w-full bg-[color:var(--chat-border)]/80"
                    aria-hidden="true"
                />
            </div>
        )
    }

    // Shared send/stop button
    const renderSendButton = (size: "sm" | "md" = "md") => {
        const baseBtnClass = cn(
            "flex items-center justify-center rounded-action transition-colors duration-150",
            size === "sm" ? "w-8 h-8" : "w-9 h-9",
        )

        if (isGenerating) {
            return (
                <button
                    type="button"
                    onClick={onStop}
                    className={cn(
                        baseBtnClass,
                        "chat-pause-button group",
                        "relative border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] text-[var(--chat-foreground)] shadow-sm",
                        "transition-[color,background-color,border-color,box-shadow,transform] duration-150",
                        "hover:border-[color:var(--chat-info)] hover:bg-[var(--chat-info)] hover:text-[var(--chat-info-foreground)]",
                        "hover:shadow-[0_0_0_3px_color-mix(in_oklch,var(--chat-info)_28%,transparent)]",
                        "hover:-translate-y-px active:scale-95",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-info)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--chat-card)]"
                    )}
                    aria-label="Stop generating response"
                >
                    <span aria-hidden="true" className="chat-pause-hover-halo" />
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-[-3px] rounded-[10px] border border-[color:var(--chat-muted-foreground)]/60 animate-chat-pause-ring"
                    />
                    <PauseSolid className={cn("chat-pause-icon relative z-10 transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
                </button>
            )
        }

        return (
            <button
                type="submit"
                disabled={input.trim().length === 0 || isLoading}
                className={cn(
                    baseBtnClass,
                    "bg-transparent text-[var(--chat-muted-foreground)]",
                    "hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)]",
                    "active:bg-[var(--chat-accent)] active:text-[var(--chat-foreground)]",
                    "disabled:opacity-30 disabled:cursor-not-allowed"
                )}
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
                <form onSubmit={onSubmit} className="flex">
                    <div className="grid w-full grid-cols-[auto_1fr_auto] items-end gap-x-2 gap-y-1 rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)] px-3 py-1.5">
                        {renderContextTray("col-span-3 px-1 pt-1")}
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
                        <div className="col-span-3 mt-0.5 flex justify-end pt-1">
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
                <form onSubmit={handleMobileSubmit} className="flex">
                    <div
                        className={cn(
                            "w-full rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)] transition-all duration-150",
                        )}
                    >
                        {renderContextTray("px-2 pt-2")}
                        <div className="flex items-end gap-1 px-2 py-1.5">
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
                            {renderContextTray("mb-3")}
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
                        <div className="flex justify-end px-3 py-2 border-t border-[color:var(--chat-border)] shrink-0">
                            {renderSendButton("sm")}
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
