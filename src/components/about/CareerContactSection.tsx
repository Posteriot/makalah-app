"use client"

import { SectionBadge } from "@/components/ui/section-badge"
import { DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"
import { AccordionAbout } from "./AccordionAbout"
import {
  CAREER_CONTACT_ITEMS,
  type ContactContent,
} from "./data"
import { getIcon } from "./icons"
import { cn } from "@/lib/utils"

// Type guard for ContactContent
function isContactContent(
  content: string | ContactContent
): content is ContactContent {
  return typeof content === "object" && "company" in content
}

// Render content based on type
function renderContent(content: string | ContactContent) {
  if (isContactContent(content)) {
    return (
      <div className="space-y-2">
        <p className="text-interface font-bold text-foreground">{content.company}</p>
        <div className="text-narrative text-sm text-muted-foreground">
          {content.address.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
        <p>
          <a
            href={`mailto:${content.email}`}
            className="text-interface text-sm text-[color:var(--slate-700)] dark:text-[color:var(--slate-50)] hover:underline"
          >
            {content.email}
          </a>
        </p>
      </div>
    )
  }
  return <p className="text-narrative text-sm text-muted-foreground">{content}</p>
}

export function CareerContactSection() {
  // Transform items for accordion (mobile)
  const accordionItems = CAREER_CONTACT_ITEMS.map((item) => ({
    id: item.id,
    title: item.title,
    content: renderContent(item.content),
    anchorId: item.anchorId,
  }))

  return (
    <section
      className="relative isolate overflow-hidden bg-[color:var(--section-bg-alt)]"
      id="karier-kontak"
    >
      {/* Background patterns */}
      <DiagonalStripes className="opacity-40" />
      <DottedPattern spacing={24} withRadialMask={true} />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-comfort md:grid-cols-16">
          {/* Section Header */}
          <div className="col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-12 md:gap-4">
            <SectionBadge>Karier & Kontak</SectionBadge>
            <h2 className="text-narrative text-3xl font-medium leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
              <span className="md:hidden">
                Bergabung atau
                <br />
                hubungi kami
              </span>
              <span className="hidden md:inline">Bergabung atau Hubungi Kami</span>
            </h2>
          </div>

          {/* Mobile: Accordion */}
          <div className="col-span-1 md:hidden">
            <AccordionAbout
              items={accordionItems}
              titleClassName="text-interface font-mono text-base font-medium leading-snug text-foreground tracking-normal"
              contentClassName="!px-4 !pb-4 text-base leading-relaxed text-[color:var(--slate-600)] dark:text-[color:var(--slate-50)]"
              chevronClassName="text-muted-foreground"
            />
          </div>

          {/* Desktop: 16-col bento mapping (8/8) */}
          <div className="hidden md:col-span-12 md:col-start-3 md:grid grid-cols-16 gap-comfort">
            {CAREER_CONTACT_ITEMS.map((item) => {
              const Icon = getIcon(item.iconName)
              return (
                <div
                  key={item.id}
                  id={item.anchorId}
                  data-anchor-id={item.anchorId}
                  className={cn(
                    "group relative col-span-8 flex h-full min-h-[180px] flex-col overflow-hidden rounded-shell border-hairline bg-transparent p-airy",
                    "transition-colors duration-200",
                    "hover:bg-slate-50 dark:hover:bg-slate-900"
                  )}
                >
                  {/* Icon + Title row */}
                  <div className="mb-4 flex items-start gap-4">
                    {Icon && (
                      <div className="rounded-action flex h-10 w-10 shrink-0 items-center justify-center bg-[color:var(--slate-600)] dark:bg-[color:var(--slate-700)]">
                        <Icon className="h-5 w-5 text-slate-50" />
                      </div>
                    )}
                    <h3 className="text-narrative pt-2 text-lg font-medium leading-tight text-foreground">
                      {item.title}
                    </h3>
                  </div>

                  <div className="mb-4 border-t border-hairline" />

                  {/* Content */}
                  <div className="flex-1">
                    {renderContent(item.content)}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
