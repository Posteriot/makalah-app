"use client"

import { useState, useMemo } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { NavArrowDown, NavArrowUp } from "iconoir-react"
import { ToolStateIndicator, getToolLabel } from "./ToolStateIndicator"
import { SearchStatusIndicator } from "./SearchStatusIndicator"
import type { SearchStatus } from "./SearchStatusIndicator"
import type { TaskItem } from "@/lib/paper/task-derivation"

// --- Types ---

interface TaskSummaryData {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
}

export interface ProcessTool {
  toolName: string
  state: string
  errorText?: string
}

export interface SearchStatusData {
  status: SearchStatus
  message?: string
  sourceCount?: number
}

interface UnifiedProcessCardProps {
  taskSummary: TaskSummaryData | null
  processTools: ProcessTool[]
  searchStatus: SearchStatusData | null
  persistProcessIndicators: boolean
  isStreaming?: boolean
  defaultOpen?: boolean
}

// --- Constants (ported from TaskProgress.tsx) ---

const STATUS_ICON: Record<string, string> = {
  complete: "✅",
  pending: "○",
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  gagasan: "Eksplorasi ide awal, analisis kelayakan, dan tentukan angle penelitian yang unik.",
  topik: "Definisikan judul, spesifikasi angle, dan identifikasi research gap.",
  outline: "Susun struktur paper lengkap dengan estimasi panjang tiap bagian.",
  abstrak: "Sintesis gagasan dan topik menjadi ringkasan penelitian dengan keywords.",
  pendahuluan: "Bangun latar belakang, rumusan masalah, dan tujuan penelitian.",
  tinjauan_literatur: "Susun kerangka teoretis, review literatur, dan analisis gap.",
  metodologi: "Tentukan desain penelitian, metode pengumpulan data, dan teknik analisis.",
  hasil: "Identifikasi temuan utama dan tentukan format penyajian data.",
  diskusi: "Interpretasi temuan, bandingkan dengan literatur, dan analisis implikasi.",
  kesimpulan: "Ringkas hasil, jawab rumusan masalah, dan susun saran.",
  pembaruan_abstrak: "Perbarui abstrak berdasarkan seluruh konten paper yang sudah ditulis.",
  daftar_pustaka: "Kompilasi seluruh referensi dari semua tahap dalam format APA.",
  lampiran: "Susun material pendukung (tabel, instrumen, data mentah).",
  judul: "Evaluasi opsi judul berdasarkan cakupan keyword dan pilih yang terbaik.",
}

// --- Component ---

export function UnifiedProcessCard({
  taskSummary,
  processTools,
  searchStatus,
  persistProcessIndicators,
  isStreaming = false,
  defaultOpen = false,
}: UnifiedProcessCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  const hasTaskData = taskSummary !== null && taskSummary.tasks.length > 0
  const showSearch = (persistProcessIndicators || searchStatus?.status === "error") && searchStatus != null
  const hasProcessData = processTools.length > 0 || showSearch

  // --- Header label logic (must be before early return — hooks cannot be conditional) ---
  const activeProcessLabel = useMemo(() => {
    // Priority 1: active search
    if (searchStatus && searchStatus.status !== "done" && searchStatus.status !== "off") {
      return searchStatus.message ?? "Mencari..."
    }
    // Priority 2: first active tool (stable — doesn't flicker)
    const activeTool = processTools.find(
      (t) => t.state !== "result" && t.state !== "output-available"
    )
    if (activeTool) {
      return getToolLabel(activeTool.toolName)
    }
    // Priority 3: search done with source count
    if (searchStatus?.status === "done" && searchStatus.sourceCount) {
      return `Pencarian selesai (${searchStatus.sourceCount} sumber)`
    }
    // Priority 4: last completed tool (when persisting indicators)
    if (persistProcessIndicators && processTools.length > 0) {
      const lastTool = processTools[processTools.length - 1]
      return getToolLabel(lastTool.toolName)
    }
    return null
  }, [processTools, searchStatus, persistProcessIndicators])

  const description = hasTaskData ? (STAGE_DESCRIPTIONS[taskSummary.stageId] ?? "") : ""

  // Nothing to show (but always show when streaming — instant feedback)
  if (!hasTaskData && !hasProcessData && !isStreaming) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden">
        {/* Header — always visible */}
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between gap-2 py-2",
              "text-left transition-colors",
              "hover:bg-[var(--chat-accent)] rounded-action"
            )}
          >
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              {hasTaskData ? (
                <>
                  <span className="text-xs font-mono font-semibold text-[var(--chat-muted-foreground)] truncate">
                    {taskSummary.stageLabel}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)] shrink-0">
                    {taskSummary.completed}/{taskSummary.total}
                  </span>
                </>
              ) : (
                <span className="text-xs font-mono text-[var(--chat-muted-foreground)] truncate">
                  {activeProcessLabel ?? "Memproses..."}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(activeProcessLabel || isStreaming) && (
                <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)] truncate max-w-[200px]">
                  {activeProcessLabel ?? "Memproses..."}
                </span>
              )}
              {isStreaming && (
                <span className="flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--chat-muted-foreground)] animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--chat-muted-foreground)] animate-pulse [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--chat-muted-foreground)] animate-pulse [animation-delay:300ms]" />
                </span>
              )}
              {open
                ? <NavArrowUp className="h-3.5 w-3.5 text-[var(--chat-muted-foreground)]" />
                : <NavArrowDown className="h-3.5 w-3.5 text-[var(--chat-muted-foreground)]" />
              }
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Content — collapsible detail */}
        <CollapsibleContent>
          <div className="pb-2 pt-1">
            {/* Description */}
            {description && (
              <p className="text-[11px] font-sans text-[var(--chat-muted-foreground)] leading-relaxed mb-2">
                {description}
              </p>
            )}

            {/* LANGKAH section */}
            {hasTaskData && (
              <div className="mb-2">
                <div className="text-[10px] font-mono font-semibold text-[var(--chat-muted-foreground)] uppercase tracking-wider mb-1.5">
                  Langkah
                </div>
                <div className="space-y-0.5">
                  {taskSummary.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-2 py-0.5 text-xs font-mono",
                        task.status === "complete" && "text-[var(--chat-muted-foreground)]",
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
              </div>
            )}

            {/* PROSES section */}
            {hasProcessData && (
              <div>
                {hasTaskData && (
                  <div className="text-[10px] font-mono font-semibold text-[var(--chat-muted-foreground)] uppercase tracking-wider mb-1.5">
                    Proses
                  </div>
                )}
                <div className="space-y-0.5">
                  {showSearch && searchStatus && (
                    <SearchStatusIndicator
                      status={searchStatus.status}
                      message={searchStatus.message}
                      sourceCount={searchStatus.sourceCount}
                    />
                  )}
                  {processTools.map((tool, index) => (
                    <ToolStateIndicator
                      key={`tool-${tool.toolName}-${index}`}
                      toolName={tool.toolName}
                      state={tool.state}
                      errorText={tool.errorText}
                      persistUntilDone={persistProcessIndicators}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
