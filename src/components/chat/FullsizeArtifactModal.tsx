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
  Xmark,
  Collapse,
  Download,
  Check,
  Copy,
  NavArrowDown,
  MagicWand,
  WarningTriangle,
} from "iconoir-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { SourcesIndicator } from "./SourcesIndicator"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
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

function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function FullsizeArtifactModal({
  artifactId,
  isOpen,
  onClose,
}: FullsizeArtifactModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const primaryCloseButtonRef = useRef<HTMLButtonElement>(null)
  const [viewingVersionId, setViewingVersionId] = useState<Id<"artifacts"> | null>(artifactId)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("docx")
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
    setViewingVersionId(artifactId)
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
  const canRefrasa = isRefrasaEnabled !== false && (artifact?.content?.length ?? 0) >= 50

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
      toast.success(`Artifact diperbarui ke v${artifact.version + 1}`)
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update artifact:", error)
      toast.error("Gagal menyimpan perubahan")
    } finally {
      setIsSaving(false)
    }
  }, [artifact, currentUser?._id, editContent, updateArtifact])

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
          className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          onClick={requestClose}
        />
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </div>
    )
  }

  const isCodeArtifact = artifact.type === "code" || artifact.format === "latex"
  const language = artifact.format ? formatToLanguage[artifact.format] : undefined
  const shouldRenderMarkdown = !isCodeArtifact
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          onClick={requestClose}
          aria-label="Close modal"
        />

        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="artifact-fullscreen-title"
          className={cn(
            "relative z-10 flex flex-col overflow-hidden rounded-shell border border-border/60 bg-card shadow-2xl",
            "mt-[52px] h-[calc(100vh-52px-20px)] w-[calc(100vw-20px)] md:w-[calc(100vw-72px)]"
          )}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-border/60 bg-card/95 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground/85">
                  Workspace Fullscreen
                </p>
                <h2 id="artifact-fullscreen-title" className="truncate text-lg font-semibold text-foreground">
                  {artifact.title}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      ref={primaryCloseButtonRef}
                      onClick={requestClose}
                      className="flex h-8 w-8 items-center justify-center rounded-action text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label="Minimize"
                    >
                      <Collapse className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="font-mono text-xs">Minimize</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={requestClose}
                      className="flex h-8 w-8 items-center justify-center rounded-action text-muted-foreground transition-colors hover:bg-rose-500/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label="Close (ESC)"
                    >
                      <Xmark className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="font-mono text-xs">Close (ESC)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
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
                    className="h-6 w-auto min-w-[140px] rounded-action border-border/60 bg-background/80 px-2 py-0 text-[11px] font-mono"
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
                <span className="rounded-badge border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
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

              {hasUnsavedChanges && (
                <span className="rounded-badge border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Draft belum disimpan
                </span>
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

          {/* Content */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="relative min-w-0 flex-1 overflow-hidden px-5 py-4 md:px-7 md:py-5">
              {isRefrasaLoading && (
                <div className="absolute inset-3 z-10 flex items-center justify-center rounded-action border border-border/60 bg-background/75 backdrop-blur-sm">
                  <RefrasaLoadingIndicator />
                </div>
              )}

              {isEditing ? (
                <div className="h-full overflow-hidden rounded-shell border border-border/60 bg-background/70 shadow-sm">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="h-full w-full resize-none bg-transparent p-4 text-sm font-mono leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                    placeholder="Edit konten artifact..."
                    autoFocus
                  />
                </div>
              ) : (
                <div className="h-full overflow-hidden rounded-shell border border-border/60 bg-background/35">
                  <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground/85">
                      Workspace Dokumen
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/85">
                      Fokus baca penuh
                    </p>
                  </div>

                  <div className="h-[calc(100%-35px)] overflow-auto p-4 scrollbar-thin">
                    {isCodeArtifact && language ? (
                      <div className="overflow-hidden rounded-action border border-border/60">
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
                        className="max-w-none rounded-action border border-border/50 bg-background/40 p-5 text-sm leading-relaxed"
                        sources={artifact.sources}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap rounded-action border border-border/50 bg-background/40 p-6 font-sans text-sm leading-relaxed">
                        {artifact.content}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isEditing && (
              <aside className="hidden w-[300px] shrink-0 border-l border-border/60 bg-card/50 xl:flex xl:flex-col">
                <div className="border-b border-border/50 px-3 py-2">
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground/85">
                    Sumber Terkait
                  </p>
                </div>
                <div className="flex-1 overflow-auto p-3 scrollbar-thin">
                  {artifact.sources && artifact.sources.length > 0 ? (
                    <SourcesIndicator sources={artifact.sources} />
                  ) : (
                    <p className="text-[11px] font-mono text-muted-foreground/75">
                      Tidak ada sumber eksternal untuk versi ini.
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>

          {!isEditing && (
            <div className="border-t border-border/60 bg-card/40 px-5 py-2 xl:hidden">
              {artifact.sources && artifact.sources.length > 0 ? (
                <SourcesIndicator sources={artifact.sources} />
              ) : (
                <p className="text-[11px] font-mono text-muted-foreground/75">
                  Tidak ada sumber eksternal untuk versi ini.
                </p>
              )}
            </div>
          )}

          {/* Action bar */}
          <div className="shrink-0 border-t border-border/60 bg-card/90 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="h-9 rounded-r-none border-r-0 font-mono"
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    <span className="uppercase">{downloadFormat}</span>
                  </Button>
                  <Select
                    value={downloadFormat}
                    onValueChange={(v) => setDownloadFormat(v as DownloadFormat)}
                  >
                    <SelectTrigger className="h-9 w-8 rounded-l-none border-l-0 px-2 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1">
                      <NavArrowDown className="h-3 w-3" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docx">DOCX</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="txt">TXT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isRefrasaEnabled !== false && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefrasaTrigger}
                    disabled={isRefrasaLoading || !canRefrasa}
                    className="h-9 font-mono"
                  >
                    <MagicWand className="mr-1.5 h-4 w-4" />
                    Refrasa
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
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
                      className="h-9 font-mono text-muted-foreground hover:text-foreground"
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !editContent.trim()}
                      className="h-9 font-mono"
                    >
                      {isSaving ? (
                        <span className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Check className="mr-1.5 h-4 w-4" />
                      )}
                      Simpan
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-9 font-mono"
                  >
                    Edit
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={copied}
                  className={cn(
                    "h-9 font-mono",
                    copied && "border-primary/40 bg-primary/10 text-primary"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Disalin
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-4 w-4" />
                      Salin
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
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
