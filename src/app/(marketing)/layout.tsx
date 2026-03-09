import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-ui-scope="core" className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="global-main">{children}</main>
      <Footer />
    </div>
  )
}
