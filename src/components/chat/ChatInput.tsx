"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Send, Expand, Xmark, Trash } from "iconoir-react"
import { Pause as PauseSolid } from "iconoir-react/solid"
import { ContextAddMenu } from "./ContextAddMenu"
import { ChatInputAttachment } from "./ChatInputAttachment"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { AttachedFileMeta } from "@/lib/types/attached-file"
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
        }
    }, [input])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            const form = e.currentTarget.form
            if (form) form.requestSubmit()
        }
    }

    const showMobileFullscreenButton = isMobileFocused || input.length > 0

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

    const thinScrollbarClassName = cn(
        "scrollbar-thin [scrollbar-width:thin]",
        "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--chat-border)]/70",
        "[&::-webkit-scrollbar-thumb:hover]:bg-[color:var(--chat-border)]"
    )

    const renderContextFileChips = () => {
        if (!hasContextFiles) return null

        return displayedContextFiles.map((file) => (
            <ChatInputAttachment
                key={file.fileId}
                name={file.name}
                mimeType={file.type}
                onRemove={() => {
                    if (onContextFileRemoved) {
                        onContextFileRemoved(file.fileId)
                        return
                    }
                    onFileRemoved(file.fileId)
                }}
            />
        ))
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
                                "flex h-9 w-9 items-center justify-center rounded-full text-[var(--chat-muted-foreground)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]",
                                canClearContext
                                    ? "hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)]"
                                    : "opacity-40 cursor-not-allowed"
                            )}
                            aria-label="Hapus semua"
                        >
                            <Trash className="h-5 w-5" strokeWidth={2} />
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
                            <ContextAddMenu
                                conversationId={conversationId}
                                onFileUploaded={onFileAttached}
                                onImageDataUrl={onImageDataUrl}
                            />
                            {renderContextFileChips()}
                        </div>
                    </div>
                    {renderClearContextButton()}
                </div>
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
                    <div className="flex w-full flex-col rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-muted)] px-3 py-2">
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
                MOBILE (< md) — stable 2-row composer matching desktop
               ═══════════════════════════════════════════════ */}
            <div
                data-testid="mobile-chat-input-wrapper"
                className="md:hidden shrink-0 bg-transparent px-3 pt-2 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
            >
                <form onSubmit={handleMobileSubmit} className="flex">
                    <div
                        data-testid="mobile-chat-input-shell"
                        className={cn(
                            "w-full rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-muted)] transition-colors duration-150",
                        )}
                    >
                        <div data-testid="mobile-chat-input-stacked">
                            <div className="flex items-start gap-2 px-2 pt-2">
                                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                                    <ContextAddMenu
                                        conversationId={conversationId}
                                        onFileUploaded={onFileAttached}
                                        onImageDataUrl={onImageDataUrl}
                                    />
                                    {renderContextFileChips()}
                                </div>
                                {renderClearContextButton({ hideWhenDisabled: true })}
                            </div>
                            <div
                                data-testid="mobile-chat-input-row"
                                className="flex min-h-[40px] items-end gap-1 px-2 py-1"
                            >
                                <textarea
                                    ref={mobileTextareaRef}
                                    className={cn(
                                        "flex-1 min-w-0 min-h-[28px] max-h-[144px] resize-none bg-transparent py-1",
                                        "text-sm leading-relaxed text-[var(--chat-foreground)] placeholder:text-sm placeholder:text-[var(--chat-muted-foreground)]",
                                        "overflow-y-auto focus:outline-none",
                                        thinScrollbarClassName
                                    )}
                                    value={input}
                                    onChange={handleBoundedInputChange}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setIsMobileFocused(true)}
                                    onBlur={() => setIsMobileFocused(false)}
                                    placeholder="Kirim percakapan..."
                                    rows={1}
                                    aria-label="Message input"
                                />
                                <div className="shrink-0 self-end flex items-center gap-0.5">
                                    {showMobileFullscreenButton && (
                                        <button
                                            type="button"
                                            onClick={openFullscreen}
                                            className={cn(
                                                "flex h-8 w-8 items-center justify-center rounded-action",
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
                    style={{
                        paddingTop: "env(safe-area-inset-top, 0px)",
                        paddingBottom: "env(safe-area-inset-bottom, 0px)",
                    }}
                >
                    {/* Header */}
                    <div className="flex h-12 shrink-0 items-center border-b border-[color:var(--chat-border)] px-3">
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
                        <div className="flex-1 overflow-y-auto px-4 py-3">
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
                        <div className="flex shrink-0 justify-end border-t border-[color:var(--chat-border)] px-3 py-2">
                            {renderSendButton("sm")}
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
