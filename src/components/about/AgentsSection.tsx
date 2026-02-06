"use client"

import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"
import { AccordionAbout } from "./AccordionAbout"
import { AGENTS_ITEMS, AGENT_STATUS_LABELS } from "./data"
import { getIcon } from "./icons"
import { cn } from "@/lib/utils"

export function AgentsSection() {
  // Map status to badge styling
  const getBadgeClasses = (status: "available" | "in-progress") => {
    return status === "available"
      ? "bg-emerald-600 text-white"
      : "bg-black/5 dark:bg-white/10 text-muted-foreground"
  }

  // Transform items for accordion (mobile)
  const accordionItems = AGENTS_ITEMS.map((item) => {
    const Icon = getIcon(item.iconName)
    return {
      id: item.id,
      icon: Icon ? <Icon className="h-4 w-4" /> : undefined,
      title: item.title,
      content: item.description,
      badgeLabel: AGENT_STATUS_LABELS[item.status],
      badgeVariant: (item.status === "available" ? "default" : "secondary") as "default" | "secondary",
    }
  })

  return (
    <section
      className="relative overflow-hidden bg-background px-4 py-16 md:px-6 md:py-24"
      id="agents"
    >
      {/* Background patterns */}
      <GridPattern className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 mx-auto w-full max-w-[var(--container-max-width)]">
        <div className="grid grid-cols-1 gap-comfort md:grid-cols-16">
          {/* Section Header */}
          <div className="col-span-1 mb-8 flex flex-col items-start gap-3 md:col-span-12 md:mb-12 md:gap-4">
            <SectionBadge>AI Agents</SectionBadge>
            <h2 className="font-mono text-2xl leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
              Fitur & Pengembangan
            </h2>
          </div>

          {/* Mobile: Accordion with icons and badges */}
          <div className="col-span-1 md:hidden">
            <AccordionAbout items={accordionItems} />
          </div>

          {/* Desktop: 16-col bento mapping (8/8) with status badges */}
          <div className="hidden md:col-span-16 md:grid md:grid-cols-16 md:gap-comfort">
            {AGENTS_ITEMS.map((item) => {
              const Icon = getIcon(item.iconName)
              return (
                <div key={item.id} className="relative col-span-8">
                  {/* Status badge - positioned absolute */}
                  <div
                    className={cn(
                      "absolute -top-3 right-6 z-10",
                      "text-[11px] font-semibold uppercase tracking-wide",
                      "px-3 py-1 rounded-full whitespace-nowrap",
                      getBadgeClasses(item.status)
                    )}
                  >
                    {AGENT_STATUS_LABELS[item.status]}
                  </div>

                  {/* Card */}
                  <div
                    className={cn(
                      "group relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-lg p-6 md:p-8",
                      "border border-black/20 dark:border-white/25",
                      "hover:bg-bento-light-hover dark:hover:bg-bento-hover",
                      "hover:border-black/30 dark:hover:border-white/35",
                      "hover:-translate-y-1 transition-all duration-300",
                      item.status === "available" && "border-emerald-600/50 dark:border-emerald-500/50"
                    )}
                  >
                    {/* Icon + Title row */}
                    <div className="mb-4 mt-2 flex items-start gap-4">
                      {Icon && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10">
                          <Icon className="h-5 w-5 text-brand" />
                        </div>
                      )}
                      <h3 className="pt-2 font-mono text-lg font-medium leading-tight text-foreground">
                        {item.title}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="font-mono text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
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
