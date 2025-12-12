import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "rounded-xl border bg-card shadow-sm",
          },
        }}
      />
    </main>
  )
}
