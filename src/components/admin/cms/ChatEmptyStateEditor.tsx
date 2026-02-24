"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsImageUpload } from "./CmsImageUpload"
import { CmsSaveButton } from "./CmsSaveButton"

type ChatEmptyStateEditorProps = {
  userId: Id<"users">
}

const DEFAULT_HEADING = "Mari berdiskusi!"
const DEFAULT_DESCRIPTION_LINES = [
  "Ingin berdiskusi mengenai riset atau langsung menulis paper?",
  "Silakan ketik maksud di kolom percakapan,",
  "atau buka riwayat percakapan terdahulu di",
]
const DEFAULT_TEMPLATE_LABEL = "Atau gunakan template berikut:"
const DEFAULT_TEMPLATES = [
  "Mari berdiskusi terlebih dahulu.",
  "Mari berkolaborasi menyusun paper akademik.",
]

type EditorDraft = {
  logoLightId: Id<"_storage"> | null
  logoDarkId: Id<"_storage"> | null
  heading: string
  descriptionText: string
  sidebarLinkLabel: string
  templateLabel: string
  templates: string[]
  isPublished: boolean
}

export function ChatEmptyStateEditor({ userId }: ChatEmptyStateEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "chat",
    sectionSlug: "chat-empty-state",
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const [draft, setDraft] = useState<Partial<EditorDraft>>({})

  const baseLines =
    section?.paragraphs && section.paragraphs.length > 0
      ? section.paragraphs
      : DEFAULT_DESCRIPTION_LINES
  const baseTemplates =
    section?.items && section.items.length > 0
      ? section.items
          .map((item) => item.title || item.description || "")
          .filter((item) => item.trim().length > 0)
      : DEFAULT_TEMPLATES

  // NOTE: For this section we map logo as:
  // - primaryImageId => light mode
  // - secondaryImageId => dark mode
  const logoLightId = draft.logoLightId ?? (section?.primaryImageId ?? null)
  const logoDarkId = draft.logoDarkId ?? (section?.secondaryImageId ?? null)
  const heading = draft.heading ?? (section?.title ?? DEFAULT_HEADING)
  const descriptionText = draft.descriptionText ?? baseLines.join("\n")
  const sidebarLinkLabel = draft.sidebarLinkLabel ?? (section?.ctaText ?? "sidebar")
  const templateLabel = draft.templateLabel ?? (section?.subtitle ?? DEFAULT_TEMPLATE_LABEL)
  const templates = draft.templates ?? (baseTemplates.length > 0 ? baseTemplates : DEFAULT_TEMPLATES)
  const isPublished = draft.isPublished ?? (section?.isPublished ?? false)

  function updateTemplate(index: number, value: string) {
    setDraft((prev) => ({
      ...prev,
      templates: (prev.templates ?? templates).map((item, i) => (i === index ? value : item)),
    }))
  }

  function addTemplate() {
    setDraft((prev) => ({
      ...prev,
      templates: [...(prev.templates ?? templates), ""],
    }))
  }

  function removeTemplate(index: number) {
    setDraft((prev) => ({
      ...prev,
      templates: (prev.templates ?? templates).filter((_, i) => i !== index),
    }))
  }

  async function handleSave() {
    const normalizedHeading = heading.trim()
    const normalizedSidebarLinkLabel = sidebarLinkLabel.trim()
    const normalizedTemplateLabel = templateLabel.trim()
    const normalizedLines = descriptionText
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    const normalizedTemplates = templates.map((item) => item.trim()).filter((item) => item.length > 0)

    await upsertSection({
      requestorId: userId,
      id: section?._id,
      pageSlug: "chat",
      sectionSlug: "chat-empty-state",
      sectionType: "page-settings",
      title: normalizedHeading || undefined,
      ctaText: normalizedSidebarLinkLabel || undefined,
      subtitle: normalizedTemplateLabel || undefined,
      paragraphs: normalizedLines.length > 0 ? normalizedLines : undefined,
      items: normalizedTemplates.map((text) => ({
        title: text,
        description: text,
      })),
      primaryImageId: logoLightId ?? undefined,
      secondaryImageId: logoDarkId ?? undefined,
      isPublished,
      sortOrder: 1,
    })

    setDraft({})
  }

  if (section === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Chat Empty State
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      <div className="space-y-2">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Logo
        </span>
        <div className="grid grid-cols-2 gap-4">
          <CmsImageUpload
            currentImageId={logoLightId}
            onUpload={(storageId) => setDraft((prev) => ({ ...prev, logoLightId: storageId }))}
            userId={userId}
            label="Light Mode"
            aspectRatio="1/1"
            fallbackPreviewUrl="/logo/makalah_logo_dark.svg"
          />
          <CmsImageUpload
            currentImageId={logoDarkId}
            onUpload={(storageId) => setDraft((prev) => ({ ...prev, logoDarkId: storageId }))}
            userId={userId}
            label="Dark Mode"
            aspectRatio="1/1"
            fallbackPreviewUrl="/logo/makalah_logo_light.svg"
          />
        </div>
      </div>

      <div className="border-t border-border" />
      <div className="space-y-4">
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Heading
          </label>
          <Input
            value={heading}
            onChange={(e) => setDraft((prev) => ({ ...prev, heading: e.target.value }))}
            placeholder="Judul empty state"
          />
        </div>

        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Deskripsi
          </label>
          <Textarea
            value={descriptionText}
            onChange={(e) => setDraft((prev) => ({ ...prev, descriptionText: e.target.value }))}
            placeholder="Tulis deskripsi. Tekan Enter untuk baris baru."
            rows={4}
          />
          <p className="text-interface mt-1 text-[10px] text-muted-foreground">
            Gunakan Enter untuk membuat baris baru. Kata <span className="font-semibold">sidebar</span> tetap jadi link aksi di akhir baris terakhir.
          </p>
        </div>
      </div>

      <div className="border-t border-border" />
      <div className="space-y-4">
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Label Link Sidebar
          </label>
          <Input
            value={sidebarLinkLabel}
            onChange={(e) => setDraft((prev) => ({ ...prev, sidebarLinkLabel: e.target.value }))}
            placeholder="sidebar"
          />
          <p className="text-interface mt-1 text-[10px] text-muted-foreground">
            Ini hanya label teks link. Aksi klik tetap membuka sidebar riwayat percakapan.
          </p>
        </div>

        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Label Template
          </label>
          <Input
            value={templateLabel}
            onChange={(e) => setDraft((prev) => ({ ...prev, templateLabel: e.target.value }))}
            placeholder="Atau gunakan template berikut:"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Daftar Template
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-action text-xs"
              onClick={addTemplate}
            >
              + Template
            </Button>
          </div>

          {templates.map((template, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={template}
                onChange={(e) => updateTemplate(index, e.target.value)}
                placeholder={`Template ${index + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-action text-xs text-destructive hover:text-destructive"
                onClick={() => removeTemplate(index)}
              >
                Hapus
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />
      <div className="flex items-center gap-3">
        <label className="text-interface text-xs font-medium text-muted-foreground">
          Published
        </label>
        <Switch
          className="data-[state=checked]:bg-emerald-600"
          checked={isPublished}
          onCheckedChange={(value) => setDraft((prev) => ({ ...prev, isPublished: value }))}
        />
      </div>

      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}
