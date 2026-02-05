"use client"
import dynamic from "next/dynamic"
import { dark } from "@clerk/themes"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { useTheme } from "next-themes"
import { useSearchParams } from "next/navigation"
import { getClerkRedirectUrl } from "@/lib/utils/redirectAfterAuth"

const SHOW_SOCIAL_SKELETON = Boolean(
  process.env.NEXT_PUBLIC_CLERK_SOCIAL_PROVIDERS?.trim()
)

const SignIn = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignIn),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 animate-pulse">
        {SHOW_SOCIAL_SKELETON && (
          <>
            <div className="space-y-3">
              <div className="h-10 bg-muted rounded-md" />
              <div className="h-10 bg-muted rounded-md" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-px bg-muted flex-1" />
              <div className="h-2 w-14 bg-muted rounded" />
              <div className="h-px bg-muted flex-1" />
            </div>
          </>
        )}
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded-md" />
          <div className="h-10 bg-muted rounded-md" />
        </div>
        <div className="h-10 bg-muted rounded-md" />
        <div className="h-3 w-32 bg-muted rounded mx-auto" />
      </div>
    ),
  }
)

export default function SignInPage() {
  const { resolvedTheme } = useTheme()
  const searchParams = useSearchParams()

  // Get validated redirect URL from search params, default to /chat for returning users
  const redirectUrl = getClerkRedirectUrl(searchParams, "/chat")

  const initialTheme =
    resolvedTheme ??
    (typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light")
  const isDark = initialTheme === "dark"

  return (
    <AuthWideCard
      title="Silakan masuk!"
      subtitle="Susun Paper terbaikmu, tanpa ribet, tinggal ngobrol!"
    >
      <SignIn
        forceRedirectUrl={redirectUrl}
        appearance={{
          baseTheme: isDark ? dark : undefined,
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-none bg-transparent p-0 w-full",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            main: "p-0",
            socialButtonsBlockButton: `rounded-action border-border hover:bg-muted transition-colors font-mono text-xs uppercase tracking-wider ${isDark ? "bg-muted/50" : ""}`,
            formButtonPrimary: "bg-primary hover:bg-primary/90 transition-colors font-mono text-xs font-bold uppercase tracking-widest h-10 shadow-none rounded-action",
            formFieldInput: `rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary transition-all ${isDark ? "bg-muted/20" : ""}`,
            footerActionLink: "text-primary hover:text-primary/80 font-bold",
            identityPreviewText: "text-foreground font-mono",
            identityPreviewEditButtonIcon: "text-primary",
            formFieldLabel: "hidden",
            formFieldHintText: "hidden",
            socialButtonsBlockButtonBadge: "hidden",
            identifierFieldInputOptionLastUsed: "hidden",
            alternativeMethodsBlockButtonBadge: "hidden",
            formFieldInputGroupSuffix: "hidden",
            formFieldSuccessText: "hidden",
            dividerText: "text-muted-foreground font-mono text-xs uppercase tracking-wider",
            footer: "bg-transparent mt-4",
            footerActionText: "text-muted-foreground font-sans text-xs",
          },
          variables: {
            colorPrimary: "oklch(0.769 0.188 70.08)", // Amber 500 - Mechanical Grace
            colorTextSecondary: "#a1a1aa",
            colorBackground: "transparent",
            colorTextOnPrimaryBackground: "white",
          }
        }}
      />
    </AuthWideCard>
  )
}
