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

const MAX_INPUT_LENGTH = 8000
const DESKTOP_MIN_HEIGHT = 32
const DESKTOP_MAX_HEIGHT = 120
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
    const [mobileTextareaHeight, setMobileTextareaHeight] = useState(0)

    const handleBoundedInputChange = useCallback((
        event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        const nextValue = event.target.value.slice(0, MAX_INPUT_LENGTH)
        if (nextValue === event.target.value) {
            onInputChange(event)
            return
        }

        const patchedEvent = {
            ...event,
            target: {
                ...event.target,
                value: nextValue,
            },
            currentTarget: {
                ...event.currentTarget,
                value: nextValue,
            },
        } as React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>

        onInputChange(patchedEvent)
    }, [onInputChange])

    // Desktop auto-resize (1 line -> max 5 lines)
    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = "auto"
            const nextHeight = Math.max(
                DESKTOP_MIN_HEIGHT,
                Math.min(textarea.scrollHeight, DESKTOP_MAX_HEIGHT)
            )
            textarea.style.height = `${nextHeight}px`
        }
    }, [input])

    // Mobile auto-resize (max 144px / ~6 lines)
    useEffect(() => {
        const textarea = mobileTextareaRef.current
        if (textarea) {
            textarea.style.height = "auto"
            const nextHeight = Math.min(textarea.scrollHeight, MOBILE_MAX_HEIGHT)
            textarea.style.height = `${nextHeight}px`
            setMobileTextareaHeight(nextHeight)
        } else {
            setMobileTextareaHeight(0)
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
    const hasContextFiles = displayedContextFiles.length > 0
    const canClearContext = hasContextFiles || hasActiveAttachmentContext
    const isMobileStackedLayout = canClearContext || mobileTextareaHeight > 44

    const thinScrollbarClassName = cn(
        "scrollbar-thin [scrollbar-width:thin]",
        "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--chat-border)]/70",
        "[&::-webkit-scrollbar-thumb:hover]:bg-[color:var(--chat-border)]"
    )

    const renderContextFileChips = () => {
        if (!hasContextFiles) return null

        return displayedContextFiles.map((file) => {
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
    }

    const renderClearContextButton = ({
        hideWhenDisabled = false,
    }: {
        hideWhenDisabled?: boolean
    } = {}) => {
        if (!onClearAttachmentContext) return null
        if (hideWhenDisabled && !canClearContext) return null

        return (
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
        )
    }

    // Shared context tray
    const renderContextTray = (
        variant: "desktop" | "mobile" | "fullscreen",
        containerClassName?: string
    ) => {
        const isDesktop = variant === "desktop"
        const itemsContainerClassName = isDesktop
            ? cn(
                "min-w-0 flex-1 overflow-x-auto whitespace-nowrap",
                thinScrollbarClassName
            )
            : "min-w-0 flex-1 flex flex-wrap items-center gap-2"

        return (
            <div
                data-testid={isDesktop ? "desktop-context-strip" : undefined}
                className={cn(
                    isDesktop ? "space-y-0" : "space-y-2",
                    containerClassName
                )}
            >
                <div className={cn("flex gap-2", isDesktop ? "items-center" : "items-start")}>
                    <div
                        data-testid={isDesktop ? "desktop-context-scroll" : undefined}
                        className={itemsContainerClassName}
                    >
                        <div className={cn("flex items-center gap-2", isDesktop && "w-max")}>
                        <FileUploadButton
                            conversationId={conversationId}
                            onFileUploaded={onFileAttached}
                            onImageDataUrl={onImageDataUrl}
                            ariaLabel="Upload file tambahan konteks"
                            tooltipText="Upload file tambahan konteks"
                            label="+ Konteks"
                        />
                            {renderContextFileChips()}
                        </div>
                    </div>
                    {renderClearContextButton()}
                </div>
                <div
                    data-testid={isDesktop ? "desktop-context-separator" : undefined}
                    className={cn(
                        "h-px w-full bg-[color:var(--chat-border)]/80",
                        isDesktop && "mt-1.5"
                    )}
                    aria-hidden="true"
                />
            </div>
        )
    }

    // Shared send/stop button
    const renderSendButton = (size: "sm" | "md" = "md") => {
        const baseBtnClass = cn(
            "flex items-center justify-center rounded-action transition-colors duration-150",
            size === "sm" ? "h-8 w-8" : "h-[34px] w-[34px]",
        )

        if (isGenerating) {
            return (
                <button
                    type="button"
                    onClick={onStop}
                    className={cn(
                        baseBtnClass,
                        "chat-pause-button group",
                        "relative border text-[var(--chat-info)] shadow-sm",
                        "border-[color:color-mix(in_oklch,var(--chat-info)_38%,var(--chat-border))]",
                        "bg-[color:color-mix(in_oklch,var(--chat-info)_14%,var(--chat-card))]",
                        "transition-[color,background-color,border-color,transform] duration-150",
                        "hover:border-[color:var(--chat-info)] hover:bg-[var(--chat-info)] hover:text-[var(--chat-info-foreground)]",
                        "hover:-translate-y-px active:scale-95",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-info)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--chat-card)]"
                    )}
                    aria-label="Stop generating response"
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-[-1px] rounded-[9px] border border-[color:color-mix(in_oklch,var(--chat-info)_52%,transparent)]/80 animate-chat-pause-ring"
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
                    <div className="flex w-full flex-col rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)] px-3 py-2">
                        {renderContextTray("desktop", "px-1 pb-1")}
                        <div
                            data-testid="desktop-input-row"
                            className="flex items-end gap-2 px-1 pt-1 pb-1"
                        >
                            <textarea
                                data-testid="desktop-chat-input-textarea"
                                ref={textareaRef}
                                className={cn(
                                    "w-full resize-none bg-transparent focus:outline-none",
                                    "pl-0 pr-2 py-2 text-sm leading-5 text-[var(--chat-foreground)] placeholder:text-sm placeholder:text-[var(--chat-muted-foreground)]",
                                    "max-h-[120px] overflow-y-auto",
                                    thinScrollbarClassName
                                )}
                                value={input}
                                onChange={handleBoundedInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Kirim percakapan..."
                                disabled={isLoading && false}
                                rows={1}
                                aria-label="Message input"
                            />
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
                        data-testid="mobile-chat-input-shell"
                        className={cn(
                            "w-full rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)] transition-all duration-150",
                        )}
                    >
                        {isMobileStackedLayout ? (
                            <div data-testid="mobile-chat-input-stacked">
                                <div className="flex items-start gap-2 px-2 pt-2">
                                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                                        <FileUploadButton
                                            conversationId={conversationId}
                                            onFileUploaded={onFileAttached}
                                            onImageDataUrl={onImageDataUrl}
                                            ariaLabel="Upload file tambahan konteks"
                                            tooltipText="Upload file tambahan konteks"
                                            label="+ Konteks"
                                        />
                                        {renderContextFileChips()}
                                    </div>
                                    {renderClearContextButton({ hideWhenDisabled: true })}
                                </div>
                                <div className="px-2 pt-2">
                                    <div className="h-px w-full bg-[color:var(--chat-border)]/80" aria-hidden="true" />
                                </div>
                                <div className="flex items-end gap-1 px-2 py-1.5">
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
                                            onChange={handleBoundedInputChange}
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
                        ) : (
                            <div data-testid="mobile-chat-input-compact" className="flex items-end gap-1.5 px-2 py-1.5">
                                <div className="shrink-0 py-0.5">
                                    <FileUploadButton
                                        conversationId={conversationId}
                                        onFileUploaded={onFileAttached}
                                        onImageDataUrl={onImageDataUrl}
                                        ariaLabel="Upload file tambahan konteks"
                                        tooltipText="Upload file tambahan konteks"
                                        label="+ Konteks"
                                    />
                                </div>
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
                                        onChange={handleBoundedInputChange}
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
                        )}
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
                            {renderContextTray("fullscreen", "mb-3")}
                            <textarea
                                ref={fullscreenTextareaRef}
                                className="w-full h-full resize-none bg-transparent focus:outline-none text-sm leading-relaxed text-[var(--chat-foreground)] placeholder:text-sm placeholder:text-[var(--chat-muted-foreground)]"
                                value={input}
                                onChange={handleBoundedInputChange}
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
