"use client"

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

export function SkillRuntimeTracePanel({
  data,
}: {
  data: SkillRuntimeTraceItem[] | undefined
}) {
  const [query, setQuery] = useState("")

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
        <div className="max-h-[460px] overflow-auto rounded-[10px] border border-border">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="sticky top-0 bg-slate-100/70 dark:bg-slate-900/95">
              <tr className="border-b border-border">
                <Th>Waktu</Th>
                <Th>Conversation</Th>
                <Th>Stage</Th>
                <Th>Source</Th>
                <Th>Active Skill</Th>
                <Th>Fallback Reason</Th>
                <Th>Mode</Th>
                <Th>Provider/Model</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const source = formatSource(item.stageInstructionSource)
                const skillLabel = item.activeSkillId
                  ? `${item.activeSkillId}@v${item.activeSkillVersion ?? "-"}`
                  : "-"

                return (
                  <tr key={item._id} className="border-b border-border/70">
                    <Td>{formatTime(item.createdAt)}</Td>
                    <Td className="font-mono text-[10px]">{item.conversationId ?? "-"}</Td>
                    <Td>{item.stageScope}</Td>
                    <Td>
                      <span
                        className={`rounded-[6px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          source === "skill"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : source === "fallback"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                              : "border-border bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {source}
                      </span>
                    </Td>
                    <Td className="font-mono text-[10px]">{skillLabel}</Td>
                    <Td className="font-mono text-[10px]">{item.fallbackReason ?? "-"}</Td>
                    <Td>{item.mode}{item.toolUsed ? `/${item.toolUsed}` : ""}</Td>
                    <Td className="font-mono text-[10px]">{item.provider} / {item.model}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </th>
  )
}

function Td({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td className={`px-3 py-2 text-[11px] text-foreground ${className ?? ""}`}>
      {children}
    </td>
  )
}
