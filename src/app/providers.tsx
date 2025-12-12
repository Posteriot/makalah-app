"use client"

import type { ReactNode } from "react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ClerkProvider } from "@clerk/nextjs"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

export function AppProviders({ children }: { children: ReactNode }) {
  const content = convexClient ? (
    <ConvexProvider client={convexClient}>{children}</ConvexProvider>
  ) : (
    children
  )

  return <ClerkProvider>{content}</ClerkProvider>
}
