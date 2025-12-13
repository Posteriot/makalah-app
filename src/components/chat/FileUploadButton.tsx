"use client"

import { useRef, useState } from "react"
import { PaperclipIcon, Loader2 } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

interface FileUploadButtonProps {
    conversationId: string | null
    onFileUploaded?: (fileId: Id<"files">) => void
}

export function FileUploadButton({ conversationId, onFileUploaded }: FileUploadButtonProps) {
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
            "text/plain",
            "image/jpeg",
            "image/png",
            "image/gif"
        ]
        const maxSize = 10 * 1024 * 1024 // 10MB

        if (!allowedTypes.includes(file.type)) {
            alert("Invalid file type. Please upload PDF, DOC, DOCX, TXT, or Image.") // Fallback prompt
            return
        }

        if (file.size > maxSize) {
            alert("File too large. Max size is 10MB.")
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

            if (onFileUploaded) {
                onFileUploaded(fileId)
            }

            alert("File uploaded successfully!")

        } catch (error) {
            console.error("File upload failed:", error)
            alert("Upload failed. Please try again.")
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
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                onChange={handleFileSelect}
                disabled={isUploading}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title="Attach file"
            >
                {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <PaperclipIcon className="h-5 w-5" />
                )}
            </button>
        </>
    )
}
