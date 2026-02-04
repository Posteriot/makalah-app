# FASE 9: Admin Panel - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ⏳ Pending
> **Total Tasks**: 4
> **Prerequisite**: FASE 8 (Chat Tools) completed

**Goal:** Migrasi area admin (internal only) ke standar Mechanical Grace dengan fokus pada data density dan clarity.

**Architecture:**
- AdminPanelContainer sebagai layout utama dengan sidebar
- Data tables dengan dense grid dan Mono typography
- Form dialogs untuk create/edit operations
- System health monitoring

**Tech Stack:** Tailwind CSS v4, iconoir-react

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Relevansi |
|---|---------|-----------|
| 1 | **Shape & Layout** | Dense layout, 0px radius for data |
| 2 | **Typography** | Mono for all data |
| 3 | **Components** | Table, Form, Dialog standards |
| 4 | **Class Naming** | `.border-hairline`, `.text-interface` |

### Target Files
| File | Path | Lucide Icons |
|------|------|--------------|
| AdminPanelContainer | `src/components/admin/AdminPanelContainer.tsx` | Monitor, Menu, X, LayoutDashboard, CheckCircle2, UserCog, UserPlus, + dynamic icons |
| UserList | `src/components/admin/UserList.tsx` | ArrowUp, ArrowDown |
| SystemPromptsManager | `src/components/admin/SystemPromptsManager.tsx` | Multiple icons |
| SystemHealthPanel | `src/components/admin/SystemHealthPanel.tsx` | Multiple icons |
| StyleConstitutionManager | `src/components/admin/StyleConstitutionManager.tsx` | Multiple icons |
| StyleConstitutionVersionHistoryDialog | `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx` | Trash2 |
| WaitlistManager | `src/components/admin/WaitlistManager.tsx` | Multiple icons |
| AIProviderManager | `src/components/admin/AIProviderManager.tsx` | Multiple icons |
| AIProviderFormDialog | `src/components/admin/AIProviderFormDialog.tsx` | CheckCircle2, XCircle, Loader2, AlertTriangle, Shield, ShieldCheck, ShieldX |

---

## Icon Replacement Mapping (Common)

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `Monitor` | `Monitor` | System monitor |
| `Menu` | `Menu` | Mobile menu |
| `X` | `Xmark` | Close |
| `LayoutDashboard` | `Dashboard` | Dashboard |
| `CheckCircle2` | `CheckCircle` | Success/active |
| `UserCog` | `UserCog` | User management |
| `UserPlus` | `UserPlus` | Add user |
| `ArrowUp` | `ArrowUp` | Sort ascending |
| `ArrowDown` | `ArrowDown` | Sort descending |
| `Trash2` | `Trash` | Delete |
| `XCircle` | `XmarkCircle` | Error |
| `Loader2` | Custom spinner | Loading |
| `AlertTriangle` | `WarningTriangle` | Warning |
| `Shield` | `Shield` | Security |
| `ShieldCheck` | `ShieldCheck` | Verified |
| `ShieldX` | `ShieldXmark` | Not verified |

> **NOTE:** Admin components use many icons. Audit each file for complete list.

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated AdminPanelContainer | `src/components/admin/AdminPanelContainer.tsx` |
| Migrated UserList | `src/components/admin/UserList.tsx` |
| Migrated all admin components | `src/components/admin/*.tsx` |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-9-task-*.md` |

---

## Tasks

### Task 9.1: Migrate AdminPanelContainer

**Files:**
- Modify: `src/components/admin/AdminPanelContainer.tsx`

**Step 1: Audit all Lucide imports**

Read file completely and note all icons used, including dynamic ones from tab config.

**Step 2: Replace with Iconoir**

```tsx
// Remove lucide-react imports
// Add iconoir-react imports based on audit

import {
  Monitor, Menu, Xmark, Dashboard, CheckCircle,
  UserCog, UserPlus, // ... etc
} from "iconoir-react"
```

**Step 3: Update type definitions**

If component uses `LucideIcon` type, create equivalent for Iconoir or use generic `React.ComponentType`.

**Step 4: Apply Mechanical Grace styling**

Admin Panel Layout:
- Sidebar: Dense, minimal padding
- Nav items: `.active-nav` for current
- Content area: Full width utilization
- Mobile menu: Clean transitions

**Step 5: Verify build & visual**

**Step 6: Update progress.md & write report**

**Step 7: Commit**

```bash
git add src/components/admin/AdminPanelContainer.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(admin-layout): migrate to Mechanical Grace + Iconoir"
```

---

### Task 9.2: Migrate Data Tables (UserList, WaitlistManager)

**Files:**
- Modify: `src/components/admin/UserList.tsx`
- Modify: `src/components/admin/WaitlistManager.tsx`

**Step 1: Replace Lucide imports**

UserList:
```tsx
import { ArrowUp, ArrowDown } from "iconoir-react"
```

WaitlistManager: Audit and replace all icons.

**Step 2: Apply Mechanical Grace styling**

Data Tables:
- Container: No radius (0px) for data tables
- Headers: `.text-interface`, uppercase, Slate-500
- Rows: `.border-hairline` dividers
- Sort icons: `.icon-micro`
- Data cells: `.text-interface` (Geist Mono)
- Hover: Subtle `bg-list-hover-bg`

**Step 3: Verify build & visual**

- Test sort functionality
- Test pagination
- Test row interactions

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/admin/UserList.tsx
git add src/components/admin/WaitlistManager.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(admin-tables): migrate to Mechanical Grace + Iconoir"
```

---

### Task 9.3: Migrate System Management Components

**Files:**
- Modify: `src/components/admin/SystemPromptsManager.tsx`
- Modify: `src/components/admin/SystemHealthPanel.tsx`
- Modify: `src/components/admin/StyleConstitutionManager.tsx`
- Modify: `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx`

**Step 1: Audit and replace all Lucide imports in each file**

**Step 2: Apply Mechanical Grace styling**

System Prompts:
- List items: `.border-hairline`
- Active prompt: Amber indicator
- Version info: `.text-interface`

Health Panel:
- Status cards: Dense, no extra padding
- Metrics: `.text-interface` for numbers
- Status indicators: Semantic colors (Emerald/Amber/Rose)

Style Constitution:
- Version history: Dense list
- Delete button: Rose color

**Step 3: Verify build & visual**

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/admin/SystemPromptsManager.tsx
git add src/components/admin/SystemHealthPanel.tsx
git add src/components/admin/StyleConstitutionManager.tsx
git add src/components/admin/StyleConstitutionVersionHistoryDialog.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(admin-system): migrate system management to Mechanical Grace"
```

---

### Task 9.4: Migrate AI Provider Components

**Files:**
- Modify: `src/components/admin/AIProviderManager.tsx`
- Modify: `src/components/admin/AIProviderFormDialog.tsx`

**Step 1: Replace Lucide imports**

AIProviderFormDialog:
```tsx
import {
  CheckCircle, XmarkCircle, WarningTriangle,
  Shield, ShieldCheck, ShieldXmark
} from "iconoir-react"
```

AIProviderManager: Audit and replace all icons.

**Step 2: Apply Mechanical Grace styling**

Provider cards:
- Container: `.rounded-action` or no radius
- Status: Badge with semantic color
- Config values: `.text-interface`

Form dialog:
- Inputs: Standard form styling
- Validation icons: Semantic colors
- Test connection feedback: Industrial style

**Step 3: Verify build & visual**

- Test provider configuration
- Test connection testing
- Test form validation

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/admin/AIProviderManager.tsx
git add src/components/admin/AIProviderFormDialog.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(admin-ai): migrate AI provider components to Mechanical Grace"
```

---

## Final Verification Checklist

### Build & Runtime
- [ ] `npm run build` sukses
- [ ] `npm run dev` berjalan normal
- [ ] No console errors

### Visual Checks
- [ ] Admin layout displays correctly
- [ ] Sidebar navigation works
- [ ] Mobile menu works
- [ ] User list displays
- [ ] Sort works
- [ ] Waitlist manager works
- [ ] System prompts displays
- [ ] Health panel displays
- [ ] Style constitution manager works
- [ ] AI provider manager works
- [ ] Form dialogs work

### Mechanical Grace Compliance
- [ ] All Lucide icons replaced with Iconoir
- [ ] Data tables: 0px radius, hairline borders
- [ ] All data in Mono font
- [ ] Dense layout maintained
- [ ] Semantic colors for status

---

## Update MASTER-PLAN.md

Setelah FASE 9 selesai:

```markdown
| 9 - Admin | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 10: Cleanup** → `plan/fase-10-cleanup.md`
