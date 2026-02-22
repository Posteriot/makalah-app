"use client"

import { cn } from "@/lib/utils"

type ChatProcessStatus = "submitted" | "streaming" | "ready" | "error" | "stopped"

interface ChatProcessStatusBarProps {
  visible: boolean
  status: ChatProcessStatus
  progress: number
  message: string
}

export function ChatProcessStatusBar({
  visible,
  status,
  progress,
  message,
}: ChatProcessStatusBarProps) {
  if (!visible) return null

  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))
  const isProcessing = status === "submitted" || status === "streaming"
  const isError = status === "error"

  return (
    <div className="pb-2" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
      <div
        className={cn(
          "rounded-lg border px-3 py-2",
          "bg-[var(--ds-status-surface)] border-[color:var(--ds-status-border)] text-[var(--ds-text-muted-strong)]"
        )}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-mono font-medium tracking-wide">{message}</span>
          <span className="text-[11px] font-mono text-[var(--ds-text-muted)]">{safeProgress}%</span>
        </div>

        <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--ds-status-track-bg)]">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out",
              isError
                ? "bg-[var(--ds-status-progress-error)]"
                : "bg-[var(--ds-status-progress-success)]",
              isProcessing && "animate-pulse"
            )}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
