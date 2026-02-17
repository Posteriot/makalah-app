"use client"

import Image from "next/image"

export interface Template {
  id: string
  label: string
  message: string
}

const templates: Template[] = [
  {
    id: "starter-discussion",
    label: "Kita diskusi dulu!",
    message: "Kita diskusi dulu!",
  },
  {
    id: "starter-paper",
    label: "Ayo kolaborasi menyusun paper akademik!",
    message: "Ayo kolaborasi menyusun paper akademik!",
  },
]

interface TemplateGridProps {
  onTemplateSelect: (template: Template) => void
  onSidebarLinkClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
}

export function TemplateGrid({
  onTemplateSelect,
  onSidebarLinkClick,
  disabled = false,
}: TemplateGridProps) {
  return (
    <div className="max-w-2xl text-center space-y-6">
      <div className="mx-auto w-20 h-20 rounded-shell bg-card border border-border/60 flex items-center justify-center">
        <Image
          src="/logo/makalah_logo_dark.svg"
          alt="Makalah Logo"
          width={40}
          height={40}
          className="block dark:hidden"
          priority
        />
        <Image
          src="/logo/makalah_logo_light.svg"
          alt="Makalah Logo"
          width={40}
          height={40}
          className="hidden dark:block"
          priority
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-narrative text-4xl font-medium tracking-tight text-foreground">
          Ayo bercakap!
        </h2>
        <p className="text-narrative text-muted-foreground text-sm leading-[1.4]">
          <span className="block">
            Mau diskusi mengenai riset atau langsung menulis paper?
          </span>
          <span className="block">
            Silakan ketik maksud di kolom percakapan,
          </span>
          <span className="block">
            atau buka riwayat percakapan terdahulu di{" "}
            <button
              type="button"
              onClick={onSidebarLinkClick}
              className="underline underline-offset-4 decoration-primary/60 hover:decoration-primary text-foreground transition-colors"
            >
              sidebar
            </button>
          </span>
        </p>
      </div>

      <div className="pt-2">
        <p className="text-narrative text-sm font-medium text-muted-foreground mb-3">
          Atau gunakan template berikut:
        </p>
        <div className="flex flex-col items-center gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onTemplateSelect(template)}
              disabled={disabled}
              className="w-fit max-w-full rounded-shell border-hairline bg-slate-200 dark:bg-card/90 px-5 py-2.5 text-center text-interface text-sm text-foreground hover:bg-slate-300 dark:hover:bg-card transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
