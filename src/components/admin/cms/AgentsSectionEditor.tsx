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

type AgentItem = {
  title: string
  description: string
  icon: string
}

type AgentsSectionEditorProps = {
  userId: Id<"users">
}

export function AgentsSectionEditor({ userId }: AgentsSectionEditorProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "about",
    sectionSlug: "agents",
  })

  const upsertSection = useMutation(api.pageContent.upsertSection)

  const [badgeText, setBadgeText] = useState("")
  const [title, setTitle] = useState("")
  const [items, setItems] = useState<AgentItem[]>([])
  const [showGridPattern, setShowGridPattern] = useState(true)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(true)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [isPublished, setIsPublished] = useState(false)

  // Sync form state when section data loads
  useEffect(() => {
    if (section) {
      setBadgeText(section.badgeText ?? "")
      setTitle(section.title ?? "")
      if (section.items && Array.isArray(section.items)) {
        const loaded = (section.items as Array<{ title?: string; description?: string; icon?: string }>).map((item) => ({
          title: item.title ?? "",
          description: item.description ?? "",
          icon: item.icon ?? "available",
        }))
        setItems(loaded)
      }
      setShowGridPattern(section.showGridPattern !== false)
      setShowDiagonalStripes(section.showDiagonalStripes !== false)
      setShowDottedPattern(section.showDottedPattern !== false)
      setIsPublished(section.isPublished ?? false)
    }
  }, [section])

  function updateItem(index: number, field: keyof AgentItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  function addItem() {
    setItems((prev) => [...prev, { title: "", description: "", icon: "available" }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    await upsertSection({
      requestorId: userId,
      id: section?._id,
      pageSlug: "about",
      sectionSlug: "agents",
      sectionType: "agents",
      title,
      badgeText,
      items: items.map((item) => ({
        title: item.title,
        description: item.description,
        icon: item.icon,
      })),
      showGridPattern,
      showDiagonalStripes,
      showDottedPattern,
      isPublished,
      sortOrder: 3,
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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-action border border-border p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-9 w-full" />
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
          Agents Section
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
      </div>

      {/* ── Cluster 2: Agent Items ── */}
      <div className="border-t border-border" />
      <div>
        <label className="text-interface mb-2 block text-xs font-medium text-muted-foreground">
          Agents
        </label>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-action border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-interface text-sm font-medium text-foreground">
                  Agent {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-interface text-xs text-destructive hover:underline"
                >
                  Hapus
                </button>
              </div>

              {/* Nama Agent */}
              <div>
                <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                  Nama Agent
                </label>
                <Input
                  value={item.title}
                  onChange={(e) => updateItem(index, "title", e.target.value)}
                  placeholder="Nama agent"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                  Deskripsi
                </label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="Deskripsi agent"
                  rows={3}
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <select
                  value={item.icon}
                  onChange={(e) => updateItem(index, "icon", e.target.value)}
                  className="text-interface h-9 w-full rounded-action border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="available">Available</option>
                  <option value="in-progress">In Progress</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          className="mt-3 rounded-action text-xs"
        >
          Tambah Agent
        </Button>
      </div>

      {/* ── Cluster 3: Background Patterns ── */}
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

      {/* ── Cluster 4: Published ── */}
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
