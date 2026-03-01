import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { requireAuthUserId, requireConversationOwner } from "./authHelpers"

function assertNonNegativeNumber(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${name}: expected non-negative number`)
  }
}

export const logAttachmentTelemetry = mutation({
  args: {
    requestId: v.string(),
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    runtimeEnv: v.union(v.literal("local"), v.literal("vercel"), v.literal("unknown")),
    requestedAttachmentMode: v.union(
      v.literal("explicit"),
      v.literal("inherit"),
      v.literal("none")
    ),
    resolutionReason: v.union(
      v.literal("clear"),
      v.literal("explicit"),
      v.literal("inherit"),
      v.literal("none")
    ),
    requestFileIdsLength: v.number(),
    effectiveFileIdsLength: v.number(),
    replaceAttachmentContext: v.boolean(),
    clearAttachmentContext: v.boolean(),
    docFileCount: v.number(),
    imageFileCount: v.number(),
    docExtractionSuccessCount: v.number(),
    docExtractionPendingCount: v.number(),
    docExtractionFailedCount: v.number(),
    docContextChars: v.number(),
    attachmentFirstResponseForced: v.boolean(),
    healthStatus: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("failed"),
      v.literal("processing"),
      v.literal("unknown")
    ),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    await requireConversationOwner(ctx, args.conversationId)

    assertNonNegativeNumber("requestFileIdsLength", args.requestFileIdsLength)
    assertNonNegativeNumber("effectiveFileIdsLength", args.effectiveFileIdsLength)
    assertNonNegativeNumber("docFileCount", args.docFileCount)
    assertNonNegativeNumber("imageFileCount", args.imageFileCount)
    assertNonNegativeNumber("docExtractionSuccessCount", args.docExtractionSuccessCount)
    assertNonNegativeNumber("docExtractionPendingCount", args.docExtractionPendingCount)
    assertNonNegativeNumber("docExtractionFailedCount", args.docExtractionFailedCount)
    assertNonNegativeNumber("docContextChars", args.docContextChars)

    const docExtractionTotal =
      args.docExtractionSuccessCount +
      args.docExtractionPendingCount +
      args.docExtractionFailedCount

    if (docExtractionTotal > args.docFileCount) {
      throw new Error("Invalid extraction counts: total extraction status exceeds document count")
    }

    if (args.requestId.trim().length === 0) {
      throw new Error("Invalid requestId: cannot be empty")
    }

    const normalizedFailureReason = args.failureReason?.trim()

    return await ctx.db.insert("attachmentTelemetry", {
      ...args,
      failureReason: normalizedFailureReason && normalizedFailureReason.length > 0
        ? normalizedFailureReason
        : undefined,
      createdAt: Date.now(),
    })
  },
})
