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
import { Page, WarningTriangle } from "iconoir-react"
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ArtifactEditor } from "./ArtifactEditor"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { SourcesIndicator } from "./SourcesIndicator"
import { ChartRenderer } from "./ChartRenderer"
import dynamic from "next/dynamic"
import { isMermaidContent, extractMermaidCode } from "@/lib/utils/mermaid"

const MermaidRenderer = dynamic(
  () => import("./MermaidRenderer").then((m) => ({ default: m.MermaidRenderer })),
  { ssr: false, loading: () => <div className="my-2 h-32 animate-pulse rounded-action bg-muted" /> }
)
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants"
import { useRefrasa } from "@/lib/hooks/useRefrasa"
import { RefrasaLoadingIndicator } from "@/components/refrasa"

interface ArtifactViewerProps {
  artifactId: Id<"artifacts"> | null
  onOpenRefrasaTab?: (tab: { id: Id<"artifacts">; title: string; type: string }) => void
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
  function ArtifactViewer({ artifactId, onOpenRefrasaTab }, ref) {
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [viewingVersionId, setViewingVersionId] = useState<Id<"artifacts"> | null>(artifactId)
    const { user: currentUser } = useCurrentUser()

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

    // Refrasa — persists to DB, notifies parent to open tab
    const {
      isLoading: isRefrasaLoading,
      error: refrasaError,
      analyzeAndRefrasa,
      reset: resetRefrasa,
    } = useRefrasa({
      conversationId: artifact?.conversationId ?? null,
      userId: currentUser?._id ?? null,
      onArtifactCreated: (newArtifactId, title) => {
        onOpenRefrasaTab?.({ id: newArtifactId, title, type: "refrasa" })
      },
    })

    const canRefrasa = isRefrasaEnabled !== false && artifact?.type !== "chart" && (artifact?.content?.length ?? 0) >= 50

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
      await analyzeAndRefrasa(artifact.content, artifact._id, artifact.title)
    }, [artifact, canRefrasa, isRefrasaLoading, analyzeAndRefrasa, resetRefrasa])

    useEffect(() => {
      if (refrasaError) {
        toast.error(`Gagal menganalisis: ${refrasaError}`)
      }
    }, [refrasaError])

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

    const isMermaid = isMermaidContent(artifact.content)
    const isChartArtifact = !isMermaid && artifact.type === "chart"
    const isCodeArtifact = artifact.type === "code" || artifact.format === "latex"
    const language = artifact.format ? formatToLanguage[artifact.format] : undefined
    const shouldRenderMarkdown = !isMermaid && !isChartArtifact && !isCodeArtifact
    const isInvalidated = isArtifactInvalidated(artifact)
    const invalidatedStageLabel = artifact.invalidatedByRewindToStage
      ? getStageLabelSafe(artifact.invalidatedByRewindToStage)
      : null
    const hasMultipleVersions = (versionHistory?.length ?? 0) > 1
    const hasHeaderMeta = hasMultipleVersions || isInvalidated
    return (
      <div className="flex h-full flex-col">
        {hasHeaderMeta ? (
          <div className="border-b border-slate-300/80 bg-inherit px-4 py-3 dark:border-slate-700/80">
            <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] font-mono text-slate-700 dark:text-slate-400">
              {hasMultipleVersions ? (
                <Select
                  value={viewingVersionId ?? undefined}
                  onValueChange={handleVersionChange}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-6 w-auto min-w-[130px] rounded-action border-slate-300/85 bg-slate-200/80 px-2 py-0 text-[11px] font-mono font-medium text-slate-800 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
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
              ) : null}

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
          </div>
        ) : null}

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
              <div className="flex h-full flex-col overflow-hidden rounded-sm border border-slate-300/85 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900">
                <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pr-6 scrollbar-thin [scrollbar-gutter:stable]">
                  {isRefrasaLoading && (
                    <div className="absolute inset-2 z-10 flex items-center justify-center rounded-action border border-slate-300/85 bg-slate-100/80 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/75">
                      <RefrasaLoadingIndicator />
                    </div>
                  )}

                  {isMermaid ? (
                    <MermaidRenderer code={extractMermaidCode(artifact.content)} />
                  ) : isChartArtifact ? (
                    <ChartRenderer content={artifact.content} />
                  ) : isCodeArtifact && language ? (
                    <div className="overflow-hidden rounded-action">
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
                      className="space-y-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100"
                      sources={artifact.sources}
                      context="artifact"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                      {artifact.content}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-300/80 bg-inherit px-4 py-2 dark:border-slate-700/70">
              {artifact.sources && artifact.sources.length > 0 ? (
                <div>
                  <p className="mb-1 text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Sumber Terkait
                  </p>
                  <SourcesIndicator sources={artifact.sources} />
                </div>
              ) : (
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-100">
                  Tidak ada rujukan eksternal.
                </p>
              )}
            </div>
          </>
        )}

      </div>
    )
  }
)
