import type { Metadata } from "next"
import Link from "next/link"
import localFont from "next/font/local"
import "./globals.css"
import { AppProviders } from "./providers"
import { Toaster } from "@/components/ui/sonner"
import { HeaderAuthNav } from "@/components/layout/HeaderAuthNav"

const geistSans = localFont({
  src: [
    {
      path: "../assets/fonts/Geist-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
})

const geistMono = localFont({
  src: [
    {
      path: "../assets/fonts/GeistMono-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Makalah Ai",
  description: "AI-powered assistant for academic papers",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <div className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-card/40">
              {/* 
                  Temporarily disabled react-grab scripts to diagnose browser issues 
                  as reported by user (right click disabled, crash).
              */}
              {/* {process.env.NODE_ENV === "development" && (
                <>
                  <Script
                    src="//unpkg.com/react-grab/dist/index.global.js"
                    strategy="beforeInteractive"
                  />
                  <Script
                    src="//unpkg.com/@react-grab/claude-code/dist/client.global.js"
                    strategy="lazyOnload"
                  />
                </>
              )} */}
              <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-8">
                <div className="flex items-baseline gap-2">
                  <Link
                    href="/"
                    className="text-sm font-semibold tracking-wide uppercase text-muted-foreground hover:text-foreground"
                  >
                    Makalah App
                  </Link>
                  <span className="hidden text-xs text-muted-foreground sm:inline-block">
                    AI-assisted papers
                  </span>
                </div>
                <nav className="flex items-center gap-4 text-sm">
                  <Link
                    href="/"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Home
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/about"
                    className="hidden text-muted-foreground hover:text-foreground sm:inline-block"
                  >
                    About
                  </Link>
                  <Link
                    href="/chat"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Chat
                  </Link>
                  <HeaderAuthNav />
                </nav>
              </div>
            </header>
            <main>{children}</main>
            <Toaster />
          </div>
        </AppProviders>
      </body>
    </html>
  )
}
