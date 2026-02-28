export interface ResolveEffectiveFileIdsInput {
  requestFileIds?: string[] | null
  conversationContextFileIds?: string[] | null
  inheritAttachmentContext?: boolean
  clearAttachmentContext?: boolean
}

export interface ResolveEffectiveFileIdsResult {
  effectiveFileIds: string[]
  shouldUpsertContext: boolean
  shouldClearContext: boolean
  reason: "clear" | "explicit" | "inherit" | "none"
}

function dedupeFileIds(fileIds?: string[] | null): string[] {
  if (!Array.isArray(fileIds)) return []
  return Array.from(
    new Set(
      fileIds.filter((fileId): fileId is string => typeof fileId === "string" && fileId.length > 0)
    )
  )
}

export function resolveEffectiveFileIds(
  input: ResolveEffectiveFileIdsInput
): ResolveEffectiveFileIdsResult {
  const requestFileIds = dedupeFileIds(input.requestFileIds)
  const contextFileIds = dedupeFileIds(input.conversationContextFileIds)
  const clearAttachmentContext = input.clearAttachmentContext === true
  const inheritAttachmentContext = input.inheritAttachmentContext !== false

  if (clearAttachmentContext) {
    return {
      effectiveFileIds: [],
      shouldUpsertContext: false,
      shouldClearContext: true,
      reason: "clear",
    }
  }

  if (requestFileIds.length > 0) {
    return {
      effectiveFileIds: requestFileIds,
      shouldUpsertContext: true,
      shouldClearContext: false,
      reason: "explicit",
    }
  }

  if (inheritAttachmentContext) {
    return {
      effectiveFileIds: contextFileIds,
      shouldUpsertContext: false,
      shouldClearContext: false,
      reason: "inherit",
    }
  }

  return {
    effectiveFileIds: [],
    shouldUpsertContext: false,
    shouldClearContext: false,
    reason: "none",
  }
}
