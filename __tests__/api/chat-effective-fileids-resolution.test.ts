import { describe, expect, it } from "vitest"
import { resolveEffectiveFileIds } from "@/lib/chat/effective-file-ids"

describe("chat effective fileIds resolution", () => {
  it("merges explicit request fileIds with active context by default", () => {
    const result = resolveEffectiveFileIds({
      requestFileIds: ["file_a", "file_b"],
      conversationContextFileIds: ["ctx_1"],
      inheritAttachmentContext: true,
    })

    expect(result.effectiveFileIds).toEqual(["ctx_1", "file_a", "file_b"])
    expect(result.shouldUpsertContext).toBe(true)
    expect(result.shouldClearContext).toBe(false)
    expect(result.reason).toBe("explicit")
  })

  it("uses replaceAttachmentContext=true to replace active context", () => {
    const result = resolveEffectiveFileIds({
      requestFileIds: ["file_new_only"],
      conversationContextFileIds: ["ctx_1", "ctx_2"],
      replaceAttachmentContext: true,
      inheritAttachmentContext: true,
    })

    expect(result.effectiveFileIds).toEqual(["file_new_only"])
    expect(result.shouldUpsertContext).toBe(true)
    expect(result.shouldClearContext).toBe(false)
    expect(result.reason).toBe("explicit")
  })

  it("dedupes files when merge contains existing ids", () => {
    const result = resolveEffectiveFileIds({
      requestFileIds: ["ctx_1", "file_a"],
      conversationContextFileIds: ["ctx_1", "ctx_2"],
      inheritAttachmentContext: true,
    })

    expect(result.effectiveFileIds).toEqual(["ctx_1", "ctx_2", "file_a"])
  })

  it("falls back to active conversation context when request fileIds is empty", () => {
    const result = resolveEffectiveFileIds({
      requestFileIds: [],
      conversationContextFileIds: ["ctx_1", "ctx_2"],
      inheritAttachmentContext: true,
    })

    expect(result.effectiveFileIds).toEqual(["ctx_1", "ctx_2"])
    expect(result.shouldUpsertContext).toBe(false)
    expect(result.shouldClearContext).toBe(false)
    expect(result.reason).toBe("inherit")
  })

  it("clears effective context when clearAttachmentContext is true", () => {
    const result = resolveEffectiveFileIds({
      requestFileIds: ["file_a"],
      conversationContextFileIds: ["ctx_1"],
      inheritAttachmentContext: true,
      clearAttachmentContext: true,
    })

    expect(result.effectiveFileIds).toEqual([])
    expect(result.shouldUpsertContext).toBe(false)
    expect(result.shouldClearContext).toBe(true)
    expect(result.reason).toBe("clear")
  })
})
