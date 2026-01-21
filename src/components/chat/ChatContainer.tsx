"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChatSidebar } from "./ChatSidebar"
import { ChatWindow } from "./ChatWindow"
import { ArtifactPanel } from "./ArtifactPanel"
import { useConversations } from "@/lib/hooks/useConversations"
import { Id } from "../../../convex/_generated/dataModel"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface ChatContainerProps {
    conversationId: string | null
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
    const router = useRouter()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)
    const [selectedArtifactId, setSelectedArtifactId] = useState<Id<"artifacts"> | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const { conversations, createNewConversation, deleteConversation, updateConversationTitle, isLoading } = useConversations()

    // Handler when artifact is created or selected
    const handleArtifactSelect = (artifactId: Id<"artifacts">) => {
        setSelectedArtifactId(artifactId)
        setArtifactPanelOpen(true)
    }

    // Toggle artifact panel
    const toggleArtifactPanel = () => {
        setArtifactPanelOpen(!artifactPanelOpen)
    }

    const handleNewChat = async () => {
        if (isCreating) return
        setIsCreating(true)
        try {
            const newId = await createNewConversation()
            if (newId) {
                setArtifactPanelOpen(false)
                setSelectedArtifactId(null)
                router.push(`/chat/${newId}`)
            }
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteConversation = async (id: string) => {
        // PENTING: Close artifact panel SEBELUM delete untuk menghindari race condition
        // Jika tidak, ArtifactPanel akan re-query conversation yang sudah dihapus
        if (conversationId === id) {
            setArtifactPanelOpen(false)
            setSelectedArtifactId(null)
        }

        await deleteConversation(id as Id<"conversations">)

        if (conversationId === id) {
            router.push('/chat')
        }
    }

    const handleUpdateConversationTitle = async (id: Id<"conversations">, title: string) => {
        await updateConversationTitle(id, title)
    }

    return (
        <div className="flex h-screen">
            {/* Desktop Sidebar */}
            <ChatSidebar
                className="hidden md:flex"
                conversations={conversations}
                currentConversationId={conversationId}
                onNewChat={handleNewChat}
                onDeleteConversation={handleDeleteConversation}
                onUpdateConversationTitle={handleUpdateConversationTitle}
                isLoading={isLoading}
                isCreating={isCreating}
            />

            {/* Mobile Sidebar (Sheet) */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="p-0 w-[300px]">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <ChatSidebar
                        className="w-full border-none"
                        conversations={conversations}
                        currentConversationId={conversationId}
                        onNewChat={handleNewChat}
                        onDeleteConversation={handleDeleteConversation}
                        onUpdateConversationTitle={handleUpdateConversationTitle}
                        onCloseMobile={() => setIsMobileOpen(false)}
                        isLoading={isLoading}
                        isCreating={isCreating}
                    />
                </SheetContent>
            </Sheet>

            {/* Main content area with split panel */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Window */}
                <div
                    className={cn(
                        "flex-1 transition-all duration-300 ease-in-out",
                        artifactPanelOpen ? "w-1/2" : "w-full"
                    )}
                >
                    <ChatWindow
                        key={conversationId}
                        conversationId={conversationId}
                        onMobileMenuClick={() => setIsMobileOpen(true)}
                        onArtifactSelect={handleArtifactSelect}
                    />
                </div>

                {/* Artifact Panel */}
                <div
                    className={cn(
                        "transition-all duration-300 ease-in-out overflow-hidden",
                        artifactPanelOpen ? "w-1/2" : "w-0"
                    )}
                >
                    <ArtifactPanel
                        key={conversationId ?? "no-conversation"}
                        conversationId={conversationId as Id<"conversations"> | null}
                        isOpen={artifactPanelOpen}
                        onToggle={toggleArtifactPanel}
                        selectedArtifactId={selectedArtifactId}
                        onSelectArtifact={handleArtifactSelect}
                    />
                </div>
            </div>
        </div>
    )
}
