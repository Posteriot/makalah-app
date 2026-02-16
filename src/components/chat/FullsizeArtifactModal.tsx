"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapse,
  Download,
  Check,
  Copy,
  MagicWand,
  WarningTriangle,
  NavArrowDown,
} from "iconoir-react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { SourcesIndicator } from "./SourcesIndicator"
import { ChartRenderer } from "./ChartRenderer"
import dynamic from "next/dynamic"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"

const MermaidRenderer = dynamic(
  () => import("./MermaidRenderer").then((m) => ({ default: m.MermaidRenderer })),
  { ssr: false, loading: () => <div className="my-2 h-32 animate-pulse rounded-action bg-muted" /> }
)

const MERMAID_KEYWORDS = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|mindmap|timeline|journey|quadrantChart|xychart|block-beta|sankey-beta|packet-beta)\b/

function isMermaidContent(content: string): boolean {
  return MERMAID_KEYWORDS.test(content.trimStart())
}
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useRefrasa } from "@/lib/hooks/useRefrasa"
import {
  RefrasaConfirmDialog,
  RefrasaLoadingIndicator,
} from "@/components/refrasa"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface FullsizeArtifactModalProps {
  artifactId: Id<"artifacts">
  isOpen: boolean
  onClose: () => void
}

const formatToLanguage: Record<string, string> = {
  python: "python",
  r: "r",
  javascript: "javascript",
  typescript: "typescript",
  latex: "latex",
  markdown: "markdown",
}

type DownloadFormat = "docx" | "pdf" | "txt"
type SessionArtifact = {
  _id: Id<"artifacts">
  title: string
  type: string
  version: number
}

function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getLatestArtifactVersions<T extends { title: string; type: string; version: number }>(
  artifacts: T[]
): T[] {
  const latestMap = new Map<string, T>()
  for (const artifact of artifacts) {
    const key = `${artifact.type}-${artifact.title}`
    const existing = latestMap.get(key)
    if (!existing || artifact.version > existing.version) {
      latestMap.set(key, artifact)
    }
  }
  return Array.from(latestMap.values()).sort((a, b) => a.title.localeCompare(b.title))
}

export function FullsizeArtifactModal({
  artifactId,
  isOpen,
  onClose,
}: FullsizeArtifactModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const primaryCloseButtonRef = useRef<HTMLButtonElement>(null)
  const [activeArtifactId, setActiveArtifactId] = useState<Id<"artifacts"> | null>(artifactId)
  const [viewingVersionId, setViewingVersionId] = useState<Id<"artifacts"> | null>(artifactId)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [closeGuardOpen, setCloseGuardOpen] = useState(false)
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

  const isRefrasaEnabled = useQuery(api.aiProviderConfigs.getRefrasaEnabled)
  const updateArtifact = useMutation(api.artifacts.update)

  useEffect(() => {
    setActiveArtifactId(artifactId)
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
    activeArtifactId && currentUser?._id
      ? { artifactId: activeArtifactId, userId: currentUser._id }
      : "skip"
  )
  const artifactsInSession = useQuery(
    api.artifacts.listByConversation,
    artifact?.conversationId && currentUser?._id
      ? { conversationId: artifact.conversationId, userId: currentUser._id }
      : "skip"
  ) as SessionArtifact[] | undefined

  const finalStatus = useQuery(
    api.artifacts.checkFinalStatus,
    viewingVersionId && currentUser?._id
      ? { artifactId: viewingVersionId, userId: currentUser._id }
      : "skip"
  )
  const isFinal = finalStatus?.isFinal ?? false
  const latestArtifactsInSession = useMemo(
    () => (artifactsInSession ? getLatestArtifactVersions(artifactsInSession) : []),
    [artifactsInSession]
  )
  const sessionArtifactCount = latestArtifactsInSession.length
  const selectedArtifactValue = latestArtifactsInSession.some(
    (sessionArtifact) => sessionArtifact._id === activeArtifactId
  )
    ? activeArtifactId ?? undefined
    : undefined

  useEffect(() => {
    if (artifact?.content && !isEditing) {
      setEditContent(artifact.content)
    }
  }, [artifact?.content, isEditing])

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setCopied(false)
      setCloseGuardOpen(false)
      setShowRefrasaDialog(false)
      resetRefrasa()
    }
  }, [isOpen, resetRefrasa])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const hasUnsavedChanges = isEditing && artifact ? editContent !== artifact.content : false
  const canRefrasa = isRefrasaEnabled !== false && artifact?.type !== "chart" && (artifact?.content?.length ?? 0) >= 50
  const editWordCount = editContent.trim().length === 0 ? 0 : editContent.trim().split(/\s+/).length
  const editCharCount = editContent.length

  const requestClose = useCallback(() => {
    if (hasUnsavedChanges && !isSaving) {
      setCloseGuardOpen(true)
      return
    }
    onClose()
  }, [hasUnsavedChanges, isSaving, onClose])

  useEffect(() => {
    if (!isOpen) return

    const previousFocusedElement = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => {
      primaryCloseButtonRef.current?.focus()
    })

    return () => {
      previousFocusedElement?.focus?.()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (closeGuardOpen || showRefrasaDialog) return

      if (e.key === "Escape") {
        e.preventDefault()
        requestClose()
        return
      }

      if (e.key !== "Tab") return

      const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables || focusables.length === 0) return

      const firstFocusable = focusables[0]
      const lastFocusable = focusables[focusables.length - 1]
      const currentElement = document.activeElement as HTMLElement | null

      if (e.shiftKey && currentElement === firstFocusable) {
        e.preventDefault()
        lastFocusable.focus()
        return
      }

      if (!e.shiftKey && currentElement === lastFocusable) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, requestClose, closeGuardOpen, showRefrasaDialog])

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

  const handleSave = useCallback(async () => {
    if (!artifact || !currentUser?._id) return

    setIsSaving(true)
    try {
      await updateArtifact({
        artifactId: artifact._id,
        userId: currentUser._id,
        content: editContent,
      })
      toast.success(`Artifak diperbarui ke v${artifact.version + 1}`)
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update artifact:", error)
      toast.error("Gagal menyimpan perubahan")
    } finally {
      setIsSaving(false)
    }
  }, [artifact, currentUser?._id, editContent, updateArtifact])

  const handleDownload = useCallback((format: DownloadFormat) => {
    if (!artifact) return

    const formatConfig: Record<DownloadFormat, { ext: string; mime: string }> = {
      docx: { ext: ".md", mime: "text/markdown" },
      pdf: { ext: ".md", mime: "text/markdown" },
      txt: { ext: ".txt", mime: "text/plain" },
    }

    const config = formatConfig[format]
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
  }, [artifact])

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

  const handleApplyRefrasa = useCallback(async () => {
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
  }, [artifact, currentUser?._id, refrasaResult, resetRefrasa, updateArtifact])

  if (!isOpen) return null

  if (!artifact) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm dark:bg-slate-950/70"
          onClick={requestClose}
        />
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </div>
    )
  }

  const isChartArtifact = artifact.type === "chart"
  const isMermaid = artifact.type === "code" && isMermaidContent(artifact.content)
  const isCodeArtifact = artifact.type === "code" || artifact.format === "latex"
  const language = artifact.format ? formatToLanguage[artifact.format] : undefined
  const shouldRenderMarkdown = !isChartArtifact && !isMermaid && !isCodeArtifact
  const hasMultipleVersions = (versionHistory?.length ?? 0) > 1
  const contentTypeLabel = isChartArtifact
    ? "Chart"
    : isMermaid
      ? "Mermaid Diagram"
      : isCodeArtifact
        ? `Code${language ? ` • ${language}` : ""}`
        : shouldRenderMarkdown
          ? "Markdown"
        : "Teks"
  const wordCount = artifact.content.trim().length === 0
    ? 0
    : artifact.content.trim().split(/\s+/).length

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm dark:bg-slate-950/70"
          onClick={requestClose}
          aria-label="Close modal"
        />

        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="artifact-fullscreen-title"
          className={cn(
            "relative z-10 flex h-[100dvh] w-screen flex-col overflow-hidden rounded-none border-0 bg-slate-100 shadow-none dark:bg-slate-800"
          )}
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-slate-300/75 bg-slate-100 px-4 py-2.5 dark:border-slate-700/80 dark:bg-slate-800 md:px-5 md:py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 id="artifact-fullscreen-title" className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {artifact.title}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      ref={primaryCloseButtonRef}
                      onClick={requestClose}
                      className="flex h-8 w-8 items-center justify-center rounded-action text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-slate-100"
                      aria-label="Tutup fullscreen"
                    >
                      <Collapse className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="font-mono text-xs">Tutup fullscreen</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-badge border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-primary">
                  {isEditing ? "Mode Edit" : "Mode Baca"}
                </span>

                {hasMultipleVersions ? (
                  <Select
                    value={viewingVersionId ?? undefined}
                    onValueChange={(v) => {
                      if (isEditing) return
                      setViewingVersionId(v as Id<"artifacts">)
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      disabled={isEditing}
                      className="h-6 w-auto min-w-[140px] rounded-action border-slate-300/85 bg-slate-200/80 px-2 py-0 text-[11px] font-mono text-slate-800 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
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

                {isFinal && (
                  <span className="rounded-badge border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    FINAL
                  </span>
                )}

                {hasUnsavedChanges && (
                  <span className="rounded-badge border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Draft belum disimpan
                  </span>
                )}

                <span className="rounded-badge border border-slate-300/80 bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100">
                  {contentTypeLabel}
                </span>
                <span className="rounded-badge border border-slate-300/80 bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100">
                  {wordCount} kata
                </span>
                <span className="rounded-badge border border-slate-300/80 bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100">
                  {artifact.content.length} karakter
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      setEditContent(artifact.content)
                      }}
                      disabled={isSaving}
                      className="h-7 px-2.5 font-mono text-[11px] text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !editContent.trim()}
                      className="h-7 px-2.5 font-mono text-[11px]"
                    >
                      {isSaving ? (
                        <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Simpan
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-7 px-2.5 font-mono text-[11px]"
                    >
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      disabled={copied}
                      className={cn(
                        "h-7 px-2.5 font-mono text-[11px]",
                        copied && "border-primary/40 bg-primary/10 text-primary"
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Disalin
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Salin
                        </>
                      )}
                    </Button>

                    {isRefrasaEnabled !== false && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefrasaTrigger}
                        disabled={isRefrasaLoading || !canRefrasa}
                        className="h-7 px-2.5 font-mono text-[11px]"
                      >
                        <MagicWand className="mr-1.5 h-3.5 w-3.5" />
                        Refrasa
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 font-mono text-[11px]"
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Download
                          <NavArrowDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="font-mono text-xs">
                        <DropdownMenuItem onClick={() => handleDownload("docx")}>DOCX</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload("pdf")}>PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload("txt")}>TXT</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="relative min-w-0 flex-1 overflow-hidden px-4 py-3 md:px-5 md:py-4">
              {isRefrasaLoading && (
                <div className="absolute inset-3 z-10 flex items-center justify-center rounded-action border border-slate-300/85 bg-slate-100/75 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/75">
                  <RefrasaLoadingIndicator />
                </div>
              )}

              {isEditing ? (
                <div className="h-full overflow-hidden rounded-shell border border-slate-300/85 bg-slate-50 shadow-sm dark:border-slate-700/70 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-300/80 px-3 py-1.5 dark:border-slate-700/70">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Workspace Editor
                    </p>
                    <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                      {editWordCount} kata • {editCharCount} karakter • Ctrl/Cmd+S untuk simpan
                    </p>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                        e.preventDefault()
                        if (!isSaving && editContent.trim()) {
                          void handleSave()
                        }
                      }
                    }}
                    className="h-[calc(100%-31px)] w-full resize-none bg-transparent p-4 text-base leading-7 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset dark:text-slate-100"
                    placeholder="Edit konten artifak..."
                    autoFocus
                    spellCheck
                  />
                </div>
              ) : (
                <div className="h-full overflow-hidden rounded-shell border border-slate-300/85 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900">
                  <div className="h-full overflow-auto p-3 md:p-4 scrollbar-thin">
                    {isChartArtifact ? (
                      <ChartRenderer content={artifact.content} />
                    ) : isMermaid ? (
                      <MermaidRenderer code={artifact.content} />
                    ) : isCodeArtifact && language ? (
                      <div className="overflow-hidden rounded-action border border-slate-300/85 dark:border-slate-700/70">
                        <SyntaxHighlighter
                          language={language}
                          style={oneDark}
                          customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            fontSize: "0.8rem",
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
                        className="max-w-none rounded-action border border-slate-300/80 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-100"
                        sources={artifact.sources}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap rounded-action border border-slate-300/80 bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-900 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-100">
                        {artifact.content}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isEditing && (
              <aside className="hidden w-[300px] shrink-0 border-l border-slate-300/80 bg-slate-100 dark:border-slate-700/80 dark:bg-slate-800 xl:flex xl:flex-col">
                <div className="border-b border-slate-300/80 px-3 py-2 dark:border-slate-700/70">
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Sumber Terkait
                  </p>
                </div>
                <div className="flex-1 overflow-auto p-3 scrollbar-thin">
                  <div className="mb-3 rounded-action border border-slate-300/80 bg-slate-200/60 p-2.5 dark:border-slate-700/70 dark:bg-slate-900/70">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Artifak lainnya
                      </p>
                      <span className="rounded-badge border border-slate-300/80 bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100">
                        {sessionArtifactCount}
                      </span>
                    </div>
                    <Select
                      value={selectedArtifactValue}
                      onValueChange={(value) => {
                        const selectedId = value as Id<"artifacts">
                        setActiveArtifactId(selectedId)
                        setViewingVersionId(selectedId)
                        setIsEditing(false)
                      }}
                    >
                      <SelectTrigger
                        className="h-8 w-full border-slate-300/80 bg-slate-100 px-2 text-[11px] font-mono text-slate-800 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-100"
                        disabled={sessionArtifactCount <= 1}
                      >
                        <SelectValue placeholder="Tidak ada artifak lain" />
                      </SelectTrigger>
                      <SelectContent>
                        {latestArtifactsInSession.map((sessionArtifact) => (
                          <SelectItem key={sessionArtifact._id} value={sessionArtifact._id}>
                            {sessionArtifact.title} • v{sessionArtifact.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {artifact.sources && artifact.sources.length > 0 ? (
                    <SourcesIndicator sources={artifact.sources} />
                  ) : (
                    <p className="text-[11px] font-mono text-slate-600 dark:text-slate-100">
                      Tidak ada sumber eksternal untuk versi ini.
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>

          {!isEditing && (
            <div className="border-t border-slate-300/80 bg-slate-100 px-4 py-1.5 dark:border-slate-700/70 dark:bg-slate-800 md:px-5 xl:hidden">
              <div className="mb-2 rounded-action border border-slate-300/80 bg-slate-200/60 p-2.5 dark:border-slate-700/70 dark:bg-slate-900/70">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Artifak lainnya
                  </p>
                  <span className="rounded-badge border border-slate-300/80 bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100">
                    {sessionArtifactCount}
                  </span>
                </div>
                <Select
                  value={selectedArtifactValue}
                  onValueChange={(value) => {
                    const selectedId = value as Id<"artifacts">
                    setActiveArtifactId(selectedId)
                    setViewingVersionId(selectedId)
                    setIsEditing(false)
                  }}
                >
                  <SelectTrigger
                    className="h-8 w-full border-slate-300/80 bg-slate-100 px-2 text-[11px] font-mono text-slate-800 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-100"
                    disabled={sessionArtifactCount <= 1}
                  >
                    <SelectValue placeholder="Tidak ada artifak lain" />
                  </SelectTrigger>
                  <SelectContent>
                    {latestArtifactsInSession.map((sessionArtifact) => (
                      <SelectItem key={sessionArtifact._id} value={sessionArtifact._id}>
                        {sessionArtifact.title} • v{sessionArtifact.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {artifact.sources && artifact.sources.length > 0 ? (
                <SourcesIndicator sources={artifact.sources} />
              ) : (
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-100">
                  Tidak ada sumber eksternal untuk versi ini.
                </p>
              )}
            </div>
          )}

        </div>
      </div>

      <AlertDialog open={closeGuardOpen} onOpenChange={setCloseGuardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tutup workspace fullscreen?</AlertDialogTitle>
            <AlertDialogDescription>
              Ada perubahan di mode edit yang belum disimpan. Kalau workspace ditutup sekarang, perubahan akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Lanjut edit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCloseGuardOpen(false)
                setIsEditing(false)
                if (artifact?.content) setEditContent(artifact.content)
                onClose()
              }}
              className="bg-amber-600 text-white hover:bg-amber-500"
            >
              <WarningTriangle className="mr-1.5 h-4 w-4" />
              Tutup tanpa simpan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {refrasaResult && artifact && (
        <RefrasaConfirmDialog
          open={showRefrasaDialog}
          onOpenChange={() => {
            setShowRefrasaDialog(false)
            resetRefrasa()
          }}
          originalContent={artifact.content}
          refrasedText={refrasaResult.refrasedText}
          issues={refrasaResult.issues}
          onApply={handleApplyRefrasa}
          isApplying={isApplyingRefrasa}
        />
      )}
    </>
  )
}
