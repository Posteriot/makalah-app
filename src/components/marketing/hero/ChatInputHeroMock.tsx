"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * ChatInputHeroMock - Chat input simulation with Neo-Brutalist styling
 * Front layer mockup showing typewriter animation and cursor interaction
 * All fonts: Geist Mono (monospace)
 */

// 3 different prompt examples that loop
const PROMPTS = [
  "Ayo bikin paper. Tapi gue belum punya ide. Bisa, kan? Kita diskusi!",
  "gue ada tugas paper nih tp blm tau mau bahas apa, bantuin mikir dong",
  "Saya sedang mengerjakan paper dan butuh bantuan. Bisa kita diskusikan?",
]

const CONFIG = {
  // Typing speed (faster for snappier feel)
  charDelayMin: 50,
  charDelayMax: 90,
  punctuationFactor: 2,
  // Phase durations (optimized for faster loop)
  holdDuration: 1600,  // Longer to show blinking caret
  cursorMoveDuration: 1200,
  hoverDuration: 500,
  clickDuration: 300,
  resetDuration: 500,
  returnDuration: 1000,
  placeholderDuration: 2800,  // Longer to show shimmer + animated dots
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

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // IntersectionObserver
  useEffect(() => {
    if (prefersReducedMotion) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting)
        })
      },
      { threshold: 0.3 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)

      // Check initial visibility (in case already in view on mount)
      const rect = containerRef.current.getBoundingClientRect()
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0
      if (isVisible) {
        setIsInView(true)
      }
    }

    return () => observer.disconnect()
  }, [prefersReducedMotion])

  // Visibility change handler - track document visibility state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Document hidden - stop animation
        clearTimers()
        resetToPlaceholder()
        setIsDocumentVisible(false)
      } else {
        // Document visible again - trigger animation restart
        setIsDocumentVisible(true)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [clearTimers, resetToPlaceholder])

  // Main animation loop - self-scheduling approach
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

      // Reset state for new cycle
      isTypingRef.current = false
      setShowPlaceholder(true)
      setTypedText("")
      setPhase("placeholder")

      // Phase 1: Placeholder
      addTimer(() => {
        if (cancelled) return

        // Phase 2: Typing
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
            if (".,:;!?".includes(char)) {
              delay *= CONFIG.punctuationFactor
            }

            charIndex++
            addTimer(typeNextChar, delay)
          } else {
            // Typing complete
            isTypingRef.current = false
            setPhase("hold")

            // Phase 3: Hold (blinking caret)
            addTimer(() => {
              if (cancelled) return

              // Phase 4: Cursor move
              setPhase("cursorMove")
              setCursorVisible(true)
              setCursorAtTarget(false)
              addTimer(() => setCursorAtTarget(true), 50)

              addTimer(() => {
                if (cancelled) return

                // Phase 5: Hover
                setPhase("hover")
                setSendHovered(true)

                addTimer(() => {
                  if (cancelled) return

                  // Phase 6: Click
                  setPhase("click")
                  setCursorClicking(true)
                  setSendClicked(true)

                  addTimer(() => {
                    if (cancelled) return

                    // Phase 7: Reset
                    setPhase("reset")
                    setCursorClicking(false)
                    setSendClicked(false)
                    setSendHovered(false)
                    setTypedText("")

                    addTimer(() => {
                      if (cancelled) return

                      // Phase 8: Return cursor
                      setPhase("return")
                      setCursorAtTarget(false)

                      addTimer(() => {
                        if (!cancelled) setCursorVisible(false)
                      }, CONFIG.returnDuration - 300)

                      addTimer(() => {
                        if (cancelled) return

                        // Move to next prompt and restart cycle
                        promptIndexRef.current = (promptIndexRef.current + 1) % PROMPTS.length

                        // Restart the animation cycle
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

    // Start the animation
    runAnimationCycle()

    return () => {
      cancelled = true
      clearTimers()
      isTypingRef.current = false
    }
  }, [isInView, isDocumentVisible, prefersReducedMotion, addTimer, clearTimers, resetToPlaceholder])

  // Reduced motion fallback - static placeholder
  if (prefersReducedMotion) {
    return (
      <div className="hero-mockup layer-front neo-card hidden md:block" aria-hidden="true">
        {/* Neo-Brutalist Header */}
        <div className="neo-header">
          <div className="neo-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        {/* Content */}
        <div className="neo-content neo-chat-content">
          <div className="neo-chat-placeholder">
            <span>Ketik obrolan...</span>
          </div>
          <div className="neo-chat-send">
            <Send size={18} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="hero-mockup layer-front neo-card hidden md:block"
      aria-hidden="true"
    >
      {/* Neo-Brutalist Header */}
      <div className="neo-header">
        <div className="neo-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Content */}
      <div className="neo-content neo-chat-content">
        {/* Placeholder with shimmer and animated dots */}
        <div
          className={cn(
            "neo-chat-placeholder transition-opacity",
            showPlaceholder ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="neo-shimmer-text">Ketik obrolan</span>
          <span className="neo-animated-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </div>

        {/* Typewriter Text with caret */}
        <div
          className={cn(
            "neo-chat-typewriter transition-opacity",
            !showPlaceholder ? "opacity-100" : "opacity-0"
          )}
        >
          <span>{typedText}</span>
          <span className={cn("neo-chat-caret", phase === "hold" && "hero-caret-blink")} />
        </div>

        {/* Send Button */}
        <div
          className={cn(
            "neo-chat-send",
            sendHovered && "hovered",
            sendClicked && "clicked"
          )}
        >
          <Send size={18} />
        </div>

        {/* Cursor Overlay */}
        <div
          className={cn(
            "neo-chat-cursor",
            cursorVisible && "visible",
            cursorAtTarget ? "at-target" : "at-start",
            cursorClicking && "clicking"
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
