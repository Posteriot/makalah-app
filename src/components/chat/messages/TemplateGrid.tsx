"use client"

import { FileTextIcon, MessageCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type TemplateType = "paper" | "dialog"

export interface Template {
  id: string
  type: TemplateType
  badge: string
  title: string
  description: string
  message: string
}

/**
 * Template data sesuai mockup
 * - 2 Paper templates (teal/primary color)
 * - 2 Dialog templates (blue/info color)
 */
const templates: Template[] = [
  {
    id: "dampak-ai-pendidikan",
    type: "paper",
    badge: "PAPER",
    title: "Dampak AI dalam Pendidikan",
    description: "Bantu saya menulis paper tentang dampak AI dalam pendidikan tinggi",
    message: "Bantu saya menulis paper tentang dampak AI dalam pendidikan tinggi",
  },
  {
    id: "ml-prediksi",
    type: "paper",
    badge: "PAPER",
    title: "Machine Learning untuk Prediksi",
    description: "Paper akademik tentang implementasi ML untuk prediksi cuaca",
    message: "Saya ingin membuat paper akademik tentang implementasi machine learning untuk prediksi cuaca",
  },
  {
    id: "metodologi-penelitian",
    type: "dialog",
    badge: "DIALOG",
    title: "Metodologi Penelitian",
    description: "Jelaskan perbedaan metodologi kualitatif dan kuantitatif",
    message: "Jelaskan perbedaan antara metodologi penelitian kualitatif dan kuantitatif",
  },
  {
    id: "thesis-disertasi-skripsi",
    type: "dialog",
    badge: "DIALOG",
    title: "Thesis vs Disertasi vs Skripsi",
    description: "Perbedaan thesis, disertasi, dan skripsi dalam konteks akademik",
    message: "Apa perbedaan antara thesis, disertasi, dan skripsi dalam konteks akademik Indonesia?",
  },
]

interface TemplateGridProps {
  onTemplateSelect: (template: Template) => void
}

/**
 * TemplateGrid - Empty state dengan template cards
 *
 * Mockup compliance:
 * - Header: 24px title, 32px margin-bottom
 * - Grid: 2 columns, 16px gap, max-width 640px
 * - Cards: 16px padding, 14px gap, 10px radius
 * - Badges: PAPER (teal), DIALOG (blue)
 * - Icons: Paper=teal, Dialog=blue
 */
export function TemplateGrid({ onTemplateSelect }: TemplateGridProps) {
  return (
    <div className="w-full max-w-[640px] mx-auto px-4">
      {/* Header - mockup: 24px title, 32px margin-bottom */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Mulai Interaksi Baru
        </h2>
        <p className="text-sm text-muted-foreground">
          Pilih template di bawah atau ketik pesan langsung
        </p>
      </div>

      {/* Template Grid: 2 columns, 16px gap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={onTemplateSelect}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * TemplateCard - Individual template card component
 */
function TemplateCard({
  template,
  onSelect,
}: {
  template: Template
  onSelect: (template: Template) => void
}) {
  const isPaper = template.type === "paper"

  return (
    <button
      onClick={() => onSelect(template)}
      className={cn(
        "flex items-start gap-3.5 p-4 text-left",
        "rounded-[10px] border border-border bg-card",
        "hover:bg-accent hover:border-primary",
        "transition-all duration-150"
      )}
    >
      {/* Icon - 40x40px, different colors for paper/dialog */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-[10px]",
          "flex items-center justify-center",
          isPaper
            ? "bg-primary/15 text-primary"
            : "bg-info/15 text-info"
        )}
      >
        {isPaper ? (
          <FileTextIcon className="h-5 w-5" />
        ) : (
          <MessageCircleIcon className="h-5 w-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Badge - PAPER (teal) or DIALOG (blue) */}
        <span
          className={cn(
            "inline-block px-2 py-0.5 rounded",
            "text-[11px] font-semibold uppercase tracking-wide",
            "mb-1.5",
            isPaper
              ? "bg-primary/15 text-primary"
              : "bg-info/15 text-info"
          )}
        >
          {template.badge}
        </span>

        {/* Title */}
        <h3 className="font-medium text-sm text-foreground mb-1">
          {template.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {template.description}
        </p>
      </div>
    </button>
  )
}
