"use client"

import { Search } from "iconoir-react"
import { useMemo, useState } from "react"

type SearchSkillOverviewData = {
  totalApplied: number
  totalAllBlocked: number
  blockRate: number
  totalSourcesPassed: number
  totalSourcesBlocked: number
  bySkill: Record<string, { applied: number; allBlocked: number }>
}

type SearchSkillTraceItem = {
  _id: string
  createdAt: number
  conversationId: string | null
  searchSkillName: string
  searchSkillAction: string
  sourcesPassed: number | null
  sourcesBlocked: number | null
  referencesClaimed: number | null
  referencesMatched: number | null
  stageScope: string | null
  mode: string
  success: boolean
}

interface SearchSkillMonitorPanelProps {
  overview: SearchSkillOverviewData | undefined
  trace: SearchSkillTraceItem[] | undefined
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getDetailText(item: SearchSkillTraceItem): string {
  if (item.searchSkillName === "source-quality") {
    const passed = item.sourcesPassed ?? 0
    const blocked = item.sourcesBlocked ?? 0
    return `${passed} passed, ${blocked} blocked`
  }

  if (item.searchSkillName === "reference-integrity") {
    const claimed = item.referencesClaimed ?? 0
    const matched = item.referencesMatched ?? 0
    return `${claimed} claimed, ${matched} matched`
  }

  return "-"
}

export function SearchSkillMonitorPanel({
  overview,
  trace,
}: SearchSkillMonitorPanelProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!trace) return []
    if (!query.trim()) return trace

    const q = query.toLowerCase()
    return trace.filter((item) => {
      return (
        item.searchSkillName.toLowerCase().includes(q)
        || item.searchSkillAction.toLowerCase().includes(q)
        || (item.stageScope ?? "").toLowerCase().includes(q)
        || (item.conversationId ?? "").toLowerCase().includes(q)
      )
    })
  }, [trace, query])

  return (
    <div className="space-y-4">
      {/* Summary Section */}
      <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-sky-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Search Skill Monitor
          </span>
        </div>

        {!overview ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <StatRow label="Total Applied" value={overview.totalApplied} />
            <StatRow
              label="All Blocked"
              value={overview.totalAllBlocked}
              suffix={`(${formatPercent(overview.blockRate)})`}
              warn={overview.blockRate > 0.1}
            />
            <StatRow label="Sources Passed" value={overview.totalSourcesPassed} />
            <StatRow label="Sources Blocked" value={overview.totalSourcesBlocked} />

            {Object.keys(overview.bySkill).length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  By Skill
                </span>
                <div className="mt-2 space-y-2">
                  {Object.entries(overview.bySkill).map(([name, stats]) => (
                    <div key={name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono text-muted-foreground">{name}</span>
                      <span className="font-mono text-[10px] text-foreground">
                        {stats.applied} applied, {stats.allBlocked} all-blocked
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trace Table Section */}
      <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Search Skill Trace
          </span>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari skill/action/stage..."
            className="h-8 w-full rounded-[8px] border border-border bg-background px-2.5 text-[11px] font-mono text-foreground md:w-72"
          />
        </div>

        {!trace ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-[8px] bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[10px] font-mono text-muted-foreground">
            Tidak ada trace search skill untuk filter/periode ini.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 md:block">
              <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
                <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                  <tr>
                    <th className="text-signal h-12 w-[16%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                      Waktu
                    </th>
                    <th className="text-signal h-12 w-[12%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                      Context
                    </th>
                    <th className="text-signal h-12 w-[18%] px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                      Skill
                    </th>
                    <th className="text-signal h-12 w-[14%] px-4 py-3 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                      Action
                    </th>
                    <th className="text-signal h-12 w-[40%] px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => (
                    <tr key={item._id} className="group transition-colors hover:bg-muted/50">
                      <td className="text-narrative bg-slate-200/35 px-4 py-3 text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                        {formatTime(item.createdAt)}
                      </td>
                      <td className="text-narrative bg-slate-200/35 px-4 py-3 text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                        {item.stageScope ?? "chat"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-foreground">
                          {item.searchSkillName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionBadge action={item.searchSkillAction} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {getDetailText(item)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile table */}
            <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 md:hidden">
              <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
                <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                  <tr>
                    <th className="text-signal h-11 w-[30%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                      Waktu
                    </th>
                    <th className="text-signal h-11 w-[25%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                      Skill
                    </th>
                    <th className="text-signal h-11 w-[45%] px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((item) => (
                    <tr key={item._id} className="group transition-colors hover:bg-muted/50">
                      <td className="text-narrative bg-slate-200/35 px-2 py-3 align-top text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                        <div className="space-y-1">
                          <div>{formatTime(item.createdAt)}</div>
                          <ActionBadge action={item.searchSkillAction} compact />
                        </div>
                      </td>
                      <td className="text-narrative bg-slate-200/35 px-2 py-3 align-top text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                        <div className="space-y-1">
                          <div className="font-mono text-[10px]">{item.searchSkillName}</div>
                          <div className="font-mono text-[9px] text-muted-foreground">
                            {item.stageScope ?? "chat"}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {getDetailText(item)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
  suffix,
  warn,
}: {
  label: string
  value: number
  suffix?: string
  warn?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1.5 text-right">
        <span
          className={`font-mono font-bold ${warn ? "text-amber-500" : "text-foreground"}`}
        >
          {value.toLocaleString("id-ID")}
        </span>
        {suffix && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function ActionBadge({ action, compact = false }: { action: string; compact?: boolean }) {
  const normalized = action.toLowerCase()
  const isPositive = normalized === "passed" || normalized === "validated"

  const className = isPositive
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
    : normalized === "all-blocked"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
      : "border-border bg-muted/40 text-muted-foreground"

  return (
    <span
      className={`inline-flex rounded-[6px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${className} ${compact ? "" : "justify-center"}`}
    >
      {action}
    </span>
  )
}
