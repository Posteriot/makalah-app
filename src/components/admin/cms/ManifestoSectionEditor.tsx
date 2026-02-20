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

type ManifestoSectionEditorProps = {
  userId: Id<"users">
}

export function ManifestoSectionEditor({ userId }: ManifestoSectionEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "about",
    sectionSlug: "manifesto",
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const [badgeText, setBadgeText] = useState("")
  const [headingLines, setHeadingLines] = useState<[string, string, string]>(["", "", ""])
  const [subheading, setSubheading] = useState("")
  const [paragraphs, setParagraphs] = useState<string[]>([])
  const [isPublished, setIsPublished] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Simpan")

  // Sync form state when section data loads
  useEffect(() => {
    if (section) {
      setBadgeText(section.badgeText ?? "")
      const lines = (section.headingLines as string[] | undefined) ?? ["", "", ""]
      setHeadingLines([lines[0] ?? "", lines[1] ?? "", lines[2] ?? ""])
      setSubheading(section.subheading ?? "")
      const paras = (section.paragraphs as string[] | undefined) ?? []
      setParagraphs(paras)
      setIsPublished(section.isPublished ?? false)
    }
  }, [section])

  function updateHeadingLine(index: number, value: string) {
    setHeadingLines((prev) => {
      const next: [string, string, string] = [...prev]
      next[index] = value
      return next
    })
  }

  function updateParagraph(index: number, value: string) {
    setParagraphs((prev) => prev.map((p, i) => (i === index ? value : p)))
  }

  function addParagraph() {
    setParagraphs((prev) => [...prev, ""])
  }

  function removeParagraph(index: number) {
    setParagraphs((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await upsertSection({
        requestorId: userId,
        id: section?._id,
        pageSlug: "about",
        sectionSlug: "manifesto",
        sectionType: "manifesto",
        headingLines,
        subheading,
        paragraphs,
        badgeText,
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
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Manifesto Section
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
            placeholder="Teks badge section"
          />
        </div>

        {/* Heading Lines */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Heading Lines
          </label>
          <div className="space-y-2">
            {headingLines.map((line, index) => (
              <Input
                key={index}
                value={line}
                onChange={(e) => updateHeadingLine(index, e.target.value)}
                placeholder={`Baris heading ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Subheading */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Subheading
          </label>
          <Textarea
            value={subheading}
            onChange={(e) => setSubheading(e.target.value)}
            placeholder="Subheading manifesto"
            rows={2}
          />
        </div>

        {/* Manifesto Paragraphs */}
        <div>
          <label className="text-interface mb-2 block text-xs font-medium text-muted-foreground">
            Manifesto Paragraphs
          </label>
          <div className="space-y-3">
            {paragraphs.map((paragraph, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-interface text-xs text-muted-foreground">
                    Paragraf {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeParagraph(index)}
                    className="text-interface text-xs text-destructive hover:underline"
                  >
                    Hapus
                  </button>
                </div>
                <Textarea
                  value={paragraph}
                  onChange={(e) => updateParagraph(index, e.target.value)}
                  placeholder={`Isi paragraf ${index + 1}`}
                  rows={4}
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addParagraph}
            className="mt-3 rounded-action text-xs"
          >
            Tambah Paragraf
          </Button>
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
