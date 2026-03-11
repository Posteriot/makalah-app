"use client"

import { type ReactNode } from "react"
import { Settings, Xmark } from "iconoir-react"
import { cn } from "@/lib/utils"

interface WorkspacePanelShellProps {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function WorkspacePanelShell({
  title,
  onClose,
  children,
  className,
}: WorkspacePanelShellProps) {
  return (
    <section
      data-chat-scope=""
      className={cn(
        "flex h-full min-h-0 flex-col bg-[var(--chat-card)] text-[var(--chat-foreground)]",
        className
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--chat-border)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-action bg-transparent text-[var(--chat-muted-foreground)]">
            <Settings className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold tracking-tight text-[var(--chat-foreground)]">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-action",
            "text-[var(--chat-muted-foreground)] transition-colors duration-150",
            "hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)]"
          )}
          aria-label={`Tutup panel ${title}`}
        >
          <Xmark className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  )
}
