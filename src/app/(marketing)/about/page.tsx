export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-8">
      <section className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          About Makalah App
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Makalah App is an AI-assisted workspace focused on helping students,
          researchers, and professionals plan, structure, and refine academic
          papers while staying grounded in real references.
        </p>
        <p className="text-sm text-muted-foreground">
          This is an early version of the product. The goal is to keep the
          experience simple, focused, and transparent so you always stay in
          control of your work.
        </p>
      </section>
    </main>
  )
}

