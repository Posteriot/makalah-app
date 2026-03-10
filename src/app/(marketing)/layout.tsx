import { Suspense } from "react"
import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-ui-scope="core" className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<div className="h-[60px] md:h-[54px]" aria-hidden="true" />}>
        <GlobalHeader />
      </Suspense>
      <main className="global-main">{children}</main>
      <Suspense fallback={<div className="h-[208px] md:h-[248px]" aria-hidden="true" />}>
        <Footer />
      </Suspense>
    </div>
  )
}
