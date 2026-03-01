import { describe, expect, it } from "vitest"
import { resolveEffectiveFileIds } from "@/lib/chat/effective-file-ids"

describe("multi-file context merge regression", () => {
  it("merges second explicit attachment without dropping first", () => {
    const firstSend = resolveEffectiveFileIds({
      requestFileIds: ["file_a"],
      conversationContextFileIds: [],
    })

    const secondSend = resolveEffectiveFileIds({
      requestFileIds: ["file_b"],
      conversationContextFileIds: firstSend.effectiveFileIds,
    })

    expect(firstSend.effectiveFileIds).toEqual(["file_a"])
    expect(secondSend.effectiveFileIds).toEqual(["file_a", "file_b"])
    expect(secondSend.reason).toBe("explicit")
  })

  it("removes only one file when context list is replaced with remaining ids", () => {
    const result = resolveEffectiveFileIds({
      requestFileIds: ["file_a", "file_c"],
      conversationContextFileIds: ["file_a", "file_b", "file_c"],
      replaceAttachmentContext: true,
    })

    expect(result.effectiveFileIds).toEqual(["file_a", "file_c"])
    expect(result.shouldUpsertContext).toBe(true)
    expect(result.reason).toBe("explicit")
  })

  it("clear all resets all active files", () => {
    const result = resolveEffectiveFileIds({
      requestFileIds: ["file_a"],
      conversationContextFileIds: ["file_a", "file_b"],
      clearAttachmentContext: true,
    })

    expect(result.effectiveFileIds).toEqual([])
    expect(result.shouldClearContext).toBe(true)
    expect(result.reason).toBe("clear")
  })
})
