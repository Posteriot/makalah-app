"use client"

import type { ReactNode } from "react"
import { ConvexReactClient } from "convex/react"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ThemeProvider } from "next-themes"
import { ThemeEnforcer } from "@/components/theme/ThemeEnforcer"
import { authClient } from "@/lib/auth-client"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ThemeEnforcer />
      {convexClient ? (
        <ConvexBetterAuthProvider
          client={convexClient}
          authClient={authClient}
        >
          {children}
        </ConvexBetterAuthProvider>
      ) : (
        children
      )}
    </ThemeProvider>
  )
}
