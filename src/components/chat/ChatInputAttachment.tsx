"use client"

import { Page, MediaImage, Xmark } from "iconoir-react"
import { cn } from "@/lib/utils"
import { isImageType, splitFileName } from "@/lib/types/attached-file"
import { resolveExtensionStyle } from "./attachmentExtensionStyles"

/**
 * Upload-preview attachment card used above the chat input (inline next to
 * the ContextAddMenu trigger).
 *
 * Layout:
 * - Colored rounded square on the left containing a document / image icon,
 *   using the extension color palette shared with MessageAttachment.
 * - Two-line info column: filename (bold, truncated) above a short file-type
 *   label (e.g. "PDF", "DOC", "XLS", "PPT", "TXT", "Image", or the generic
 *   uppercase extension fallback).
 * - Floating ghost X button in the top-right corner of the card for remove.
 *
 * Intentionally distinct from `MessageAttachment` (which uses text-in-square
 * and a verbose MIME subtitle) — the two are used in different contexts
 * (upload preview vs sent message bubble).
 */

export interface ChatInputAttachmentProps {
    name: string
    mimeType: string
    onRemove: () => void
    className?: string
}

function resolveTypeLabel(name: string, mimeType: string): string {
    if (isImageType(mimeType)) {
        const { extension } = splitFileName(name)
        const ext = extension.replace(/^\./, "").toLowerCase()
        return ext ? ext.toUpperCase() : "Image"
    }
    return resolveExtensionStyle(name).label
}

export function ChatInputAttachment({
    name,
    mimeType,
    onRemove,
    className,
}: ChatInputAttachmentProps) {
    const isImage = isImageType(mimeType)
    const extStyle = resolveExtensionStyle(name)
    const typeLabel = resolveTypeLabel(name, mimeType)

    // Image files get a neutral square + MediaImage icon. Non-image files get
    // the extension color palette + Page icon.
    const squareBg = isImage ? "bg-[color:var(--chat-muted)]" : extStyle.bg
    const squareIconColor = isImage
        ? "text-[color:var(--chat-muted-foreground)]"
        : extStyle.text
    const SquareIcon = isImage ? MediaImage : Page

    return (
        <div
            className={cn(
                "relative inline-flex max-w-[260px] min-w-0 items-center gap-2 rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-card)] py-2 pl-2 pr-6",
                className
            )}
            title={name}
        >
            <div
                className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-action",
                    squareBg
                )}
                aria-hidden="true"
            >
                <SquareIcon
                    className={cn("h-4 w-4", squareIconColor)}
                    strokeWidth={2}
                />
            </div>

            <div className="flex min-w-0 flex-col">
                <div className="truncate text-[13px] font-medium text-[var(--chat-foreground)]">
                    {name}
                </div>
                <div className="truncate text-[11px] text-[var(--chat-muted-foreground)]">
                    {typeLabel}
                </div>
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                }}
                className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)] transition-colors hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
                aria-label={`Hapus ${name}`}
            >
                <Xmark className="h-3 w-3" strokeWidth={2.5} />
            </button>
        </div>
    )
}
