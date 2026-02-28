"use client"

import { UIMessage } from "ai"
import { EditPencil, Xmark, Send, CheckCircle, Page, MediaImage } from "iconoir-react"
import { QuickActions } from "./QuickActions"
import { ArtifactIndicator } from "./ArtifactIndicator"
import { ToolStateIndicator } from "./ToolStateIndicator"
import { SearchStatusIndicator, type SearchStatus } from "./SearchStatusIndicator"
import { SourcesIndicator } from "./SourcesIndicator"
import { useState, useRef, useMemo, useEffect } from "react"
import { Id } from "../../../convex/_generated/dataModel"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { isEditAllowed } from "@/lib/utils/paperPermissions"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatFileSize, isImageType, splitFileName } from "@/lib/types/attached-file"

// Types for paper permission checking
interface StageDataEntry {
    validatedAt?: number;
    [key: string]: unknown;
}

interface PermissionMessage {
    createdAt: number;
    role?: string;
    [key: string]: unknown;
}

type AutoUserAction =
    | {
        kind: "approved";
        stageLabel: string;
        followupText: string;
    }
    | {
        kind: "revision";
        stageLabel: string;
        feedback: string;
    }
    | null;

type ArtifactSignal = {
    artifactId: Id<"artifacts">
    title: string
    status: "created" | "updated"
    version?: number
}

/** Persisted artifact from Convex (for post-refresh signal reconstruction) */
interface PersistedArtifact {
    _id: Id<"artifacts">
    title: string
    version: number
    parentId?: Id<"artifacts">
}

interface MessageBubbleProps {
    message: UIMessage
    onEdit?: (payload: {
        messageId: string
        newContent: string
        fileIds: string[]
        fileNames: string[]
        fileSizes: number[]
        fileTypes: string[]
    }) => void
    onArtifactSelect?: (artifactId: Id<"artifacts">) => void
    /** Keep process indicators visible until overall assistant response completes */
    persistProcessIndicators?: boolean
    // Paper mode edit permissions
    isPaperMode?: boolean
    messageIndex?: number
    currentStageStartIndex?: number
    allMessages?: PermissionMessage[]
    stageData?: Record<string, StageDataEntry>
    /** Persisted artifacts matched to this message (survives page refresh) */
    persistedArtifacts?: PersistedArtifact[]
    /** File name lookup map (fileId → fileName) for history messages */
    fileNameMap?: Map<string, string>
    /** File metadata lookup map (fileId → name/size/type) for history messages */
    fileMetaMap?: Map<string, { name: string; size: number; type: string }>
}

export function MessageBubble({
    message,
    onEdit,
    onArtifactSelect,
    persistProcessIndicators = false,
    isPaperMode = false,
    messageIndex = 0,
    currentStageStartIndex = 0,
    allMessages = [],
    stageData,
    persistedArtifacts,
    fileNameMap,
    fileMetaMap,
}: MessageBubbleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const editAreaRef = useRef<HTMLDivElement>(null)

    const isUser = message.role === 'user'
    const isAssistant = message.role === 'assistant'

    const parseAutoUserAction = (rawContent: string): AutoUserAction => {
        const approvedMatch = rawContent.match(/^\[Approved:\s*(.+?)\]\s*([\s\S]*)$/)
        if (approvedMatch) {
            return {
                kind: "approved",
                stageLabel: approvedMatch[1].trim(),
                followupText: (approvedMatch[2] ?? "").trim(),
            }
        }

        const revisionMatch = rawContent.match(/^\[Revisi untuk\s*(.+?)\]\s*([\s\S]*)$/)
        if (revisionMatch) {
            return {
                kind: "revision",
                stageLabel: revisionMatch[1].trim(),
                feedback: (revisionMatch[2] ?? "").trim(),
            }
        }
        return null
    }

    // Calculate edit permission for this message
    const editPermission = useMemo(() => {
        // Only check permission for user messages
        if (message.role !== "user") {
            return { allowed: false, reason: "Hanya pesan user yang bisa diedit" }
        }

        // If no allMessages provided, fall back to allowing edit
        if (allMessages.length === 0) {
            return { allowed: true }
        }

        return isEditAllowed({
            messages: allMessages,
            messageIndex,
            isPaperMode,
            currentStageStartIndex,
            stageData,
        })
    }, [message.role, allMessages, messageIndex, isPaperMode, currentStageStartIndex, stageData])

    const extractArtifactSignals = (uiMessage: UIMessage): ArtifactSignal[] => {
        const signals: ArtifactSignal[] = []

        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue

            const maybeToolPart = part as unknown as {
                type?: unknown
                state?: unknown
                output?: unknown
                result?: unknown
            }

            const okState =
                maybeToolPart.state === "output-available" || maybeToolPart.state === "result"
            if (!okState) continue

            if (maybeToolPart.type === "tool-createArtifact") {
                const maybeOutput = (maybeToolPart.output ?? maybeToolPart.result) as unknown as {
                    success?: unknown
                    artifactId?: unknown
                    title?: unknown
                } | null

                if (!maybeOutput || maybeOutput.success !== true) continue
                if (typeof maybeOutput.artifactId !== "string") continue
                if (typeof maybeOutput.title !== "string") continue

                signals.push({
                    artifactId: maybeOutput.artifactId as Id<"artifacts">,
                    title: maybeOutput.title,
                    status: "created",
                })
                continue
            }

            if (maybeToolPart.type === "tool-updateArtifact") {
                const maybeOutput = (maybeToolPart.output ?? maybeToolPart.result) as unknown as {
                    success?: unknown
                    newArtifactId?: unknown
                    title?: unknown
                    version?: unknown
                } | null

                if (!maybeOutput || maybeOutput.success !== true) continue
                if (typeof maybeOutput.newArtifactId !== "string") continue

                const parsedVersion =
                    typeof maybeOutput.version === "number" && Number.isFinite(maybeOutput.version)
                        ? maybeOutput.version
                        : undefined
                const fallbackTitle = parsedVersion
                    ? `Artifak direvisi (v${parsedVersion})`
                    : "Artifak direvisi"

                signals.push({
                    artifactId: maybeOutput.newArtifactId as Id<"artifacts">,
                    title: typeof maybeOutput.title === "string" ? maybeOutput.title : fallbackTitle,
                    status: "updated",
                    ...(parsedVersion ? { version: parsedVersion } : {}),
                })
            }
        }

        return signals
    }

    const extractInProgressTools = (uiMessage: UIMessage) => {
        const tools: { toolName: string; state: string; errorText?: string }[] = []

        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue

            const maybeToolPart = part as unknown as {
                type?: string
                state?: string
                args?: unknown
                output?: unknown
                result?: unknown
            }

            if (typeof maybeToolPart.type !== "string" || !maybeToolPart.type.startsWith("tool-")) continue

            // Keep completed state visible while response is still streaming to avoid flicker.
            const isCompletedState = maybeToolPart.state === "output-available" || maybeToolPart.state === "result"
            if (isCompletedState && !persistProcessIndicators) continue

            const toolName = maybeToolPart.type.replace("tool-", "")
            let errorText: string | undefined
            const normalizedState = isCompletedState && persistProcessIndicators
                ? "input-available"
                : (maybeToolPart.state || "unknown")

            if (normalizedState === "output-error" || normalizedState === "error") {
                const output = maybeToolPart.output ?? maybeToolPart.result
                if (typeof output === "string") {
                    errorText = output
                } else if (typeof output === "object" && output && "error" in output) {
                    errorText = String((output as { error: unknown }).error)
                }
            }

            tools.push({
                toolName,
                state: normalizedState,
                errorText
            })
        }

        return tools
    }

    const extractSearchStatus = (uiMessage: UIMessage): SearchStatus | null => {
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-search") continue

            const data = maybeDataPart.data as { status?: unknown } | null
            if (!data || typeof data !== "object") continue

            const status = data.status
            if (status === "searching" || status === "done" || status === "off" || status === "error") {
                return status
            }
        }

        return null
    }

    const content = message.parts
        ? message.parts.filter(part => part.type === 'text').map(part => part.text).join('')
        : ''
    const autoUserAction = isUser ? parseAutoUserAction(content) : null

    const extractCitedText = (uiMessage: UIMessage): string | null => {
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-cited-text") continue
            const data = maybeDataPart.data as { text?: unknown } | null
            if (!data || typeof data !== "object") continue
            return typeof data.text === "string" ? data.text : null
        }
        return null
    }

    const extractCitedSources = (uiMessage: UIMessage): { url: string; title: string; publishedAt?: number | null }[] | null => {
        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue
            const maybeDataPart = part as unknown as { type?: string; data?: unknown }
            if (maybeDataPart.type !== "data-cited-sources") continue
            const data = maybeDataPart.data as { sources?: unknown } | null
            if (!data || typeof data !== "object") continue
            if (!Array.isArray(data.sources)) return null
            const out = data.sources
                .map((s) => {
                    const src = s as { url?: unknown; title?: unknown; publishedAt?: unknown }
                    if (typeof src?.url !== "string" || typeof src?.title !== "string") return null
                    const publishedAt = typeof src.publishedAt === "number" && Number.isFinite(src.publishedAt) ? src.publishedAt : null
                    return {
                        url: src.url,
                        title: src.title,
                        ...(publishedAt ? { publishedAt } : {}),
                    }
                })
                .filter(Boolean) as { url: string; title: string; publishedAt?: number | null }[]
            return out.length > 0 ? out : null
        }
        return null
    }

    const searchStatus = extractSearchStatus(message)
    const citedText = extractCitedText(message)

    const startEditing = () => {
        setIsEditing(true)
        setEditContent(content)
        // Auto-focus and resize logic
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus()
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
            }
        }, 0)
    }

    const handleSave = () => {
        // "Kirim" selalu trigger regeneration, bahkan jika konten tidak berubah
        // User mungkin ingin retry/regenerate AI response tanpa mengubah pesan
        const contentToSend = editContent.trim() || content // Fallback ke content original jika empty
        onEdit?.({
            messageId: message.id,
            newContent: contentToSend,
            fileIds,
            fileNames,
            fileSizes,
            fileTypes,
        })
        setIsEditing(false)
    }

    const handleCancel = () => {
        setIsEditing(false)
        setEditContent(content)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSave()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    useEffect(() => {
        if (!isEditing) return

        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null
            if (!target) return
            if (editAreaRef.current?.contains(target)) return
            setIsEditing(false)
            setEditContent(content)
        }

        document.addEventListener("mousedown", handleClickOutside, true)
        document.addEventListener("touchstart", handleClickOutside, true)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside, true)
            document.removeEventListener("touchstart", handleClickOutside, true)
        }
    }, [isEditing, content])

    const annotations = (message as {
        annotations?: {
            type?: string
            fileIds?: string[]
            fileNames?: string[]
            fileSizes?: number[]
            fileTypes?: string[]
        }[]
    }).annotations
    const fileAnnotations = annotations?.find((annotation) => annotation.type === "file_ids")
    const persistedFileIds = (message as { fileIds?: string[] }).fileIds ?? []

    const annotationFileIds = fileAnnotations?.fileIds ?? []
    const annotationFileNames = fileAnnotations?.fileNames ?? []
    const annotationFileSizes = fileAnnotations?.fileSizes ?? []
    const annotationFileTypes = fileAnnotations?.fileTypes ?? []

    const fileIds = persistedFileIds.length > 0 ? persistedFileIds : annotationFileIds
    const fileNames = fileIds.map((fileId, index) => {
        if (persistedFileIds.length > 0) {
            return fileMetaMap?.get(fileId)?.name ?? fileNameMap?.get(fileId) ?? annotationFileNames[index] ?? "file"
        }
        return annotationFileNames[index] ?? fileMetaMap?.get(fileId)?.name ?? fileNameMap?.get(fileId) ?? "file"
    })
    const fileSizes = fileIds.map((fileId, index) => {
        if (persistedFileIds.length > 0) {
            return fileMetaMap?.get(fileId)?.size ?? annotationFileSizes[index] ?? -1
        }
        return annotationFileSizes[index] ?? fileMetaMap?.get(fileId)?.size ?? -1
    })
    const fileTypes = fileIds.map((fileId, index) => {
        if (persistedFileIds.length > 0) {
            return fileMetaMap?.get(fileId)?.type ?? annotationFileTypes[index] ?? ""
        }
        return annotationFileTypes[index] ?? fileMetaMap?.get(fileId)?.type ?? ""
    })

    // Extract artifact tool output dari AI SDK v5 UIMessage (ada di message.parts)
    // Live signals from streaming take priority; persisted artifacts are fallback after refresh
    const liveArtifactSignals = extractArtifactSignals(message)
    const artifactSignals: ArtifactSignal[] = liveArtifactSignals.length > 0
        ? liveArtifactSignals
        : (persistedArtifacts ?? []).map((a) => ({
            artifactId: a._id,
            title: a.title,
            status: a.parentId ? "updated" as const : "created" as const,
            ...(a.version > 1 ? { version: a.version } : {}),
        }))
    const inProgressTools = extractInProgressTools(message)
    const dedupedInProgressTools = inProgressTools.filter((tool, index, allTools) => {
        const normalizedErrorText = (tool.errorText ?? "").trim().toLowerCase() || "__no_error__"
        const firstIndex = allTools.findIndex((candidate) => {
            const candidateErrorText = (candidate.errorText ?? "").trim().toLowerCase() || "__no_error__"
            return (
                candidate.toolName === tool.toolName &&
                candidate.state === tool.state &&
                candidateErrorText === normalizedErrorText
            )
        })
        return firstIndex === index
    })

    // Permanent guard: suppress low-signal transient tool errors in completed messages.
    // This prevents noisy "unknown error" badges caused by stream abort/reload races.
    const hasAssistantRenderableContent = isAssistant && (
        content.trim().length > 0 ||
        citedText?.trim().length ||
        artifactSignals.length > 0
    )

    const visibleProcessTools = dedupedInProgressTools.filter((tool) => {
        const isErrorState = tool.state === "output-error" || tool.state === "error"
        if (!isErrorState) return true
        if (persistProcessIndicators) return true

        const normalizedError = (tool.errorText ?? "").trim().toLowerCase()
        const isLowSignalError =
            normalizedError.length === 0 ||
            normalizedError === "unknown" ||
            normalizedError === "tidak diketahui" ||
            normalizedError === "undefined" ||
            normalizedError === "null" ||
            normalizedError === "[object object]"

        if (isLowSignalError && hasAssistantRenderableContent) {
            return false
        }

        return true
    })

    const searchTools = visibleProcessTools.filter((t) => t.toolName === "google_search")
    const nonSearchTools = visibleProcessTools.filter((t) => t.toolName !== "google_search")
    const hasProcessError = visibleProcessTools.some((tool) => tool.state === "output-error" || tool.state === "error")
    const shouldShowProcessIndicators = !isEditing && isAssistant && (persistProcessIndicators || hasProcessError)
    const showFallbackProcessIndicator =
        persistProcessIndicators &&
        nonSearchTools.length === 0 &&
        searchTools.length === 0 &&
        !searchStatus

    // Task 4.1: Extract sources (try annotations first, then fallback to property if we extend type)
    const sourcesFromAnnotation = (message as {
        annotations?: { type?: string; sources?: { url: string; title: string; publishedAt?: number | null }[] }[]
    }).annotations?.find((annotation) => annotation.type === "sources")?.sources
    const citedSources = extractCitedSources(message)
    const messageSources = (message as { sources?: { url: string; title: string; publishedAt?: number | null }[] }).sources
    const sources = citedSources || sourcesFromAnnotation || messageSources || []
    const hasArtifactSignals = isAssistant && artifactSignals.length > 0 && Boolean(onArtifactSelect)
    const hasSources = isAssistant && sources.length > 0
    const hasQuickActions = !isEditing && isAssistant

    // Get timestamp from allMessages if available

    return (
        <div
            className={cn(
                "group relative mb-4",
                // User messages aligned to right with edit button outside
                isUser && "flex justify-end items-start gap-2"
            )}
        >
            {/* Edit Button - Outside bubble, to the left (for user messages) */}
            {!isEditing && isUser && onEdit && (
                <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity pt-2">
                    {editPermission.allowed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={startEditing}
                                    className="p-1.5 hover:bg-[var(--chat-accent)] rounded-action text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] transition-colors"
                                    aria-label="Edit message"
                                >
                                    <EditPencil className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    disabled
                                    className="p-1.5 rounded-action text-[var(--chat-muted-foreground)] opacity-40 cursor-not-allowed"
                                    aria-label="Edit message"
                                    aria-disabled="true"
                                >
                                    <EditPencil className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[250px]">
                                <p>{editPermission.reason}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            )}

            {/* Message Container - User: bubble on right, Agent: no bubble */}
            <div
                className={cn(
                    "relative",
                    // User: card style, max-width, text align left
                    isUser && [
                        "rounded-shell",
                        isEditing ? "bg-[var(--chat-card)]" : "bg-[var(--chat-muted)]",
                        "border border-[color:var(--chat-border)]",
                        "transition-colors",
                        "max-w-[85%]",
                        // Keep edit state wide for better readability and stable layout.
                        isEditing && "w-full",
                    ],
                    // Agent: no bubble, full width
                    isAssistant && "w-full"
                )}
            >
                {/* Inner content with padding */}
                <div className={cn(
                    isUser ? "px-4 py-3" : "py-1"
                )}>
                    {/* File Attachments Badge */}
                    {fileIds && fileIds.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {fileIds.map((fid: string, idx: number) => {
                                const fileMeta = fileMetaMap?.get(fid)
                                const name = fileNames[idx] || fileMeta?.name || fileNameMap?.get(fid) || "file"
                                const size = typeof fileSizes[idx] === "number" && fileSizes[idx] > 0
                                    ? fileSizes[idx]
                                    : (typeof fileMeta?.size === "number" && fileMeta.size > 0 ? fileMeta.size : null)
                                const fileType = fileTypes[idx] || fileMeta?.type || ""
                                const isImage = (fileType ? isImageType(fileType) : false) || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
                                const { baseName, extension } = splitFileName(name)
                                return (
                                    <span
                                        key={fid}
                                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-badge border border-[color:var(--chat-info)] bg-[var(--chat-accent)] py-1 pl-2.5 pr-1.5 text-xs font-mono text-[var(--chat-info)]"
                                        title={name}
                                    >
                                        {isImage ? <MediaImage className="h-3 w-3 shrink-0" /> : <Page className="h-3 w-3 shrink-0" />}
                                        <span className="inline-flex min-w-0 items-baseline">
                                            <span className="max-w-[180px] truncate">{baseName}</span>
                                            {extension && <span className="shrink-0">{extension}</span>}
                                        </span>
                                        {size !== null && (
                                            <span className="shrink-0 text-[10px] opacity-60">{formatFileSize(size)}</span>
                                        )}
                                    </span>
                                )
                            })}
                        </div>
                    )}

                    {/* Inline image attachments from native SDK */}
                    {isUser && message.parts?.map((part, i) => {
                        if (
                            part.type === "file" &&
                            "mediaType" in part &&
                            typeof (part as Record<string, unknown>).mediaType === "string" &&
                            ((part as Record<string, unknown>).mediaType as string).startsWith("image/")
                        ) {
                            const filePart = part as Record<string, unknown>
                            return (
                                <div key={`img-${i}`} className="mb-3">
                                    <img
                                        src={filePart.url as string}
                                        alt={(filePart.filename as string) ?? "attachment"}
                                        className="max-w-xs max-h-64 rounded-action border border-[color:var(--chat-border)]"
                                        loading="lazy"
                                    />
                                </div>
                            )
                        }
                        return null
                    })}

                    {/* Process Indicators - fixed slot above assistant content to prevent jumping */}
                    {shouldShowProcessIndicators && (
                        <div className="mb-3 space-y-2">
                            {nonSearchTools.map((tool, index) => (
                                <ToolStateIndicator
                                    key={`tool-${index}`}
                                    toolName={tool.toolName}
                                    state={tool.state}
                                    errorText={tool.errorText}
                                    persistUntilDone={persistProcessIndicators}
                                />
                            ))}
                            {(persistProcessIndicators || searchStatus === "error") && searchStatus && (
                                <SearchStatusIndicator status={searchStatus} />
                            )}
                            {searchTools.map((tool, index) => (
                                <ToolStateIndicator
                                    key={`search-tool-${index}`}
                                    toolName={tool.toolName}
                                    state={tool.state}
                                    errorText={tool.errorText}
                                    persistUntilDone={persistProcessIndicators}
                                />
                            ))}
                            {showFallbackProcessIndicator && (
                                <ToolStateIndicator
                                    toolName="assistant_response"
                                    state="input-available"
                                    persistUntilDone
                                />
                            )}
                        </div>
                    )}

                    {/* Message Content */}
                    {isEditing ? (
                        <div ref={editAreaRef} className="flex flex-col gap-1.5">
                            <textarea
                                ref={textareaRef}
                                value={editContent}
                                onChange={(e) => {
                                    setEditContent(e.target.value)
                                    e.target.style.height = 'auto'
                                    e.target.style.height = e.target.scrollHeight + 'px'
                                }}
                                onKeyDown={handleKeyDown}
                                className="w-full min-h-[1.5rem] resize-none overflow-hidden bg-transparent p-0 text-sm leading-relaxed text-[var(--chat-foreground)] focus-visible:outline-none"
                                rows={1}
                                aria-label="Edit message content"
                            />
                            <div className="mt-0.5 flex items-center justify-end gap-1.5">
                                <button
                                    onClick={handleCancel}
                                    className="flex h-7 items-center gap-1 rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-2.5 text-[11px] font-mono text-[var(--chat-secondary-foreground)] transition-colors hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-card-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
                                    aria-label="Batalkan edit"
                                >
                                    <Xmark className="h-3 w-3" /> Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex h-7 items-center gap-1 rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-2.5 text-[11px] font-mono font-semibold text-[var(--chat-secondary-foreground)] transition-colors hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-card-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chat-border)]"
                                    aria-label="Kirim pesan yang diedit"
                                >
                                    <Send className="h-3 w-3" /> Kirim
                                </button>
                            </div>
                        </div>
                    ) : autoUserAction ? (
                        autoUserAction.kind === "approved" ? (
                            <div className="rounded-action bg-[var(--chat-muted)] px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-[var(--chat-muted-foreground)]" />
                                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-foreground)]">
                                        Tahap disetujui
                                    </span>
                                </div>
                                <div className="mt-1 text-[10px] font-mono text-[var(--chat-muted-foreground)]">
                                    Lifecycle artifak: terkunci
                                </div>
                                <div className="mt-1.5 text-sm font-semibold text-[var(--chat-foreground)]">
                                    {autoUserAction.stageLabel}
                                </div>
                                <div className="mt-0.5 text-xs font-mono text-[var(--chat-foreground)]">
                                    {autoUserAction.followupText || "Lanjut ke tahap berikutnya."}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-action bg-[var(--chat-muted)] px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <EditPencil className="h-4 w-4 text-[var(--chat-muted-foreground)]" />
                                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-[var(--chat-foreground)]">
                                        Permintaan revisi
                                    </span>
                                </div>
                                <div className="mt-1 text-[10px] font-mono text-[var(--chat-muted-foreground)]">
                                    Lifecycle artifak: perlu update
                                </div>
                                <div className="mt-1.5 text-sm font-semibold text-[var(--chat-foreground)]">
                                    {autoUserAction.stageLabel}
                                </div>
                                <div className="mt-0.5 whitespace-pre-wrap text-xs font-mono leading-relaxed text-[var(--chat-foreground)]">
                                    {autoUserAction.feedback || "Feedback revisi telah dikirim. Agen akan memperbarui artifak pada tahap ini."}
                                </div>
                            </div>
                        )
                    ) : (
                        <MarkdownRenderer
                            markdown={citedText ?? content}
                            className="space-y-2 text-sm leading-relaxed text-[var(--chat-foreground)]"
                            sources={sources}
                            context="chat"
                        />
                    )}

                    {/* Assistant follow-up blocks: artifact output -> sources -> quick actions */}
                    {isAssistant && !isEditing && (hasArtifactSignals || hasSources || hasQuickActions) && (
                        <div className="mt-3 space-y-3">
                            {hasArtifactSignals && (
                                <section className="space-y-2 pt-2" aria-label="Hasil artifak">
                                    {artifactSignals.map((artifact) => (
                                        onArtifactSelect ? (
                                            <ArtifactIndicator
                                                key={artifact.artifactId}
                                                artifactId={artifact.artifactId}
                                                title={artifact.title}
                                                status={artifact.status}
                                                version={artifact.version}
                                                onSelect={onArtifactSelect}
                                            />
                                        ) : null
                                    ))}
                                </section>
                            )}

                            {hasSources && (
                                <section aria-label="Sumber referensi">
                                    <SourcesIndicator sources={sources} />
                                </section>
                            )}

                            {hasQuickActions && <QuickActions content={content} />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
