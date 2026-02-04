# FASE 0: Foundation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ✅ Done
> **Total Tasks**: 6

**Goal:** Setup infrastruktur styling Mechanical Grace (tokens, utilities, dependencies) TANPA mengubah tampilan existing.

**Architecture:**
- Backup existing CSS/config ke `src/styles/legacy/` untuk rollback safety
- Buat globals.css baru dengan Makalah-Carbon tokens dalam format OKLCH
- Buat tailwind.config.ts baru dengan utility class mappings
- Install iconoir-react (coexist dengan lucide sampai FASE 10)

**Tech Stack:** Tailwind CSS v4, CSS Custom Properties (OKLCH), iconoir-react

**Reference Docs:**
- [global-css.md](../docs/global-css.md) - Token & variabel CSS
- [justifikasi-warna.md](../docs/justifikasi-warna.md) - Palet warna OKLCH
- [shape-layout.md](../docs/shape-layout.md) - Radius & border specs
- [class-naming-convention.md](../docs/class-naming-convention.md) - Utility class naming
- [bahasa-visual.md](../docs/bahasa-visual.md) - Iconoir specs

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Legacy backup | `src/styles/legacy/globals.legacy.css` |
| Legacy backup | `src/styles/legacy/tailwind.config.legacy.ts` |
| New globals | `src/app/globals.css` (overwrite) |
| New config | `tailwind.config.ts` (overwrite) |
| Package | `iconoir-react` in package.json |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-0-task-*.md` |

---

## Directory Structure

Sebelum mulai, pastikan struktur ini ada:

```
docs/makalah-design-system/
├── docs/                          # Design system specs (existing)
├── plan/                          # Planning docs
│   ├── MASTER-PLAN.md
│   └── fase-0-foundation.md       # This file
└── implementation/                # Implementation tracking
    ├── progress.md                # Progress log
    └── report/                    # Task reports
        └── fase-0-task-*.md
```

---

## Tasks

### Task 0.1: Create Legacy Backup Directory & Progress Log ✅ DONE

**Files:**
- Create: `src/styles/legacy/` (directory)
- Create: `docs/makalah-design-system/implementation/progress.md`

**Step 1: Create legacy backup directory**

```bash
mkdir -p src/styles/legacy
```

**Step 2: Create initial progress.md**

Create file `docs/makalah-design-system/implementation/progress.md`:

```markdown
# Implementation Progress Log

> Last updated: [TIMESTAMP]
> Current Phase: FASE 0 - Foundation
> Current Task: 0.1

---

## FASE 0: Foundation

### Session: [DATE]

| Task | Status | Notes |
|------|--------|-------|
| 0.1 - Create Legacy Backup Directory | 🔄 In Progress | - |
| 0.2 - Backup globals.css | ⏳ Pending | - |
| 0.3 - Backup tailwind.config.ts | ⏳ Pending | - |
| 0.4 - Create New globals.css | ⏳ Pending | - |
| 0.5 - Create New tailwind.config.ts | ⏳ Pending | - |
| 0.6 - Install iconoir-react | ⏳ Pending | - |

**Next Action**: Complete Task 0.1, update progress, write report

---
```

**Step 3: Verify directories exist**

```bash
ls -la src/styles/legacy/
ls -la docs/makalah-design-system/implementation/
```

Expected: Both directories exist

**Step 4: Update progress.md**

Update Task 0.1 status to `✅ Done`

**Step 5: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-0-task-1-backup-directory.md`:

```markdown
# Task Report: 0.1 - Create Legacy Backup Directory

> **Fase**: FASE 0 - Foundation
> **Task**: 0.1 - Create Legacy Backup Directory
> **Status**: ✅ Completed
> **Date**: [TIMESTAMP]

## Summary

Created directory structure for legacy backups and implementation tracking.

## Changes Made

| File | Action | Description |
|------|--------|-------------|
| `src/styles/legacy/` | Created | Directory for legacy CSS backups |
| `docs/makalah-design-system/implementation/progress.md` | Created | Progress tracking log |

## Verification

- [x] `src/styles/legacy/` directory exists
- [x] `docs/makalah-design-system/implementation/progress.md` exists
- [x] `docs/makalah-design-system/implementation/report/` directory exists

## Next Task

Lanjut ke: **Task 0.2 - Backup globals.css**
```

**Step 6: Commit**

```bash
git add src/styles/legacy/ docs/makalah-design-system/implementation/
git commit -m "refactor(foundation): create legacy backup directory and progress tracking"
```

---

### Task 0.2: Backup globals.css ✅ DONE

**Files:**
- Copy: `src/app/globals.css` → `src/styles/legacy/globals.legacy.css`

**Step 1: Copy globals.css to legacy folder**

```bash
cp src/app/globals.css src/styles/legacy/globals.legacy.css
```

**Step 2: Verify backup exists and matches**

```bash
diff src/app/globals.css src/styles/legacy/globals.legacy.css
```

Expected: No output (files identical)

**Step 3: Update progress.md**

Update Task 0.2 status to `✅ Done`

**Step 4: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-0-task-2-backup-globals.md`:

```markdown
# Task Report: 0.2 - Backup globals.css

> **Fase**: FASE 0 - Foundation
> **Task**: 0.2 - Backup globals.css
> **Status**: ✅ Completed
> **Date**: [TIMESTAMP]

## Summary

Backed up existing globals.css for rollback safety.

## Changes Made

| File | Action | Description |
|------|--------|-------------|
| `src/styles/legacy/globals.legacy.css` | Created | Backup of original globals.css |

## Verification

- [x] Backup file exists at `src/styles/legacy/globals.legacy.css`
- [x] Backup matches original (diff shows no differences)

## Notes

Original globals.css is [LINE_COUNT] lines. Contains:
- Tailwind imports
- shadcn/ui token mappings
- Custom component styles
- Animation keyframes

## Next Task

Lanjut ke: **Task 0.3 - Backup tailwind.config.ts**
```

**Step 5: Commit**

```bash
git add src/styles/legacy/globals.legacy.css docs/makalah-design-system/implementation/
git commit -m "refactor(foundation): backup globals.css to legacy folder"
```

---

### Task 0.3: Backup tailwind.config.ts ⏭️ SKIPPED

**Files:**
- Copy: `tailwind.config.ts` → `src/styles/legacy/tailwind.config.legacy.ts`

**Step 1: Copy tailwind.config.ts to legacy folder**

```bash
cp tailwind.config.ts src/styles/legacy/tailwind.config.legacy.ts
```

**Step 2: Verify backup exists and matches**

```bash
diff tailwind.config.ts src/styles/legacy/tailwind.config.legacy.ts
```

Expected: No output (files identical)

**Step 3: Update progress.md**

Update Task 0.3 status to `✅ Done`

**Step 4: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-0-task-3-backup-tailwind.md`:

```markdown
# Task Report: 0.3 - Backup tailwind.config.ts

> **Fase**: FASE 0 - Foundation
> **Task**: 0.3 - Backup tailwind.config.ts
> **Status**: ✅ Completed
> **Date**: [TIMESTAMP]

## Summary

Backed up existing tailwind.config.ts for rollback safety.

## Changes Made

| File | Action | Description |
|------|--------|-------------|
| `src/styles/legacy/tailwind.config.legacy.ts` | Created | Backup of original tailwind config |

## Verification

- [x] Backup file exists at `src/styles/legacy/tailwind.config.legacy.ts`
- [x] Backup matches original (diff shows no differences)

## Next Task

Lanjut ke: **Task 0.4 - Create New globals.css**
```

**Step 5: Commit**

```bash
git add src/styles/legacy/tailwind.config.legacy.ts docs/makalah-design-system/implementation/
git commit -m "refactor(foundation): backup tailwind.config.ts to legacy folder"
```

---

### Task 0.4: Create New globals.css ✅ DONE

**Files:**
- Overwrite: `src/app/globals.css`

**Reference:**
- [global-css.md](../docs/global-css.md)
- [justifikasi-warna.md](../docs/justifikasi-warna.md)
- [shape-layout.md](../docs/shape-layout.md)

**Step 1: Create new globals.css with Makalah-Carbon tokens**

Overwrite `src/app/globals.css` dengan content berikut:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* ==========================================================================
 * MAKALAH-CARBON DESIGN SYSTEM
 * Mechanical Grace - Technical Industrialism
 *
 * Trinity Approach:
 * - Identity: Makalah-Carbon tokens (this file)
 * - Structure: shadcn/ui components
 * - Delivery: Tailwind CSS v4
 * ========================================================================== */

/* ==========================================================================
 * SECTION 1: MASTER COLOR PALETTE (OKLCH)
 * Raw color values from justifikasi-warna.md
 * ========================================================================== */

/* --- Slate (Neutrals) --- */
:root {
  --slate-50:  oklch(.984 .003 247.858);
  --slate-100: oklch(.968 .007 247.896);
  --slate-200: oklch(.929 .013 255.508);
  --slate-300: oklch(.869 .022 252.894);
  --slate-400: oklch(.704 .04 256.788);
  --slate-500: oklch(.554 .046 257.417);
  --slate-600: oklch(.446 .043 257.281);
  --slate-700: oklch(.372 .044 257.287);
  --slate-800: oklch(.279 .041 260.031);
  --slate-900: oklch(.208 .042 265.755);
  --slate-950: oklch(.129 .042 264.695);

  /* --- Amber (Primary Brand) --- */
  --amber-50:  oklch(.987 .022 95.277);
  --amber-100: oklch(.962 .059 95.617);
  --amber-200: oklch(.924 .12 95.746);
  --amber-300: oklch(.879 .169 91.605);
  --amber-400: oklch(.828 .189 84.429);
  --amber-500: oklch(.769 .188 70.08);
  --amber-600: oklch(.666 .179 58.318);
  --amber-700: oklch(.555 .163 48.998);
  --amber-800: oklch(.473 .137 46.201);
  --amber-900: oklch(.414 .112 45.904);
  --amber-950: oklch(.279 .077 45.635);

  /* --- Emerald (Secondary Brand) --- */
  --emerald-50:  oklch(.979 .021 166.113);
  --emerald-100: oklch(.95 .052 163.051);
  --emerald-200: oklch(.905 .093 164.15);
  --emerald-300: oklch(.845 .143 164.978);
  --emerald-400: oklch(.765 .177 163.223);
  --emerald-500: oklch(.696 .17 162.48);
  --emerald-600: oklch(.596 .145 163.225);
  --emerald-700: oklch(.508 .118 165.612);
  --emerald-800: oklch(.432 .095 166.913);
  --emerald-900: oklch(.378 .077 168.94);
  --emerald-950: oklch(.262 .051 172.552);

  /* --- Teal (Success) --- */
  --teal-50:  oklch(.984 .014 180.72);
  --teal-100: oklch(.953 .051 180.801);
  --teal-200: oklch(.91 .096 180.426);
  --teal-300: oklch(.855 .138 181.071);
  --teal-400: oklch(.777 .152 181.912);
  --teal-500: oklch(.704 .14 182.503);
  --teal-600: oklch(.6 .118 184.704);
  --teal-700: oklch(.511 .096 186.391);
  --teal-800: oklch(.437 .078 188.216);
  --teal-900: oklch(.386 .063 188.416);
  --teal-950: oklch(.277 .046 192.524);

  /* --- Rose (Destructive) --- */
  --rose-50:  oklch(.969 .015 12.422);
  --rose-100: oklch(.941 .03 12.58);
  --rose-200: oklch(.892 .058 10.001);
  --rose-300: oklch(.81 .117 11.638);
  --rose-400: oklch(.712 .194 13.428);
  --rose-500: oklch(.645 .246 16.439);
  --rose-600: oklch(.586 .253 17.585);
  --rose-700: oklch(.514 .222 16.935);
  --rose-800: oklch(.455 .188 13.697);
  --rose-900: oklch(.41 .159 10.272);
  --rose-950: oklch(.271 .105 12.094);

  /* --- Sky (Info / AI) --- */
  --sky-50:  oklch(.977 .013 236.62);
  --sky-100: oklch(.951 .026 236.824);
  --sky-200: oklch(.882 .059 254.128);
  --sky-300: oklch(.828 .111 230.318);
  --sky-400: oklch(.746 .16 232.661);
  --sky-500: oklch(.685 .169 237.323);
  --sky-600: oklch(.588 .158 241.966);
  --sky-700: oklch(.5 .134 242.749);
  --sky-800: oklch(.443 .11 240.79);
  --sky-900: oklch(.391 .09 240.876);
  --sky-950: oklch(.293 .066 243.157);
}

/* ==========================================================================
 * SECTION 2: SHADCN/UI TOKEN MAPPING - LIGHT MODE
 * ========================================================================== */
:root {
  /* --- Core Semantic --- */
  --background: var(--slate-50);
  --foreground: oklch(0.15 0 0);
  --card: var(--slate-50);
  --card-foreground: oklch(0.15 0 0);
  --popover: var(--slate-50);
  --popover-foreground: oklch(0.15 0 0);

  /* --- Primary (Amber) --- */
  --primary: var(--amber-500);
  --primary-foreground: oklch(1 0 0);

  /* --- Secondary --- */
  --secondary: var(--slate-100);
  --secondary-foreground: oklch(0.15 0 0);

  /* --- Muted --- */
  --muted: var(--slate-200);
  --muted-foreground: var(--slate-500);

  /* --- Accent --- */
  --accent: var(--slate-100);
  --accent-foreground: oklch(0.15 0 0);

  /* --- Destructive --- */
  --destructive: var(--rose-500);
  --destructive-foreground: oklch(1 0 0);

  /* --- Border & Input --- */
  --border: var(--slate-200);
  --input: var(--slate-200);
  --ring: oklch(.685 .169 237.323 / 0.5); /* Sky 500 Alpha */

  /* --- Radius (Hybrid Scale) --- */
  --radius: 0.5rem; /* 8px base */
  --radius-none: 0px;
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-s-md: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-3xl: 32px;
  --radius-full: 9999px;

  /* --- Semantic Status --- */
  --success: var(--teal-500);
  --success-foreground: oklch(1 0 0);
  --warning: var(--amber-400);
  --warning-foreground: oklch(0.15 0 0);
  --info: var(--sky-500);
  --info-foreground: oklch(1 0 0);

  /* --- AI Identity (Terminal Style) --- */
  --ai-border: var(--sky-500);
  --ai-bg-subtle: var(--slate-950);

  /* --- Business Tier --- */
  --segment-gratis: var(--emerald-600);
  --segment-bpp: var(--sky-600);
  --segment-pro: var(--amber-500);

  /* --- Interaction States --- */
  --list-hover-bg: oklch(.968 .007 247.896 / 0.8); /* Slate 100 Alpha */
  --list-selected-bg: var(--slate-200);

  /* --- Chart Colors --- */
  --chart-1: var(--sky-500);
  --chart-2: var(--emerald-500);
  --chart-3: var(--amber-500);
  --chart-4: var(--rose-500);
  --chart-5: var(--teal-500);

  /* --- Border Thickness --- */
  --border-hairline: 0.5px;
  --border-standard: 1px;
  --border-emphasis: 2px;
  --border-frame: 4px;

  /* --- IDE Hairlines --- */
  --border-hairline-color: rgba(0, 0, 0, 0.15);
  --border-hairline-soft: rgba(0, 0, 0, 0.08);

  /* --- Sidebar --- */
  --sidebar: var(--slate-50);
  --sidebar-foreground: oklch(0.15 0 0);
  --sidebar-primary: var(--amber-500);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: var(--slate-100);
  --sidebar-accent-foreground: oklch(0.15 0 0);
  --sidebar-border: var(--slate-200);
  --sidebar-ring: var(--ring);

  /* --- Chat Specific --- */
  --chat-background: var(--background);
  --chat-input: var(--slate-100);
  --user-message-bg: var(--slate-100);

  /* --- Layout Dimensions --- */
  --header-h: 54px;
  --footer-h: 32px;
  --sidebar-w: 220px;
  --section-padding-x: 1.5rem;
  --section-padding-y: 4rem;
  --container-max-width: 1200px;

  /* --- Chat Layout Dimensions --- */
  --shell-header-h: 72px;
  --shell-footer-h: 0px;
  --shell-activity-bar-w: 48px;
  --shell-sidebar-w: 280px;
  --shell-panel-w: 360px;
  --shell-tab-bar-h: 36px;
  --shell-input-bar-h: 112px;

  /* --- Scrollbar --- */
  --scrollbar-width: 6px;
  --scrollbar-thumb: oklch(0.5 0 0 / 0.3);
  --scrollbar-thumb-hover: oklch(0.5 0 0 / 0.5);
  --scrollbar-track: transparent;
}

/* ==========================================================================
 * SECTION 3: SHADCN/UI TOKEN MAPPING - DARK MODE
 * ========================================================================== */
.dark {
  /* --- Core Semantic --- */
  --background: var(--slate-900);
  --foreground: oklch(0.95 0 0);
  --card: var(--slate-950);
  --card-foreground: oklch(0.95 0 0);
  --popover: var(--slate-950);
  --popover-foreground: oklch(0.95 0 0);

  /* --- Primary (Amber - same) --- */
  --primary: var(--amber-500);
  --primary-foreground: oklch(1 0 0);

  /* --- Secondary --- */
  --secondary: var(--slate-800);
  --secondary-foreground: oklch(0.95 0 0);

  /* --- Muted --- */
  --muted: var(--slate-800);
  --muted-foreground: var(--slate-400);

  /* --- Accent --- */
  --accent: var(--slate-800);
  --accent-foreground: oklch(0.95 0 0);

  /* --- Destructive --- */
  --destructive: var(--rose-600);
  --destructive-foreground: oklch(1 0 0);

  /* --- Border & Input --- */
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);

  /* --- IDE Hairlines (Dark) --- */
  --border-hairline-color: rgba(255, 255, 255, 0.2);
  --border-hairline-soft: rgba(255, 255, 255, 0.08);

  /* --- Sidebar (Dark) --- */
  --sidebar: var(--slate-950);
  --sidebar-foreground: oklch(0.95 0 0);
  --sidebar-accent: var(--slate-800);
  --sidebar-accent-foreground: oklch(0.95 0 0);
  --sidebar-border: var(--slate-800);

  /* --- Chat (Dark) --- */
  --chat-background: var(--slate-900);
  --chat-input: var(--slate-800);
  --user-message-bg: var(--slate-800);
  --list-hover-bg: oklch(0.62 0 0 / 0.15);
  --list-selected-bg: oklch(0.62 0 0 / 0.25);

  /* --- Scrollbar (Dark) --- */
  --scrollbar-thumb: oklch(0.6 0 0 / 0.3);
  --scrollbar-thumb-hover: oklch(0.6 0 0 / 0.5);
}

/* ==========================================================================
 * SECTION 4: TAILWIND THEME EXTENSION
 * Maps CSS variables to Tailwind utility classes
 * ========================================================================== */
@theme inline {
  /* --- Font Families --- */
  --font-family-sans: var(--font-sans);
  --font-family-mono: var(--font-mono);

  /* --- Colors (Auto-mapped from CSS vars) --- */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* --- Semantic Colors --- */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);

  /* --- AI Colors --- */
  --color-ai-border: var(--ai-border);
  --color-ai-bg-subtle: var(--ai-bg-subtle);

  /* --- Segment Colors --- */
  --color-segment-gratis: var(--segment-gratis);
  --color-segment-bpp: var(--segment-bpp);
  --color-segment-pro: var(--segment-pro);

  /* --- Chart Colors --- */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  /* --- Sidebar Colors --- */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* --- Chat Colors --- */
  --color-chat-background: var(--chat-background);
  --color-chat-input: var(--chat-input);
  --color-user-message-bg: var(--user-message-bg);
  --color-list-hover-bg: var(--list-hover-bg);
  --color-list-selected-bg: var(--list-selected-bg);

  /* --- Radius Scale --- */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);

  /* --- Spacing --- */
  --spacing: 0.25rem;

  /* --- Animations --- */
  --animate-accordion-down: accordion-down 200ms ease-out;
  --animate-accordion-up: accordion-up 200ms ease-out;
}

/* ==========================================================================
 * SECTION 5: BASE STYLES
 * ========================================================================== */
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground font-sans;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.2;
  }
}

/* ==========================================================================
 * SECTION 6: MECHANICAL GRACE UTILITY CLASSES
 * From class-naming-convention.md
 * ========================================================================== */
@layer utilities {
  /* --- Typography Hierarchy --- */
  .text-narrative {
    font-family: var(--font-sans);
  }

  .text-interface {
    font-family: var(--font-mono);
  }

  .text-signal {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* --- Hybrid Radius Scale --- */
  .rounded-shell {
    border-radius: var(--radius-xl); /* 16px */
  }

  .rounded-action {
    border-radius: var(--radius-md); /* 8px */
  }

  .rounded-badge {
    border-radius: var(--radius-s-md); /* 6px */
  }

  /* --- Border Utilities --- */
  .border-hairline {
    border-width: var(--border-hairline);
    border-color: var(--border-hairline-color);
  }

  .border-main {
    border-width: var(--border-standard);
  }

  .border-ai {
    border-width: var(--border-standard);
    border-style: dashed;
    border-color: var(--ai-border);
  }

  /* --- Spacing Utilities --- */
  .p-comfort {
    padding: 1rem; /* 16px */
  }

  .p-dense {
    padding: 0.5rem; /* 8px */
  }

  .p-airy {
    padding: 1.5rem; /* 24px */
  }

  .gap-comfort {
    gap: 1rem; /* 16px */
  }

  .gap-dense {
    gap: 0.5rem; /* 8px */
  }

  /* --- Icon Scale --- */
  .icon-micro {
    width: 12px;
    height: 12px;
  }

  .icon-interface {
    width: 16px;
    height: 16px;
  }

  .icon-display {
    width: 24px;
    height: 24px;
  }

  /* --- Z-Index Scale --- */
  .z-base {
    z-index: 0;
  }

  .z-overlay {
    z-index: 10;
  }

  .z-popover {
    z-index: 20;
  }

  .z-drawer {
    z-index: 50;
  }

  .z-command {
    z-index: 100;
  }

  /* --- Interaction States --- */
  .hover-slash {
    position: relative;
  }

  .hover-slash::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4px,
      currentColor 4px,
      currentColor 5px
    );
    opacity: 0;
    transition: opacity 150ms ease;
    pointer-events: none;
  }

  .hover-slash:hover::before {
    opacity: 0.1;
  }

  .active-nav {
    border-left: 2px solid var(--amber-500);
  }

  .focus-ring:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  /* --- Scrollbar --- */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: var(--scrollbar-width);
    height: var(--scrollbar-width);
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: var(--radius);
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
  }
}

/* ==========================================================================
 * SECTION 7: ANIMATION KEYFRAMES
 * ========================================================================== */
@layer utilities {
  @keyframes accordion-down {
    from {
      height: 0;
      opacity: 0;
    }
    to {
      height: var(--radix-collapsible-content-height);
      opacity: 1;
    }
  }

  @keyframes accordion-up {
    from {
      height: var(--radix-collapsible-content-height);
      opacity: 1;
    }
    to {
      height: 0;
      opacity: 0;
    }
  }

  @keyframes thinking-dot {
    0%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-thinking-dot {
    animation: thinking-dot 1.4s ease-in-out infinite both;
  }
}

/* ==========================================================================
 * SECTION 8: REDUCED MOTION SUPPORT
 * ========================================================================== */
@media (prefers-reduced-motion: reduce) {
  .animate-thinking-dot,
  .animate-accordion-down,
  .animate-accordion-up {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

**Step 2: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes without errors

**Step 3: Verify dev server runs**

```bash
npm run dev
```

Expected: Server starts, app loads in browser

**Step 4: Verify tokens in browser devtools**

Open browser devtools → Elements → Computed:
- Check `--background` uses Slate value
- Check `--primary` uses Amber value
- Check `--ai-border` exists

**Step 5: Update progress.md**

Update Task 0.4 status to `✅ Done`

**Step 6: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-0-task-4-new-globals.md` with:
- Summary of changes
- List of token categories added
- Verification results

**Step 7: Commit**

```bash
git add src/app/globals.css docs/makalah-design-system/implementation/
git commit -m "refactor(foundation): create new globals.css with Makalah-Carbon tokens"
```

---

### Task 0.5: Create New tailwind.config.ts ⏭️ SKIPPED

**Files:**
- Overwrite: `tailwind.config.ts`

**Reference:**
- [class-naming-convention.md](../docs/class-naming-convention.md)

**Step 1: Read current tailwind.config.ts structure**

Check existing config to understand what needs to be preserved (content paths, plugins, etc.)

**Step 2: Create new tailwind.config.ts**

Overwrite `tailwind.config.ts` dengan content yang:
- Preserves content paths dari legacy config
- Preserves necessary plugins
- Adds theme extension for Makalah-Carbon
- Ensures compatibility with new globals.css

**Note**: Karena Tailwind v4 menggunakan `@theme inline` di CSS, config file mungkin minimal. Yang penting adalah memastikan content paths dan plugins tetap ada.

**Step 3: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes without errors

**Step 4: Test utility classes**

Create temporary test in any component:
```tsx
<div className="rounded-shell text-interface border-hairline p-comfort">
  Test utilities
</div>
```

Verify in browser that styles apply correctly.

**Step 5: Update progress.md**

Update Task 0.5 status to `✅ Done`

**Step 6: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-0-task-5-new-tailwind.md`

**Step 7: Commit**

```bash
git add tailwind.config.ts docs/makalah-design-system/implementation/
git commit -m "refactor(foundation): create new tailwind.config.ts with theme extension"
```

---

### Task 0.6: Install iconoir-react ✅ DONE

**Files:**
- Modify: `package.json`

**Reference:**
- [bahasa-visual.md](../docs/bahasa-visual.md)

**Step 1: Install iconoir-react**

```bash
npm install iconoir-react
```

**Step 2: Verify installation**

```bash
npm list iconoir-react
```

Expected: Shows iconoir-react version

**Step 3: Verify lucide-react still exists**

```bash
npm list lucide-react
```

Expected: Shows lucide-react version (keep until FASE 10)

**Step 4: Test import works**

Create temporary test:
```tsx
import { Home, Settings, User } from 'iconoir-react';

// Verify no import errors
```

**Step 5: Update progress.md**

Update Task 0.6 status to `✅ Done`
Update "Current Phase" to show FASE 0 complete

**Step 6: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-0-task-6-install-iconoir.md`

**Step 7: Commit**

```bash
git add package.json package-lock.json docs/makalah-design-system/implementation/
git commit -m "refactor(foundation): install iconoir-react package"
```

---

## Final Verification Checklist

Setelah semua tasks selesai:

### Build & Runtime
- [ ] `npm run build` sukses tanpa error
- [ ] `npm run dev` berjalan normal
- [ ] Tidak ada visual regression (app looks the same)

### Files Exist
- [ ] `src/styles/legacy/globals.legacy.css` exists
- [ ] `src/styles/legacy/tailwind.config.legacy.ts` exists
- [ ] `iconoir-react` listed in package.json
- [ ] `docs/makalah-design-system/implementation/progress.md` updated

### Token Availability
- [ ] `--background` uses Slate value
- [ ] `--primary` uses Amber value
- [ ] `--ai-border` available
- [ ] Dark mode toggle works

### Utility Classes Work
- [ ] `.rounded-shell` = 16px radius
- [ ] `.text-interface` = Geist Mono
- [ ] `.border-hairline` = 0.5px border
- [ ] `.p-comfort` = 16px padding

---

## Update MASTER-PLAN.md

Setelah FASE 0 selesai, update Progress Tracker di MASTER-PLAN.md:

```markdown
| 0 - Foundation | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 1: Global Shell** → `plan/fase-1-global-shell.md`
