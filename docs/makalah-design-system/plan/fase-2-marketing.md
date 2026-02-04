# FASE 2: Marketing Pages - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ⏳ Pending
> **Total Tasks**: 5
> **Prerequisite**: FASE 1 (Global Shell) completed

**Goal:** Migrasi semua halaman marketing publik (Home, Pricing, About, Blog, Documentation) ke standar Mechanical Grace.

**Architecture:**
- Halaman marketing adalah user-facing pertama kali
- Visual harus premium, industrial, dan presisi
- Maintain hero sections dengan Geist typography
- Background patterns menggunakan industrial textures

**Tech Stack:** Tailwind CSS v4, iconoir-react, shadcn/ui

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Relevansi |
|---|---------|-----------|
| 1 | **MANIFESTO** | Filosofi Mechanical Grace, industrial aesthetics |
| 2 | **Global CSS** | Token warna OKLCH |
| 3 | **Typography** | Display/Body hierarchy, Geist Sans/Mono |
| 4 | **Color** | Amber (CTA), Slate (neutrals), Emerald (trust) |
| 5 | **Shape & Layout** | `.rounded-shell` for cards, `.rounded-action` for buttons |
| 6 | **Visual Language** | Iconoir, industrial textures (Grid, Diagonal Stripes, Dots) |
| 7 | **Components** | Card, Button, Badge standards |
| 8 | **Class Naming** | Utility class conventions |

### Target Files
| File | Path | Lucide Icons |
|------|------|--------------|
| Home Page | `src/app/(marketing)/page.tsx` | (via components) |
| Pricing Page | `src/app/(marketing)/pricing/page.tsx` | TBD |
| About Page | `src/app/(marketing)/about/page.tsx` | TBD |
| Blog Page | `src/app/(marketing)/blog/page.tsx` | Search, ArrowRight |
| Documentation Page | `src/app/(marketing)/documentation/page.tsx` | BookOpen, FileText, Globe, Lightbulb, Search, Settings, ShieldCheck, Users, Zap, ChevronRight, ChevronLeft, Loader2 |
| ChatInputHeroMock | `src/components/marketing/hero/ChatInputHeroMock.tsx` | Send |

---

## Icon Replacement Mapping

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `Search` | `Search` | Search input |
| `ArrowRight` | `ArrowRight` | Read more links |
| `BookOpen` | `Book` | Docs icon |
| `FileText` | `Page` atau `Notes` | File/document |
| `Globe` | `Globe` | Global/web |
| `Lightbulb` | `LightBulb` | Tips/ideas |
| `Settings` | `Settings` | Configuration |
| `ShieldCheck` | `ShieldCheck` | Security/privacy |
| `Users` | `Group` | Community/team |
| `Zap` | `Flash` | Speed/features |
| `ChevronRight` | `NavArrowRight` | Navigation |
| `ChevronLeft` | `NavArrowLeft` | Navigation |
| `Loader2` | Custom spinner | Loading |
| `Send` | `Send` | Send button |

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated Home components | `src/components/marketing/hero/` |
| Migrated Blog Page | `src/app/(marketing)/blog/page.tsx` |
| Migrated Docs Page | `src/app/(marketing)/documentation/page.tsx` |
| Migrated Pricing Page | `src/app/(marketing)/pricing/page.tsx` |
| Migrated About Page | `src/app/(marketing)/about/page.tsx` |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-2-task-*.md` |

---

## Tasks

### Task 2.1: Migrate Home Page Hero Components

**Files:**
- Modify: `src/components/marketing/hero/ChatInputHeroMock.tsx`
- Review: All hero components for styling consistency

**Reference:**
- [bahasa-visual.md](../docs/bahasa-visual.md) - Iconoir specs
- [komponen-standar.md](../docs/komponen-standar.md) - Button standards

**Step 1: Replace Lucide import in ChatInputHeroMock**

```tsx
// Current (remove)
import { Send } from "lucide-react"

// New (add)
import { Send } from "iconoir-react"
```

**Step 2: Verify Hero styling consistency**

Check these components align with Mechanical Grace:
- `HeroHeading.tsx` - Typography should use design system fonts
- `HeroCTA.tsx` - Buttons should use `.rounded-action`
- `PawangBadge.tsx` - Badge should use `.rounded-badge`

**Step 3: Review background patterns**

Verify these use industrial textures correctly:
- `GridPattern.tsx` - 48px grid
- `DiagonalStripes.tsx` - `/\/\/` pattern
- `DottedPattern.tsx` - Micro dots

**Step 4: Verify build succeeds**

```bash
npm run build
```

**Step 5: Visual verification**

- Open `/` (home page)
- Check hero section renders correctly
- Verify Send icon in mock chat input

**Step 6: Update progress.md & write report**

**Step 7: Commit**

```bash
git add src/components/marketing/hero/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(marketing-home): migrate hero components to Mechanical Grace"
```

---

### Task 2.2: Migrate Pricing Page

**Files:**
- Review: `src/app/(marketing)/pricing/page.tsx`
- Review: `src/components/marketing/pricing/PricingCard.tsx`
- Review: `src/components/marketing/pricing/PricingCarousel.tsx`

**Reference:**
- [komponen-standar.md](../docs/komponen-standar.md) - Card standards
- [justifikasi-warna.md](../docs/justifikasi-warna.md) - Tier colors (Gratis/BPP/Pro)

**Step 1: Audit for Lucide icons**

Search for any Lucide imports in pricing components.

**Step 2: Apply Mechanical Grace styling**

- Pricing cards: `.rounded-shell` (16px)
- Feature checkmarks: Use Iconoir `Check` icon
- Price text: `.text-interface` (Geist Mono) for numbers
- Tier badges: Use segment colors (`--segment-gratis`, `--segment-bpp`, `--segment-pro`)

**Step 3: Verify tier visual hierarchy**

- Gratis: Emerald accent
- BPP: Sky accent
- Pro: Amber accent (highlighted)

**Step 4: Verify build & visual**

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/app/(marketing)/pricing/
git add src/components/marketing/pricing/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(marketing-pricing): apply Mechanical Grace styling"
```

---

### Task 2.3: Migrate About Page

**Files:**
- Review: `src/app/(marketing)/about/page.tsx`

**Reference:**
- [shape-layout.md](../docs/shape-layout.md) - Layout grid
- [typografi.md](../docs/typografi.md) - Narrative text standards

**Step 1: Audit for Lucide icons**

Search for any Lucide imports.

**Step 2: Apply Mechanical Grace styling**

- Section headings: Display typography
- Body text: `.text-narrative` (Geist Sans)
- Team cards (if any): `.rounded-shell`
- Timeline/milestones (if any): Hairline borders

**Step 3: Verify build & visual**

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/app/(marketing)/about/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(marketing-about): apply Mechanical Grace styling"
```

---

### Task 2.4: Migrate Blog Page

**Files:**
- Modify: `src/app/(marketing)/blog/page.tsx`

**Reference:**
- [bahasa-visual.md](../docs/bahasa-visual.md) - Icon sizing

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import { Search, ArrowRight } from "lucide-react"

// New (add)
import { Search, ArrowRight } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

- Blog cards: `.rounded-shell` for containers
- Category badges: `.rounded-badge`
- Search input: `.rounded-action`, `.border-hairline`
- Read more links: Arrow icon should be `.icon-interface`
- Date/author metadata: `.text-interface` (Geist Mono)

**Step 3: Verify build & visual**

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/app/(marketing)/blog/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(marketing-blog): migrate to Mechanical Grace + Iconoir"
```

---

### Task 2.5: Migrate Documentation Page

**Files:**
- Modify: `src/app/(marketing)/documentation/page.tsx`

**Reference:**
- [bahasa-visual.md](../docs/bahasa-visual.md) - Icon sizing
- [ai-elements.md](../docs/ai-elements.md) - Dense information layouts

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import {
  BookOpen, FileText, Globe, Lightbulb, Search,
  Settings, ShieldCheck, Users, Zap,
  ChevronRight, ChevronLeft, Loader2,
} from "lucide-react"

// New (add)
import {
  Book, Page, Globe, LightBulb, Search,
  Settings, ShieldCheck, Group, Flash,
  NavArrowRight, NavArrowLeft,
} from "iconoir-react"
```

**Step 2: Update icon references in JSX**

Map each icon usage to new names.

**Step 3: Apply Mechanical Grace styling**

- Doc sections: `.rounded-shell` containers
- Navigation: Sidebar with `.active-nav` states
- Search: `.rounded-action` input
- Section icons: `.icon-display` (24px)
- Breadcrumbs: `.text-interface` with chevron icons
- Code blocks (if any): Mono font, `.border-hairline`

**Step 4: Verify build & visual**

- Test navigation between doc sections
- Test mobile responsive layout
- Test search functionality

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/app/(marketing)/documentation/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(marketing-docs): migrate to Mechanical Grace + Iconoir"
```

---

## Final Verification Checklist

### Build & Runtime
- [ ] `npm run build` sukses
- [ ] `npm run dev` berjalan normal
- [ ] No console errors

### Visual Checks - All Pages
- [ ] Home page hero displays correctly
- [ ] Pricing tiers visually distinct
- [ ] About page narrative readable
- [ ] Blog cards render properly
- [ ] Documentation navigation works

### Mechanical Grace Compliance
- [ ] All Lucide icons replaced with Iconoir
- [ ] Cards use `.rounded-shell` (16px)
- [ ] Buttons use `.rounded-action` (8px)
- [ ] Mono font for numbers/metadata
- [ ] Industrial textures maintained

---

## Update MASTER-PLAN.md

Setelah FASE 2 selesai:

```markdown
| 2 - Marketing | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 3: Auth & Onboarding** → `plan/fase-3-auth-onboarding.md`
