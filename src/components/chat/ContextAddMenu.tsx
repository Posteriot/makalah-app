"use client"

import { useRef, useState } from "react"
import { Plus } from "iconoir-react"
import { useMutation } from "convex/react"
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
 * is uploaded to Convex storage via the same pipeline the previous
 * FileUploadButton used (upload URL → storage → createFile record →
 * optional image data URL → extraction trigger for documents).
 *
 * Intentionally inlines the upload logic (no `useFileUpload` hook extraction)
 * since this is currently the single consumer — YAGNI.
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
        if (!input) return
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

        setIsUploading(true)
        try {
            const postUrl = await generateUploadUrl()

            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            })

            if (!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`)
            }

            const { storageId } = await result.json()

            const fileId = await createFile({
                storageId,
                name: file.name,
                type: file.type,
                size: file.size,
                conversationId: conversationId as Id<"conversations"> ?? undefined,
            })

            // For images: read as data URL for native multimodal handling
            if (file.type.startsWith("image/")) {
                const reader = new FileReader()
                reader.onload = () => {
                    onImageDataUrl?.(fileId, reader.result as string)
                }
                reader.readAsDataURL(file)
            }

            // Trigger text extraction only for document types (not images)
            if (!file.type.startsWith("image/")) {
                fetch("/api/extract-file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileId }),
                }).catch(() => {
                    // Graceful degradation: extraction failure shouldn't block upload
                })
            }

            onFileUploaded?.({
                fileId,
                name: file.name,
                size: file.size,
                type: file.type,
            })
        } catch {
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
                    className="w-48 font-mono"
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
