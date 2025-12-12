import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function MarketingHomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Makalah App
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            AI-powered assistant for academic papers.
          </h1>
          <p className="text-balance text-base text-muted-foreground sm:text-lg">
            Plan, outline, and refine your papers faster with an AI workflow
            that stays grounded in your own references.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="px-8" asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" className="px-8" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
