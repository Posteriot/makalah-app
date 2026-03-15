import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import "./globals-new.css"
import { AppProviders } from "./providers"
import { Toaster } from "@/components/ui/sonner"

// Geist - Primary UI font
const geist = localFont({
  src: "../assets/fonts/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
})

// Geist Mono - For technical text, prices, code
const geistMono = localFont({
  src: "../assets/fonts/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-mono",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "Makalah AI - Paper Akademik dengan AI",
  description: "Ngobrol + Riset + Brainstorming = Paper Akademik",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  )
}
