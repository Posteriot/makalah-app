"use client"

import { useRef, useState } from "react"
import { Plus } from "iconoir-react"
import { useMutation } from "convex/react"
import * as Sentry from "@sentry/nextjs"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { AttachedFileMeta } from "@/lib/types/attached-file"
import { cn } from "@/lib/utils"
import { FileTypeIcon, type FileTypeIconExtension } from "./FileTypeIcon"

/**
 * Context-add trigger: a single "+" icon button that opens an upward
 * dropdown menu listing the supported file types. Selecting a type opens
 * the native file chooser filtered to that extension, and the chosen file
 * is uploaded to Convex storage via:
 * `generateUploadUrl` → POST file body → `createFile` record → (image:
 * read as data URL for multimodal; document: trigger `/api/extract-file`
 * for text extraction).
 *
 * Intentionally inlines the upload logic (no `useFileUpload` hook extraction)
 * since this is currently the single consumer — YAGNI. When a second consumer
 * arrives, extract into `@/lib/upload/useFileUpload.ts`.
 */

interface ContextAddMenuProps {
    conversationId: string | null
    onFileUploaded?: (file: AttachedFileMeta) => void
    onImageDataUrl?: (fileId: Id<"files">, dataUrl: string) => void
    className?: string
}

interface TypeOption {
    id: FileTypeIconExtension
    label: string
    accept: string
}

const TYPE_OPTIONS: TypeOption[] = [
    { id: "pdf", label: "PDF", accept: ".pdf" },
    { id: "doc", label: "Word", accept: ".docx" },
    { id: "xls", label: "Spreadsheet", accept: ".xlsx" },
    { id: "ppt", label: "Presentasi", accept: ".pptx" },
    { id: "txt", label: "Teks", accept: ".txt" },
    { id: "img", label: "Gambar", accept: ".jpg,.jpeg,.png,.gif,.webp" },
]

const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () =>
            reject(reader.error ?? new Error("FileReader error"))
        reader.readAsDataURL(file)
    })
}

export function ContextAddMenu({
    conversationId,
    onFileUploaded,
    onImageDataUrl,
    className,
}: ContextAddMenuProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const generateUploadUrl = useMutation(api.files.generateUploadUrl)
    const createFile = useMutation(api.files.createFile)

    const handleSelectType = (accept: string) => {
        setMenuOpen(false)
        const input = fileInputRef.current
        if (!input) {
            Sentry.captureException(
                new Error("ContextAddMenu: file input ref missing"),
                { tags: { subsystem: "chat.upload" } }
            )
            return
        }
        input.accept = accept
        // Defer the click so the dropdown can finish its close transition
        // before the native file chooser takes focus.
        requestAnimationFrame(() => input.click())
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            toast.error("Tipe file tidak didukung. Gunakan PDF, DOCX, XLSX, PPTX, TXT, atau gambar.")
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            toast.error("File terlalu besar. Maksimal 10MB.")
            return
        }

        const isImage = file.type.startsWith("image/")

        setIsUploading(true)
        try {
            const postUrl = await generateUploadUrl()

            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            })

            if (!result.ok) {
                throw new Error(
                    `Upload POST failed: ${result.status} ${result.statusText}`
                )
            }

            // Guard the JSON parse + validate shape before passing storageId
            // downstream to createFile, so malformed storage responses surface
            // here instead of failing with a confusing Convex validator error.
            const payload = (await result.json()) as { storageId?: unknown }
            const storageId = payload?.storageId
            if (typeof storageId !== "string" || storageId.length === 0) {
                throw new Error("Upload response missing or invalid storageId")
            }

            // Treat both null and empty string as "no conversation" before
            // handing the id to Convex — the `as` cast alone lets an empty
            // string leak through the nullish coalescing and reach the
            // mutation validator.
            const resolvedConversationId: Id<"conversations"> | undefined =
                conversationId && conversationId.length > 0
                    ? (conversationId as Id<"conversations">)
                    : undefined

            const fileId = await createFile({
                storageId,
                name: file.name,
                type: file.type,
                size: file.size,
                conversationId: resolvedConversationId,
            })

            // For images: await the data URL read BEFORE firing onFileUploaded
            // so the parent never submits a message while the multimodal
            // payload is still resolving. A read failure is non-fatal — the
            // file is already in Convex storage, we just lose the inline
            // preview path and surface a toast.
            if (isImage && onImageDataUrl) {
                try {
                    const dataUrl = await readFileAsDataUrl(file)
                    onImageDataUrl(fileId, dataUrl)
                } catch (readError) {
                    Sentry.captureException(readError, {
                        tags: { subsystem: "chat.upload.imageRead" },
                        contexts: {
                            file: {
                                name: file.name,
                                type: file.type,
                                size: file.size,
                            },
                        },
                    })
                    toast.error(
                        "Gagal membaca gambar untuk preview. File tetap terunggah."
                    )
                }
            }

            // Images skip text extraction — they are passed to the model as a
            // multimodal data URL instead. Documents trigger a fire-and-forget
            // extraction POST; failures are logged but do not block upload.
            if (!isImage) {
                fetch("/api/extract-file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileId }),
                }).catch((extractError) => {
                    Sentry.captureException(extractError, {
                        tags: { subsystem: "chat.upload.extract" },
                        contexts: {
                            file: {
                                fileId,
                                name: file.name,
                                type: file.type,
                            },
                        },
                    })
                })
            }

            onFileUploaded?.({
                fileId,
                name: file.name,
                size: file.size,
                type: file.type,
            })
        } catch (error) {
            Sentry.captureException(error, {
                tags: { subsystem: "chat.upload" },
                contexts: {
                    file: {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        conversationId,
                    },
                },
            })
            toast.error("Upload gagal. Silakan coba lagi.")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
            />
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        disabled={isUploading}
                        title="Tambah konteks"
                        aria-label="Tambah konteks"
                        className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full text-[var(--chat-muted-foreground)] transition-colors hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)] disabled:opacity-50",
                            className
                        )}
                    >
                        {isUploading ? (
                            <span
                                className="h-5 w-5 rounded-full border-2 border-[color:var(--chat-muted-foreground)] border-t-transparent animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <Plus className="h-5 w-5" strokeWidth={2} />
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="top"
                    align="start"
                    sideOffset={8}
                    className="w-48 font-sans"
                >
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[var(--chat-muted-foreground)]">
                        Tambah konteks
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {TYPE_OPTIONS.map((option) => (
                        <DropdownMenuItem
                            key={option.id}
                            onSelect={() => handleSelectType(option.accept)}
                            className="gap-2 text-xs"
                        >
                            <FileTypeIcon
                                extension={option.id}
                                className="size-6 shrink-0 text-[var(--chat-muted-foreground)]"
                            />
                            <span className="text-[var(--chat-foreground)]">{option.label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
