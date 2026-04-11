"use client"

import Image from "next/image"
import { Xmark } from "iconoir-react"
import { cn } from "@/lib/utils"
import { formatFileSize } from "@/lib/types/attached-file"
import { resolveExtensionStyle, type ExtensionStyle } from "./attachmentExtensionStyles"

/**
 * Thumbnail-card attachment component used in chat bubbles and upload previews.
 *
 * - Image files: renders a 48x48 preview using the provided `imageUrl`.
 * - Non-image files: renders a colored extension label (PDF / DOC / XLS / PPT / TXT / generic).
 * - When `onRemove` is provided, renders a ghost X button at the right edge.
 *
 * Visual reference: AI SDK Elements `list` variant, adapted to our chat theme vars.
 */
export interface MessageAttachmentProps {
    name: string
    /**
     * File size in bytes. Must be non-negative when present. Omit when the
     * size is unknown (e.g. attachments synthesized from annotation-only
     * metadata that never recorded a byte count).
     */
    size?: number
    mimeType: string
    imageUrl?: string
    /**
     * Optional remove callback. Only set in mutable contexts (drafts, edit
     * mode, upload previews). Leave undefined for sent message bubbles where
     * attachments cannot be removed after submission.
     */
    onRemove?: () => void
    className?: string
}

interface ExtensionLabelProps {
    style: ExtensionStyle
}

function ExtensionLabel({ style }: ExtensionLabelProps) {
    return (
        <div
            className={cn(
                "flex size-full items-center justify-center rounded-action font-mono text-[11px] font-bold tracking-wide",
                style.bg,
                style.text
            )}
            aria-hidden="true"
        >
            {style.label}
        </div>
    )
}

export function MessageAttachment({
    name,
    size,
    mimeType,
    imageUrl,
    onRemove,
    className,
}: MessageAttachmentProps) {
    const isImage = !!imageUrl
    const extStyle = isImage ? null : resolveExtensionStyle(name)
    const sizeLabel =
        typeof size === "number" && size >= 0 ? formatFileSize(size) : null
    const subtitle = [mimeType || null, sizeLabel].filter(Boolean).join(" · ")

    return (
        <div
            className={cn(
                "flex w-full items-center gap-3 rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-card)] p-3 transition-colors",
                className
            )}
            title={name}
        >
            {/* Preview square */}
            <div className="size-12 shrink-0 overflow-hidden rounded-action">
                {isImage && imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={name}
                        width={48}
                        height={48}
                        className="size-full object-cover"
                        unoptimized
                    />
                ) : extStyle ? (
                    <ExtensionLabel style={extStyle} />
                ) : null}
            </div>

            {/* Info column */}
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--chat-foreground)]">
                    {name}
                </div>
                {subtitle && (
                    <div className="truncate font-mono text-[11px] text-[var(--chat-muted-foreground)]">
                        {subtitle}
                    </div>
                )}
            </div>

            {/* Remove button (only when onRemove provided) */}
            {onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="flex size-8 shrink-0 items-center justify-center rounded-action text-[var(--chat-muted-foreground)] transition-colors hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
                    aria-label={`Hapus ${name}`}
                >
                    <Xmark className="h-4 w-4" strokeWidth={2} />
                </button>
            )}
        </div>
    )
}
