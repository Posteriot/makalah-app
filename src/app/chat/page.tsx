export default function ChatPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-8">
      <section className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Chat
        </h1>
        <p className="text-sm text-muted-foreground">
          This will be the AI chat workspace. We will wire it up to the AI
          backend in a later step.
        </p>
      </section>
    </main>
  )
}

