"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Page, WarningTriangle, MagicWand } from "iconoir-react"
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ArtifactEditor } from "./ArtifactEditor"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { SourcesIndicator } from "./SourcesIndicator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants"
import { cn } from "@/lib/utils"
import { useRefrasa } from "@/lib/hooks/useRefrasa"
import {
  RefrasaConfirmDialog,
  RefrasaLoadingIndicator,
} from "@/components/refrasa"

interface ArtifactViewerProps {
  artifactId: Id<"artifacts"> | null
}

// Exposed methods via ref for parent component (ArtifactPanel)
export interface ArtifactViewerRef {
  download: () => void
  copy: () => void
  startEdit: () => void
  triggerRefrasa: () => void
  setDownloadFormat: (format: "docx" | "pdf" | "txt") => void
  getState: () => {
    copied: boolean
    isEditing: boolean
    downloadFormat: "docx" | "pdf" | "txt"
    isRefrasaLoading: boolean
    canRefrasa: boolean
    hasArtifact: boolean
  }
}

// Map format to syntax highlighter language
const formatToLanguage: Record<string, string> = {
  python: "python",
  r: "r",
  javascript: "javascript",
  typescript: "typescript",
  latex: "latex",
  markdown: "markdown",
}

function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isArtifactInvalidated(artifact: { invalidatedAt?: number }): boolean {
  return artifact.invalidatedAt !== undefined && artifact.invalidatedAt !== null
}

function getStageLabelSafe(stageId: string | undefined): string {
  if (!stageId) return "unknown"
  try {
    return getStageLabel(stageId as PaperStageId)
  } catch {
    return stageId
  }
}

export const ArtifactViewer = forwardRef<ArtifactViewerRef, ArtifactViewerProps>(
  function ArtifactViewer({ artifactId }, ref) {
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [viewingVersionId, setViewingVersionId] = useState<Id<"artifacts"> | null>(artifactId)
    const { user: currentUser } = useCurrentUser()

    // Refrasa state
    const [showRefrasaDialog, setShowRefrasaDialog] = useState(false)
    const [isApplyingRefrasa, setIsApplyingRefrasa] = useState(false)
    const {
      isLoading: isRefrasaLoading,
      result: refrasaResult,
      error: refrasaError,
      analyzeAndRefrasa,
      reset: resetRefrasa,
    } = useRefrasa()

    // Download format state
    type DownloadFormat = "docx" | "pdf" | "txt"
    const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("docx")

    const isRefrasaEnabled = useQuery(api.aiProviderConfigs.getRefrasaEnabled)
    const updateArtifact = useMutation(api.artifacts.update)

    useEffect(() => {
      setViewingVersionId(artifactId)
      setIsEditing(false)
    }, [artifactId])

    const artifact = useQuery(
      api.artifacts.get,
      viewingVersionId && currentUser?._id
        ? { artifactId: viewingVersionId, userId: currentUser._id }
        : "skip"
    )

    const versionHistory = useQuery(
      api.artifacts.getVersionHistory,
      artifactId && currentUser?._id
        ? { artifactId, userId: currentUser._id }
        : "skip"
    )

    const finalStatus = useQuery(
      api.artifacts.checkFinalStatus,
      viewingVersionId && currentUser?._id
        ? { artifactId: viewingVersionId, userId: currentUser._id }
        : "skip"
    )
    const isFinal = finalStatus?.isFinal ?? false
    const canRefrasa = isRefrasaEnabled !== false && (artifact?.content?.length ?? 0) >= 50

    const handleCopy = useCallback(async () => {
      if (!artifact) return

      try {
        await navigator.clipboard.writeText(artifact.content)
        setCopied(true)
        toast.success("Konten berhasil disalin")
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error("Gagal menyalin konten")
      }
    }, [artifact])

    const handleSave = async (newContent: string) => {
      if (!artifact || !currentUser?._id) return

      setIsSaving(true)
      try {
        await updateArtifact({
          artifactId: artifact._id,
          userId: currentUser._id,
          content: newContent,
        })
        toast.success(`Artifak diperbarui ke v${artifact.version + 1}`)
        setIsEditing(false)
      } catch (error) {
        console.error("Failed to update artifact:", error)
        toast.error("Gagal menyimpan perubahan")
      } finally {
        setIsSaving(false)
      }
    }

    const handleDownload = useCallback(() => {
      if (!artifact) return

      const formatConfig: Record<DownloadFormat, { ext: string; mime: string }> = {
        docx: { ext: ".md", mime: "text/markdown" },
        pdf: { ext: ".md", mime: "text/markdown" },
        txt: { ext: ".txt", mime: "text/plain" },
      }

      const config = formatConfig[downloadFormat]
      const sanitizedTitle = artifact.title
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
      const filename = `${sanitizedTitle}-v${artifact.version}${config.ext}`

      const blob = new Blob([artifact.content], { type: `${config.mime};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`File "${filename}" berhasil diunduh`)
    }, [artifact, downloadFormat])

    const handleVersionChange = (versionId: string) => {
      setViewingVersionId(versionId as Id<"artifacts">)
      setIsEditing(false)
    }

    const handleRefrasaTrigger = useCallback(async () => {
      if (!artifact || !canRefrasa || isRefrasaLoading) return
      resetRefrasa()
      await analyzeAndRefrasa(artifact.content, artifact._id)
    }, [artifact, canRefrasa, isRefrasaLoading, analyzeAndRefrasa, resetRefrasa])

    useEffect(() => {
      if (refrasaResult && !refrasaError) {
        setShowRefrasaDialog(true)
      }
    }, [refrasaResult, refrasaError])

    useEffect(() => {
      if (refrasaError) {
        toast.error(`Gagal menganalisis: ${refrasaError}`)
      }
    }, [refrasaError])

    const handleApplyRefrasa = async () => {
      if (!artifact || !currentUser?._id || !refrasaResult) return

      setIsApplyingRefrasa(true)
      try {
        await updateArtifact({
          artifactId: artifact._id,
          userId: currentUser._id,
          content: refrasaResult.refrasedText,
        })
        toast.success(`Tulisan berhasil diperbaiki ke v${artifact.version + 1}`)
        setShowRefrasaDialog(false)
        resetRefrasa()
      } catch (error) {
        console.error("Failed to apply refrasa:", error)
        toast.error("Gagal menerapkan perbaikan")
      } finally {
        setIsApplyingRefrasa(false)
      }
    }

    const handleCloseRefrasaDialog = () => {
      setShowRefrasaDialog(false)
      resetRefrasa()
    }

    useImperativeHandle(
      ref,
      () => ({
        download: handleDownload,
        copy: handleCopy,
        startEdit: () => setIsEditing(true),
        triggerRefrasa: handleRefrasaTrigger,
        setDownloadFormat: (format: "docx" | "pdf" | "txt") => setDownloadFormat(format),
        getState: () => ({
          copied,
          isEditing,
          downloadFormat,
          isRefrasaLoading,
          canRefrasa,
          hasArtifact: !!artifact,
        }),
      }),
      [
        copied,
        isEditing,
        downloadFormat,
        isRefrasaLoading,
        canRefrasa,
        artifact,
        handleDownload,
        handleCopy,
        handleRefrasaTrigger,
      ]
    )

    if (!artifactId) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
          <Page className="mb-4 h-12 w-12 opacity-50" />
          <p className="text-center">Pilih artifak untuk melihat konten</p>
        </div>
      )
    }

    if (artifact === undefined) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
          <span className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p>Memuat artifak...</p>
        </div>
      )
    }

    if (artifact === null) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
          <Page className="mb-4 h-12 w-12 opacity-50" />
          <p className="text-center">Artifak tidak ditemukan</p>
        </div>
      )
    }

    const isCodeArtifact = artifact.type === "code" || artifact.format === "latex"
    const language = artifact.format ? formatToLanguage[artifact.format] : undefined
    const shouldRenderMarkdown = !isCodeArtifact
    const isInvalidated = isArtifactInvalidated(artifact)
    const invalidatedStageLabel = artifact.invalidatedByRewindToStage
      ? getStageLabelSafe(artifact.invalidatedByRewindToStage)
      : null
    const hasMultipleVersions = (versionHistory?.length ?? 0) > 1
    const contentTypeLabel = isCodeArtifact
      ? `Code${language ? ` • ${language}` : ""}`
      : shouldRenderMarkdown
        ? "Markdown"
        : "Teks"
    const wordCount = artifact.content.trim().length === 0
      ? 0
      : artifact.content.trim().split(/\s+/).length
    const refrasaLabel = isRefrasaLoading
      ? "Refrasa berjalan"
      : canRefrasa
        ? "Refrasa siap"
        : "Refrasa min. 50 karakter"

    return (
      <div className="flex h-full flex-col">
        {/* Viewer status header */}
        <div className="border-b border-border/60 bg-card/45 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-badge border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-primary">
              {isEditing ? "Mode Edit" : "Mode Baca"}
            </span>

            {hasMultipleVersions ? (
              <Select
                value={viewingVersionId ?? undefined}
                onValueChange={handleVersionChange}
              >
                <SelectTrigger
                  size="sm"
                  className="h-6 w-auto min-w-[130px] rounded-action border-border/60 bg-background/80 px-2 py-0 text-[11px] font-mono font-medium focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                >
                  <SelectValue placeholder={`v${artifact.version}`} />
                </SelectTrigger>
                <SelectContent>
                  {versionHistory?.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      v{v.version} - {formatShortDate(v.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="rounded-badge border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                v{artifact.version}
              </span>
            )}

            {isFinal && (
              <span className="rounded-badge border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                FINAL
              </span>
            )}

            <span
              className={cn(
                "rounded-badge px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide",
                isRefrasaLoading
                  ? "border border-primary/35 bg-primary/10 text-primary"
                  : canRefrasa
                    ? "border border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    : "border border-border/70 bg-muted/60 text-muted-foreground"
              )}
            >
              {refrasaLabel}
            </span>

            {isInvalidated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="cursor-help rounded-badge border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-700 dark:text-amber-300"
                    data-testid="artifact-type-badge"
                  >
                    <WarningTriangle className="mr-1 inline-block h-3 w-3" data-testid="invalidation-indicator" />
                    Perlu revisi
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px]">
                  <p className="text-xs">
                    <strong>Artifak perlu direvisi</strong>
                    <br />
                    Di-invalidate pada {artifact.invalidatedAt ? formatDate(artifact.invalidatedAt) : "unknown"}
                    {invalidatedStageLabel && (
                      <> karena rewind ke tahap <strong>{invalidatedStageLabel}</strong></>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground/85">
            <span className="rounded-badge border border-border/60 bg-background/70 px-1.5 py-0.5">
              {contentTypeLabel}
            </span>
            <span className="rounded-badge border border-border/60 bg-background/70 px-1.5 py-0.5">
              {wordCount} kata
            </span>
            <span className="rounded-badge border border-border/60 bg-background/70 px-1.5 py-0.5">
              {artifact.content.length} karakter
            </span>
          </div>
        </div>

        {isInvalidated && (
          <Alert
            variant="warning"
            className="mx-4 mt-2 border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
            data-testid="invalidation-warning"
          >
            <WarningTriangle className="h-4 w-4" data-testid="invalidation-warning-icon" />
            <AlertDescription>
              <span className="font-medium">Artifak perlu di-update</span>
              {invalidatedStageLabel && (
                <span> karena rewind ke tahap <strong>{invalidatedStageLabel}</strong></span>
              )}
              <span className="mt-1 block text-xs text-amber-800/85 dark:text-amber-200/85">
                Gunakan chat untuk meminta AI memperbarui artifak ini.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {isEditing ? (
          <ArtifactEditor
            content={artifact.content}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
            isLoading={isSaving}
          />
        ) : (
          <>
            <div className="flex-1 overflow-hidden px-4 py-3">
              <div className="flex h-full flex-col overflow-hidden rounded-shell border border-border/60 bg-background/35">
                <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground/85">
                    Workspace Dokumen
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/85">
                    Klik kanan konten untuk aksi cepat
                  </p>
                </div>

                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div className="relative flex-1 overflow-auto p-4 scrollbar-thin">
                      {isRefrasaLoading && (
                        <div className="absolute inset-2 z-10 flex items-center justify-center rounded-action border border-border/60 bg-background/75 backdrop-blur-sm">
                          <RefrasaLoadingIndicator />
                        </div>
                      )}

                      {isCodeArtifact && language ? (
                        <div className="overflow-hidden rounded-action border border-border/60">
                          <SyntaxHighlighter
                            language={language}
                            style={oneDark}
                            customStyle={{
                              margin: 0,
                              borderRadius: 0,
                              fontSize: "0.7rem",
                              lineHeight: "1.65",
                            }}
                            showLineNumbers
                          >
                            {artifact.content}
                          </SyntaxHighlighter>
                        </div>
                      ) : shouldRenderMarkdown ? (
                        <MarkdownRenderer
                          markdown={artifact.content}
                          className="space-y-3 rounded-action border border-border/50 bg-background/40 p-4 text-sm leading-relaxed"
                          sources={artifact.sources}
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap rounded-action border border-border/50 bg-background/40 p-4 font-sans text-sm leading-relaxed">
                          {artifact.content}
                        </pre>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-[200px] font-mono text-xs">
                    {isRefrasaEnabled !== false && (
                      <ContextMenuItem
                        onClick={handleRefrasaTrigger}
                        disabled={isRefrasaLoading || !canRefrasa}
                      >
                        <MagicWand className="mr-2 h-4 w-4" />
                        {canRefrasa ? "Refrasa Dokumen" : "Refrasa (min. 50 karakter)"}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            </div>

            <div className="border-t border-border/50 bg-card/35 px-4 py-2">
              {artifact.sources && artifact.sources.length > 0 ? (
                <div>
                  <p className="mb-1 text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground/85">
                    Sumber Terkait
                  </p>
                  <SourcesIndicator sources={artifact.sources} />
                </div>
              ) : (
                <p className="text-[11px] font-mono text-muted-foreground/75">
                  Tidak ada sumber eksternal yang tertaut di versi ini.
                </p>
              )}
            </div>
          </>
        )}

        {refrasaResult && (
          <RefrasaConfirmDialog
            open={showRefrasaDialog}
            onOpenChange={handleCloseRefrasaDialog}
            originalContent={artifact.content}
            refrasedText={refrasaResult.refrasedText}
            issues={refrasaResult.issues}
            onApply={handleApplyRefrasa}
            isApplying={isApplyingRefrasa}
          />
        )}
      </div>
    )
  }
)
