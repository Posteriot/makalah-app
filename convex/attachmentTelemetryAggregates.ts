export type AttachmentHealthStatus = "healthy" | "degraded" | "failed" | "processing" | "unknown"
export type AttachmentRuntimeEnv = "local" | "vercel" | "unknown"

export interface AttachmentTelemetryAggregateRecord {
  _id?: string
  requestId?: string
  conversationId?: string
  createdAt: number
  runtimeEnv: AttachmentRuntimeEnv
  requestedAttachmentMode: "explicit" | "inherit" | "none"
  resolutionReason: "clear" | "explicit" | "inherit" | "none"
  healthStatus: AttachmentHealthStatus
  failureReason?: string
  docFileCount: number
  imageFileCount: number
  docExtractionSuccessCount: number
  docExtractionPendingCount: number
  docExtractionFailedCount: number
  docContextChars: number
}

export function summarizeAttachmentHealth(records: AttachmentTelemetryAggregateRecord[]) {
  const totalRequests = records.length
  const fileRequestCount = records.filter(
    (record) => record.docFileCount + record.imageFileCount > 0
  ).length
  let healthyCount = 0
  let degradedCount = 0
  let failedCount = 0
  let processingCount = 0
  let unknownCount = 0
  let totalDocContextChars = 0
  let totalDocFiles = 0
  let totalImageFiles = 0

  const envBreakdown: Record<AttachmentRuntimeEnv, number> = {
    local: 0,
    vercel: 0,
    unknown: 0,
  }

  for (const record of records) {
    totalDocContextChars += record.docContextChars
    totalDocFiles += record.docFileCount
    totalImageFiles += record.imageFileCount
    envBreakdown[record.runtimeEnv] += 1

    switch (record.healthStatus) {
      case "healthy":
        healthyCount += 1
        break
      case "degraded":
        degradedCount += 1
        break
      case "failed":
        failedCount += 1
        break
      case "processing":
        processingCount += 1
        break
      default:
        unknownCount += 1
    }
  }

  const denominator = fileRequestCount > 0 ? fileRequestCount : 1

  return {
    totalRequests,
    fileRequestCount,
    healthyCount,
    degradedCount,
    failedCount,
    processingCount,
    unknownCount,
    healthyRate: healthyCount / denominator,
    failedRate: failedCount / denominator,
    processingRate: processingCount / denominator,
    avgDocContextChars: totalRequests > 0 ? Math.round(totalDocContextChars / totalRequests) : 0,
    totalDocFiles,
    totalImageFiles,
    envBreakdown,
  }
}

export function summarizeAttachmentFormat(records: AttachmentTelemetryAggregateRecord[]) {
  let totalDocFiles = 0
  let totalImageFiles = 0
  let requestsWithDocs = 0
  let requestsWithImages = 0

  for (const record of records) {
    totalDocFiles += record.docFileCount
    totalImageFiles += record.imageFileCount
    if (record.docFileCount > 0) requestsWithDocs += 1
    if (record.imageFileCount > 0) requestsWithImages += 1
  }

  return {
    totalRequests: records.length,
    totalDocFiles,
    totalImageFiles,
    requestsWithDocs,
    requestsWithImages,
  }
}

export function summarizeAttachmentEnv(records: AttachmentTelemetryAggregateRecord[]) {
  const counts: Record<AttachmentRuntimeEnv, number> = {
    local: 0,
    vercel: 0,
    unknown: 0,
  }

  for (const record of records) {
    counts[record.runtimeEnv] += 1
  }

  return {
    totalRequests: records.length,
    ...counts,
  }
}

export function pickRecentAttachmentFailures(
  records: AttachmentTelemetryAggregateRecord[],
  limit: number
) {
  const safeLimit = Math.max(1, Math.min(limit, 100))

  return records
    .filter((record) => record.healthStatus === "failed" || record.healthStatus === "degraded")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, safeLimit)
}
