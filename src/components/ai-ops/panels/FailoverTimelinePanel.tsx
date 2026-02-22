"use client"

interface FailoverRecord {
  _id: string
  provider: string
  model: string
  errorType?: string
  errorMessage?: string
  success: boolean
  createdAt: number
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "baru saja"
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

export function FailoverTimelinePanel({
  data,
}: {
  data: FailoverRecord[] | undefined
}) {
  if (!data) {
    return (
      <div className="rounded-shell border border-border bg-card/90 p-5 dark:bg-slate-900/90">
        <div className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Timeline Perpindahan Server
          </span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-8 rounded-action bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Aggregate error causes
  const causeCounts = new Map<string, number>()
  for (const record of data) {
    const cause = record.errorType ?? "unknown"
    causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1)
  }
  const topCauses = Array.from(causeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="rounded-shell border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Timeline Perpindahan Server
        </span>
      </div>

      {data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground font-mono">
          Tidak ada perpindahan server.
        </p>
      ) : (
        <>
          {/* Count */}
          <div className="mb-4">
            <span className="text-lg font-mono font-bold text-amber-500">
              {data.length}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono ml-1.5">
              perpindahan dalam periode
            </span>
          </div>

          {/* Dot timeline */}
          <div className="flex items-center gap-1 mb-4 flex-wrap">
            {data.map((record) => (
              <div
                key={record._id}
                title={`${record.provider} — ${record.errorType ?? "unknown"} — ${timeAgo(record.createdAt)}`}
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  record.success ? "bg-amber-500" : "bg-rose-500"
                }`}
              />
            ))}
          </div>

          {/* Top error causes */}
          {topCauses.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                Penyebab Utama
              </span>
              <div className="space-y-1.5">
                {topCauses.map(([cause, count]) => (
                  <div
                    key={cause}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-muted-foreground">
                      {cause}
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
