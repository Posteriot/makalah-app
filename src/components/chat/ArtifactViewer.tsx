"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { CopyIcon, CheckIcon, FileTextIcon, CodeIcon, ListIcon, TableIcon, BookOpenIcon, FunctionSquareIcon, Loader2Icon, PencilIcon, DownloadIcon, HistoryIcon, AlertTriangle, WandSparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ArtifactEditor } from "./ArtifactEditor"
import { VersionHistoryDialog } from "./VersionHistoryDialog"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { SourcesIndicator } from "./SourcesIndicator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants"
import { cn } from "@/lib/utils"
import { useRefrasa } from "@/lib/hooks/useRefrasa"
import {
    RefrasaButton,
    RefrasaConfirmDialog,
    RefrasaLoadingIndicator,
} from "@/components/refrasa"

interface ArtifactViewerProps {
    artifactId: Id<"artifacts"> | null
}

// Map artifact type to icon
const typeIcons: Record<string, React.ElementType> = {
    code: CodeIcon,
    outline: ListIcon,
    section: FileTextIcon,
    table: TableIcon,
    citation: BookOpenIcon,
    formula: FunctionSquareIcon,
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

// Map format to file extension for download
const formatToExtension: Record<string, string> = {
    python: ".py",
    r: ".r",
    javascript: ".js",
    typescript: ".ts",
    latex: ".tex",
    markdown: ".md",
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

// Format timestamp to readable date
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

export function ArtifactViewer({ artifactId }: ArtifactViewerProps) {
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

    // Handle copy to clipboard
    const handleCopy = async () => {
        if (!artifact) return

        try {
            await navigator.clipboard.writeText(artifact.content)
            setCopied(true)
            toast.success("Konten berhasil disalin")
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error("Gagal menyalin konten")
        }
    }

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

    // Handle download
    const handleDownload = () => {
        if (!artifact) return

        // Determine file extension
        const extension = artifact.format
            ? formatToExtension[artifact.format] || ".txt"
            : ".txt"

        // Generate filename: {title}-v{version}.{ext}
        // Sanitize title for filename (remove special chars)
        const sanitizedTitle = artifact.title
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase()
        const filename = `${sanitizedTitle}-v${artifact.version}${extension}`

        // Create blob and download
        const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(`File "${filename}" berhasil diunduh`)
    }

    // Handle version change
    const handleVersionChange = (versionId: string) => {
        setViewingVersionId(versionId as Id<"artifacts">)
    }

    // Handle refrasa trigger (from button or context menu)
    const handleRefrasaTrigger = async () => {
        if (!artifact) return

        // Reset previous state
        resetRefrasa()

        // Start analysis
        await analyzeAndRefrasa(artifact.content, artifact._id)
    }

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
    const getWordCount = (content: string): number => {
        return content.trim().split(/\s+/).filter(Boolean).length
    }

    // Empty state - no artifact selected
    if (!artifactId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <FileTextIcon className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">Pilih artifact untuk melihat konten</p>
            </div>
        )
    }

    // Loading state
    if (artifact === undefined) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <Loader2Icon className="h-8 w-8 animate-spin mb-4" />
                <p>Memuat artifact...</p>
            </div>
        )
    }

    // Error state - artifact not found
    if (artifact === null) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <FileTextIcon className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">Artifact tidak ditemukan</p>
            </div>
        )
    }

    const TypeIcon = typeIcons[artifact.type] || FileTextIcon
    const isCodeArtifact = artifact.type === "code" || artifact.format === "latex"
    const language = artifact.format ? formatToLanguage[artifact.format] : undefined
    const shouldRenderMarkdown = !isCodeArtifact
    const isInvalidated = isArtifactInvalidated(artifact)
    const invalidatedStageLabel = artifact.invalidatedByRewindToStage
        ? getStageLabelSafe(artifact.invalidatedByRewindToStage)
        : null

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <TypeIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <h2 className="font-semibold truncate">{artifact.title}</h2>
                    </div>
                    {isInvalidated ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    data-testid="artifact-type-badge"
                                    variant="secondary"
                                    className={cn(
                                        "shrink-0 capitalize cursor-help",
                                        "bg-amber-500/20 text-amber-500 border-amber-500/30"
                                    )}
                                >
                                    <AlertTriangle className="h-3 w-3 mr-1" data-testid="invalidation-indicator" />
                                    {artifact.type}
                                </Badge>
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
                    ) : (
                        <Badge
                            data-testid="artifact-type-badge"
                            variant="secondary"
                            className="shrink-0 capitalize"
                        >
                            {artifact.type}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {/* Version dropdown */}
                    {versionHistory && versionHistory.length > 1 ? (
                        <div className="flex items-center gap-1">
                            <HistoryIcon className="h-3 w-3" />
                            <Select
                                value={viewingVersionId ?? undefined}
                                onValueChange={handleVersionChange}
                            >
                                <SelectTrigger size="sm" className="h-6 text-xs w-auto min-w-[100px]">
                                    <SelectValue placeholder="Version" />
                                </SelectTrigger>
                                <SelectContent>
                                    {versionHistory.map((v) => (
                                        <SelectItem key={v._id} value={v._id}>
                                            v{v.version} - {formatShortDate(v.createdAt)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <span>v{artifact.version}</span>
                    )}
                    <span>•</span>
                    <span>{formatDate(artifact.updatedAt ?? artifact.createdAt)}</span>
                </div>
                {artifact.description && (
                    <p className="text-sm text-muted-foreground">{artifact.description}</p>
                )}
            </div>

            {/* Invalidation Warning Banner */}
            {isInvalidated && (
                <Alert variant="warning" className="mx-4 mt-2" data-testid="invalidation-warning">
                    <AlertTriangle className="h-4 w-4" data-testid="invalidation-warning-icon" />
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
                    {/* Content with Context Menu */}
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <div className="flex-1 overflow-auto p-4 relative scrollbar-thin">
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
                                            fontSize: "0.875rem",
                                        }}
                                        showLineNumbers
                                    >
                                        {artifact.content}
                                    </SyntaxHighlighter>
                                ) : shouldRenderMarkdown ? (
                                    <MarkdownRenderer
                                        markdown={artifact.content}
                                        className="space-y-2 text-sm"
                                        sources={artifact.sources}
                                    />
                                ) : (
                                    <pre className="whitespace-pre-wrap font-sans bg-muted p-4 rounded-lg text-sm">
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
                                    <WandSparkles className="h-4 w-4 mr-2" />
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

                    {/* Actions */}
                    <div className="p-4 border-t flex justify-end gap-2 flex-wrap">
                        {/* Version History Dialog - only show if multiple versions */}
                        {artifactId && (
                            <VersionHistoryDialog
                                artifactId={artifactId}
                                currentVersionId={viewingVersionId}
                                onSelectVersion={(versionId) => setViewingVersionId(versionId)}
                            />
                        )}
                        {/* Refrasa Button - hidden when disabled by admin */}
                        {isRefrasaEnabled !== false && (
                            <RefrasaButton
                                onClick={handleRefrasaTrigger}
                                isLoading={isRefrasaLoading}
                                isEditing={isEditing}
                                hasArtifact={!!artifact}
                                contentLength={artifact.content.length}
                                wordCount={getWordCount(artifact.content)}
                            />
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                        >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                        >
                            <DownloadIcon className="h-4 w-4 mr-1" />
                            Unduh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            disabled={copied}
                        >
                            {copied ? (
                                <>
                                    <CheckIcon className="h-4 w-4 mr-1" />
                                    Disalin
                                </>
                            ) : (
                                <>
                                    <CopyIcon className="h-4 w-4 mr-1" />
                                    Salin
                                </>
                            )}
                        </Button>
                    </div>
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
}
