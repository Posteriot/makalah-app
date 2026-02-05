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

// Format short date for version dropdown
function formatShortDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    })
}

// Format timestamp to readable date (with time)
function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

// Check if artifact is invalidated
function isArtifactInvalidated(artifact: { invalidatedAt?: number }): boolean {
    return artifact.invalidatedAt !== undefined && artifact.invalidatedAt !== null
}

// Get stage label safely
function getStageLabelSafe(stageId: string | undefined): string {
    if (!stageId) return "unknown"
    try {
        return getStageLabel(stageId as PaperStageId)
    } catch {
        return stageId // fallback to raw stage ID
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

    // Refrasa tool visibility (admin toggle)
    const isRefrasaEnabled = useQuery(api.aiProviderConfigs.getRefrasaEnabled)

    const updateArtifact = useMutation(api.artifacts.update)

    // Sync viewingVersionId with artifactId prop when it changes
    useEffect(() => {
        setViewingVersionId(artifactId)
    }, [artifactId])

    // Query the artifact we're currently viewing (may be different version)
    const artifact = useQuery(
        api.artifacts.get,
        viewingVersionId && currentUser?._id
            ? { artifactId: viewingVersionId, userId: currentUser._id }
            : "skip"
    )

    // Query version history for the artifact
    const versionHistory = useQuery(
        api.artifacts.getVersionHistory,
        artifactId && currentUser?._id
            ? { artifactId, userId: currentUser._id }
            : "skip"
    )

    // Query FINAL status - check if artifact is validated in paper session
    const finalStatus = useQuery(
        api.artifacts.checkFinalStatus,
        viewingVersionId && currentUser?._id
            ? { artifactId: viewingVersionId, userId: currentUser._id }
            : "skip"
    )
    const isFinal = finalStatus?.isFinal ?? false

    // Handle copy to clipboard
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

    // Handle save edited content (creates new version)
    const handleSave = async (newContent: string) => {
        if (!artifact || !currentUser?._id) return

        setIsSaving(true)
        try {
            await updateArtifact({
                artifactId: artifact._id,
                userId: currentUser._id,
                content: newContent,
            })
            toast.success(`Artifact diperbarui ke v${artifact.version + 1}`)
            setIsEditing(false)
        } catch (error) {
            console.error("Failed to update artifact:", error)
            toast.error("Gagal menyimpan perubahan")
        } finally {
            setIsSaving(false)
        }
    }

    // Handle download with format selection
    const handleDownload = useCallback(() => {
        if (!artifact) return

        // Map download format to extension and MIME type
        // Note: For proper DOCX/PDF export, backend would be needed
        // For now, we export as text-based formats
        const formatConfig: Record<DownloadFormat, { ext: string; mime: string }> = {
            docx: { ext: ".md", mime: "text/markdown" }, // Markdown for now (proper DOCX needs backend)
            pdf: { ext: ".md", mime: "text/markdown" },   // Markdown for now (proper PDF needs backend)
            txt: { ext: ".txt", mime: "text/plain" },
        }

        const config = formatConfig[downloadFormat]
        const sanitizedTitle = artifact.title
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase()
        const filename = `${sanitizedTitle}-v${artifact.version}${config.ext}`

        // Create blob and download
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

    // Handle version change
    const handleVersionChange = (versionId: string) => {
        setViewingVersionId(versionId as Id<"artifacts">)
    }

    // Handle refrasa trigger (from button or context menu)
    const handleRefrasaTrigger = useCallback(async () => {
        if (!artifact) return

        // Reset previous state
        resetRefrasa()

        // Start analysis
        await analyzeAndRefrasa(artifact.content, artifact._id)
    }, [artifact, analyzeAndRefrasa, resetRefrasa])

    // Show dialog when result is ready
    useEffect(() => {
        if (refrasaResult && !refrasaError) {
            setShowRefrasaDialog(true)
        }
    }, [refrasaResult, refrasaError])

    // Show error toast
    useEffect(() => {
        if (refrasaError) {
            toast.error(`Gagal menganalisis: ${refrasaError}`)
        }
    }, [refrasaError])

    // Handle apply refrasa changes
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

    // Handle close refrasa dialog
    const handleCloseRefrasaDialog = () => {
        setShowRefrasaDialog(false)
        resetRefrasa()
    }

    // Calculate word count for warning
    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
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
            canRefrasa: isRefrasaEnabled !== false && (artifact?.content?.length ?? 0) >= 50,
            hasArtifact: !!artifact,
        }),
    }), [copied, isEditing, downloadFormat, isRefrasaLoading, isRefrasaEnabled, artifact, handleDownload, handleCopy, handleRefrasaTrigger])

    // Empty state - no artifact selected
    if (!artifactId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <Page className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">Pilih artifact untuk melihat konten</p>
            </div>
        )
    }

    // Loading state
    if (artifact === undefined) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <span className="h-8 w-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mb-4" />
                <p>Memuat artifact...</p>
            </div>
        )
    }

    // Error state - artifact not found
    if (artifact === null) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <Page className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">Artifact tidak ditemukan</p>
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

    return (
        <div className="flex flex-col h-full">
            {/* Compact Header - Version selector + FINAL badge + Invalidation indicator */}
            {(versionHistory && versionHistory.length > 1) || isFinal || isInvalidated ? (
                <div className="px-4 py-2 flex items-center gap-2 border-b border-border">
                    {/* Version selector - only if multiple versions */}
                    {versionHistory && versionHistory.length > 1 && (
                        <Select
                            value={viewingVersionId ?? undefined}
                            onValueChange={handleVersionChange}
                        >
                            <SelectTrigger
                                size="sm"
                                className="h-6 text-[11px] font-medium w-auto min-w-[60px] px-2 py-0 rounded bg-muted border-0"
                            >
                                <SelectValue placeholder="v1" />
                            </SelectTrigger>
                            <SelectContent>
                                {versionHistory.map((v) => (
                                    <SelectItem key={v._id} value={v._id}>
                                        v{v.version} - {formatShortDate(v.createdAt)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* FINAL Badge */}
                    {isFinal && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                            FINAL
                        </span>
                    )}

                    {/* Invalidation indicator with tooltip */}
                    {isInvalidated && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[11px] cursor-help",
                                        "bg-amber-500/20 text-amber-500"
                                    )}
                                    data-testid="artifact-type-badge"
                                >
                                    <WarningTriangle className="h-3 w-3 mr-1 inline-block" data-testid="invalidation-indicator" />
                                    Perlu revisi
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[250px]">
                                <p className="text-xs">
                                    <strong>Artifact perlu direvisi</strong>
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
            ) : null}

            {/* Invalidation Warning Banner */}
            {isInvalidated && (
                <Alert variant="warning" className="mx-4 mt-2" data-testid="invalidation-warning">
                    <WarningTriangle className="h-4 w-4" data-testid="invalidation-warning-icon" />
                    <AlertDescription>
                        <span className="font-medium">Artifact perlu di-update</span>
                        {invalidatedStageLabel && (
                            <span> karena rewind ke tahap <strong>{invalidatedStageLabel}</strong></span>
                        )}
                        <span className="block text-xs mt-1 text-amber-400/80">
                            Gunakan chat untuk meminta AI memperbarui artifact ini.
                        </span>
                    </AlertDescription>
                </Alert>
            )}

            {/* Content or Editor */}
            {isEditing ? (
                <ArtifactEditor
                    content={artifact.content}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                    isLoading={isSaving}
                />
            ) : (
                <>
                    {/* Content with Context Menu - Mockup style: 14px, line-height 1.7 */}
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <div className="flex-1 overflow-auto px-4 py-1 relative scrollbar-thin">
                                {/* Loading indicator for Refrasa */}
                                {isRefrasaLoading && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                        <RefrasaLoadingIndicator />
                                    </div>
                                )}

                                {isCodeArtifact && language ? (
                                    <SyntaxHighlighter
                                        language={language}
                                        style={oneDark}
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: "0.5rem",
                                            fontSize: "0.625rem", // text-sm = 10px
                                            lineHeight: "1.625", // leading-relaxed
                                        }}
                                        showLineNumbers
                                    >
                                        {artifact.content}
                                    </SyntaxHighlighter>
                                ) : shouldRenderMarkdown ? (
                                    <MarkdownRenderer
                                        markdown={artifact.content}
                                        className="space-y-3 text-sm leading-relaxed"
                                        sources={artifact.sources}
                                    />
                                ) : (
                                    <pre className="whitespace-pre-wrap font-sans bg-muted p-4 rounded-lg text-sm leading-relaxed">
                                        {artifact.content}
                                    </pre>
                                )}
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            {/* Refrasa menu item - hidden when disabled by admin */}
                            {isRefrasaEnabled !== false && (
                                <ContextMenuItem
                                    onClick={handleRefrasaTrigger}
                                    disabled={isRefrasaLoading || artifact.content.length < 50}
                                >
                                    <MagicWand className="h-4 w-4 mr-2" />
                                    Refrasa
                                </ContextMenuItem>
                            )}
                        </ContextMenuContent>
                    </ContextMenu>

                    {/* Sources Indicator */}
                    {artifact.sources && artifact.sources.length > 0 && (
                        <div className="px-4 pb-2 border-b">
                            <SourcesIndicator sources={artifact.sources} />
                        </div>
                    )}

                    {/* Actions Bar moved to ArtifactPanel header */}
                </>
            )}

            {/* Refrasa Confirm Dialog */}
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
})
