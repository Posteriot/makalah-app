"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"

const DEFAULT_SUBTITLE = "Jadilah 100 orang pertama pengguna Makalah AI. Daftarkan email, lalu tunggu undangan kami"
const DEFAULT_CTA_TEXT = "IKUT DAFTAR TUNGGU"

/**
 * Hook to check if waitlist mode is currently active + custom UI texts.
 * Uses Convex reactivity — updates instantly when admin toggles.
 */
export function useWaitlistMode() {
  const waitlistMode = useQuery(api.appConfig.getWaitlistMode)
  const texts = useQuery(api.appConfig.getWaitlistTexts)

  return {
    isWaitlistMode: waitlistMode ?? false,
    isLoading: waitlistMode === undefined,
    subtitle: texts?.subtitle || DEFAULT_SUBTITLE,
    ctaText: texts?.ctaText || DEFAULT_CTA_TEXT,
  }
}
