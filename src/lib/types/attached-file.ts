import { Id } from "../../../convex/_generated/dataModel"

export interface AttachedFileMeta {
  fileId: Id<"files">
  name: string
  size: number
  type: string // MIME type
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}
