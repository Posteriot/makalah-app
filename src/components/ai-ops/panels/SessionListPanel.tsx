"use client"

import { useState } from "react"
import { NavArrowLeft, NavArrowRight } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { SessionDetailDialog } from "./SessionDetailDialog"

const PAGE_SIZE = 10

const STAGE_LABELS: Record<string, string> = {
  gagasan: "Gagasan",
  topik: "Topik",
  outline: "Outline",
  abstrak: "Abstrak",
  pendahuluan: "Pendahuluan",
  tinjauan_literatur: "Tinjauan Literatur",
  metodologi: "Metodologi",
  hasil: "Hasil",
  diskusi: "Diskusi",
  kesimpulan: "Kesimpulan",
  daftar_pustaka: "Daftar Pustaka",
  lampiran: "Lampiran",
  judul: "Judul",
  completed: "Selesai",
}

const STATUS_STYLES: Record<string, string> = {
  drafting:
    "border-slate-500/30 bg-slate-500/15 text-slate-600 dark:text-slate-400",
  pending_validation:
    "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
  approved:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  revision:
    "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400",
}

interface SessionItem {
  _id: Id<"paperSessions">
  userId: Id<"users">
  currentStage: string
  stageStatus: string
  isDirty?: boolean
  paperTitle?: string
  workingTitle?: string
  completedAt?: number
  _creationTime: number
  digestCount: number
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function SessionListPanel({
  sessions,
}: {
  sessions: SessionItem[] | undefined
}) {
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<Id<"paperSessions"> | null>(null)

  const totalPages = sessions ? Math.ceil(sessions.length / PAGE_SIZE) : 0
  const paginatedSessions = sessions
    ? sessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : undefined

  return (
    <>
      <div className="rounded-[16px] border border-border bg-card/90 dark:bg-slate-900/90 overflow-hidden">
        <div className="border-b border-border bg-slate-200/45 px-5 py-3 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Recent Sessions
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono">
              {sessions ? sessions.length : "..."} sessions
            </span>
          </div>
        </div>

        {!sessions ? (
          <div className="p-5">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-5 text-center text-xs text-muted-foreground font-mono">
            Belum ada paper session.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedSessions!.map((s, index) => {
              const globalIndex = page * PAGE_SIZE + index + 1
              const title =
                s.paperTitle || s.workingTitle || "(Untitled)"
              const stageLabel =
                s.completedAt
                  ? "Selesai"
                  : STAGE_LABELS[s.currentStage] || s.currentStage
              const statusStyle =
                STATUS_STYLES[s.stageStatus] || STATUS_STYLES.drafting

              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => setSelectedId(s._id)}
                  className="flex w-full items-center justify-between px-5 py-3 gap-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {/* Number */}
                  <span className="text-[10px] font-mono text-muted-foreground w-6 shrink-0 text-right">
                    {globalIndex}.
                  </span>

                  {/* Left: title + stage */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {stageLabel}
                      </span>
                      <span
                        className={`rounded-[6px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusStyle}`}
                      >
                        {s.stageStatus}
                      </span>
                      {s.isDirty && (
                        <span className="rounded-[6px] border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          DIRTY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: digest count + date */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {s.digestCount} digest
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatTime(s._creationTime)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {sessions && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[10px] font-mono font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <NavArrowLeft className="h-3 w-3" />
              Prev
            </button>
            <span className="text-[10px] font-mono text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[10px] font-mono font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <NavArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedId && (
        <SessionDetailDialog
          sessionId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
