# PricingTeaser Visual Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign PricingTeaser component to match pricing page visual style with enhanced card content.

**Architecture:** Update CSS background layers to match pricing page (solid black, grid 15%, dots 12%), add hover gradient effect to cards, redesign CTA to solid brand orange, and update card content with descriptive text.

**Tech Stack:** React, Tailwind CSS, CSS custom properties

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| Section background | Gradient `#0a0a0a → #0c0c0e` | Solid `#000000` |
| Grid lines opacity | 2% | 15% |
| Dot grid opacity | 3% | 12% |
| Card hover | Simple translateY + shadow | Aurora gradient glow from bottom |
| CTA style | Outline button | Solid brand orange button |
| Card content | Name + price + credit count | Name + price + description + credit note |

---

## Task 1: Update Section Background to Solid Black

**Files:**
- Modify: `src/app/globals.css` (lines ~3297-3340 - pricing-teaser light/dark mode overrides)

**Step 1: Update dark mode background**

Find and replace the dark mode section background from gradient to solid:

```css
/* Dark mode overrides for pricing teaser */
.dark section.pricing-teaser {
  background: #000000;
}
```

**Step 2: Update light mode background**

```css
/* Light mode overrides for pricing teaser */
:root section.pricing-teaser {
  background: #f8f8f8;
}
```

**Step 3: Verify visually**

Run: `npm run dev`
Open: http://localhost:3000
Scroll to "Pemakaian & Harga" section
Expected: Solid black background (dark mode), solid light gray (light mode)

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style(pricing-teaser): change background from gradient to solid"
```

---

## Task 2: Increase Grid Lines Opacity

**Files:**
- Modify: `src/app/globals.css` (lines ~3049-3058 and ~3301-3304 and ~3324-3327)

**Step 1: Update base grid-thin in @layer components**

Find `.pricing-teaser .grid-thin` and update opacity from 2% to 15%:

```css
.pricing-teaser .grid-thin {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px);
  background-size: 48px 48px;
  z-index: 0;
  pointer-events: none;
  mask-image: linear-gradient(to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0) 90%);
}
```

**Step 2: Update light mode grid-thin override**

```css
:root .pricing-teaser .grid-thin {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px);
}
```

**Step 3: Update dark mode grid-thin override**

```css
.dark .pricing-teaser .grid-thin {
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px);
}
```

**Step 4: Verify visually**

Expected: Grid lines now more visible, matching pricing page

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "style(pricing-teaser): increase grid lines opacity to 15%"
```

---

## Task 3: Increase Dot Grid Opacity

**Files:**
- Modify: `src/app/globals.css` (lines ~3061-3068 and ~3307-3308 and ~3330-3331)

**Step 1: Update base bg-dot-grid in @layer components**

```css
.pricing-teaser .bg-dot-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 24px 24px;
  z-index: 0;
  pointer-events: none;
  mask-image: radial-gradient(circle at center, black 50%, transparent 100%);
}
```

**Step 2: Update light mode dot-grid override**

```css
:root .pricing-teaser .bg-dot-grid {
  background-image: radial-gradient(rgba(0, 0, 0, 0.12) 1px, transparent 1px);
}
```

**Step 3: Update dark mode dot-grid override**

```css
.dark .pricing-teaser .bg-dot-grid {
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
}
```

**Step 4: Verify visually**

Expected: Dot pattern now more visible with radial fade from center

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "style(pricing-teaser): increase dot grid opacity to 12%"
```

---

## Task 4: Add Aurora Gradient Hover Effect to Cards

**Files:**
- Modify: `src/app/globals.css` (add after `.pricing-teaser .pricing-card-teaser.highlighted:hover` around line 3147)

**Step 1: Update card-content-teaser to support ::after pseudo-element**

Add `position: relative` and `overflow: hidden` to the card content wrapper:

```css
.pricing-teaser .card-content-teaser {
  position: relative;
  overflow: hidden;
  padding: 32px 24px;
}
```

**Step 2: Add aurora gradient ::after pseudo-element**

Add after the existing `.card-content-teaser` styles:

```css
/* Aurora gradient hover effect */
.pricing-teaser .card-content-teaser::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background:
    radial-gradient(circle at 20% 100%, rgba(232, 102, 9, 0.5) 0%, transparent 70%),
    radial-gradient(circle at 80% 100%, rgba(25, 196, 156, 0.4) 0%, transparent 60%);
  filter: blur(40px);
  opacity: 0;
  transition: opacity 0.6s ease, transform 0.6s ease;
  pointer-events: none;
  z-index: 0;
}

.pricing-teaser .pricing-card-teaser:hover .card-content-teaser::after {
  opacity: 1;
  transform: translateY(-20px) scale(1.05);
}
```

**Step 3: Ensure card content stays above gradient**

```css
.pricing-teaser .card-content-teaser > * {
  position: relative;
  z-index: 1;
}
```

**Step 4: Update card hover transition**

Update existing hover styles to match pricing page:

```css
.pricing-teaser .pricing-card-teaser {
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.pricing-teaser .pricing-card-teaser:hover {
  transform: translateY(-8px);
}

.pricing-teaser .pricing-card-teaser:hover .card-content-teaser {
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}
```

**Step 5: Verify visually**

Hover over cards
Expected: Orange/teal gradient glow appears from bottom of card

**Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "style(pricing-teaser): add aurora gradient hover effect to cards"
```

---

## Task 5: Redesign CTA Button to Solid Brand Orange

**Files:**
- Modify: `src/app/globals.css` (lines ~3258-3281 - teaser-cta styles)

**Step 1: Replace outline button with solid brand button**

Replace the existing `.teaser-cta .btn-outline` styles:

```css
/* Global CTA */
.pricing-teaser .teaser-cta {
  text-align: center;
  margin-top: 48px;
}

.pricing-teaser .teaser-cta .btn-brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 48px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: var(--brand);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pricing-teaser .teaser-cta .btn-brand:hover {
  background: color-mix(in oklch, var(--brand) 90%, black);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(232, 102, 9, 0.3);
}
```

**Step 2: Verify visually**

Expected: CTA button is now solid orange with white text

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style(pricing-teaser): redesign CTA to solid brand orange button"
```

---

## Task 6: Update PricingTeaser Component - Add Description Fields

**Files:**
- Modify: `src/components/marketing/PricingTeaser.tsx`

**Step 1: Update TeaserPlan type**

```typescript
type TeaserPlan = {
  _id: string
  name: string
  price: string
  unit?: string
  isHighlighted: boolean
  description: string      // NEW: Main paragraph
  creditNote: string       // NEW: Small credit note
}
```

**Step 2: Update getCreditSummary to getCardContent helper**

Replace the `getCreditSummary` function with a new helper that returns both description and creditNote:

```typescript
function getCardContent(slug: string): { description: string; creditNote: string } {
  switch (slug) {
    case "gratis":
      return {
        description: "Cocok untuk mencoba 13 tahap workflow dan menyusun draft awal tanpa biaya.",
        creditNote: "Mendapat 50 kredit ≈ 35–45 ribu kata pemakaian total (input + output).",
      }
    case "bpp":
      return {
        description: "Tepat untuk menyelesaikan satu paper utuh hingga ekspor Word/PDF.",
        creditNote: "Mendapat 300 kredit ≈ 210–270 ribu kata pemakaian total (input + output).",
      }
    case "pro":
      return {
        description: "Ideal untuk penyusunan banyak paper dengan diskusi tanpa batas.",
        creditNote: "Mendapat 2000 kredit ≈ 1,4–1,8 juta kata pemakaian total (input + output).",
      }
    default:
      return {
        description: "",
        creditNote: "",
      }
  }
}
```

**Step 3: Update transform in main component**

```typescript
const teaserPlans: TeaserPlan[] = (plansData || []).map((plan) => {
  const content = getCardContent(plan.slug)
  return {
    _id: plan._id,
    name: plan.name,
    price: plan.price,
    unit: plan.unit,
    isHighlighted: plan.isHighlighted,
    description: content.description,
    creditNote: content.creditNote,
  }
})
```

**Step 4: Commit**

```bash
git add src/components/marketing/PricingTeaser.tsx
git commit -m "feat(pricing-teaser): add description and creditNote fields to plan type"
```

---

## Task 7: Update TeaserCard Component UI

**Files:**
- Modify: `src/components/marketing/PricingTeaser.tsx`

**Step 1: Update TeaserCard component**

Replace the existing TeaserCard component:

```typescript
function TeaserCard({ plan }: { plan: TeaserPlan }) {
  return (
    <div
      className={cn(
        "pricing-card-teaser",
        plan.isHighlighted && "highlighted"
      )}
    >
      {/* Popular tag for highlighted card */}
      {plan.isHighlighted && (
        <div className="popular-tag">Solusi Terbaik</div>
      )}

      <div className="card-content-teaser">
        <h3>{plan.name}</h3>
        <p className="price">
          {plan.price}
          {plan.unit && <span className="unit">{plan.unit}</span>}
        </p>
        <div className="divider" />
        <p className="description">{plan.description}</p>
        <p className="credit-note">{plan.creditNote}</p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/marketing/PricingTeaser.tsx
git commit -m "feat(pricing-teaser): update TeaserCard to show description and credit note"
```

---

## Task 8: Add CSS for New Card Content Elements

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add styles for description paragraph**

Add after `.credit-summary` styles (around line 3201):

```css
.pricing-teaser .card-content-teaser .description {
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted-foreground);
  margin-top: 12px;
  text-align: left;
}

.pricing-teaser .card-content-teaser .credit-note {
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted-foreground);
  opacity: 0.7;
  margin-top: 12px;
  text-align: left;
}
```

**Step 2: Remove old credit-summary style if not used elsewhere**

The `.credit-summary` class can be removed or kept for backward compatibility.

**Step 3: Verify visually**

Expected: Cards now show description paragraph and smaller credit note below

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style(pricing-teaser): add styles for description and credit-note elements"
```

---

## Task 9: Update CTA Button in Component

**Files:**
- Modify: `src/components/marketing/PricingTeaser.tsx`

**Step 1: Update CTA Link class**

Find the teaser-cta section and change `btn-outline` to `btn-brand`:

```typescript
{/* Global CTA - Link to full pricing page */}
<div className="teaser-cta">
  <Link href="/pricing" className="btn-brand">
    Lihat Detail Paket →
  </Link>
</div>
```

**Step 2: Verify visually**

Expected: CTA button is solid orange with white text

**Step 3: Commit**

```bash
git add src/components/marketing/PricingTeaser.tsx
git commit -m "style(pricing-teaser): update CTA to use btn-brand class"
```

---

## Task 10: Update Skeleton Component

**Files:**
- Modify: `src/components/marketing/PricingTeaser.tsx`

**Step 1: Update TeaserSkeleton to match new card structure**

```typescript
function TeaserSkeleton() {
  return (
    <section className="pricing-teaser">
      <div className="grid-thin" />
      <div className="bg-dot-grid" />

      <div className="pricing-container">
        <div className="section-header">
          <div className="badge-group">
            <span className="h-5 w-5 bg-muted rounded-full animate-pulse" />
            <span className="h-4 w-28 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-64 bg-muted rounded mx-auto mt-4 animate-pulse" />
        </div>

        <div className="pricing-grid-teaser hidden md:grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pricing-card-teaser animate-pulse">
              <div className="card-content-teaser">
                <div className="h-5 bg-muted rounded w-24 mx-auto" />
                <div className="h-7 bg-muted rounded w-28 mx-auto mt-3" />
                <div className="divider" />
                <div className="h-12 bg-muted rounded w-full mt-3" />
                <div className="h-8 bg-muted rounded w-full mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/marketing/PricingTeaser.tsx
git commit -m "feat(pricing-teaser): update skeleton to match new card structure"
```

---

## Task 11: Final Visual QA and Cleanup

**Step 1: Run dev server and test**

```bash
npm run dev
```

**Step 2: Visual checklist**

- [ ] Section background is solid black (dark mode)
- [ ] Section background is solid light gray (light mode)
- [ ] Grid lines are visible (15% opacity)
- [ ] Dot pattern is visible with radial fade (12% opacity)
- [ ] Card hover shows aurora gradient from bottom
- [ ] Cards display: name, price, description, credit note
- [ ] CTA button is solid orange
- [ ] Mobile carousel works correctly
- [ ] Light/dark mode toggle works for all elements

**Step 3: Run lint and type check**

```bash
npm run lint
npx tsc --noEmit
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "style(pricing-teaser): complete visual redesign with enhanced content"
```

---

## Files Changed Summary

| File | Type | Changes |
|------|------|---------|
| `src/app/globals.css` | Modify | Background, grid, dots, hover effect, CTA styles |
| `src/components/marketing/PricingTeaser.tsx` | Modify | TeaserPlan type, getCardContent helper, TeaserCard UI, CTA class, Skeleton |

---

## Rollback Plan

If issues arise, revert with:

```bash
git revert HEAD~N  # where N is number of commits to revert
```

Or selectively:

```bash
git checkout HEAD~N -- src/app/globals.css
git checkout HEAD~N -- src/components/marketing/PricingTeaser.tsx
```
