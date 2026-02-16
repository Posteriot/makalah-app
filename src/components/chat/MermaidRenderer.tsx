"use client"

import { useEffect, useId, useState } from "react"
import mermaid from "mermaid"
import DOMPurify from "dompurify"

interface MermaidRendererProps {
  code: string
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const id = useId().replace(/:/g, "-")
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      fontFamily: "var(--font-geist-mono)",
    })

    mermaid
      .render(`mermaid-${id}`, code)
      .then(({ svg: rawSvg }) => {
        const sanitized = DOMPurify.sanitize(rawSvg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ["foreignObject", "div", "span", "p", "br", "b", "i", "em", "strong", "ul", "li"],
          ADD_ATTR: ["xmlns", "class", "style", "transform", "x", "y", "width", "height", "requiredExtensions"],
        })
        setSvg(sanitized)
        setError(null)
      })
      .catch((err) => {
        setError(String(err))
        setSvg(null)
      })
  }, [code, id])

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
