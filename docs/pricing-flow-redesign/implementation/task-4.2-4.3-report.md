# Task 4.2 & 4.3 Report: Homepage and Pricing Page Updates

## Summary

Updated the homepage to use PricingTeaser (simplified cards) and redesigned the pricing page with full cards and auth-aware CTAs.

## Task 4.2: Update Homepage to use PricingTeaser

### Changes Made

**File:** `src/app/(marketing)/page.tsx`

Simple import swap:

```diff
- import { PricingSection } from "@/components/marketing/PricingSection"
+ import { PricingTeaser } from "@/components/marketing/PricingTeaser"

- <PricingSection />
+ <PricingTeaser />
```

### Result

- Homepage now shows simplified pricing cards (name, price, credit summary)
- No features list on homepage cards
- No per-card CTAs on homepage
- Global CTA "Lihat Detail Paket →" links to `/pricing` for full details

---

## Task 4.3: Redesign Pricing Page with full cards and CTAs

### Changes Made

**File:** `src/app/(marketing)/pricing/page.tsx`

Full redesign with auth-aware CTA behavior:

1. **Hero Header**
   - Title: "Tak Perlu Bayar Mahal Untuk Karya Yang Masuk Akal"
   - Subheading explaining pricing options

2. **Pricing Cards Section**
   - Uses existing `.pricing` CSS classes for consistent styling
   - Background patterns (grid-thin, bg-dot-grid)

3. **PricingCTA Component**
   - Auth-aware redirect logic using `useUser()` from Clerk
   - Signed in: Direct redirect to destination
   - Not signed in: Redirect to `/sign-up?redirect=<destination>`

4. **PricingCard Component**
   - Full features list with checkmarks
   - Auth-aware CTA button

5. **PricingCarousel Component**
   - Mobile carousel with swipe gesture
   - Starts at highlighted plan (BPP)
   - Navigation dots

### CTA Behavior Matrix

| Tier | CTA Text | Signed In | Not Signed In |
|------|----------|-----------|---------------|
| Gratis | "Mulai Gratis" | `/get-started` | `/sign-up?redirect=/get-started` |
| BPP | "Beli Kredit" | `/checkout/bpp` | `/sign-up?redirect=/checkout/bpp` |
| PRO | "Segera Hadir" | Disabled | Disabled |

### Key Code: PricingCTA Component

```typescript
function PricingCTA({ slug, isHighlighted, isSignedIn }) {
  const getDestination = (): string => {
    switch (slug) {
      case "gratis": return "/get-started"
      case "bpp": return "/checkout/bpp"
      case "pro": return "/checkout/pro"
      default: return "/get-started"
    }
  }

  const getHref = (): string => {
    const dest = getDestination()
    if (!isSignedIn) {
      return `/sign-up?redirect=${encodeURIComponent(dest)}`
    }
    return dest
  }

  // PRO always disabled
  if (slug === "pro") {
    return <button disabled className="btn btn-disabled full-width">Segera Hadir</button>
  }

  return (
    <Link href={getHref()} className={cn("btn full-width", isHighlighted ? "btn-brand-vivid" : "btn-outline")}>
      {getCtaText()}
    </Link>
  )
}
```

### Design Decisions

1. **Standalone Page Component**
   - Instead of modifying PricingSection, created dedicated page with custom CTA logic
   - PricingSection remains available for other use cases (e.g., if needed elsewhere)

2. **URL-encoded Redirect**
   - Uses `encodeURIComponent()` for redirect parameter
   - Ensures special characters in paths are properly escaped

3. **Consistent Styling**
   - Reuses existing `.pricing` CSS classes
   - Same card layout, features list, and hover effects

4. **Mobile-First Carousel**
   - Starts at highlighted plan (BPP) instead of first item
   - Same swipe gesture handling as PricingTeaser

---

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## User Flow

### From Homepage (PricingTeaser)
```
[User sees simplified pricing cards]
    │
    └── Clicks "Lihat Detail Paket →"
        └── /pricing (full pricing page)
```

### From Pricing Page
```
[User sees full pricing cards with features]
    │
    ├── Signed In
    │   ├── Click "Mulai Gratis" → /get-started
    │   ├── Click "Beli Kredit" → /checkout/bpp
    │   └── Click "Segera Hadir" → (disabled)
    │
    └── Not Signed In
        ├── Click "Mulai Gratis" → /sign-up?redirect=/get-started
        ├── Click "Beli Kredit" → /sign-up?redirect=/checkout/bpp
        └── Click "Segera Hadir" → (disabled)
```

## Phase 4 Complete

All marketing pages redesign tasks are done:
- Task 4.1: PricingTeaser component ✓
- Task 4.2: Homepage update ✓
- Task 4.3: Pricing page redesign ✓

## Next Steps

Ready for Phase 5: Redirect Logic & Integration
- Task 5.1: Handle redirect parameter in sign-up flow
- Task 5.2: Set onboarding flag on signup with redirect intent
- Task 5.3: Update Hero CTA to handle first-time detection
