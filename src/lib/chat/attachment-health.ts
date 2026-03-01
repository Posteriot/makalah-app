export type RequestedAttachmentMode = "explicit" | "inherit" | "none"
export type AttachmentHealthStatus = "healthy" | "degraded" | "failed" | "processing" | "unknown"

export interface AttachmentHealthInput {
  effectiveFileIdsLength: number
  docFileCount: number
  imageFileCount: number
  docExtractionSuccessCount: number
  docExtractionPendingCount: number
  docExtractionFailedCount: number
  docContextChars: number
}

export interface AttachmentHealthResult {
  healthStatus: AttachmentHealthStatus
  failureReason?: string
}

export function normalizeRequestedAttachmentMode(mode: unknown): RequestedAttachmentMode {
  if (mode === "explicit" || mode === "inherit") {
    return mode
  }
  return "none"
}

export function resolveAttachmentRuntimeEnv(env: {
  vercel?: string
  nodeEnv?: string
}): "local" | "vercel" | "unknown" {
  if (env.vercel === "1") return "vercel"
  if (env.nodeEnv && env.nodeEnv !== "production") return "local"
  return "unknown"
}

export function classifyAttachmentHealth(input: AttachmentHealthInput): AttachmentHealthResult {
  if (input.effectiveFileIdsLength === 0) {
    return { healthStatus: "unknown" }
  }

  const totalFileCount = input.docFileCount + input.imageFileCount
  if (totalFileCount === 0) {
    return { healthStatus: "unknown" }
  }

  // Image-only requests are considered healthy for file-level readiness,
  // because image payload is delivered natively via multimodal file parts.
  if (input.docFileCount === 0 && input.imageFileCount > 0) {
    return { healthStatus: "healthy" }
  }

  const hasSuccess = input.docExtractionSuccessCount > 0
  const hasPending = input.docExtractionPendingCount > 0
  const hasFailed = input.docExtractionFailedCount > 0

  if (hasPending && !hasSuccess && !hasFailed) {
    if (input.imageFileCount > 0) {
      return {
        healthStatus: "degraded",
        failureReason: "Dokumen masih diproses, gambar siap dipakai",
      }
    }
    return {
      healthStatus: "processing",
      failureReason: "Dokumen masih diproses extractor",
    }
  }

  if (!hasSuccess && (input.docExtractionFailedCount >= input.docFileCount || input.docContextChars <= 0)) {
    if (input.imageFileCount > 0) {
      return {
        healthStatus: "degraded",
        failureReason: "Dokumen gagal, tapi gambar masih tersedia",
      }
    }
    return {
      healthStatus: "failed",
      failureReason: "Tidak ada konteks dokumen yang berhasil diinjeksikan",
    }
  }

  if (hasSuccess && (hasPending || hasFailed)) {
    return {
      healthStatus: "degraded",
      failureReason: hasPending
        ? "Sebagian dokumen masih pending"
        : "Sebagian dokumen gagal diekstrak",
    }
  }

  if (hasSuccess && input.docContextChars > 0) {
    return { healthStatus: "healthy" }
  }

  return {
    healthStatus: "failed",
    failureReason: "Konteks dokumen kosong",
  }
}
