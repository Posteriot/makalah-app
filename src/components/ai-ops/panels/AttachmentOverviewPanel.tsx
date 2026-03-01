"use client"

interface AttachmentHealthOverviewData {
  totalRequests: number
  fileRequestCount: number
  healthyCount: number
  degradedCount: number
  failedCount: number
  processingCount: number
  unknownCount: number
  healthyRate: number
  failedRate: number
  processingRate: number
  avgDocContextChars: number
  totalDocFiles: number
  totalImageFiles: number
  envBreakdown: {
    local: number
    vercel: number
    unknown: number
  }
}

interface AttachmentFormatBreakdownData {
  totalRequests: number
  totalDocFiles: number
  totalImageFiles: number
  requestsWithDocs: number
  requestsWithImages: number
}

interface AttachmentEnvBreakdownData {
  totalRequests: number
  local: number
  vercel: number
  unknown: number
}

export function AttachmentOverviewPanel({
  overview,
  formatBreakdown,
  envBreakdown,
}: {
  overview: AttachmentHealthOverviewData | undefined
  formatBreakdown: AttachmentFormatBreakdownData | undefined
  envBreakdown: AttachmentEnvBreakdownData | undefined
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Ringkasan Health
            </span>
          </div>

          {!overview ? (
            <div className="h-24 rounded bg-muted animate-pulse" />
          ) : (
            <div className="space-y-2 text-xs font-mono text-foreground">
              <div>Total Request: {overview.totalRequests.toLocaleString("id-ID")}</div>
              <div>Request Ber-File: {overview.fileRequestCount.toLocaleString("id-ID")}</div>
              <div>Healthy (File-Only): {(overview.healthyRate * 100).toFixed(1)}%</div>
              <div>Failed (File-Only): {(overview.failedRate * 100).toFixed(1)}%</div>
              <div>Processing (File-Only): {(overview.processingRate * 100).toFixed(1)}%</div>
              <div className="pt-1 text-[11px] text-muted-foreground">
                H={overview.healthyCount} · D={overview.degradedCount} · F={overview.failedCount} · P={overview.processingCount} · U={overview.unknownCount}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Distribusi Format
            </span>
          </div>

          {!formatBreakdown ? (
            <div className="h-24 rounded bg-muted animate-pulse" />
          ) : (
            <div className="space-y-2 text-xs font-mono text-foreground">
              <div>Total File Dokumen: {formatBreakdown.totalDocFiles.toLocaleString("id-ID")}</div>
              <div>Total File Gambar: {formatBreakdown.totalImageFiles.toLocaleString("id-ID")}</div>
              <div>Request Dengan Dokumen: {formatBreakdown.requestsWithDocs.toLocaleString("id-ID")}</div>
              <div>Request Dengan Gambar: {formatBreakdown.requestsWithImages.toLocaleString("id-ID")}</div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
        <div className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Distribusi Environment
          </span>
        </div>

        {!envBreakdown ? (
          <div className="h-16 rounded bg-muted animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 gap-2 text-xs font-mono text-foreground md:grid-cols-3">
            <div>Local: {envBreakdown.local.toLocaleString("id-ID")}</div>
            <div>Vercel: {envBreakdown.vercel.toLocaleString("id-ID")}</div>
            <div>Unknown: {envBreakdown.unknown.toLocaleString("id-ID")}</div>
          </div>
        )}
      </div>
    </div>
  )
}
