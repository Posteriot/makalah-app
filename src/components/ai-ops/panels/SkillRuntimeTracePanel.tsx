"use client"

import { NavArrowLeft, NavArrowRight } from "iconoir-react"
import { useMemo, useState, type ReactNode } from "react"

type SkillRuntimeTraceItem = {
  _id: string
  createdAt: number
  conversationId: string | null
  stageScope: string
  stageInstructionSource: string
  activeSkillId: string | null
  activeSkillVersion: number | null
  fallbackReason: string | null
  skillResolverFallback: boolean | null
  mode: string
  toolUsed: string | null
  provider: string
  model: string
  latencyMs: number
  failoverUsed: boolean
  success: boolean
  errorType: string | null
  errorMessage: string | null
}

type DynamicColumnKey =
  | "conversation"
  | "activeSkill"
  | "fallbackReason"
  | "mode"
  | "providerModel"

const DYNAMIC_COLUMNS: Array<{ key: DynamicColumnKey; label: string }> = [
  { key: "conversation", label: "Conversation" },
  { key: "activeSkill", label: "Active Skill" },
  { key: "fallbackReason", label: "Fallback Reason" },
  { key: "mode", label: "Mode/Tool" },
  { key: "providerModel", label: "Provider/Model" },
]

const DESKTOP_DYNAMIC_COLUMN_COUNT = 2
const MOBILE_DYNAMIC_COLUMN_COUNT = 1

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatSource(source: string): string {
  if (source === "skill") return "skill"
  if (source === "fallback") return "fallback"
  if (source === "none") return "none"
  return "unknown"
}

function getSkillLabel(item: SkillRuntimeTraceItem): string {
  if (!item.activeSkillId) return "-"
  return `${item.activeSkillId}@v${item.activeSkillVersion ?? "-"}`
}

function getModeLabel(item: SkillRuntimeTraceItem): string {
  return item.toolUsed ? `${item.mode}/${item.toolUsed}` : item.mode
}

function getProviderModelLabel(item: SkillRuntimeTraceItem): string {
  return `${item.provider} / ${item.model}`
}

export function SkillRuntimeTracePanel({
  data,
}: {
  data: SkillRuntimeTraceItem[] | undefined
}) {
  const [query, setQuery] = useState("")
  const [dynamicColumnStart, setDynamicColumnStart] = useState(0)

  const filtered = useMemo(() => {
    if (!data) return []
    if (!query.trim()) return data

    const q = query.toLowerCase()
    return data.filter((item) => {
      return (
        (item.conversationId ?? "").toLowerCase().includes(q)
        || item.stageScope.toLowerCase().includes(q)
        || formatSource(item.stageInstructionSource).includes(q)
        || (item.activeSkillId ?? "").toLowerCase().includes(q)
        || (item.fallbackReason ?? "").toLowerCase().includes(q)
      )
    })
  }, [data, query])

  const visibleDynamicColumnsDesktop = Array.from(
    { length: DESKTOP_DYNAMIC_COLUMN_COUNT },
    (_, offset) => DYNAMIC_COLUMNS[(dynamicColumnStart + offset) % DYNAMIC_COLUMNS.length]
  )

  const visibleDynamicColumnsMobile = Array.from(
    { length: MOBILE_DYNAMIC_COLUMN_COUNT },
    (_, offset) => DYNAMIC_COLUMNS[(dynamicColumnStart + offset) % DYNAMIC_COLUMNS.length]
  )

  const goToPrevColumns = () => {
    setDynamicColumnStart(
      (prev) => (prev - 1 + DYNAMIC_COLUMNS.length) % DYNAMIC_COLUMNS.length
    )
  }

  const goToNextColumns = () => {
    setDynamicColumnStart((prev) => (prev + 1) % DYNAMIC_COLUMNS.length)
  }

  return (
    <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Skill Runtime Trace
        </span>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari conversation/stage/reason..."
          className="h-8 w-full rounded-[8px] border border-border bg-background px-2.5 text-[11px] font-mono text-foreground md:w-72"
        />
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-[8px] bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[10px] font-mono text-muted-foreground">
          Tidak ada trace skill runtime untuk filter/periode ini.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 md:block">
            <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
              <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                <tr>
                  <th className="text-signal h-12 w-[14%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                    Waktu
                  </th>
                  <th className="text-signal h-12 w-[14%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                    Stage
                  </th>
                  <th className="text-signal h-12 w-[12%] px-4 py-3 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                    Source
                  </th>
                  <th className="h-12 w-[8%] border-l border-border bg-slate-200/75 px-2 py-2 dark:bg-slate-900/85">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={goToPrevColumns}
                        aria-label="Kolom sebelumnya"
                        className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        <NavArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={goToNextColumns}
                        aria-label="Kolom berikutnya"
                        className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        <NavArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                  {visibleDynamicColumnsDesktop.map((column) => (
                    <th
                      key={column.key}
                      className="text-signal h-12 w-[26%] px-4 py-3 text-left text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => {
                  const source = formatSource(item.stageInstructionSource)

                  return (
                    <tr key={item._id} className="group transition-colors hover:bg-muted/50">
                      <td className="text-narrative bg-slate-200/35 px-4 py-3 text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                        {formatTime(item.createdAt)}
                      </td>
                      <td className="text-narrative bg-slate-200/35 px-4 py-3 text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                        {item.stageScope}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <SourceBadge source={source} />
                      </td>
                      <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
                      {visibleDynamicColumnsDesktop.map((column) => (
                        <td key={`${item._id}-${column.key}`} className="px-4 py-3 align-top">
                          {renderDynamicCell(column.key, item)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 md:hidden">
            <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
              <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
                <tr>
                  <th className="text-signal h-11 w-[27%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                    Waktu
                  </th>
                  <th className="text-signal h-11 w-[22%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                    Stage
                  </th>
                  <th className="h-11 w-[17%] border-l border-border bg-slate-200/75 px-1 py-1 dark:bg-slate-900/85">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={goToPrevColumns}
                        aria-label="Kolom sebelumnya"
                        className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        <NavArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={goToNextColumns}
                        aria-label="Kolom berikutnya"
                        className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        <NavArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                  {visibleDynamicColumnsMobile.map((column) => (
                    <th
                      key={`mobile-${column.key}`}
                      className="text-signal h-11 w-[34%] px-2 py-2 text-left text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item._id} className="group transition-colors hover:bg-muted/50">
                    <td className="text-narrative bg-slate-200/35 px-2 py-3 align-top text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      <div className="space-y-1">
                        <div>{formatTime(item.createdAt)}</div>
                        <SourceBadge source={formatSource(item.stageInstructionSource)} compact />
                      </div>
                    </td>
                    <td className="text-narrative bg-slate-200/35 px-2 py-3 align-top text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      {item.stageScope}
                    </td>
                    <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
                    {visibleDynamicColumnsMobile.map((column) => (
                      <td key={`${item._id}-mobile-${column.key}`} className="px-2 py-3 align-top">
                        {renderDynamicCell(column.key, item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function SourceBadge({ source, compact = false }: { source: string; compact?: boolean }) {
  const className =
    source === "skill"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      : source === "fallback"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
        : "border-border bg-muted/40 text-muted-foreground"

  return (
    <span
      className={`inline-flex rounded-[6px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${className} ${compact ? "" : "justify-center"}`}
    >
      {source}
    </span>
  )
}

function renderDynamicCell(key: DynamicColumnKey, item: SkillRuntimeTraceItem): ReactNode {
  if (key === "conversation") {
    return (
      <span className="text-narrative block break-all font-mono text-[10px] text-muted-foreground">
        {item.conversationId ?? "-"}
      </span>
    )
  }

  if (key === "activeSkill") {
    return (
      <span className="text-narrative block break-all font-mono text-[10px] text-foreground">
        {getSkillLabel(item)}
      </span>
    )
  }

  if (key === "fallbackReason") {
    return (
      <span className="text-narrative block break-all font-mono text-[10px] text-muted-foreground">
        {item.fallbackReason ?? "-"}
      </span>
    )
  }

  if (key === "mode") {
    return (
      <span className="text-narrative block break-all font-mono text-[10px] text-foreground">
        {getModeLabel(item)}
      </span>
    )
  }

  return (
    <span className="text-narrative block break-all font-mono text-[10px] text-muted-foreground">
      {getProviderModelLabel(item)}
    </span>
  )
}
