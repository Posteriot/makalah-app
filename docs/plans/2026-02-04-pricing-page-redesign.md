# Pricing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesain halaman `/pricing` menggunakan Tailwind classes dan React background components, konsisten dengan PricingTeaser dan home page.

**Architecture:** Single section layout (tanpa hero terpisah) dengan GridPattern + DottedPattern backgrounds. Card styling mengikuti TeaserCard dengan tambahan CTA button. Semua custom CSS pricing di globals.css akan dihapus.

**Tech Stack:** Next.js, React, Tailwind CSS, existing React background components (GridPattern, DottedPattern)

---

## Task 1: Create Git Branch ✅ DONE

**Step 1: Create feature branch**

Run: `git checkout -b redesign/pricing-page`

**Step 2: Verify branch**

Run: `git branch --show-current`
Expected: `redesign/pricing-page`

---

## Task 2: Fix Header Active State (Orange → Gray) ✅ DONE

**Files:**
- Modify: `src/app/globals.css:600-607`

**Step 1: Update nav-link.active color**

Change line 600-602 from:
```css
.nav-link.active {
  color: var(--brand);
}
```

To:
```css
.nav-link.active {
  color: var(--muted-foreground);
}
```

**Step 2: Update nav-link.active::after border color**

Change line 604-607 from:
```css
.nav-link.active::after {
  transform: scaleX(1);
  border-bottom-color: var(--brand);
}
```

To:
```css
.nav-link.active::after {
  transform: scaleX(1);
  border-bottom-color: var(--muted-foreground);
}
```

**Step 3: Verify change**

Run: `npm run dev` dan buka browser ke `/pricing`, cek nav link "Harga" sekarang gray bukan orange.

---

## Task 3: Create New PricingCard Component ✅ DONE

**Files:**
- Create: `src/components/marketing/pricing/PricingCard.tsx`

**Step 1: Create pricing directory**

Run: `mkdir -p src/components/marketing/pricing`

**Step 2: Create PricingCard.tsx**

```tsx
"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

type PricingPlan = {
  _id: string
  name: string
  slug: string
  price: string
  unit?: string
  isHighlighted: boolean
}

// ════════════════════════════════════════════════════════════════
// Helper: Get card content per tier
// ════════════════════════════════════════════════════════════════

function getCardContent(slug: string): { description: string; creditNote: string } {
  switch (slug) {
    case "gratis":
      return {
        description: "Cocok untuk mencoba 13 tahap workflow dan menyusun draft awal tanpa biaya.",
        creditNote: "Mendapat 50 kredit, untuk diksusi dan membentuk draft",
      }
    case "bpp":
      return {
        description: "Tepat untuk menyelesaikan satu paper utuh hingga ekspor Word/PDF.",
        creditNote: "Mendapat 300 kredit, untuk menyusun 1 paper setara 15 halaman A4 dan dikusi kontekstual.",
      }
    case "pro":
      return {
        description: "Ideal untuk penyusunan banyak paper dengan diskusi sepuasnya.",
        creditNote: "Mendapat 2000 kredit, untuk menyusun 5-6 paper setara @15 halaman dan diskusi mendalam",
      }
    default:
      return {
        description: "",
        creditNote: "",
      }
  }
}

// ════════════════════════════════════════════════════════════════
// CTA Component with Auth-Aware Redirect
// ════════════════════════════════════════════════════════════════

function PricingCTA({ slug, isHighlighted }: { slug: string; isHighlighted: boolean }) {
  const { isSignedIn } = useUser()

  const getDestination = (): string => {
    switch (slug) {
      case "gratis":
        return "/get-started"
      case "bpp":
        return "/checkout/bpp"
      case "pro":
        return "/checkout/pro"
      default:
        return "/get-started"
    }
  }

  const getHref = (): string => {
    const dest = getDestination()
    if (!isSignedIn) {
      return `/sign-up?redirect=${encodeURIComponent(dest)}`
    }
    return dest
  }

  const getCtaText = (): string => {
    switch (slug) {
      case "gratis":
        return "Mulai Gratis"
      case "bpp":
        return "Beli Kredit"
      case "pro":
        return "Segera Hadir"
      default:
        return "Mulai"
    }
  }

  // PRO is always disabled (coming soon)
  if (slug === "pro") {
    return (
      <button
        disabled
        className={cn(
          "w-full py-2.5 px-4 rounded-lg text-sm font-semibold",
          "bg-black/5 dark:bg-white/5",
          "border border-black/10 dark:border-white/10",
          "text-muted-foreground cursor-not-allowed opacity-60"
        )}
      >
        {getCtaText()}
      </button>
    )
  }

  return (
    <Link
      href={getHref()}
      className={cn(
        "w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-center",
        "transition-all duration-200",
        isHighlighted
          ? "bg-[var(--brand)] text-white shadow-[0_4px_20px_rgba(232,102,9,0.2)] hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(232,102,9,0.4)]"
          : "bg-transparent border border-black/20 dark:border-white/30 text-foreground hover:bg-black/5 dark:hover:bg-white/5"
      )}
    >
      {getCtaText()}
    </Link>
  )
}

// ════════════════════════════════════════════════════════════════
// Main PricingCard Component
// ════════════════════════════════════════════════════════════════

export function PricingCard({ plan }: { plan: PricingPlan }) {
  const content = getCardContent(plan.slug)

  return (
    <div className="relative h-full">
      {/* Popular tag for highlighted card */}
      {plan.isHighlighted && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 z-10",
            "bg-emerald-600 text-white",
            "text-[11px] font-semibold uppercase tracking-wide",
            "px-3 py-1 rounded-full whitespace-nowrap"
          )}
        >
          Solusi Terbaik
        </div>
      )}

      <div
        className={cn(
          "group relative overflow-hidden h-full min-h-[280px] md:min-h-[320px] flex flex-col p-4 md:p-8 rounded-lg",
          "border border-black/20 dark:border-white/25",
          "hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-[rgba(255,255,255,0.03)]",
          "hover:border-black/30 dark:hover:border-white/35",
          "hover:-translate-y-1 transition-all duration-300",
          plan.isHighlighted && "border-2 border-emerald-600 dark:border-emerald-500"
        )}
      >
        {/* Plan name */}
        <h3 className="font-sans font-light text-xl md:text-2xl text-foreground mb-3 text-center mt-4 md:mt-0">
          {plan.name}
        </h3>

        {/* Price */}
        <p className="font-mono text-3xl md:text-5xl tracking-tight text-foreground text-center mb-6">
          {plan.price}
          {plan.unit && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {plan.unit}
            </span>
          )}
        </p>

        {/* Description with dot indicator */}
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 min-w-2 rounded-full mt-2 bg-[var(--color-dot-light)] dark:bg-[var(--color-dot)] animate-[badge-dot-blink_1.5s_ease-in-out_infinite] shadow-[0_0_8px_var(--color-dot-light)] dark:shadow-[0_0_8px_var(--color-dot)]" />
          <p className="font-mono font-normal text-sm md:text-base leading-relaxed text-foreground">
            {content.description}
          </p>
        </div>

        {/* Credit note */}
        <p className="font-mono text-xs leading-relaxed text-muted-foreground mt-4 pt-3 flex-1">
          {content.creditNote}
        </p>

        {/* CTA Button */}
        <div className="mt-6">
          <PricingCTA slug={plan.slug} isHighlighted={plan.isHighlighted} />
        </div>
      </div>
    </div>
  )
}
```

---

## Task 4: Create PricingCarousel Component ✅ DONE

**Files:**
- Create: `src/components/marketing/pricing/PricingCarousel.tsx`

**Step 1: Create PricingCarousel.tsx**

```tsx
"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { PricingCard } from "./PricingCard"

type PricingPlan = {
  _id: string
  name: string
  slug: string
  price: string
  unit?: string
  isHighlighted: boolean
}

export function PricingCarousel({ plans }: { plans: PricingPlan[] }) {
  // Start at highlighted plan (BPP)
  const highlightedIndex = plans.findIndex((p) => p.isHighlighted)
  const [activeSlide, setActiveSlide] = useState(
    highlightedIndex >= 0 ? highlightedIndex : 0
  )
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  const clampIndex = useCallback(
    (index: number) => {
      if (plans.length === 0) return 0
      return Math.max(0, Math.min(index, plans.length - 1))
    },
    [plans.length]
  )

  const handleSwipe = useCallback(
    (diff: number) => {
      const threshold = 48
      if (Math.abs(diff) < threshold) return
      setActiveSlide((current) => {
        const direction = diff > 0 ? 1 : -1
        return clampIndex(current + direction)
      })
    },
    [clampIndex]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      startXRef.current = event.clientX
      isDraggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    []
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || startXRef.current === null) return
      const diff = startXRef.current - event.clientX
      handleSwipe(diff)
      isDraggingRef.current = false
      startXRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [handleSwipe]
  )

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || startXRef.current === null) return
      const diff = startXRef.current - event.clientX
      handleSwipe(diff)
      isDraggingRef.current = false
      startXRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    [handleSwipe]
  )

  return (
    <div className="md:hidden relative overflow-x-hidden overflow-y-visible pt-7">
      <div
        className="flex transition-transform duration-300 ease-out touch-pan-y will-change-transform overflow-visible"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {plans.map((plan) => (
          <div key={plan._id} className="flex-[0_0_100%] px-2 box-border">
            <PricingCard plan={plan} />
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {plans.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(clampIndex(index))}
            className={cn(
              "w-2.5 h-2.5 rounded-full border-none cursor-pointer transition-all duration-200",
              activeSlide === index
                ? "bg-[var(--brand)] scale-120"
                : "bg-gray-500/40"
            )}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## Task 5: Create PricingSkeleton Component ✅ DONE

**Files:**
- Create: `src/components/marketing/pricing/PricingSkeleton.tsx`

**Step 1: Create PricingSkeleton.tsx**

```tsx
export function PricingSkeleton() {
  return (
    <div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative h-full min-h-[280px] md:min-h-[320px] flex flex-col p-4 md:p-8 rounded-lg border border-black/20 dark:border-white/25 animate-pulse"
        >
          {/* Plan name skeleton */}
          <div className="h-7 bg-muted rounded w-24 mx-auto mb-3 mt-4 md:mt-0" />

          {/* Price skeleton */}
          <div className="h-12 bg-muted rounded w-32 mx-auto mb-6" />

          {/* Description skeleton */}
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-muted mt-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>

          {/* Credit note skeleton */}
          <div className="mt-4 pt-3 flex-1">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-4/5 mt-2" />
          </div>

          {/* CTA skeleton */}
          <div className="mt-6 h-10 bg-muted rounded w-full" />
        </div>
      ))}
    </div>
  )
}
```

---

## Task 6: Create Barrel Export ✅ DONE

**Files:**
- Create: `src/components/marketing/pricing/index.ts`

**Step 1: Create index.ts**

```ts
export { PricingCard } from "./PricingCard"
export { PricingCarousel } from "./PricingCarousel"
export { PricingSkeleton } from "./PricingSkeleton"
```

---

## Task 7: Rewrite Pricing Page ✅ DONE

**Files:**
- Modify: `src/app/(marketing)/pricing/page.tsx`

**Step 1: Replace entire file content**

```tsx
"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { SectionBadge } from "@/components/ui/section-badge"
import { GridPattern, DottedPattern } from "@/components/marketing/SectionBackground"
import { PricingCard, PricingCarousel, PricingSkeleton } from "@/components/marketing/pricing"

export default function PricingPage() {
  const plans = useQuery(api.pricingPlans.getActivePlans)

  return (
    <section
      className="relative min-h-[580px] md:min-h-[700px] flex flex-col justify-center px-4 md:px-6 overflow-hidden bg-muted/30 dark:bg-black"
      style={{ paddingTop: "calc(var(--header-h) + 20px)" }}
      id="pricing"
    >
      {/* Background patterns - using memoized React components */}
      <GridPattern size={48} className="z-0" />
      <DottedPattern spacing={24} withRadialMask={false} className="z-0" />

      <div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col items-start gap-3 md:gap-4 mb-6 md:mb-8">
          <SectionBadge>Pemakaian & Harga</SectionBadge>
          <h1 className="font-mono text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-foreground leading-tight">
            Tak Perlu Bayar Mahal
            <br />
            Untuk Karya Yang Masuk Akal
          </h1>
          <p className="font-mono text-sm md:text-base text-muted-foreground max-w-xl">
            Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang
            gratisan? Boleh! Atau langsung bayar per paper? Aman!
          </p>
        </div>

        {/* Loading state */}
        {plans === undefined && <PricingSkeleton />}

        {/* Empty state */}
        {plans && plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Paket harga sedang disiapkan. Silakan cek kembali nanti.
            </p>
          </div>
        )}

        {/* Loaded state with data */}
        {plans && plans.length > 0 && (
          <>
            {/* Desktop: Grid */}
            <div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
              {plans.map((plan) => (
                <PricingCard key={plan._id} plan={plan} />
              ))}
            </div>

            {/* Mobile: Carousel */}
            <PricingCarousel plans={plans} />
          </>
        )}
      </div>
    </section>
  )
}
```

---

## Task 8: Clean Up Custom CSS in globals.css ✅ DONE

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Delete pricing CSS block**

Remove lines 1478-1983 (entire `section.pricing` block and all `.pricing-*` styles including light/dark mode variants).

This includes:
- `section.pricing` base styles
- `.pricing .grid-thin`
- `.pricing .bg-dot-grid`
- `.pricing-container`
- `.pricing .section-header`
- `.pricing .badge-group`
- `.pricing .badge-dot`
- `.pricing .badge-text`
- `.pricing .section-title`
- `.pricing .pricing-grid`
- `.pricing .pricing-card` (all variants)
- `.pricing .popular-tag`
- `.pricing .card-content` (all variants)
- `.pricing .card-header`
- `.pricing .price`
- `.pricing .price-features`
- `.pricing .btn` (all variants)
- `.pricing .pricing-carousel`
- `.pricing .carousel-*`
- All `:root .pricing` light mode overrides
- All `.dark .pricing` dark mode overrides

**Step 2: Verify no broken references**

Run: `grep -r "pricing-card\|pricing-grid\|pricing-carousel" src/`
Expected: No matches (all references should be removed)

---

## Task 9: Verify Build ✅ DONE

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 3: Manual testing**

Run: `npm run dev`

Verify:
1. `/pricing` page loads correctly
2. Background patterns (grid + dots) visible
3. Cards display with correct content
4. CTA buttons work (auth-aware redirect)
5. Mobile carousel swipes correctly
6. Header nav link "Harga" is gray (not orange) when active
7. Light/dark mode both work correctly

---

## Task 10: Final Review (NO COMMIT) ✅ DONE

**Step 1: Review all changes**

Run: `git diff`

Verify changes match plan expectations.

**Step 2: Wait for user approval**

DO NOT commit. Wait for user to review and approve before any git operations.

---

## Files Changed Summary

| Action | File |
|--------|------|
| Modify | `src/app/globals.css` (nav-link.active + delete pricing CSS) |
| Create | `src/components/marketing/pricing/PricingCard.tsx` |
| Create | `src/components/marketing/pricing/PricingCarousel.tsx` |
| Create | `src/components/marketing/pricing/PricingSkeleton.tsx` |
| Create | `src/components/marketing/pricing/index.ts` |
| Modify | `src/app/(marketing)/pricing/page.tsx` |
