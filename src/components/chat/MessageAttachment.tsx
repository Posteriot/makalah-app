"use client"

import Image from "next/image"
import { Xmark } from "iconoir-react"
import { cn } from "@/lib/utils"
import { formatFileSize, splitFileName } from "@/lib/types/attached-file"

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
    size: number | null
    mimeType: string
    imageUrl?: string
    onRemove?: () => void
    className?: string
}

interface ExtensionStyle {
    bg: string
    text: string
    label: string
}

const EXTENSION_STYLES: Record<string, ExtensionStyle> = {
    pdf: { bg: "bg-red-500/15", text: "text-red-400", label: "PDF" },
    doc: { bg: "bg-blue-500/15", text: "text-blue-400", label: "DOC" },
    docx: { bg: "bg-blue-500/15", text: "text-blue-400", label: "DOC" },
    xls: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "XLS" },
    xlsx: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "XLS" },
    ppt: { bg: "bg-orange-500/15", text: "text-orange-400", label: "PPT" },
    pptx: { bg: "bg-orange-500/15", text: "text-orange-400", label: "PPT" },
    txt: { bg: "bg-zinc-500/15", text: "text-zinc-400", label: "TXT" },
}

function resolveExtensionStyle(name: string): ExtensionStyle {
    const { extension } = splitFileName(name)
    const key = extension.replace(/^\./, "").toLowerCase()
    if (key && EXTENSION_STYLES[key]) return EXTENSION_STYLES[key]

    // Generic fallback — show uppercase extension (max 4 chars) or "FILE"
    const fallbackLabel = key ? key.toUpperCase().slice(0, 4) : "FILE"
    return {
        bg: "bg-[color:var(--chat-muted)]",
        text: "text-[color:var(--chat-muted-foreground)]",
        label: fallbackLabel,
    }
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
    const sizeLabel = size !== null && size >= 0 ? formatFileSize(size) : null
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
