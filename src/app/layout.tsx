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

// Google Fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
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
