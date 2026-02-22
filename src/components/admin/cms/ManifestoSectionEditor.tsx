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
import { CmsSaveButton } from "./CmsSaveButton"

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
  const [terminalDarkId, setTerminalDarkId] = useState<Id<"_storage"> | null>(null)
  const [terminalLightId, setTerminalLightId] = useState<Id<"_storage"> | null>(null)
  const [showGridPattern, setShowGridPattern] = useState(true)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(true)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [isPublished, setIsPublished] = useState(false)

  // Sync form state when section data loads
  useEffect(() => {
    if (section) {
      setBadgeText(section.badgeText ?? "")
      const lines = (section.headingLines as string[] | undefined) ?? ["", "", ""]
      setHeadingLines([lines[0] ?? "", lines[1] ?? "", lines[2] ?? ""])
      setSubheading(section.subheading ?? "")
      const paras = (section.paragraphs as string[] | undefined) ?? []
      setParagraphs(paras)
      setTerminalDarkId((section.primaryImageId as Id<"_storage"> | undefined) ?? null)
      setTerminalLightId((section.secondaryImageId as Id<"_storage"> | undefined) ?? null)
      setShowGridPattern(section.showGridPattern !== false)
      setShowDiagonalStripes(section.showDiagonalStripes !== false)
      setShowDottedPattern(section.showDottedPattern !== false)
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
      primaryImageId: terminalDarkId ?? undefined,
      secondaryImageId: terminalLightId ?? undefined,
      showGridPattern,
      showDiagonalStripes,
      showDottedPattern,
      isPublished,
      sortOrder: 1,
    })
  }

  // Loading skeleton
  if (section === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
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
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Manifesto Section
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* ── Cluster 1: Text Content ── */}
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
      </div>

      {/* ── Cluster 2: Paragraphs ── */}
      <div className="border-t border-border" />
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

      {/* ── Cluster 3: Terminal Panel Image ── */}
      <div className="border-t border-border" />
      <div className="space-y-3">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Terminal Panel Image
        </span>
        <div className="grid grid-cols-2 gap-4">
          <CmsImageUpload
            currentImageId={terminalDarkId}
            onUpload={(storageId) => setTerminalDarkId(storageId)}
            userId={userId}
            label="Terminal (Dark)"
            aspectRatio="16/9"
            fallbackPreviewUrl="/images/manifesto-terminal-dark.png"
          />
          <CmsImageUpload
            currentImageId={terminalLightId}
            onUpload={(storageId) => setTerminalLightId(storageId)}
            userId={userId}
            label="Terminal (Light)"
            aspectRatio="16/9"
            fallbackPreviewUrl="/images/manifesto-terminal-light.png"
          />
        </div>
        <p className="text-interface text-[10px] text-muted-foreground">
          Optimal: 16:9. Kontainer: max-width 720px, auto height.
        </p>
      </div>

      {/* ── Cluster 4: Background Patterns ── */}
      <div className="border-t border-border" />
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
            Diagonal Stripes
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={showDiagonalStripes} onCheckedChange={setShowDiagonalStripes} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Dotted Pattern
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={showDottedPattern} onCheckedChange={setShowDottedPattern} />
        </div>
      </div>

      {/* ── Cluster 5: Published ── */}
      <div className="border-t border-border" />
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
