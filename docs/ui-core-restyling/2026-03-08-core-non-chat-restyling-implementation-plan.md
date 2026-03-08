# Core Non-Chat UI Restyling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and apply a reusable `data-ui-scope="core"` token system for Home and shared non-chat shell sections, section-by-section with strict quality gates and one commit per section.

**Architecture:** The implementation uses scoped semantic tokens in `src/app/globals-new.css` under `[data-ui-scope="core"]` and `.dark [data-ui-scope="core"]`, then migrates Home sections in fixed order. Each section must pass styling/token/Tailwind consistency gates before commit and before moving forward.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind CSS v4, CSS variables (OKLCH), shadcn semantic tokens.

---

### Task 1: Baseline Scope + GlobalHeader

**Files:**
- Modify: `src/app/(marketing)/layout.tsx`
- Modify: `src/app/globals-new.css`
- Modify: `src/components/layout/header/GlobalHeader.tsx`
- Modify (if needed): `src/components/ui/section-cta.tsx`
- Test (gates): `src/components/layout/header/GlobalHeader.tsx`

**Step 1: Write failing gate checks (header + baseline)**

Run:
```bash
rg -n "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/layout/header/GlobalHeader.tsx
rg -n "dark:(bg|text|border|shadow)-" src/components/layout/header/GlobalHeader.tsx
rg -n "data-ui-scope=\"core\"" src/app/'(marketing)'/layout.tsx
rg -n "\[data-ui-scope=\"core\"\]|--core-" src/app/globals-new.css
```
Expected: first two commands likely return matches (FAIL baseline). Last two likely return none (FAIL baseline).

**Step 2: Implement baseline scope + core token blocks (minimal)**

- Add `data-ui-scope="core"` to the top non-chat wrapper in `src/app/(marketing)/layout.tsx`.
- Add initial core blocks in `src/app/globals-new.css`:
  - `[data-ui-scope="core"] { --core-* ...; --background: var(--core-background); ... }`
  - `.dark [data-ui-scope="core"] { --core-* ...; --background: var(--core-background); ... }`
- Keep token set aligned with design doc Section 3.

**Step 3: Migrate GlobalHeader to core semantic usage**

- Replace hardcoded color/dark color-border-shadow classes with semantic classes and/or `var(--core-*)`.
- If visual hierarchy breaks, apply minimal visual adjustment in the same file.

**Step 4: Re-run gate checks (must pass for this section)**

Run:
```bash
rg -n "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/layout/header/GlobalHeader.tsx
rg -n "dark:(bg|text|border|shadow)-" src/components/layout/header/GlobalHeader.tsx
rg -n "data-ui-scope=\"core\"" src/app/'(marketing)'/layout.tsx
rg -n "\[data-ui-scope=\"core\"\]|--core-" src/app/globals-new.css
```
Expected:
- Header scans return no matches for banned patterns.
- Scope and core token scans return matches.

**Step 5: Commit**

```bash
git add src/app/'(marketing)'/layout.tsx src/app/globals-new.css src/components/layout/header/GlobalHeader.tsx src/components/ui/section-cta.tsx
git commit -m "feat(ui-core): restyle global-header with core non-chat tokens"
```

---

### Task 2: Hero Section

**Files:**
- Modify: `src/components/marketing/hero/HeroCMS.tsx`
- Modify: `src/components/marketing/hero/HeroSubheading.tsx`
- Modify: `src/components/marketing/hero/HeroResearchMock.tsx`
- Modify: `src/components/marketing/hero/ChatInputHeroMock.tsx`
- Modify (if needed): `src/components/ui/section-badge.tsx`

**Step 1: Write failing gate checks (hero files)**

Run:
```bash
rg -n -g '*.tsx' "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/marketing/hero
rg -n -g '*.tsx' "dark:(bg|text|border|shadow)-" src/components/marketing/hero
```
Expected: matches exist (FAIL baseline).

**Step 2: Implement minimal token migration for Hero**

- Replace direct palette and literal color usages with core semantic classes/tokens.
- Move illustrative-only color language to approved `--core-showcase-*` usage where needed.
- Keep visual intent (mock depth, CTA clarity, heading hierarchy) unchanged unless needed for consistency.

**Step 3: Apply visual/layout adjustment if needed**

- Only adjust spacing/hierarchy/readability issues introduced by token migration.

**Step 4: Re-run gate checks**

Run:
```bash
rg -n -g '*.tsx' "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/marketing/hero
rg -n -g '*.tsx' "dark:(bg|text|border|shadow)-" src/components/marketing/hero
```
Expected: no banned matches in migrated hero files.

**Step 5: Commit**

```bash
git add src/components/marketing/hero/HeroCMS.tsx src/components/marketing/hero/HeroSubheading.tsx src/components/marketing/hero/HeroResearchMock.tsx src/components/marketing/hero/ChatInputHeroMock.tsx src/components/ui/section-badge.tsx
git commit -m "feat(ui-core): restyle hero with core non-chat tokens"
```

---

### Task 3: Benefits Section

**Files:**
- Modify: `src/components/marketing/benefits/BenefitsSection.tsx`
- Modify: `src/components/marketing/benefits/BenefitsBadge.tsx`
- Modify: `src/components/marketing/benefits/BenefitsTitle.tsx`
- Modify: `src/components/marketing/benefits/BentoBenefitsGrid.tsx`
- Modify: `src/components/marketing/benefits/BenefitsAccordion.tsx`
- Modify: `src/components/marketing/benefits/DocsCTA.tsx`

**Step 1: Write failing gate checks**

Run:
```bash
rg -n -g '*.tsx' "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/marketing/benefits
rg -n -g '*.tsx' "dark:(bg|text|border|shadow)-" src/components/marketing/benefits
```
Expected: matches exist (FAIL baseline).

**Step 2: Implement minimal token migration**

- Migrate all benefits visual semantics to core tokens.
- Keep bento and accordion behavior and hierarchy stable.

**Step 3: Apply needed visual adjustments**

- Fix hover density, spacing rhythm, and text contrast if needed.

**Step 4: Re-run gate checks**

Run same commands as Step 1.
Expected: no banned matches in migrated benefits files.

**Step 5: Commit**

```bash
git add src/components/marketing/benefits/BenefitsSection.tsx src/components/marketing/benefits/BenefitsBadge.tsx src/components/marketing/benefits/BenefitsTitle.tsx src/components/marketing/benefits/BentoBenefitsGrid.tsx src/components/marketing/benefits/BenefitsAccordion.tsx src/components/marketing/benefits/DocsCTA.tsx
git commit -m "feat(ui-core): restyle benefits with core non-chat tokens"
```

---

### Task 4: Workflow Feature Section

**Files:**
- Modify: `src/components/marketing/features/WorkflowFeatureCMS.tsx`
- Modify: `src/components/marketing/features/WorkflowFeatureSection.tsx`

**Step 1: Write failing gate checks**

Run:
```bash
rg -n "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/marketing/features/WorkflowFeatureCMS.tsx src/components/marketing/features/WorkflowFeatureSection.tsx
rg -n "dark:(bg|text|border|shadow)-" src/components/marketing/features/WorkflowFeatureCMS.tsx src/components/marketing/features/WorkflowFeatureSection.tsx
```
Expected: matches exist (FAIL baseline).

**Step 2: Implement minimal token migration**

- Migrate text, frame, shadow, and state semantics to core tokens/showcase tokens.

**Step 3: Apply visual adjustment if needed**

- Keep copy-image layout balance and readability.

**Step 4: Re-run gate checks**

Run same commands as Step 1.
Expected: no banned matches in migrated workflow files.

**Step 5: Commit**

```bash
git add src/components/marketing/features/WorkflowFeatureCMS.tsx src/components/marketing/features/WorkflowFeatureSection.tsx
git commit -m "feat(ui-core): restyle workflow-feature with core non-chat tokens"
```

---

### Task 5: Refrasa Feature Section

**Files:**
- Modify: `src/components/marketing/features/RefrasaFeatureCMS.tsx`
- Modify: `src/components/marketing/features/RefrasaFeatureSection.tsx`

**Step 1: Write failing gate checks**

Run:
```bash
rg -n "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/marketing/features/RefrasaFeatureCMS.tsx src/components/marketing/features/RefrasaFeatureSection.tsx
rg -n "dark:(bg|text|border|shadow)-" src/components/marketing/features/RefrasaFeatureCMS.tsx src/components/marketing/features/RefrasaFeatureSection.tsx
```
Expected: matches exist (FAIL baseline).

**Step 2: Implement minimal token migration**

- Align refrasa section semantics with core token contract and workflow visual parity.

**Step 3: Apply visual adjustment if needed**

- Fix spacing/hierarchy differences introduced by migration.

**Step 4: Re-run gate checks**

Run same commands as Step 1.
Expected: no banned matches in migrated refrasa files.

**Step 5: Commit**

```bash
git add src/components/marketing/features/RefrasaFeatureCMS.tsx src/components/marketing/features/RefrasaFeatureSection.tsx
git commit -m "feat(ui-core): restyle refrasa-feature with core non-chat tokens"
```

---

### Task 6: Pricing Teaser Section

**Files:**
- Modify: `src/components/marketing/pricing-teaser/PricingTeaser.tsx`
- Modify: `src/components/marketing/pricing-teaser/TeaserCard.tsx`
- Modify: `src/components/marketing/pricing-teaser/TeaserCarousel.tsx`
- Modify: `src/components/marketing/pricing-teaser/TeaserCTA.tsx`
- Modify: `src/components/marketing/pricing-teaser/PricingTeaserBadge.tsx`
- Modify: `src/components/marketing/pricing-teaser/PricingTeaserTitle.tsx`
- Modify: `src/components/marketing/pricing-teaser/TeaserSkeleton.tsx`

**Step 1: Write failing gate checks**

Run:
```bash
rg -n -g '*.tsx' "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/marketing/pricing-teaser
rg -n -g '*.tsx' "dark:(bg|text|border|shadow)-" src/components/marketing/pricing-teaser
```
Expected: matches exist (FAIL baseline).

**Step 2: Implement minimal token migration**

- Migrate pricing card states, badge states, carousel controls, and CTA semantics to core token contract.

**Step 3: Apply visual adjustment if needed**

- Preserve pricing hierarchy and highlighted plan emphasis.

**Step 4: Re-run gate checks**

Run same commands as Step 1.
Expected: no banned matches in migrated pricing teaser files.

**Step 5: Commit**

```bash
git add src/components/marketing/pricing-teaser/PricingTeaser.tsx src/components/marketing/pricing-teaser/TeaserCard.tsx src/components/marketing/pricing-teaser/TeaserCarousel.tsx src/components/marketing/pricing-teaser/TeaserCTA.tsx src/components/marketing/pricing-teaser/PricingTeaserBadge.tsx src/components/marketing/pricing-teaser/PricingTeaserTitle.tsx src/components/marketing/pricing-teaser/TeaserSkeleton.tsx
git commit -m "feat(ui-core): restyle pricing-teaser with core non-chat tokens"
```

---

### Task 7: Footer Section

**Files:**
- Modify: `src/components/layout/footer/Footer.tsx`

**Step 1: Write failing gate checks**

Run:
```bash
rg -n "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/layout/footer/Footer.tsx
rg -n "dark:(bg|text|border|shadow)-" src/components/layout/footer/Footer.tsx
```
Expected: matches may exist (FAIL baseline if any).

**Step 2: Implement minimal token migration**

- Migrate footer colors/hover/border interactions to core semantic tokens.

**Step 3: Apply visual adjustment if needed**

- Keep shell parity with GlobalHeader and readability in both themes.

**Step 4: Re-run gate checks**

Run same commands as Step 1.
Expected: no banned matches in migrated footer file.

**Step 5: Commit**

```bash
git add src/components/layout/footer/Footer.tsx
git commit -m "feat(ui-core): restyle footer with core non-chat tokens"
```

---

### Task 8: Final Cross-Section Verification

**Files:**
- Verify: `src/components/layout/header/GlobalHeader.tsx`
- Verify: `src/components/marketing/hero/*`
- Verify: `src/components/marketing/benefits/*`
- Verify: `src/components/marketing/features/*`
- Verify: `src/components/marketing/pricing-teaser/*`
- Verify: `src/components/layout/footer/Footer.tsx`
- Verify: `src/app/(marketing)/layout.tsx`
- Verify: `src/app/globals-new.css`

**Step 1: Run global non-chat gate scans**

Run:
```bash
rg -n -g '*.tsx' "slate-|stone-|amber-|emerald-|rose-|sky-|rgba\(|oklch\(" src/components/layout/header/GlobalHeader.tsx src/components/marketing/hero src/components/marketing/benefits src/components/marketing/features src/components/marketing/pricing-teaser src/components/layout/footer/Footer.tsx
rg -n -g '*.tsx' "dark:(bg|text|border|shadow)-" src/components/layout/header/GlobalHeader.tsx src/components/marketing/hero src/components/marketing/benefits src/components/marketing/features src/components/marketing/pricing-teaser src/components/layout/footer/Footer.tsx
rg -n "data-ui-scope=\"core\"" src/app/'(marketing)'/layout.tsx
rg -n "\[data-ui-scope=\"core\"\]|--core-" src/app/globals-new.css
```
Expected:
- No banned matches in migrated target files.
- Scope and core token definitions are present.

**Step 2: Run lightweight quality checks**

Run:
```bash
npm run lint
npm run typecheck
```
Expected: no new errors introduced by the migration.

**Step 3: Enforce commit-count policy**

- Do not create any extra final commit.
- Final state must remain exactly 7 section commits (1 commit per section).
