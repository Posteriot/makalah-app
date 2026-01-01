/**
 * Export Validation Helper
 *
 * Validasi session sebelum export ke Word/PDF.
 * Memastikan session sudah completed dan user memiliki ownership.
 */

import type { Doc, Id } from "@convex/_generated/dataModel"
import { compilePaperContent, type CompiledPaperContent, getMissingSections } from "./content-compiler"

/**
 * Error class untuk export validation failures.
 */
export class ExportValidationError extends Error {
  constructor(
    message: string,
    public code: "NOT_COMPLETED" | "NOT_OWNER" | "MISSING_CONTENT" | "SESSION_NOT_FOUND" | "ARCHIVED",
    public details?: string[]
  ) {
    super(message)
    this.name = "ExportValidationError"
  }
}

/**
 * Result dari validateSessionForExport.
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validasi session untuk export.
 * Check apakah session sudah completed.
 *
 * @param session - Paper session document
 * @returns ValidationResult
 */
export function validateSessionForExport(session: Doc<"paperSessions">): ValidationResult {
  const errors: string[] = []

  // Check if session is archived
  if (session.archivedAt) {
    errors.push("Session sudah diarsipkan")
  }

  // Check if session is completed
  if (session.currentStage !== "completed") {
    errors.push(`Session belum selesai. Stage saat ini: ${session.currentStage}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validasi ownership session.
 *
 * @param session - Paper session document
 * @param currentUserId - ID user yang sedang login
 * @returns true jika user adalah owner session
 */
export function validateOwnership(
  session: Doc<"paperSessions">,
  currentUserId: Id<"users">
): boolean {
  return session.userId === currentUserId
}

/**
 * Get exportable content dari session.
 * Throw ExportValidationError jika session belum valid untuk export.
 *
 * @param session - Paper session document (atau null jika tidak ditemukan)
 * @param currentUserId - ID user yang sedang login
 * @returns CompiledPaperContent
 * @throws ExportValidationError
 */
export function getExportableContent(
  session: Doc<"paperSessions"> | null,
  currentUserId: Id<"users">
): CompiledPaperContent {
  // Check session exists
  if (!session) {
    throw new ExportValidationError(
      "Session tidak ditemukan",
      "SESSION_NOT_FOUND"
    )
  }

  // Check ownership
  if (!validateOwnership(session, currentUserId)) {
    throw new ExportValidationError(
      "Anda tidak memiliki akses ke session ini",
      "NOT_OWNER"
    )
  }

  // Check archived status
  if (session.archivedAt) {
    throw new ExportValidationError(
      "Session sudah diarsipkan dan tidak bisa di-export",
      "ARCHIVED"
    )
  }

  // Check completion status
  if (session.currentStage !== "completed") {
    throw new ExportValidationError(
      `Paper belum selesai. Stage saat ini: ${session.currentStage}. Selesaikan semua 14 tahap untuk export.`,
      "NOT_COMPLETED"
    )
  }

  // Compile content
  const content = compilePaperContent(session)

  // Check for missing critical sections
  const missingSections = getMissingSections(content)
  if (missingSections.length > 0) {
    throw new ExportValidationError(
      `Beberapa section penting belum lengkap: ${missingSections.join(", ")}`,
      "MISSING_CONTENT",
      missingSections
    )
  }

  return content
}

/**
 * Safe version of getExportableContent yang tidak throw.
 * Return null jika ada error.
 *
 * @param session - Paper session document (atau null)
 * @param currentUserId - ID user yang sedang login
 * @returns CompiledPaperContent atau null dengan error message
 */
export function tryGetExportableContent(
  session: Doc<"paperSessions"> | null,
  currentUserId: Id<"users">
): { content: CompiledPaperContent; error: null } | { content: null; error: string } {
  try {
    const content = getExportableContent(session, currentUserId)
    return { content, error: null }
  } catch (err) {
    if (err instanceof ExportValidationError) {
      return { content: null, error: err.message }
    }
    return { content: null, error: "Terjadi kesalahan saat memvalidasi session" }
  }
}

/**
 * Check apakah session bisa di-export (quick check tanpa compile full content).
 *
 * @param session - Paper session document
 * @param currentUserId - ID user yang sedang login
 * @returns boolean
 */
export function canExport(
  session: Doc<"paperSessions"> | null,
  currentUserId: Id<"users">
): boolean {
  if (!session) return false
  if (!validateOwnership(session, currentUserId)) return false
  if (session.archivedAt) return false
  if (session.currentStage !== "completed") return false
  return true
}
