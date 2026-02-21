import type { ReactNode } from "react"

export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh bg-background text-foreground">
      {children}
    </div>
  )
}
