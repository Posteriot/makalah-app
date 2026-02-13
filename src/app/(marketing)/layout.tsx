import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="global-main">{children}</main>
      <Footer />
    </div>
  )
}
