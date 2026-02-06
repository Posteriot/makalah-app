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
          {/* Logo Icon */}
          <Image
            src="/logo/makalah_logo_light.svg"
            alt=""
            width={28}
            height={28}
            className="transition-transform group-hover:scale-105"
          />
          {/* Brand Text - for dark mode */}
          <Image
            src="/logo-makalah-ai-white.svg"
            alt="Makalah"
            width={80}
            height={20}
            className="hidden dark:block transition-transform group-hover:scale-105"
          />
          {/* Brand Text - for light mode */}
          <Image
            src="/logo-makalah-ai-black.svg"
            alt="Makalah"
            width={80}
            height={20}
            className="block dark:hidden transition-transform group-hover:scale-105"
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
      rootBox: "w-full border-none !shadow-none",
      cardBox: "border-none !shadow-none",
      card: "!shadow-none border-none bg-transparent p-0 w-full",
      form: "border-none !shadow-none",
      formContainer: "border-none !shadow-none",
      formBox: "!shadow-none",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      main: "p-0 border-none",
      formFieldRow: "!flex !flex-col !gap-4",
      socialButtonsBlockButtonBadge: "hidden",
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
      formFieldLabel: "hidden",
      formFieldHintText: "hidden",
      identifierFieldInputOptionLastUsed: "hidden",
      formFieldInputShowPasswordButton: "hover:!text-[color:var(--slate-200)]",
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
      colorPrimary: "oklch(0.769 0.188 70.08)",
      colorTextSecondary: "#a1a1aa",
      colorBackground: "transparent",
      colorTextOnPrimaryBackground: "white",
      colorBorder: "transparent",
      borderRadius: "8px",
    },
    layout: {
      showOptionalFields: true,
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
      subtitle="Kolaborasi dengan AI, menyusun paper bermutu & akuntable"
    >
      <SignUp
        appearance={clerkAppearance}
        forceRedirectUrl={redirectUrl}
      />
    </AuthWideCard>
  )
}
