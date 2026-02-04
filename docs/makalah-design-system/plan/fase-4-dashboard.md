# FASE 4: Dashboard - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: 🔄 In Progress (Task 4.1 ✅, Task 4.2 ✅)
> **Total Tasks**: 4
> **Prerequisite**: FASE 3 (Auth & Onboarding) completed

**Goal:** Migrasi area dashboard user (Papers Library, Settings, Subscription) ke standar Mechanical Grace.

**Architecture:**
- Dashboard adalah post-login area sebelum masuk chat
- Papers library menampilkan daftar paper sessions
- Subscription management untuk tier upgrade/topup
- Settings modal untuk user profile

**Tech Stack:** Tailwind CSS v4, iconoir-react, shadcn/ui

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Relevansi |
|---|---------|-----------|
| 1 | **MANIFESTO** | Filosofi Mechanical Grace |
| 2 | **Global CSS** | Token warna OKLCH |
| 3 | **Typography** | Data tables (Mono), labels (Sans) |
| 4 | **Color** | Segment colors (Gratis/BPP/Pro) |
| 5 | **Shape & Layout** | `.rounded-shell` for cards |
| 6 | **Visual Language** | Iconoir icons |
| 7 | **Components** | Card, Table, Modal standards |
| 8 | **AI Elements** | PaperSessionCard specs |
| 9 | **Class Naming** | Utility class conventions |

### Target Files
| File | Path | Lucide Icons |
|------|------|--------------|
| Dashboard Page | `src/app/(dashboard)/dashboard/page.tsx` | AlertCircle |
| Subscription Layout | `src/app/(dashboard)/subscription/layout.tsx` | LayoutDashboard, CreditCard, History, ArrowUpCircle, Menu, X |
| Subscription Overview | `src/app/(dashboard)/subscription/overview/page.tsx` | ArrowUpCircle, CreditCard, Sparkles, TrendingUp, MessageSquare, FileText, Search, RefreshCw, Loader2 |
| Subscription Plans | `src/app/(dashboard)/subscription/plans/page.tsx` | CreditCard, Check, ChevronDown/Up, Sparkles, QrCode, Building2, Wallet, CheckCircle2, Loader2, Copy, ExternalLink, Clock, AlertCircle, ArrowRight, RefreshCw |
| Subscription History | `src/app/(dashboard)/subscription/history/page.tsx` | History, ArrowUpRight, ArrowDownRight, Loader2 |
| TopUp Success | `src/app/(dashboard)/subscription/topup/success/page.tsx` | CheckCircle2, ArrowRight |
| TopUp Failed | `src/app/(dashboard)/subscription/topup/failed/page.tsx` | XCircle, ArrowLeft, RefreshCw |
| UserSettingsModal | `src/components/settings/UserSettingsModal.tsx` | ArrowUpCircle, BadgeCheck, Eye, EyeOff, Shield, User, X |

---

## Icon Replacement Mapping

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `AlertCircle` | `WarningCircle` | Warning state |
| `LayoutDashboard` | `Dashboard` | Dashboard nav |
| `CreditCard` | `CreditCard` | Payment/billing |
| `History` | `HistoricShield` atau `Clock` | History nav |
| `ArrowUpCircle` | `ArrowUpCircle` | Upgrade CTA |
| `Menu` | `Menu` | Mobile menu |
| `X` | `Xmark` | Close button |
| `Sparkles` | `Sparkles` | Pro features |
| `TrendingUp` | `TrendingUp` | Usage stats |
| `MessageSquare` | `ChatBubble` | Chat messages |
| `FileText` | `Page` | Papers |
| `Search` | `Search` | Search |
| `RefreshCw` | `Refresh` | Refresh/retry |
| `Loader2` | Custom spinner | Loading |
| `Check` | `Check` | Selected/complete |
| `ChevronDown` | `NavArrowDown` | Expand |
| `ChevronUp` | `NavArrowUp` | Collapse |
| `QrCode` | `QrCode` | QR payment |
| `Building2` | `Building` | Bank transfer |
| `Wallet` | `Wallet` | E-wallet |
| `CheckCircle2` | `Check` | Success |
| `Copy` | `Copy` | Copy action |
| `ExternalLink` | `OpenNewWindow` | External link |
| `Clock` | `Clock` | Pending/time |
| `ArrowRight` | `ArrowRight` | Next/continue |
| `ArrowLeft` | `ArrowLeft` | Back |
| `XCircle` | `XmarkCircle` | Failed |
| `ArrowUpRight` | `ArrowUpRight` | Credit in |
| `ArrowDownRight` | `ArrowDownRight` | Credit out |
| `BadgeCheck` | `BadgeCheck` | Verified |
| `Eye` | `Eye` | Show password |
| `EyeOff` | `EyeOff` | Hide password |
| `Shield` | `Shield` | Security |
| `User` | `User` | Profile |

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated Dashboard | `src/app/(dashboard)/dashboard/page.tsx` |
| Migrated Subscription pages | `src/app/(dashboard)/subscription/**/*.tsx` |
| Migrated UserSettingsModal | `src/components/settings/UserSettingsModal.tsx` |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-4-task-*.md` |

---

## Tasks

### Task 4.1: Migrate Dashboard Main Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md) - PaperSessionCard specs

**Step 1: Replace Lucide import**

```tsx
// Current (remove)
import { AlertCircle } from "lucide-react"

// New (add)
import { WarningCircle } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

- Paper cards: `.rounded-shell` (16px) per ai-elements.md
- Card metadata: `.text-interface` (Geist Mono) for word count, percentage
- Empty state: Industrial style, Mono text
- Grid layout: Responsive with consistent gaps

**Step 3: Verify build & visual**

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(dashboard): migrate main page to Mechanical Grace"
```

---

### Task 4.2: Migrate Subscription Layout & Overview

**Files:**
- Modify: `src/app/(dashboard)/subscription/layout.tsx`
- Modify: `src/app/(dashboard)/subscription/overview/page.tsx`

**Reference:**
- [justifikasi-warna.md](../docs/justifikasi-warna.md) - Segment colors

**Step 1: Replace Lucide imports in layout**

```tsx
// Current (remove)
import {
  LayoutDashboard, CreditCard, History,
  ArrowUpCircle, Menu, X,
} from "lucide-react"

// New (add)
import {
  Dashboard, CreditCard, Clock,
  ArrowUpCircle, Menu, Xmark,
} from "iconoir-react"
```

**Step 2: Replace Lucide imports in overview**

```tsx
// Current (remove)
import {
  ArrowUpCircle, CreditCard, Sparkles, TrendingUp,
  MessageSquare, FileText, Search, RefreshCw, Loader2,
} from "lucide-react"

// New (add)
import {
  ArrowUpCircle, CreditCard, Sparkles, TrendingUp,
  ChatBubble, Page, Search, Refresh,
} from "iconoir-react"
```

**Step 3: Apply Mechanical Grace styling**

Layout:
- Sidebar nav: `.active-nav` for current item (Amber left line)
- Nav icons: `.icon-interface` (16px)
- Mobile menu: Smooth transitions

Overview:
- Stat cards: `.rounded-shell`
- Numbers/values: `.text-interface` (Geist Mono)
- Tier badges: Use segment colors
- Upgrade CTA: `bg-success` with `.rounded-action`

**Step 4: Verify build & visual**

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/app/(dashboard)/subscription/layout.tsx
git add src/app/(dashboard)/subscription/overview/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(subscription): migrate layout and overview to Mechanical Grace"
```

---

### Task 4.3: Migrate Subscription Pages (Plans, History, TopUp)

**Files:**
- Modify: `src/app/(dashboard)/subscription/plans/page.tsx`
- Modify: `src/app/(dashboard)/subscription/history/page.tsx`
- Modify: `src/app/(dashboard)/subscription/topup/page.tsx`
- Modify: `src/app/(dashboard)/subscription/topup/success/page.tsx`
- Modify: `src/app/(dashboard)/subscription/topup/failed/page.tsx`
- Modify: `src/app/(dashboard)/subscription/upgrade/page.tsx`

**Reference:**
- [komponen-standar.md](../docs/komponen-standar.md) - Table standards

**Step 1: Replace all Lucide imports**

For each file, replace lucide imports with iconoir equivalents per mapping table.

**Step 2: Apply Mechanical Grace styling**

Plans page:
- Package cards: `.rounded-shell`
- Selected state: Amber border
- Payment method icons: `.icon-display` (24px)
- Price display: `.text-interface` (Geist Mono)

History page:
- Table rows: `.border-hairline`
- Credit +/-: Emerald for credit in, Rose for credit out
- Dates: `.text-interface`

TopUp Success:
- Success card: `.rounded-shell`, Emerald accent
- Check icon: `.icon-display`, Emerald color

TopUp Failed:
- Error card: `.rounded-shell`, Rose accent
- X icon: `.icon-display`, Rose color

**Step 3: Verify build & visual**

- Test plans selection
- Test history display
- Test success/failed pages

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/app/(dashboard)/subscription/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(subscription): migrate all pages to Mechanical Grace + Iconoir"
```

---

### Task 4.4: Migrate UserSettingsModal

**Files:**
- Modify: `src/components/settings/UserSettingsModal.tsx`

**Reference:**
- [komponen-standar.md](../docs/komponen-standar.md) - Modal, Form standards

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import {
  ArrowUpCircle, BadgeCheck, Eye, EyeOff,
  Shield, User as UserIcon, X,
} from "lucide-react"

// New (add)
import {
  ArrowUpCircle, BadgeCheck, Eye, EyeOff,
  Shield, User, Xmark,
} from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

- Modal container: `.rounded-shell`
- Tab icons: `.icon-interface` (16px)
- Active tab: Amber indicator
- Form labels: `.text-interface` (Geist Mono)
- Input fields: `.rounded-action`
- Close button: Ghost style, `.icon-interface`
- Tier badge: Use segment colors
- Upgrade CTA: `bg-success`

**Step 3: Verify build & visual**

- Test modal open/close
- Test tab switching
- Test form interactions

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/settings/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(settings): migrate UserSettingsModal to Mechanical Grace + Iconoir"
```

---

## Final Verification Checklist

### Build & Runtime
- [ ] `npm run build` sukses
- [ ] `npm run dev` berjalan normal
- [ ] No console errors

### Visual Checks - Dashboard
- [ ] Papers grid displays correctly
- [ ] Paper cards have correct styling
- [ ] Empty state displays correctly

### Visual Checks - Subscription
- [ ] Sidebar navigation works
- [ ] Overview stats display correctly
- [ ] Plans selection works
- [ ] History table displays correctly
- [ ] TopUp success/failed pages work
- [ ] Upgrade flow works

### Visual Checks - Settings
- [ ] Modal opens/closes correctly
- [ ] Tabs switch correctly
- [ ] Form inputs styled correctly
- [ ] Tier badge displays correctly

### Mechanical Grace Compliance
- [ ] All Lucide icons replaced with Iconoir
- [ ] Cards use `.rounded-shell` (16px)
- [ ] Inputs use `.rounded-action` (8px)
- [ ] Mono font for numbers/metadata
- [ ] Segment colors correct

---

## Update MASTER-PLAN.md

Setelah FASE 4 selesai:

```markdown
| 4 - Dashboard | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 5: Chat Shell** → `plan/fase-5-chat-shell.md`
