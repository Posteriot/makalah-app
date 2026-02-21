"use client"

import { Plus, Trash } from "iconoir-react"

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

type CtaCardItem = {
  title: string
  description: string
  targetSection: string
  ctaText: string
  icon?: string
}

type CtaCardsBlock = {
  type: "ctaCards"
  items: CtaCardItem[]
}

type Props = {
  block: CtaCardsBlock
  onChange: (block: CtaCardsBlock) => void
}

export function CtaCardsBlockEditor({ block, onChange }: Props) {
  function updateItem(index: number, field: keyof CtaCardItem, value: string) {
    const next = block.items.map((item, i) => {
      if (i !== index) return item
      if (field === "icon") {
        return { ...item, icon: value || undefined }
      }
      return { ...item, [field]: value }
    })
    onChange({ ...block, items: next })
  }

  function addCard() {
    const empty: CtaCardItem = {
      title: "",
      description: "",
      targetSection: "",
      ctaText: "",
    }
    onChange({ ...block, items: [...block.items, empty] })
  }

  function removeCard(index: number) {
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-4">
      {block.items.map((item, index) => (
        <div
          key={index}
          className="rounded-action border border-border p-3 space-y-3"
        >
          {/* Card header with remove */}
          <div className="flex items-center justify-between">
            <span className="text-interface text-sm font-medium text-foreground">
              Card {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeCard(index)}
              className="rounded-action border border-border p-1.5 text-destructive hover:bg-destructive/10"
              aria-label={`Hapus card ${index + 1}`}
            >
              <Trash width={14} height={14} />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Title
            </label>
            <input
              type="text"
              value={item.title}
              onChange={(e) => updateItem(index, "title", e.target.value)}
              placeholder="Judul card"
              className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Description
            </label>
            <textarea
              value={item.description}
              onChange={(e) => updateItem(index, "description", e.target.value)}
              placeholder="Deskripsi card"
              rows={2}
              className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground resize-none"
            />
          </div>

          {/* Target Section */}
          <div>
            <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Target Section (slug)
            </label>
            <input
              type="text"
              value={item.targetSection}
              onChange={(e) => updateItem(index, "targetSection", e.target.value)}
              placeholder="contoh: getting-started"
              className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* CTA Text */}
          <div>
            <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              CTA Text
            </label>
            <input
              type="text"
              value={item.ctaText}
              onChange={(e) => updateItem(index, "ctaText", e.target.value)}
              placeholder="Teks tombol CTA"
              className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Icon
            </label>
            <select
              value={item.icon ?? ""}
              onChange={(e) => updateItem(index, "icon", e.target.value)}
              className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addCard}
        className="flex items-center gap-1 rounded-action border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
      >
        <Plus width={14} height={14} />
        Tambah Card
      </button>
    </div>
  )
}
