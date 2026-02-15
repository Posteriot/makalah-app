"use client"

import { useState } from "react"
import {
  Download,
  EditPencil,
  MagicWand,
  Copy,
  Check,
  Expand,
  MoreVert,
  Xmark,
  NavArrowDown,
} from "iconoir-react"
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

// Artifact type labels (same as ArtifactPanel)
const typeLabels: Record<string, string> = {
  code: "Code",
  outline: "Outline",
  section: "Section",
  table: "Tabel",
  citation: "Sitasi",
  formula: "Formula",
}

interface ArtifactToolbarProps {
  /** Selected artifact data */
  artifact: {
    title: string
    type: string
    version: number
    createdAt: number
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

  const iconActionClass =
    "h-8 w-8 rounded-action text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  return (
    <div
      className={cn(
        "@container/toolbar",
        "shrink-0 border-b border-border/60 bg-card/60 px-3 py-2"
      )}
    >
      {/* Layer 1: Active document context */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground/85">
            Dokumen Aktif
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {artifact.title}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="h-5 rounded-badge border-border/70 bg-background/80 px-1.5 py-0 text-[10px] font-mono capitalize"
            >
              {typeLabels[artifact.type] || artifact.type}
            </Badge>
            <Badge
              variant="secondary"
              className="h-5 rounded-badge bg-muted/70 px-1.5 py-0 text-[10px] font-mono"
            >
              v{artifact.version}
            </Badge>
            <span className="text-[10px] font-mono text-muted-foreground/80">
              {formatDate(artifact.createdAt)}
            </span>
            <span className="hidden @[460px]/toolbar:inline text-[10px] font-mono text-muted-foreground/70">
              • {openTabCount} tab
            </span>
          </div>
        </div>

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

      {/* Layer 2: Prioritized actions */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        {/* Wide layout */}
        <div className="hidden @[520px]/toolbar:flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={onEdit}
            className="h-8 rounded-action px-2.5 font-mono text-xs"
          >
            <EditPencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefrasa}
            className="h-8 rounded-action px-2.5 font-mono text-xs"
          >
            <MagicWand className="mr-1.5 h-3.5 w-3.5" />
            Refrasa
          </Button>
        </div>

        {/* Utility actions */}
        <div className="hidden @[520px]/toolbar:flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-action px-2.5 font-mono text-xs">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
                <NavArrowDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-mono text-xs">
              <DropdownMenuItem onClick={() => onDownload?.("docx")}>DOCX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("txt")}>TXT</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className={cn(iconActionClass, copied && "bg-accent text-foreground")}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Salin</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onExpand} className={iconActionClass}>
                <Expand className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Fullscreen</TooltipContent>
          </Tooltip>
        </div>

        {/* Compact layout */}
        <div className="flex w-full justify-end @[520px]/toolbar:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={iconActionClass}>
                <MoreVert className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <EditPencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRefrasa}>
                <MagicWand className="mr-2 h-4 w-4" />
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
              <DropdownMenuItem onClick={onExpand}>
                <Expand className="mr-2 h-4 w-4" />
                Fullscreen
              </DropdownMenuItem>
              {onClosePanel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onClosePanel}>
                    <Xmark className="mr-2 h-4 w-4" />
                    Tutup panel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export default ArtifactToolbar
