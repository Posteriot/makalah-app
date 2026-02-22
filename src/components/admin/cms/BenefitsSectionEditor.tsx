"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

type BenefitItem = {
  title: string
  description: string
  icon: string
}

type BenefitsSectionEditorProps = {
  userId: Id<"users">
}

const EMPTY_ITEMS: BenefitItem[] = [
  { title: "", description: "", icon: "" },
  { title: "", description: "", icon: "" },
  { title: "", description: "", icon: "" },
  { title: "", description: "", icon: "" },
]

export function BenefitsSectionEditor({ userId }: BenefitsSectionEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "benefits",
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const [items, setItems] = useState<BenefitItem[]>(EMPTY_ITEMS)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(true)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [isPublished, setIsPublished] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Simpan")

  // Sync form state when section data loads
  useEffect(() => {
    if (section) {
      if (section.items && Array.isArray(section.items)) {
        const loaded = (section.items as Array<{ title?: string; description?: string; icon?: string }>).map((item) => ({
          title: item.title ?? "",
          description: item.description ?? "",
          icon: item.icon ?? "",
        }))
        // Pad to 4 items if fewer
        while (loaded.length < 4) {
          loaded.push({ title: "", description: "", icon: "" })
        }
        setItems(loaded.slice(0, 4))
      }
      setShowDiagonalStripes(section.showDiagonalStripes !== false)
      setShowDottedPattern(section.showDottedPattern !== false)
      setIsPublished(section.isPublished ?? false)
    }
  }, [section])

  function updateItem(index: number, field: keyof BenefitItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await upsertSection({
        requestorId: userId,
        id: section?._id,
        pageSlug: "home",
        sectionSlug: "benefits",
        sectionType: "benefits",
        items: items.map((item) => ({
          title: item.title,
          description: item.description,
          icon: item.icon || undefined,
        })),
        showDiagonalStripes,
        showDottedPattern,
        isPublished,
        sortOrder: 2,
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
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-px w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-action border border-border p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Benefits Section
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Benefit item cards */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-action border border-border p-4 space-y-3"
          >
            {/* Card header */}
            <span className="text-interface text-sm font-medium text-foreground">
              Benefit {index + 1}
            </span>

            {/* Title */}
            <div>
              <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                value={item.title}
                onChange={(e) => updateItem(index, "title", e.target.value)}
                placeholder="Judul benefit"
              />
            </div>

            {/* Icon Name */}
            <div>
              <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                Icon Name
              </label>
              <Input
                value={item.icon}
                onChange={(e) => updateItem(index, "icon", e.target.value)}
                placeholder='Nama icon Iconoir, mis. "BookStack"'
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                value={item.description}
                onChange={(e) =>
                  updateItem(index, "description", e.target.value)
                }
                placeholder="Deskripsi benefit"
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Background Pattern toggles */}
      <div className="space-y-2">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Background Patterns
        </span>
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

      {/* Published toggle */}
      <div className="flex items-center gap-3">
        <label className="text-interface text-xs font-medium text-muted-foreground">
          Published
        </label>
        <Switch className="data-[state=checked]:bg-emerald-600" checked={isPublished} onCheckedChange={setIsPublished} />
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
