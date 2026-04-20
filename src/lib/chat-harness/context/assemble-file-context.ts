import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import type { ConvexFetchQuery, ConvexFetchMutation } from "../types"
import { retryDelay, retryMutation } from "@/lib/convex/retry"
import {
    classifyAttachmentHealth,
    resolveAttachmentRuntimeEnv,
    type RequestedAttachmentMode,
} from "@/lib/chat/attachment-health"

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────

const MAX_FILE_CONTEXT_CHARS_PER_FILE = 80000
const MAX_FILE_CONTEXT_CHARS_TOTAL = 240000

// ────────────────────────────────────────────────────────────────
// Result type
// ────────────────────────────────────────────────────────────────

export interface AssembleFileContextResult {
    fileContext: string
    docFileCount: number
    imageFileCount: number
    docExtractionSuccessCount: number
    docExtractionPendingCount: number
    docExtractionFailedCount: number
    docContextChars: number
    omittedFileNames: string[]
}

// ────────────────────────────────────────────────────────────────
// Main function
// ────────────────────────────────────────────────────────────────

export async function assembleFileContext(params: {
    effectiveFileIds: Id<"files">[]
    isPaperMode: boolean
    conversationId: Id<"conversations">
    userId: Id<"users">
    requestId: string
    fetchQueryWithToken: ConvexFetchQuery
    fetchMutationWithToken: ConvexFetchMutation
    // Telemetry params
    hasAttachmentSignal: boolean
    requestedAttachmentModeNormalized: RequestedAttachmentMode
    attachmentResolutionReason: "clear" | "explicit" | "inherit" | "none"
    requestFileIdsLength: number
    replaceAttachmentContext: boolean
    clearAttachmentContext: boolean
    isFirstTurnWithAttachment: boolean
}): Promise<AssembleFileContextResult> {
    const {
        effectiveFileIds,
        isPaperMode,
        conversationId,
        userId,
        requestId,
        fetchQueryWithToken,
        fetchMutationWithToken,
        hasAttachmentSignal,
        requestedAttachmentModeNormalized,
        attachmentResolutionReason,
        requestFileIdsLength,
        replaceAttachmentContext,
        clearAttachmentContext,
        isFirstTurnWithAttachment,
    } = params

    let fileContext = ""
    let docFileCount = 0
    let imageFileCount = 0
    let docExtractionSuccessCount = 0
    let docExtractionPendingCount = 0
    let docExtractionFailedCount = 0
    let docContextChars = 0
    const omittedFileNames: string[] = []

    if (effectiveFileIds.length > 0) {
        let files = await fetchQueryWithToken(api.files.getFilesByIds, {
            userId,
            fileIds: effectiveFileIds,
        })

        // Wait for pending extractions (max 8 seconds, poll every 500ms)
        const hasPending = files.some(
            (f: { extractionStatus?: string }) => !f.extractionStatus || f.extractionStatus === "pending"
        )
        if (hasPending) {
            for (let attempt = 0; attempt < 16; attempt++) {
                await retryDelay(500)
                files = await fetchQueryWithToken(api.files.getFilesByIds, {
                    userId,
                    fileIds: effectiveFileIds,
                })
                const stillPending = files.some(
                    (f: { extractionStatus?: string }) => !f.extractionStatus || f.extractionStatus === "pending"
                )
                if (!stillPending) break
            }
        }

        const isPaperModeForFiles = isPaperMode
        let totalCharsUsed = 0

        // Format file context based on extraction status
        for (const file of files) {
            const isImageFile = file.type?.startsWith("image/")
            if (isImageFile) {
                imageFileCount += 1
                continue
            }

            docFileCount += 1

            // Check if we've exceeded total limit (paper mode only)
            // 2026-04-10: Changed from break to continue + omitted tracking so the model
            // knows additional files exist beyond the budget and can fetch them via tools
            if (isPaperModeForFiles && totalCharsUsed >= MAX_FILE_CONTEXT_CHARS_TOTAL) {
                omittedFileNames.push(file.name)
                continue
            }

            fileContext += `[File: ${file.name}]\n`

            if (!file.extractionStatus || file.extractionStatus === "pending") {
                // Extraction didn't complete within timeout
                docExtractionPendingCount += 1
                fileContext += "⏳ File sedang diproses. Coba kirim ulang pesan dalam beberapa detik.\n\n"
            } else if (file.extractionStatus === "success" && file.extractedText) {
                // Task 6.2-6.3: Extract and format text
                // Task 2.3.1: Apply per-file limit in paper mode
                // 2026-04-10: Added truncation marker so the model knows when content is partial
                const originalLength = file.extractedText.length
                let textToAdd = file.extractedText
                let wasTruncated = false

                if (isPaperModeForFiles && textToAdd.length > MAX_FILE_CONTEXT_CHARS_PER_FILE) {
                    textToAdd = textToAdd.slice(0, MAX_FILE_CONTEXT_CHARS_PER_FILE)
                    wasTruncated = true
                }

                // Check remaining total budget
                if (isPaperModeForFiles) {
                    const remainingBudget = MAX_FILE_CONTEXT_CHARS_TOTAL - totalCharsUsed
                    if (textToAdd.length > remainingBudget) {
                        textToAdd = textToAdd.slice(0, remainingBudget)
                        wasTruncated = true
                    }
                    totalCharsUsed += textToAdd.length
                }

                docExtractionSuccessCount += 1
                docContextChars += textToAdd.length
                fileContext += textToAdd
                if (wasTruncated) {
                    fileContext += `\n\n⚠️ File truncated at ${textToAdd.length} chars (original: ${originalLength} chars). Full content accessible via quoteFromSource or searchAcrossSources tools.\n\n`
                } else {
                    fileContext += "\n\n"
                }
            } else if (file.extractionStatus === "failed") {
                // Task 6.6: Handle failed state
                docExtractionFailedCount += 1
                const errorMsg = file.extractionError || "Unknown error"
                fileContext += `❌ File gagal diproses: ${errorMsg}\n\n`
            } else {
                docExtractionFailedCount += 1
            }
        }

        // 2026-04-10: Emit omitted-files notice so the model knows additional files exist
        if (omittedFileNames.length > 0) {
            fileContext += `\n⚠️ Additional file(s) omitted from File Context due to total budget limit: ${omittedFileNames.join(", ")}. Full content accessible via quoteFromSource or searchAcrossSources tools when user asks about them.\n\n`
        }
    }

    // Attachment health telemetry (fire-and-forget)
    if (hasAttachmentSignal) {
        const health = classifyAttachmentHealth({
            effectiveFileIdsLength: effectiveFileIds.length,
            docFileCount,
            imageFileCount,
            docExtractionSuccessCount,
            docExtractionPendingCount,
            docExtractionFailedCount,
            docContextChars,
        })
        const runtimeEnv = resolveAttachmentRuntimeEnv({
            vercel: process.env.VERCEL,
            nodeEnv: process.env.NODE_ENV,
        })

        void retryMutation(
            () =>
                fetchMutationWithToken(api.attachmentTelemetry.logAttachmentTelemetry, {
                    requestId,
                    userId,
                    conversationId,
                    runtimeEnv,
                    requestedAttachmentMode: requestedAttachmentModeNormalized,
                    resolutionReason: attachmentResolutionReason,
                    requestFileIdsLength,
                    effectiveFileIdsLength: effectiveFileIds.length,
                    replaceAttachmentContext,
                    clearAttachmentContext,
                    docFileCount,
                    imageFileCount,
                    docExtractionSuccessCount,
                    docExtractionPendingCount,
                    docExtractionFailedCount,
                    docContextChars,
                    // Field name kept for telemetry schema compatibility. Semantic updated 2026-04-10:
                    // previously meant "forced first-response review instruction fired",
                    // now means "first-turn attachment acknowledgment directive fired".
                    attachmentFirstResponseForced: isFirstTurnWithAttachment,
                    healthStatus: health.healthStatus,
                    failureReason: health.failureReason,
                }),
            "attachmentTelemetry.logAttachmentTelemetry"
        ).catch((telemetryError) => {
            console.warn("[ATTACH-TELEMETRY] Failed to record attachment telemetry", telemetryError)
        })
    }

    return {
        fileContext,
        docFileCount,
        imageFileCount,
        docExtractionSuccessCount,
        docExtractionPendingCount,
        docExtractionFailedCount,
        docContextChars,
        omittedFileNames,
    }
}
