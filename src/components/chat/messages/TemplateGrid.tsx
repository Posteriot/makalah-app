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
    label: "Mari berdiskusi terlebih dahulu.",
    message: "Mari berdiskusi terlebih dahulu.",
  },
  {
    id: "starter-paper",
    label: "Mari berkolaborasi menyusun paper akademik.",
    message: "Mari berkolaborasi menyusun paper akademik.",
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
      <div className="mx-auto w-20 h-20 flex items-center justify-center">
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
        <h2 className="text-narrative text-4xl font-medium tracking-tight text-[var(--chat-foreground)]">
          Mari berdiskusi!
        </h2>
        <p className="text-narrative text-[var(--chat-muted-foreground)] text-sm leading-[1.4]">
          <span className="block">
            Ingin berdiskusi mengenai riset atau langsung menulis paper?
          </span>
          <span className="block">
            Silakan ketik maksud di kolom percakapan,
          </span>
          <span className="block">
            atau buka riwayat percakapan terdahulu di{" "}
            <button
              type="button"
              onClick={onSidebarLinkClick}
              className="underline underline-offset-4 decoration-[var(--chat-primary)] hover:decoration-[var(--chat-primary)] text-[var(--chat-foreground)] transition-colors"
            >
              sidebar
            </button>
          </span>
        </p>
      </div>

      <div className="pt-2">
        <p className="text-narrative text-sm font-medium text-[var(--chat-muted-foreground)] mb-3">
          Atau gunakan template berikut:
        </p>
        <div className="flex flex-col items-center gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onTemplateSelect(template)}
              disabled={disabled}
              className="w-fit max-w-full rounded-shell border-hairline bg-[var(--chat-secondary)] px-5 py-2.5 text-center text-interface text-sm text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
