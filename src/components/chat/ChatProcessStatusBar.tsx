"use client"

import { NavArrowRight } from "iconoir-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ReasoningActivityPanel } from "./ReasoningActivityPanel"
import { type ReasoningTraceStep } from "./ReasoningTracePanel"

type ChatProcessStatus = "submitted" | "streaming" | "ready" | "error" | "stopped"

interface ChatProcessStatusBarProps {
  visible: boolean
  status: ChatProcessStatus
  progress: number
  elapsedSeconds: number
  reasoningSteps?: ReasoningTraceStep[]
  reasoningHeadline?: string | null
}

export function ChatProcessStatusBar({
  visible,
  status,
  progress,
  elapsedSeconds,
  reasoningSteps = [],
  reasoningHeadline,
}: ChatProcessStatusBarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))
  const isProcessing = status === "submitted" || status === "streaming"
  const isError = status === "error"

  const traceDurationSec = useMemo(() => {
    const timestamps = reasoningSteps
      .map((step) => step.ts)
      .filter((ts): ts is number => typeof ts === "number" && Number.isFinite(ts))
      .sort((a, b) => a - b)

    if (timestamps.length < 2) return null
    return Math.max(1, Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 1000))
  }, [reasoningSteps])

  const durationSeconds = isProcessing
    ? Math.max(1, elapsedSeconds)
    : traceDurationSec ?? Math.max(1, elapsedSeconds || Math.round((safeProgress / 100) * 90))

  // Headline naratif dari reasoning trace (isi pikiran model)
  const narrativeHeadline = useMemo(() => {
    if (reasoningHeadline && reasoningHeadline.trim()) return reasoningHeadline
    if (reasoningSteps.length === 0) return null

    const running = reasoningSteps.find((step) => step.status === "running")
    if (running) return running.label

    const errored = reasoningSteps.find((step) => step.status === "error")
    if (errored) return `Terjadi kendala saat ${lowerFirst(errored.label)}.`

    const lastStep = reasoningSteps[reasoningSteps.length - 1]
    return lastStep?.label ?? null
  }, [reasoningHeadline, reasoningSteps])

  const shouldShow = Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0)
  if (!shouldShow) return null

  const hasSteps = reasoningSteps.length > 0
  const openPanel = () => hasSteps && setIsPanelOpen(true)

  return (
    <>
      <div className="pb-2" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
        {isProcessing ? (
          /* ── Processing mode: headline naratif + progress bar ── */
          <div role="status" aria-live="polite" aria-label={narrativeHeadline ?? "Memproses..."}>
            <button
              type="button"
              onClick={openPanel}
              className={cn(
                "group mb-1.5 flex w-full items-center justify-between text-left",
                hasSteps ? "cursor-pointer" : "cursor-default"
              )}
              disabled={!hasSteps}
            >
              <span className="truncate font-sans text-sm leading-snug text-[var(--chat-secondary-foreground)]">
                {narrativeHeadline ?? "Memproses..."}
              </span>
              <span className="font-sans text-xs tabular-nums text-[var(--chat-muted-foreground)]">
                {safeProgress}%
              </span>
            </button>

            {/* Teal progress bar */}
            <div className="relative h-1 overflow-hidden rounded-full bg-[var(--chat-muted)]">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  isError ? "bg-[var(--chat-destructive)]" : "bg-[var(--chat-success)]",
                  "animate-pulse"
                )}
                style={{ width: `${safeProgress}%` }}
              />
            </div>
          </div>
        ) : (
          /* ── Completed mode: "Memproses Xm Yd >" ChatGPT style ── */
          <button
            type="button"
            onClick={openPanel}
            className={cn(
              "group flex items-center py-1 text-left transition-opacity",
              hasSteps ? "cursor-pointer hover:opacity-80" : "cursor-default"
            )}
            role="status"
            aria-live="polite"
            aria-label={hasSteps ? "Buka aktivitas berpikir Agen" : "Aktivitas Agen"}
            disabled={!hasSteps}
          >
            <span className={cn(
              "font-sans text-sm leading-snug",
              isError
                ? "text-[var(--chat-destructive)]"
                : "text-[var(--chat-muted-foreground)]"
            )}>
              {isError
                ? `Ada kendala setelah ${formatDuration(durationSeconds)}`
                : `Memproses ${formatDuration(durationSeconds)}`}
            </span>
            {hasSteps && (
              <NavArrowRight className="ml-1 h-3.5 w-3.5 text-[var(--chat-muted-foreground)] transition-colors group-hover:text-[var(--chat-foreground)]" />
            )}
          </button>
        )}
      </div>

      {hasSteps && (
        <ReasoningActivityPanel
          open={isPanelOpen}
          onOpenChange={setIsPanelOpen}
          steps={reasoningSteps}
        />
      )}
    </>
  )
}

function lowerFirst(input: string) {
  if (!input) return input
  return input.charAt(0).toLowerCase() + input.slice(1)
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}m ${seconds}d`
}
