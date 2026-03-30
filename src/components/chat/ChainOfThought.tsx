"use client"

import { useState, type ReactNode } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface ChainOfThoughtProps {
  children: ReactNode
  defaultOpen?: boolean
}

export function ChainOfThought({
  children,
  defaultOpen = false,
}: ChainOfThoughtProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-action px-3 py-1.5",
            "text-xs font-mono transition-colors",
            "bg-[var(--chat-muted)] hover:bg-[var(--chat-accent)]",
            "text-[var(--chat-muted-foreground)]",
            "border border-[color:var(--chat-border)]"
          )}
        >
          <span className="flex items-center gap-1.5">
            <span>ⓘ</span>
            <span className="font-medium text-[var(--chat-foreground)]">
              Chain of Thought
            </span>
          </span>
          <span className="text-[10px]">{open ? "▴" : "▾"}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-0.5 pl-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
