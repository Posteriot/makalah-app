import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ChatContainer } from "@/components/chat/ChatContainer"

interface PageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ChatConversationPage({ params }: PageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in?redirect_url=/chat")
  }

  const { conversationId } = await params
  return <ChatContainer conversationId={conversationId} />
}
