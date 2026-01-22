import { SignIn } from "@clerk/nextjs"
import { AuthWideCard } from "@/components/auth/AuthWideCard"

export default function SignInPage() {
  return (
    <AuthWideCard
      title="Balik lagi, Pawang?"
      subtitle="Siap lanjutin riset lo? Yuk masuk dulu biar paper lo makin sat-set."
    >
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-none bg-transparent p-0 w-full",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton: "rounded-lg border-border hover:bg-muted transition-colors text-sm font-medium",
            formButtonPrimary: "bg-brand hover:opacity-90 transition-opacity text-sm font-bold h-10 shadow-none",
            formFieldInput: "rounded-lg border-border bg-background focus:ring-brand focus:border-brand transition-all",
            footerActionLink: "text-brand hover:text-brand/80 font-bold",
            identityPreviewText: "text-foreground",
            identityPreviewEditButtonIcon: "text-brand",
          },
        }}
      />
    </AuthWideCard>
  )
}

