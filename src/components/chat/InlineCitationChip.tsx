"use client"

import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationCarouselNext,
  InlineCitationCarouselPrev,
  InlineCitationSource,
} from "@/components/ai-elements/inline-citation"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useEffect, useState } from "react"

type CitationSource = {
  url: string
  title: string
  publishedAt?: number | null
}

const formatDateId = (timestamp?: number | null) => {
  if (!timestamp || !Number.isFinite(timestamp)) return null
  try {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return null
  }
}

const formatHostname = (raw: string) => {
  try {
    const url = new URL(raw)
    return url.hostname.replace(/^www\./i, "")
  } catch {
    return raw.replace(/^www\./i, "")
  }
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return isMobile
}

export function InlineCitationChip({ sources }: { sources: CitationSource[] }) {
  const safeSources = sources ?? []
  const isMobile = useIsMobile()

  const hostname = safeSources.length > 0 ? formatHostname(safeSources[0].url) : "sumber"
  const chipLabel = `${hostname}${safeSources.length > 1 ? ` +${safeSources.length - 1}` : ""}`

  if (safeSources.length === 0) return null

  const cardContent = (
    <InlineCitationCarousel>
      <InlineCitationCarouselHeader>
        <InlineCitationCarouselPrev />
        <InlineCitationCarouselNext />
        <InlineCitationCarouselIndex />
      </InlineCitationCarouselHeader>
      <InlineCitationCarouselContent>
        {safeSources.map((source) => (
          <InlineCitationCarouselItem key={source.url}>
            <InlineCitationSource
              title={source.title}
              url={source.url}
              description={formatDateId(source.publishedAt) ?? undefined}
            />
          </InlineCitationCarouselItem>
        ))}
      </InlineCitationCarouselContent>
    </InlineCitationCarousel>
  )

  if (isMobile) {
    return (
      <InlineCitation className="align-baseline">
        <Sheet>
          <SheetTrigger asChild>
            <Badge
              className="ml-1 cursor-pointer rounded-badge border border-slate-300 bg-slate-200 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:shadow-none"
              variant="secondary"
            >
              {chipLabel}
            </Badge>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-sm">Sumber</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">{cardContent}</div>
          </SheetContent>
        </Sheet>
      </InlineCitation>
    )
  }

  return (
    <InlineCitation className="align-baseline">
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={safeSources.map((source) => source.url)} />
        <InlineCitationCardBody>
          {cardContent}
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  )
}
