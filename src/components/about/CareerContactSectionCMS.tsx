"use client"

import type { Doc } from "@convex/_generated/dataModel"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"
import { AccordionAbout } from "./AccordionAbout"
import { getIcon } from "./icons"
import { cn } from "@/lib/utils"

type CareerContactSectionCMSProps = {
  content: Doc<"pageContent">
}

export function CareerContactSectionCMS({ content }: CareerContactSectionCMSProps) {
  const badgeText = content.badgeText ?? "Karier & Kontak"
  const title = content.title ?? ""
  const careerItem = content.items?.[0]
  const contactInfo = content.contactInfo

  // Build cards for rendering
  const cards: Array<{
    id: string
    anchorId: string
    iconName: "Briefcase" | "Mail"
    title: string
    renderContent: () => React.ReactNode
  }> = []

  if (careerItem) {
    cards.push({
      id: "karier",
      anchorId: "bergabung-dengan-tim",
      iconName: "Briefcase",
      title: careerItem.title,
      renderContent: () => (
        <p className="text-narrative text-sm text-muted-foreground">{careerItem.description}</p>
      ),
    })
  }

  if (contactInfo) {
    cards.push({
      id: "kontak",
      anchorId: "hubungi-kami",
      iconName: "Mail",
      title: "Kontak",
      renderContent: () => (
        <div className="space-y-2">
          <p className="text-interface font-bold text-foreground">{contactInfo.company}</p>
          <div className="text-narrative text-sm text-muted-foreground">
            {contactInfo.address.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          <p>
            <a
              href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(contactInfo.email)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-interface text-sm text-[color:var(--slate-700)] dark:text-[color:var(--slate-50)] hover:underline"
            >
              {contactInfo.email}
            </a>
          </p>
        </div>
      ),
    })
  }

  // Accordion items for mobile
  const accordionItems = cards.map((card) => ({
    id: card.id,
    title: card.title,
    content: card.renderContent(),
    anchorId: card.anchorId,
  }))

  return (
    <section className="relative isolate overflow-hidden bg-background" id="karier-kontak">
      {content.showGridPattern !== false && <GridPattern className="z-0 opacity-80" />}
      {content.showDiagonalStripes !== false && <DiagonalStripes className="opacity-40" />}
      {content.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={true} />}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-comfort md:grid-cols-16">
          <div className="col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-12 md:gap-4">
            <SectionBadge>{badgeText}</SectionBadge>
            <h2 className="text-narrative text-3xl font-medium leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
              <span className="md:hidden">
                {title.includes(" atau ") ? (
                  <>{title.split(" atau ")[0]} atau<br />{title.split(" atau ")[1]}</>
                ) : title}
              </span>
              <span className="hidden md:inline">{title}</span>
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

          {/* Desktop: cards */}
          <div className="hidden md:col-span-12 md:col-start-3 md:grid grid-cols-16 gap-comfort">
            {cards.map((card) => {
              const Icon = getIcon(card.iconName)
              return (
                <div
                  key={card.id}
                  id={card.anchorId}
                  data-anchor-id={card.anchorId}
                  className={cn(
                    "group relative col-span-8 flex h-full min-h-[180px] flex-col overflow-hidden rounded-shell border-hairline bg-slate-50 dark:bg-slate-900 p-airy",
                    "transition-colors duration-200",
                    "hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="mb-4 flex items-start gap-4">
                    {Icon && (
                      <div className="rounded-action flex h-10 w-10 shrink-0 items-center justify-center bg-[color:var(--slate-600)] dark:bg-[color:var(--slate-700)]">
                        <Icon className="h-5 w-5 text-slate-50" />
                      </div>
                    )}
                    <h3 className="text-narrative pt-2 text-lg font-medium leading-tight text-foreground">
                      {card.title}
                    </h3>
                  </div>
                  <div className="mb-4 border-t border-hairline" />
                  <div className="flex-1">{card.renderContent()}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
