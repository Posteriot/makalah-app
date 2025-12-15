"use client"

import { useState } from "react"
import { ChatSidebar } from "./ChatSidebar"
import { ChatWindow } from "./ChatWindow"
import { ArtifactPanel } from "./ArtifactPanel"
import { useConversations } from "@/lib/hooks/useConversations"
import { Id } from "../../../convex/_generated/dataModel"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function ChatContainer() {
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)
    const [selectedArtifactId, setSelectedArtifactId] = useState<Id<"artifacts"> | null>(null)
    const { conversations, createNewConversation, deleteConversation, isLoading } = useConversations()

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
        const newId = await createNewConversation()
        if (newId) {
            setCurrentConversationId(newId)
        }
    }

    const handleDeleteConversation = async (id: string) => {
        await deleteConversation(id as Id<"conversations">)
        if (currentConversationId === id) {
            setCurrentConversationId(null)
        }
    }

    // Reset artifact panel when conversation changes
    const handleSelectConversation = (id: string | null) => {
        setCurrentConversationId(id)
        setArtifactPanelOpen(false)
        setSelectedArtifactId(null)
    }

    return (
        <div className="flex h-[calc(100vh-80px)]">
            {/* Desktop Sidebar */}
            <ChatSidebar
                className="hidden md:flex"
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                onDeleteConversation={handleDeleteConversation}
                isLoading={isLoading}
            />

            {/* Mobile Sidebar (Sheet) */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="p-0 w-[300px]">
                    <ChatSidebar
                        className="w-full border-none"
                        conversations={conversations}
                        currentConversationId={currentConversationId}
                        onSelectConversation={handleSelectConversation}
                        onNewChat={handleNewChat}
                        onDeleteConversation={handleDeleteConversation}
                        onCloseMobile={() => setIsMobileOpen(false)}
                        isLoading={isLoading}
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
                        key={currentConversationId}
                        conversationId={currentConversationId}
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
                        conversationId={currentConversationId as Id<"conversations"> | null}
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
