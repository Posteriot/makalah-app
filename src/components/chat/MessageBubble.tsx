"use client"

import { UIMessage } from "ai"
import { Attachment, EditPencil, Xmark, Send, CheckCircle } from "iconoir-react"
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

interface MessageBubbleProps {
    message: UIMessage
    onEdit?: (messageId: string, newContent: string) => void
    onArtifactSelect?: (artifactId: Id<"artifacts">) => void
    /** Keep process indicators visible until overall assistant response completes */
    persistProcessIndicators?: boolean
    // Paper mode edit permissions
    isPaperMode?: boolean
    messageIndex?: number
    currentStageStartIndex?: number
    allMessages?: PermissionMessage[]
    stageData?: Record<string, StageDataEntry>
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

    type CreatedArtifact = { artifactId: Id<"artifacts">; title: string }

    const extractCreatedArtifacts = (uiMessage: UIMessage): CreatedArtifact[] => {
        const created: CreatedArtifact[] = []

        for (const part of uiMessage.parts ?? []) {
            if (!part || typeof part !== "object") continue

            const maybeToolPart = part as unknown as {
                type?: unknown
                state?: unknown
                output?: unknown
                result?: unknown
            }

            if (maybeToolPart.type !== "tool-createArtifact") continue

            const okState =
                maybeToolPart.state === "output-available" || maybeToolPart.state === "result"
            if (!okState) continue

            const maybeOutput = (maybeToolPart.output ?? maybeToolPart.result) as unknown as {
                success?: unknown
                artifactId?: unknown
                title?: unknown
            } | null

            if (!maybeOutput || maybeOutput.success !== true) continue
            if (typeof maybeOutput.artifactId !== "string") continue
            if (typeof maybeOutput.title !== "string") continue

            created.push({
                artifactId: maybeOutput.artifactId as Id<"artifacts">,
                title: maybeOutput.title,
            })
        }

        return created
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
        onEdit?.(message.id, contentToSend)
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

    const annotations = (message as { annotations?: { type?: string; fileIds?: string[] }[] }).annotations
    const fileAnnotations = annotations?.find((annotation) => annotation.type === "file_ids")
    const fileIds = fileAnnotations?.fileIds ?? []

    // Extract artifact tool output dari AI SDK v5 UIMessage (ada di message.parts)
    const createdArtifacts = extractCreatedArtifacts(message)
    const inProgressTools = extractInProgressTools(message)
    const searchTools = inProgressTools.filter((t) => t.toolName === "google_search")
    const nonSearchTools = inProgressTools.filter((t) => t.toolName !== "google_search")
    const hasProcessError = inProgressTools.some((tool) => tool.state === "output-error" || tool.state === "error")
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
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                    {editPermission.allowed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={startEditing}
                                    className="p-1.5 hover:bg-accent rounded-action text-muted-foreground hover:text-foreground transition-colors"
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
                                    className="p-1.5 rounded-action text-muted-foreground/40 cursor-not-allowed"
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
                        "bg-slate-200 dark:bg-card",
                        "border border-border/50",
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
                    {/* File Attachments Badge - Mockup: blue/teal badge */}
                    {fileIds && fileIds.length > 0 && (
                        <div className="mb-3">
                            <span className="inline-flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-badge bg-info/20 text-info border border-info/30">
                                <Attachment className="h-3 w-3" />
                                <span>{fileIds.length} {fileIds.length === 1 ? "file" : "files"}</span>
                            </span>
                        </div>
                    )}

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
                        <div ref={editAreaRef} className="flex flex-col gap-2">
                            <textarea
                                ref={textareaRef}
                                value={editContent}
                                onChange={(e) => {
                                    setEditContent(e.target.value)
                                    e.target.style.height = 'auto'
                                    e.target.style.height = e.target.scrollHeight + 'px'
                                }}
                                onKeyDown={handleKeyDown}
                                className="w-full rounded-action p-3 text-sm bg-background border border-emerald-500/70 text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none overflow-hidden"
                                rows={1}
                                aria-label="Edit message content"
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={handleCancel}
                                    className="px-3 py-1.5 rounded-action text-xs font-mono flex items-center gap-1.5 hover:bg-accent transition-colors"
                                    aria-label="Batalkan edit"
                                >
                                    <Xmark className="h-3.5 w-3.5" /> Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-3 py-1.5 rounded-action text-xs font-mono flex items-center gap-1.5 font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                                    aria-label="Kirim pesan yang diedit"
                                >
                                    <Send className="h-3.5 w-3.5" /> Kirim
                                </button>
                            </div>
                        </div>
                    ) : autoUserAction ? (
                        autoUserAction.kind === "approved" ? (
                            <div className="rounded-action border border-emerald-600/35 bg-emerald-500/10 px-3 py-2">
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wide">
                                        Tahap disetujui
                                    </span>
                                </div>
                                <div className="mt-1 text-sm font-medium text-foreground">
                                    {autoUserAction.stageLabel}
                                </div>
                                <div className="mt-1 text-xs font-mono text-muted-foreground">
                                    {autoUserAction.followupText || "Agen melanjutkan ke tahap berikutnya."}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-action border border-slate-500/40 bg-slate-500/10 px-3 py-2">
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <EditPencil className="h-4 w-4" />
                                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wide">
                                        Permintaan revisi
                                    </span>
                                </div>
                                <div className="mt-1 text-sm font-medium text-foreground">
                                    {autoUserAction.stageLabel}
                                </div>
                                <div className="mt-1 whitespace-pre-wrap text-xs font-mono leading-relaxed text-muted-foreground">
                                    {autoUserAction.feedback || "Feedback revisi telah dikirim ke agen."}
                                </div>
                            </div>
                        )
                    ) : (
                        <MarkdownRenderer
                            markdown={citedText ?? content}
                            className="space-y-2 text-sm leading-relaxed text-foreground"
                            sources={sources}
                        />
                    )}

                    {/* Sources Indicator (after search status) */}
                    {sources && sources.length > 0 && isAssistant && (
                        <div className="mt-3">
                            <SourcesIndicator sources={sources} />
                        </div>
                    )}

                    {/* Artifact Indicators */}
                    {createdArtifacts.length > 0 && onArtifactSelect && (
                        <div className="mt-3 space-y-2">
                            {createdArtifacts.map((created) => (
                                <ArtifactIndicator
                                    key={created.artifactId}
                                    artifactId={created.artifactId}
                                    title={created.title}
                                    onSelect={onArtifactSelect}
                                />
                            ))}
                        </div>
                    )}

                    {/* Quick Actions for Assistant */}
                    {!isEditing && isAssistant && (
                        <QuickActions content={content} />
                    )}
                </div>
            </div>
        </div>
    )
}
