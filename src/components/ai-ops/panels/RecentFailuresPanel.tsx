"use client"

import { useState } from "react"
import { WarningCircle, NavArrowDown } from "iconoir-react"
import { cn } from "@/lib/utils"

interface FailureRecord {
  _id: string
  provider: string
  model: string
  toolUsed?: string
  mode: string
  errorType?: string
  errorMessage?: string
  failoverUsed: boolean
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

const TOOL_LABELS: Record<string, string> = {
  google_search: "Pencarian Web",
  startPaperSession: "Mulai Paper",
  updateStageData: "Update Stage",
  submitStageForValidation: "Submit Validasi",
  getCurrentPaperState: "State Paper",
}

const VISIBLE_COUNT = 10

export function RecentFailuresPanel({
  data,
}: {
  data: FailureRecord[] | undefined
}) {
  const [showAll, setShowAll] = useState(false)

  const visible = data
    ? showAll
      ? data
      : data.slice(0, VISIBLE_COUNT)
    : []

  return (
    <div className="rounded-shell border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Kegagalan Terbaru
        </span>
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-action bg-muted animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground font-mono">
          Tidak ada kegagalan.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((failure) => (
              <div
                key={failure._id}
                className="flex items-start gap-2.5 rounded-action border border-border px-3 py-2"
              >
                <WarningCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {failure.toolUsed
                        ? TOOL_LABELS[failure.toolUsed] ?? failure.toolUsed
                        : failure.mode === "paper"
                          ? "Paper"
                          : "Obrolan"}
                    </span>
                    {failure.errorType && (
                      <span className="text-[10px] font-mono text-rose-500 font-bold">
                        {failure.errorType}
                      </span>
                    )}
                    {failure.failoverUsed && (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-500 border border-amber-500/30 rounded-badge px-1.5 py-0.5">
                        Failover
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                      {failure.provider} / {failure.model}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {timeAgo(failure.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.length > VISIBLE_COUNT && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={cn(
                "flex items-center gap-1 mt-3 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              <NavArrowDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  showAll && "rotate-180"
                )}
              />
              {showAll
                ? "Tutup"
                : `Tampilkan ${data.length - VISIBLE_COUNT} lainnya`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
