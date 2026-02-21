"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import TipTapEditor from "./TipTapEditor"

type RichTextPageEditorProps = {
  slug: string
  userId: Id<"users">
}

const SLUG_TITLES: Record<string, string> = {
  about: "About Page",
  privacy: "Privacy Page",
  security: "Security Page",
  terms: "Terms Page",
}

export function RichTextPageEditor({ slug, userId }: RichTextPageEditorProps) {
  const page = useQuery(api.richTextPages.getPageBySlugAdmin, {
    requestorId: userId,
    slug,
  })

  const upsertPage = useMutation(api.richTextPages.upsertPage)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("")
  const [isPublished, setIsPublished] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Simpan")

  // Sync form state when page data loads
  useEffect(() => {
    if (page) {
      setTitle(page.title ?? "")
      setContent(page.content ?? "")
      setLastUpdatedLabel(page.lastUpdatedLabel ?? "")
      setIsPublished(page.isPublished ?? false)
    }
  }, [page])

  async function handleSave() {
    setIsSaving(true)
    try {
      await upsertPage({
        requestorId: userId,
        id: page?._id,
        slug,
        title,
        content,
        lastUpdatedLabel: lastUpdatedLabel || undefined,
        isPublished,
      })
      setSaveLabel("Tersimpan!")
      setTimeout(() => setSaveLabel("Simpan"), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  // Loading skeleton
  if (page === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  const sectionTitle = SLUG_TITLES[slug] ?? `${slug} Page`

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          {sectionTitle}
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
            placeholder="Judul halaman"
          />
        </div>

        {/* Last Updated Label */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Last Updated Label
          </label>
          <Input
            value={lastUpdatedLabel}
            onChange={(e) => setLastUpdatedLabel(e.target.value)}
            placeholder='Terakhir diperbarui: 21 Februari 2026'
          />
          <p className="text-interface mt-1 text-[11px] text-muted-foreground">
            Ditampilkan di bawah konten, mis. &quot;Terakhir diperbarui: 21 Februari 2026&quot;
          </p>
        </div>

        {/* Content (TipTap) */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Content
          </label>
          <TipTapEditor
            content={content}
            onChange={setContent}
          />
        </div>

        {/* Published toggle */}
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Published
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={isPublished} onCheckedChange={setIsPublished} />
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-action bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSaving ? "Menyimpan..." : saveLabel}
        </button>
      </div>
    </div>
  )
}
