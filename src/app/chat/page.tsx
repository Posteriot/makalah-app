import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ChatContainer } from "@/components/chat/ChatContainer"

export default async function ChatPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in?redirect_url=/chat")
  }

  return <ChatContainer />
}
