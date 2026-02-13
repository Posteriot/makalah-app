"use client"

import type { ReactNode } from "react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ClerkProvider, useAuth } from "@clerk/nextjs"
import { idID } from "@clerk/localizations"
import { ThemeProvider } from "next-themes"
import { ThemeEnforcer } from "@/components/theme/ThemeEnforcer"
import { AccountLinkingNotice } from "@/components/auth/AccountLinkingNotice"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

export function AppProviders({ children }: { children: ReactNode }) {
  const appContent = (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {/* Force dark mode for unauthenticated users */}
      <ThemeEnforcer />
      {convexClient ? (
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          {children}
          <AccountLinkingNotice />
        </ConvexProviderWithClerk>
      ) : (
        children
      )}
    </ThemeProvider>
  )

  // Prevent build crash when Clerk publishable key is not configured in environment.
  if (!clerkPublishableKey) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <ThemeEnforcer />
        {convexClient ? (
          <ConvexProvider client={convexClient}>{children}</ConvexProvider>
        ) : (
          children
        )}
      </ThemeProvider>
    )
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      localization={{
        ...idID,
        formFieldInputPlaceholder__emailAddress: "Alamat email",
        formFieldInputPlaceholder__firstName: "Nama depan",
        formFieldInputPlaceholder__lastName: "Nama belakang",
        formFieldInputPlaceholder__password: "Password",
        // Nuclear Lapis 1: Blank out labels & badges
        formFieldLabel__emailAddress: "",
        formFieldLabel__firstName: "",
        formFieldLabel__lastName: "",
        formFieldLabel__password: "",
        formFieldAction__forgotPassword: "Lupa password?",
        reverification: {
          ...((idID as Record<string, unknown>).reverification as Record<string, unknown>),
          emailCode: {
            title: "Kode telah terkirim ke email Anda, silakan cek!",
            subtitle: "Kode telah terkirim ke email Anda, silakan cek!",
          },
        },
        signIn: {
          ...idID.signIn,
          password: {
            ...(idID.signIn?.password ?? {}),
            subtitle: "Masukkan password yang terkait dengan akun Anda",
          },
          emailCode: {
            ...(idID.signIn?.emailCode ?? {}),
            title: "Kode telah terkirim ke email Anda, silakan cek!",
            subtitle: "Kode telah terkirim ke email Anda, silakan cek!",
          },
          alternativeMethods: {
            ...(idID.signIn?.alternativeMethods ?? {}),
            actionText: "Masih bermasalah?",
            actionLink: "Bantuan",
            getHelp: {
              ...(idID.signIn?.alternativeMethods?.getHelp ?? {}),
              title: "Bantuan",
              blockButton__emailSupport: "Email Bantuan",
              content:
                "Jika kamu mengalami kesulitan masuk ke akunmu, kirim email ke kami dan kami akan membantumu memulihkan akses secepat mungkin.",
            },
          },
          forgotPasswordAlternativeMethods: {
            ...(idID.signIn?.forgotPasswordAlternativeMethods ?? {}),
            blockButton__resetPassword: "Reset password",
            label__alternativeMethods: "Atau",
          },
          start: {
            ...(idID.signIn?.start ?? {}),
            subtitle: "",
            actionText: "Belum punya akun?",
            actionLink: "Daftar",
          },
        },
      }}
    >
      {appContent}
    </ClerkProvider>
  )
}
