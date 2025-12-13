"use client"

import { UIMessage } from "ai"
import { PaperclipIcon, PencilIcon, XIcon, CheckIcon } from "lucide-react"
import { QuickActions } from "./QuickActions"
import { useState, useRef } from "react"

interface MessageBubbleProps {
    message: UIMessage
    conversationId: string | null
    onEdit?: (messageId: string, newContent: string) => void
}

export function MessageBubble({ message, conversationId, onEdit }: MessageBubbleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

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
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {fileIds.map((id: string) => (
                        <div key={id} className={`flex items-center gap-2 text-xs p-1 rounded ${message.role === 'user' ? 'bg-primary-foreground/10' : 'bg-background/50'}`}>
                            <PaperclipIcon className="h-3 w-3" />
                            <span>Attachment</span>
                        </div>
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

            {/* Quick Actions for Assistant */}
            {!isEditing && message.role === 'assistant' && (
                <QuickActions content={content} conversationId={conversationId} />
            )}
        </div>
    )
}
