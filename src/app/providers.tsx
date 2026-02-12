"use client"

import type { ReactNode } from "react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ClerkProvider, useAuth } from "@clerk/nextjs"
import { idID } from "@clerk/localizations"
import { ThemeProvider } from "next-themes"
import { ThemeEnforcer } from "@/components/theme/ThemeEnforcer"

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
        signIn: {
          ...idID.signIn,
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
