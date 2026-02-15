"use client"

import { useCallback, useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      remove?: (widgetId: string) => void
    }
  }
}

type TurnstileWidgetProps = {
  siteKey: string
  onTokenChange: (token: string | null) => void
  resetCounter: number
  className?: string
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script"
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

export function TurnstileWidget({
  siteKey,
  onTokenChange,
  resetCounter,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)

  const normalizeWidgetWidth = useCallback(() => {
    if (!containerRef.current) return

    const rootElement = containerRef.current.firstElementChild as HTMLElement | null
    if (rootElement) {
      rootElement.style.width = "100%"
      rootElement.style.maxWidth = "100%"
      rootElement.style.margin = "0"
      rootElement.style.padding = "0"
      rootElement.style.background = "transparent"
    }

    const iframeElement = containerRef.current.querySelector("iframe") as HTMLIFrameElement | null
    if (iframeElement) {
      iframeElement.style.width = "100%"
      iframeElement.style.maxWidth = "100%"
      iframeElement.style.display = "block"
      iframeElement.style.margin = "0"
    }
  }, [])

  const mountWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) {
      return
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      size: "flexible",
      language: "id",
      callback: (token: string) => onTokenChange(token),
      "expired-callback": () => onTokenChange(null),
      "error-callback": () => onTokenChange(null),
    })

    window.requestAnimationFrame(() => {
      normalizeWidgetWidth()
    })
  }, [normalizeWidgetWidth, onTokenChange, siteKey])

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new MutationObserver(() => {
      normalizeWidgetWidth()
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [normalizeWidgetWidth])

  useEffect(() => {
    const initWidget = () => {
      if (!window.turnstile) return
      mountWidget()
    }

    if (window.turnstile) {
      initWidget()
      return
    }

    let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement("script")
      script.id = TURNSTILE_SCRIPT_ID
      script.src = TURNSTILE_SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    script.addEventListener("load", initWidget)

    const intervalId = window.setInterval(() => {
      if (!window.turnstile) return
      mountWidget()
      window.clearInterval(intervalId)
    }, 200)

    return () => {
      script?.removeEventListener("load", initWidget)
      window.clearInterval(intervalId)
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [mountWidget])

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) return
    window.turnstile.reset(widgetIdRef.current)
    onTokenChange(null)
  }, [onTokenChange, resetCounter])

  return (
    <div className={`w-full ${className ?? ""}`}>
      <div ref={containerRef} className="w-full min-h-[65px]" />
    </div>
  )
}
