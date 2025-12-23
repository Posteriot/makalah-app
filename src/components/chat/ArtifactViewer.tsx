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
import { CopyIcon, CheckIcon, FileTextIcon, CodeIcon, ListIcon, TableIcon, BookOpenIcon, FunctionSquareIcon, Loader2Icon, PencilIcon, DownloadIcon, HistoryIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ArtifactEditor } from "./ArtifactEditor"
import { VersionHistoryDialog } from "./VersionHistoryDialog"

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

export function ArtifactViewer({ artifactId }: ArtifactViewerProps) {
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [viewingVersionId, setViewingVersionId] = useState<Id<"artifacts"> | null>(artifactId)
    const { user: currentUser } = useCurrentUser()

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

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <TypeIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <h2 className="font-semibold truncate">{artifact.title}</h2>
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                        {artifact.type}
                    </Badge>
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
                    <span>{formatDate(artifact.createdAt)}</span>
                </div>
                {artifact.description && (
                    <p className="text-sm text-muted-foreground">{artifact.description}</p>
                )}
            </div>

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
                    {/* Content */}
                    <div className="flex-1 overflow-auto p-4">
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
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap font-sans bg-muted p-4 rounded-lg text-sm">
                                    {artifact.content}
                                </pre>
                            </div>
                        )}
                    </div>

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
        </div>
    )
}
