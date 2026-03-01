import { describe, expect, it } from "vitest"

import { classifyAttachmentHealth } from "@/lib/chat/attachment-health"
import { summarizeAttachmentHealth } from "../../convex/attachmentTelemetryAggregates"

describe("classifyAttachmentHealth", () => {
  it("returns unknown when no effective attachments", () => {
    const result = classifyAttachmentHealth({
      effectiveFileIdsLength: 0,
      docFileCount: 0,
      imageFileCount: 0,
      docExtractionSuccessCount: 0,
      docExtractionPendingCount: 0,
      docExtractionFailedCount: 0,
      docContextChars: 0,
    })

    expect(result.healthStatus).toBe("unknown")
  })

  it("returns processing for pending-only document extraction", () => {
    const result = classifyAttachmentHealth({
      effectiveFileIdsLength: 1,
      docFileCount: 1,
      imageFileCount: 0,
      docExtractionSuccessCount: 0,
      docExtractionPendingCount: 1,
      docExtractionFailedCount: 0,
      docContextChars: 0,
    })

    expect(result.healthStatus).toBe("processing")
  })

  it("returns failed when all document extraction fails", () => {
    const result = classifyAttachmentHealth({
      effectiveFileIdsLength: 1,
      docFileCount: 1,
      imageFileCount: 0,
      docExtractionSuccessCount: 0,
      docExtractionPendingCount: 0,
      docExtractionFailedCount: 1,
      docContextChars: 0,
    })

    expect(result.healthStatus).toBe("failed")
  })

  it("returns degraded when success mixed with pending/failed", () => {
    const result = classifyAttachmentHealth({
      effectiveFileIdsLength: 2,
      docFileCount: 2,
      imageFileCount: 0,
      docExtractionSuccessCount: 1,
      docExtractionPendingCount: 1,
      docExtractionFailedCount: 0,
      docContextChars: 1200,
    })

    expect(result.healthStatus).toBe("degraded")
  })

  it("returns healthy when extraction success yields context", () => {
    const result = classifyAttachmentHealth({
      effectiveFileIdsLength: 1,
      docFileCount: 1,
      imageFileCount: 0,
      docExtractionSuccessCount: 1,
      docExtractionPendingCount: 0,
      docExtractionFailedCount: 0,
      docContextChars: 3000,
    })

    expect(result.healthStatus).toBe("healthy")
  })

  it("returns healthy for image-only file requests", () => {
    const result = classifyAttachmentHealth({
      effectiveFileIdsLength: 1,
      docFileCount: 0,
      imageFileCount: 1,
      docExtractionSuccessCount: 0,
      docExtractionPendingCount: 0,
      docExtractionFailedCount: 0,
      docContextChars: 0,
    })

    expect(result.healthStatus).toBe("healthy")
  })
})

describe("summarizeAttachmentHealth", () => {
  it("aggregates counts, rates, and environment breakdown", () => {
    const result = summarizeAttachmentHealth([
      {
        createdAt: 1,
        runtimeEnv: "local",
        requestedAttachmentMode: "explicit",
        resolutionReason: "explicit",
        healthStatus: "healthy",
        docFileCount: 1,
        imageFileCount: 0,
        docExtractionSuccessCount: 1,
        docExtractionPendingCount: 0,
        docExtractionFailedCount: 0,
        docContextChars: 1000,
      },
      {
        createdAt: 2,
        runtimeEnv: "vercel",
        requestedAttachmentMode: "inherit",
        resolutionReason: "inherit",
        healthStatus: "failed",
        docFileCount: 1,
        imageFileCount: 0,
        docExtractionSuccessCount: 0,
        docExtractionPendingCount: 0,
        docExtractionFailedCount: 1,
        docContextChars: 0,
      },
      {
        createdAt: 3,
        runtimeEnv: "vercel",
        requestedAttachmentMode: "none",
        resolutionReason: "none",
        healthStatus: "processing",
        docFileCount: 0,
        imageFileCount: 1,
        docExtractionSuccessCount: 0,
        docExtractionPendingCount: 0,
        docExtractionFailedCount: 0,
        docContextChars: 0,
      },
    ])

    expect(result.totalRequests).toBe(3)
    expect(result.fileRequestCount).toBe(3)
    expect(result.healthyCount).toBe(1)
    expect(result.failedCount).toBe(1)
    expect(result.processingCount).toBe(1)
    expect(result.healthyRate).toBeCloseTo(1 / 3)
    expect(result.avgDocContextChars).toBe(333)
    expect(result.envBreakdown).toEqual({ local: 1, vercel: 2, unknown: 0 })
  })
})
