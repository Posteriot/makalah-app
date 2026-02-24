"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

export type ReasoningTraceStatus = "pending" | "running" | "done" | "skipped" | "error"

export interface ReasoningTraceStep {
  traceId: string
  stepKey: string
  label: string
  status: ReasoningTraceStatus
  progress: number
  ts?: number
  meta?: {
    note?: string
    sourceCount?: number
    toolName?: string
    stage?: string
    mode?: "normal" | "paper" | "websearch"
  }
}

interface ReasoningTracePanelProps {
  steps: ReasoningTraceStep[]
  className?: string
}

export function ReasoningTracePanel({ steps, className }: ReasoningTracePanelProps) {
  const orderedSteps = useMemo(
    () => steps.slice().sort((a, b) => (a.progress === b.progress ? (a.ts ?? 0) - (b.ts ?? 0) : a.progress - b.progress)),
    [steps]
  )

  if (orderedSteps.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      {orderedSteps.map((step) => {
        const tone = getTone(step.status)
        const detail = getDetail(step)
        return (
          <div key={`${step.traceId}-${step.stepKey}`} className="rounded-md border border-[color:var(--chat-border)]/70 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className={cn("text-xs font-mono", tone.textClass)}>{step.label}</span>
              <span className={cn("text-[10px] font-mono uppercase", tone.badgeClass)}>{step.status}</span>
            </div>
            {detail && (
              <p className="mt-1 text-[11px] font-mono text-[var(--chat-muted-foreground)]">{detail}</p>
            )}
          </div>
        )
      })}
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
    return `Tool aktif: ${step.meta.toolName}`
  }

  if (step.meta?.stage) {
    return `Tahap aktif: ${step.meta.stage}`
  }

  if (step.meta?.mode) {
    if (step.meta.mode === "paper") return "Mode paper workflow aktif"
    if (step.meta.mode === "websearch") return "Mode pencarian web aktif"
    return "Mode chat normal aktif"
  }

  if (step.meta?.note) {
    return humanizeNote(step.meta.note)
  }

  return null
}

function humanizeNote(note: string): string {
  const normalized = note.trim().toLowerCase()
  if (!normalized) return note

  if (normalized === "web-search-enabled") return "Pencarian web diaktifkan"
  if (normalized === "web-search-disabled") return "Pencarian web tidak diaktifkan"
  if (normalized === "no-web-search") return "Tidak butuh pencarian web di langkah ini"
  if (normalized === "source-detected") return "Sumber baru terdeteksi dan sedang dicek"
  if (normalized === "sources-validated") return "Sumber sudah diverifikasi"
  if (normalized === "no-sources-returned") return "Belum ada sumber valid yang bisa dipakai"
  if (normalized === "tool-running") return "Tool sedang dijalankan"
  if (normalized === "tool-done") return "Eksekusi tool selesai"
  if (normalized === "no-tool-detected-yet" || normalized === "no-tool-call") return "Belum ada tool yang perlu dipanggil"
  if (normalized === "tool-completed") return "Tool yang dipakai sudah selesai"
  if (normalized === "stopped-by-user-or-stream-abort") return "Proses dihentikan sebelum selesai"
  if (normalized === "stream-error") return "Terjadi kendala saat streaming jawaban"

  return note.replace(/-/g, " ")
}
