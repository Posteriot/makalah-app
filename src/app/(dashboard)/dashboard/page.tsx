import { Button } from "@/components/ui/button"

export default function DashboardHomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-8">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Overview of your papers, projects, and AI usage.
            </p>
          </div>
          <Button size="sm">New paper</Button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Active papers
            </p>
            <p className="mt-2 text-2xl font-semibold">0</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              AI requests this month
            </p>
            <p className="mt-2 text-2xl font-semibold">0</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Subscription status
            </p>
            <p className="mt-2 text-2xl font-semibold">Free</p>
          </div>
        </div>
      </section>
    </main>
  )
}

