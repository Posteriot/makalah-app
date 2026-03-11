"use client"

import { toast } from "sonner"

interface PlaceholderReferenceProps {
  placeholders: { key: string; description: string; example: string }[]
}

export function PlaceholderReference({ placeholders }: PlaceholderReferenceProps) {
  if (!placeholders.length) return null

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`)
    toast.success(`{{${key}}} disalin ke clipboard`)
  }

  return (
    <div className="space-y-2">
      <span className="text-interface text-xs font-medium text-muted-foreground">
        Placeholder Tersedia
      </span>
      <div className="flex flex-wrap gap-1.5">
        {placeholders.map((p) => (
          <button
            key={p.key}
            onClick={() => copyToClipboard(p.key)}
            title={`${p.description} (contoh: ${p.example})`}
            className="text-interface rounded-badge border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-600 hover:bg-sky-500/20 transition-colors cursor-pointer"
          >
            {`{{${p.key}}}`}
          </button>
        ))}
      </div>
    </div>
  )
}
