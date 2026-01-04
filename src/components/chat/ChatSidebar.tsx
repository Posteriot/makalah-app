"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2Icon, PlusIcon, MessageSquareIcon, TrashIcon } from "lucide-react"
import { Id } from "../../../convex/_generated/dataModel"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { PaperSessionBadge } from "@/components/paper"
import { getStageNumber, type PaperStageId } from "../../../convex/paperSessions/constants"

interface ChatSidebarProps {
    conversations: Array<{
        _id: Id<"conversations">
        title: string
        lastMessageAt: number
    }>
    currentConversationId: string | null
    onNewChat: () => void
    onDeleteConversation: (id: Id<"conversations">) => void
    className?: string
    onCloseMobile?: () => void
    isLoading?: boolean
    isCreating?: boolean
}

export function ChatSidebar({
    conversations,
    currentConversationId,
    onNewChat,
    onDeleteConversation,
    className,
    onCloseMobile,
    isLoading,
    isCreating
}: ChatSidebarProps) {
    const { user } = useCurrentUser()

    // Query paper sessions for current user to show badges
    const paperSessions = useQuery(
        api.paperSessions.getByUser,
        user ? { userId: user._id } : "skip"
    )

    // Create a map of conversationId -> paper session for quick lookup
    const paperSessionMap = new Map(
        paperSessions?.map(session => [session.conversationId, session]) ?? []
    )

    return (
        <aside className={`w-64 border-r bg-card/40 flex flex-col ${className}`}>
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center gap-2 mb-4">
                    <MessageSquareIcon className="h-5 w-5" />
                    <span className="font-semibold">Makalah Chat</span>
                </div>
                <Button
                    onClick={() => { onNewChat(); onCloseMobile?.() }}
                    className="w-full"
                    size="sm"
                    aria-label="Start new chat"
                    aria-busy={isCreating}
                    disabled={isCreating}
                >
                    {isCreating ? (
                        <>
                            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                            Membuat...
                        </>
                    ) : (
                        <>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            New Chat
                        </>
                    )}
                </Button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex flex-col gap-2 p-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground opacity-50">
                        <MessageSquareIcon className="h-8 w-8 mb-2" />
                        <span className="text-xs">No conversations yet</span>
                    </div>
                ) : (
                    conversations.map((conv) => {
                        const paperSession = paperSessionMap.get(conv._id)
                        return (
                            <Link
                                key={conv._id}
                                href={`/chat/${conv._id}`}
                                onClick={() => onCloseMobile?.()}
                                className={`group flex items-center w-full p-2 rounded-lg mb-1 transition-colors text-left ${currentConversationId === conv._id
                                    ? "bg-accent text-accent-foreground"
                                    : "hover:bg-accent/50"
                                    }`}
                                aria-label={`Select conversation: ${conv.title}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{conv.title}</span>
                                        {paperSession && (
                                                <PaperSessionBadge
                                                    stageNumber={getStageNumber(paperSession.currentStage as PaperStageId | "completed")}
                                                />
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (confirm("Are you sure you want to delete this chat?")) {
                                            onDeleteConversation(conv._id)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            if (confirm("Are you sure you want to delete this chat?")) {
                                                onDeleteConversation(conv._id)
                                            }
                                        }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all focus:opacity-100"
                                    title="Delete conversation"
                                    aria-label="Delete conversation"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </div>
                            </Link>
                        )
                    })
                )}
            </div>

            {/* Footer (User Info) */}
            <div className="p-4 border-t">
                <div className="text-xs text-muted-foreground">
                    {/* Clerk UserButton or user info could go here */}
                </div>
            </div>
        </aside>
    )
}
