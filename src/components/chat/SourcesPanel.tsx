"use client"

import { useEffect, useState } from "react"
import { OpenNewWindow } from "iconoir-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getWebCitationDisplayParts, deriveSiteNameFromUrl } from "@/lib/citations/apaWeb"

interface Source {
  sourceId?: string
  url: string | null
  title: string
  publishedAt?: number | null
  verificationStatus?: "verified_content" | "unverified_link" | "unavailable"
  documentKind?: "html" | "pdf" | "unknown"
  note?: string
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
    if (typeof window.matchMedia !== "function") {
      setIsMobile(false)
      return
    }

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
  const url = typeof source.url === "string" && source.url.trim().length > 0 ? source.url : null
  const parts = url
    ? getWebCitationDisplayParts({
        url,
        title: source.title,
        publishedAt: source.publishedAt,
      })
    : null
  const siteName = parts ? deriveSiteNameFromUrl(parts.url) : "Tautan tidak tersedia"
  const label =
    source.verificationStatus === "verified_content"
      ? "Konten terverifikasi"
      : source.verificationStatus === "unverified_link"
        ? "Tautan belum diverifikasi"
        : source.verificationStatus === "unavailable"
          ? "Tidak tersedia"
          : null

  return (
    url && parts ? (
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
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">{siteName}</span>
            {parts.dateText && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="shrink-0">{parts.dateText}</span>
              </>
            )}
            {label && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="rounded-badge border border-[color:var(--border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </span>
              </>
            )}
            {source.documentKind && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="rounded-badge border border-[color:var(--border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {source.documentKind === "pdf" ? "PDF" : source.documentKind === "html" ? "HTML" : "UNKNOWN"}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <span className="mt-0.5 flex items-center gap-1 text-sm font-medium text-foreground group-hover:underline">
            <span className="line-clamp-2">{parts.title}</span>
            <OpenNewWindow className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
          </span>
          {source.note && (
            <div className="mt-0.5 text-xs text-muted-foreground">{source.note}</div>
          )}
        </div>
      </a>
    ) : (
      <div className="flex gap-3 py-3">
        <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm border border-[color:var(--border)]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">{siteName}</span>
            {label && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="rounded-badge border border-[color:var(--border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </span>
              </>
            )}
            {source.documentKind && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="rounded-badge border border-[color:var(--border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {source.documentKind === "pdf" ? "PDF" : source.documentKind === "html" ? "HTML" : "UNKNOWN"}
                </span>
              </>
            )}
          </div>
          <div className="mt-0.5 text-sm font-medium text-foreground">{source.title}</div>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">URL tidak tersedia</div>
          {source.note && (
            <div className="mt-0.5 text-xs text-muted-foreground">{source.note}</div>
          )}
        </div>
      </div>
    )
  )
}
