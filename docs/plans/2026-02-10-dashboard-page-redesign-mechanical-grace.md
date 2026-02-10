# Dashboard Section Redesign (Mechanical Grace) — Implementation Plan

**Goal:** Migrate `src/app/(dashboard)` (Admin, Subscription, Papers) to Makalah-Carbon Mechanical Grace with consistent 16-column layout, Mono-first interface typography, hybrid radius, and hairline borders, while preserving all existing business logic and data flows.

**Architecture:** Dashboard currently uses server layout (`src/app/(dashboard)/layout.tsx`) + route-level client modules (`AdminPanelContainer`, subscription pages, paper sessions). Migration scope is **visual and structural UI only**. Auth, Convex query/mutation flow, role checks, and payment flow remain untouched.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Convex, Clerk, Iconoir

**Key References:**
- Justification doc: `docs/makalah-design-system/justification-docs/dashboard-redesign.md`
- Design system core: `docs/makalah-design-system/docs/MANIFESTO.md`
- Naming rules: `docs/makalah-design-system/docs/class-naming-convention.md`
- Color rules: `docs/makalah-design-system/docs/justifikasi-warna.md`
- Shape/layout rules: `docs/makalah-design-system/docs/shape-layout.md`
- Typography rules: `docs/makalah-design-system/docs/typografi.md`
- Component blueprint: `docs/makalah-design-system/docs/komponen-standar.md`

**Current State Snapshot:**
- `src/app/(dashboard)/layout.tsx` still renders global `Footer`; this may conflict with chat-like workspace efficiency principle but is acceptable for dashboard unless redesign requires mini-footer pattern.
- `src/app/(dashboard)/dashboard/page.tsx` already has admin gate logic and should stay logic-stable.
- `src/components/admin/AdminPanelContainer.tsx` already partially Mechanical Grace but still relies on mixed utility decisions and legacy support CSS.
- `src/app/admin-styles.css` still contains non-tokenized custom classes; partial technical debt target for cleanup.
- `src/app/(dashboard)/subscription/*` has mixed visual language (some generic shadcn patterns, some Mechanical Grace tokens).
- `src/components/paper/*` pages are functionally stable; visual consistency with dashboard shell still incomplete.

**Migration Strategy (Best Recommendation):**
- Use incremental migration by vertical slice: **Shell -> Admin -> Subscription -> Papers -> Cleanup + Verification**.
- Keep every commit scoped and reversible.
- Avoid broad refactor of logic-heavy components in one pass.

---

## Task 1: Foundation Shell — Normalize Dashboard Layout Surface

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Confirm dashboard shell contract**
- Keep `GlobalHeader` integration and `ensureConvexUser()` logic unchanged.
- Keep `main.dashboard-main` as the single content host for all dashboard sub-routes.

**Step 2: Align shell spacing + border behavior**
- Ensure `.dashboard-main` spacing and max width are consistent with Mechanical Grace density target.
- Keep route-specific overrides (`:has(.admin-container)`, `:has(.subscription-container)`) but standardize border/radius tokens.

**Step 3: Validate responsive baseline**
- Verify desktop, tablet, mobile for:
  - content clipping
  - header overlap
  - sidebar offset

**Verification Checklist (Task 1):**
- [ ] Header does not overlap dashboard content.
- [ ] Dashboard container uses consistent tokenized spacing.
- [ ] No visual regression on `dashboard`, `subscription`, and `papers` entry routes.

**Commit:**
```bash
git add src/app/(dashboard)/layout.tsx src/app/globals.css
git commit -m "refactor(dashboard): normalize shell layout and spacing tokens"
```

---

## Task 2: Admin Module — Full Mechanical Grace Consolidation

**Files:**
- Modify: `src/components/admin/AdminPanelContainer.tsx`
- Modify: `src/components/admin/UserList.tsx`
- Modify: `src/components/admin/SystemPromptsManager.tsx`
- Modify: `src/components/admin/SystemHealthPanel.tsx`
- Modify: `src/components/admin/AIProviderManager.tsx`
- Modify: `src/components/admin/StyleConstitutionManager.tsx`
- Modify: `src/components/admin/WaitlistManager.tsx`

**Step 1: Standardize structure and typography**
- Enforce Mono for technical headers, counts, status labels.
- Keep narrative descriptions in Sans where explicitly informational.
- Replace ad-hoc radius classes with `rounded-shell`, `rounded-action`, `rounded-badge`.

**Step 2: Standardize interaction states**
- Apply consistent active nav indicator pattern (`active-nav` style intent).
- Harmonize focus/hover behavior with `focus-ring` and stable contrast.

**Step 3: Tighten data density**
- Use hairline separators for internal lists/tables where possible.
- Ensure table numerics and IDs use tabular mono-friendly style.

**Verification Checklist (Task 2):**
- [ ] Admin sidebar and content follow one visual language (no mixed legacy style blocks).
- [ ] Role/status badges use approved semantic colors.
- [ ] All admin heavy-data areas are readable in both light and dark mode.

**Commit:**
```bash
git add src/components/admin
git commit -m "refactor(admin): apply Mechanical Grace standards across admin modules"
```

---

## Task 3: Subscription Area — Unify Layout and Card Semantics

**Files:**
- Modify: `src/app/(dashboard)/subscription/layout.tsx`
- Modify: `src/app/(dashboard)/subscription/overview/page.tsx`
- Modify: `src/app/(dashboard)/subscription/plans/page.tsx`
- Modify: `src/app/(dashboard)/subscription/history/page.tsx`
- Modify: `src/app/(dashboard)/subscription/topup/success/page.tsx`
- Modify: `src/app/(dashboard)/subscription/topup/failed/page.tsx`

**Step 1: Sidebar + content grid consistency**
- Align subscription shell to the same density and token conventions as admin shell.
- Keep mobile drawer behavior unchanged functionally.

**Step 2: Card and status hierarchy**
- Standardize tier cards, quota indicators, and transaction list semantics.
- Ensure credit/tier/highlight states map to approved segment/status colors.

**Step 3: Success/failure pages**
- Redesign success/failed states to Mechanical Grace style while preserving route and CTA flow.

**Verification Checklist (Task 3):**
- [ ] Subscription sidebar active state is visually consistent with dashboard standards.
- [ ] Overview/plans/history share the same card grammar (radius, border, typography).
- [ ] Top-up success and failed pages still route correctly and look consistent.

**Commit:**
```bash
git add src/app/(dashboard)/subscription
git commit -m "refactor(subscription): align subscription module with Mechanical Grace system"
```

---

## Task 4: Papers Area — Integrate with Dashboard Visual System

**Files:**
- Modify: `src/app/(dashboard)/dashboard/papers/page.tsx`
- Modify: `src/components/paper/PaperSessionsContainer.tsx`
- Modify: `src/components/paper/PaperSessionsList.tsx`
- Modify: `src/components/paper/PaperSessionCard.tsx`
- Modify: `src/components/paper/PaperSessionsEmpty.tsx`

**Step 1: Page scaffold**
- Update papers page heading and metadata style to dashboard standard.

**Step 2: Card/list system**
- Apply shell/action/badge radius logic and hairline separators.
- Enforce Mono on technical metadata (timestamps, stage labels, counts).

**Step 3: Empty/loading states**
- Keep current logic, but align skeleton and empty states with industrial visual language.

**Verification Checklist (Task 4):**
- [ ] Papers page feels part of the same dashboard family.
- [ ] Status badges and metadata typography follow Mono-first rule.
- [ ] No regression in filtering/sorting/session actions.

**Commit:**
```bash
git add src/app/(dashboard)/dashboard/papers/page.tsx src/components/paper
git commit -m "refactor(papers): migrate paper sessions UI to Mechanical Grace language"
```

---

## Task 5: Legacy CSS Cleanup — Remove `admin-styles.css` Dependency

**Files:**
- Modify: `src/components/admin/AdminPanelContainer.tsx`
- Delete or reduce: `src/app/admin-styles.css`

**Step 1: Inventory usage**
- Confirm whether any admin component still depends on class selectors from `admin-styles.css`.

**Step 2: Migrate remaining styles to tokenized utilities**
- Replace legacy class-based styling with Tailwind v4 + existing global tokens.

**Step 3: Safe removal**
- Remove import `@/app/admin-styles.css` only after all dependents are migrated.

**Verification Checklist (Task 5):**
- [ ] No functional component relies on removed CSS classes.
- [ ] Admin UI remains visually identical or improved after cleanup.
- [ ] No unused style artifact remains in dashboard scope.

**Commit:**
```bash
git add src/components/admin src/app/admin-styles.css
git commit -m "refactor(admin): remove legacy admin styles and fully tokenized UI"
```

---

## Task 6: End-to-End Verification and Regression Guard

**Files/Areas:**
- Validate all modified files from Tasks 1-5

**Step 1: Static checks**
- Run lint for changed scope.

**Step 2: Runtime checks**
- Start dev server and verify:
  - `/dashboard` (admin gate + panel rendering)
  - `/dashboard/papers`
  - `/subscription/overview`
  - `/subscription/plans`
  - `/subscription/history`
  - `/subscription/topup/success`
  - `/subscription/topup/failed`

**Step 3: Role-based sanity checks**
- Confirm non-admin still blocked from admin dashboard route.
- Confirm user-specific queries still load for subscription and papers routes.

**Verification Checklist (Task 6):**
- [ ] `npm run lint` passes for changed scope.
- [ ] No runtime errors in dashboard/subscription/papers routes.
- [ ] Mobile sidebar/drawer interaction works for admin and subscription layouts.
- [ ] Dark mode and light mode contrast remain readable.

**Suggested Commands:**
```bash
npm run lint
npm run dev
```

---

## Final Acceptance Checklist

- [ ] Layout follows 16-column Mechanical Grace intent in dashboard modules.
- [ ] Typography hierarchy is consistent (`text-interface` for technical UI text).
- [ ] Hairline and border usage is tokenized and consistent.
- [ ] Status colors match semantic rules (amber/emerald/sky/rose).
- [ ] No logic/API/auth regression introduced.
- [ ] Legacy admin CSS dependency removed or minimized with clear justification.

---

## Execution Rules for This Plan

1. Execute tasks sequentially (Task 1 -> Task 6).
2. Do not modify business logic unless required to fix UI regression.
3. Commit after each completed task.
4. If a task fails verification, fix in the same task before moving forward.
5. Stop and request user validation if scope expansion is needed.
