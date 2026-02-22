"use client"

type FailoverTimelineProps = {
  failoverCount: number
  failoverCauses: { cause: string; count: number }[]
  failoverAllSuccess: boolean
  failoverTimeline: { createdAt: number; errorType: string }[]
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  timeout: "Waktu habis",
  rate_limit: "Batas laju",
  auth: "Autentikasi",
  network: "Jaringan",
  server_error: "Server",
  api_error: "API",
  unknown: "Tidak diketahui",
}

function translateErrorType(errorType: string): string {
  return ERROR_TYPE_LABELS[errorType] ?? errorType
}

export function FailoverTimeline({
  failoverCount,
  failoverCauses,
  failoverAllSuccess,
  failoverTimeline,
}: FailoverTimelineProps) {
  if (failoverCount === 0) {
    return (
      <div>
        <p className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
          PERPINDAHAN SERVER
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Tidak ada perpindahan server
        </p>
        <p className="mt-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
          Server utama stabil selama 7 hari
        </p>
      </div>
    )
  }

  // Compute dot positions across 7 days
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const totalRange = now - sevenDaysAgo

  return (
    <div>
      <p className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
        PERPINDAHAN SERVER
      </p>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold text-foreground">
          {failoverCount}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          kali dalam 7 hari
        </span>
      </div>

      {/* Dot timeline */}
      <div className="mt-3 rounded-action border border-border bg-muted/50 px-3 py-2">
        <div className="relative h-4">
          {failoverTimeline.map((event, i) => {
            const offset = ((event.createdAt - sevenDaysAgo) / totalRange) * 100
            const clampedOffset = Math.max(1, Math.min(99, offset))
            return (
              <div
                key={i}
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500"
                style={{ left: `${clampedOffset}%` }}
                title={translateErrorType(event.errorType ?? "unknown")}
              />
            )
          })}
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[9px] text-muted-foreground">7 hari lalu</span>
          <span className="font-mono text-[9px] text-muted-foreground">hari ini</span>
        </div>
      </div>

      {/* Causes */}
      {failoverCauses.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {failoverCauses.map((cause) => (
            <div
              key={cause.cause}
              className="flex items-center justify-between font-mono text-[11px]"
            >
              <span className="text-muted-foreground">
                {translateErrorType(cause.cause)}
              </span>
              <span className="text-foreground">{cause.count}x</span>
            </div>
          ))}
        </div>
      )}

      {/* Status */}
      <p className="mt-2.5 font-mono text-[11px]">
        {failoverAllSuccess ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            Server cadangan: semua berhasil ✓
          </span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400">
            Server cadangan: ada yang gagal ⚠
          </span>
        )}
      </p>
    </div>
  )
}
