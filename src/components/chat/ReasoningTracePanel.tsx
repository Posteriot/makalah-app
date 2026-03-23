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
  thought?: string
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

/**
 * Timeline panel dengan dot + vertical line (referensi: ChatGPT thinking UI).
 *
 * PENTING: Komponen ini render di dalam Sheet Portal (di luar [data-chat-scope]),
 * jadi semua warna HARUS pakai global Tailwind tokens (bg-foreground, text-muted-foreground, dll),
 * BUKAN --chat-* CSS variables.
 */
const TEMPLATE_LABELS = new Set([
  "Memahami kebutuhan user",
  "Memeriksa konteks paper aktif",
  "Menentukan kebutuhan pencarian web",
  "Memvalidasi sumber referensi",
  "Menyusun jawaban final",
  "Menjalankan aksi pendukung",
])

export function ReasoningTracePanel({ steps, className }: ReasoningTracePanelProps) {
  // Detect transparent mode: at least one step has non-template label or thought
  const isTransparent = useMemo(
    () => steps.some((s) => !TEMPLATE_LABELS.has(s.label) || s.thought),
    [steps]
  )

  const orderedSteps = useMemo(() => {
    const sorted = steps.slice().sort((a, b) =>
      a.progress === b.progress ? (a.ts ?? 0) - (b.ts ?? 0) : a.progress - b.progress
    )
    // In transparent mode, hide steps with only template labels and no thought
    if (isTransparent) {
      return sorted.filter((s) => !TEMPLATE_LABELS.has(s.label) || s.thought)
    }
    return sorted
  }, [steps, isTransparent])

  if (orderedSteps.length === 0) return null

  return (
    <div className={cn("font-sans", className)}>
      {orderedSteps.map((step, index) => {
        const tone = getTone(step.status)
        const detail = getDetail(step)
        const isLast = index === orderedSteps.length - 1
        return (
          <div key={`${step.traceId}-${step.stepKey}`} className="flex gap-3">
            {/* Dot + vertical line connector */}
            <div className="relative flex w-3 shrink-0 flex-col items-center">
              <span className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", tone.dotClass)} />
              {!isLast && (
                <span className="absolute top-[15px] bottom-0 left-1/2 w-px -translate-x-1/2 bg-muted-foreground/25" />
              )}
            </div>
            {/* Step content */}
            <div className={cn("pb-5", isLast && "pb-0")}>
              <p className={cn("text-sm font-medium leading-snug", tone.textClass)}>{step.label}</p>
              {detail && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Warna tone — pakai global Tailwind tokens (bukan --chat-*).
 * Pola warna mengikuti sidebar conversation list:
 * - done: foreground/80 (seperti judul percakapan)
 * - running: foreground (aktif/highlighted)
 * - error: destructive
 * - pending/skipped: muted-foreground
 */
function getTone(status: ReasoningTraceStatus) {
  if (status === "done") {
    return {
      textClass: "text-foreground/80",
      dotClass: "bg-foreground/80",
    }
  }

  if (status === "running") {
    return {
      textClass: "text-foreground",
      dotClass: "bg-foreground",
    }
  }

  if (status === "error") {
    return {
      textClass: "text-destructive",
      dotClass: "bg-destructive",
    }
  }

  return {
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground/60",
  }
}

function getDetail(step: ReasoningTraceStep): string | null {
  // Priority: thought (raw model thinking) > note (raw meta) > other meta fields
  if (step.thought) {
    return step.thought
  }

  if (step.meta?.note) {
    return step.meta.note
  }

  // Raw meta fields — no wrapping, no translation
  const parts: string[] = []
  if (step.meta?.mode) parts.push(step.meta.mode)
  if (step.meta?.stage) parts.push(step.meta.stage)
  if (step.meta?.toolName) parts.push(step.meta.toolName)
  if (step.meta?.sourceCount && step.meta.sourceCount > 0) parts.push(`${step.meta.sourceCount} sources`)

  return parts.length > 0 ? parts.join(" · ") : null
}
