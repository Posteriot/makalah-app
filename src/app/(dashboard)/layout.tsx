import { Suspense, type ReactNode } from "react"
import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div data-ui-scope="core" className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<div className="h-[60px] md:h-[54px]" aria-hidden="true" />}>
        <GlobalHeader />
      </Suspense>
      <main className="dashboard-main">{children}</main>
      <Footer />
    </div>
  )
}
