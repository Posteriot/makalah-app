"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type ReasoningTraceStatus = "pending" | "running" | "done" | "skipped" | "error"

export interface ReasoningTraceStep {
  traceId: string
  stepKey: string
  label: string
  status: ReasoningTraceStatus
  progress: number
  meta?: {
    note?: string
    sourceCount?: number
    toolName?: string
    stage?: string
  }
}

interface ReasoningTracePanelProps {
  steps: ReasoningTraceStep[]
}

export function ReasoningTracePanel({ steps }: ReasoningTracePanelProps) {
  const [expanded, setExpanded] = useState(true)

  const orderedSteps = useMemo(() => steps.slice().sort((a, b) => a.progress - b.progress), [steps])

  if (orderedSteps.length === 0) return null

  return (
    <div className="mt-2 rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)]/60 px-3 py-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={expanded}
      >
        <span className="text-[11px] font-mono font-semibold tracking-wide text-[var(--chat-foreground)]">
          Apa yang dipikirkan model
        </span>
        <span className="text-[11px] font-mono text-[var(--chat-muted-foreground)]">
          {expanded ? "Sembunyikan" : "Tampilkan"}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {orderedSteps.map((step) => {
            const tone = getTone(step.status)
            const detail = getDetail(step)
            return (
              <div key={`${step.traceId}-${step.stepKey}`} className="rounded-md border border-[color:var(--chat-border)]/70 px-2 py-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("text-[11px] font-mono", tone.textClass)}>{step.label}</span>
                  <span className={cn("text-[10px] font-mono uppercase", tone.badgeClass)}>{step.status}</span>
                </div>
                {detail && (
                  <p className="mt-1 text-[10px] font-mono text-[var(--chat-muted-foreground)]">{detail}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getTone(status: ReasoningTraceStatus) {
  if (status === "done") {
    return {
      textClass: "text-[var(--chat-success)]",
      badgeClass: "text-[var(--chat-success)]",
    }
  }

  if (status === "running") {
    return {
      textClass: "text-[var(--chat-foreground)]",
      badgeClass: "text-[var(--chat-secondary-foreground)]",
    }
  }

  if (status === "error") {
    return {
      textClass: "text-[var(--chat-destructive)]",
      badgeClass: "text-[var(--chat-destructive)]",
    }
  }

  return {
    textClass: "text-[var(--chat-muted-foreground)]",
    badgeClass: "text-[var(--chat-muted-foreground)]",
  }
}

function getDetail(step: ReasoningTraceStep): string | null {
  if (step.meta?.sourceCount && step.meta.sourceCount > 0) {
    return `${step.meta.sourceCount} sumber tervalidasi`
  }

  if (step.meta?.toolName) {
    return `Tool: ${step.meta.toolName}`
  }

  if (step.meta?.stage) {
    return `Stage: ${step.meta.stage}`
  }

  if (step.meta?.note) {
    return step.meta.note
  }

  return null
}
