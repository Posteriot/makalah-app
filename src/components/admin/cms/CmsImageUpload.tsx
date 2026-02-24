"use client"

import { useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Upload, MediaImage } from "iconoir-react"
import { toast } from "sonner"

type CmsImageUploadProps = {
  currentImageId?: Id<"_storage"> | null
  onUpload: (storageId: Id<"_storage">) => void
  userId: Id<"users">
  label?: string
  aspectRatio?: string
  fallbackPreviewUrl?: string
  // Custom Convex function references for different CMS contexts (e.g. blog)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateUploadUrlFn?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getImageUrlFn?: any
}

export function CmsImageUpload({
  currentImageId,
  onUpload,
  userId,
  label = "Gambar",
  aspectRatio = "16/9",
  fallbackPreviewUrl,
  generateUploadUrlFn,
  getImageUrlFn,
}: CmsImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(
    generateUploadUrlFn ?? api.pageContent.generateUploadUrl
  )

  const imageUrl = useQuery(
    getImageUrlFn ?? api.pageContent.getImageUrl,
    currentImageId ? { storageId: currentImageId } : "skip"
  )

  async function handleUpload(file: File) {
    setIsUploading(true)
    try {
      const uploadUrl = await generateUploadUrl({ requestorId: userId })
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!result.ok) {
        const errorBody = await result.text().catch(() => "")
        throw new Error(
          errorBody || `Upload gagal (${result.status} ${result.statusText})`
        )
      }

      const responseText = await result.text()
      if (!responseText) {
        throw new Error("Upload gagal: response kosong dari server.")
      }

      let payload: { storageId?: Id<"_storage"> }
      try {
        payload = JSON.parse(responseText) as { storageId?: Id<"_storage"> }
      } catch {
        throw new Error("Upload gagal: response server bukan JSON valid.")
      }

      const { storageId } = payload
      if (!storageId) {
        throw new Error("Upload gagal: storageId tidak ditemukan.")
      }

      onUpload(storageId)
    } catch (error) {
      console.error("CMS image upload failed:", error)
      toast.error(
        error instanceof Error ? error.message : "Upload gambar gagal."
      )
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  function triggerFileInput() {
    fileInputRef.current?.click()
  }

  const hasCmsImage = currentImageId && imageUrl
  const previewUrl = hasCmsImage ? imageUrl : fallbackPreviewUrl
  const isFallbackPreview = !hasCmsImage && !!fallbackPreviewUrl

  return (
    <div>
      {/* Label */}
      <span className="text-signal mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        /* Image preview with replace overlay */
        <div
          className="group relative overflow-hidden rounded-action"
          style={{ aspectRatio }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={label}
            className="h-full w-full object-contain"
          />

          {/* Fallback badge */}
          {isFallbackPreview && (
            <span className="absolute top-2 left-2 rounded-badge bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Default
            </span>
          )}

          {/* Upload overlay (visible on hover or during upload) */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
              isUploading
                ? "bg-background/70 opacity-100"
                : "bg-background/60 opacity-0 group-hover:opacity-100"
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                <span className="text-interface text-xs text-foreground">
                  Mengupload...
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={triggerFileInput}
                className="flex cursor-pointer items-center gap-2 rounded-action bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors duration-50 hover:bg-background"
              >
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-interface">
                  {isFallbackPreview ? "Upload Custom" : "Ganti Gambar"}
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty state */
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-action border-2 border-dashed border-border p-comfort transition-colors duration-150 hover:border-muted-foreground hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ aspectRatio }}
        >
          {isUploading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
              <span className="text-interface text-xs text-muted-foreground">
                Mengupload...
              </span>
            </>
          ) : (
            <>
              <MediaImage
                className="h-6 w-6 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="text-interface text-xs text-muted-foreground">
                Klik untuk upload gambar
              </span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
