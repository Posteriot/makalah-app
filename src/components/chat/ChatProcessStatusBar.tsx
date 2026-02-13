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
          "bg-slate-100/80 border-slate-300/70 text-slate-700",
          "dark:bg-slate-800/70 dark:border-slate-700/70 dark:text-slate-200"
        )}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-mono font-medium tracking-wide">{message}</span>
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">{safeProgress}%</span>
        </div>

        <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out",
              isError
                ? "bg-rose-500 dark:bg-rose-400"
                : "bg-emerald-600 dark:bg-emerald-400",
              isProcessing && "animate-pulse"
            )}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
