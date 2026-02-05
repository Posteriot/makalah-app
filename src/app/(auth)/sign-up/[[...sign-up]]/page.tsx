"use client"
import dynamic from "next/dynamic"
import { dark } from "@clerk/themes"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { useTheme } from "next-themes"
import { useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import Link from "next/link"
import Image from "next/image"
import { WarningCircle, CheckCircle, Mail } from "iconoir-react"
import { getClerkRedirectUrl } from "@/lib/utils/redirectAfterAuth"

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

// Custom left content for invited users
function InvitedUserLeftContent({ email }: { email: string }) {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex flex-col">
        <Link href="/" className="inline-flex items-center gap-2 group w-fit">
          <Image
            src="/logo/makalah_logo_500x500.png"
            alt="Makalah"
            width={28}
            height={28}
            className="rounded-md shadow-sm transition-transform group-hover:scale-105"
          />
        </Link>
      </div>

      <div className="space-y-4 mt-auto">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle className="h-5 w-5" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest">UNDANGAN VALID</span>
        </div>
        <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tighter text-foreground leading-[1.1]">
          Selamat datang!
        </h1>
        <p className="text-sm text-muted-foreground">
          Kamu diundang untuk bergabung dengan Makalah App.
        </p>
        <div className="flex items-center gap-2 bg-muted/50 rounded-action px-3 py-2 border border-hairline">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{email}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Gunakan email di atas untuk mendaftar.
        </p>
      </div>
    </div>
  )
}

// Error content for invalid/expired token
function InvalidTokenContent({ error }: { error: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <WarningCircle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Link Tidak Valid
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {error}
      </p>
      <Link
        href="/waiting-list"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-action font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
      >
        DAFTAR WAITING LIST
      </Link>
    </div>
  )
}

export default function SignUpPage() {
  const { resolvedTheme } = useTheme()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")

  // Get validated redirect URL from search params (e.g., ?redirect=/checkout/bpp)
  const redirectUrl = getClerkRedirectUrl(searchParams)

  // Only validate token if present
  const tokenValidation = useQuery(
    api.waitlist.getByToken,
    inviteToken ? { token: inviteToken } : "skip"
  )

  const initialTheme =
    resolvedTheme ??
    (typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light")
  const isDark = initialTheme === "dark"

  const clerkAppearance = {
    baseTheme: isDark ? dark : undefined,
    elements: {
      rootBox: "w-full",
      card: "shadow-none border-none bg-transparent p-0 w-full",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      main: "p-0",
      formFieldRow: "!flex !flex-col !gap-4",
      socialButtonsBlockButtonBadge: "hidden",
      socialButtonsBlockButton: `rounded-action border-border hover:bg-muted transition-colors font-mono text-xs uppercase tracking-wider ${isDark ? "bg-muted/50" : ""}`,
      formButtonPrimary: "bg-primary hover:bg-primary/90 transition-colors font-mono text-xs font-bold uppercase tracking-widest h-10 shadow-none rounded-action",
      formFieldInput: `rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary transition-all ${isDark ? "bg-muted/20" : ""}`,
      footerActionLink: "text-primary hover:text-primary/80 font-bold",
      identityPreviewText: "text-foreground font-mono",
      identityPreviewEditButtonIcon: "text-primary",
      formFieldLabel: "hidden",
      formFieldHintText: "hidden",
      dividerText: "text-muted-foreground font-mono text-xs uppercase tracking-wider",
      footer: "bg-transparent mt-4",
      footerActionText: "text-muted-foreground font-sans text-xs",
    },
    variables: {
      colorPrimary: "oklch(0.769 0.188 70.08)",
      colorTextSecondary: "#a1a1aa",
      colorBackground: "transparent",
      colorTextOnPrimaryBackground: "white",
    }
  }

  // If invite token present, check validation
  if (inviteToken) {
    // Loading state
    if (tokenValidation === undefined) {
      return (
        <AuthWideCard
          title="Memvalidasi..."
          subtitle="Sedang memeriksa undangan kamu"
        >
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded-md" />
            <div className="h-10 bg-muted rounded-md" />
            <div className="h-10 bg-muted rounded-md" />
          </div>
        </AuthWideCard>
      )
    }

    // Invalid token
    if (!tokenValidation.valid) {
      return (
        <AuthWideCard
          title="Link Tidak Valid"
          subtitle="Token undangan tidak dapat digunakan"
        >
          <InvalidTokenContent error={tokenValidation.error ?? "Token tidak valid"} />
        </AuthWideCard>
      )
    }

    // Valid token - show special welcome with email hint
    return (
      <AuthWideCard
        title="Selamat datang!"
        subtitle="Kamu diundang untuk bergabung"
        customLeftContent={<InvitedUserLeftContent email={tokenValidation.email!} />}
      >
        <SignUp
          appearance={clerkAppearance}
          forceRedirectUrl={redirectUrl}
        />
      </AuthWideCard>
    )
  }

  // Default sign-up (no invite token)
  return (
    <AuthWideCard
      title="Ayo bergabung!"
      subtitle="Kolaborasi kecerdasan manusia & Ai, dalam menyusun paper bermutu & akuntable"
    >
      <SignUp
        appearance={clerkAppearance}
        forceRedirectUrl={redirectUrl}
      />
    </AuthWideCard>
  )
}
