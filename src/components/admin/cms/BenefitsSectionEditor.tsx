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
import { CmsSaveButton } from "./CmsSaveButton"

type BenefitItem = {
  title: string
  description: string
}

type BenefitsSectionEditorProps = {
  userId: Id<"users">
}

const EMPTY_ITEMS: BenefitItem[] = [
  { title: "", description: "" },
  { title: "", description: "" },
  { title: "", description: "" },
  { title: "", description: "" },
]

export function BenefitsSectionEditor({ userId }: BenefitsSectionEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "home",
    sectionSlug: "benefits",
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const [items, setItems] = useState<BenefitItem[]>(EMPTY_ITEMS)
  const [showGridPattern, setShowGridPattern] = useState(true)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(true)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [isPublished, setIsPublished] = useState(false)

  // Sync form state when section data loads
  useEffect(() => {
    if (section) {
      if (section.items && Array.isArray(section.items)) {
        const loaded = (section.items as Array<{ title?: string; description?: string }>).map((item) => ({
          title: item.title ?? "",
          description: item.description ?? "",
        }))
        setItems(loaded.length > 0 ? loaded : EMPTY_ITEMS)
      }
      setShowGridPattern(section.showGridPattern !== false)
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

  function addItem() {
    setItems((prev) => [...prev, { title: "", description: "" }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    await upsertSection({
      requestorId: userId,
      id: section?._id,
      pageSlug: "home",
      sectionSlug: "benefits",
      sectionType: "benefits",
      items: items.map((item) => ({
        title: item.title,
        description: item.description,
      })),
      showGridPattern,
      showDiagonalStripes,
      showDottedPattern,
      isPublished,
      sortOrder: 2,
    })
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

      {/* ── Cluster 1: Benefit Items ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Benefit Items
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="rounded-action text-xs"
          >
            + Benefit
          </Button>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-action border border-border p-4 space-y-3"
          >
            {/* Card header */}
            <div className="flex items-center justify-between">
              <span className="text-interface text-sm font-medium text-foreground">
                Benefit {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="rounded-action text-xs text-destructive hover:text-destructive"
              >
                Hapus
              </Button>
            </div>

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

      {/* ── Cluster 2: Background Patterns ── */}
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

      {/* ── Cluster 3: Published ── */}
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
