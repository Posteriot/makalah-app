"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Send } from "iconoir-react"
import { cn } from "@/lib/utils"

/**
 * ChatInputHeroMock - Unified Dark Mockup (Manifesto Compliant)
 * Theme: Permanent Dark (Stone-800)
 * Shadow: Sharp Diagonal Bottom-Left (-12px 12px)
 *   - Dark APP: Stone-400/20% shadow
 *   - Light APP: Stone-700/30% shadow
 */

const PROMPTS = [
  "Ayo bikin paper. Tapi gue belum punya ide. Bisa, kan? Kita diskusi!",
  "gue ada tugas paper nih tp blm tau mau bahas apa, bantuin mikir dong",
  "Saya sedang mengerjakan paper dan butuh bantuan. Bisa kita diskusikan?",
]

const CONFIG = {
  charDelayMin: 50,
  charDelayMax: 90,
  punctuationFactor: 2,
  holdDuration: 1600,
  cursorMoveDuration: 1200,
  hoverDuration: 500,
  clickDuration: 300,
  resetDuration: 500,
  returnDuration: 1000,
  placeholderDuration: 2800,
}

type Phase = "placeholder" | "typing" | "hold" | "cursorMove" | "hover" | "click" | "reset" | "return"

export function ChatInputHeroMock() {
  const containerRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<NodeJS.Timeout[]>([])
  const isTypingRef = useRef(false)
  const promptIndexRef = useRef(0)
  const [phase, setPhase] = useState<Phase>("placeholder")
  const [typedText, setTypedText] = useState("")
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [cursorAtTarget, setCursorAtTarget] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [sendHovered, setSendHovered] = useState(false)
  const [sendClicked, setSendClicked] = useState(false)
  const [cursorClicking, setCursorClicking] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [isDocumentVisible, setIsDocumentVisible] = useState(true)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current.length = 0
  }, [])

  const addTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay)
    timersRef.current.push(timer)
    return timer
  }, [])

  const resetToPlaceholder = useCallback(() => {
    isTypingRef.current = false
    setShowPlaceholder(true)
    setTypedText("")
    setCursorVisible(false)
    setCursorAtTarget(false)
    setSendHovered(false)
    setSendClicked(false)
    setCursorClicking(false)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setIsInView(entry.isIntersecting))
      },
      { threshold: 0.3 }
    )
    if (containerRef.current) {
      observer.observe(containerRef.current)
      const rect = containerRef.current.getBoundingClientRect()
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0
      if (isVisible) setIsInView(true)
    }
    return () => observer.disconnect()
  }, [prefersReducedMotion])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimers()
        resetToPlaceholder()
        setIsDocumentVisible(false)
      } else {
        setIsDocumentVisible(true)
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [clearTimers, resetToPlaceholder])

  useEffect(() => {
    if (!isInView || !isDocumentVisible || prefersReducedMotion) {
      clearTimers()
      isTypingRef.current = false
      resetToPlaceholder()
      setPhase("placeholder")
      return
    }

    let cancelled = false

    const runAnimationCycle = () => {
      if (cancelled) return
      isTypingRef.current = false
      setShowPlaceholder(true)
      setTypedText("")
      setPhase("placeholder")

      addTimer(() => {
        if (cancelled) return
        setShowPlaceholder(false)
        setTypedText("")
        setPhase("typing")
        isTypingRef.current = true

        let charIndex = 0
        const currentPrompt = PROMPTS[promptIndexRef.current]

        const typeNextChar = () => {
          if (cancelled || !isTypingRef.current) return
          if (charIndex < currentPrompt.length) {
            const char = currentPrompt[charIndex]
            setTypedText(currentPrompt.substring(0, charIndex + 1))
            let delay = Math.random() * (CONFIG.charDelayMax - CONFIG.charDelayMin) + CONFIG.charDelayMin
            if (".,:;!?".includes(char)) delay *= CONFIG.punctuationFactor
            charIndex++
            addTimer(typeNextChar, delay)
          } else {
            isTypingRef.current = false
            setPhase("hold")
            addTimer(() => {
              if (cancelled) return
              setPhase("cursorMove")
              setCursorVisible(true)
              setCursorAtTarget(false)
              addTimer(() => setCursorAtTarget(true), 50)
              addTimer(() => {
                if (cancelled) return
                setPhase("hover")
                setSendHovered(true)
                addTimer(() => {
                  if (cancelled) return
                  setPhase("click")
                  setCursorClicking(true)
                  setSendClicked(true)
                  addTimer(() => {
                    if (cancelled) return
                    setPhase("reset")
                    setCursorClicking(false)
                    setSendClicked(false)
                    setSendHovered(false)
                    setTypedText("")
                    addTimer(() => {
                      if (cancelled) return
                      setPhase("return")
                      setCursorAtTarget(false)
                      addTimer(() => { if (!cancelled) setCursorVisible(false) }, CONFIG.returnDuration - 300)
                      addTimer(() => {
                        if (cancelled) return
                        promptIndexRef.current = (promptIndexRef.current + 1) % PROMPTS.length
                        runAnimationCycle()
                      }, CONFIG.returnDuration)
                    }, CONFIG.resetDuration)
                  }, CONFIG.clickDuration)
                }, CONFIG.hoverDuration)
              }, CONFIG.cursorMoveDuration)
            }, CONFIG.holdDuration)
          }
        }
        typeNextChar()
      }, CONFIG.placeholderDuration)
    }

    runAnimationCycle()
    return () => { cancelled = true; clearTimers(); isTypingRef.current = false }
  }, [isInView, isDocumentVisible, prefersReducedMotion, addTimer, clearTimers, resetToPlaceholder])

  // Unified Style with Shell Stone-200
  const cardStyles = cn(
    "hidden md:block absolute w-full max-w-[440px] transition-all duration-300",
    "bg-stone-200 border-stone-300", // Shell: Stone-200, Border: Stone-300
    "border-[1px] rounded-md",
    // Sharp Shadow - Diagonal Bottom-Left (-12px 12px)
    "dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]",
    "shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]",
    // layer-front positioning
    "z-20 top-1/2 right-0 -translate-y-1/2"
  )

  // Reduced motion fallback
  if (prefersReducedMotion) {
    return (
      <div className={cardStyles} aria-hidden="true">
        <div className={cn(
          "flex items-center gap-4 p-3 rounded-t-md border-b-[0.5px] border-stone-600 bg-stone-500" // Header: Stone-500
        )}>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
        <div className="relative min-h-[120px] flex flex-col justify-start p-6 pr-[60px]">
          <div className={cn(
            "absolute top-6 left-6 font-mono text-xs tracking-wider text-stone-500" // Muted for Stone-200 bg
          )}>
            <span>Ketik obrolan...</span>
          </div>
          <div className={cn(
            "absolute bottom-4 right-4 w-9 h-9 border-[0.5px] rounded-none flex items-center justify-center bg-stone-500 border-stone-600 text-stone-100"
          )}>
            <Send className="w-4 h-4" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cardStyles} aria-hidden="true">
      {/* Header - Stone-500 */}
      <div className={cn(
        "flex items-center gap-4 p-3 rounded-t-md border-b-[0.5px] border-stone-600 bg-stone-500"
      )}>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-[120px] flex flex-col justify-start p-6 pr-[60px]">
        {/* Placeholder - Total Mono */}
        <div
          className={cn(
            "absolute top-6 left-6 font-mono text-xs flex items-center transition-all tracking-wider text-stone-500",
            showPlaceholder ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="tracking-tight">Ketik obrolan</span>
          <span className="inline-flex ml-0.5">
            <span className="opacity-30 animate-pulse">.</span>
            <span className="opacity-30 animate-pulse delay-150">.</span>
            <span className="opacity-30 animate-pulse delay-300">.</span>
          </span>
        </div>

        {/* Typewriter - Total Mono with Widest Tracking */}
        <div
          className={cn(
            "absolute top-6 left-6 right-[60px] font-mono text-xs whitespace-pre-wrap leading-relaxed transition-all tracking-widest text-stone-950",
            !showPlaceholder ? "opacity-100" : "opacity-0"
          )}
        >
          <span>{typedText}</span>
          <span className={cn(
            "inline-block w-1.5 h-[1.1em] ml-1 translate-y-0.5 bg-stone-950",
            phase === "hold" && "animate-pulse"
          )} />
        </div>

        {/* Send Button - Sharp Radius (Radius Contrast) */}
        <div
          className={cn(
            "absolute bottom-4 right-4 w-9 h-9 border-[1px] transition-all duration-200 flex items-center justify-center rounded-none", // Core: rounded-none
            sendClicked
              ? "bg-stone-800 border-stone-700 text-stone-500 scale-95 translate-y-0.5"
              : sendHovered
                ? "bg-stone-700 border-stone-600 text-stone-100 shadow-lg shadow-stone-800/20 scale-105"
                : "bg-stone-500 border-stone-600 text-stone-100"
          )}
        >
          <Send className="w-4.5 h-4.5" />
        </div>

        {/* Cursor - Mechanical Stylus (Solid & Stone-950) */}
        <div
          className={cn(
            "absolute w-5 h-5 pointer-events-none z-50 transition-all duration-800",
            cursorVisible ? "opacity-100" : "opacity-0",
            cursorAtTarget ? "bottom-6 right-6" : "bottom-[60px] right-[80px]",
            "text-stone-950", // Standard color: Stone-950
            cursorClicking && "scale-90 opacity-80" // Scale down on click
          )}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
