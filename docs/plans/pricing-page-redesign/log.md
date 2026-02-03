# Pricing Page Redesign - Work Log

## 2026-02-04

### Task 1: Create Git Branch - DONE
- Created branch `redesign/pricing-page` from main
- Verified branch is active

### Task 2: Fix Header Active State (Orange → Gray) - DONE
- Modified `src/app/globals.css` lines 600-607
- Changed `.nav-link.active` color from `var(--brand)` to `var(--muted-foreground)`
- Changed `.nav-link.active::after` border-bottom-color from `var(--brand)` to `var(--muted-foreground)`

### Task 3: Create New PricingCard Component - DONE
- Created directory `src/components/marketing/pricing/`
- Created `src/components/marketing/pricing/PricingCard.tsx`
- Component includes: PricingPlan type, getCardContent helper, PricingCTA (auth-aware), PricingCard main component
- Styling uses Tailwind classes, consistent with TeaserCard pattern

### Task 4: Create PricingCarousel Component - DONE
- Created `src/components/marketing/pricing/PricingCarousel.tsx`
- Mobile-only carousel (md:hidden)
- Swipe handling with pointer events
- Navigation dots with brand color active state
- Starts at highlighted plan (BPP)

### Task 5: Create PricingSkeleton Component - DONE
- Created `src/components/marketing/pricing/PricingSkeleton.tsx`
- Desktop-only skeleton (hidden md:grid)
- Matches PricingCard layout structure

### Task 6: Create Barrel Export - DONE
- Created `src/components/marketing/pricing/index.ts`
- Exports: PricingCard, PricingCarousel, PricingSkeleton

### Task 7: Rewrite Pricing Page - DONE
- Replaced entire `src/app/(marketing)/pricing/page.tsx`
- Removed hero section, now single section layout
- Uses React background components (GridPattern, DottedPattern)
- Uses SectionBadge for header
- Imports from new pricing components
- Added padding-top for fixed header accommodation
- Consistent with PricingTeaser styling

### Task 8: Clean Up Custom CSS in globals.css - DONE
- Deleted entire pricing CSS block (~512 lines removed)
- Removed `section.pricing` and all `.pricing-*` styles
- Removed light/dark mode overrides for pricing
- Also removed orphan `.pricing-card` reference in GPU optimization section
- Verified no broken references in codebase

### Task 9: Verify Build - DONE
- Type check: Pass (no errors)
- Lint: Pass (0 errors, 4 unrelated warnings)
- Build: Pass (successful)

### Task 10: Final Review - DONE
- Total changes: -838 lines deleted, +45 lines added
- Files modified: `src/app/(marketing)/pricing/page.tsx`, `src/app/globals.css`
- Files created: `src/components/marketing/pricing/` (4 files)
- Waiting for user approval before commit

### Task 11: Migrate Card Content to Database - DONE
- Created migration `updatePricingPageContent` in `convex/migrations/seedPricingPlans.ts`
- Updated database with new content:
  - **Gratis**: tagline, 3 features, ctaText="Coba"
  - **Bayar Per Paper**: tagline, 7 features, ctaText="Beli Kredit", isHighlighted=true
  - **Pro**: tagline, 7 features, ctaText="Langganan", isDisabled=true
- Ran migration successfully: all 3 plans updated
- Updated `PricingCard.tsx`:
  - Expanded `PricingPlan` type to include tagline, features[], ctaText, ctaHref, isDisabled
  - Removed hardcoded `getCardContent()` function
  - Now renders tagline + features list from database
  - CTA button uses ctaText and ctaHref from plan
- Updated `PricingCarousel.tsx`: imports PricingPlan type from PricingCard
- Updated barrel export to export PricingPlan type
- Verified: type check pass, lint pass, build pass

### Task 12: Fix Font Configuration Mismatch - DONE
- Found bug: `--font-family-sans` referenced non-existent `var(--font-geist-sans)`
- Actual variable from layout.tsx is `--font-sans` (not `--font-geist-sans`)
- Fixed `globals.css` line 91: `--font-family-sans: var(--font-sans)`
- Updated comment documentation to match actual variables
- Verified: build pass
