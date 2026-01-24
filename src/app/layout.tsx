import type { Metadata } from "next"
import {
  Inter,
  Nunito_Sans,
  JetBrains_Mono,
  Victor_Mono,
} from "next/font/google"
import "./globals.css"
import { AppProviders } from "./providers"
import { Toaster } from "@/components/ui/sonner"

// Google Fonts - Inter as primary font with all weights
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
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
        className={`${inter.variable} ${nunitoSans.variable} ${jetbrainsMono.variable} ${victorMono.variable} antialiased`}
      >
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  )
}
