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
      <div className="w-full space-y-5 animate-pulse">
        {/* Social button skeleton */}
        {SHOW_SOCIAL_SKELETON && (
          <>
            <div className="h-10 bg-foreground/10 rounded-action" />
            {/* Divider skeleton */}
            <div className="flex items-center gap-4">
              <div className="h-[0.5px] bg-foreground/10 flex-1" />
              <div className="h-2 w-10 bg-foreground/10 rounded" />
              <div className="h-[0.5px] bg-foreground/10 flex-1" />
            </div>
          </>
        )}
        {/* Email input skeleton */}
        <div className="h-10 bg-foreground/10 rounded-action" />
        {/* Submit button skeleton */}
        <div className="h-10 bg-foreground/[0.07] rounded-action" />
        {/* Footer skeleton */}
        <div className="h-3 w-36 bg-foreground/[0.05] rounded mx-auto mt-4" />
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
            rootBox: "w-full border-none !shadow-none",
            cardBox: "border-none !shadow-none",
            card: "!shadow-none border-none bg-transparent p-0 w-full",
            form: "border-none !shadow-none",
            formContainer: "border-none !shadow-none",
            formBox: "!shadow-none",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            main: "p-0 border-none",
            socialButtonsBlockButton: `!relative !overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors !border !border-solid !border-transparent before:content-[''] before:absolute before:inset-0 before:pointer-events-none before:translate-x-[101%] before:transition-transform before:duration-300 before:ease-out hover:before:translate-x-0 btn-stripes-clerk [&>*]:relative [&>*]:z-10 hover:!border-[color:var(--slate-400)] ${
              isDark
                ? "!bg-[color:var(--slate-100)] !text-[color:var(--slate-800)] hover:!text-[color:var(--slate-100)]"
                : "!bg-[color:var(--slate-800)] !text-[color:var(--slate-100)] hover:!text-[color:var(--slate-800)]"
            }`,
            formButtonPrimary: `!relative !overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors !border-[1px] !border-solid !border-transparent !outline-none !ring-0 !shadow-none before:content-[''] before:absolute before:inset-0 before:pointer-events-none before:translate-x-[101%] before:transition-transform before:duration-300 before:ease-out hover:before:translate-x-0 btn-stripes-clerk [&>*]:relative [&>*]:z-10 hover:!border-[color:var(--slate-400)] ${
              isDark
                ? "!bg-[color:var(--slate-100)] !text-[color:var(--slate-800)] hover:!text-[color:var(--slate-100)]"
                : "!bg-[color:var(--slate-800)] !text-[color:var(--slate-100)] hover:!text-[color:var(--slate-800)]"
            }`,
            formFieldInput: `rounded-action border-border h-10 font-mono text-sm focus:ring-primary focus:border-primary transition-all ${isDark ? "!bg-[color:var(--slate-900)]" : "bg-background"}`,
            footerActionLink: "!text-[color:var(--slate-50)] hover:!text-[color:var(--slate-300)] font-bold",
            identityPreviewText: "text-foreground font-mono",
            identityPreviewEditButtonIcon: "!text-slate-200",
            formFieldAction: "!text-slate-50 font-mono text-xs",
            backLink: "!text-slate-200 font-sans text-xs",
            backRow: "[&_a]:!text-slate-200 [&_a]:!decoration-slate-200 [&_a]:!font-sans [&_a]:!text-xs",
            formFieldLabel: "hidden",
            formFieldHintText: "hidden",
            socialButtonsBlockButtonBadge: "hidden",
            identifierFieldInputOptionLastUsed: "hidden",
            alternativeMethodsBlockButtonBadge: "hidden",
            formFieldInputGroupSuffix: "hidden",
            formFieldSuccessText: "hidden",
            dividerText: "text-muted-foreground font-mono text-xs uppercase tracking-wider px-4",
            dividerRow: "flex items-center gap-0 w-full",
            dividerLine: "flex-1 h-[0.5px] !bg-[color:var(--slate-400)]",
            footer: "!bg-transparent mt-4 [&]:!bg-transparent",
            footerBox: "!bg-transparent !shadow-none",
            footerAction: "!bg-transparent",
            footerActionText: "text-muted-foreground font-sans text-xs !bg-transparent",
            footerPages: "!bg-transparent",
            footerPagesLink: "!bg-transparent",
          },
          variables: {
            colorPrimary: "oklch(0.769 0.188 70.08)", // Amber 500 - Mechanical Grace
            colorTextSecondary: "#a1a1aa",
            colorBackground: "transparent",
            colorTextOnPrimaryBackground: "white",
            colorBorder: "transparent",
            borderRadius: "8px",
          },
          layout: {
            showOptionalFields: false,
          }
        }}
      />
    </AuthWideCard>
  )
}
