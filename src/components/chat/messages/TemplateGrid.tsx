"use client"

import { FileTextIcon, BookOpenIcon, SearchIcon, QuoteIcon } from "lucide-react"

export interface Template {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  message: string
}

const templates: Template[] = [
  {
    id: "start-paper",
    title: "Mulai Paper Baru",
    description: "Mulai menulis paper akademik dengan panduan AI",
    icon: <FileTextIcon className="h-5 w-5" />,
    message: "Saya ingin menulis paper akademik",
  },
  {
    id: "apa-format",
    title: "Tanya tentang Format APA",
    description: "Pelajari cara format sitasi dan referensi APA",
    icon: <BookOpenIcon className="h-5 w-5" />,
    message: "Bagaimana cara format sitasi dan referensi menggunakan APA style?",
  },
  {
    id: "explore-topic",
    title: "Eksplorasi Topik Riset",
    description: "Temukan dan eksplorasi topik riset yang menarik",
    icon: <SearchIcon className="h-5 w-5" />,
    message: "Bantu saya menemukan topik riset yang menarik untuk paper saya",
  },
  {
    id: "citation-guide",
    title: "Panduan Sitasi",
    description: "Pelajari cara mengutip sumber dengan benar",
    icon: <QuoteIcon className="h-5 w-5" />,
    message: "Bagaimana cara mengutip sumber dengan benar dalam paper akademik?",
  },
]

interface TemplateGridProps {
  onTemplateSelect: (template: Template) => void
}

export function TemplateGrid({ onTemplateSelect }: TemplateGridProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Mulai percakapan baru
        </h2>
        <p className="text-sm text-muted-foreground">
          Pilih template di bawah atau ketik pesan langsung
        </p>
      </div>

      {/* Template Grid: 2 columns desktop, 1 column mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateSelect(template)}
            className="flex items-start gap-4 p-4 text-left rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all duration-150 group"
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {template.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground mb-1">
                {template.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
