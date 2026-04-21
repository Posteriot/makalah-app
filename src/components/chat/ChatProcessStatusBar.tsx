"use client"

import { NavArrowRight } from "iconoir-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ReasoningActivityPanel } from "./ReasoningActivityPanel"
import { type ReasoningTraceStep } from "./ReasoningTracePanel"

type ChatProcessStatus = "submitted" | "streaming" | "ready" | "error" | "stopped"

const TEMPLATE_LABELS = new Set([
  "Memahami kebutuhan user",
  "Memeriksa konteks paper aktif",
  "Menentukan kebutuhan pencarian web",
  "Memvalidasi sumber referensi",
  "Menyusun jawaban final",
  "Menjalankan aksi pendukung",
])

interface ChatProcessStatusBarProps {
  visible: boolean
  status: ChatProcessStatus
  progress: number
  elapsedSeconds: number
  /** Duration from persisted trace (for rehydrate after reload). */
  persistedDurationSeconds?: number
  reasoningSteps?: ReasoningTraceStep[]
  reasoningHeadline?: string | null
  reasoningTraceMode?: "curated" | "transparent"
  /** External control for the reasoning panel open state */
  isPanelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
}

export function ChatProcessStatusBar({
  visible,
  status,
  progress,
  elapsedSeconds,
  persistedDurationSeconds,
  reasoningSteps = [],
  reasoningHeadline,
  reasoningTraceMode: _reasoningTraceMode,
  isPanelOpen,
  onPanelOpenChange,
}: ChatProcessStatusBarProps) {
  const [internalPanelOpen, setInternalPanelOpen] = useState(false)
  const isPanelOpenValue = isPanelOpen ?? internalPanelOpen
  const setPanelOpen = onPanelOpenChange ?? setInternalPanelOpen
  const [completedExpanded, setCompletedExpanded] = useState(false)

  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))
  const isProcessing = status === "submitted" || status === "streaming"
  const isError = status === "error"

  // Live: elapsedSeconds from processStartedAtRef timer.
  // Rehydrate: persistedDurationSeconds from _creationTime diff (elapsedSeconds is 0 after reload).
  const durationSeconds = persistedDurationSeconds ?? (
    elapsedSeconds > 0.5
      ? elapsedSeconds
      : null
  )

  // Don't show duration at all if we have no data yet (prevents 0.1s flash)
  const showDuration = durationSeconds !== null
  // Headline naratif dari reasoning trace (isi pikiran model)
  const narrativeHeadline = useMemo(() => {
    // Priority 1: raw model thinking from live stream
    if (reasoningHeadline && reasoningHeadline.trim()) return reasoningHeadline

    if (reasoningSteps.length === 0) return null

    // Priority 2: non-template step labels (transparent/raw)
    const running = reasoningSteps.find((step) => step.status === "running")
    if (running) {
      if (!TEMPLATE_LABELS.has(running.label)) return running.label
      if (running.thought) return running.thought.trim()
    }

    const errored = reasoningSteps.find((step) => step.status === "error")
    if (errored) {
      if (!TEMPLATE_LABELS.has(errored.label)) return errored.label
      if (errored.thought) return errored.thought.trim()
    }

    // Priority 3: any step with raw content
    const withContent = [...reasoningSteps].reverse().find((s) =>
      !TEMPLATE_LABELS.has(s.label) || (s.thought && s.thought.trim())
    )
    if (withContent) {
      if (!TEMPLATE_LABELS.has(withContent.label)) return withContent.label
      if (withContent.thought) return withContent.thought.trim()
    }

    return null
  }, [reasoningHeadline, reasoningSteps])

  const shouldShow = isProcessing || Boolean(narrativeHeadline) || (visible && reasoningSteps.length > 0) || isPanelOpenValue
  if (!shouldShow) return null

  const hasSteps = reasoningSteps.length > 0
  const canOpenPanel = hasSteps
  const openPanel = () => canOpenPanel && setPanelOpen(true)

  return (
    <>
      <div className="pb-2" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
        {isProcessing ? (
          /* ── Processing mode: headline naratif + progress bar ── */
          <div role="status" aria-live="polite" aria-label={narrativeHeadline ?? undefined}>
            <button
              type="button"
              onClick={openPanel}
              className={cn(
                "group mb-1.5 flex w-full items-center justify-between text-left",
                canOpenPanel ? "cursor-pointer" : "cursor-default"
              )}
              disabled={!canOpenPanel}
            >
              <span
                className="flex min-w-0 items-baseline gap-1 truncate font-mono text-[11px] leading-snug text-[var(--chat-foreground)]"
                style={{ opacity: 0.92 }}
              >
                {narrativeHeadline && <span className="truncate">{narrativeHeadline}</span>}
                <ThinkingDots />
              </span>
              <span
                className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--chat-foreground)]"
                style={{ opacity: 0.92 }}
              >
                {safeProgress}%
              </span>
            </button>

            {/* Teal progress bar */}
            <div className="relative h-1 overflow-hidden rounded-full bg-[var(--chat-muted)]">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  isError
                    ? "bg-[var(--chat-destructive)]"
                    : "bg-[var(--chat-success)] chat-progress-fill-shimmer"
                )}
                style={{ width: `${safeProgress}%` }}
              />
            </div>
          </div>
        ) : (
          /* ── Completed mode: collapsed=duration only, expanded=full reasoning ── */
          <div role="status" aria-live="polite">
            <button
              type="button"
              onClick={() => {
                if (narrativeHeadline) {
                  setCompletedExpanded((prev) => !prev)
                } else if (canOpenPanel) {
                  openPanel()
                }
              }}
              className={cn(
                "group flex items-center py-1 text-left transition-opacity",
                (narrativeHeadline || canOpenPanel) ? "cursor-pointer hover:opacity-80" : "cursor-default"
              )}
              disabled={!narrativeHeadline && !canOpenPanel}
            >
              <span className={cn(
                "font-mono text-[11px] leading-snug",
                isError
                  ? "text-[var(--chat-destructive)]"
                  : "text-[var(--chat-muted-foreground)] opacity-60"
              )}>
                {showDuration ? formatDuration(durationSeconds) : ""}
              </span>
              {(narrativeHeadline || canOpenPanel) && (
                <NavArrowRight className={cn(
                  "ml-1 h-3 w-3 text-[var(--chat-muted-foreground)] opacity-60 transition-all group-hover:text-[var(--chat-foreground)] group-hover:opacity-100",
                  completedExpanded && "rotate-90"
                )} />
              )}
            </button>
            {completedExpanded && narrativeHeadline && (
              <div className="pb-1">
                <p className="font-mono text-[11px] leading-relaxed text-[var(--chat-muted-foreground)] opacity-60">
                  {narrativeHeadline}
                </p>
                {canOpenPanel && (
                  <button
                    type="button"
                    onClick={openPanel}
                    className="mt-1 font-mono text-[10px] text-[var(--chat-muted-foreground)] opacity-40 transition-opacity hover:opacity-80"
                  >
                    Detail &rarr;
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {canOpenPanel && (
        <ReasoningActivityPanel
          open={isPanelOpenValue}
          onOpenChange={setPanelOpen}
          steps={reasoningSteps}
        />
      )}
    </>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex shrink-0 items-center gap-px" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "inline-block h-[3px] w-[3px] rounded-full bg-[var(--chat-muted-foreground)]",
            "animate-chat-thought-dot",
            `chat-thought-dot-${n}`
          )}
        />
      ))}
    </span>
  )
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  if (safe < 60) {
    // Under 1 minute: show seconds with 1 decimal
    return `${safe.toFixed(1)}s`
  }
  const minutes = Math.floor(safe / 60)
  const seconds = safe - minutes * 60
  return `${minutes}m ${seconds.toFixed(0)}s`
}
