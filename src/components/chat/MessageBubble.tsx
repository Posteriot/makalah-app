"use client"

import { UIMessage } from "ai"
import { PaperclipIcon, PencilIcon, XIcon, SendHorizontalIcon } from "lucide-react"
import { QuickActions } from "./QuickActions"
import { ArtifactIndicator } from "./ArtifactIndicator"
import { ToolStateIndicator } from "./ToolStateIndicator"
import { SearchStatusIndicator, type SearchStatus } from "./SearchStatusIndicator"
import { SourcesIndicator } from "./SourcesIndicator"
import { useState, useRef, useMemo } from "react"
import { Id } from "../../../convex/_generated/dataModel"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { isEditAllowed } from "@/lib/utils/paperPermissions"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
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

interface MessageBubbleProps {
    message: UIMessage
    onEdit?: (messageId: string, newContent: string) => void
    onArtifactSelect?: (artifactId: Id<"artifacts">) => void
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
    isPaperMode = false,
    messageIndex = 0,
    currentStageStartIndex = 0,
    allMessages = [],
    stageData,
}: MessageBubbleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const isUser = message.role === 'user'
    const isAssistant = message.role === 'assistant'

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

        // DEBUG: Log all parts to understand tool state from different models
        if (process.env.NODE_ENV === "development") {
        }

        for (const part of uiMessage.parts ?? []) {
            const maybeToolPart = part as unknown as {
                type?: string
                state?: string
                args?: unknown
                output?: unknown
                result?: unknown
            }

            if (!maybeToolPart.type?.startsWith("tool-")) continue

            // Skip completed states (handled by ArtifactIndicator or just hidden)
            if (maybeToolPart.state === "output-available" || maybeToolPart.state === "result") continue

            const toolName = maybeToolPart.type.replace("tool-", "")
            let errorText: string | undefined

            if (maybeToolPart.state === "output-error" || maybeToolPart.state === "error") {
                const output = maybeToolPart.output ?? maybeToolPart.result
                if (typeof output === "string") {
                    errorText = output
                } else if (typeof output === "object" && output && "error" in output) {
                    errorText = String((output as { error: unknown }).error)
                }
            }

            tools.push({
                toolName,
                state: maybeToolPart.state || "unknown",
                errorText
            })
        }

        return tools
    }

    const extractSearchStatus = (uiMessage: UIMessage): SearchStatus | null => {
        for (const part of uiMessage.parts ?? []) {
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

    const extractCitedText = (uiMessage: UIMessage): string | null => {
        for (const part of uiMessage.parts ?? []) {
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

    const annotations = (message as { annotations?: { type?: string; fileIds?: string[] }[] }).annotations
    const fileAnnotations = annotations?.find((annotation) => annotation.type === "file_ids")
    const fileIds = fileAnnotations?.fileIds ?? []

    // Extract artifact tool output dari AI SDK v5 UIMessage (ada di message.parts)
    const createdArtifacts = extractCreatedArtifacts(message)
    const inProgressTools = extractInProgressTools(message)
    const searchTools = inProgressTools.filter((t) => t.toolName === "google_search")
    const nonSearchTools = inProgressTools.filter((t) => t.toolName !== "google_search")

    // Task 4.1: Extract sources (try annotations first, then fallback to property if we extend type)
    const sourcesFromAnnotation = (message as {
        annotations?: { type?: string; sources?: { url: string; title: string; publishedAt?: number | null }[] }[]
    }).annotations?.find((annotation) => annotation.type === "sources")?.sources
    const citedSources = extractCitedSources(message)
    const messageSources = (message as { sources?: { url: string; title: string; publishedAt?: number | null }[] }).sources
    const sources = citedSources || sourcesFromAnnotation || messageSources || []

    return (
        <div
            className={cn(
                // Base styles
                "group relative max-w-[80%] mb-3",
                // User message: right-aligned, darker bg, primary colors
                isUser && "ml-auto",
                // Assistant message: left-aligned
                isAssistant && "mr-auto"
            )}
        >
            {/* Message bubble container */}
            <div
                className={cn(
                    // Base bubble styles
                    "px-4 py-3 rounded-2xl",
                    // User message styling - darker bg, custom corners
                    isUser && [
                        "bg-primary text-primary-foreground",
                        "rounded-br-md", // Flat bottom-right corner for user
                    ],
                    // Assistant message styling - subtle bg, custom corners
                    isAssistant && [
                        "bg-muted",
                        "rounded-bl-md", // Flat bottom-left corner for assistant
                    ]
                )}
            >
                {/* File Attachments Indicator */}
                {fileIds && fileIds.length > 0 && (
                    <div className="mb-2 space-y-1">
                        {fileIds.map((id: string) => (
                            <div
                                key={id}
                                className={cn(
                                    "flex items-center gap-2 text-xs py-1 px-2 rounded-md",
                                    isUser
                                        ? "bg-primary-foreground/10"
                                        : "bg-background/60 border border-border"
                                )}
                            >
                                <PaperclipIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">Attachment</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tool State Indicators (non-search) */}
                {nonSearchTools.length > 0 && (
                    <div className="mb-2 space-y-1">
                        {nonSearchTools.map((tool, index) => (
                            <ToolStateIndicator
                                key={index}
                                toolName={tool.toolName}
                                state={tool.state}
                                errorText={tool.errorText}
                            />
                        ))}
                    </div>
                )}

                {/* Message Content */}
                {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[300px]">
                        <textarea
                            ref={textareaRef}
                            value={editContent}
                            onChange={(e) => {
                                setEditContent(e.target.value)
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            onKeyDown={handleKeyDown}
                            className={cn(
                                "w-full rounded-lg p-2 text-sm focus:outline-none resize-none overflow-hidden",
                                isUser
                                    ? "bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                                    : "bg-background border border-border text-foreground"
                            )}
                            rows={1}
                            aria-label="Edit message content"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={handleCancel}
                                className={cn(
                                    "px-2 py-1 rounded-md text-xs flex items-center gap-1 transition-colors",
                                    isUser
                                        ? "hover:bg-primary-foreground/10"
                                        : "hover:bg-accent"
                                )}
                                aria-label="Batalkan edit"
                            >
                                <XIcon className="h-3 w-3" /> Batal
                            </button>
                            <button
                                onClick={handleSave}
                                className={cn(
                                    "px-2 py-1 rounded-md text-xs flex items-center gap-1 font-medium transition-colors",
                                    isUser
                                        ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                                aria-label="Kirim pesan yang diedit"
                            >
                                <SendHorizontalIcon className="h-3 w-3" /> Kirim
                            </button>
                        </div>
                    </div>
                ) : (
                    <MarkdownRenderer
                        markdown={citedText ?? content}
                        className="space-y-2 text-sm leading-relaxed"
                        sources={sources}
                    />
                )}

                {/* Search Status (data stream, below assistant text) */}
                {!isEditing && isAssistant && searchStatus && (
                    <div className="mt-3 space-y-1">
                        <SearchStatusIndicator status={searchStatus} />
                    </div>
                )}

                {/* Search Indicator (below assistant text) */}
                {!isEditing && isAssistant && searchTools.length > 0 && (
                    <div className="mt-3 space-y-1">
                        {searchTools.map((tool, index) => (
                            <ToolStateIndicator
                                key={`search-${index}`}
                                toolName={tool.toolName}
                                state={tool.state}
                                errorText={tool.errorText}
                            />
                        ))}
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

                {/* Sources Indicator (after Artifacts, before QuickActions) */}
                {sources && sources.length > 0 && isAssistant && (
                    <div className="mt-3">
                        <SourcesIndicator sources={sources} />
                    </div>
                )}

                {/* Quick Actions for Assistant */}
                {!isEditing && isAssistant && (
                    <QuickActions content={content} />
                )}
            </div>

            {/* Edit Button - Floating outside bubble for user messages */}
            {!isEditing && isUser && onEdit && (
                <div className="absolute -left-8 top-1/2 -translate-y-1/2">
                    {editPermission.allowed ? (
                        <button
                            onClick={startEditing}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
                            title="Edit"
                            aria-label="Edit message"
                        >
                            <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        disabled
                                        className="opacity-0 group-hover:opacity-40 transition-opacity p-1.5 rounded-md text-muted-foreground cursor-not-allowed"
                                        aria-label="Edit message"
                                        aria-disabled="true"
                                    >
                                        <PencilIcon className="h-3.5 w-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[250px]">
                                    <p>{editPermission.reason}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            )}
        </div>
    )
}
