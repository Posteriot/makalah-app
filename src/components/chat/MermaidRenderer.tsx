"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import DOMPurify from "dompurify"

let mermaidInitialized = false
let renderCounter = 0

interface MermaidRendererProps {
  code: string
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const renderIdRef = useRef("")

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    setSvg(null)
    setError(null)

    const isDark = document.documentElement.classList.contains("dark")

    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        fontFamily: "var(--font-geist-mono)",
        suppressErrorRendering: true,
      })
      mermaidInitialized = true
    }

    renderCounter += 1
    const renderId = `mermaid-render-${renderCounter}-${Date.now()}`
    renderIdRef.current = renderId

    // Clean up any leftover temp element from previous render
    const oldEl = document.getElementById(renderIdRef.current)
    if (oldEl) oldEl.remove()

    mermaid
      .render(renderId, code)
      .then(({ svg: rawSvg }) => {
        // Clean up mermaid's temp element
        const tempEl = document.getElementById(renderId)
        if (tempEl) tempEl.remove()

        if (!mountedRef.current) return

        const sanitized = DOMPurify.sanitize(rawSvg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ["foreignObject", "div", "span", "p", "br", "b", "i", "em", "strong", "ul", "li"],
          ADD_ATTR: ["xmlns", "class", "style", "transform", "x", "y", "width", "height", "requiredExtensions"],
        })
        setSvg(sanitized)
        setError(null)
      })
      .catch((err) => {
        // Clean up mermaid's temp element on error
        const tempEl = document.getElementById(renderId)
        if (tempEl) tempEl.remove()

        if (!mountedRef.current) return
        setError(String(err))
        setSvg(null)
      })
  }, [code])

  if (error) {
    return (
      <pre className="my-2 overflow-x-auto rounded-action bg-background/50 p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="my-2 h-32 animate-pulse rounded-action bg-muted" />
    )
  }

  return (
    <div
      className="my-2 overflow-x-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
