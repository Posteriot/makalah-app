"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Plus, Send } from "lucide-react"
import { cn } from "@/lib/utils"

const CONFIG = {
  typingText: "Ayo bikin paper. Tapi gue belum punya ide. Bisa, kan? Kita diskusi aja dulu. Sepakat?",
  charDelayMin: 55,
  charDelayMax: 95,
  punctuationFactor: 2.5,
  holdDuration: 1500,
  cursorMoveDuration: 1400,
  hoverDuration: 300,
  clickDuration: 250,
  resetDuration: 600,
  returnDuration: 1200,
  placeholderDuration: 2500,
}

type Phase = "placeholder" | "typing" | "hold" | "cursorMove" | "hover" | "click" | "reset" | "return"

export function ChatInputHeroMock() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sendIconRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<NodeJS.Timeout[]>([])
  const [phase, setPhase] = useState<Phase>("placeholder")
  const [typedText, setTypedText] = useState("")
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
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
    setShowPlaceholder(true)
    setTypedText("")
    setCursorVisible(false)
    setCursorPosition({ x: 0, y: 0 })
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
      resetToPlaceholder()
      return
    }

    const runPhase = () => {
      switch (phase) {
        case "placeholder":
          setShowPlaceholder(true)
          setTypedText("")
          addTimer(() => setPhase("typing"), CONFIG.placeholderDuration)
          break

        case "typing":
          setShowPlaceholder(false)
          setTypedText("")
          let index = 0
          const text = CONFIG.typingText

          const typeChar = () => {
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
              setPhase("hold")
            }
          }

          typeChar()
          break

        case "hold":
          addTimer(() => setPhase("cursorMove"), CONFIG.holdDuration)
          break

        case "cursorMove":
          if (containerRef.current && sendIconRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect()
            const sendRect = sendIconRef.current.getBoundingClientRect()

            const targetX = sendRect.left - containerRect.left + sendRect.width / 2
            const targetY = sendRect.top - containerRect.top + sendRect.height / 2

            setCursorVisible(true)
            setCursorPosition({ x: targetX, y: targetY })
          }

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
          setCursorPosition({ x: 0, y: 0 })

          addTimer(() => {
            setCursorVisible(false)
          }, CONFIG.returnDuration - 300)

          addTimer(() => {
            setPhase("placeholder")
          }, CONFIG.returnDuration)
          break
      }
    }

    runPhase()
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
      <div className="input-area">
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

        {/* Cursor Overlay */}
        <div
          className={cn(
            "cursor-overlay",
            cursorVisible && "visible",
            cursorClicking && "clicking"
          )}
          style={{
            transform: `translate(${cursorPosition.x}px, ${cursorPosition.y}px)`,
            transition: cursorVisible
              ? `transform ${CONFIG.cursorMoveDuration}ms ease-in-out, opacity 300ms`
              : "opacity 300ms",
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
