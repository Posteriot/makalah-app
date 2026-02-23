"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import DOMPurify from "dompurify"

let renderCounter = 0
let lastTheme: "dark" | "default" | null = null

function initMermaid(isDark: boolean) {
  const theme = isDark ? "dark" : "default"
  if (lastTheme === theme) return
  mermaid.initialize({
    startOnLoad: false,
    theme,
    fontFamily: "var(--font-geist-mono)",
    suppressErrorRendering: true,
  })
  lastTheme = theme
}

interface MermaidRendererProps {
  code: string
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    setIsDark(document.documentElement.classList.contains("dark"))

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      mountedRef.current = false
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    setSvg(null)
    setError(null)

    initMermaid(isDark)

    renderCounter += 1
    const renderId = `mermaid-render-${renderCounter}-${Date.now()}`

    mermaid
      .render(renderId, code)
      .then(({ svg: rawSvg }) => {
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
        const tempEl = document.getElementById(renderId)
        if (tempEl) tempEl.remove()

        if (!mountedRef.current) return
        setError(String(err))
        setSvg(null)
      })
  }, [code, isDark])

  if (error) {
    return (
      <pre className="my-2 overflow-x-auto rounded-action bg-[var(--chat-background)] p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="my-2 h-32 animate-pulse rounded-action bg-[var(--chat-muted)]" />
    )
  }

  return (
    <div
      className="my-2 overflow-x-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
