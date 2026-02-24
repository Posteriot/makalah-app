"use client"

import { useState } from "react"
import { NavArrowDown, NavArrowRight } from "iconoir-react"
import { RefrasaIssueItem } from "@/components/refrasa/RefrasaIssueItem"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { RefrasaIssue } from "@/lib/refrasa/types"

interface MobileRefrasaIssuesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  issues: RefrasaIssue[]
}

export function MobileRefrasaIssuesSheet({
  open,
  onOpenChange,
  issues,
}: MobileRefrasaIssuesSheetProps) {
  const [naturalnessOpen, setNaturalnessOpen] = useState(true)
  const [styleOpen, setStyleOpen] = useState(false)

  const naturalnessIssues = issues.filter((i) => i.category === "naturalness")
  const styleIssues = issues.filter((i) => i.category === "style")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[70vh] rounded-t-shell border-t border-[color:var(--chat-border)] bg-[var(--chat-background)] p-0 [&>button]:hidden"
        data-chat-scope=""
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-0 pt-1">
          <div className="h-1 w-10 rounded-full bg-[var(--chat-muted)]" />
        </div>

        <SheetHeader className="gap-0.5 px-4 pb-1.5 pt-1">
          <SheetTitle className="text-left font-sans text-sm font-semibold text-[var(--chat-foreground)]">
            Masalah Refrasa
          </SheetTitle>
          <p className="font-mono text-[11px] text-[var(--chat-muted-foreground)]">
            {issues.length} masalah ditemukan
          </p>
        </SheetHeader>

        <div className="overflow-y-auto px-4 pb-4 pt-2">
          <div className="space-y-3">
            {naturalnessIssues.length > 0 && (
              <Collapsible open={naturalnessOpen} onOpenChange={setNaturalnessOpen}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                  {naturalnessOpen ? (
                    <NavArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <NavArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  Naturalness ({naturalnessIssues.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-1">
                  {naturalnessIssues.map((issue, index) => (
                    <RefrasaIssueItem key={`nat-${index}`} issue={issue} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {styleIssues.length > 0 && (
              <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                  {styleOpen ? (
                    <NavArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <NavArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  Style ({styleIssues.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-1">
                  {styleIssues.map((issue, index) => (
                    <RefrasaIssueItem key={`sty-${index}`} issue={issue} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
