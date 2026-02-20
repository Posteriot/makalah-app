import type { ReactNode } from "react"
import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="global-main">{children}</main>
      <Footer />
    </div>
  )
}
