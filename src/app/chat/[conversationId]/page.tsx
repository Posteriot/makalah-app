import { ChatContainer } from "@/components/chat/ChatContainer"

interface PageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ChatConversationPage({ params }: PageProps) {
  const { conversationId } = await params
  return <ChatContainer conversationId={conversationId} />
}
