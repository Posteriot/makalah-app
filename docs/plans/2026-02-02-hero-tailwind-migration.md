# Hero Section Tailwind Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all Hero section components from custom CSS classes to Tailwind utilities, establishing a standard pattern for the design system.

**Architecture:**
1. First, map `--neo-*` CSS variables to `@theme inline` so they become Tailwind utilities
2. Then migrate each component from simplest to most complex
3. Keep animation keyframes in CSS (Tailwind's `animate-[]` will reference them)
4. Clean up unused CSS classes after migration

**Tech Stack:** Tailwind CSS 4, React 19, TypeScript, Next.js 16

---

## Task 1: Add Neo Design Tokens to @theme inline

**Status:** ✅ Done | **Commit:** `f0b1b69`

**Files:**
- Modify: `src/app/globals.css:10-162` (@theme inline section)

**Step 1: Add neo-* color mappings to @theme inline**

Add these lines inside `@theme inline { }` block, after the existing color definitions (around line 73):

```css
  /* Neo-Brutalist Design System */
  --color-neo-card: var(--neo-card-bg);
  --color-neo-border: var(--neo-border);
  --color-neo-shadow: var(--neo-shadow);
  --color-neo-muted: var(--neo-muted);
  --color-neo-text: var(--neo-text);
  --color-neo-text-muted: var(--neo-text-muted);
  --color-neo-input: var(--neo-input-bg);
```

**Step 2: Add neo-specific spacing tokens**

Add these lines after the color mappings:

```css
  /* Neo-Brutalist Spacing */
  --spacing-neo-border: 4px;
  --spacing-neo-border-sm: 3px;
  --spacing-neo-shadow-x: -8px;
  --spacing-neo-shadow-y: 8px;
```

**Step 3: Run build to verify**

Run: `npm run build 2>&1 | head -20`
Expected: "Compiled successfully"

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design-system): add neo-* tokens to Tailwind theme"
```

---

## Task 2: Migrate HeroSubheading

**Status:** ✅ Done | **Commit:** `35b23b5`

**Files:**
- Modify: `src/components/marketing/hero/HeroSubheading.tsx`

**Step 1: Read current implementation**

Current:
```tsx
export function HeroSubheading() {
  return (
    <p className="hero-subheading">
      Nggak perlu prompt ruwet. Ide apapun bakal diolah Agen Makalah AI menjadi paper utuh
    </p>
  )
}
```

**Step 2: Replace with Tailwind utilities**

```tsx
/**
 * HeroSubheading Component
 *
 * Hero section subheading/tagline text
 */
export function HeroSubheading() {
  return (
    <p className="font-mono text-base md:text-lg font-medium text-zinc-600 dark:text-zinc-200 max-w-[520px] leading-relaxed">
      Nggak perlu prompt ruwet. Ide apapun bakal diolah Agen Makalah AI menjadi paper utuh
    </p>
  )
}
```

**Step 3: Run build to verify**

Run: `npm run build 2>&1 | head -20`
Expected: "Compiled successfully"

**Step 4: Commit**

```bash
git add src/components/marketing/hero/HeroSubheading.tsx
git commit -m "refactor(hero): migrate HeroSubheading to Tailwind"
```

---

## Task 3: Migrate HeroHeading

**Status:** ✅ Done | **Commit:** `0351601`

**Files:**
- Modify: `src/components/marketing/hero/HeroHeading.tsx`

**Step 1: Read current implementation**

Current uses `hero-heading hero-heading--svg` classes.

**Step 2: Replace with Tailwind utilities**

```tsx
"use client"

import { HeroHeadingSvg } from "@/components/marketing/hero/HeroHeadingSvg"

/**
 * HeroHeading Component
 *
 * Main hero heading with accessible screen reader text and SVG display
 */
export function HeroHeading() {
  return (
    <h1 className="text-[0px] leading-[0]">
      <span className="sr-only">
        Ngobrol+Riset +Brainstorming =Paper_Akademik
      </span>
      <HeroHeadingSvg />
    </h1>
  )
}
```

**Step 3: Run build to verify**

Run: `npm run build 2>&1 | head -20`
Expected: "Compiled successfully"

**Step 4: Commit**

```bash
git add src/components/marketing/hero/HeroHeading.tsx
git commit -m "refactor(hero): migrate HeroHeading to Tailwind"
```

---

## Task 4: Migrate HeroHeadingSvg

**Status:** ✅ Done | **Commit:** `b5445ec`

**Files:**
- Modify: `src/components/marketing/hero/HeroHeadingSvg.tsx`

**Step 1: Replace with Tailwind utilities**

```tsx
"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type HeroHeadingSvgProps = {
  className?: string
}

export function HeroHeadingSvg({ className }: HeroHeadingSvgProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Text color based on theme
  const textColor = mounted && resolvedTheme === "light" ? "#191921" : "#e6e7e8"
  const accentColor = "#ee4036" // Red for + = _

  return (
    <span
      className={cn("block w-full max-w-[720px] h-auto", className)}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 260.23 97.97"
        className="w-full h-auto max-h-[35vh] object-contain lg:max-h-none"
        style={{
          fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace",
          fontSize: "31.24px",
          fontWeight: 500,
          letterSpacing: "-0.05em",
        }}
      >
        <text x="1.11" y="28.48" fill={textColor}>
          Ngobrol
          <tspan fill={accentColor}>+</tspan>
          Riset
        </text>
        <text x="1.11" y="58.48" fill={textColor}>
          <tspan fill={accentColor}>+</tspan>
          Brainstorming
        </text>
        <text x="1.11" y="88.48" fill={textColor}>
          <tspan fill={accentColor}>=</tspan>
          Paper
          <tspan fill={accentColor}>_</tspan>
          Akademik
        </text>
      </svg>
    </span>
  )
}
```

**Step 2: Run build to verify**

Run: `npm run build 2>&1 | head -20`
Expected: "Compiled successfully"

**Step 3: Commit**

```bash
git add src/components/marketing/hero/HeroHeadingSvg.tsx
git commit -m "refactor(hero): migrate HeroHeadingSvg to Tailwind"
```

---

## Task 5: Cleanup HeroCTA

**Status:** ✅ Done (Verified) | **Commit:** `f5e1ea5`

**Files:**
- Modify: `src/components/marketing/hero/HeroCTA.tsx`

**Step 1: Current implementation analysis**

Current uses `btn-brand` (global component class) + Tailwind utilities. The `btn-brand` class is a shared button style used across the app, so we keep it.

**Step 2: No changes needed**

The current implementation is correct:
- `btn-brand` is a design system component class (defined in `@layer components`)
- Additional Tailwind utilities for sizing are appropriate

Current code is already optimal. Skip to commit.

**Step 3: Commit (documentation only)**

```bash
git commit --allow-empty -m "docs(hero): verify HeroCTA uses design system correctly"
```

---

## Task 6: Cleanup PawangBadge

**Status:** ✅ Done | **Commit:** `377aab4`

**Files:**
- Modify: `src/components/marketing/hero/PawangBadge.tsx`

**Step 1: Current implementation analysis**

Current uses `badge-link` class which only has mobile-specific styles in `.hero-left .badge-link`. The inline Tailwind is already comprehensive.

**Step 2: Remove unused badge-link class**

```tsx
"use client"

import Link from "next/link"

/**
 * PawangBadge - Hero badge linking to About page
 * Displays "Anda Pawang, Ai Tukang" tagline with animated blinking orange dot
 * Theme-aware: dark bg + light text in both modes for strong visibility
 */
export function PawangBadge() {
  return (
    <Link
      href="/about"
      className="inline-block mb-[18px] lg:mb-0"
    >
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a7d6e] transition-all duration-300 hover:translate-y-[-2px] hover:bg-[#339485]">
        {/* Animated orange dot */}
        <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-[badge-dot-blink_1.5s_ease-in-out_infinite]" />
        {/* Badge text */}
        <span className="text-[10px] font-medium tracking-wide text-white/95 uppercase">
          Anda Pawang, Ai Tukang
        </span>
      </div>
    </Link>
  )
}
```

**Step 3: Run build to verify**

Run: `npm run build 2>&1 | head -20`
Expected: "Compiled successfully"

**Step 4: Commit**

```bash
git add src/components/marketing/hero/PawangBadge.tsx
git commit -m "refactor(hero): cleanup PawangBadge, remove unused class"
```

---

## Task 7: Migrate HeroResearchMock

**Status:** ✅ Done | **Commit:** `48ea903`

**Files:**
- Modify: `src/components/marketing/hero/HeroResearchMock.tsx`

**Step 1: Replace neo-* CSS classes with Tailwind utilities**

```tsx
"use client"

import { cn } from "@/lib/utils"

/**
 * HeroResearchMock - Paper Progress Preview with Neo-Brutalist styling
 * Back layer mockup showing paper writing progress timeline
 */

type StageState = "completed" | "current" | "pending"

interface MockStage {
  name: string
  state: StageState
}

const MOCK_STAGES: MockStage[] = [
  { name: "Gagasan Paper", state: "completed" },
  { name: "Penentuan Topik", state: "completed" },
  { name: "Menyusun Outline", state: "completed" },
  { name: "Penyusunan Abstrak", state: "completed" },
  { name: "Pendahuluan", state: "current" },
  { name: "Tinjauan Literatur", state: "pending" },
]

const MOCK_PROGRESS = { percent: 38, current: 5, total: 13 }

export function HeroResearchMock() {
  return (
    <div
      className={cn(
        "hidden md:block absolute w-full font-mono",
        "bg-neo-card border-[4px] border-neo-border rounded-lg",
        "shadow-[var(--spacing-neo-shadow-x)_var(--spacing-neo-shadow-y)_0_var(--neo-shadow)]",
        "backdrop-blur-sm",
        // layer-back positioning
        "z-10 -top-10 scale-[0.88] -translate-x-[60px]"
      )}
    >
      {/* Browser Header */}
      <div className="flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px] border-neo-shadow">
        {/* Traffic lights */}
        <div className="flex gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border-[3px] border-neo-shadow" />
          <span className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border-[3px] border-neo-shadow" />
          <span className="w-3.5 h-3.5 rounded-full bg-[#27c93f] border-[3px] border-neo-shadow" />
        </div>
        {/* URL bar */}
        <div className="font-mono text-xs font-semibold text-neo-text bg-white/90 dark:bg-zinc-800 px-3.5 py-1.5 rounded border-[3px] border-neo-shadow">
          makalah.ai/paper
        </div>
      </div>

      {/* Content */}
      <div className="p-5 font-mono text-neo-text">
        {/* Progress Header */}
        <div className="mb-4">
          <div className="text-sm font-bold mb-1 text-neo-text">Progress</div>
          <div className="text-xs truncate mb-3 text-neo-text-muted">
            Dampak AI pada Pendidikan Tinggi
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-neo-muted border-[3px] border-neo-border overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${MOCK_PROGRESS.percent}%` }}
            />
          </div>
          <div className="text-[10px] text-right mt-1 text-neo-text">
            {MOCK_PROGRESS.percent}% &middot; Stage {MOCK_PROGRESS.current}/{MOCK_PROGRESS.total}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-0 font-mono">
          {MOCK_STAGES.map((stage, index) => {
            const isLast = index === MOCK_STAGES.length - 1
            const statusText =
              stage.state === "completed"
                ? "DONE"
                : stage.state === "current"
                  ? "IN PROGRESS"
                  : undefined

            return (
              <div key={stage.name} className="flex gap-3 relative">
                {/* Dot & Line Column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border-[3px] border-neo-border flex-shrink-0 z-[1]",
                      stage.state === "completed" && "bg-success",
                      stage.state === "current" && "bg-primary ring-4 ring-primary/30",
                      stage.state === "pending" && "bg-transparent"
                    )}
                  />
                  {!isLast && (
                    <div
                      className={cn(
                        "w-[3px] flex-1 min-h-5",
                        stage.state === "completed" ? "bg-success" : "bg-neo-border"
                      )}
                    />
                  )}
                </div>

                {/* Label Column */}
                <div className={cn("pb-4", isLast && "pb-0")}>
                  <div
                    className={cn(
                      "font-mono text-xs font-semibold",
                      stage.state === "current" && "text-primary font-bold",
                      stage.state === "pending" && "text-neo-text-muted",
                      stage.state === "completed" && "text-neo-text"
                    )}
                  >
                    {index + 1}. {stage.name}
                  </div>
                  {statusText && (
                    <div
                      className={cn(
                        "font-mono text-[10px] font-medium mt-0.5 uppercase tracking-wide",
                        stage.state === "completed" && "text-success",
                        stage.state === "current" && "text-primary"
                      )}
                    >
                      {statusText}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* More stages indicator */}
        <div className="font-mono text-[11px] font-semibold text-neo-text-muted text-center pt-2.5 pb-1 border-t-[3px] border-dashed border-neo-border mt-3">
          +7 tahap lagi
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Run build to verify**

Run: `npm run build 2>&1 | head -20`
Expected: "Compiled successfully"

**Step 3: Commit**

```bash
git add src/components/marketing/hero/HeroResearchMock.tsx
git commit -m "refactor(hero): migrate HeroResearchMock to Tailwind"
```

---

## Task 8: Migrate ChatInputHeroMock

**Status:** ✅ Done | **Commit:** `d7659ce`

**Files:**
- Modify: `src/components/marketing/hero/ChatInputHeroMock.tsx`

**Step 1: Replace neo-* CSS classes with Tailwind utilities**

This is the most complex component. Key changes:
- Replace `neo-card`, `neo-header`, `neo-content` with Tailwind
- Keep animation class references (`hero-caret-blink`) as they reference keyframes
- Replace state classes (`hovered`, `clicked`, `visible`, etc.) with Tailwind conditional classes

```tsx
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Send } from "lucide-react"
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
            <Send size={18} />
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
          <Send size={18} />
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
```

**Step 2: Run build to verify**

Run: `npm run build 2>&1 | head -20`
Expected: "Compiled successfully"

**Step 3: Commit**

```bash
git add src/components/marketing/hero/ChatInputHeroMock.tsx
git commit -m "refactor(hero): migrate ChatInputHeroMock to Tailwind"
```

---

## Task 9: Create Barrel Export

**Status:** ✅ Done | **Commit:** `d6e3f19`

**Files:**
- Create: `src/components/marketing/hero/index.ts`

**Step 1: Create barrel export file**

```ts
export { ChatInputHeroMock } from "./ChatInputHeroMock"
export { HeroCTA } from "./HeroCTA"
export { HeroHeading } from "./HeroHeading"
export { HeroHeadingSvg } from "./HeroHeadingSvg"
export { HeroResearchMock } from "./HeroResearchMock"
export { HeroSubheading } from "./HeroSubheading"
export { PawangBadge } from "./PawangBadge"
```

**Step 2: Update page.tsx imports**

Modify `src/app/(marketing)/page.tsx`:

```tsx
import { Suspense } from "react"
import {
  PawangBadge,
  ChatInputHeroMock,
  HeroResearchMock,
  HeroHeading,
  HeroSubheading,
  HeroCTA,
} from "@/components/marketing/hero"
import { BenefitsSection } from "@/components/marketing/benefits"
import { PricingTeaser } from "@/components/marketing/PricingTeaser"
import { WaitlistToast } from "@/components/marketing/WaitlistToast"

// ... rest of file unchanged
```

**Step 3: Run build to verify**

Run: `npm run build 2>&1 | head -20`
Expected: "Compiled successfully"

**Step 4: Commit**

```bash
git add src/components/marketing/hero/index.ts src/app/\(marketing\)/page.tsx
git commit -m "refactor(hero): add barrel export for cleaner imports"
```

---

## Task 10: Cleanup Unused CSS

**Status:** ✅ Done | **Commit:** `098b5ac`

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Identify CSS classes to remove**

After migration, these hero-specific classes are no longer used in components:
- `.hero-heading` (lines 1275-1283)
- `.hero-heading--svg` (lines 1285-1288)
- `.hero-heading-svg` (lines 1290-1294, 1318-1321)
- `.hero-heading-svg__img` (lines 1296-1299, 1232-1238)
- `.hero-subheading` (lines 1327-1352)
- `.neo-card` through `.neo-more-stages` (lines 1519-1728)
- `.neo-chat-content` through `.neo-chat-cursor` (lines 1735-1891)
- `.layer-back`, `.layer-front` positioning (lines 1894-1927)

**Step 2: DO NOT remove these (still used elsewhere or in page.tsx)**

Keep in globals.css:
- `.hero-section`, `.hero-flex`, `.hero-left`, `.hero-right` (layout classes used in page.tsx)
- `.hero-vivid`, `.hero-vignette`, `.hero-grid-thin` (background effects)
- `.hero-diagonal-stripes`, `.hero-ide-line-y`, `.hero-fade-bottom` (decorative)
- `.hero-actions` (used in page.tsx)
- `.mockup-layered-container` (used in page.tsx)
- `.hero-mockup` base styles (extended by components)
- Keyframe animations (`@keyframes neo-shimmer`, `neo-dot-pulse`, `hero-caret-blink`, `badge-dot-blink`)

**Step 3: Add comment marking deprecated classes**

Add this comment before the neo-* section that can be removed later:

```css
/* ==========================================================================
 * DEPRECATED: Neo-Brutalist Classes (migrated to Tailwind)
 * These classes are kept for backwards compatibility.
 * TODO: Remove after verifying all components use Tailwind utilities.
 * ========================================================================== */
```

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "docs(css): mark deprecated neo-* classes for future removal"
```

---

## Task 11: Final Verification

**Status:** ✅ Done | **Commit:** `c8eb24f`

**Step 1: Run full build**

Run: `npm run build`
Expected: Build completes successfully with no errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: No linting errors

**Step 3: Visual verification**

Run: `npm run dev`

Check in browser:
- [ ] Hero section renders correctly on desktop
- [ ] Hero section renders correctly on mobile (mockups hidden)
- [ ] Light mode colors correct
- [ ] Dark mode colors correct
- [ ] Chat mockup animation works
- [ ] Badge dot blinks
- [ ] Hover states work on badge and CTA

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(hero): complete Tailwind migration

- Add neo-* design tokens to @theme inline
- Migrate all hero components to Tailwind utilities
- Add barrel export for cleaner imports
- Mark deprecated CSS classes for future cleanup

BREAKING CHANGE: None - visual output unchanged"
```

---

## Summary

| Task | Component | Complexity |
|------|-----------|------------|
| 1 | Token mapping | Low |
| 2 | HeroSubheading | Low |
| 3 | HeroHeading | Low |
| 4 | HeroHeadingSvg | Low |
| 5 | HeroCTA | Skip (already done) |
| 6 | PawangBadge | Low |
| 7 | HeroResearchMock | Medium |
| 8 | ChatInputHeroMock | High |
| 9 | Barrel export | Low |
| 10 | CSS cleanup | Low |
| 11 | Final verification | - |

**Total commits:** 10
**Estimated tasks:** 11
