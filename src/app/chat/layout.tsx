import type { ReactNode } from "react"

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-chat-scope=""
      className="min-h-screen bg-background text-foreground"
    >
      {children}
    </div>
  )
}
