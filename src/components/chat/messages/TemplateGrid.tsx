"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"

export interface Template {
  id: string
  label: string
  chipLabel: string
  message: string
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "starter-discussion",
    label: "Mari berdiskusi terlebih dahulu.",
    chipLabel: "Diskusi riset",
    message: "Mari berdiskusi terlebih dahulu.",
  },
  {
    id: "starter-paper",
    label: "Mari berkolaborasi menyusun paper akademik.",
    chipLabel: "Paper akademik",
    message: "Mari berkolaborasi menyusun paper akademik.",
  },
  {
    id: "starter-refrasa",
    label: "Tolong bantu saya memperbaiki gaya penulisan teks ini.",
    chipLabel: "Refrasa",
    message: "Tolong bantu saya memperbaiki gaya penulisan teks ini.",
  },
]

const DEFAULT_HEADING = "Mari berdiskusi!"
const DEFAULT_DESCRIPTION_LINES = [
  "Ingin berdiskusi mengenai riset atau langsung menulis paper?",
  "Silakan ketik maksud di kolom percakapan,",
  "atau buka riwayat percakapan terdahulu di",
]
const DEFAULT_TEMPLATE_LABEL = "Atau gunakan template berikut:"
const DEFAULT_LIGHT_MODE_LOGO_SRC = "/logo/makalah_logo_dark.svg"
const DEFAULT_DARK_MODE_LOGO_SRC = "/logo/makalah_logo_light.svg"
const DEFAULT_SIDEBAR_LINK_LABEL = "sidebar"

interface TemplateGridProps {
  onTemplateSelect: (template: Template) => void
  onSidebarLinkClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  strictCmsMode?: boolean
  variant?: "default" | "mobile-chips"
}

export function TemplateGrid({
  onTemplateSelect,
  onSidebarLinkClick,
  disabled = false,
  strictCmsMode = false,
  variant = "default",
}: TemplateGridProps) {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "chat",
    sectionSlug: "chat-empty-state",
  })

  const isCmsPublished = section?.isPublished === true

  const lightModeLogoUrl = useQuery(
    api.pageContent.getImageUrl,
    isCmsPublished && section?.primaryImageId
      ? { storageId: section.primaryImageId }
      : "skip"
  )
  const darkModeLogoUrl = useQuery(
    api.pageContent.getImageUrl,
    isCmsPublished && section?.secondaryImageId
      ? { storageId: section.secondaryImageId }
      : "skip"
  )

  const strictEnabled = strictCmsMode
  const strictPublished = strictEnabled && isCmsPublished

  const heading = strictEnabled
    ? (strictPublished ? (section?.title?.trim() ?? "") : "")
    : isCmsPublished && section?.title?.trim()
      ? section.title.trim()
      : DEFAULT_HEADING

  const descriptionLines = strictEnabled
    ? (strictPublished ? (section?.paragraphs ?? []) : [])
    : isCmsPublished && section?.paragraphs && section.paragraphs.length > 0
      ? section.paragraphs
      : DEFAULT_DESCRIPTION_LINES

  const templateLabel = strictEnabled
    ? (strictPublished ? (section?.subtitle?.trim() ?? "") : "")
    : isCmsPublished && section?.subtitle?.trim()
      ? section.subtitle.trim()
      : DEFAULT_TEMPLATE_LABEL

  const sidebarLinkLabel = strictEnabled
    ? (strictPublished ? (section?.ctaText?.trim() ?? "") : "")
    : isCmsPublished && section?.ctaText?.trim()
      ? section.ctaText.trim()
      : DEFAULT_SIDEBAR_LINK_LABEL

  const mappedCmsTemplates = section?.items
    ?.map((item, index) => {
      const text = (item.title || item.description || "").trim()
      if (!text) return null
      return {
        id: `cms-template-${index + 1}`,
        label: text,
        message: text,
      } satisfies Template
    })
    .filter((item): item is Template => item !== null) ?? []

  const templates = strictEnabled
    ? (strictPublished ? mappedCmsTemplates : [])
    : isCmsPublished && mappedCmsTemplates.length > 0
      ? mappedCmsTemplates
      : DEFAULT_TEMPLATES

  const safeDescriptionLines = strictEnabled
    ? descriptionLines
    : descriptionLines.length > 0
      ? descriptionLines
      : DEFAULT_DESCRIPTION_LINES
  const linesBeforeSidebar = safeDescriptionLines.slice(0, -1)
  const sidebarLinePrefix = strictEnabled
    ? (safeDescriptionLines.at(-1) ?? "")
    : (safeDescriptionLines.at(-1) ?? DEFAULT_DESCRIPTION_LINES[2])

  const lightModeLogoSrc = strictEnabled
    ? (strictPublished ? lightModeLogoUrl ?? darkModeLogoUrl : null)
    : lightModeLogoUrl ?? DEFAULT_LIGHT_MODE_LOGO_SRC
  const darkModeLogoSrc = strictEnabled
    ? (strictPublished ? darkModeLogoUrl ?? lightModeLogoUrl : null)
    : darkModeLogoUrl ?? DEFAULT_DARK_MODE_LOGO_SRC

  if (variant === "mobile-chips") {
    return (
      <div className="flex flex-wrap gap-2.5 justify-center">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateSelect(template)}
            disabled={disabled}
            className="px-4 py-2 rounded-action text-xs font-mono
              border border-[color:var(--chat-border)]
              bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)]
              active:bg-[var(--chat-accent)] disabled:opacity-50
              transition-colors duration-50"
          >
            {template.chipLabel}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl text-center">
      <div className="mx-auto flex w-fit items-center justify-center">
        {lightModeLogoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lightModeLogoSrc}
            alt="Makalah Logo"
            width={40}
            height={40}
            className="block h-10 w-10 dark:hidden md:h-20 md:w-20"
          />
        ) : null}
        {darkModeLogoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={darkModeLogoSrc}
            alt="Makalah Logo"
            width={40}
            height={40}
            className="hidden h-10 w-10 dark:block md:h-20 md:w-20"
          />
        ) : null}
      </div>

      <div className="mt-2 space-y-2">
        {heading ? (
          <h2 className="text-narrative text-4xl font-medium tracking-tight text-[var(--chat-foreground)]">
            {heading}
          </h2>
        ) : null}
        {safeDescriptionLines.length > 0 || sidebarLinkLabel ? (
          <p className="text-narrative text-[var(--chat-muted-foreground)] text-sm leading-[1.4]">
            {linesBeforeSidebar.map((line, index) => (
              <span key={`desc-line-${index + 1}`} className="block">
                {line}
              </span>
            ))}
            <span className="block">
              {sidebarLinePrefix}
              {sidebarLinkLabel ? (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={onSidebarLinkClick}
                    className="cursor-pointer text-slate-500 underline underline-offset-4 decoration-slate-500 transition-colors hover:text-sky-500 hover:decoration-sky-500 dark:text-slate-400 dark:decoration-slate-400 dark:hover:text-sky-400 dark:hover:decoration-sky-400"
                  >
                    {sidebarLinkLabel}
                  </button>
                </>
              ) : null}
            </span>
          </p>
        ) : null}
      </div>

      <div className="pt-2">
        {templateLabel ? (
          <p className="text-narrative text-sm font-medium text-[var(--chat-muted-foreground)] mb-3">
            {templateLabel}
          </p>
        ) : null}
        <div className="flex flex-col items-center gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onTemplateSelect(template)}
              disabled={disabled}
              className="w-fit max-w-full cursor-pointer rounded-shell border-hairline bg-[var(--chat-secondary)] px-5 py-2.5 text-center text-interface text-sm text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
