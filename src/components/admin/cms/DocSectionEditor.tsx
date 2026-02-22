"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { DocBlock } from "@/components/marketing/documentation/types"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { NavArrowLeft, Plus, Trash, NavArrowUp, NavArrowDown } from "iconoir-react"
import { SectionBlockEditor } from "./blocks/SectionBlockEditor"
import { InfoCardBlockEditor } from "./blocks/InfoCardBlockEditor"
import { CtaCardsBlockEditor } from "./blocks/CtaCardsBlockEditor"
import { CmsSaveButton } from "./CmsSaveButton"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROUP_OPTIONS = [
  { value: "Mulai", label: "Mulai" },
  { value: "Fitur Utama", label: "Fitur Utama" },
  { value: "Subskripsi", label: "Subskripsi" },
  { value: "Panduan Lanjutan", label: "Panduan Lanjutan" },
]

const ICON_OPTIONS = [
  { value: "", label: "Tanpa ikon" },
  { value: "BookOpen", label: "BookOpen" },
  { value: "FileText", label: "FileText" },
  { value: "Globe", label: "Globe" },
  { value: "Lightbulb", label: "Lightbulb" },
  { value: "Settings", label: "Settings" },
  { value: "ShieldCheck", label: "ShieldCheck" },
  { value: "Users", label: "Users" },
  { value: "Zap", label: "Zap" },
]

const BLOCK_TYPE_OPTIONS = [
  { value: "section", label: "Section" },
  { value: "infoCard", label: "Info Card" },
  { value: "ctaCards", label: "CTA Cards" },
] as const

const BLOCK_TYPE_BADGE_STYLES: Record<string, string> = {
  section: "bg-blue-500/10 text-blue-600",
  infoCard: "bg-sky-500/10 text-sky-600",
  ctaCards: "bg-emerald-500/10 text-emerald-600",
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  section: "Section",
  infoCard: "Info Card",
  ctaCards: "CTA Cards",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
}

function createEmptyBlock(type: "section" | "infoCard" | "ctaCards"): DocBlock {
  if (type === "section") {
    return { type: "section", title: "", richContent: "" }
  }
  if (type === "infoCard") {
    return { type: "infoCard", title: "", items: [""] }
  }
  return {
    type: "ctaCards",
    items: [{ title: "", description: "", targetSection: "", ctaText: "" }],
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocSectionEditorProps = {
  slug: string | null
  userId: Id<"users">
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocSectionEditor({ slug, userId, onBack }: DocSectionEditorProps) {
  const isCreateMode = slug === null

  const existingSection = useQuery(
    api.documentationSections.getSectionBySlug,
    slug !== null ? { requestorId: userId, slug } : "skip"
  )

  const upsertSection = useMutation(api.documentationSections.upsertSection)

  // Form state
  const [title, setTitle] = useState("")
  const [slugValue, setSlugValue] = useState("")
  const [group, setGroup] = useState("Mulai")
  const [order, setOrder] = useState(0)
  const [icon, setIcon] = useState("")
  const [headerIcon, setHeaderIcon] = useState("")
  const [summary, setSummary] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [blocks, setBlocks] = useState<DocBlock[]>([])

  // UI state
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [addBlockType, setAddBlockType] = useState<"section" | "infoCard" | "ctaCards">("section")

  // Populate form when existing section data loads
  useEffect(() => {
    if (existingSection) {
      setTitle(existingSection.title)
      setSlugValue(existingSection.slug)
      setGroup(existingSection.group)
      setOrder(existingSection.order)
      setIcon(existingSection.icon ?? "")
      setHeaderIcon(existingSection.headerIcon ?? "")
      setSummary(existingSection.summary ?? "")
      setIsPublished(existingSection.isPublished)
      setBlocks(existingSection.blocks as DocBlock[])
      setSlugManuallyEdited(true)
    }
  }, [existingSection])

  // Auto-generate slug from title in create mode
  function handleTitleChange(value: string) {
    setTitle(value)
    if (isCreateMode && !slugManuallyEdited) {
      setSlugValue(generateSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugValue(value)
    setSlugManuallyEdited(true)
  }

  // Block operations
  function updateBlock(index: number, updated: DocBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? updated : b)))
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  function moveBlock(index: number, direction: "up" | "down") {
    setBlocks((prev) => {
      const next = [...prev]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const temp = next[targetIndex]
      next[targetIndex] = next[index]
      next[index] = temp
      return next
    })
  }

  function addBlock() {
    setBlocks((prev) => [...prev, createEmptyBlock(addBlockType)])
  }

  // Save handler
  async function handleSave() {
    await upsertSection({
      requestorId: userId,
      id: existingSection?._id as Id<"documentationSections"> | undefined,
      slug: slugValue,
      title,
      group,
      order,
      icon: icon || undefined,
      headerIcon: headerIcon || undefined,
      summary: summary || undefined,
      blocks,
      isPublished,
    })
  }

  // Loading skeleton for edit mode
  if (!isCreateMode && existingSection === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-interface text-xs text-muted-foreground hover:text-foreground"
      >
        <NavArrowLeft width={16} height={16} />
        Kembali ke Daftar
      </button>

      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          {isCreateMode ? "Buat Section Baru" : "Edit Section"}
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Metadata fields */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Judul section"
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Slug
          </label>
          <input
            type="text"
            value={slugValue}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="url-slug"
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        {/* Group */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Group
          </label>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Order */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Order
          </label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-interface text-sm text-foreground"
          />
        </div>

        {/* Icon */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Icon
          </label>
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Header Icon */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Header Icon
          </label>
          <select
            value={headerIcon}
            onChange={(e) => setHeaderIcon(e.target.value)}
            className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div>
          <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Summary (TL;DR)
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Ringkasan singkat section (opsional)"
            rows={3}
            className="w-full resize-none rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        {/* Published toggle */}
        <div className="flex items-center gap-3">
          <label className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Published
          </label>
          <Switch className="data-[state=checked]:bg-emerald-600" checked={isPublished} onCheckedChange={setIsPublished} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Blocks editor */}
      <div className="space-y-4">
        <h4 className="text-narrative text-base font-medium tracking-tight text-foreground">
          Blok Konten
        </h4>

        {blocks.map((block, index) => (
          <div
            key={index}
            className="rounded-action border border-border p-4 space-y-3"
          >
            {/* Block header: type badge + controls */}
            <div className="flex items-center justify-between">
              <span
                className={`rounded-badge px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${BLOCK_TYPE_BADGE_STYLES[block.type] ?? ""}`}
              >
                {BLOCK_TYPE_LABELS[block.type] ?? block.type}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveBlock(index, "up")}
                  disabled={index === 0}
                  className="rounded-action border border-border p-1.5 text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Pindah ke atas"
                >
                  <NavArrowUp width={14} height={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, "down")}
                  disabled={index === blocks.length - 1}
                  className="rounded-action border border-border p-1.5 text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Pindah ke bawah"
                >
                  <NavArrowDown width={14} height={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(index)}
                  className="rounded-action border border-border p-1.5 text-destructive hover:bg-destructive/10"
                  aria-label="Hapus blok"
                >
                  <Trash width={14} height={14} />
                </button>
              </div>
            </div>

            {/* Sub-editor */}
            {block.type === "section" && (
              <SectionBlockEditor
                block={block}
                onChange={(b) => updateBlock(index, b)}
                userId={userId}
              />
            )}
            {block.type === "infoCard" && (
              <InfoCardBlockEditor
                block={block}
                onChange={(b) => updateBlock(index, b)}
              />
            )}
            {block.type === "ctaCards" && (
              <CtaCardsBlockEditor
                block={block}
                onChange={(b) => updateBlock(index, b)}
              />
            )}
          </div>
        ))}

        {/* Add block controls */}
        <div className="flex items-center gap-2">
          <select
            value={addBlockType}
            onChange={(e) =>
              setAddBlockType(e.target.value as "section" | "infoCard" | "ctaCards")
            }
            className="rounded-action border border-border bg-background px-3 py-1.5 text-xs text-foreground"
          >
            {BLOCK_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addBlock}
            className="flex items-center gap-1 rounded-action border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            <Plus width={14} height={14} />
            Tambah Blok
          </button>
        </div>
      </div>
      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}
