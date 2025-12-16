"use client"

import { UIMessage } from "ai"
import { PaperclipIcon, PencilIcon, XIcon, CheckIcon } from "lucide-react"
import { QuickActions } from "./QuickActions"
import { ArtifactIndicator } from "./ArtifactIndicator"
import { ToolStateIndicator } from "./ToolStateIndicator"
import { SourcesIndicator } from "./SourcesIndicator"
import { useState, useRef } from "react"
import { Id } from "../../../convex/_generated/dataModel"

interface MessageBubbleProps {
    message: UIMessage
    conversationId: string | null
    onEdit?: (messageId: string, newContent: string) => void
    onArtifactSelect?: (artifactId: Id<"artifacts">) => void
}

export function MessageBubble({ message, conversationId, onEdit, onArtifactSelect }: MessageBubbleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    const content = message.parts
        ? message.parts.filter(part => part.type === 'text').map(part => part.text).join('')
        : ''


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
        if (editContent.trim() !== content) {
            onEdit?.(message.id, editContent)
        }
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileAnnotations = (message as any).annotations?.find((a: any) => a.type === 'file_ids')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileIds = fileAnnotations ? (fileAnnotations as any).fileIds : []

    // Extract artifact tool output dari AI SDK v5 UIMessage (ada di message.parts)
    // Extract artifact tool output dari AI SDK v5 UIMessage (ada di message.parts)
    const createdArtifacts = extractCreatedArtifacts(message)
    const inProgressTools = extractInProgressTools(message)

    // Task 4.1: Extract sources (try annotations first, then fallback to property if we extend type)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourcesFromAnnotation = (message as any).annotations?.find((a: any) => a.type === 'sources')?.sources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sources = sourcesFromAnnotation || (message as any).sources || []

    return (
        <div className={`group p-2 mb-2 rounded ${message.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'} max-w-[80%] relative`}>
            <div className="flex justify-between items-start">
                <div className="font-bold text-xs mb-1">{message.role}</div>

                {/* Edit Button for User */}
                {!isEditing && message.role === 'user' && onEdit && (
                    <button
                        onClick={startEditing}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
                        title="Edit"
                        aria-label="Edit message"
                    >
                        <PencilIcon className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* File Attachments Indicator */}
            {fileIds && fileIds.length > 0 && (
                <div className="mb-2 space-y-1">
                    {fileIds.map((id: string) => (
                        <div key={id} className={`flex items-center gap-2 text-xs p-1 rounded ${message.role === 'user' ? 'bg-primary-foreground/10' : 'bg-background/50'}`}>
                            <PaperclipIcon className="h-3 w-3" />
                            <span>Attachment</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Tool State Indicators */}
            {inProgressTools.length > 0 && (
                <div className="mb-2 space-y-1">
                    {inProgressTools.map((tool, index) => (
                        <ToolStateIndicator
                            key={index}
                            toolName={tool.toolName}
                            state={tool.state}
                            errorText={tool.errorText}
                        />
                    ))}
                </div>
            )}

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
                        className="w-full bg-background/10 border border-white/20 rounded p-2 text-inherit focus:outline-none resize-none overflow-hidden"
                        rows={1}
                        aria-label="Edit message content"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={handleCancel}
                            className="p-1 hover:bg-white/20 rounded text-xs flex items-center gap-1"
                            aria-label="Cancel edit"
                        >
                            <XIcon className="h-3 w-3" /> Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="p-1 bg-white/20 hover:bg-white/30 rounded text-xs flex items-center gap-1"
                            aria-label="Save changes"
                        >
                            <CheckIcon className="h-3 w-3" /> Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="whitespace-pre-wrap">{content}</div>
            )}

            {/* Artifact Indicators */}
            {createdArtifacts.length > 0 && onArtifactSelect && (
                <div className="mt-2 space-y-2">
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

            {/* Task 4.2: Sources Indicator (after Artifacts, before QuickActions) */}
            {sources && sources.length > 0 && message.role === "assistant" && (
                <div className="mt-2">
                    <SourcesIndicator sources={sources} />
                </div>
            )}

            {/* Quick Actions for Assistant */}
            {!isEditing && message.role === 'assistant' && (
                <QuickActions content={content} conversationId={conversationId} />
            )}
        </div>
    )
}
