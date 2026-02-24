"use client"

import { useRef, useState } from "react"
import { Xmark, EditPencil, Copy, Check, MagicWand, Download, Page, WarningTriangle, ViewColumns2, Trash } from "iconoir-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { ArtifactViewer, type ArtifactViewerRef } from "../ArtifactViewer"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { cn } from "@/lib/utils"

interface MobileArtifactViewerProps {
  artifactId: Id<"artifacts"> | null
  onClose: () => void
  onRefrasa: (artifactId: Id<"artifacts">) => void
}

export function MobileArtifactViewer({
  artifactId,
  onClose,
  onRefrasa,
}: MobileArtifactViewerProps) {
  const viewerRef = useRef<ArtifactViewerRef>(null)
  const { user } = useCurrentUser()
  const [copied, setCopied] = useState(false)

  const artifact = useQuery(
    api.artifacts.get,
    artifactId && user?._id
      ? { artifactId, userId: user._id }
      : "skip"
  )

  const [showCompare, setShowCompare] = useState(false)
  const [showIssuesSheet, setShowIssuesSheet] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const updateArtifact = useMutation(api.artifacts.update)
  const markApplied = useMutation(api.artifacts.markRefrasaApplied)
  const removeChain = useMutation(api.artifacts.removeChain)

  const isRefrasa = artifact?.type === "refrasa"
  const headerTitle = artifact?.title ?? "Artifact"

  const sourceArtifact = useQuery(
    api.artifacts.get,
    artifact?.sourceArtifactId && user?._id
      ? { artifactId: artifact.sourceArtifactId, userId: user._id }
      : "skip"
  )

  const issues = artifact?.refrasaIssues
    ? (artifact.refrasaIssues as Array<{ category: string; type: string; message: string; severity: string; suggestion?: string }>)
    : []

  const handleApply = async () => {
    if (!artifact?.sourceArtifactId || !artifact.content || !user?._id) return
    setIsApplying(true)
    try {
      await updateArtifact({
        artifactId: artifact.sourceArtifactId,
        userId: user._id,
        content: artifact.content,
      })
      await markApplied({ artifactId: artifactId!, userId: user._id })
      setApplied(true)
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error("[MobileArtifactViewer] Apply failed:", err)
    } finally {
      setIsApplying(false)
    }
  }

  const handleDelete = async () => {
    if (!artifactId || !user?._id) return
    await removeChain({ artifactId, userId: user._id })
    onClose()
  }

  const handleCopy = () => {
    viewerRef.current?.copy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--chat-background)] md:hidden">
      {/* Header */}
      <div className="border-b border-[color:var(--chat-border)] px-3 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-2 h-11">
          <button
            onClick={onClose}
            className="shrink-0 rounded-action p-2 -ml-1 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Close"
          >
            <Xmark className="h-5 w-5" strokeWidth={1.5} />
          </button>
          {isRefrasa ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-badge bg-[var(--chat-info)] font-mono text-[10px] font-bold text-[var(--chat-info-foreground)]">
              R
            </span>
          ) : (
            <Page className="h-5 w-5 shrink-0 text-[var(--chat-muted-foreground)]" strokeWidth={1.5} />
          )}
          <span className="flex-1 truncate font-sans text-sm font-medium text-[var(--chat-foreground)]">
            {headerTitle}
          </span>
        </div>
      </div>

      {/* Artifact toolbar — icon-only, non-refrasa only */}
      {!isRefrasa && (
        <div className="flex items-center gap-1 border-b border-[color:var(--chat-border)] px-3 py-1.5">
          <TooltipProvider delayDuration={200}>
            {/* Edit */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => viewerRef.current?.startEdit()}
                  className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                  aria-label="Edit"
                >
                  <EditPencil className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">Edit</TooltipContent>
            </Tooltip>

            {/* Copy */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopy}
                  className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                  aria-label="Salin"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[var(--chat-success)]" strokeWidth={1.5} />
                  ) : (
                    <Copy className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">Salin</TooltipContent>
            </Tooltip>

            {/* Refrasa */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { if (artifactId) onRefrasa(artifactId) }}
                  className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                  aria-label="Refrasa"
                >
                  <MagicWand className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">Refrasa</TooltipContent>
            </Tooltip>

            {/* Download */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => viewerRef.current?.download()}
                  className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                  aria-label="Unduh"
                >
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">Unduh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Artifact toolbar — refrasa mode */}
      {isRefrasa && (
        <div className="flex items-center gap-1 border-b border-[color:var(--chat-border)] px-3 py-1.5">
          <TooltipProvider delayDuration={200}>
            {/* Issues badge */}
            {issues.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowIssuesSheet(true)}
                    className="inline-flex items-center gap-1 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-accent)] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--chat-foreground)] active:bg-[var(--chat-secondary)] transition-colors duration-50"
                    aria-label="Lihat masalah"
                  >
                    <WarningTriangle className="h-3 w-3" strokeWidth={1.5} />
                    {issues.length}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-xs">Lihat masalah</TooltipContent>
              </Tooltip>
            )}

            {/* Compare toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowCompare((v) => !v)}
                  className={cn(
                    "rounded-action p-2 transition-colors duration-50",
                    showCompare
                      ? "bg-[var(--chat-accent)] text-[var(--chat-foreground)]"
                      : "text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)]"
                  )}
                  aria-label="Bandingkan"
                >
                  <ViewColumns2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">Bandingkan</TooltipContent>
            </Tooltip>

            {/* Download */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => viewerRef.current?.download()}
                  className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                  aria-label="Unduh"
                >
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">Unduh</TooltipContent>
            </Tooltip>

            {/* Copy */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopy}
                  className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                  aria-label="Salin"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[var(--chat-success)]" strokeWidth={1.5} />
                  ) : (
                    <Copy className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">Salin</TooltipContent>
            </Tooltip>

            {/* Trash */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDelete}
                  className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                  aria-label="Hapus"
                >
                  <Trash className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">Hapus</TooltipContent>
            </Tooltip>

            {/* Terapkan button — pushed right */}
            <button
              onClick={handleApply}
              disabled={isApplying || applied}
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-action px-3 py-1.5 font-sans text-xs font-medium transition-colors duration-150",
                applied
                  ? "bg-[var(--chat-success)] text-[var(--chat-success-foreground)]"
                  : "bg-[var(--chat-primary)] text-[var(--chat-primary-foreground)] active:opacity-80"
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
              {applied ? "Diterapkan" : isApplying ? "Menerapkan..." : "Terapkan"}
            </button>
          </TooltipProvider>
        </div>
      )}

      {/* Content — ArtifactViewer fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <ArtifactViewer ref={viewerRef} artifactId={artifactId} />
      </div>
    </div>
  )
}
