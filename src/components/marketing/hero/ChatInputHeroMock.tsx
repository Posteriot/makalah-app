"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Send } from "iconoir-react"
import { cn } from "@/lib/utils"

/**
 * ChatInputHeroMock - Chat input simulation with Neo-Brutalist styling
 * Front layer mockup showing typewriter animation and cursor interaction
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

  // Neo-brutalist card styles
  const cardStyles = cn(
    "hidden md:block absolute w-full max-w-[440px] font-mono",
    "bg-neo-card border-[4px] border-neo-border rounded-lg",
    "shadow-[-10px_10px_0_var(--neo-shadow)]",
    "backdrop-blur-sm",
    // layer-front positioning
    "z-20 top-40 right-0"
  )

  // Reduced motion fallback
  if (prefersReducedMotion) {
    return (
      <div className={cardStyles} aria-hidden="true">
        <div className="flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px] border-neo-shadow">
          <div className="flex gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border-[3px] border-neo-shadow" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border-[3px] border-neo-shadow" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#27c93f] border-[3px] border-neo-shadow" />
          </div>
        </div>
        <div className="relative min-h-[120px] flex flex-col justify-start p-5 pr-[60px]">
          <div className="absolute top-5 left-5 font-mono text-sm font-medium text-neo-text-muted">
            <span>Ketik obrolan...</span>
          </div>
          <div className="absolute bottom-4 right-4 w-10 h-10 border-[3px] border-neo-border rounded-md bg-neo-card flex items-center justify-center text-neo-text">
            <Send className="w-[18px] h-[18px]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cardStyles} aria-hidden="true">
      {/* Header */}
      <div className="flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px] border-neo-shadow">
        <div className="flex gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border-[3px] border-neo-shadow" />
          <span className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border-[3px] border-neo-shadow" />
          <span className="w-3.5 h-3.5 rounded-full bg-[#27c93f] border-[3px] border-neo-shadow" />
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-[120px] flex flex-col justify-start p-5 pr-[60px]">
        {/* Placeholder */}
        <div
          className={cn(
            "absolute top-5 left-5 font-mono text-sm font-medium text-neo-text-muted flex items-center transition-opacity",
            showPlaceholder ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="bg-gradient-to-r from-neo-text-muted via-neo-text to-neo-text-muted bg-[length:200%_100%] bg-clip-text text-transparent animate-[neo-shimmer_2s_ease-in-out_infinite]">
            Ketik obrolan
          </span>
          <span className="inline-flex ml-0.5">
            <span className="opacity-30 animate-[neo-dot-pulse_1.4s_ease-in-out_infinite]">.</span>
            <span className="opacity-30 animate-[neo-dot-pulse_1.4s_ease-in-out_infinite_0.2s]">.</span>
            <span className="opacity-30 animate-[neo-dot-pulse_1.4s_ease-in-out_infinite_0.4s]">.</span>
          </span>
        </div>

        {/* Typewriter */}
        <div
          className={cn(
            "absolute top-5 left-5 right-[60px] font-mono text-sm font-medium text-neo-text whitespace-pre-wrap leading-relaxed transition-opacity",
            !showPlaceholder ? "opacity-100" : "opacity-0"
          )}
        >
          <span>{typedText}</span>
          <span className={cn(
            "inline-block w-0.5 h-[1.1em] bg-neo-text ml-0.5 align-text-bottom",
            phase === "hold" && "animate-[hero-caret-blink_0.4s_step-end_infinite]"
          )} />
        </div>

        {/* Send Button */}
        <div
          className={cn(
            "absolute bottom-4 right-4 w-10 h-10 border-[3px] border-neo-border rounded-md bg-neo-card flex items-center justify-center text-neo-text transition-all duration-150",
            sendHovered && "bg-[#006d5b] text-white shadow-[-3px_3px_0_var(--neo-shadow)]",
            sendClicked && "translate-x-[-2px] translate-y-[2px] shadow-none"
          )}
        >
          <Send className="w-[18px] h-[18px]" />
        </div>

        {/* Cursor */}
        <div
          className={cn(
            "absolute w-6 h-6 text-zinc-500 dark:text-zinc-400 pointer-events-none z-50 transition-all duration-800 ease-[cubic-bezier(0.4,0,0.2,1)]",
            cursorVisible ? "opacity-100" : "opacity-0",
            cursorAtTarget ? "bottom-7 right-7" : "bottom-[70px] right-[100px]",
            cursorClicking && "scale-[0.85]"
          )}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 0 L0 20 L5.5 14.5 L9 22 L12 21 L8.5 13.5 L16 12 Z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
