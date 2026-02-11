# Context Document: Chat Page Redesign - Mechanical Grace

> **Tujuan dokumen ini:** Context refresher untuk Claude. Baca ini saat memulai sesi baru atau setelah context window penuh. Dokumen ini berisi SEMUA konteks yang diperlukan untuk melanjutkan pekerjaan styling chat page.

---

## 1. Overview Proyek

### Apa yang sedang dikerjakan

Styling halaman chat (`/chat/*`) di Makalah App agar fully compliant dengan **Mechanical Grace Design System**. Halaman lain (home, docs, blog, admin, auth) sudah compliant — chat page adalah yang terakhir.

Layout structure sudah final (6-column CSS Grid). Pekerjaan selanjutnya fokus pada **styling compliance**: warna, tipografi, radius, border, dark mode.

### Scope pekerjaan styling

- Mengganti hardcoded color values ke semantic tokens
- Memperbaiki dark mode yang broken/low-contrast
- Menstandarkan radius, border, dan typography classes
- **Tidak mengubah** layout structure, behavior, state management, API calls, atau data flow
- **globals.css tidak diubah** — semua CSS variables/tokens sudah correctly defined

### Branch

```
feat/chatpage-redesign-mechanical-grace
```

### Dokumen Pendukung

| Dokumen | Isi |
|---------|-----|
| `existing-state.md` | Audit styling per komponen, compliance score, pattern masalah |
| `chat-page-layout-structure-shell/README.md` | Arsitektur layout (grid, dimensi, state management) |

---

## 2. Makalah App - Tech Stack Ringkas

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, CSS Custom Properties (OKLCH) |
| UI Library | shadcn/ui (Radix primitives) |
| Backend | Convex (real-time DB + serverless) |
| Auth | Clerk |
| AI | Vercel AI SDK v5, Gemini 2.5 Flash / GPT-5.1 |
| Icons | Iconoir (`iconoir-react`) - BUKAN Lucide |
| Fonts | Geist Sans + Geist Mono |

---

## 3. Mechanical Grace Design System - Aturan Kunci

### 3.1 Color Signal Theory

Warna = status signal, bukan dekorasi. Semua dalam OKLCH.

| Signal | Color | CSS Variable | Usage |
|--------|-------|-------------|-------|
| **Primary/Brand** | Amber-500 | `--primary` | CTA, PRO tier, active states |
| **Secondary/Trust** | Emerald-600 | `--success` variant | GRATIS tier, validation |
| **AI Identity** | Sky-500 | `--info`, `--ai-border` | Machine content, BPP tier |
| **Neutrals** | Slate 50-950 | `--background`, `--foreground`, etc. | Surfaces, text |
| **Success** | Teal-500 | `--success` | Completion states |
| **Destructive** | Rose-500/600 | `--destructive` | Errors, delete actions |

**Aturan ketat:**
- AI content = Sky + dashed/dotted border. BUKAN ungu.
- Business tiers: GRATIS=Emerald, BPP=Sky, PRO=Amber.

### 3.2 Typography - Dual Pillar

| Class | Font | Gunakan untuk |
|-------|------|--------------|
| `.text-narrative` | Geist Sans | Headings, hero titles, page headlines, p, h1, h2, body |
| `.text-interface` | Geist Mono | nav, labels, data, descriptions |
| `.text-signal` | Geist Mono + UPPERCASE + wide tracking | Badges, status, CTA labels |

**WAJIB:** Semua angka (harga, stats, timestamps) harus Geist Mono.

### 3.3 Border Radius - Hybrid Scale

| Class | Value | Gunakan untuk |
|-------|-------|--------------|
| `.rounded-shell` | 16px | Outer cards, main containers, panels |
| `.rounded-action` | 4-8px | Buttons, inputs, form controls |
| `.rounded-badge` | 6px | Status badges, tags, pills |
| `.rounded-none` | 0px | Data grids, terminal elements |

**DILARANG:** `rounded-xl`, `rounded-lg`, `rounded-md` generik.

### 3.4 Border Width

| Class | Value | Gunakan untuk |
|-------|-------|--------------|
| `.border-hairline` | 0.5px + `--border-hairline` | Internal dividers, list separators |
| `.border-main` | 1px solid | Component borders |
| `.border-ai` | 1px dashed + `--ai-border` (Sky) | AI-generated content ONLY |

### 3.5 Spacing

| Class | Value |
|-------|-------|
| `.p-comfort` / `.gap-comfort` | 16px |
| `.p-dense` / `.gap-dense` | 8px |
| `.p-airy` | 24px |

Base unit: 4px grid.

### 3.6 Chat-Specific Layout Rules

- **Zero Chrome:** No Global Header/Footer di `/chat/*`
- Navigation back via brand logo di Activity Bar
- Mini-footer: single line, Mono 10px, copyright only
- 6-column CSS Grid workbench, maximized vertical real-estate

### 3.7 Background Patterns (Industrial Textures)

| Pattern | Usage | Opacity |
|---------|-------|---------|
| `GridPattern` | 48px squares, empty backgrounds | 80-100% |
| `DiagonalStripes` | Hover, warning, premium areas | 40-80% |
| `DottedPattern` | AI panels, diagnostic areas | 40-100% |

Opacity 10-15% sebagai texture. Pakai radial mask fade-out saat di `--section-bg-alt`.

### 3.8 Animation & Transition

| Speed | Duration | Usage |
|-------|----------|-------|
| Instant | 50ms | Hover color |
| Fast | 150ms | Toggles, small state changes |
| Standard | 250ms | Modals, major transitions |

Easing: `cubic-bezier(0.4, 0, 0.2, 1)`. No bounce.

### 3.9 Z-Index Layering

```
z-base(0) -> z-overlay(10) -> z-popover(20) -> z-drawer(50) -> z-command(100)
```

---

## 4. CSS Token Mapping (globals.css - Lines 467-670)

### Light Mode (`:root`)

```css
--background:       var(--slate-50)           /* Page background */
--foreground:       var(--neutral-950)        /* Primary text */
--card:             var(--slate-50)           /* Card/panel bg */
--muted:            var(--slate-200)          /* Muted background */
--muted-foreground: var(--slate-500)          /* Secondary text */
--border:           var(--slate-200)          /* Component borders */
--border-hairline:  rgba(0, 0, 0, 0.15)      /* Thin dividers */
--primary:          var(--amber-500)          /* Brand CTA */
--primary-foreground: var(--neutral-0)        /* Text on primary */
--destructive:      var(--rose-500)           /* Error states */
--info:             var(--sky-500)            /* AI identity */
--ai-border:        var(--sky-500)            /* AI dashed border */
--success:          var(--teal-500)           /* Success state */
--accent:           var(--slate-100)          /* Hover/accent bg */
--sidebar:          var(--slate-100)          /* Sidebar bg */
--chat-background:  var(--background)         /* Chat area bg */
--chat-input:       var(--slate-100)          /* Input bg */
--user-message-bg:  var(--slate-100)          /* User bubble bg */
--list-hover-bg:    var(--slate-200)          /* List hover */
--list-selected-bg: var(--slate-300)          /* List selected */
```

### Dark Mode (`.dark`)

```css
--background:       var(--slate-900)
--foreground:       var(--neutral-50)
--card:             var(--slate-950)
--muted:            var(--slate-800)
--muted-foreground: var(--slate-400)
--border:           var(--neutral-0-a10)      /* rgba(1,0,0,0.1) */
--border-hairline:  rgba(255, 255, 255, 0.2)
--primary:          var(--amber-500)          /* Same as light */
--destructive:      var(--rose-600)           /* Slightly different */
--accent:           var(--slate-700)
--sidebar:          var(--slate-950)
--chat-background:  var(--slate-900)
--chat-input:       var(--slate-800)
--user-message-bg:  var(--slate-800)
--list-hover-bg:    var(--neutral-400-a15)
--list-selected-bg: var(--neutral-400-a25)
```

### Chat Layout Dimensions (CSS Variables)

```css
--activity-bar-width:   48px
--sidebar-width:        280px       /* default, resizable 180px–50% */
--sidebar-min-width:    180px
--sidebar-max-width:    50%
--panel-width:          360px       /* default, resizable 280px–50% */
--panel-min-width:      280px
--panel-max-width:      50%
--shell-footer-h:       32px
```

---

## 5. File Map - Per User Journey Phase

### Urutan berdasarkan User Journey Flow

```
PHASE 1: Shell + Empty State     → Hal PERTAMA yang user lihat saat masuk /chat
PHASE 2: Sidebar Opens           → User expand sidebar, lihat history
PHASE 3: Conversation Active     → User mulai chat, layout utama + messages
PHASE 4: Chat Features Appear    → Citations, search, tools muncul dalam percakapan
PHASE 5: Paper Workflow Starts   → User mulai paper, sidebar berubah, tabs muncul
PHASE 6: Artifacts Muncul        → Panel kanan terbuka, viewer aktif
PHASE 7: Advanced Features       → Edit artifact, fullscreen, refrasa, notifikasi
```

### 5A. Files yang TIDAK perlu diubah (styling)

| File | Alasan |
|------|--------|
| `src/app/chat/[conversationId]/page.tsx` | Server component, no styling |
| `src/app/chat/layout.tsx` | Minimal wrapper |
| `src/app/chat/page.tsx` | Minimal wrapper |
| `src/components/chat/ChatContainer.tsx` | Pure logic orchestrator, no UI |
| `src/lib/hooks/useArtifactTabs.ts` | Hook, no UI |
| `src/components/chat/layout/ChatLayout.tsx` | Fully compliant |
| `src/components/chat/ArtifactTabs.tsx` | Fully compliant |
| `src/components/chat/ArtifactPanel.tsx` | Fully compliant |
| `src/components/chat/ArtifactList.tsx` | Fully compliant |
| `src/components/chat/FileUploadButton.tsx` | Fully compliant |

### 5B. Files yang PERLU styling — Per Phase (User Journey Order)

**PHASE 1 — Shell + Empty State (5 files)**

| File | Issue |
|------|-------|
| `src/components/chat/shell/TopBar.tsx` | Minor: badge `rounded-full` → `rounded-badge` |
| `src/components/chat/shell/ActivityBar.tsx` | `border-amber-500` → `border-primary` |
| `src/components/chat/ChatWindow.tsx` | `bg-slate-200` empty state invisible di dark → `bg-muted` |
| `src/components/chat/messages/TemplateGrid.tsx` | `bg-slate-200` icon box no dark mode |
| `src/components/chat/ChatMiniFooter.tsx` | ~95% compliant — verify only |

**PHASE 2 — Sidebar Opens (2 files)**

| File | Issue |
|------|-------|
| `src/components/chat/ChatSidebar.tsx` | Upgrade button oklch hardcoded hover |
| `src/components/chat/sidebar/SidebarChatHistory.tsx` | Custom list tokens, opacity dark |

**PHASE 3 — Conversation Active (4 files)**

| File | Issue |
|------|-------|
| `src/components/chat/layout/PanelResizer.tsx` | `hover:bg-amber-500/40` → `hover:bg-primary/40` |
| `src/components/chat/ChatInput.tsx` | `focus-ring` verification |
| `src/components/chat/MessageBubble.tsx` | `bg-info/20` faint dark, hardcoded focus ring |
| `src/components/chat/MarkdownRenderer.tsx` | Missing `.text-narrative`, thick blockquote border |

**PHASE 4 — Chat Features (6 files)**

| File | Issue |
|------|-------|
| `src/components/chat/InlineCitationChip.tsx` | Chip radius, popover sub-components |
| `src/components/chat/SourcesIndicator.tsx` | `emerald-500` hardcoded, `text-sky-400` → semantic |
| `src/components/chat/SearchStatusIndicator.tsx` | `sky-500`/`emerald-500`/`rose-500` → semantic tokens |
| `src/components/chat/ThinkingIndicator.tsx` | `bg-slate-900/80` hardcoded dark → semantic |
| `src/components/chat/ToolStateIndicator.tsx` | `sky-500`/`rose-500` hardcoded → semantic |
| `src/components/chat/QuickActions.tsx` | `text-emerald-500` minor |

**PHASE 5 — Paper Workflow (4 files)**

| File | Issue |
|------|-------|
| `src/components/chat/sidebar/SidebarPaperSessions.tsx` | `amber-500`/`emerald-500`/`sky-500` hardcoded, generic `rounded` |
| `src/components/chat/sidebar/SidebarProgress.tsx` | `bg-slate-800` progress track invisible light, hardcoded colors |
| `src/components/chat/QuotaWarningBanner.tsx` | `bg-slate-900` hardcoded dark, warning color semantics |
| `src/components/chat/ArtifactToolbar.tsx` | Minor: `text-emerald-500` copy icon → `text-success` |

**PHASE 6 — Artifacts (2 files)**

| File | Issue |
|------|-------|
| `src/components/chat/ArtifactViewer.tsx` | Invalidation badge hardcoded amber, `borderRadius` inline |
| `src/components/chat/ArtifactIndicator.tsx` | `sky-500`/`sky-400` hardcoded → `--info`, low contrast light mode |

**PHASE 7 — Advanced Features (5 files)**

| File | Issue |
|------|-------|
| `src/components/chat/ArtifactEditor.tsx` | `focus:ring-amber-500`, `border-sky-500/50` dark variant |
| `src/components/chat/FullsizeArtifactModal.tsx` | CRITICAL: `bg-slate-950`/`bg-slate-900` hardcoded, `prose-invert` |
| `src/components/chat/VersionHistoryDialog.tsx` | `amber-500` hardcoded badges/dots/focus |
| `src/components/chat/shell/NotificationDropdown.tsx` | 4x `rounded-lg` generic → `rounded-action`/`rounded-shell` |
| `src/components/layout/header/UserDropdown.tsx` | Hardcoded slate/rose, manual `dark:`, `rounded-md` |

---

## 6. Compliance Score

| Metric | Saat Ini | Target |
|--------|----------|--------|
| Color Signal Theory | 65/100 | 95 |
| Typography System | 70/100 | 92 |
| Border System | 75/100 | 95 |
| Spacing/Layout | 85/100 | 92 |
| **Dark Mode** | **55/100** | **95** |
| Accessibility | 80/100 | 92 |
| **Overall** | **70/100** | **93** |

### Top Priority Issues

1. **Dark mode broken** (55/100) — `bg-slate-950/900` hardcoded di 3 komponen (FullsizeArtifactModal, ThinkingIndicator, QuotaWarningBanner)
2. **Hardcoded amber** — 6+ komponen pakai `amber-500` langsung, bukan `--primary`
3. **Hardcoded sky** — 5+ komponen pakai `sky-500/400`, bukan `--info`
4. **Missing dark mode opacity** — 6+ komponen punya `/10`–`/20` backgrounds tanpa `dark:` adjustment

---

## 7. Pola Perbaikan Umum

### Pattern A: Hardcoded color -> Semantic token

```diff
- bg-slate-200 text-slate-500
+ bg-muted text-muted-foreground
```

### Pattern B: Missing dark mode -> Add dark: variant

```diff
- bg-sky-500/10
+ bg-sky-500/10 dark:bg-sky-500/20
```

### Pattern C: Hardcoded amber -> Primary token

```diff
- bg-amber-500 text-white border-amber-500
+ bg-primary text-primary-foreground border-primary
```

### Pattern D: Generic radius -> Mechanical Grace radius

```diff
- rounded-lg
+ rounded-shell    (for containers)
+ rounded-action   (for buttons/inputs)
```

### Pattern E: Missing typography class

```diff
- <h1 className="text-2xl font-bold">
+ <h1 className="text-narrative text-2xl font-bold">
```

### Pattern F: Opacity too low in dark mode

```diff
- bg-info/20 border border-info/30
+ bg-info/20 dark:bg-info/30 border border-info/30 dark:border-info/40
```

---

## 8. Style Reference Documents

8 dokumen styling dari halaman compliant:

```
docs/tailwind-styling-consistency/about-page/about-page-style.md
docs/tailwind-styling-consistency/admin-panel-page/admin-panel-page-style.md
docs/tailwind-styling-consistency/auth-page/auth-page-style.md
docs/tailwind-styling-consistency/blog-page/blog-page-style.md
docs/tailwind-styling-consistency/documentation-page/documentation-page-style.md
docs/tailwind-styling-consistency/home-hero/home-hero-style.md
docs/tailwind-styling-consistency/home-pricing-teaser/home-pricing-teaser-style.md
docs/tailwind-styling-consistency/home-benefits/home-benefits-style.md
```

---

## 9. Cara Melanjutkan Pekerjaan

### Memulai sesi baru:

1. **Baca dokumen ini** (`chatpage-redesain-context.md`)
2. **Baca existing state** (`existing-state.md`) untuk audit styling per komponen
3. **Baca task document** (jika sudah ada) untuk detail perubahan
4. **Cek CLAUDE.md** di root untuk project rules
5. **Cek git status:**
   ```bash
   git log --oneline -10
   git status
   git diff --stat
   ```
6. Lanjutkan dari phase/task yang belum complete

### Melanjutkan sesi yang sama:

1. Cek phase mana yang sedang dikerjakan
2. Baca task berikutnya di task document
3. **Baca file SEBELUM edit** — pahami existing code dulu
4. **Test visual di light + dark** setelah setiap perubahan
5. Commit per task

### Commands:

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Verify no TS errors
npm run lint         # Verify no lint errors
```

---

## 10. Aturan Komunikasi & Kerja

Dari `CLAUDE.md`:
- Komunikasi: **Jakarta-style Indonesian (gue-lo)**
- **Jangan suggest tanpa diminta** - selalu tanya dulu
- **Jangan ambil keputusan sepihak**
- **Jangan klaim sukses tanpa bukti** - test, tunjukkan evidence
- **Jangan over-engineer** - minimal changes
- **Jangan skip proses** - lebih baik lambat tapi benar

Dari Mechanical Grace:
- **DILARANG** `rounded-xl/lg/md` generik
- **DILARANG** Lucide icons (harus Iconoir)
- **DILARANG** font Sans untuk angka
- **DILARANG** `border-ai` pada konten non-AI
- **DILARANG** Global Header/Footer di `/chat/*`
- **DILARANG** warna ungu untuk AI
