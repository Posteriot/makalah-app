"use client"

import { useEffect, useState } from "react"
import { OpenNewWindow } from "iconoir-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getWebCitationDisplayParts, deriveSiteNameFromUrl } from "@/lib/citations/apaWeb"

interface Source {
  url: string
  title: string
  publishedAt?: number | null
}

interface SourcesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: Source[]
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function faviconUrl(url: string): string {
  const domain = extractDomain(url)
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
}

export function SourcesPanel({ open, onOpenChange, sources }: SourcesPanelProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "overflow-y-auto border-0 bg-background p-0 text-foreground font-sans",
          "[&>[data-slot='sheet-close']]:absolute [&>[data-slot='sheet-close']]:top-4 [&>[data-slot='sheet-close']]:right-4",
          "[&>[data-slot='sheet-close']]:flex [&>[data-slot='sheet-close']]:h-8 [&>[data-slot='sheet-close']]:w-8 [&>[data-slot='sheet-close']]:items-center [&>[data-slot='sheet-close']]:justify-center",
          "[&>[data-slot='sheet-close']]:rounded-none [&>[data-slot='sheet-close']]:border-0 [&>[data-slot='sheet-close']]:bg-transparent [&>[data-slot='sheet-close']]:shadow-none [&>[data-slot='sheet-close']]:ring-0",
          "[&>[data-slot='sheet-close']]:text-muted-foreground [&>[data-slot='sheet-close']]:opacity-60",
          "[&>[data-slot='sheet-close']]:transition-opacity [&>[data-slot='sheet-close']]:hover:opacity-100 [&>[data-slot='sheet-close']]:hover:bg-transparent",
          "[&>[data-slot='sheet-close']]:focus-visible:outline-none [&>[data-slot='sheet-close']]:focus-visible:ring-0 [&>[data-slot='sheet-close']]:focus-visible:ring-offset-0",
          isMobile ? "h-[80vh]" : "w-[420px] max-w-[90vw] sm:max-w-[420px]"
        )}
      >
        <div className="px-5 pb-6 pt-5 md:px-6">
          <SheetTitle className="mb-1 font-sans text-base font-semibold text-foreground">
            Rujukan
          </SheetTitle>
          <SheetDescription className="mb-5 font-sans text-xs text-muted-foreground">
            {sources.length} sumber ditemukan
          </SheetDescription>

          <div className="flex flex-col divide-y divide-border">
            {sources.map((source, idx) => (
              <SourceCard key={idx} source={source} />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SourceCard({ source }: { source: Source }) {
  const parts = getWebCitationDisplayParts(source)
  const domain = extractDomain(parts.url)
  const siteName = deriveSiteNameFromUrl(parts.url)

  return (
    <a
      href={parts.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 py-3 transition-colors hover:bg-muted/50"
    >
      {/* Favicon */}
      <img
        src={faviconUrl(parts.url)}
        alt=""
        width={16}
        height={16}
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm"
        loading="lazy"
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Domain + date row */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{siteName || domain}</span>
          {parts.dateText && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="shrink-0">{parts.dateText}</span>
            </>
          )}
        </div>

        {/* Title */}
        <span className="mt-0.5 flex items-center gap-1 text-sm font-medium text-foreground group-hover:underline">
          <span className="line-clamp-2">{parts.title}</span>
          <OpenNewWindow className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
        </span>
      </div>
    </a>
  )
}
