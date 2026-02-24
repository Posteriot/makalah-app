"use client"

import { useState } from "react"
import { Download, EditPencil, Copy, Check, Expand, MoreVert, Xmark } from "iconoir-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefrasaSquareIcon } from "./RefrasaSquareIcon"
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

interface ArtifactToolbarProps {
  /** Selected artifact data */
  artifact: {
    title: string
    type: string
    version: number
    createdAt: number
    contentLength: number
    wordCount: number
    contentTypeLabel: string
  } | null
  /** Number of open tabs for context label */
  openTabCount?: number
  /** Callbacks for actions — connected to ArtifactViewer ref */
  onDownload?: (format: "docx" | "pdf" | "txt") => void
  onEdit?: () => void
  onRefrasa?: () => void
  onCopy?: () => void
  onExpand?: () => void
  onClosePanel?: () => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * ArtifactToolbar - Contextual document header + prioritized actions.
 *
 * Layer 1: active document context (title/type/version/date).
 * Layer 2: workflow actions grouped by priority:
 * - Primary: Edit, Refrasa
 * - Utility: Download, Copy, Fullscreen
 */
export function ArtifactToolbar({
  artifact,
  openTabCount = 0,
  onDownload,
  onEdit,
  onRefrasa,
  onCopy,
  onExpand,
  onClosePanel,
}: ArtifactToolbarProps) {
  const [copied, setCopied] = useState(false)

  if (!artifact) return null

  const handleCopy = () => {
    onCopy?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const isRefrasaReady = artifact.contentLength >= 50

  const iconActionClass =
    "h-8 w-8 rounded-action text-[var(--chat-muted-foreground)] transition-colors hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
  const sidebarButtonSurfaceClass =
    "border-[color:var(--chat-border)] bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)] hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-card-foreground)]"

  return (
    <div
      className={cn(
        "@container/toolbar",
        "shrink-0 border-b border-[color:var(--chat-border)] bg-inherit px-3 py-2"
      )}
    >
      {/* Layer 1: Active document context */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 hidden @[520px]/toolbar:block">
          <p className="truncate text-lg font-semibold text-[var(--chat-card-foreground)]">
            {artifact.title}
          </p>
        </div>

        <div className="min-w-0 @[520px]/toolbar:hidden">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)]">
            Artifak Aktif
          </p>
          <p className="truncate text-sm font-medium text-[var(--chat-card-foreground)]">
            {artifact.title}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="h-5 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0 text-[10px] font-mono text-[var(--chat-secondary-foreground)]"
            >
              v{artifact.version}
            </Badge>
            <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)]">
              {formatDate(artifact.createdAt)}
            </span>
            <span className="hidden @[460px]/toolbar:inline text-[10px] font-mono text-[var(--chat-muted-foreground)]">
              • {openTabCount} tab
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-1 @[520px]/toolbar:flex">
          {onExpand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    iconActionClass,
                    "border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)] hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-card-foreground)]"
                  )}
                  onClick={onExpand}
                  aria-label="Buka fullscreen"
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Fullscreen</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1 @[520px]/toolbar:hidden">
          {onExpand && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconActionClass}
                  onClick={onExpand}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Fullscreen</TooltipContent>
            </Tooltip>
          )}
          {onClosePanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconActionClass}
                  onClick={onClosePanel}
                >
                  <Xmark className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Tutup panel</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Layer 2: Prioritized actions */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[color:var(--chat-border)] pt-2">
        {/* Wide layout */}
        <div className="hidden @[520px]/toolbar:flex min-w-0 items-center gap-1.5">
          <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--chat-secondary-foreground)]">
            {artifact.contentTypeLabel}
          </span>
          <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--chat-secondary-foreground)]">
            {artifact.wordCount} kata
          </span>
          <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--chat-secondary-foreground)]">
            {artifact.contentLength} karakter
          </span>
        </div>

        <div className="hidden @[520px]/toolbar:flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onEdit}
                className={cn(
                  "h-8 w-8 rounded-action border transition-all duration-150",
                  sidebarButtonSurfaceClass
                )}
                aria-label="Edit"
              >
                <EditPencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className={cn(
                  "h-8 w-8 rounded-action border transition-all duration-150",
                  sidebarButtonSurfaceClass,
                  copied && "border-[color:var(--chat-border)] bg-[var(--chat-success)] text-[var(--chat-primary-foreground)]"
                )}
                aria-label={copied ? "Disalin" : "Salin"}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">{copied ? "Disalin" : "Salin"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onRefrasa}
                className={cn(
                  "h-8 w-8 rounded-action border transition-all duration-150",
                  sidebarButtonSurfaceClass,
                  !isRefrasaReady && "text-[var(--chat-muted-foreground)] hover:text-[var(--chat-muted-foreground)]"
                )}
                aria-label="Refrasa"
              >
                <RefrasaSquareIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">
              {isRefrasaReady ? "Refrasa" : "Refrasa (min. 50 karakter)"}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-action border transition-all duration-150",
                      sidebarButtonSurfaceClass
                    )}
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Download</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="font-mono text-xs">
              <DropdownMenuItem onClick={() => onDownload?.("docx")}>DOCX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("txt")}>TXT</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Compact layout */}
        <div className="flex w-full items-center justify-between gap-2 @[520px]/toolbar:hidden">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-mono text-[var(--chat-muted-foreground)]">
            <span className="truncate rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5">
              {artifact.contentTypeLabel}
            </span>
            <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5">
              {artifact.wordCount} kata
            </span>
            <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5">
              {artifact.contentLength} karakter
            </span>
          </div>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={iconActionClass} aria-label="Aksi dokumen">
                    <MoreVert className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Aksi dokumen</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <EditPencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRefrasa}>
                <RefrasaSquareIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Refrasa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onDownload?.("docx")}>DOCX</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload?.("pdf")}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload?.("txt")}>TXT</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={handleCopy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Salin
              </DropdownMenuItem>
              {onExpand && (
                <DropdownMenuItem onClick={onExpand}>
                  <Expand className="mr-2 h-4 w-4" />
                  Fullscreen
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
