import type { ReactNode } from "react"
import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="dashboard-main">{children}</main>
      <Footer />
    </div>
  )
}
