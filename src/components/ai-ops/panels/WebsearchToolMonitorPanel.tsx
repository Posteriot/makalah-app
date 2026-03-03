"use client"

type ToolHealthEntry = {
  tool: string
  totalCalls: number
  successCount: number
  failureCount: number
  successRate: number
  avgLatencyMs: number
  lastFailure?: number
}

type TelemetryEvent = {
  _id: string
  provider: string
  model: string
  mode?: string
  toolUsed?: string
  success: boolean
  failoverUsed?: boolean
  fallbackReason?: string
  errorType?: string
  errorMessage?: string
  createdAt: number
}

const REQUIRED_FALLBACK_REASONS = [
  "google_search_tool_import_failed",
  "google_search_tool_factory_missing",
  "google_search_tool_factory_init_failed",
  "websearch_primary_tool_unavailable_fallback_online",
  "search_required_but_unavailable",
] as const

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const formatLatency = (ms: number) => {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}dtk`
}

const timeAgo = (ts: number) => {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "baru saja"
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

const formatReasonLabel = (reason: string) =>
  reason.replace(/_/g, " ")

const isWebsearchEvent = (event: TelemetryEvent) =>
  event.toolUsed === "google_search" || event.mode === "websearch"

export function WebsearchToolMonitorPanel({
  toolHealth,
  recentFailures,
  failoverTimeline,
}: {
  toolHealth: ToolHealthEntry[] | undefined
  recentFailures: TelemetryEvent[] | undefined
  failoverTimeline: TelemetryEvent[] | undefined
}) {
  const websearchHealth = toolHealth?.find((entry) => entry.tool === "google_search")
  const failureEvents = (recentFailures ?? []).filter(isWebsearchEvent)
  const failoverEvents = (failoverTimeline ?? []).filter(isWebsearchEvent)

  const eventMap = new Map<string, TelemetryEvent>()
  for (const event of [...failureEvents, ...failoverEvents]) {
    eventMap.set(event._id, event)
  }
  const latestEvents = Array.from(eventMap.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12)

  const fallbackReasonCount = new Map<string, number>()
  for (const event of latestEvents) {
    const reason = event.fallbackReason?.trim()
    if (!reason) continue
    fallbackReasonCount.set(reason, (fallbackReasonCount.get(reason) ?? 0) + 1)
  }
  const topReasons = Array.from(fallbackReasonCount.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)

  const missingRequiredReasons = REQUIRED_FALLBACK_REASONS.filter(
    (reason) => !fallbackReasonCount.has(reason)
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Websearch Health
          </span>
          {!toolHealth ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-4 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : !websearchHealth ? (
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">
              Belum ada telemetry `google_search` pada periode ini.
            </p>
          ) : (
            <dl className="mt-4 space-y-2.5 text-xs">
              <Metric label="Total Call" value={websearchHealth.totalCalls.toLocaleString("id-ID")} />
              <Metric label="Success" value={websearchHealth.successCount.toLocaleString("id-ID")} />
              <Metric label="Failure" value={websearchHealth.failureCount.toLocaleString("id-ID")} />
              <Metric label="Success Rate" value={formatPercent(websearchHealth.successRate)} />
              <Metric label="Avg Latency" value={formatLatency(websearchHealth.avgLatencyMs)} />
            </dl>
          )}
        </section>

        <section className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Fallback Reason Coverage
          </span>
          {latestEvents.length === 0 ? (
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">
              Belum ada event websearch terbaru untuk dianalisis.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-[10px] border border-border bg-muted/20 px-3 py-2">
                <div className="font-mono text-[11px] text-foreground">
                  Reason terdeteksi: {fallbackReasonCount.size}
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Reason wajib belum muncul: {missingRequiredReasons.length}
                </div>
              </div>

              {topReasons.length > 0 && (
                <div className="space-y-1.5">
                  {topReasons.map((item) => (
                    <div key={item.reason} className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-muted-foreground">
                        {formatReasonLabel(item.reason)}
                      </span>
                      <span className="font-mono font-bold text-foreground">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Websearch Event Trace
        </span>
        {!recentFailures || !failoverTimeline ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-10 rounded-[8px] bg-muted animate-pulse" />
            ))}
          </div>
        ) : latestEvents.length === 0 ? (
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            Tidak ada event websearch pada periode ini.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {latestEvents.map((event) => (
              <div
                key={event._id}
                className="rounded-[10px] border border-border px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-[6px] border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${
                      event.success
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-500"
                    }`}
                  >
                    {event.success ? "success" : "failed"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {event.mode ?? "-"} / {event.toolUsed ?? "-"}
                  </span>
                  {event.failoverUsed && (
                    <span className="rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-amber-500">
                      failover
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {timeAgo(event.createdAt)}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {event.provider} / {event.model}
                </div>
                <div className="mt-1 font-mono text-[11px] text-foreground">
                  fallbackReason: {event.fallbackReason ?? "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-bold text-foreground">{value}</dd>
    </div>
  )
}

