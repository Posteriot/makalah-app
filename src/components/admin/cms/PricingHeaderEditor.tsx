"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsSaveButton } from "./CmsSaveButton"

type PricingHeaderEditorProps = {
  pageSlug: string
  sectionSlug: string
  userId: Id<"users">
}

// Current hardcoded values — shown as defaults when no DB record exists yet
const DEFAULTS: Record<string, { badge: string; title: string; subtitle: string }> = {
  "pricing-teaser": {
    badge: "Pemakaian & Harga",
    title: "Investasi untuk\nMasa Depan Akademik.",
    subtitle: "",
  },
  "pricing-page-header": {
    badge: "Pemakaian & Harga",
    title: "Tak Perlu Bayar Mahal\nUntuk Karya Yang Masuk Akal",
    subtitle: "Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang gratisan? Boleh! Atau langsung bayar per paper? Aman!",
  },
}

export function PricingHeaderEditor({ pageSlug, sectionSlug, userId }: PricingHeaderEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug,
    sectionSlug,
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const defaults = DEFAULTS[sectionSlug] ?? { badge: "", title: "", subtitle: "" }

  const [badgeText, setBadgeText] = useState(defaults.badge)
  const [title, setTitle] = useState(defaults.title)
  const [subtitle, setSubtitle] = useState(defaults.subtitle)
  const [showGridPattern, setShowGridPattern] = useState(true)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [isPublished, setIsPublished] = useState(false)

  // Sync form state when section data loads (DB record exists)
  // When section is null (no record yet), keep the defaults
  useEffect(() => {
    if (section) {
      setBadgeText(section.badgeText ?? defaults.badge)
      setTitle(section.title ?? defaults.title)
      setSubtitle(section.subtitle ?? defaults.subtitle)
      setShowGridPattern(section.showGridPattern !== false)
      setShowDottedPattern(section.showDottedPattern !== false)
      setIsPublished(section.isPublished ?? false)
    }
  }, [section, defaults.badge, defaults.title, defaults.subtitle])

  async function handleSave() {
    await upsertSection({
      requestorId: userId,
      id: section?._id,
      pageSlug,
      sectionSlug,
      sectionType: "pricing-header",
      badgeText,
      title,
      subtitle,
      showGridPattern,
      showDottedPattern,
      isPublished,
      sortOrder: pageSlug === "home" ? 5 : 0,
    })
  }

  // Friendly label
  const label = pageSlug === "home" ? "Pricing Teaser Header" : "Pricing Page Header"

  // Loading skeleton
  if (section === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          {label}
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Badge Text */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Badge Text
          </label>
          <Input
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            placeholder="Teks badge, mis. 'Pemakaian & Harga'"
          />
        </div>

        {/* Title / Heading */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Heading
          </label>
          <Textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul section (tekan Enter untuk baris baru)"
            rows={3}
          />
          <p className="text-interface mt-1 text-[10px] text-muted-foreground">
            Tekan Enter untuk baris baru. Setiap baris ditampilkan sebagai line terpisah di frontend.
          </p>
        </div>

        {/* Subtitle (only for pricing page — teaser doesn't have subtitle) */}
        {pageSlug === "pricing" && (
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              Subtitle
            </label>
            <Textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Deskripsi pendek di bawah heading"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Background Pattern toggles */}
      <div className="space-y-2">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Background Patterns
        </span>
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Grid Pattern
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={showGridPattern} onCheckedChange={setShowGridPattern} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Dotted Pattern
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={showDottedPattern} onCheckedChange={setShowDottedPattern} />
        </div>
      </div>

      {/* Published toggle */}
      <div className="flex items-center gap-3">
        <label className="text-interface text-xs font-medium text-muted-foreground">
          Published
        </label>
        <Switch className="data-[state=checked]:bg-emerald-600" checked={isPublished} onCheckedChange={setIsPublished} />
      </div>

      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}
