"use client"

import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"
import { AccordionAbout } from "./AccordionAbout"
import {
  CAREER_CONTACT_ITEMS,
  HERO_CONTENT,
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
        <p className="font-mono font-medium text-foreground">{content.company}</p>
        <div className="font-mono text-sm text-muted-foreground">
          {content.address.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
        <p>
          <a
            href={`mailto:${content.email}`}
            className="font-mono text-sm text-brand hover:underline"
          >
            {content.email}
          </a>
        </p>
      </div>
    )
  }
  return <p className="font-mono text-sm text-muted-foreground">{content}</p>
}

export function CareerContactSection() {
  // Transform items for accordion (mobile)
  const accordionItems = CAREER_CONTACT_ITEMS.map((item) => {
    const Icon = getIcon(item.iconName)
    return {
      id: item.id,
      icon: Icon ? <Icon className="h-4 w-4" /> : undefined,
      title: item.title,
      content: renderContent(item.content),
      anchorId: item.anchorId,
    }
  })

  return (
    <section
      className="relative px-4 md:px-6 py-16 md:py-24 overflow-hidden bg-muted/30 dark:bg-black"
      id="karier-kontak"
    >
      {/* Background patterns */}
      <GridPattern className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col items-start gap-3 md:gap-4 mb-8 md:mb-12">
          <SectionBadge>Karier & Kontak</SectionBadge>
          <h2 className="font-mono text-2xl md:text-3xl lg:text-4xl font-normal tracking-tight text-foreground leading-tight">
            Bergabung atau Hubungi Kami
          </h2>
        </div>

        {/* Mobile: Accordion */}
        <div className="md:hidden">
          <AccordionAbout items={accordionItems} />
        </div>

        {/* Desktop: 2-column grid */}
        <div className="hidden md:grid grid-cols-2 gap-6 mb-16">
          {CAREER_CONTACT_ITEMS.map((item) => {
            const Icon = getIcon(item.iconName)
            return (
              <div
                key={item.id}
                id={item.anchorId}
                data-anchor-id={item.anchorId}
                className={cn(
                  "group relative overflow-hidden h-full min-h-[180px] flex flex-col p-6 md:p-8 rounded-lg",
                  "border border-black/20 dark:border-white/25",
                  "hover:bg-bento-light-hover dark:hover:bg-bento-hover",
                  "hover:border-black/30 dark:hover:border-white/35",
                  "hover:-translate-y-1 transition-all duration-300"
                )}
              >
                {/* Icon + Title row */}
                <div className="flex items-start gap-4 mb-4">
                  {Icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10">
                      <Icon className="h-5 w-5 text-brand" />
                    </div>
                  )}
                  <h3 className="font-mono text-lg font-medium text-foreground leading-tight pt-2">
                    {item.title}
                  </h3>
                </div>

                {/* Content */}
                <div className="flex-1">
                  {renderContent(item.content)}
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-12 md:mt-16 pt-8 border-t border-black/10 dark:border-white/10">
          <div className="flex flex-col items-center text-center gap-4">
            <p className="font-mono text-lg text-muted-foreground">
              Ada pertanyaan? Hubungi kami
            </p>
            <a
              href={HERO_CONTENT.ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center justify-center",
                "px-6 py-3 rounded-lg",
                "font-mono text-sm font-semibold",
                "bg-[var(--brand)] text-white",
                "shadow-[0_4px_20px_rgba(232,102,9,0.2)]",
                "hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(232,102,9,0.4)]",
                "transition-all duration-200"
              )}
            >
              {HERO_CONTENT.ctaText}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
