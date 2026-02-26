"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ReasoningTracePanel, type ReasoningTraceStep } from "./ReasoningTracePanel"

interface ReasoningActivityPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  steps: ReasoningTraceStep[]
}

export function ReasoningActivityPanel({
  open,
  onOpenChange,
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
        className={cn(
          // Global tokens (bukan --chat-*) karena Sheet Portal render di luar [data-chat-scope]
          "overflow-y-auto border-0 bg-background p-0 text-foreground font-sans",
          // Close button: plain icon, no border/bg (like fullscreen icon ref)
          "[&>[data-slot='sheet-close']]:absolute [&>[data-slot='sheet-close']]:top-4 [&>[data-slot='sheet-close']]:right-4",
          "[&>[data-slot='sheet-close']]:flex [&>[data-slot='sheet-close']]:h-8 [&>[data-slot='sheet-close']]:w-8 [&>[data-slot='sheet-close']]:items-center [&>[data-slot='sheet-close']]:justify-center",
          "[&>[data-slot='sheet-close']]:rounded-none [&>[data-slot='sheet-close']]:border-0 [&>[data-slot='sheet-close']]:bg-transparent [&>[data-slot='sheet-close']]:shadow-none [&>[data-slot='sheet-close']]:ring-0",
          "[&>[data-slot='sheet-close']]:text-muted-foreground [&>[data-slot='sheet-close']]:opacity-60",
          "[&>[data-slot='sheet-close']]:transition-opacity [&>[data-slot='sheet-close']]:hover:opacity-100 [&>[data-slot='sheet-close']]:hover:bg-transparent",
          "[&>[data-slot='sheet-close']]:focus-visible:outline-none [&>[data-slot='sheet-close']]:focus-visible:ring-0 [&>[data-slot='sheet-close']]:focus-visible:ring-offset-0",
          isMobile ? "h-[80vh]" : "w-[420px] max-w-[90vw] sm:max-w-[420px]"
        )}
      >
        <div className="px-5 pb-6 pt-5 md:px-6">
          <SheetTitle className="mb-5 font-sans text-base font-semibold text-foreground">Proses</SheetTitle>
          <ReasoningTracePanel steps={orderedSteps} className="font-sans" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
