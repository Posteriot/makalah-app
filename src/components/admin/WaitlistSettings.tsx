"use client"

import { useState, useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface WaitlistSettingsProps {
  userId: Id<"users">
}

export function WaitlistSettings({ userId }: WaitlistSettingsProps) {
  const { isWaitlistMode, isLoading: isWaitlistLoading, subtitle: currentSubtitle, ctaText: currentCtaText } = useWaitlistMode()
  const setWaitlistModeMutation = useMutation(api.appConfig.setWaitlistMode)
  const setWaitlistTextsMutation = useMutation(api.appConfig.setWaitlistTexts)

  const [subtitleInput, setSubtitleInput] = useState("")
  const [ctaTextInput, setCtaTextInput] = useState("")
  const [isSavingTexts, setIsSavingTexts] = useState(false)

  useEffect(() => {
    if (currentSubtitle) setSubtitleInput(currentSubtitle)
    if (currentCtaText) setCtaTextInput(currentCtaText)
  }, [currentSubtitle, currentCtaText])

  const handleToggleWaitlist = async () => {
    try {
      await setWaitlistModeMutation({
        adminUserId: userId,
        enabled: !isWaitlistMode,
      })
      toast.success(
        isWaitlistMode
          ? "Waiting list mode dinonaktifkan"
          : "Waiting list mode diaktifkan"
      )
    } catch (error) {
      console.error("Toggle waitlist error:", error)
      toast.error("Gagal mengubah status waiting list")
    }
  }

  const handleSaveTexts = async () => {
    setIsSavingTexts(true)
    try {
      await setWaitlistTextsMutation({
        adminUserId: userId,
        subtitle: subtitleInput,
        ctaText: ctaTextInput,
      })
      toast.success("Teks waitlist berhasil disimpan")
    } catch (error) {
      console.error("Save waitlist texts error:", error)
      toast.error("Gagal menyimpan teks waitlist")
    } finally {
      setIsSavingTexts(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-interface text-xs font-mono text-muted-foreground">
          Waitlist Mode
        </span>
        <button
          type="button"
          onClick={handleToggleWaitlist}
          disabled={isWaitlistLoading}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
            isWaitlistMode ? "bg-primary" : "bg-slate-600"
          )}
          aria-label={
            isWaitlistMode
              ? "Nonaktifkan waitlist mode"
              : "Aktifkan waitlist mode"
          }
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              isWaitlistMode ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
        <span
          className={cn(
            "text-signal text-[10px] font-bold",
            isWaitlistMode
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          )}
        >
          {isWaitlistMode ? "AKTIF" : "NONAKTIF"}
        </span>
      </div>

      {/* Waitlist UI Texts */}
      <div className="rounded-shell border-main border border-border bg-card/60 p-comfort">
        <h3 className="text-signal mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Teks Tampilan Waitlist
        </h3>
        <p className="text-interface mb-4 text-xs text-muted-foreground">
          Teks yang muncul di Hero CTA saat mode waitlist aktif. Kosongkan untuk menggunakan default.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              Subtitle
            </label>
            <textarea
              value={subtitleInput}
              onChange={(e) => setSubtitleInput(e.target.value)}
              placeholder="Jadilah 100 orang pertama pengguna Makalah AI. Daftarkan email, lalu tunggu undangan kami"
              rows={2}
              className="focus-ring w-full rounded-action border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              Teks Tombol CTA
            </label>
            <input
              type="text"
              value={ctaTextInput}
              onChange={(e) => setCtaTextInput(e.target.value)}
              placeholder="IKUT DAFTAR TUNGGU"
              className="focus-ring w-full rounded-action border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveTexts}
            disabled={isSavingTexts}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-action border border-border px-3 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            )}
          >
            {isSavingTexts ? "Menyimpan..." : "Simpan Teks"}
          </button>
        </div>
      </div>
    </div>
  )
}
