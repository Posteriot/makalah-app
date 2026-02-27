"use client"

import { useRef, useState } from "react"
import { Attachment } from "iconoir-react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { AttachedFileMeta } from "@/lib/types/attached-file"

interface FileUploadButtonProps {
    conversationId: string | null
    onFileUploaded?: (file: AttachedFileMeta) => void
    onImageDataUrl?: (fileId: Id<"files">, dataUrl: string) => void
}

export function FileUploadButton({ conversationId, onFileUploaded, onImageDataUrl }: FileUploadButtonProps) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const generateUploadUrl = useMutation(api.files.generateUploadUrl)
    const createFile = useMutation(api.files.createFile)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // CHAT-038: Validation
        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
            "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
            "text/plain",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
        ]
        const maxSize = 10 * 1024 * 1024 // 10MB

        if (!allowedTypes.includes(file.type)) {
            toast.error("Tipe file tidak didukung. Gunakan PDF, DOCX, XLSX, PPTX, TXT, atau gambar.")
            return
        }

        if (file.size > maxSize) {
            toast.error("File terlalu besar. Maksimal 10MB.")
            return
        }

        setIsUploading(true)
        try {
            // CHAT-039: Upload to Convex
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

            // CHAT-039: Create file record
            const fileId = await createFile({
                storageId,
                name: file.name,
                type: file.type,
                size: file.size,
                conversationId: conversationId as Id<"conversations"> ?? undefined,
            })

            // For images: read as data URL for native multimodal
            if (file.type.startsWith("image/")) {
                const reader = new FileReader()
                reader.onload = () => {
                    onImageDataUrl?.(fileId, reader.result as string)
                }
                reader.readAsDataURL(file)
            }

            // Trigger extraction ONLY for documents (not images)
            if (!file.type.startsWith("image/")) {
                fetch('/api/extract-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId }),
                }).catch(() => {
                    // Graceful degradation
                })
            }

            if (onFileUploaded) {
                onFileUploaded({
                    fileId,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                })
            }

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
                accept=".pdf,.doc,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileSelect}
                disabled={isUploading}
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 rounded-action text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)] transition-colors disabled:opacity-50"
                        aria-label="Attach file"
                    >
                        {isUploading ? (
                            <span className="h-5 w-5 border-2 border-[color:var(--chat-muted-foreground)] border-t-transparent rounded-full animate-spin block" />
                        ) : (
                            <Attachment className="h-5 w-5" />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs">Attach file</TooltipContent>
            </Tooltip>
        </>
    )
}
