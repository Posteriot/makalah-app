import type { ReactNode } from "react"

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-chat-scope=""
      className="min-h-dvh bg-background text-foreground"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {children}
    </div>
  )
}
