"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsImageUpload } from "./CmsImageUpload"

type HeroSectionEditorProps = {
  userId: Id<"users">
}

export function HeroSectionEditor({ userId }: HeroSectionEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "hero",
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [badgeText, setBadgeText] = useState("")
  const [ctaText, setCtaText] = useState("")
  const [ctaHref, setCtaHref] = useState("")
  const [primaryImageId, setPrimaryImageId] = useState<Id<"_storage"> | null>(
    null
  )
  const [primaryImageAlt, setPrimaryImageAlt] = useState("")
  const [headingImageDarkId, setHeadingImageDarkId] = useState<Id<"_storage"> | null>(null)
  const [headingImageLightId, setHeadingImageLightId] = useState<Id<"_storage"> | null>(null)
  const [isPublished, setIsPublished] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Simpan")

  // Sync form state when section data loads
  useEffect(() => {
    if (section) {
      setTitle(section.title ?? "")
      setSubtitle(section.subtitle ?? "")
      setBadgeText(section.badgeText ?? "")
      setCtaText(section.ctaText ?? "")
      setCtaHref(section.ctaHref ?? "")
      setPrimaryImageId(section.primaryImageId ?? null)
      setPrimaryImageAlt(section.primaryImageAlt ?? "")
      setHeadingImageDarkId(section.headingImageDarkId ?? null)
      setHeadingImageLightId(section.headingImageLightId ?? null)
      setIsPublished(section.isPublished ?? false)
    }
  }, [section])

  async function handleSave() {
    setIsSaving(true)
    try {
      await upsertSection({
        requestorId: userId,
        id: section?._id,
        pageSlug: "home",
        sectionSlug: "hero",
        sectionType: "hero",
        title,
        subtitle,
        badgeText,
        ctaText,
        ctaHref,
        primaryImageId: primaryImageId ?? undefined,
        primaryImageAlt,
        headingImageDarkId: headingImageDarkId ?? undefined,
        headingImageLightId: headingImageLightId ?? undefined,
        isPublished,
        sortOrder: 1,
      })
      setSaveLabel("Tersimpan!")
      setTimeout(() => setSaveLabel("Simpan"), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  // Loading skeleton
  if (section === undefined) {
    return (
      <div className="w-full max-w-2xl space-y-4 p-comfort">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Hero Section
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul hero section"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Subtitle
          </label>
          <Textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Deskripsi pendek di bawah judul"
            rows={3}
          />
        </div>

        {/* Badge Text */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Badge Text
          </label>
          <Input
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            placeholder="Teks badge di atas judul"
          />
        </div>

        {/* CTA Text + CTA Link side by side */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              CTA Text
            </label>
            <Input
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Teks tombol CTA"
            />
          </div>
          <div className="flex-1">
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              CTA Link
            </label>
            <Input
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
              placeholder="/chat atau URL lain"
            />
          </div>
        </div>

        {/* Heading SVG */}
        <div className="space-y-2">
          <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Heading SVG
          </span>
          <div className="grid grid-cols-2 gap-4">
            <CmsImageUpload
              currentImageId={headingImageDarkId}
              onUpload={(storageId) => setHeadingImageDarkId(storageId)}
              userId={userId}
              label="Dark Mode"
              aspectRatio="4/1"
              fallbackPreviewUrl="/heading-light-color.svg"
            />
            <CmsImageUpload
              currentImageId={headingImageLightId}
              onUpload={(storageId) => setHeadingImageLightId(storageId)}
              userId={userId}
              label="Light Mode"
              aspectRatio="4/1"
              fallbackPreviewUrl="/heading-dark-color.svg"
            />
          </div>
          <p className="text-interface text-xs text-muted-foreground">
            Dark mode = tampil saat tema gelap. Light mode = tampil saat tema terang. Kosongkan untuk pakai default.
          </p>
        </div>

        {/* Hero Image */}
        <CmsImageUpload
          currentImageId={primaryImageId}
          onUpload={(storageId) => setPrimaryImageId(storageId)}
          userId={userId}
          label="Hero Image"
          aspectRatio="16/9"
          fallbackPreviewUrl="/images/hero-paper-session-mock.png"
        />

        {/* Image Alt Text */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Image Alt Text
          </label>
          <Input
            value={primaryImageAlt}
            onChange={(e) => setPrimaryImageAlt(e.target.value)}
            placeholder="Deskripsi gambar untuk aksesibilitas"
          />
        </div>

        {/* Published toggle */}
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Published
          </label>
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-action"
        >
          {isSaving ? "Menyimpan..." : saveLabel}
        </Button>
      </div>
    </div>
  )
}
