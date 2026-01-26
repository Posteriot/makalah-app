import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ChatContainer } from "@/components/chat/ChatContainer"

type SearchParams = Record<string, string | string[] | undefined>

function buildQueryString(searchParams?: SearchParams): string {
  if (!searchParams) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
    } else {
      params.append(key, value)
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const { userId } = await auth()

  if (!userId) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined
    const redirectPath = `/chat${buildQueryString(resolvedSearchParams)}`
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`)
  }

  return <ChatContainer conversationId={null} />
}
