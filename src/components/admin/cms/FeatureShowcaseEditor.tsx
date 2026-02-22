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

type FeatureItem = {
  title: string
  description: string
}

type FeatureShowcaseEditorProps = {
  pageSlug: string
  sectionSlug: string
  userId: Id<"users">
}

const SORT_ORDER_MAP: Record<string, number> = {
  "features-workflow": 3,
  "features-refrasa": 4,
}

function getSectionTitle(sectionSlug: string): string {
  if (sectionSlug === "features-workflow") return "Feature Showcase: Workflow"
  if (sectionSlug === "features-refrasa") return "Feature Showcase: Refrasa"
  // Generic fallback: capitalize and replace hyphens
  return sectionSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

const FALLBACK_LIGHT_IMAGE_MAP: Record<string, string> = {
  "features-workflow": "/images/workflow-feature-mock-light.png",
  "features-refrasa": "/images/refrasa-feature-mock-light.png",
}

const FALLBACK_DARK_IMAGE_MAP: Record<string, string> = {
  "features-workflow": "/images/workflow-feature-mock-dark.png",
  "features-refrasa": "/images/refrasa-feature-mock-dark.png",
}

const EMPTY_ITEMS: FeatureItem[] = [
  { title: "", description: "" },
  { title: "", description: "" },
]

export function FeatureShowcaseEditor({
  pageSlug,
  sectionSlug,
  userId,
}: FeatureShowcaseEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug,
    sectionSlug,
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [badgeText, setBadgeText] = useState("")
  const [items, setItems] = useState<FeatureItem[]>(EMPTY_ITEMS)
  const [primaryImageId, setPrimaryImageId] = useState<Id<"_storage"> | null>(
    null
  )
  const [secondaryImageId, setSecondaryImageId] = useState<Id<"_storage"> | null>(
    null
  )
  const [primaryImageAlt, setPrimaryImageAlt] = useState("")
  const [showGridPattern, setShowGridPattern] = useState(true)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(true)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [isPublished, setIsPublished] = useState(false)

  // Sync form state when section data loads
  useEffect(() => {
    if (section) {
      setTitle(section.title ?? "")
      setDescription(section.description ?? "")
      setBadgeText(section.badgeText ?? "")
      setPrimaryImageId(section.primaryImageId ?? null)
      setSecondaryImageId(section.secondaryImageId ?? null)
      setPrimaryImageAlt(section.primaryImageAlt ?? "")
      setShowGridPattern(section.showGridPattern !== false)
      setShowDiagonalStripes(section.showDiagonalStripes !== false)
      setShowDottedPattern(section.showDottedPattern !== false)
      setIsPublished(section.isPublished ?? false)

      if (section.items && Array.isArray(section.items)) {
        const loaded = (
          section.items as Array<{
            title?: string
            description?: string
          }>
        ).map((item) => ({
          title: item.title ?? "",
          description: item.description ?? "",
        }))
        setItems(loaded.length > 0 ? loaded : EMPTY_ITEMS)
      }
    }
  }, [section])

  function updateItem(
    index: number,
    field: keyof FeatureItem,
    value: string
  ) {
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
      pageSlug,
      sectionSlug,
      sectionType: "feature-showcase",
      title,
      description,
      badgeText,
      items: items.map((item) => ({
        title: item.title,
        description: item.description,
        icon: undefined,
      })),
      primaryImageId: primaryImageId ?? undefined,
      secondaryImageId: secondaryImageId ?? undefined,
      primaryImageAlt,
      showGridPattern,
      showDiagonalStripes,
      showDottedPattern,
      isPublished,
      sortOrder: SORT_ORDER_MAP[sectionSlug] ?? 3,
    })
  }

  // Loading skeleton
  if (section === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-action border border-border p-4"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          {getSectionTitle(sectionSlug)}
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* ── Cluster 1: Text Content ── */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul section"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi paragraf section"
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
            placeholder='Label badge, mis. "Workflow" atau "Refrasa"'
          />
        </div>
      </div>

      {/* ── Cluster 2: Items ── */}
      <div className="border-t border-border" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Items
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="rounded-action text-xs"
          >
            + Tambah Item
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
                Item {index + 1}
              </span>
              {items.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="rounded-action text-xs text-destructive hover:text-destructive"
                >
                  Hapus
                </Button>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                value={item.title}
                onChange={(e) => updateItem(index, "title", e.target.value)}
                placeholder="Judul item"
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
                placeholder="Deskripsi item"
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Cluster 3: Section Images ── */}
      <div className="border-t border-border" />
      <div className="space-y-2">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Section Image
        </span>
        <div className="grid grid-cols-2 gap-4">
          <CmsImageUpload
            currentImageId={primaryImageId}
            onUpload={(storageId) => setPrimaryImageId(storageId)}
            userId={userId}
            label="Light Mode"
            aspectRatio="16/9"
            fallbackPreviewUrl={FALLBACK_LIGHT_IMAGE_MAP[sectionSlug]}
          />
          <CmsImageUpload
            currentImageId={secondaryImageId}
            onUpload={(storageId) => setSecondaryImageId(storageId)}
            userId={userId}
            label="Dark Mode"
            aspectRatio="16/9"
            fallbackPreviewUrl={FALLBACK_DARK_IMAGE_MAP[sectionSlug]}
          />
        </div>
        <p className="text-interface text-xs text-muted-foreground">
          Light mode = tampil saat tema terang. Dark mode = tampil saat tema gelap.
        </p>
        <p className="text-interface text-[10px] text-muted-foreground">
          Optimal: 1200 × 1344 px (~9:10). Kontainer: max-width 452px, auto height.
        </p>
      </div>

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

      {/* ── Cluster 4: Background Patterns ── */}
      <div className="border-t border-border" />
      <div className="space-y-2">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Background Patterns
        </span>
        {sectionSlug === "features-workflow" && (
          <div className="flex items-center gap-3">
            <label className="text-interface text-xs font-medium text-muted-foreground">
              Grid Pattern
            </label>
            <Switch className="data-[state=checked]:bg-emerald-600" checked={showGridPattern} onCheckedChange={setShowGridPattern} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Diagonal Stripes
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={showDiagonalStripes} onCheckedChange={setShowDiagonalStripes} />
        </div>
        {(sectionSlug === "features-refrasa" || sectionSlug === "features-workflow") && (
          <div className="flex items-center gap-3">
            <label className="text-interface text-xs font-medium text-muted-foreground">
              Dotted Pattern
            </label>
            <Switch className="data-[state=checked]:bg-emerald-600" checked={showDottedPattern} onCheckedChange={setShowDottedPattern} />
          </div>
        )}
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
