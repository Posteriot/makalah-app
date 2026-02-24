"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ReasoningActivityPanel } from "./ReasoningActivityPanel"
import { type ReasoningTraceStep } from "./ReasoningTracePanel"

type ChatProcessStatus = "submitted" | "streaming" | "ready" | "error" | "stopped"

interface ChatProcessStatusBarProps {
  visible: boolean
  status: ChatProcessStatus
  progress: number
  message: string
  reasoningSteps?: ReasoningTraceStep[]
  reasoningHeadline?: string | null
}

export function ChatProcessStatusBar({
  visible,
  status,
  progress,
  message,
  reasoningSteps = [],
  reasoningHeadline,
}: ChatProcessStatusBarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))
  const isProcessing = status === "submitted" || status === "streaming"
  const isError = status === "error"
  const showProgress = visible

  const derivedReasoningHeadline = useMemo(() => {
    if (reasoningHeadline && reasoningHeadline.trim()) return reasoningHeadline
    if (reasoningSteps.length === 0) return null

    const running = reasoningSteps.find((step) => step.status === "running")
    if (running) return `Sedang ${lowerFirst(running.label)}...`

    const errored = reasoningSteps.find((step) => step.status === "error")
    if (errored) return `Terjadi kendala saat ${lowerFirst(errored.label)}.`

    return "Selesai menyusun jawaban."
  }, [reasoningHeadline, reasoningSteps])

  const shouldShow = visible || Boolean(derivedReasoningHeadline)
  if (!shouldShow) return null

  return (
    <>
      <div className="pb-2" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
        <div
          className={cn(
            "rounded-lg border px-3 py-2",
            "bg-[var(--chat-card)] border-[color:var(--chat-border)] text-[var(--chat-secondary-foreground)]"
          )}
          role="status"
          aria-live="polite"
          aria-label={message}
        >
          {showProgress && (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-mono font-medium tracking-wide">{message}</span>
                <span className="text-[11px] font-mono text-[var(--chat-muted-foreground)]">{safeProgress}%</span>
              </div>

              <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--chat-muted)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out",
                    isError
                      ? "bg-[var(--chat-destructive)]"
                      : "bg-[var(--chat-success)]",
                    isProcessing && "animate-pulse"
                  )}
                  style={{ width: `${safeProgress}%` }}
                />
              </div>
            </>
          )}

          {derivedReasoningHeadline && (
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="mt-2 flex w-full items-center justify-between rounded-md border border-[color:var(--chat-border)]/80 px-2.5 py-2 text-left hover:bg-[var(--chat-muted)]/40"
              aria-label="Buka aktivitas berpikir model"
            >
              <span className="text-[11px] font-mono text-[var(--chat-foreground)]">
                {derivedReasoningHeadline}
              </span>
              <span className="text-[11px] font-mono text-[var(--chat-muted-foreground)]">Lihat aktivitas</span>
            </button>
          )}
        </div>
      </div>

      {derivedReasoningHeadline && reasoningSteps.length > 0 && (
        <ReasoningActivityPanel
          open={isPanelOpen}
          onOpenChange={setIsPanelOpen}
          headline={derivedReasoningHeadline}
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
