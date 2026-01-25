"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Plus, Send } from "lucide-react"
import { cn } from "@/lib/utils"

// 3 different prompt examples that loop
const PROMPTS = [
  "Ayo bikin paper. Tapi gue belum punya ide. Bisa, kan? Kita diskusi aja dulu. Sepakat?",
  "gue ada tugas paper nih tp blm tau mau bahas apa, bantuin mikir dong pleasee",
  "Saya sedang mengerjakan paper dan butuh bantuan untuk menyusun argumen. Bisa kita diskusikan bersama?",
]

const CONFIG = {
  // Typing speed (slower = more readable)
  charDelayMin: 70,
  charDelayMax: 120,
  punctuationFactor: 3,
  // Phase durations (all slowed down)
  holdDuration: 2000,
  cursorMoveDuration: 1800,
  hoverDuration: 800,      // Longer pause before click
  clickDuration: 350,
  resetDuration: 800,
  returnDuration: 1600,
  placeholderDuration: 3000,
}

type Phase = "placeholder" | "typing" | "hold" | "cursorMove" | "hover" | "click" | "reset" | "return"

export function ChatInputHeroMock() {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)
  const sendIconRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<NodeJS.Timeout[]>([])
  const isTypingRef = useRef(false) // Prevent duplicate typing loops
  const promptIndexRef = useRef(0) // Track which prompt to show next
  const [phase, setPhase] = useState<Phase>("placeholder")
  const [typedText, setTypedText] = useState("")
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  // Cursor position: null = starting position (near text), {x,y} = target position
  const [cursorAtTarget, setCursorAtTarget] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [sendHovered, setSendHovered] = useState(false)
  const [sendClicked, setSendClicked] = useState(false)
  const [cursorClicking, setCursorClicking] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current.length = 0 // Reset array in-place to avoid reference issues
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
    }

    return () => observer.disconnect()
  }, [prefersReducedMotion])

  // Visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimers()
        resetToPlaceholder()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [clearTimers, resetToPlaceholder])

  // Phase runner
  useEffect(() => {
    if (!isInView || prefersReducedMotion) {
      clearTimers()
      isTypingRef.current = false
      resetToPlaceholder()
      return
    }

    const runPhase = () => {
      switch (phase) {
        case "placeholder":
          setShowPlaceholder(true)
          setTypedText("")
          isTypingRef.current = false
          addTimer(() => setPhase("typing"), CONFIG.placeholderDuration)
          break

        case "typing":
          // Prevent duplicate typing loops (React Strict Mode fix)
          if (isTypingRef.current) return
          isTypingRef.current = true

          setShowPlaceholder(false)
          setTypedText("")
          let index = 0
          const text = PROMPTS[promptIndexRef.current]

          const typeChar = () => {
            // Stop if no longer in typing phase or component unmounted
            if (!isTypingRef.current) return

            if (index < text.length) {
              const char = text[index]
              setTypedText((prev) => prev + char)

              let delay = Math.random() * (CONFIG.charDelayMax - CONFIG.charDelayMin) + CONFIG.charDelayMin
              if (".,:;!?".includes(char)) {
                delay *= CONFIG.punctuationFactor
              }

              index++
              addTimer(typeChar, delay)
            } else {
              isTypingRef.current = false
              setPhase("hold")
            }
          }

          typeChar()
          break

        case "hold":
          addTimer(() => setPhase("cursorMove"), CONFIG.holdDuration)
          break

        case "cursorMove":
          // Show cursor at starting position, then animate to target
          setCursorVisible(true)
          setCursorAtTarget(false)

          // Small delay to ensure starting position renders, then move to target
          addTimer(() => {
            setCursorAtTarget(true)
          }, 50)

          addTimer(() => setPhase("hover"), CONFIG.cursorMoveDuration)
          break

        case "hover":
          setSendHovered(true)
          addTimer(() => setPhase("click"), CONFIG.hoverDuration)
          break

        case "click":
          setCursorClicking(true)
          setSendClicked(true)

          addTimer(() => {
            setCursorClicking(false)
            setSendClicked(false)
            setSendHovered(false)
            setPhase("reset")
          }, CONFIG.clickDuration)
          break

        case "reset":
          setTypedText("")
          addTimer(() => setPhase("return"), CONFIG.resetDuration)
          break

        case "return":
          // Move cursor back to starting position
          setCursorAtTarget(false)

          addTimer(() => {
            setCursorVisible(false)
          }, CONFIG.returnDuration - 300)

          addTimer(() => {
            // Cycle to next prompt
            promptIndexRef.current = (promptIndexRef.current + 1) % PROMPTS.length
            setPhase("placeholder")
          }, CONFIG.returnDuration)
          break
      }
    }

    runPhase()

    // Cleanup: clear all timers when effect re-runs or unmounts
    return () => {
      clearTimers()
      isTypingRef.current = false
    }
  }, [phase, isInView, prefersReducedMotion, addTimer, clearTimers, resetToPlaceholder])

  // Start animation when coming into view
  useEffect(() => {
    if (isInView && !prefersReducedMotion) {
      setPhase("placeholder")
    }
  }, [isInView, prefersReducedMotion])

  // If reduced motion, show static placeholder
  if (prefersReducedMotion) {
    return (
      <div className="chat-input-hero-mock hidden md:block" aria-hidden="true">
        <div className="browser-bar">
          <div className="traffic-light traffic-light--red" />
          <div className="traffic-light traffic-light--gray" />
          <div className="traffic-light traffic-light--green" />
        </div>
        <div className="input-area">
          <div className="placeholder-text">Ketik obrolan</div>
          <div className="input-icon input-icon--plus">
            <Plus />
          </div>
          <div className="input-icon input-icon--send">
            <Send />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="chat-input-hero-mock hidden md:block"
      aria-hidden="true"
    >
      {/* Browser Bar */}
      <div className="browser-bar">
        <div className="traffic-light traffic-light--red" />
        <div className="traffic-light traffic-light--gray" />
        <div className="traffic-light traffic-light--green" />
      </div>

      {/* Input Area */}
      <div ref={inputAreaRef} className="input-area">
        {/* Placeholder */}
        <div
          className={cn(
            "placeholder-text hero-text-shimmer transition-opacity",
            showPlaceholder ? "opacity-100" : "opacity-0"
          )}
        >
          Ketik obrolan
        </div>

        {/* Typewriter Text */}
        <div
          className={cn(
            "typewriter-text transition-opacity",
            !showPlaceholder ? "opacity-100" : "opacity-0"
          )}
        >
          <span>{typedText}</span>
          <span className={cn("caret", phase === "typing" && "hero-caret-blink")} />
        </div>

        {/* Corner Icons */}
        <div className="input-icon input-icon--plus">
          <Plus />
        </div>
        <div
          ref={sendIconRef}
          className={cn(
            "input-icon input-icon--send",
            sendHovered && "hovered",
            sendClicked && "clicked"
          )}
        >
          <Send />
        </div>

        {/* Cursor Overlay - positioned via CSS classes */}
        <div
          className={cn(
            "cursor-overlay",
            cursorVisible && "visible",
            cursorAtTarget ? "at-target" : "at-start",
            cursorClicking && "clicking"
          )}
        >
          {/* Cursor pointer SVG - tip at top-left corner for accurate positioning */}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 0 L0 20 L5.5 14.5 L9 22 L12 21 L8.5 13.5 L16 12 Z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
