# Pricing Flow Redesign - Implementation Tasks

**Goal:** Implementasi pricing flow redesign untuk mengatasi redundansi homepage/pricing dan membuat checkout flow yang unified.

**Architecture:**
- Diferensiasi konten: Homepage teaser vs Pricing page full
- Route group `(onboarding)` baru dengan minimal layout
- Database flag `hasCompletedOnboarding` untuk first-time detection
- Redirect preservation via `?redirect=` query parameter

**Tech Stack:** Next.js 16 App Router, React 19, Convex, Clerk, Tailwind CSS 4

**Reference:**
- [README.md](./README.md) - Keputusan desain lengkap
- [wireframes.md](./wireframes.md) - Visual wireframes
- [design-system.md](../visual-design/home/design-system.md) - Design tokens

**Out of Scope (v1):**
- FAQ section di pricing page (opsional, iterasi berikutnya)
- Comparison table (opsional, iterasi berikutnya)

---

## Task Overview

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | T1.1 - T1.3 | Database & Schema Changes |
| 2 | T2.1 - T2.4 | Onboarding Route Group & Layout |
| 3 | T3.1 - T3.3 | Onboarding Pages |
| 4 | T4.1 - T4.2 | Marketing Pages Redesign |
| 5 | T5.1 - T5.3 | Redirect Logic & Integration |
| 6 | T6.1 - T6.2 | Testing & Cleanup |

---

## Phase 1: Database & Schema Changes

### Task 1.1: Add `hasCompletedOnboarding` field to users schema

**Status:** Done

**Files:**
- [x] Modify: `convex/schema.ts:50-66`

**Step 1: Add field to users table**

```typescript
// convex/schema.ts - dalam defineTable users
users: defineTable({
  clerkUserId: v.string(),
  email: v.string(),
  role: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  emailVerified: v.boolean(),
  subscriptionStatus: v.string(),
  createdAt: v.number(),
  lastLoginAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  xenditCustomerId: v.optional(v.string()),
  // NEW: Onboarding completion flag
  hasCompletedOnboarding: v.optional(v.boolean()), // default: false/undefined
})
```

**Step 2: Verify schema push**

Run: `npm run convex:dev`
Expected: Schema syncs without error

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add hasCompletedOnboarding flag to users table"
```

---

### Task 1.2: Create Convex mutation for setting onboarding completion

**Status:** Done

**Files:**
- [x] Modify: `convex/users.ts` (add mutation and query)

**Step 1: Add mutation to users.ts**

```typescript
// convex/users.ts - tambahkan mutation baru

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) throw new Error("User not found")

    await ctx.db.patch(user._id, {
      hasCompletedOnboarding: true,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})
```

**Step 2: Add query for checking onboarding status**

```typescript
export const getOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { hasCompleted: false, isAuthenticated: false }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) return { hasCompleted: false, isAuthenticated: true }

    return {
      hasCompleted: user.hasCompletedOnboarding ?? false,
      isAuthenticated: true,
    }
  },
})
```

**Step 3: Commit**

```bash
git add convex/users.ts
git commit -m "feat(convex): add onboarding status query and mutation"
```

---

### Task 1.3: Create hook for onboarding status

**Status:** Done

**Files:**
- [x] Create: `src/lib/hooks/useOnboardingStatus.ts`

**Step 1: Create the hook**

```typescript
// src/lib/hooks/useOnboardingStatus.ts
"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCallback } from "react"

export function useOnboardingStatus() {
  const status = useQuery(api.users.getOnboardingStatus)
  const completeOnboardingMutation = useMutation(api.users.completeOnboarding)

  const completeOnboarding = useCallback(async () => {
    await completeOnboardingMutation()
  }, [completeOnboardingMutation])

  return {
    isLoading: status === undefined,
    isAuthenticated: status?.isAuthenticated ?? false,
    hasCompletedOnboarding: status?.hasCompleted ?? false,
    completeOnboarding,
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/hooks/useOnboardingStatus.ts
git commit -m "feat(hooks): add useOnboardingStatus hook"
```

---

## Phase 2: Onboarding Route Group & Layout

### Task 2.1: Create `(onboarding)` route group folder structure

**Status:** Done

**Files:**
- [x] Create: `src/app/(onboarding)/layout.tsx`
- [x] Create: `src/app/(onboarding)/get-started/page.tsx` (placeholder)
- [x] Create: `src/app/(onboarding)/checkout/bpp/page.tsx` (placeholder)
- [x] Create: `src/app/(onboarding)/checkout/pro/page.tsx` (placeholder)

**Step 1: Create folder structure**

```bash
mkdir -p src/app/\(onboarding\)/get-started
mkdir -p src/app/\(onboarding\)/checkout/bpp
mkdir -p src/app/\(onboarding\)/checkout/pro
```

**Step 2: Create placeholder pages**

```typescript
// src/app/(onboarding)/get-started/page.tsx
export default function GetStartedPage() {
  return <div>Get Started - Coming Soon</div>
}
```

```typescript
// src/app/(onboarding)/checkout/bpp/page.tsx
export default function CheckoutBPPPage() {
  return <div>Checkout BPP - Coming Soon</div>
}
```

```typescript
// src/app/(onboarding)/checkout/pro/page.tsx
export default function CheckoutPROPage() {
  return <div>Checkout PRO - Coming Soon</div>
}
```

**Step 3: Commit**

```bash
git add src/app/\(onboarding\)
git commit -m "feat(routes): create onboarding route group structure"
```

---

### Task 2.2: Create OnboardingLayout with minimal header

**Status:** Done

**Files:**
- [x] Modify: `src/app/(onboarding)/layout.tsx`
- [x] Create: `src/components/onboarding/OnboardingHeader.tsx`

**Step 1: Create OnboardingHeader component**

```typescript
// src/components/onboarding/OnboardingHeader.tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { X } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname, useRouter } from "next/navigation"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

export function OnboardingHeader() {
  const { resolvedTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const { completeOnboarding } = useOnboardingStatus()

  // Determine close destination based on current path
  const getCloseDestination = () => {
    if (pathname.startsWith("/checkout")) return "/pricing"
    return "/" // from /get-started go to homepage
  }

  const handleClose = async () => {
    // Set hasCompletedOnboarding = true when closing from /get-started
    // This ensures user won't see welcome page again
    if (pathname === "/get-started") {
      await completeOnboarding()
    }
    router.push(getCloseDestination())
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="h-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo/makalah_logo_500x500.png"
            alt="Makalah AI"
            width={32}
            height={32}
            className="rounded-md"
          />
          <Image
            src={resolvedTheme === "dark"
              ? "/makalah_brand_text_dark.svg"
              : "/makalah_brand_text.svg"
            }
            alt="Makalah AI"
            width={100}
            height={24}
            className="hidden sm:block"
          />
        </Link>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
```

**Step 2: Create OnboardingLayout**

```typescript
// src/app/(onboarding)/layout.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  // Protected route - redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingHeader />
      <main className="pt-16">
        <div className="max-w-[600px] mx-auto px-6 py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingHeader.tsx
git add src/app/\(onboarding\)/layout.tsx
git commit -m "feat(onboarding): add OnboardingLayout with minimal header"
```

---

### Task 2.3: Add authentication protection to onboarding layout

**Status:** Done (implemented in Task 2.2)

**Files:**
- [x] Already done in Task 2.2 (auth check in layout.tsx)

**Step 1: Verify auth redirect works**

1. Open browser incognito
2. Navigate to `/get-started`
3. Expected: Redirects to `/sign-in`

**Step 2: Test authenticated access**

1. Login to app
2. Navigate to `/get-started`
3. Expected: Shows page content

---

### Task 2.4: Add subtle background styling to onboarding layout

**Status:** Done

**Files:**
- [x] Modify: `src/app/(onboarding)/layout.tsx`
- [x] Modify: `src/app/globals.css`

**Step 1: Add background pattern class**

```typescript
// src/app/(onboarding)/layout.tsx - update return
return (
  <div className="min-h-screen bg-background onboarding-bg">
    <OnboardingHeader />
    <main className="pt-16">
      <div className="max-w-[600px] mx-auto px-6 py-12">
        {children}
      </div>
    </main>
  </div>
)
```

**Step 2: Add CSS for onboarding background (if needed)**

```css
/* src/app/globals.css - add if subtle pattern desired */
.onboarding-bg {
  background-image:
    radial-gradient(circle at 50% 0%, rgba(232, 102, 9, 0.03) 0%, transparent 50%);
}
```

**Step 3: Commit**

```bash
git add src/app/\(onboarding\)/layout.tsx src/app/globals.css
git commit -m "feat(onboarding): add subtle background styling"
```

---

## Phase 3: Onboarding Pages

### Task 3.1: Implement Welcome Page (`/get-started`)

**Status:** Done

**Files:**
- [x] Modify: `src/app/(onboarding)/get-started/page.tsx`
- [x] Modify: `src/app/globals.css` (added onboarding button styles)

**Step 1: Implement full page**

Refer to wireframes.md Section 4 for layout.

```typescript
// src/app/(onboarding)/get-started/page.tsx
"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"
import { cn } from "@/lib/utils"

const GRATIS_FEATURES = [
  "50 kredit",
  "Menggunakan 13 tahap workflow",
  "Diskusi dan menyusun draft",
  "Pemakaian harian terbatas",
]

const BPP_FEATURES = [
  "300 kredit (~15 halaman)",
  "Full 13 tahap workflow",
  "Export Word & PDF",
]

const PRO_FEATURES = [
  "2000 kredit (~5 paper)",
  "Diskusi tak terbatas",
  "Export Word & PDF",
]

export default function GetStartedPage() {
  const router = useRouter()
  const { completeOnboarding } = useOnboardingStatus()

  const handleSkip = async () => {
    await completeOnboarding()
    router.push("/chat")
  }

  const handleUpgradeBPP = async () => {
    await completeOnboarding()
    router.push("/checkout/bpp")
  }

  const handleUpgradePRO = async () => {
    await completeOnboarding()
    router.push("/checkout/pro")
  }

  return (
    <div className="text-center space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <div className="text-4xl">🎉</div>
        <h1 className="text-2xl font-semibold">
          Selamat datang di
          <br />
          Makalah AI!
        </h1>
      </div>

      {/* Current Tier Card */}
      <div className="bg-card border border-border rounded-xl p-6 text-left">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="font-medium">Kamu sekarang di paket GRATIS</span>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {GRATIS_FEATURES.map((feature, i) => (
            <li key={i}>• {feature}</li>
          ))}
        </ul>
      </div>

      {/* Upgrade Section */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          ──── Mau lebih? Upgrade sekarang ────
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* BPP Card */}
          <div className="bg-card border border-border rounded-xl p-5 text-left">
            <h3 className="font-semibold">BAYAR PER PAPER</h3>
            <p className="text-lg font-bold mt-1">Rp 80.000</p>
            <div className="border-t border-border my-3" />
            <ul className="space-y-1 text-sm text-muted-foreground mb-4">
              {BPP_FEATURES.map((feature, i) => (
                <li key={i}>• {feature}</li>
              ))}
            </ul>
            <button
              onClick={handleUpgradeBPP}
              className="w-full btn-brand-vivid py-2.5 rounded-lg text-sm font-medium"
            >
              Beli Kredit
            </button>
          </div>

          {/* PRO Card */}
          <div className="bg-card border border-border rounded-xl p-5 text-left">
            <h3 className="font-semibold">PRO</h3>
            <p className="text-lg font-bold mt-1">
              Rp 200.000 <span className="text-sm font-normal">/bulan</span>
            </p>
            <div className="border-t border-border my-3" />
            <ul className="space-y-1 text-sm text-muted-foreground mb-4">
              {PRO_FEATURES.map((feature, i) => (
                <li key={i}>• {feature}</li>
              ))}
            </ul>
            <button
              disabled
              className="w-full btn-disabled py-2.5 rounded-lg text-sm font-medium"
            >
              Segera Hadir
            </button>
          </div>
        </div>
      </div>

      {/* Skip Link */}
      <button
        onClick={handleSkip}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Nanti saja - Langsung Mulai →
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(onboarding\)/get-started/page.tsx
git commit -m "feat(onboarding): implement welcome page with upsell cards"
```

---

### Task 3.2: Move Checkout BPP from topup page

**Status:** Done

**Files:**
- [x] Modify: `src/app/(onboarding)/checkout/bpp/page.tsx`
- Reference: `src/app/(dashboard)/subscription/topup/page.tsx`

**Step 1: Copy and adapt topup page logic**

Copy the entire content from `src/app/(dashboard)/subscription/topup/page.tsx` to `src/app/(onboarding)/checkout/bpp/page.tsx`.

**Step 2: Remove dashboard-specific elements**

- Remove any breadcrumb references
- Remove dashboard layout dependencies
- Update page header styling to match onboarding aesthetic

**Step 3: Add success redirect to /chat**

After successful payment, redirect to `/chat` with toast message.

**Step 4: Commit**

```bash
git add src/app/\(onboarding\)/checkout/bpp/page.tsx
git commit -m "feat(checkout): implement BPP checkout page in onboarding route"
```

---

### Task 3.3: Implement Checkout PRO placeholder page

**Status:** Done

**Files:**
- [x] Modify: `src/app/(onboarding)/checkout/pro/page.tsx`

**Step 1: Implement coming soon page**

Refer to wireframes.md Section 6.

```typescript
// src/app/(onboarding)/checkout/pro/page.tsx
"use client"

import Link from "next/link"
import { Crown, Construction } from "lucide-react"

const PRO_FEATURES = [
  "2000 kredit per bulan",
  "Menyusun sampai 5 paper (~75 halaman)",
  "Full 13 tahap workflow",
  "Draft hingga paper utuh",
  "Diskusi tak terbatas",
  "Export Word & PDF",
]

export default function CheckoutPROPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <Crown className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-semibold">Langganan PRO</h1>
        </div>
        <p className="text-2xl font-bold">Rp 200.000 / bulan</p>
      </div>

      {/* Features Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-medium mb-4">YANG KAMU DAPAT:</h2>
        <ul className="space-y-2">
          {PRO_FEATURES.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-6 text-center">
        <Construction className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
          SEGERA HADIR
        </h3>
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
          Fitur langganan PRO sedang dalam pengembangan.
          <br />
          Sementara, kamu bisa gunakan paket Bayar Per Paper.
        </p>
        <Link
          href="/checkout/bpp"
          className="inline-block btn-outline px-6 py-2 rounded-lg text-sm font-medium"
        >
          Coba Bayar Per Paper
        </Link>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(onboarding\)/checkout/pro/page.tsx
git commit -m "feat(checkout): implement PRO checkout coming soon page"
```

---

## Phase 4: Marketing Pages Redesign

### Task 4.1: Create PricingTeaser component

**Status:** Done

**Files:**
- [x] Create: `src/components/marketing/PricingTeaser.tsx`
- [x] Modify: `src/app/globals.css` (added `.pricing-teaser` styles)

**Step 1: Create simplified pricing teaser**

Refer to wireframes.md Section 1.

```typescript
// src/components/marketing/PricingTeaser.tsx
"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { cn } from "@/lib/utils"

// Simplified card type for teaser
type TeaserPlan = {
  _id: string
  name: string
  price: string
  unit?: string
  isHighlighted: boolean
  // For teaser: just show credits
  creditSummary: string
}

function TeaserCard({ plan }: { plan: TeaserPlan }) {
  return (
    <div
      className={cn(
        "pricing-card-teaser",
        plan.isHighlighted && "highlighted"
      )}
    >
      {plan.isHighlighted && (
        <div className="popular-tag">Solusi Terbaik</div>
      )}
      <div className="card-content-teaser">
        <h3 className="font-semibold">{plan.name}</h3>
        <p className="price text-xl font-bold mt-2">
          {plan.price}
          {plan.unit && <span className="text-sm font-normal"> {plan.unit}</span>}
        </p>
        <div className="border-t border-border my-3" />
        <p className="text-sm text-muted-foreground">{plan.creditSummary}</p>
      </div>
    </div>
  )
}

function TeaserCarousel({ plans }: { plans: TeaserPlan[] }) {
  const [activeSlide, setActiveSlide] = useState(
    plans.findIndex(p => p.isHighlighted) || 0
  )
  const startXRef = useRef<number | null>(null)

  const handleSwipe = useCallback((diff: number) => {
    const threshold = 48
    if (Math.abs(diff) < threshold) return
    setActiveSlide((current) => {
      const direction = diff > 0 ? 1 : -1
      return Math.max(0, Math.min(current + direction, plans.length - 1))
    })
  }, [plans.length])

  const handlePointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startXRef.current === null) return
    handleSwipe(startXRef.current - e.clientX)
    startXRef.current = null
  }

  return (
    <div className="pricing-carousel-teaser md:hidden">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {plans.map((plan) => (
          <div key={plan._id} className="carousel-slide">
            <TeaserCard plan={plan} />
          </div>
        ))}
      </div>
      <div className="carousel-dots mt-4">
        {plans.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveSlide(i)}
            className={cn("carousel-dot", activeSlide === i && "carousel-dot--active")}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export function PricingTeaser() {
  const plansData = useQuery(api.pricingPlans.getActivePlans)

  // Transform to teaser format
  const teaserPlans: TeaserPlan[] = (plansData || []).map(plan => ({
    _id: plan._id,
    name: plan.name,
    price: plan.price,
    unit: plan.unit,
    isHighlighted: plan.isHighlighted,
    creditSummary: getCreditSummary(plan.slug, plan.features),
  }))

  if (!plansData) {
    return <TeaserSkeleton />
  }

  return (
    <section className="pricing-teaser" id="pemakaian-harga">
      <div className="grid-thin" />
      <div className="bg-dot-grid" />

      <div className="pricing-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="badge-group">
            <span className="badge-dot" />
            <span className="badge-text">Pemakaian & Harga</span>
          </div>
          <h2 className="section-title">
            Investasi untuk
            <br />
            Masa Depan Akademik.
          </h2>
        </div>

        {/* Desktop Grid */}
        <div className="pricing-grid-teaser hidden md:grid">
          {teaserPlans.map((plan) => (
            <TeaserCard key={plan._id} plan={plan} />
          ))}
        </div>

        {/* Mobile Carousel */}
        <TeaserCarousel plans={teaserPlans} />

        {/* Global CTA */}
        <div className="text-center mt-8">
          <Link
            href="/pricing"
            className="btn-outline inline-flex items-center gap-2 px-6 py-3"
          >
            Lihat Detail Paket →
          </Link>
        </div>
      </div>
    </section>
  )
}

function getCreditSummary(slug: string, features: string[]): string {
  // Extract credit info from features or hardcode based on slug
  switch (slug) {
    case "gratis":
      return "50 kredit"
    case "bpp":
      return "300 kredit (~15 halaman)"
    case "pro":
      return "2000 kredit (~5 paper)"
    default:
      return features[0] || ""
  }
}

function TeaserSkeleton() {
  return (
    <section className="pricing-teaser">
      <div className="pricing-container">
        <div className="section-header">
          <div className="h-6 bg-muted rounded w-32 mx-auto" />
          <div className="h-8 bg-muted rounded w-64 mx-auto mt-4" />
        </div>
        <div className="pricing-grid-teaser hidden md:grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="pricing-card-teaser animate-pulse">
              <div className="card-content-teaser">
                <div className="h-5 bg-muted rounded w-24" />
                <div className="h-6 bg-muted rounded w-20 mt-2" />
                <div className="h-4 bg-muted rounded w-32 mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Add CSS for teaser cards in globals.css**

```css
/* src/app/globals.css - add teaser-specific styles */

/* Pricing Teaser Section */
.pricing-teaser {
  /* Same base styles as .pricing */
}

.pricing-grid-teaser {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.pricing-card-teaser {
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  text-align: center;
}

.pricing-card-teaser.highlighted {
  border-color: var(--brand);
}

.card-content-teaser {
  padding: 24px;
}

.pricing-carousel-teaser {
  /* Same as pricing-carousel */
}
```

**Step 3: Commit**

```bash
git add src/components/marketing/PricingTeaser.tsx src/app/globals.css
git commit -m "feat(marketing): create PricingTeaser component"
```

---

### Task 4.2: Update Homepage to use PricingTeaser

**Status:** Done

**Files:**
- [x] Modify: `src/app/(marketing)/page.tsx`

**Step 1: Replace PricingSection with PricingTeaser**

```typescript
// src/app/(marketing)/page.tsx
import { PricingTeaser } from "@/components/marketing/PricingTeaser"
// Remove: import { PricingSection } from "@/components/marketing/PricingSection"

// In JSX, replace:
// <PricingSection />
// with:
// <PricingTeaser />
```

**Step 2: Commit**

```bash
git add src/app/\(marketing\)/page.tsx
git commit -m "feat(marketing): replace PricingSection with PricingTeaser on homepage"
```

---

### Task 4.3: Redesign Pricing Page with full cards and CTAs

**Status:** Done

**Files:**
- [x] Modify: `src/app/(marketing)/pricing/page.tsx`

**Step 1: Implement full pricing page**

Refer to wireframes.md Section 2.

```typescript
// src/app/(marketing)/pricing/page.tsx
"use client"

import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { cn } from "@/lib/utils"

// ... implement full page with cards, features, and CTAs
// Each CTA checks useUser().isSignedIn to determine redirect behavior
```

**Step 2: Implement CTA logic with redirect**

```typescript
function PricingCTA({ tier, isSignedIn }: { tier: string; isSignedIn: boolean }) {
  const getHref = () => {
    const destinations: Record<string, string> = {
      gratis: "/get-started",
      bpp: "/checkout/bpp",
      pro: "/checkout/pro",
    }
    const dest = destinations[tier] || "/get-started"

    if (!isSignedIn) {
      return `/sign-up?redirect=${encodeURIComponent(dest)}`
    }
    return dest
  }

  // PRO is disabled
  if (tier === "pro") {
    return (
      <button disabled className="btn-disabled w-full py-3 rounded-lg">
        Segera Hadir
      </button>
    )
  }

  return (
    <Link
      href={getHref()}
      className={cn(
        "block w-full py-3 rounded-lg text-center font-medium",
        tier === "bpp" ? "btn-brand-vivid" : "btn-outline"
      )}
    >
      {tier === "gratis" ? "Mulai Gratis" : "Beli Kredit"}
    </Link>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(marketing\)/pricing/page.tsx
git commit -m "feat(marketing): redesign pricing page with full cards and CTAs"
```

---

## Phase 5: Redirect Logic & Integration

### Task 5.1: Handle redirect parameter in sign-up flow

**Status:** Done

**Files:**
- [x] Modify: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- [x] Create: `src/lib/utils/redirectAfterAuth.ts`

**Step 1: Create redirect utility**

```typescript
// src/lib/utils/redirectAfterAuth.ts
export function getRedirectUrl(searchParams: URLSearchParams): string {
  const redirect = searchParams.get("redirect")

  // Whitelist of allowed redirect paths
  const allowedPaths = [
    "/get-started",
    "/checkout/bpp",
    "/checkout/pro",
    "/chat",
  ]

  if (redirect && allowedPaths.some(path => redirect.startsWith(path))) {
    return redirect
  }

  // Default: go to get-started for first-time users
  return "/get-started"
}
```

**Step 2: Update Clerk afterSignUpUrl**

Check Clerk configuration for `afterSignUpUrl` handling. May need to use Clerk's `redirectUrl` prop or middleware.

**Step 3: Commit**

```bash
git add src/lib/utils/redirectAfterAuth.ts
git commit -m "feat(auth): add redirect URL utility for post-signup flow"
```

---

### Task 5.2: Set onboarding flag on signup with redirect intent

**Status:** Done

**Files:**
- [x] Modify: `src/app/(onboarding)/checkout/bpp/page.tsx` - auto-complete onboarding
- [x] Modify: `src/app/(onboarding)/checkout/pro/page.tsx` - auto-complete onboarding

**Step 1: Determine where to set flag**

If redirect contains `/checkout/*`, set `hasCompletedOnboarding = true` immediately after user creation.

This may require:
- Modifying Clerk webhook handler
- Or adding client-side logic after redirect

**Step 2: Implement logic**

```typescript
// In webhook or client handler
if (redirectPath?.startsWith("/checkout/")) {
  // User chose a tier from pricing page - skip welcome
  await ctx.db.patch(userId, { hasCompletedOnboarding: true })
}
```

**Step 3: Commit**

```bash
git commit -m "feat(auth): set onboarding flag for users with checkout redirect intent"
```

---

### Task 5.3: Update Hero CTA to handle first-time detection

**Status:** Done

**Files:**
- [x] Create: `src/components/marketing/HeroCTA.tsx`
- [x] Modify: `src/app/(marketing)/page.tsx`

**Step 1: Update "Ayo Mulai!" CTA logic**

```typescript
// Option A: Client component wrapper
"use client"

import { useUser } from "@clerk/nextjs"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"
import Link from "next/link"

export function HeroCTA() {
  const { isSignedIn } = useUser()
  const { hasCompletedOnboarding, isLoading } = useOnboardingStatus()

  const getHref = () => {
    if (!isSignedIn) return "/sign-up"
    if (hasCompletedOnboarding) return "/chat"
    return "/get-started"
  }

  return (
    <Link href={getHref()} className="btn-brand ...">
      Ayo Mulai!
    </Link>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(marketing\)/page.tsx
git commit -m "feat(marketing): update hero CTA with first-time detection"
```

---

## Phase 6: Testing & Cleanup

### Task 6.1: Manual testing checklist

**Status:** Done

**Test Cases:**

1. [~] New user signup → redirects to `/get-started` (SKIPPED - Clerk bot detection)
2. [x] `/get-started` shows welcome page with correct tier info
3. [x] Click "Beli Kredit" → goes to `/checkout/bpp`
4. [x] Click "Skip" → goes to `/chat`, sets `hasCompletedOnboarding = true`
5. [x] Returning user → "Ayo Mulai!" goes directly to `/chat`
6. [x] Pricing page CTAs work (logged in vs not logged in)
7. [x] `/pricing` → "Beli Kredit" (not logged in) → `/sign-up?redirect=/checkout/bpp`
8. [~] After signup with redirect → goes directly to `/checkout/bpp` (SKIPPED - Clerk bot detection)
9. [x] Homepage PricingTeaser shows simplified cards
10. [x] PricingTeaser carousel works on mobile
11. [x] Onboarding layout shows minimal header with close button
12. [x] Close button navigates correctly based on page

**Result:** 10/12 PASSED, 2/12 SKIPPED (Clerk bot detection on automated signup)

**Issues Found & Fixed:**
- Sign-in missing `forceRedirectUrl` → Fixed
- "User not found" error on OAuth signup → Added `ensureConvexUser()` to onboarding layout
- Env vars pointing to wrong redirect → Updated `.env.local`

---

### Task 6.2: Deprecate old topup page

**Status:** Done

**Files:**
- [x] Redirect: `src/app/(dashboard)/subscription/topup/page.tsx`

**Step 1: Add redirect from old route**

```typescript
// src/app/(dashboard)/subscription/topup/page.tsx
import { redirect } from "next/navigation"

export default function DeprecatedTopupPage() {
  redirect("/checkout/bpp")
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/subscription/topup/page.tsx
git commit -m "chore: redirect old topup page to new checkout/bpp route"
```

---

### Task 6.3: Final commit and PR

**Status:** Done

**Commit:** `15ed3e0`

**Step 1: Review all changes**

```bash
git status
git diff --stat main
```

**Step 2: Commit changes**

```bash
git add src/app/\(auth\)/sign-in/\[\[...sign-in\]\]/page.tsx \
        src/app/\(dashboard\)/subscription/topup/page.tsx \
        src/app/\(onboarding\)/layout.tsx \
        src/lib/utils/redirectAfterAuth.ts

git commit -m "fix(auth): resolve redirect and user sync issues in pricing flow"
```

**Files committed:**
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` - Added `forceRedirectUrl`
- `src/app/(onboarding)/layout.tsx` - Added `ensureConvexUser()`
- `src/lib/utils/redirectAfterAuth.ts` - Added configurable default redirect
- `src/app/(dashboard)/subscription/topup/page.tsx` - Deprecated with redirect

**Step 3: Push (pending user action)**

```bash
git push -u origin main
```

---

## Dependencies Graph

```
T1.1 (schema)
  └── T1.2 (mutations)
        └── T1.3 (hook)
              └── T3.1 (get-started page)
              └── T5.3 (hero CTA)

T2.1 (folder structure)
  └── T2.2 (layout)
        └── T2.3 (auth protection)
        └── T2.4 (styling)
              └── T3.1 (get-started)
              └── T3.2 (checkout bpp)
              └── T3.3 (checkout pro)

T4.1 (PricingTeaser)
  └── T4.2 (homepage update)

T4.3 (pricing page)
  └── T5.1 (redirect util)
        └── T5.2 (flag on signup)
```

---

## Quick Reference

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Homepage with PricingTeaser | No |
| `/pricing` | Full pricing page with CTAs | No |
| `/get-started` | Welcome page (first-time) | Yes |
| `/checkout/bpp` | BPP credit purchase | Yes |
| `/checkout/pro` | PRO subscription (coming soon) | Yes |
