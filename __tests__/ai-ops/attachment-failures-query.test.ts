import { describe, expect, it } from "vitest"

import {
  pickRecentAttachmentFailures,
  summarizeAttachmentEnv,
  summarizeAttachmentFormat,
} from "../../convex/attachmentTelemetryAggregates"

describe("pickRecentAttachmentFailures", () => {
  it("filters failed/degraded, sorts by newest, and applies limit", () => {
    const result = pickRecentAttachmentFailures(
      [
        {
          _id: "a",
          requestId: "req-a",
          createdAt: 100,
          runtimeEnv: "local",
          requestedAttachmentMode: "explicit",
          resolutionReason: "explicit",
          healthStatus: "healthy",
          docFileCount: 1,
          imageFileCount: 0,
          docExtractionSuccessCount: 1,
          docExtractionPendingCount: 0,
          docExtractionFailedCount: 0,
          docContextChars: 1200,
        },
        {
          _id: "b",
          requestId: "req-b",
          createdAt: 200,
          runtimeEnv: "vercel",
          requestedAttachmentMode: "inherit",
          resolutionReason: "inherit",
          healthStatus: "failed",
          failureReason: "parse failed",
          docFileCount: 1,
          imageFileCount: 0,
          docExtractionSuccessCount: 0,
          docExtractionPendingCount: 0,
          docExtractionFailedCount: 1,
          docContextChars: 0,
        },
        {
          _id: "c",
          requestId: "req-c",
          createdAt: 300,
          runtimeEnv: "vercel",
          requestedAttachmentMode: "explicit",
          resolutionReason: "explicit",
          healthStatus: "degraded",
          failureReason: "partial pending",
          docFileCount: 2,
          imageFileCount: 0,
          docExtractionSuccessCount: 1,
          docExtractionPendingCount: 1,
          docExtractionFailedCount: 0,
          docContextChars: 500,
        },
      ],
      1
    )

    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe("c")
    expect(result[0].healthStatus).toBe("degraded")
  })
})

describe("attachment breakdown helpers", () => {
  it("summarizes format and environment counts", () => {
    const records = [
      {
        createdAt: 1,
        runtimeEnv: "local" as const,
        requestedAttachmentMode: "explicit" as const,
        resolutionReason: "explicit" as const,
        healthStatus: "healthy" as const,
        docFileCount: 2,
        imageFileCount: 0,
        docExtractionSuccessCount: 2,
        docExtractionPendingCount: 0,
        docExtractionFailedCount: 0,
        docContextChars: 1200,
      },
      {
        createdAt: 2,
        runtimeEnv: "vercel" as const,
        requestedAttachmentMode: "inherit" as const,
        resolutionReason: "inherit" as const,
        healthStatus: "failed" as const,
        docFileCount: 0,
        imageFileCount: 1,
        docExtractionSuccessCount: 0,
        docExtractionPendingCount: 0,
        docExtractionFailedCount: 0,
        docContextChars: 0,
      },
    ]

    expect(summarizeAttachmentFormat(records)).toEqual({
      totalRequests: 2,
      totalDocFiles: 2,
      totalImageFiles: 1,
      requestsWithDocs: 1,
      requestsWithImages: 1,
    })

    expect(summarizeAttachmentEnv(records)).toEqual({
      totalRequests: 2,
      local: 1,
      vercel: 1,
      unknown: 0,
    })
  })
})
