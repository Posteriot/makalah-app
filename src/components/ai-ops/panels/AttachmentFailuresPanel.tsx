"use client"

interface AttachmentFailureRecord {
  _id?: string
  requestId?: string
  conversationId?: string
  createdAt: number
  runtimeEnv: "local" | "vercel" | "unknown"
  requestedAttachmentMode: "explicit" | "inherit" | "none"
  resolutionReason: "clear" | "explicit" | "inherit" | "none"
  healthStatus: "healthy" | "degraded" | "failed" | "processing" | "unknown"
  failureReason?: string
  docFileCount: number
  imageFileCount: number
  docExtractionSuccessCount: number
  docExtractionPendingCount: number
  docExtractionFailedCount: number
  docContextChars: number
}

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "baru saja"
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

export function AttachmentFailuresPanel({
  data,
}: {
  data: AttachmentFailureRecord[] | undefined
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Kegagalan Attachment Terbaru
        </span>
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-[11px] font-mono text-muted-foreground">Belum ada kegagalan attachment.</p>
      ) : (
        <div className="space-y-2">
          {data.map((failure, index) => (
            <div key={failure._id ?? `${failure.requestId ?? "req"}-${failure.createdAt}-${index}`} className="rounded-[8px] border border-border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-foreground">
                <span>{failure.healthStatus.toUpperCase()}</span>
                <span className="text-muted-foreground">{failure.runtimeEnv}</span>
                <span className="text-muted-foreground">{formatRelativeTime(failure.createdAt)}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                {failure.failureReason ?? "Tanpa failureReason"}
              </div>
              <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                mode: {failure.requestedAttachmentMode} · reason: {failure.resolutionReason} · doc/img: {failure.docFileCount}/{failure.imageFileCount}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                extraction S/P/F: {failure.docExtractionSuccessCount}/{failure.docExtractionPendingCount}/{failure.docExtractionFailedCount} · context: {failure.docContextChars}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground truncate">
                request: {failure.requestId ?? "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
