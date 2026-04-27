"use client"

import { cn } from "@/lib/utils"

type ChatProcessStatus = "submitted" | "streaming" | "ready" | "error" | "stopped"

interface ChatProcessStatusBarProps {
  status: ChatProcessStatus
  progress: number
}

export function ChatProcessStatusBar({
  status,
  progress,
}: ChatProcessStatusBarProps) {
  const isProcessing = status === "submitted" || status === "streaming"
  const isError = status === "error"
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))

  if (!isProcessing) return null

  if (process.env.NODE_ENV !== "production") {
    console.info(`[PROGRESS-BAR] render | status=${status} progress=${safeProgress}%`)
  }

  return (
    <div className="pb-2" style={{ paddingInline: "var(--chat-input-pad-x, 5rem)" }}>
      <div role="status" aria-live="polite">
        <div className="mb-1.5 flex w-full items-center justify-between">
          <span className="flex min-w-0 items-baseline gap-1">
            <ThinkingDots />
          </span>
          <span
            className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--chat-foreground)]"
            style={{ opacity: 0.92 }}
          >
            {safeProgress}%
          </span>
        </div>

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
    </div>
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
