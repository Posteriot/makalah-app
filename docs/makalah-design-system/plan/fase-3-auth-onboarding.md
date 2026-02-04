# FASE 3: Auth & Onboarding - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: 🔄 In Progress (Task 3.1 ✅, Task 3.2 ✅, Task 3.3 ✅, Task 3.4 pending validation)
> **Total Tasks**: 4
> **Prerequisite**: FASE 2 (Marketing) completed

**Goal:** Migrasi flow autentikasi (Sign In/Sign Up) dan onboarding (Get Started, Checkout) ke standar Mechanical Grace.

**Architecture:**
- Auth menggunakan Clerk dengan appearance override
- Onboarding flow: Sign Up → Get Started → Checkout (BPP/Pro)
- Checkout BPP menggunakan Xendit payment integration
- Visual harus konsisten dengan marketing pages

**Tech Stack:** Tailwind CSS v4, iconoir-react, Clerk, Xendit

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Relevansi |
|---|---------|-----------|
| 1 | **MANIFESTO** | Filosofi Mechanical Grace |
| 2 | **Global CSS** | Token warna OKLCH |
| 3 | **Typography** | Form labels (Mono), input values (Sans) |
| 4 | **Color** | Status colors (Emerald=success, Rose=error) |
| 5 | **Shape & Layout** | `.rounded-shell` for cards, `.rounded-action` for inputs |
| 6 | **Visual Language** | Iconoir icons |
| 7 | **Components** | Form, Card, Button standards |
| 8 | **Class Naming** | Utility class conventions |

### Target Files
| File | Path | Lucide Icons |
|------|------|--------------|
| Auth Layout | `src/app/(auth)/layout.tsx` | None |
| Sign Up Page | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | AlertCircle, CheckCircle, Mail |
| Sign In Page | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | TBD |
| Onboarding Layout | `src/app/(onboarding)/layout.tsx` | None |
| OnboardingHeader | `src/components/onboarding/OnboardingHeader.tsx` | X |
| Get Started Page | `src/app/(onboarding)/get-started/page.tsx` | CheckCircle2 |
| Checkout BPP | `src/app/(onboarding)/checkout/bpp/page.tsx` | CreditCard, ArrowLeft, QrCode, Building2, Wallet, CheckCircle2, Loader2, Copy, ExternalLink, Clock, AlertCircle |
| Checkout Pro | `src/app/(onboarding)/checkout/pro/page.tsx` | Crown, Construction |

---

## Icon Replacement Mapping

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `AlertCircle` | `WarningCircle` | Error/warning state |
| `CheckCircle` | `CheckCircle` | Success state |
| `CheckCircle2` | `Check` | Verified/complete |
| `Mail` | `Mail` | Email icon |
| `X` | `Xmark` | Close button |
| `CreditCard` | `CreditCard` | Payment method |
| `ArrowLeft` | `ArrowLeft` | Back navigation |
| `QrCode` | `QrCode` | QR payment |
| `Building2` | `Building` | Bank transfer |
| `Wallet` | `Wallet` | E-wallet |
| `Loader2` | Custom spinner | Loading state |
| `Copy` | `Copy` | Copy action |
| `ExternalLink` | `OpenNewWindow` | External link |
| `Clock` | `Clock` | Time/pending |
| `Crown` | `Crown` | Pro tier |
| `Construction` | `Construction` | Coming soon |

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated Sign Up | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` |
| Migrated Sign In | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` |
| Migrated OnboardingHeader | `src/components/onboarding/OnboardingHeader.tsx` |
| Migrated Get Started | `src/app/(onboarding)/get-started/page.tsx` |
| Migrated Checkout BPP | `src/app/(onboarding)/checkout/bpp/page.tsx` |
| Migrated Checkout Pro | `src/app/(onboarding)/checkout/pro/page.tsx` |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-3-task-*.md` |

---

## Tasks

### Task 3.1: Migrate Auth Pages (Sign Up & Sign In)

**Files:**
- Modify: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Review: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Review: `src/app/(auth)/layout.tsx`

**Reference:**
- [bahasa-visual.md](../docs/bahasa-visual.md) - Icon sizing
- [komponen-standar.md](../docs/komponen-standar.md) - Form standards

**Step 1: Replace Lucide imports in Sign Up**

```tsx
// Current (remove)
import { AlertCircle, CheckCircle, Mail } from "lucide-react"

// New (add)
import { WarningCircle, CheckCircle, Mail } from "iconoir-react"
```

**Step 2: Update JSX references**

- `<AlertCircle />` → `<WarningCircle />`
- Other icons might have same name

**Step 3: Apply Mechanical Grace styling to Auth layout**

Check `src/app/(auth)/layout.tsx`:
- Background: Verify uses `hero-vivid` class
- Grid overlay: Industrial pattern
- Card container: `.rounded-shell` (16px)

**Step 4: Check Sign In page for icons**

Audit `sign-in/[[...sign-in]]/page.tsx` for any Lucide usage.

**Step 5: Clerk appearance override**

Ensure Clerk components use design system tokens via `appearance` prop:
```tsx
appearance={{
  baseTheme: resolvedTheme === "dark" ? dark : undefined,
  variables: {
    colorPrimary: "oklch(.769 .188 70.08)", // Amber-500
    borderRadius: "8px", // .rounded-action
  },
}}
```

**Step 6: Verify build & visual**

- Test sign up flow
- Test sign in flow
- Verify theme toggle works with Clerk

**Step 7: Update progress.md & write report**

**Step 8: Commit**

```bash
git add src/app/(auth)/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(auth): migrate sign-up/sign-in to Mechanical Grace + Iconoir"
```

---

### Task 3.2: Migrate OnboardingHeader

**Files:**
- Modify: `src/components/onboarding/OnboardingHeader.tsx`

**Reference:**
- [bahasa-visual.md](../docs/bahasa-visual.md) - Icon sizing

**Step 1: Replace Lucide import**

```tsx
// Current (remove)
import { X } from "lucide-react"

// New (add)
import { Xmark } from "iconoir-react"
```

**Step 2: Update JSX**

- `<X />` → `<Xmark />`

**Step 3: Apply Mechanical Grace styling**

- Close button: `.icon-interface` (16px), ghost button with `.rounded-action`
- Header: Border bottom should use `.border-hairline`

**Step 4: Verify build & visual**

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/components/onboarding/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(onboarding-header): migrate to Mechanical Grace + Iconoir"
```

---

### Task 3.3: Migrate Get Started Page

**Files:**
- Modify: `src/app/(onboarding)/get-started/page.tsx`

**Reference:**
- [komponen-standar.md](../docs/komponen-standar.md) - Card, Button standards

**Step 1: Replace Lucide import**

```tsx
// Current (remove)
import { CheckCircle2 } from "lucide-react"

// New (add)
import { Check } from "iconoir-react"
```

**Step 2: Update JSX**

- `<CheckCircle2 />` → `<Check />`

**Step 3: Apply Mechanical Grace styling**

- Step cards: `.rounded-shell` containers
- Progress indicators: Use Amber for active, Slate for pending
- CTA buttons: `.rounded-action`, primary style

**Step 4: Verify build & visual**

- Test get-started flow
- Verify step progression

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/app/(onboarding)/get-started/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(get-started): migrate to Mechanical Grace + Iconoir"
```

---

### Task 3.4: Migrate Checkout Pages

**Files:**
- Modify: `src/app/(onboarding)/checkout/bpp/page.tsx`
- Modify: `src/app/(onboarding)/checkout/pro/page.tsx`

**Reference:**
- [komponen-standar.md](../docs/komponen-standar.md) - Card, Form standards
- [justifikasi-warna.md](../docs/justifikasi-warna.md) - Tier colors

**Step 1: Replace Lucide imports in BPP Checkout**

```tsx
// Current (remove)
import {
  CreditCard, ArrowLeft, QrCode, Building2, Wallet,
  CheckCircle2, Loader2, Copy, ExternalLink, Clock, AlertCircle,
} from "lucide-react"

// New (add)
import {
  CreditCard, ArrowLeft, QrCode, Building, Wallet,
  Check, Copy, OpenNewWindow, Clock, WarningCircle,
} from "iconoir-react"
```

**Step 2: Replace Lucide imports in Pro Checkout**

```tsx
// Current (remove)
import { Crown, Construction } from "lucide-react"

// New (add)
import { Crown, Construction } from "iconoir-react"
```

**Step 3: Update JSX references**

Map all icon usages to new names:
- `Building2` → `Building`
- `CheckCircle2` → `Check`
- `ExternalLink` → `OpenNewWindow`
- `AlertCircle` → `WarningCircle`

**Step 4: Apply Mechanical Grace styling**

BPP Checkout:
- Package cards: `.rounded-shell`
- Selected state: Amber border/highlight
- Payment method icons: `.icon-display` (24px)
- Price display: `.text-interface` (Geist Mono)
- QR code container: `.rounded-action`
- Copy button: Ghost style with `.icon-interface`
- Status indicators: Use semantic colors (Emerald=success, Amber=pending, Rose=error)

Pro Checkout:
- Coming soon card: `.rounded-shell`, muted styling
- Crown icon: `.icon-display`, Amber color

**Step 5: Verify build & visual**

- Test BPP checkout flow
- Verify payment method selection
- Verify QR code display
- Test Pro checkout (coming soon state)

**Step 6: Update progress.md & write report**

**Step 7: Commit**

```bash
git add src/app/(onboarding)/checkout/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(checkout): migrate BPP/Pro to Mechanical Grace + Iconoir"
```

---

## Final Verification Checklist

### Build & Runtime
- [ ] `npm run build` sukses
- [ ] `npm run dev` berjalan normal
- [ ] No console errors

### Visual Checks - Auth
- [ ] Sign Up page renders correctly
- [ ] Sign In page renders correctly
- [ ] Clerk components styled correctly
- [ ] Theme toggle works
- [ ] Error states display correctly

### Visual Checks - Onboarding
- [ ] OnboardingHeader close button works
- [ ] Get Started steps display correctly
- [ ] Step progression works

### Visual Checks - Checkout
- [ ] BPP package cards display correctly
- [ ] Payment method selection works
- [ ] QR code displays correctly
- [ ] Copy functionality works
- [ ] Pro coming soon page displays correctly

### Mechanical Grace Compliance
- [ ] All Lucide icons replaced with Iconoir
- [ ] Cards use `.rounded-shell` (16px)
- [ ] Inputs use `.rounded-action` (8px)
- [ ] Mono font for prices/numbers
- [ ] Status colors correct (Emerald/Amber/Rose)

---

## Update MASTER-PLAN.md

Setelah FASE 3 selesai:

```markdown
| 3 - Auth & Onboarding | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 4: Dashboard** → `plan/fase-4-dashboard.md`
