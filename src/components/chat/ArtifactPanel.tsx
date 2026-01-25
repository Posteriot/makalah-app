"use client"

import { useState, useRef } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ArtifactViewer, ArtifactViewerRef } from "./ArtifactViewer"
import { ArtifactList } from "./ArtifactList"
import { Button } from "@/components/ui/button"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import {
  FileTextIcon,
  XIcon,
  Maximize2Icon,
  DownloadIcon,
  PencilIcon,
  WandSparkles,
  CopyIcon,
  CheckIcon,
  MoreVerticalIcon,
  ChevronDownIcon,
  CodeIcon,
  ListIcon,
  TableIcon,
  BookOpenIcon,
  FunctionSquareIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { FullsizeArtifactModal } from "./FullsizeArtifactModal"

// Artifact type from Convex
type ArtifactType =
  | "code"
  | "outline"
  | "section"
  | "table"
  | "citation"
  | "formula"

// Map artifact type to icon
const typeIcons: Record<ArtifactType, React.ElementType> = {
  code: CodeIcon,
  outline: ListIcon,
  section: FileTextIcon,
  table: TableIcon,
  citation: BookOpenIcon,
  formula: FunctionSquareIcon,
}

// Map artifact type to display label
const typeLabels: Record<ArtifactType, string> = {
  code: "Code",
  outline: "Outline",
  section: "Section",
  table: "Tabel",
  citation: "Sitasi",
  formula: "Formula",
}

// Format timestamp to readable date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface ArtifactPanelProps {
  conversationId: Id<"conversations"> | null
  isOpen: boolean
  onToggle: () => void
  selectedArtifactId: Id<"artifacts"> | null
  onSelectArtifact: (id: Id<"artifacts">) => void
}

/**
 * ArtifactPanel - Artifact viewer panel
 *
 * Features:
 * - Viewer-focused layout (no tools grid per mockup)
 * - Artifact list with type filter
 * - Selected artifact state management
 * - Width controlled by parent resizer
 * - Collapse/expand trigger moved to ShellHeader
 *
 * Styling:
 * - Uses CSS variables for theme consistency
 * - Card background with border styling
 * - Smooth transitions
 */
export function ArtifactPanel({
  conversationId,
  isOpen,
  onToggle,
  selectedArtifactId,
  onSelectArtifact,
}: ArtifactPanelProps) {
  const [typeFilter, setTypeFilter] = useState<ArtifactType | null>(null)
  const [isFullsizeOpen, setIsFullsizeOpen] = useState(false)
  const [isArtifactListOpen, setIsArtifactListOpen] = useState(false)
  const { user: currentUser } = useCurrentUser()

  // Ref for ArtifactViewer actions
  const viewerRef = useRef<ArtifactViewerRef>(null)

  // Local state for action icons (synced from viewer ref)
  const [downloadFormat, setDownloadFormat] = useState<"docx" | "pdf" | "txt">("docx")
  const [copied, setCopied] = useState(false)

  // Fetch artifacts with optional type filter
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    conversationId && currentUser?._id
      ? {
          conversationId,
          userId: currentUser._id,
          type: typeFilter ?? undefined,
        }
      : "skip"
  )

  const artifactCount = artifacts?.length ?? 0

  // Only render when panel is open (collapsed trigger moved to ShellHeader)
  if (!isOpen) {
    return null
  }

  // Expanded state - show full panel
  return (
    <div
      className={cn(
        "@container/artifact",
        "flex flex-col h-full w-full",
        "bg-card",
        "transition-all duration-300 ease-in-out"
      )}
    >
      {/* Header - Clean style matching mockup */}
      <div className="px-4 py-2 flex items-center justify-between shrink-0 min-w-0">
        {/* Left: Title + Count (can shrink) */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <h2 className="text-sm font-medium text-foreground truncate">Artifact</h2>
          {artifactCount > 0 && (
            <span
              className={cn(
                "text-xs font-medium shrink-0",
                "px-2 py-0.5 rounded-full",
                "bg-muted text-muted-foreground"
              )}
            >
              {artifactCount}
            </span>
          )}
        </div>

        {/* Right: Actions (cannot shrink) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Action Icons - only show when artifact selected */}
          {selectedArtifactId && (
            <>
              {/* Wide view: Individual action buttons (hidden when narrow) */}
              <div className="hidden @[280px]/artifact:flex items-center gap-1.5">
                {/* Download Dropdown */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded",
                            "text-muted-foreground",
                            "hover:bg-accent hover:text-foreground",
                            "transition-all duration-150"
                          )}
                          aria-label="Unduh"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Unduh</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setDownloadFormat("docx")
                        viewerRef.current?.setDownloadFormat("docx")
                        viewerRef.current?.download()
                      }}
                    >
                      Unduh DOCX
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setDownloadFormat("pdf")
                        viewerRef.current?.setDownloadFormat("pdf")
                        viewerRef.current?.download()
                      }}
                    >
                      Unduh PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setDownloadFormat("txt")
                        viewerRef.current?.setDownloadFormat("txt")
                        viewerRef.current?.download()
                      }}
                    >
                      Unduh TXT
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Edit Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewerRef.current?.startEdit()}
                      className={cn(
                        "h-7 w-7 rounded",
                        "text-muted-foreground",
                        "hover:bg-accent hover:text-foreground",
                        "transition-all duration-150"
                      )}
                      aria-label="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>

                {/* Refrasa Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewerRef.current?.triggerRefrasa()}
                      className={cn(
                        "h-7 w-7 rounded",
                        "text-muted-foreground",
                        "hover:bg-accent hover:text-foreground",
                        "transition-all duration-150"
                      )}
                      aria-label="Refrasa"
                    >
                      <WandSparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refrasa</TooltipContent>
                </Tooltip>

                {/* Copy Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        viewerRef.current?.copy()
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className={cn(
                        "h-7 w-7 rounded",
                        "text-muted-foreground",
                        "hover:bg-accent hover:text-foreground",
                        "transition-all duration-150"
                      )}
                      aria-label="Salin"
                    >
                      {copied ? (
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Salin</TooltipContent>
                </Tooltip>

                {/* Separator */}
                <div className="w-px h-4 bg-border mx-0.5" />
              </div>

              {/* Narrow view: 3-dot menu (shown when narrow) */}
              <div className="flex @[280px]/artifact:hidden">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded",
                            "text-muted-foreground",
                            "hover:bg-accent hover:text-foreground",
                            "transition-all duration-150"
                          )}
                          aria-label="Aksi"
                        >
                          <MoreVerticalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Aksi</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    {/* Download submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Unduh
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setDownloadFormat("docx")
                            viewerRef.current?.setDownloadFormat("docx")
                            viewerRef.current?.download()
                          }}
                        >
                          DOCX
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDownloadFormat("pdf")
                            viewerRef.current?.setDownloadFormat("pdf")
                            viewerRef.current?.download()
                          }}
                        >
                          PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDownloadFormat("txt")
                            viewerRef.current?.setDownloadFormat("txt")
                            viewerRef.current?.download()
                          }}
                        >
                          TXT
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => viewerRef.current?.startEdit()}>
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => viewerRef.current?.triggerRefrasa()}>
                      <WandSparkles className="h-4 w-4 mr-2" />
                      Refrasa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        viewerRef.current?.copy()
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                    >
                      {copied ? (
                        <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <CopyIcon className="h-4 w-4 mr-2" />
                      )}
                      Salin
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsFullsizeOpen(true)}
                    >
                      <Maximize2Icon className="h-4 w-4 mr-2" />
                      Fullscreen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}

          {/* Expand/Fullscreen Button (hidden in narrow, included in 3-dot menu) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullsizeOpen(true)}
                disabled={!selectedArtifactId}
                className={cn(
                  "hidden @[280px]/artifact:flex",
                  "h-7 w-7 rounded",
                  "text-muted-foreground",
                  "hover:bg-accent hover:text-foreground",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "transition-all duration-150"
                )}
                aria-label="Expand artifact fullscreen"
              >
                <Maximize2Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expand fullscreen</TooltipContent>
          </Tooltip>

          {/* Close Button - ALWAYS visible */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className={cn(
                  "h-7 w-7 rounded shrink-0",
                  "text-muted-foreground",
                  "hover:bg-accent hover:text-foreground",
                  "transition-all duration-150"
                )}
                aria-label="Close panel"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close panel</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Body: Viewer-focused layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Artifact Selector - Collapsible title dropdown (between header and viewer) */}
        {artifactCount > 0 && (
          <div className="shrink-0 border-t border-border">
            <Collapsible
              open={isArtifactListOpen}
              onOpenChange={setIsArtifactListOpen}
            >
              {/* Trigger: Selected artifact info OR placeholder */}
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full text-left transition-colors",
                    "px-4 py-3",
                    "hover:bg-accent/30",
                    isArtifactListOpen && "bg-accent/20"
                  )}
                >
                  {(() => {
                    // Find selected artifact from list
                    const selectedArtifact = artifacts?.find(
                      (a) => a._id === selectedArtifactId
                    )

                    if (selectedArtifact) {
                      const TypeIcon = typeIcons[selectedArtifact.type as ArtifactType]
                      return (
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <TypeIcon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Title Row */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {selectedArtifact.title}
                              </span>
                              <Badge
                                variant="secondary"
                                className="shrink-0 text-[10px] px-1.5 py-0"
                              >
                                v{selectedArtifact.version}
                              </Badge>
                              <ChevronDownIcon
                                className={cn(
                                  "h-4 w-4 ml-auto shrink-0 text-muted-foreground transition-transform duration-200",
                                  isArtifactListOpen && "rotate-180"
                                )}
                              />
                            </div>
                            {/* Meta Row */}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 capitalize"
                              >
                                {typeLabels[selectedArtifact.type as ArtifactType]}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {formatDate(selectedArtifact.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // No artifact selected - show placeholder
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Pilih artifact ({artifactCount})
                        </span>
                        <ChevronDownIcon
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            isArtifactListOpen && "rotate-180"
                          )}
                        />
                      </div>
                    )
                  })()}
                </button>
              </CollapsibleTrigger>

              {/* Expanded content - artifact list */}
              <CollapsibleContent>
                <div className="max-h-56 overflow-y-auto border-t border-border">
                  <ArtifactList
                    artifacts={artifacts ?? []}
                    selectedId={selectedArtifactId}
                    onSelect={(id) => {
                      onSelectArtifact(id)
                      setIsArtifactListOpen(false) // Close after selection
                    }}
                    typeFilter={typeFilter}
                    onFilterChange={setTypeFilter}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Main viewer area */}
        <div
          className={cn(
            "flex-1 overflow-hidden",
            "border-t border-border"
          )}
        >
          {selectedArtifactId ? (
            <ArtifactViewer ref={viewerRef} artifactId={selectedArtifactId} />
          ) : (
            // Empty state when no artifact selected
            <div
              className={cn(
                "flex flex-col items-center justify-center",
                "h-full py-12 px-6 text-center"
              )}
            >
              <FileTextIcon
                className={cn(
                  "h-12 w-12 mb-4",
                  "text-muted-foreground opacity-50"
                )}
              />
              <p className="text-[13px] text-muted-foreground max-w-[200px]">
                {artifactCount > 0
                  ? "Pilih artifact dari dropdown di atas"
                  : "Belum ada artifact. AI akan membuat dokumen untuk Anda di sini."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fullsize Artifact Modal */}
      {selectedArtifactId && (
        <FullsizeArtifactModal
          artifactId={selectedArtifactId}
          isOpen={isFullsizeOpen}
          onClose={() => setIsFullsizeOpen(false)}
        />
      )}
    </div>
  )
}

export default ArtifactPanel
