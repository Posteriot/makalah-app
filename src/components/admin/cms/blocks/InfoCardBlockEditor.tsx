"use client"

import { Plus, Trash } from "iconoir-react"

type InfoCardBlock = {
  type: "infoCard"
  title: string
  description?: string
  items: string[]
}

type Props = {
  block: InfoCardBlock
  onChange: (block: InfoCardBlock) => void
}

export function InfoCardBlockEditor({ block, onChange }: Props) {
  function updateField<K extends keyof InfoCardBlock>(field: K, value: InfoCardBlock[K]) {
    onChange({ ...block, [field]: value })
  }

  function updateItem(index: number, value: string) {
    const next = [...block.items]
    next[index] = value
    updateField("items", next)
  }

  function addItem() {
    updateField("items", [...block.items, ""])
  }

  function removeItem(index: number) {
    updateField("items", block.items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Title
        </label>
        <input
          type="text"
          value={block.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Judul info card"
          className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Description (opsional)
        </label>
        <input
          type="text"
          value={block.description ?? ""}
          onChange={(e) => updateField("description", e.target.value || undefined)}
          placeholder="Deskripsi singkat"
          className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      {/* Items */}
      <div>
        <label className="text-signal mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Items
        </label>
        <div className="space-y-2">
          {block.items.map((item, index) => (
            <div key={index} className="flex items-center gap-dense">
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={`Item ${index + 1}`}
                className="flex-1 rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded-action border border-border p-2 text-destructive hover:bg-destructive/10"
                aria-label={`Hapus item ${index + 1}`}
              >
                <Trash width={16} height={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 flex items-center gap-1 rounded-action border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          <Plus width={14} height={14} />
          Tambah Item
        </button>
      </div>
    </div>
  )
}
