"use client"

import { useCallback, useRef, useState } from "react"
import type { Doc } from "@convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DiagonalStripes, DottedPattern } from "@/components/marketing/SectionBackground"

type AgentTeaserItem = {
  id: string
  name: string
  statusKey: "available" | "in-progress"
  status: string
  isHighlighted: boolean
  description: string
}

function AgentTeaserCard({ item }: { item: AgentTeaserItem }) {
  return (
    <div className="group relative h-full">
      <div
        className={cn(
          "relative flex h-full min-h-[240px] flex-col overflow-hidden rounded-shell p-comfort md:min-h-[280px] md:p-airy",
          "border-1 border-[color:var(--slate-400)]",
          "transition-all duration-300 group-hover:-translate-y-1",
          "group-hover:bg-[color:var(--slate-200)] dark:group-hover:bg-[color:var(--slate-700)]",
          item.isHighlighted && "border-2 border-[color:var(--teal-500)]"
        )}
      >
        <h3 className="text-narrative mt-4 mb-3 text-center text-xl font-light text-foreground md:mt-0 md:text-2xl">
          {item.name}
        </h3>

        <div className="flex items-start gap-3">
          <span className="mt-3 h-2 w-2 min-w-2 animate-pulse rounded-full bg-[color:var(--rose-500)] shadow-[0_0_8px_var(--rose-500)]" />
          <p className="text-interface text-sm leading-relaxed text-foreground">
            {item.description}
          </p>
        </div>

        <div className="mt-8 flex justify-center md:mt-auto md:pt-4">
          <span
            className={cn(
              "inline-flex items-center rounded-badge px-2.5 py-1",
              "text-signal text-[10px] font-bold",
              item.statusKey === "available" &&
                "border bg-[color:var(--teal-500)] text-[color:var(--slate-100)] dark:bg-[color:var(--teal-700)] dark:text-[color:var(--slate-100)]",
              item.statusKey === "in-progress" &&
                "border border-[color:var(--slate-600)] bg-[color:var(--slate-500)] text-[color:var(--slate-200)]"
            )}
          >
            {item.status}
          </span>
        </div>
      </div>
    </div>
  )
}

function AgentsTeaserCarousel({ items }: { items: AgentTeaserItem[] }) {
  const highlightedIndex = items.findIndex((item) => item.isHighlighted)
  const [activeSlide, setActiveSlide] = useState(
    highlightedIndex >= 0 ? highlightedIndex : 0
  )
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  const clampIndex = useCallback(
    (index: number) => {
      if (items.length === 0) return 0
      return Math.max(0, Math.min(index, items.length - 1))
    },
    [items.length]
  )

  const handleSwipe = useCallback(
    (diff: number) => {
      const threshold = 48
      if (Math.abs(diff) < threshold) return

      setActiveSlide((current) => {
        const direction = diff > 0 ? 1 : -1
        return clampIndex(current + direction)
      })
    },
    [clampIndex]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      startXRef.current = event.clientX
      isDraggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    []
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || startXRef.current === null) return

      const diff = startXRef.current - event.clientX
      handleSwipe(diff)

      isDraggingRef.current = false
      startXRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [handleSwipe]
  )

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || startXRef.current === null) return

      const diff = startXRef.current - event.clientX
      handleSwipe(diff)

      isDraggingRef.current = false
      startXRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [handleSwipe]
  )

  return (
    <div className="relative overflow-hidden touch-pan-y pt-6 md:hidden">
      <div
        className="flex touch-pan-y transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {items.map((item) => (
          <div key={item.id} className="box-border w-full flex-shrink-0 px-2">
            <div className="mx-auto w-full max-w-[300px]">
              <AgentTeaserCard item={item} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            aria-label={`Slide ${index + 1}`}
            className={cn(
              "h-2 w-2 cursor-pointer rounded-full border-none transition-colors duration-200",
              activeSlide === index
                ? "bg-brand"
                : "bg-black/20 dark:bg-white/30"
            )}
            onClick={() => setActiveSlide(clampIndex(index))}
            type="button"
          />
        ))}
      </div>
    </div>
  )
}

type AgentsSectionCMSProps = {
  content: Doc<"pageContent">
}

export function AgentsSectionCMS({ content }: AgentsSectionCMSProps) {
  const badgeText = content.badgeText ?? "AI Agents"
  const title = content.title ?? "Fitur & Pengembangan"

  const teaserItems: AgentTeaserItem[] = (content.items ?? []).map((item, i) => ({
    id: `agent-${i}`,
    name: item.title,
    statusKey: (item.icon ?? "in-progress") as "available" | "in-progress",
    status: item.icon === "available" ? "Tersedia" : "Proses",
    isHighlighted: item.icon === "available",
    description: item.description,
  }))

  return (
    <section
      className="relative flex flex-col bg-background md:min-h-[100svh] md:justify-center md:overflow-hidden"
      id="agents"
    >
      {content.showGridPattern !== false && <GridPattern className="z-0" />}
      {content.showDiagonalStripes !== false && <DiagonalStripes className="opacity-70" />}
      {content.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0" />}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="grid grid-cols-16 content-center gap-comfort">
          <div className="col-span-16 mb-4 flex flex-col items-start gap-3 md:col-span-12 md:col-start-3 md:mb-8 md:gap-4">
            <SectionBadge>{badgeText}</SectionBadge>
            <h2 className="text-narrative text-3xl font-medium leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
              {title}
            </h2>
          </div>

          <div className="col-span-16 md:col-span-12 md:col-start-3">
            <div className="hidden items-stretch gap-6 md:grid md:grid-cols-3">
              {teaserItems.map((item) => (
                <AgentTeaserCard key={item.id} item={item} />
              ))}
            </div>

            <AgentsTeaserCarousel items={teaserItems} />
          </div>
        </div>
      </div>
    </section>
  )
}
