# Task 4.1 Report: Create PricingTeaser Component

## Summary

Created a simplified pricing teaser component for the homepage that shows pricing cards without features list and per-card CTAs. The component links to the full `/pricing` page via a global CTA.

## Changes Made

### File 1: `src/components/marketing/PricingTeaser.tsx`

Full implementation of the PricingTeaser component:

1. **TeaserPlan Type**
   - Simplified type: `_id`, `name`, `price`, `unit`, `isHighlighted`, `creditSummary`
   - No features array, no per-card CTA

2. **TeaserCard Component**
   - Displays plan name, price (with optional unit), and credit summary
   - "Solusi Terbaik" popular tag for highlighted card
   - Simplified layout without features list

3. **TeaserCarousel Component**
   - Mobile-only carousel (hidden on md+ screens)
   - Swipe gesture handling (pointer events with 48px threshold)
   - Navigation dots with active state
   - Starts at highlighted plan (BPP) for better UX

4. **TeaserSkeleton Component**
   - Loading state with animated placeholders
   - Matches final layout structure

5. **PricingTeaser Main Component**
   - Fetches plans from `api.pricingPlans.getActivePlans`
   - Transforms to teaser format using `getCreditSummary()`
   - Section header with badge + title
   - Desktop grid (3 columns) and mobile carousel
   - Global CTA: "Lihat Detail Paket →" linking to `/pricing`

### File 2: `src/app/globals.css`

Added comprehensive CSS styles for the teaser component:

1. **Section Styles**
   - Background patterns (grid-thin, bg-dot-grid)
   - Container with max-width
   - Section header (badge-group, section-title)

2. **Card Styles**
   - `.pricing-card-teaser` with hover effects
   - `.highlighted` variant with brand border
   - `.popular-tag` positioning
   - `.card-content-teaser` with divider

3. **Carousel Styles**
   - Track with transform animation
   - Slide containers
   - Navigation dots with active state

4. **CTA Styles**
   - `.teaser-cta` centered container
   - `.btn-outline` with hover effects

5. **Theme Support**
   - Light mode overrides (`:root` prefix)
   - Dark mode overrides (`.dark` prefix)

## Design Decisions

### 1. Reuse Carousel Logic from PricingSection

The carousel implementation follows the same pattern as `PricingSection.tsx`:
- Pointer events for swipe detection
- 48px threshold for swipe trigger
- Same dot navigation pattern

This ensures consistent UX across the app.

### 2. Start at Highlighted Plan

```typescript
const highlightedIndex = plans.findIndex((p) => p.isHighlighted)
const [activeSlide, setActiveSlide] = useState(
  highlightedIndex >= 0 ? highlightedIndex : 0
)
```

Mobile carousel starts at BPP (the highlighted/recommended plan) instead of Gratis, improving conversion potential.

### 3. Global CTA Instead of Per-Card CTAs

Per wireframes.md Section 1:
- **No** daftar features di card
- **No** CTA per card
- Global CTA links to `/pricing` for full details

This simplifies the homepage and encourages users to visit the dedicated pricing page.

### 4. Credit Summary Helper

```typescript
function getCreditSummary(slug: string, features: string[]): string {
  switch (slug) {
    case "gratis": return "50 kredit"
    case "bpp": return "300 kredit (~15 halaman)"
    case "pro": return "2000 kredit (~5 paper)"
    default: return features[0] || ""
  }
}
```

Hardcoded credit summaries by slug for consistency, with fallback to first feature.

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## Visual Reference

Based on wireframes.md Section 1:

**Desktop (3 Columns):**
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ GRATIS  │  │⭐ BPP   │  │  PRO    │
│  Rp 0   │  │Rp80.000 │  │Rp200k   │
│ ─────── │  │ ─────── │  │ ─────── │
│50 kredit│  │300kredit│  │2000kr   │
└─────────┘  └─────────┘  └─────────┘

      [ Lihat Detail Paket → ]
```

**Mobile (Carousel):**
- Single card visible with swipe gesture
- Dots: ○ ● ○ (active on BPP)

## Next Steps

Task 4.1 complete. Ready for:
- **Task 4.2**: Update Homepage to use PricingTeaser (replace PricingSection with PricingTeaser)
