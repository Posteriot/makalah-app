"use client"

import { useState } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { TaskItem } from "@/lib/paper/task-derivation"

interface TaskProgressProps {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
  defaultOpen?: boolean
}

const STATUS_ICON: Record<string, string> = {
  complete: "✅",
  active: "🔄",
  pending: "○",
}

export function TaskProgress({
  stageLabel,
  tasks,
  completed,
  total,
  defaultOpen = false,
}: TaskProgressProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (tasks.length === 0) return null

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
            <span>📋</span>
            <span className="font-medium text-[var(--chat-foreground)]">
              {stageLabel}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span>{completed}/{total} tasks</span>
            <span className="text-[10px]">{open ? "▴" : "▾"}</span>
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-0.5 pl-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2 py-0.5 text-xs font-mono",
                task.status === "complete" && "text-[var(--chat-muted-foreground)]",
                task.status === "active" && "text-[var(--chat-foreground)]",
                task.status === "pending" && "text-[var(--chat-muted-foreground)] opacity-50"
              )}
            >
              <span className="w-4 text-center shrink-0">
                {STATUS_ICON[task.status]}
              </span>
              <span>{task.label}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
