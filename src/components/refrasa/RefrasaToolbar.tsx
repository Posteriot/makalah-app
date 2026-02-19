"use client"

import { useState, useRef, useEffect } from "react"
import {
  Download,
  Copy,
  Check,
  Trash,
  WarningTriangle,
  DocMagnifyingGlass,
  NavArrowDown,
  NavArrowRight,
  Expand,
} from "iconoir-react"
import type { Doc, Id } from "@convex/_generated/dataModel"
import type { RefrasaIssue } from "@/lib/refrasa/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefrasaIssueItem } from "./RefrasaIssueItem"

interface RefrasaToolbarProps {
  artifact: Doc<"artifacts">
  sourceTitle: string
  versions: { _id: Id<"artifacts">; version: number }[]
  issues: RefrasaIssue[]
  onVersionChange: (id: Id<"artifacts">) => void
  onApply: () => void
  onDelete: () => void
  onCopy: () => void
  onDownload: (format: "docx" | "pdf" | "txt") => void
  isApplying?: boolean
  isApplied?: boolean
  onExpand?: () => void
}

const iconBtnClass =
  "flex h-8 w-8 items-center justify-center rounded-action text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-slate-100"

const collapsibleTriggerClass =
  "flex items-center gap-1.5 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-slate-400 dark:hover:text-slate-100"

export function RefrasaToolbar({
  artifact,
  sourceTitle,
  versions,
  issues,
  onVersionChange,
  onApply,
  onDelete,
  onCopy,
  onDownload,
  isApplying = false,
  isApplied = false,
  onExpand,
}: RefrasaToolbarProps): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const [naturalnessOpen, setNaturalnessOpen] = useState(true)
  const [styleOpen, setStyleOpen] = useState(true)
  const issuesPanelRef = useRef<HTMLDivElement>(null)

  const naturalnessIssues = issues.filter((i) => i.category === "naturalness")
  const styleIssues = issues.filter((i) => i.category === "style")

  useEffect(() => {
    if (!showIssues) return

    function handleClick(e: MouseEvent) {
      if (issuesPanelRef.current && !issuesPanelRef.current.contains(e.target as Node)) {
        setShowIssues(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowIssues(false)
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [showIssues])

  function handleCopy() {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="shrink-0 border-b border-slate-300/75 bg-inherit px-3 py-2 dark:border-slate-700/80">
      <div className="flex items-center justify-between gap-2">
        {/* Left: source title + version select */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            REFRASA: {sourceTitle}
          </span>

          {versions.length > 1 && (
            <span className="rounded-badge border border-slate-300/80 bg-slate-200/60 px-1.5 py-px text-[10px] font-mono font-semibold text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-400">
              {versions.length} versi
            </span>
          )}

          {versions.length > 1 && (
            <Select
              value={artifact._id}
              onValueChange={(value) => onVersionChange(value as Id<"artifacts">)}
            >
              <SelectTrigger
                size="sm"
                className="h-6 w-auto min-w-0 gap-1 border-slate-300/80 bg-slate-200/80 px-1.5 font-mono text-[10px] text-slate-700 hover:bg-slate-300/80 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800/80"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                {versions.map((v) => (
                  <SelectItem key={v._id} value={v._id} className="text-[11px]">
                    v{v.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Download */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className={iconBtnClass} aria-label="Download">
                    <Download className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Download</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="font-mono text-xs">
              <DropdownMenuItem onClick={() => onDownload("docx")}>DOCX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload("txt")}>TXT</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Copy */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className={iconBtnClass}
                aria-label={copied ? "Disalin" : "Salin"}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">
              {copied ? "Disalin" : "Salin"}
            </TooltipContent>
          </Tooltip>

          {/* Delete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onDelete}
                className={cn(
                  iconBtnClass,
                  "hover:bg-rose-100/80 hover:text-rose-700 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                )}
                aria-label="Hapus"
              >
                <Trash className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Hapus</TooltipContent>
          </Tooltip>

          {/* Issues badge / icon */}
          <div className="relative" ref={issuesPanelRef}>
            {issues.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowIssues((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-badge border px-1.5 py-0.5 text-[10px] font-mono font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      showIssues
                        ? "border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-300"
                        : "border-amber-500/35 bg-amber-500/10 text-amber-700 hover:border-amber-500/50 hover:bg-amber-500/20 dark:text-amber-300 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/20"
                    )}
                    aria-label="Lihat masalah"
                    aria-expanded={showIssues}
                  >
                    <WarningTriangle className="h-3 w-3" />
                    {issues.length}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs">
                  {showIssues ? "Tutup masalah" : "Lihat masalah"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="flex h-8 w-8 cursor-default items-center justify-center rounded-action text-slate-400 dark:text-slate-600"
                    aria-label="Tidak ada masalah"
                  >
                    <DocMagnifyingGlass className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs">
                  Tidak ada masalah terdeteksi
                </TooltipContent>
              </Tooltip>
            )}

            {/* Issues floating panel */}
            {showIssues && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-action border border-slate-300/85 bg-slate-100 shadow-lg dark:border-slate-700/70 dark:bg-slate-800">
                <div className="max-h-[300px] overflow-y-auto p-3 scrollbar-thin">
                  <div className="space-y-3">
                    {naturalnessIssues.length > 0 && (
                      <Collapsible open={naturalnessOpen} onOpenChange={setNaturalnessOpen}>
                        <CollapsibleTrigger className={collapsibleTriggerClass}>
                          {naturalnessOpen
                            ? <NavArrowDown className="h-3 w-3" />
                            : <NavArrowRight className="h-3 w-3" />
                          }
                          Naturalness ({naturalnessIssues.length})
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 space-y-2">
                            {naturalnessIssues.map((issue) => (
                              <RefrasaIssueItem
                                key={`nat-${issue.type}-${issue.severity}-${issue.message.slice(0, 30)}`}
                                issue={issue}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {styleIssues.length > 0 && (
                      <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
                        <CollapsibleTrigger className={collapsibleTriggerClass}>
                          {styleOpen
                            ? <NavArrowDown className="h-3 w-3" />
                            : <NavArrowRight className="h-3 w-3" />
                          }
                          Style ({styleIssues.length})
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 space-y-2">
                            {styleIssues.map((issue) => (
                              <RefrasaIssueItem
                                key={`sty-${issue.type}-${issue.severity}-${issue.message.slice(0, 30)}`}
                                issue={issue}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expand — only in panel mode */}
          {onExpand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onExpand}
                  className={iconBtnClass}
                  aria-label="Fullscreen"
                >
                  <Expand className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Fullscreen</TooltipContent>
            </Tooltip>
          )}

          {/* Apply */}
          <Button
            size="sm"
            onClick={onApply}
            disabled={isApplying || isApplied}
            className={cn(
              "h-7 px-2.5 font-mono text-[11px] text-white",
              isApplied
                ? "bg-slate-500 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-600"
                : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            )}
          >
            {isApplying ? (
              <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isApplying ? "Menerapkan..." : isApplied ? "Diterapkan" : "Terapkan"}
          </Button>
        </div>
      </div>
    </div>
  )
}
