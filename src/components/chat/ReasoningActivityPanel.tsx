"use client"

import { useEffect, useMemo, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ReasoningTracePanel, type ReasoningTraceStep } from "./ReasoningTracePanel"

interface ReasoningActivityPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  headline: string
  steps: ReasoningTraceStep[]
}

export function ReasoningActivityPanel({
  open,
  onOpenChange,
  headline,
  steps,
}: ReasoningActivityPanelProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(media.matches)
    sync()

    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  const orderedSteps = useMemo(
    () => steps.slice().sort((a, b) => (a.progress === b.progress ? (a.ts ?? 0) - (b.ts ?? 0) : a.progress - b.progress)),
    [steps]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "h-[80vh] overflow-y-auto" : "w-[420px] max-w-[90vw] overflow-y-auto p-0 sm:max-w-[420px]"}
      >
        <SheetHeader className="border-b border-[color:var(--chat-border)] px-4 py-4 pr-12">
          <SheetTitle className="text-sm font-mono text-[var(--chat-foreground)]">Apa yang dipikirkan model</SheetTitle>
          <p className="text-xs font-mono text-[var(--chat-muted-foreground)]">{headline}</p>
        </SheetHeader>

        <div className="px-4 py-4">
          <ReasoningTracePanel steps={orderedSteps} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
