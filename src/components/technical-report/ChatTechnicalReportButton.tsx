"use client"

import { useState } from "react"
import { WarningTriangle } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TechnicalReportForm } from "./TechnicalReportForm"

type ChatTechnicalReportButtonProps = {
  conversationId?: Id<"conversations"> | null
  paperSessionId?: Id<"paperSessions"> | null
  initialSnapshot?: Record<string, unknown>
  autoTriggered?: boolean
  compact?: boolean
  triggerVariant?: "auto" | "outline" | "destructive"
  className?: string
}

export function ChatTechnicalReportButton({
  conversationId,
  paperSessionId,
  initialSnapshot,
  autoTriggered = false,
  compact = false,
  triggerVariant = "auto",
  className,
}: ChatTechnicalReportButtonProps) {
  const [open, setOpen] = useState(false)
  const resolvedVariant =
    triggerVariant === "auto"
      ? (autoTriggered ? "destructive" : "outline")
      : triggerVariant

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <button
            type="button"
            className={cn(
              "text-[var(--chat-muted-foreground)] active:text-[var(--chat-foreground)] transition-colors duration-150",
              autoTriggered && "text-[var(--chat-destructive)]",
              className
            )}
            aria-label="Laporkan masalah teknis"
            title="Laporkan masalah teknis"
          >
            <WarningTriangle className="h-5 w-5" strokeWidth={1.5} />
          </button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={resolvedVariant}
            className={cn("h-8 rounded-action text-xs font-medium font-sans", className)}
          >
            <WarningTriangle className="h-3.5 w-3.5" />
            Laporkan Masalah
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Laporkan Masalah Chat</DialogTitle>
          <DialogDescription>
            Ceritakan kendala teknis yang lo temuin saat chat atau paper session.
          </DialogDescription>
        </DialogHeader>

        <TechnicalReportForm
          source="chat-inline"
          initialConversationId={conversationId ?? undefined}
          initialPaperSessionId={paperSessionId ?? undefined}
          initialSnapshot={initialSnapshot}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
