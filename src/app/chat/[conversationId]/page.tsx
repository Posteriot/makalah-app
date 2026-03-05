import { Suspense } from "react"
import { ChatContainer } from "@/components/chat/ChatContainer"

interface PageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ChatConversationPage({ params }: PageProps) {
  const { conversationId } = await params
  return (
    <Suspense>
      <ChatContainer conversationId={conversationId} />
    </Suspense>
  )
}
