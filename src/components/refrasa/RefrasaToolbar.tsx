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
  ViewColumns2,
  MoreVert,
} from "iconoir-react"
import type { Doc, Id } from "@convex/_generated/dataModel"
import type { RefrasaIssue } from "@/lib/refrasa/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  showCompare?: boolean
  onToggleCompare?: () => void
}

const iconBtnClass =
  "flex h-8 w-8 items-center justify-center rounded-action text-[var(--chat-muted-foreground)] transition-colors hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"

const collapsibleTriggerClass =
  "flex items-center gap-1.5 rounded-sm text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"

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
  showCompare = false,
  onToggleCompare,
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

  const applyBtnClass = cn(
    "h-7 px-2.5 font-mono text-[11px] text-[var(--chat-secondary-foreground)]",
    isApplied
      ? "bg-[var(--chat-success)] text-[var(--chat-success-foreground)] hover:bg-[var(--chat-success)]"
      : "bg-[var(--chat-secondary)] hover:bg-[var(--chat-accent)] transition-colors"
  )

  const applyContent = (
    <>
      {isApplying ? (
        <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Check className="mr-1.5 h-3.5 w-3.5" />
      )}
      {isApplying ? "Menerapkan..." : isApplied ? "Diterapkan" : "Terapkan"}
    </>
  )

  return (
    <div
      className={cn(
        "@container/toolbar",
        "shrink-0 border-b border-[color:var(--chat-border)] bg-inherit px-3 py-2"
      )}
    >
      {/* Layer 1: Document context */}
      <div className="flex items-start justify-between gap-2">
        {/* Wide (≥520px): inline title */}
        <div className="hidden min-w-0 @[520px]/toolbar:block">
          <p className="truncate text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)]">
            REFRASA: {sourceTitle}
          </p>
        </div>

        {/* Compact (<520px): stacked label + title + version */}
        <div className="min-w-0 @[520px]/toolbar:hidden">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)]">
            Refrasa Aktif
          </p>
          <p className="truncate text-sm font-medium text-[var(--chat-card-foreground)]">
            {sourceTitle}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {versions.length > 1 ? (
              <Select
                value={artifact._id}
                onValueChange={(value) => onVersionChange(value as Id<"artifacts">)}
              >
                <SelectTrigger
                  size="sm"
                  className="h-5 w-auto min-w-0 gap-1 border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 font-mono text-[10px] text-[var(--chat-secondary-foreground)] hover:bg-[var(--chat-accent)]"
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
            ) : (
              <Badge
                variant="secondary"
                className="h-5 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0 text-[10px] font-mono text-[var(--chat-secondary-foreground)]"
              >
                v{artifact.version}
              </Badge>
            )}
            {versions.length > 1 && (
              <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)]">
                {versions.length} versi
              </span>
            )}
          </div>
        </div>

        {/* Wide: version select + expand */}
        <div className="hidden items-center gap-1.5 @[520px]/toolbar:flex">
          {versions.length > 1 && (
            <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--chat-secondary-foreground)]">
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
                className="h-6 w-auto min-w-0 gap-1 border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 font-mono text-[10px] text-[var(--chat-secondary-foreground)] hover:bg-[var(--chat-accent)]"
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
          {onExpand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    iconBtnClass,
                    "border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)] hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-card-foreground)]"
                  )}
                  onClick={onExpand}
                  aria-label="Fullscreen"
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Fullscreen</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Compact: expand */}
        <div className="flex items-center gap-1 @[520px]/toolbar:hidden">
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
        </div>
      </div>

      {/* Layer 2: Actions */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[color:var(--chat-border)] pt-2">
        {/* Left: Issues badge (always visible, rendered once) */}
        <div className="relative flex min-w-0 items-center gap-1.5" ref={issuesPanelRef}>
          {issues.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowIssues((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-badge border px-1.5 py-0.5 text-[10px] font-mono font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]",
                    showIssues
                      ? "border-[color:var(--chat-border)] bg-[var(--chat-secondary)] text-[var(--chat-foreground)]"
                      : "border-[color:var(--chat-border)] bg-[var(--chat-accent)] text-[var(--chat-foreground)] hover:bg-[var(--chat-secondary)]"
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
                  className="flex h-8 w-8 cursor-default items-center justify-center rounded-action text-[var(--chat-muted-foreground)]"
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
            <div className="absolute left-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-card)] shadow-lg">
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
                          {naturalnessIssues.map((issue, index) => (
                            <RefrasaIssueItem
                              key={`nat-${issue.type}-${issue.severity}-${issue.message.slice(0, 30)}-${index}`}
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
                          {styleIssues.map((issue, index) => (
                            <RefrasaIssueItem
                              key={`sty-${issue.type}-${issue.severity}-${issue.message.slice(0, 30)}-${index}`}
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

        {/* Right: Wide action buttons (≥520px) */}
        <div className="hidden @[520px]/toolbar:flex items-center gap-1.5">
          {/* Compare */}
          {onToggleCompare && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCompare}
                  className={cn(
                    iconBtnClass,
                    showCompare && "bg-[var(--chat-info)] text-[var(--chat-info-foreground)]"
                  )}
                  aria-label="Bandingkan"
                >
                  <ViewColumns2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">
                {showCompare ? "Tutup perbandingan" : "Bandingkan asli vs refrasa"}
              </TooltipContent>
            </Tooltip>
          )}

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
                className={cn(iconBtnClass, "hover:text-[var(--chat-foreground)]")}
                aria-label="Hapus"
              >
                <Trash className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Hapus</TooltipContent>
          </Tooltip>

          {/* Apply */}
          <Button
            size="sm"
            onClick={onApply}
            disabled={isApplying || isApplied}
            className={applyBtnClass}
          >
            {applyContent}
          </Button>
        </div>

        {/* Right: Compact overflow + apply (<520px) */}
        <div className="flex items-center gap-1.5 @[520px]/toolbar:hidden">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={iconBtnClass}
                    aria-label="Aksi dokumen"
                  >
                    <MoreVert className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Aksi dokumen</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {onToggleCompare && (
                <DropdownMenuItem onClick={onToggleCompare}>
                  <ViewColumns2 className="mr-2 h-4 w-4" />
                  {showCompare ? "Tutup perbandingan" : "Bandingkan"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onDownload("docx")}>DOCX</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload("pdf")}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload("txt")}>TXT</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={handleCopy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Salin
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete}>
                <Trash className="mr-2 h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Apply — always visible as primary CTA */}
          <Button
            size="sm"
            onClick={onApply}
            disabled={isApplying || isApplied}
            className={applyBtnClass}
          >
            {applyContent}
          </Button>
        </div>
      </div>
    </div>
  )
}
