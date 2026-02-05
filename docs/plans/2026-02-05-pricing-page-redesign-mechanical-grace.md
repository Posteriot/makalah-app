# Pricing Page Redesign: Mechanical Grace Migration

**Goal:** Migrate Pricing Page (section + cards + carousel + skeleton) ke standar Makalah-Carbon (Mechanical Grace) sesuai `pricing-redesign.md`.

**Architecture:** Migrasi bertahap dari luar ke dalam — Page Layout → PricingCard → PricingCTA → Carousel → Skeleton. Setiap step punya checkpoint visual untuk cegah breakage.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, Makalah-Carbon Design Tokens

**Branch:** `feat/pricing-page-redesign-mechanical-grace`

---

## Reference Documents

- Design System: `docs/makalah-design-system/docs/MANIFESTO.md`
- Migration Protocol: `docs/makalah-design-system/justification-docs/pricing-redesign.md`
- Color Tokens: `docs/makalah-design-system/docs/justifikasi-warna.md`
- Typography: `docs/makalah-design-system/docs/typografi.md`
- Shape & Layout: `docs/makalah-design-system/docs/shape-layout.md`
- Class Naming: `docs/makalah-design-system/docs/class-naming-convention.md`

---

## Task 1: Migrate Pricing Page Layout & Header

**Files:**
- Modify: `src/app/(marketing)/pricing/page.tsx`

**Status:** Done

**Step 1: Update section background and layout grid**

Change section wrapper from:
```tsx
<section
  className="relative min-h-[580px] md:min-h-[700px] flex flex-col justify-center px-4 md:px-6 pb-16 md:pb-24 overflow-hidden bg-muted/30 dark:bg-black"
  style={{ paddingTop: "calc(var(--header-h) + 60px)" }}
  id="pricing"
>
```

To:
```tsx
<section
  className="relative min-h-[580px] md:min-h-[700px] px-4 md:px-6 pb-16 md:pb-24 overflow-hidden bg-background text-foreground"
  style={{ paddingTop: "calc(var(--header-h) + 60px)" }}
  id="pricing"
>
```

**Step 2: Align container to 16-column grid**

Change container wrapper from:
```tsx
<div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto">
```

To:
```tsx
<div className="relative z-10 w-full max-w-[var(--container-max-width)] mx-auto grid grid-cols-16 gap-4">
```

**Step 3: Update section header typography and grid span**

Change header wrapper from:
```tsx
<div className="flex flex-col items-start gap-3 md:gap-4 mb-6 md:mb-8">
```

To:
```tsx
<div className="col-span-16 flex flex-col items-start gap-3 md:gap-4 mb-6 md:mb-8">
```

Update `h1` and paragraph to Mechanical Grace:
```tsx
<h1 className="font-mono text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
```
```tsx
<p className="font-mono text-[11px] md:text-sm text-muted-foreground max-w-xl">
```

**Step 4: Move grid layout to card container**

Wrap desktop grid with 16-col alignment. Replace:
```tsx
<div className="hidden md:grid grid-cols-3 gap-6 items-stretch">
```

With:
```tsx
<div className="col-span-16 hidden md:grid grid-cols-16 gap-4 items-stretch">
```

In the map, set column spans per card:
- Card 1: `md:col-span-5`
- Card 2: `md:col-span-6`
- Card 3: `md:col-span-5`

Example wrapper:
```tsx
<div key={plan._id} className="md:col-span-5">
  <PricingCard plan={plan} />
</div>
```
(Adjust spans to keep total = 16 and center balance.)

**Step 5: Empty state typography**

Change empty state to mono:
```tsx
<p className="font-mono text-xs text-muted-foreground">
```

**Step 6: Visual verification**

Run: `npm run dev`
Check: `/pricing`
Expected:
- Background uses `bg-background`
- Header text mono bold
- Desktop grid snaps to 16-col layout

**Step 7: Commit**

```bash
git add src/app/\(marketing\)/pricing/page.tsx
git commit -m "refactor(pricing): align pricing page layout to Mechanical Grace grid"
```

---

## Task 2: Refactor PricingCard Surface, Typo, and Dividers

**Files:**
- Modify: `src/components/marketing/pricing/PricingCard.tsx`

**Status:** Done

**Step 1: Update highlighted badge**

Change highlighted badge classes from:
```tsx
"bg-emerald-600 text-white"
"text-[11px] font-semibold uppercase tracking-wide"
"px-3 py-1 rounded-full"
```

To:
```tsx
"bg-amber-500 text-slate-950"
"text-[9px] font-bold uppercase tracking-widest"
"px-2 py-1 rounded-badge"
```

**Step 2: Update card shell**

Replace card container class list:
```tsx
"... p-4 md:p-8 rounded-lg"
"border border-black/20 dark:border-white/25"
"hover:bg-bento-light-hover dark:hover:bg-bento-hover"
"hover:border-black/30 dark:hover:border-white/35"
"hover:-translate-y-1 transition-all duration-300"
```

With:
```tsx
"... p-4 md:p-8 rounded-shell"
"border border-hairline bg-slate-900"
"transition-colors"
```

For highlighted card border:
```tsx
plan.isHighlighted && "border-amber-500"
```

**Step 3: Plan name and price typography**

Change plan name:
```tsx
<h3 className="font-mono font-bold text-xs uppercase tracking-widest text-amber-500 text-center mt-4 md:mt-0">
```

Change price:
```tsx
<p className="font-mono text-4xl md:text-5xl font-bold tracking-tight text-foreground text-center mb-6">
```

Unit:
```tsx
<span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-2">
```

**Step 4: Insert hairline divider**

Add a divider between header and features:
```tsx
<div className="my-4 border-t border-hairline" />
```

**Step 5: Tagline & features list**

Tagline text:
```tsx
<p className="font-mono text-sm leading-relaxed text-foreground">
```

Features list:
```tsx
<li className="font-mono text-[11px] leading-relaxed text-foreground/80 flex items-start gap-2">
```

Checkmark color:
```tsx
<span className="text-success mt-0.5">✓</span>
```

**Step 6: Visual verification**

Run: `npm run dev`
Check: `/pricing`
Expected:
- Card shell radius 16px, no translate hover
- Highlight card border Amber 500
- Divider hairline
- Typography mono + uppercase for plan name

**Step 7: Commit**

```bash
git add src/components/marketing/pricing/PricingCard.tsx
git commit -m "refactor(pricing): migrate PricingCard to Mechanical Grace"
```

---

## Task 3: Refactor PricingCTA (Button Standards)

**Files:**
- Modify: `src/components/marketing/pricing/PricingCard.tsx`

**Status:** Done

**Step 1: Disabled CTA**

Change to:
```tsx
"w-full py-2.5 px-4 rounded-action text-xs font-mono font-bold uppercase tracking-widest"
"bg-muted/40 border border-main text-muted-foreground"
```

**Step 2: Active CTA**

Replace CTA classes with:
```tsx
"w-full py-2.5 px-4 rounded-action text-xs font-mono font-bold uppercase tracking-widest text-center block"
"transition-colors"
plan.isHighlighted
  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover-slash"
  : "bg-transparent border border-main text-foreground hover:bg-muted/50 hover-slash"
```

**Step 3: Visual verification**

Run: `npm run dev`
Check: `/pricing`
Expected:
- CTA has rounded-action
- hover-slash active
- Highlight CTA uses Amber (primary)

**Step 4: Commit**

```bash
git add src/components/marketing/pricing/PricingCard.tsx
git commit -m "refactor(pricing): standardize CTA to Mechanical Grace"
```

---

## Task 4: Update PricingCarousel Navigation Dots

**Files:**
- Modify: `src/components/marketing/pricing/PricingCarousel.tsx`

**Status:** Pending

**Step 1: Update dot colors to Carbon tokens**

Change from:
```tsx
activeSlide === index
  ? "bg-[var(--brand)] scale-120"
  : "bg-gray-500/40"
```

To:
```tsx
activeSlide === index
  ? "bg-amber-500 scale-120"
  : "bg-slate-500/40"
```

**Step 2: Visual verification**

Run: `npm run dev`
Check: `/pricing` (mobile)
Expected:
- Active dot uses Amber 500
- Inactive dots are slate

**Step 3: Commit**

```bash
git add src/components/marketing/pricing/PricingCarousel.tsx
git commit -m "refactor(pricing): align carousel dots with Carbon tokens"
```

---

## Task 5: Update PricingSkeleton to Match New Card Shape

**Files:**
- Modify: `src/components/marketing/pricing/PricingSkeleton.tsx`

**Status:** Pending

**Step 1: Update skeleton card shell**

Change from:
```tsx
"... p-4 md:p-8 rounded-lg border border-black/20 dark:border-white/25 animate-pulse"
```

To:
```tsx
"... p-4 md:p-8 rounded-shell border border-hairline bg-slate-900 animate-pulse"
```

**Step 2: Update inner skeleton radius**

Adjust internal blocks to `rounded-[4px]` or `rounded-badge` where needed.

**Step 3: Visual verification**

Run: `npm run dev`
Check: `/pricing` loading state
Expected:
- Skeleton matches new card radius and border hairline

**Step 4: Commit**

```bash
git add src/components/marketing/pricing/PricingSkeleton.tsx
git commit -m "refactor(pricing): align PricingSkeleton with Mechanical Grace"
```

---

## Task 6: Final Verification & Checklist Update

**Files:**
- Modify: `docs/makalah-design-system/justification-docs/pricing-redesign.md`

**Status:** Pending

**Step 1: Visual verification**

Run: `npm run dev`
Check: `/pricing` (light/dark)
Checklist:
- [ ] Grid Audit: 16-col alignment
- [ ] Typo Audit: plan name + price mono
- [ ] Radius Audit: card 16px, CTA 8px
- [ ] Border Audit: hairline divider
- [ ] Color Audit: Amber highlight, Teal success
- [ ] Interaction Audit: hover-slash on CTA
- [ ] Skeleton Audit: matches radius + border

**Step 2: Mark checklist as complete**

Update section 4 in `pricing-redesign.md`: set all `- [ ]` to `- [x]` after verification.

**Step 3: Commit**

```bash
git add docs/makalah-design-system/justification-docs/pricing-redesign.md
git commit -m "docs(pricing): mark pricing redesign checklist complete"
```

---

## Summary

| Task | Files Modified | Key Changes |
| --- | --- | --- |
| 1 | `src/app/(marketing)/pricing/page.tsx` | Background + 16-col grid + header mono |
| 2 | `src/components/marketing/pricing/PricingCard.tsx` | Rounded-shell, Amber highlight, hairline divider |
| 3 | `src/components/marketing/pricing/PricingCard.tsx` | CTA rounding + hover-slash |
| 4 | `src/components/marketing/pricing/PricingCarousel.tsx` | Dot colors to Carbon tokens |
| 5 | `src/components/marketing/pricing/PricingSkeleton.tsx` | Skeleton radius/border alignment |
| 6 | `docs/makalah-design-system/justification-docs/pricing-redesign.md` | Checklist completion |

**Total commits:** 6
**Estimated time:** 30-45 minutes
