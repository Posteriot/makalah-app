"use client"

import { useEffect, useState } from "react"
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
  const [renderState, setRenderState] = useState<{
    key: string
    svg: string | null
    error: string | null
  }>({
    key: "",
    svg: null,
    error: null,
  })
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false
    return document.documentElement.classList.contains("dark")
  })
  const currentRenderKey = `${isDark ? "dark" : "default"}:${code}`

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const nextIsDark = document.documentElement.classList.contains("dark")
      setIsDark((prev) => (prev === nextIsDark ? prev : nextIsDark))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    initMermaid(isDark)

    renderCounter += 1
    const renderId = `mermaid-render-${renderCounter}-${Date.now()}`
    const renderKey = `${isDark ? "dark" : "default"}:${code}`

    mermaid
      .render(renderId, code)
      .then(({ svg: rawSvg }) => {
        const tempEl = document.getElementById(renderId)
        if (tempEl) tempEl.remove()

        if (cancelled) return

        const sanitized = DOMPurify.sanitize(rawSvg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ["foreignObject", "div", "span", "p", "br", "b", "i", "em", "strong", "ul", "li"],
          ADD_ATTR: ["xmlns", "class", "style", "transform", "x", "y", "width", "height", "requiredExtensions"],
        })
        setRenderState({
          key: renderKey,
          svg: sanitized,
          error: null,
        })
      })
      .catch((err) => {
        const tempEl = document.getElementById(renderId)
        if (tempEl) tempEl.remove()

        if (cancelled) return
        setRenderState({
          key: renderKey,
          svg: null,
          error: String(err),
        })
      })

    return () => {
      cancelled = true
    }
  }, [code, isDark])

  if (renderState.key === currentRenderKey && renderState.error) {
    return (
      <pre className="my-2 overflow-x-auto rounded-action bg-[var(--chat-background)] p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    )
  }

  if (renderState.key !== currentRenderKey || !renderState.svg) {
    return (
      <div className="my-2 h-32 animate-pulse rounded-action bg-[var(--chat-muted)]" />
    )
  }

  return (
    <div
      className="my-2 overflow-x-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: renderState.svg }}
    />
  )
}
