import type { Metadata } from "next"
import {
  Geist,
  Geist_Mono,
  Nunito_Sans,
  JetBrains_Mono,
  Victor_Mono,
} from "next/font/google"
import "./globals.css"
import { AppProviders } from "./providers"
import { Toaster } from "@/components/ui/sonner"

// Google Fonts - Geist as primary font with all weights
// Thin 100 | ExtraLight 200 | Light 300 | Regular 400 | Medium 500
// SemiBold 600 | Bold 700 | ExtraBold 800 | Black 900
const geist = Geist({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
})

// Geist Mono for subheadings and technical text
// Thin 100 | ExtraLight 200 | Light 300 | Regular 400 | Medium 500
// SemiBold 600 | Bold 700 | ExtraBold 800 | Black 900
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-geist-mono",
  display: "swap",
})

// Nunito Sans for headings with bold weights
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-heading",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

const victorMono = Victor_Mono({
  subsets: ["latin"],
  variable: "--font-hero",
  display: "swap",
})

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
        className={`${geist.variable} ${geistMono.variable} ${nunitoSans.variable} ${jetbrainsMono.variable} ${victorMono.variable} antialiased`}
      >
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  )
}
