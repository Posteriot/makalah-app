"use client"

import { useState } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface SearchStatus {
  status: "searching" | "fetching-content" | "composing" | "done" | "error" | "off"
  message?: string
  sourceCount?: number
}

interface ChainOfThoughtProps {
  searchStatus: SearchStatus | null
  internalThought: string | null
  toolCalls?: { toolName: string; state: string; errorText?: string }[]
  defaultOpen?: boolean
}

type StepStatus = "complete" | "active" | "pending" | "error"

function mapSearchStatusToStep(status: SearchStatus["status"]): StepStatus {
  switch (status) {
    case "searching":
    case "fetching-content":
      return "active"
    case "composing":
    case "done":
      return "complete"
    case "error":
      return "error"
    case "off":
      return "pending"
  }
}

const STEP_ICON: Record<StepStatus, string> = {
  complete: "✅",
  active: "🔍",
  pending: "○",
  error: "⚠️",
}

function mapToolStateToStepStatus(state: string): StepStatus {
  switch (state) {
    case "output-available":
    case "result":
      return "complete"
    case "output-error":
    case "error":
      return "error"
    default: // "input-available", "partial-call", etc.
      return "active"
  }
}

const TOOL_LABELS: Record<string, string> = {
  startPaperSession: "Memulai sesi paper",
  getCurrentPaperState: "Mengambil status paper",
  updateStageData: "Menyimpan data tahap",
  createArtifact: "Membuat artifact",
  submitStageForValidation: "Mengirim untuk validasi",
  compileDaftarPustaka: "Kompilasi daftar pustaka",
}

function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName
}

function extractDomains(message?: string): string[] {
  if (!message) return []
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g
  const domains: string[] = []
  let match
  while ((match = urlPattern.exec(message)) !== null) {
    domains.push(match[1])
  }
  return [...new Set(domains)]
}

export function ChainOfThought({
  searchStatus,
  internalThought,
  toolCalls,
  defaultOpen = false,
}: ChainOfThoughtProps) {
  const [open, setOpen] = useState(defaultOpen)

  // Render nothing if no data
  if (!searchStatus && !internalThought && (!toolCalls || toolCalls.length === 0)) return null
  // Don't render for "off" status with no thought and no tool calls
  if (searchStatus?.status === "off" && !internalThought && (!toolCalls || toolCalls.length === 0)) return null

  const stepStatus = searchStatus ? mapSearchStatusToStep(searchStatus.status) : null
  const domains = searchStatus ? extractDomains(searchStatus.message) : []

  const stepLabel = searchStatus
    ? searchStatus.status === "error"
      ? searchStatus.message || "Galat pada pencarian"
      : searchStatus.status === "done"
        ? `Pencarian selesai${searchStatus.sourceCount ? ` (${searchStatus.sourceCount} sumber)` : ""}`
        : searchStatus.message || "Pencarian internet..."
    : null

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
        <div className="mt-1 space-y-1.5 pl-3">
          {/* Search step */}
          {stepStatus && stepLabel && (
            <div className="space-y-1">
              <div
                className={cn(
                  "flex items-center gap-2 text-xs font-mono",
                  stepStatus === "error" && "text-[var(--chat-destructive)]",
                  stepStatus === "active" && "text-[var(--chat-foreground)]",
                  stepStatus === "complete" && "text-[var(--chat-muted-foreground)]",
                )}
              >
                <span className="w-4 text-center shrink-0">
                  {STEP_ICON[stepStatus]}
                </span>
                <span>{stepLabel}</span>
              </div>
              {/* Source domain badges */}
              {domains.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-6">
                  {domains.map((domain) => (
                    <Badge
                      key={domain}
                      variant="secondary"
                      className="text-[10px] font-mono px-1.5 py-0"
                    >
                      {domain}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tool call steps */}
          {toolCalls && toolCalls.length > 0 && (
            toolCalls.map((tool, index) => {
              const toolStatus = mapToolStateToStepStatus(tool.state)
              const toolLabel = getToolLabel(tool.toolName)
              return (
                <div
                  key={`tool-${index}`}
                  className={cn(
                    "flex items-center gap-2 text-xs font-mono",
                    toolStatus === "active" && "text-[var(--chat-foreground)]",
                    toolStatus === "complete" && "text-[var(--chat-muted-foreground)]",
                    toolStatus === "error" && "text-[var(--chat-destructive)]",
                  )}
                >
                  <span className="w-4 text-center shrink-0">
                    {STEP_ICON[toolStatus]}
                  </span>
                  <span>{toolLabel}</span>
                  {tool.errorText && toolStatus === "error" && (
                    <span className="text-[10px] opacity-70 truncate max-w-[200px]">
                      — {tool.errorText}
                    </span>
                  )}
                </div>
              )
            })
          )}

          {/* Internal thought */}
          {internalThought && (
            <div className="text-xs font-sans text-[var(--chat-muted-foreground)] pl-6 leading-relaxed">
              {internalThought}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
