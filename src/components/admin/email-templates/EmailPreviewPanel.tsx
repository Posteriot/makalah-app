"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import type { BrandSettings, EmailSection } from "@/lib/email/template-renderer"
import { Skeleton } from "@/components/ui/skeleton"
import { SunLight, HalfMoon } from "iconoir-react"

// ---------------------------------------------------------------------------
// Force-override CSS injected into the preview iframe.
// Duplicates the dark mode rules from template-renderer.tsx DarkModeStyles
// but WITHOUT @media query — forces the mode unconditionally.
// Light overrides ensure dark @media query is neutralized.
// ---------------------------------------------------------------------------

const FORCE_LIGHT_CSS = `
  .em-body { background-color: #fafafa !important; }
  .em-container { background-color: #ffffff !important; }
  .em-header { background-color: #fafafa !important; border-bottom-color: #d4d4d4 !important; }
  .em-header-light { display: inline-block !important; }
  .em-header-dark { display: none !important; }
  .em-heading { color: #070707 !important; }
  .em-text { color: #070707 !important; }
  .em-muted { color: #545454 !important; }
  .em-divider { border-color: #d4d4d4 !important; }
  .em-info-box { background-color: #f4f4f4 !important; border: 1px solid #d4d4d4 !important; }
  .em-footer-divider { border-color: #d4d4d4 !important; }
  .em-link { color: #2563eb !important; }
  .em-otp { color: #070707 !important; }
  .em-detail-label { color: #545454 !important; }
  .em-detail-value { color: #070707 !important; }
`

const FORCE_DARK_CSS = `
  .em-body { background-color: #181818 !important; }
  .em-container { background-color: #292929 !important; }
  .em-header { background-color: #181818 !important; border-bottom-color: #404040 !important; }
  .em-header-light { display: none !important; }
  .em-header-dark { display: inline-block !important; }
  .em-heading { color: #fafafa !important; }
  .em-text { color: #f4f4f4 !important; }
  .em-muted { color: #9f9f9f !important; }
  .em-divider { border-color: #404040 !important; }
  .em-info-box { background-color: #292929 !important; border: 1px solid #404040 !important; }
  .em-footer-divider { border-color: #404040 !important; }
  .em-link { color: #60a5fa !important; }
  .em-otp { color: #fafafa !important; }
  .em-detail-label { color: #9f9f9f !important; }
  .em-detail-value { color: #f4f4f4 !important; }
`

type PreviewMode = "light" | "dark"

interface EmailPreviewPanelProps {
  sections: EmailSection[]
  brandSettings: BrandSettings | null
  subject: string
}

export function EmailPreviewPanel({ sections, brandSettings, subject }: EmailPreviewPanelProps) {
  const [html, setHtml] = useState("")
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("light")
  const debounceRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    if (!brandSettings) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/email-templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections, brandSettings, subject }),
        })
        if (res.ok) {
          const data = await res.json()
          setHtml(data.html)
        }
      } catch (e) {
        console.error("Preview error:", e)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sections, brandSettings, subject])

  // Inject force-override CSS into the rendered HTML
  const previewHtml = useMemo(() => {
    if (!html) return html
    const overrideCss = previewMode === "dark" ? FORCE_DARK_CSS : FORCE_LIGHT_CSS
    const styleTag = `<style>${overrideCss}</style>`
    // Inject before </head> if present, otherwise append to end
    if (html.includes("</head>")) {
      return html.replace("</head>", `${styleTag}</head>`)
    }
    return html + styleTag
  }, [html, previewMode])

  if (!brandSettings) return <Skeleton className="h-96" />

  return (
    <div className="rounded-shell border border-border bg-white overflow-hidden">
      <div className="border-b border-border px-3 py-2 flex items-center justify-between">
        <span className="text-signal text-[10px] font-bold">PREVIEW</span>
        <div className="flex items-center gap-1 rounded-action border border-border p-0.5">
          <button
            type="button"
            onClick={() => setPreviewMode("light")}
            className={`flex items-center gap-1 rounded-badge px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors duration-150 ${
              previewMode === "light"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Preview light mode"
          >
            <SunLight width={12} height={12} strokeWidth={2} />
            Light
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("dark")}
            className={`flex items-center gap-1 rounded-badge px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors duration-150 ${
              previewMode === "dark"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Preview dark mode"
          >
            <HalfMoon width={12} height={12} strokeWidth={2} />
            Dark
          </button>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-96" />
      ) : (
        <iframe
          srcDoc={previewHtml}
          sandbox="allow-same-origin"
          className="w-full min-h-[500px] border-0"
          title="Email Preview"
        />
      )}
    </div>
  )
}
