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
  /** Callbacks for actions — connected to ArtifactViewer ref */
  onDownload?: (format: "docx" | "pdf" | "txt") => void
  onEdit?: () => void
  onRefrasa?: () => void
  onCopy?: () => void
  onExpand?: () => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * ArtifactToolbar - Metadata + action buttons between tabs and content
 *
 * Left: artifact type badge, version, date
 * Right: Download, Edit, Refrasa, Copy, Expand (responsive — collapses to 3-dot menu)
 */
export function ArtifactToolbar({
  artifact,
  onDownload,
  onEdit,
  onRefrasa,
  onCopy,
  onExpand,
}: ArtifactToolbarProps) {
  const [copied, setCopied] = useState(false)

  if (!artifact) return null

  const handleCopy = () => {
    onCopy?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        "@container/toolbar",
        "flex items-center justify-between gap-2",
        "h-9 px-3",
        "border-b border-border/50",
        "shrink-0"
      )}
    >
      {/* Left: Metadata */}
      <div className="flex items-center gap-2 min-w-0">
        <Badge
          variant="outline"
          className="text-[10px] font-mono px-1.5 py-0 rounded-badge capitalize shrink-0"
        >
          {typeLabels[artifact.type] || artifact.type}
        </Badge>
        <Badge
          variant="secondary"
          className="text-[10px] font-mono px-1.5 py-0 rounded-badge shrink-0"
        >
          v{artifact.version}
        </Badge>
        <span className="text-[11px] font-mono text-muted-foreground truncate">
          {formatDate(artifact.createdAt)}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Wide view: Individual buttons */}
        <div className="hidden @[320px]/toolbar:flex items-center gap-1">
          {/* Download */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Unduh</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDownload?.("docx")}>DOCX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("txt")}>TXT</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Edit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                <EditPencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Edit</TooltipContent>
          </Tooltip>

          {/* Refrasa */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRefrasa} className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                <MagicWand className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Refrasa</TooltipContent>
          </Tooltip>

          {/* Copy */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Salin</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Expand */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onExpand} className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                <Expand className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Fullscreen</TooltipContent>
          </Tooltip>
        </div>

        {/* Narrow view: 3-dot menu */}
        <div className="flex @[320px]/toolbar:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                <MoreVert className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger><Download className="h-4 w-4 mr-2" />Unduh</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onDownload?.("docx")}>DOCX</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload?.("pdf")}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload?.("txt")}>TXT</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={onEdit}><EditPencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onRefrasa}><MagicWand className="h-4 w-4 mr-2" />Refrasa</DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                Salin
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExpand}><Expand className="h-4 w-4 mr-2" />Fullscreen</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export default ArtifactToolbar
