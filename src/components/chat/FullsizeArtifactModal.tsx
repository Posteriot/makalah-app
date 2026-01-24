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
} from "@/components/ui/select"
import {
    XIcon,
    Minimize2Icon,
    DownloadIcon,
    CheckIcon,
    CopyIcon,
    Loader2Icon,
    ChevronDownIcon,
    WandSparkles,
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useRefrasa } from "@/lib/hooks/useRefrasa"
import {
    RefrasaConfirmDialog,
    RefrasaLoadingIndicator,
} from "@/components/refrasa"

interface FullsizeArtifactModalProps {
    artifactId: Id<"artifacts">
    isOpen: boolean
    onClose: () => void
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

// Download format options
type DownloadFormat = "docx" | "pdf" | "txt"

/**
 * FullsizeArtifactModal - Fullscreen landscape artifact viewer/editor
 *
 * Layout (per mockup):
 * - Fixed overlay below app header (52px)
 * - Full width container with slight margin
 * - Header: muted bg, title + version badge (green), minimize/close buttons
 * - Content: scrollable, 15px font, 1.7 line-height
 * - Actions: muted bg, left (Download, Save, Rephrase) / right (Cancel, Copy)
 */
export function FullsizeArtifactModal({
    artifactId,
    isOpen,
    onClose,
}: FullsizeArtifactModalProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("docx")
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

    // Fetch artifact
    const artifact = useQuery(
        api.artifacts.get,
        currentUser?._id
            ? { artifactId, userId: currentUser._id }
            : "skip"
    )

    // Initialize edit content when artifact loads or changes
    useEffect(() => {
        if (artifact?.content) {
            setEditContent(artifact.content)
        }
    }, [artifact?.content])

    // Reset editing state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false)
            setCopied(false)
        }
    }, [isOpen])

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, onClose])

    // Prevent body scroll when modal is open
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

    // Handle save edited content
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

    // Handle download
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

    // Handle refrasa trigger
    const handleRefrasaTrigger = useCallback(async () => {
        if (!artifact) return
        resetRefrasa()
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

    // Don't render if not open
    if (!isOpen) return null

    // Loading state
    if (!artifact) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-content">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                />
                {/* Loading */}
                <div className="relative z-10 flex items-center justify-center w-full h-full">
                    <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    const isCodeArtifact = artifact.type === "code" || artifact.format === "latex"
    const language = artifact.format ? formatToLanguage[artifact.format] : undefined
    const shouldRenderMarkdown = !isCodeArtifact

    return (
        <>
            {/* Fullscreen Overlay */}
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop with blur */}
                <div
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                    aria-label="Close modal"
                />

                {/* Container - Landscape fullscreen below header */}
                <div
                    className={cn(
                        "relative z-10 flex flex-col",
                        "w-[calc(100vw-80px)] h-[calc(100vh-52px-32px-40px)]", // Full width minus margin, height minus header/footer
                        "mt-[52px]", // Below app header (52px)
                        "bg-card rounded-lg border border-border",
                        "shadow-2xl overflow-hidden"
                    )}
                >
                    {/* Header - Muted background like mockup */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted shrink-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-foreground">
                                {artifact.title}
                            </h2>
                            {/* Version badge - Green/Primary like mockup */}
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary text-primary-foreground">
                                v{artifact.version}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Minimize Button */}
                            <button
                                onClick={onClose}
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-md",
                                    "text-muted-foreground hover:text-foreground",
                                    "hover:bg-accent transition-colors"
                                )}
                                title="Minimize"
                            >
                                <Minimize2Icon className="h-4 w-4" />
                            </button>
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-md",
                                    "text-muted-foreground",
                                    "hover:bg-red-500/90 hover:text-white transition-colors"
                                )}
                                title="Close (ESC)"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content - Scrollable area */}
                    <div
                        className={cn(
                            "flex-1 overflow-auto px-8 py-6 relative",
                            "text-base leading-relaxed text-foreground",
                            isEditing && "bg-muted/30"
                        )}
                    >
                        {/* Loading indicator for Refrasa */}
                        {isRefrasaLoading && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                <RefrasaLoadingIndicator />
                            </div>
                        )}

                        {isEditing ? (
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className={cn(
                                    "w-full h-full min-h-[300px] p-4",
                                    "bg-background rounded-lg border border-border",
                                    "text-base leading-relaxed text-foreground",
                                    "focus:outline-none focus:ring-2 focus:ring-primary",
                                    "resize-none"
                                )}
                                placeholder="Edit konten artifact..."
                                autoFocus
                            />
                        ) : (
                            <div className="max-w-none">
                                {isCodeArtifact && language ? (
                                    <SyntaxHighlighter
                                        language={language}
                                        style={oneDark}
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: "0.5rem",
                                            fontSize: "0.75rem", // text-base = 12px
                                            lineHeight: "1.625", // leading-relaxed
                                        }}
                                        showLineNumbers
                                    >
                                        {artifact.content}
                                    </SyntaxHighlighter>
                                ) : shouldRenderMarkdown ? (
                                    <MarkdownRenderer
                                        markdown={artifact.content}
                                        className="prose-lg prose-invert max-w-none"
                                        sources={artifact.sources}
                                    />
                                ) : (
                                    <pre className="whitespace-pre-wrap font-sans bg-muted p-6 rounded-lg">
                                        {artifact.content}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions Bar - Muted background, split left/right */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted shrink-0">
                        {/* Left Actions */}
                        <div className="flex items-center gap-2">
                            {/* Download Dropdown */}
                            <div className="flex items-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    className="rounded-r-none border-r-0 h-9"
                                >
                                    <DownloadIcon className="h-4 w-4 mr-1.5" />
                                    <span className="capitalize">{downloadFormat}</span>
                                </Button>
                                <Select
                                    value={downloadFormat}
                                    onValueChange={(v) => setDownloadFormat(v as DownloadFormat)}
                                >
                                    <SelectTrigger className="h-9 w-8 rounded-l-none border-l-0 px-2">
                                        <ChevronDownIcon className="h-3 w-3" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="docx">Docx</SelectItem>
                                        <SelectItem value="pdf">PDF</SelectItem>
                                        <SelectItem value="txt">TXT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Save Button (when editing) - Primary color */}
                            {isEditing && (
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="h-9 bg-primary hover:bg-primary/90"
                                >
                                    {isSaving ? (
                                        <Loader2Icon className="h-4 w-4 mr-1.5 animate-spin" />
                                    ) : (
                                        <CheckIcon className="h-4 w-4 mr-1.5" />
                                    )}
                                    Simpan
                                </Button>
                            )}

                            {/* Refrasa Button (when not editing) */}
                            {isRefrasaEnabled !== false && !isEditing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefrasaTrigger}
                                    disabled={isRefrasaLoading || artifact.content.length < 50}
                                    className="h-9"
                                >
                                    <WandSparkles className="h-4 w-4 mr-1.5" />
                                    Refrasa
                                </Button>
                            )}
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                            {/* Cancel Button (when editing) - Ghost style */}
                            {isEditing && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsEditing(false)
                                        setEditContent(artifact.content)
                                    }}
                                    className="h-9 text-muted-foreground hover:text-foreground"
                                >
                                    Batal
                                </Button>
                            )}

                            {/* Edit Button (when not editing) */}
                            {!isEditing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="h-9"
                                >
                                    Edit
                                </Button>
                            )}

                            {/* Copy Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                disabled={copied}
                                className="h-9"
                            >
                                {copied ? (
                                    <>
                                        <CheckIcon className="h-4 w-4 mr-1.5" />
                                        Disalin
                                    </>
                                ) : (
                                    <>
                                        <CopyIcon className="h-4 w-4 mr-1.5" />
                                        Salin
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Refrasa Confirm Dialog */}
            {refrasaResult && (
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
