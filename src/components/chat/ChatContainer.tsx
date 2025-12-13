"use client"

import { useState } from "react"
import { ChatSidebar } from "./ChatSidebar"
import { ChatWindow } from "./ChatWindow"
import { useConversations } from "@/lib/hooks/useConversations"
import { Id } from "../../../convex/_generated/dataModel"
import { Sheet, SheetContent } from "@/components/ui/sheet"

export function ChatContainer() {
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const { conversations, createNewConversation, deleteConversation, isLoading } = useConversations()

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

    return (
        <div className="flex h-[calc(100vh-80px)]">
            {/* Desktop Sidebar */}
            <ChatSidebar
                className="hidden md:flex"
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={setCurrentConversationId}
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
                        onSelectConversation={setCurrentConversationId}
                        onNewChat={handleNewChat}
                        onDeleteConversation={handleDeleteConversation}
                        onCloseMobile={() => setIsMobileOpen(false)}
                        isLoading={isLoading}
                    />
                </SheetContent>
            </Sheet>

            <ChatWindow
                key={currentConversationId}
                conversationId={currentConversationId}
                onMobileMenuClick={() => setIsMobileOpen(true)}
            />
        </div>
    )
}
