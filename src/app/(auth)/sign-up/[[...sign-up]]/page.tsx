"use client"
import dynamic from "next/dynamic"
import { dark } from "@clerk/themes"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { useTheme } from "next-themes"

const SHOW_SOCIAL_SKELETON = Boolean(
  process.env.NEXT_PUBLIC_CLERK_SOCIAL_PROVIDERS?.trim()
)

const SignUp = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignUp),
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
          <div className="h-10 bg-muted rounded-md" />
        </div>
        <div className="h-10 bg-muted rounded-md" />
        <div className="h-3 w-40 bg-muted rounded mx-auto" />
      </div>
    ),
  }
)

export default function SignUpPage() {
  const { resolvedTheme } = useTheme()

  const initialTheme =
    resolvedTheme ??
    (typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light")
  const isDark = initialTheme === "dark"

  return (
    <AuthWideCard
      title="Ayo bergabung!"
      subtitle="Kolaborasi kecerdasan manusia & Ai, dalam menyusun paper bermutu & akuntable"
    >
      <SignUp
        appearance={{
          baseTheme: isDark ? dark : undefined,
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-none bg-transparent p-0 w-full",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            main: "p-0",
            formFieldRow: "!flex !flex-col !gap-4",
            socialButtonsBlockButtonBadge: "hidden",
            socialButtonsBlockButton: `rounded-lg border-border hover:bg-muted transition-colors text-sm font-medium ${isDark ? "bg-muted/50" : ""}`,
            formButtonPrimary: "bg-brand hover:opacity-90 transition-opacity text-sm font-bold h-10 shadow-none",
            formFieldInput: `rounded-lg border-border bg-background focus:ring-brand focus:border-brand transition-all ${isDark ? "bg-muted/20" : ""}`,
            footerActionLink: "text-brand hover:text-brand/80 font-bold",
            identityPreviewText: "text-foreground",
            identityPreviewEditButtonIcon: "text-brand",
            formFieldLabel: "hidden",
            formFieldHintText: "hidden",
            dividerText: "text-muted-foreground",
            footer: "bg-transparent mt-4",
            footerActionText: "text-muted-foreground",
          },
          variables: {
            colorPrimary: "oklch(0.711 0.181 125.2)",
            colorTextSecondary: "#a1a1aa",
            colorBackground: "transparent",
            colorTextOnPrimaryBackground: "white",
          }
        }}
      />
    </AuthWideCard>
  )
}
