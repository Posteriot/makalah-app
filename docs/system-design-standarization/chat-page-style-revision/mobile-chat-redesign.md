# Mobile Chat Redesign — iOS-Native Composer-First

> Design document for radical mobile chat page redesign.
> Target: native mobile app feel, bukan web-di-mobile.
> Date: 2026-02-24

## Design Decisions

| Aspek | Keputusan | Alasan |
|-------|-----------|--------|
| Paradigma | Composer-first (clean landing) | "Sekali buka, langsung kerja" — zero tap to start |
| Platform | iOS-first (HIG-compliant) | Target user utama iOS; Android tetap bisa pakai |
| Navigation | Stack navigation (push/pop) | Single-purpose app, bukan multi-tab. Maximize vertical space |
| Artifacts | Full-screen push viewer | Konten paper panjang, butuh 100% layar |
| Paper Progress | Collapsible mini-bar di atas input | Selalu visible sebagai context, tidak makan ruang |
| History Access | Sidebar drawer (swipe right / hamburger) | Tidak menghalangi primary flow |

## Navigation Architecture

```
                    ┌─────────────┐
                    │Clean Landing│  ← Root screen (always)
                    └──────┬──────┘
                           │ send message / tap chip
                           ▼
                    ┌─────────────┐
                    │Conversation │  ← Push screen
                    └──┬───────┬──┘
                       │       │
          tap artifact │       │ ··· → Lihat Artifacts
                       ▼       ▼
               ┌────────────┐ ┌─────────────┐
               │  Artifact  │ │ Artifact    │
               │  Viewer    │ │ List        │
               └──────┬─────┘ └─────────────┘
                      │
           tap Refrasa│
                      ▼
               ┌────────────┐
               │  Refrasa   │
               │  Viewer    │
               └────────────┘

  Sidebar Drawer: accessible via ☰ from ANY screen
  Contains: History | Paper Sessions | Progress | Settings
```

## Desktop → Mobile Mapping

| Desktop Element | Mobile Treatment |
|----------------|-----------------|
| ActivityBar (48px, 3 panel nav) | Dihilangkan. Panel nav → drawer tabs |
| Sidebar (280px resizable) | Drawer overlay (☰) |
| TopBar (sidebar toggle, theme, artifact badge, user dropdown) | Compact header per screen |
| Artifact Panel (360px resizable) | Full-screen push |
| ArtifactTabs (multi-tab) | Single artifact view; list via ··· menu |
| PanelResizer (2x) | Dihilangkan |
| PaperStageProgress (horizontal bar atas messages) | Collapsible mini-bar atas input |
| FullsizeArtifactModal | Tidak perlu — artifact sudah full-screen |
| CreditMeter (sidebar footer) | Drawer footer |
| UserDropdown (TopBar) | Drawer footer → ⚙ Pengaturan |
| Theme toggle (TopBar) | Landing header; conversation → settings |

## Screen Specifications

### Screen 1: Clean Landing

```
┌─────────────────────────────────┐
│ safe-area-top                   │
├─────────────────────────────────┤
│ ☰                         ☀/☽  │  ☰ = drawer
│                                 │  ☀/☽ = theme toggle
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│         M A K A L A H           │  Geist Mono, tracking-wide
│                                 │
│    Asisten penulisan ilmiah     │  --chat-muted-foreground
│                                 │  Geist Mono, 12px
│                                 │
│                                 │
│  ┌─────────┐ ┌───────┐ ┌─────┐ │
│  │Diskusi  │ │Paper  │ │Refra│ │  Quick action chips
│  │riset    │ │akadem.│ │sa   │ │  --chat-secondary bg
│  └─────────┘ └───────┘ └─────┘ │  Tap = prefill + auto-submit
│                                 │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Mulai menulis...         📎│ │  ChatInput (rows=3 default)
│ │                             │ │  📎 = FileUploadButton
│ │                          ▶ │ │  ▶ = send (disabled if empty)
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ safe-area-bottom                │
└─────────────────────────────────┘
```

**Behavior:**
- Ketik + ▶ = `createNewConversation()` → `router.push(/chat/[newId])` → push transition
- Tap chip = prefill + auto-submit (same logic as `TemplateGrid.onClick`)
- ☰ = buka sidebar drawer
- Input focus → brand naik ke atas (shrink, bukan hilang), chips muncul

**Design tokens:**
- Background: `--chat-background`
- Brand text: `--chat-foreground`, Geist Mono, tracking-widest
- Tagline: `--chat-muted-foreground`, Geist Mono, 12px
- Chips: `--chat-secondary` bg, `--chat-secondary-foreground` text, rounded-action

### Screen 1a: Input Focused (Keyboard Up)

```
┌─────────────────────────────────┐
│  ☰                              │
├─────────────────────────────────┤
│         M A K A L A H           │  Brand shrinks, stays visible
│                                 │
│  ┌─────────┐ ┌───────┐ ┌─────┐ │
│  │Diskusi  │ │Paper  │ │Refra│ │  Chips visible above input
│  │riset    │ │akadem.│ │sa   │ │
│  └─────────┘ └───────┘ └─────┘ │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Mulai menulis...         📎│ │  Input expanded
│ │                          ▶ │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│           KEYBOARD              │
└─────────────────────────────────┘
```

### Screen 2: Conversation (Normal Chat)

```
┌─────────────────────────────────┐
│ safe-area-top                   │
├─────────────────────────────────┤
│ ☰  Riset metodologi kual.. ··· │  Compact header
├─────────────────────────────────┤  ☰ = drawer, ··· = action sheet
│                                 │
│  ┌─ QuotaWarningBanner ──────┐  │  Conditional: quota ≥70%
│  │ ⚠ Kredit tersisa 28%  ✕  │  │  or BPP <100 credits
│  │   Beli Kredit →           │  │
│  └───────────────────────────┘  │
│                                 │
│        ┌───────────────────┐    │  USER BUBBLE (right-aligned)
│        │ Tolong bantu cari │    │  bg: --chat-muted
│        │ referensi metode  │    │  rounded-shell, max-w-[85%]
│        │ kualitatif        │    │
│        │    📄 proposal.pdf│    │  File attachment badge
│        └───────────────────┘    │
│                    ✏ 14:32      │  ✏ = edit (tap, not hover)
│                                 │
│  ╌ Pencarian web...  ●●●       │  SearchStatusIndicator
│  ╌ 🔧 updateStageData          │  ToolStateIndicator
│                                 │
│  Berikut beberapa referensi     │  AI RESPONSE (left, no bubble)
│  yang relevan untuk metode      │  Full width via MarkdownRenderer
│  kualitatif:                    │
│                                 │
│  1. Creswell (2018) [1]        │  [1] = InlineCitationChip
│     menyatakan bahwa...         │  Tap → bottom Sheet (existing)
│                                 │
│  2. Sugiyono (2020) [2]        │
│     mendefinisikan...           │
│                                 │
│  ┌───────────────────────────┐  │  ArtifactIndicator card
│  │ HASIL ARTIFAK  Baru  v1  │  │  Tap → push ArtifactViewer
│  │ Bab 2: Tinjauan Literatur │  │
│  │ Klik untuk buka ▶        │  │
│  └───────────────────────────┘  │
│                                 │
│  ▾ Sumber · 3 referensi        │  SourcesIndicator (collapsed)
│                                 │
│  ☐ Salin                       │  QuickActions
│                                 │
├─────────────────────────────────┤
│ ▓▓▓▓▓░░░░░ Menulis...   67%   │  ChatProcessStatusBar
├─────────────────────────────────┤  (only during AI streaming)
│ ┌─────────────────────────────┐ │
│ │ Ketik pesan...           📎│ │  ChatInput
│ │                          ▶ │ │  ▶ → ◼ saat isGenerating
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ safe-area-bottom                │
└─────────────────────────────────┘
```

**Interactions:**
- ✏ edit → inline textarea replaces bubble (`isEditAllowed()` tetap berlaku)
- Long press user bubble → ✏ Edit (alternative trigger)
- Long press AI response → Copy
- Tap ArtifactIndicator → push to Artifact Viewer (Screen 3)
- Tap [1] citation → bottom Sheet (existing InlineCitationChip mobile)
- Tap ▾ Sumber → expand source list
- Pull down at top → load older messages
- ☰ = sidebar drawer
- ··· = action sheet (Screen 5)

**Design tokens:**
- Header bg: `--chat-background`, title: `--chat-foreground` Geist Mono
- User bubble: `--chat-muted` bg, `--chat-foreground` text, rounded-shell
- AI text: `--chat-foreground`, full width, no bubble
- Edit icon: `--chat-muted-foreground`
- Timestamp: `--chat-muted-foreground`, 11px
- Process indicator: `--chat-muted-foreground` text
- ArtifactIndicator: `--chat-muted` bg, `--chat-border` border, rounded-action

### Screen 2a: Paper Mode Active

```
┌─────────────────────────────────┐
│ safe-area-top                   │
├─────────────────────────────────┤
│ ☰  Draft skripsi           ··· │
├─────────────────────────────────┤
│                                 │
│  (messages area — same as       │
│   Screen 2, plus paper-specific │
│   elements below)               │
│                                 │
│  ┌───────────────────────────┐  │  PaperValidationPanel
│  │ VALIDASI TAHAP            │  │  (saat stageStatus ===
│  │ Topik                     │  │   "pending_validation")
│  │                           │  │
│  │ Periksa draft di artifact │  │
│  │                           │  │
│  │ [Revisi]  [Setujui ▶]   │  │  Revisi → textarea mode
│  └───────────────────────────┘  │  Setujui → advance stage
│                                 │
├─────────────────────────────────┤
│ Topik · 3/13                 ▾  │  Paper mini-bar (collapsed)
├─────────────────────────────────┤  Tap ▾ = expand
│ ┌─────────────────────────────┐ │
│ │ Ketik pesan...           📎│ │
│ │                          ▶ │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ safe-area-bottom                │
└─────────────────────────────────┘
```

**Mini-bar design tokens:**
- Bar bg: `--chat-muted`
- Stage label: `--chat-foreground`, Geist Mono, semibold
- Counter: `--chat-muted-foreground`

### Screen 2b: Paper Mini-bar Expanded

```
├─────────────────────────────────┤
│ Topik · 3/13                 ▴  │  Tap ▴ = collapse
├─────────────────────────────────┤
│ ◀ scroll                     ▶  │
│ ┌────┐┌────┐┌────┐┌────┐┌────┐ │  Horizontal scroll pills
│ │ ✓  ││ ✓  ││ ●  ││    ││    │ │  (PaperStageProgress logic)
│ │Gaga││Topi││Outl││Abst││Pend│ │
│ │san ││k   ││ine ││rak ││ahu│ │  ✓ = completed (teal dot)
│ └────┘└────┘└────┘└────┘└────┘ │  ● = current (sky + pulse)
│         Sedang menulis...       │     = pending (muted)
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │  Tap completed pill (max 2
│ │ Ketik pesan...           📎│ │  back) → RewindConfirmation
│ │                          ▶ │ │  Dialog (existing AlertDialog)
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
```

**13 stages (horizontal scroll):**
Gagasan → Topik → Outline → Abstrak → Pendahuluan → Tinjauan Literatur → Metodologi → Hasil → Diskusi → Kesimpulan → Daftar Pustaka → Lampiran → Judul

**Pill design tokens:**
- Completed: teal dot `oklch(0.777 0.152 181.912)`, `--chat-foreground` label
- Current: `--chat-info` bg, white text, pulse animation
- Pending: `--chat-secondary` bg, `--chat-muted-foreground` text
- Status text: `--chat-muted-foreground`, Geist Mono, 10px

### Screen 3: Artifact Viewer (Full-screen Push)

```
┌─────────────────────────────────┐
│ safe-area-top                   │
├─────────────────────────────────┤
│ ✕ Tutup    Bab 2: Tinjau..  ▾  │  ✕ = dismiss (back to chat)
│            BAGIAN  1,245 kata   │  ▾ = version selector dropdown
├─────────────────────────────────┤  Badges: content type, word count
│                                 │
│  ┌─ Invalidation warning ────┐  │  Conditional: artifact.
│  │ ⚠ Artifact ini telah     │  │  invalidatedAt !== undefined
│  │   di-invalidate karena    │  │
│  │   rewind ke tahap Topik   │  │
│  └───────────────────────────┘  │
│                                 │
│  BAB 2                          │  Content via ArtifactViewer
│  TINJAUAN LITERATUR             │  (MarkdownRenderer context=
│                                 │   "artifact")
│  2.1 Pendahuluan                │
│                                 │  Scrollable content area
│  Penelitian kualitatif telah    │
│  berkembang pesat dalam         │
│  beberapa dekade terakhir.      │
│  Menurut Creswell (2018),       │
│  pendekatan ini memungkinkan    │
│  peneliti untuk memahami...     │
│                                 │
│  ▾ Sumber Terkait · 3          │  SourcesIndicator
│                                 │  (or "Tidak ada rujukan
│                                 │   eksternal" if empty)
├─────────────────────────────────┤
│ [✏ Edit] [🔄 Refrasa] [···]   │  Bottom action bar
├─────────────────────────────────┤  ··· = Salin, Download
│ safe-area-bottom                │       (DOCX/PDF/TXT)
└─────────────────────────────────┘
```

**Behavior:**
- ✕ or swipe down = dismiss, back to conversation
- ✏ Edit → `ArtifactEditor` (inline replace content area)
- 🔄 Refrasa → push to Refrasa Viewer (Screen 3a)
- ··· → action sheet: Salin, Unduh DOCX, Unduh PDF, Unduh TXT
- ▾ version = dropdown selector (ArtifactViewer version logic)

**Supported content types (from ArtifactViewer):**
- Mermaid diagrams (MermaidRenderer)
- Charts (ChartRenderer)
- Syntax highlighted code (Python, R, JS, TS, LaTeX, Markdown)
- Markdown (MarkdownRenderer)
- Plain text fallback

**Design tokens:**
- Header: `--chat-background` bg, `--chat-foreground` title
- Badges: `--chat-secondary` bg, `--chat-secondary-foreground` text, Geist Mono
- Content area: `--chat-card` bg
- Invalidation warning: `--chat-warning` accent, `--chat-muted` bg
- Bottom bar: `--chat-background` bg, `--chat-border` top border
- Edit button: `--chat-secondary` bg
- Refrasa button: `--chat-secondary` bg
- ··· button: `--chat-secondary` bg

### Screen 3a: Refrasa Viewer (Push from Artifact)

```
┌─────────────────────────────────┐
│ safe-area-top                   │
├─────────────────────────────────┤
│ ◀ Back   REFRASA: Bab 2   ▾ v2│  ◀ = back to ArtifactViewer
│                                 │  ▾ = version selector
├─────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐      │
│ │  Asli    │ │ Refrasa  │      │  Toggle tabs (existing
│ └──────────┘ └──────────┘      │  RefrasaTabContent mobile)
│                                 │
│  Penelitian kualitatif telah    │  Content area (single view,
│  berkembang pesat dalam         │  toggle between asli/refrasa)
│  beberapa dekade terakhir.      │
│  Menurut Creswell (2018),       │
│  pendekatan ini memungkinkan    │
│  peneliti untuk memahami        │
│  fenomena sosial secara         │
│  mendalam...                    │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [Terapkan] [⚠ 3 isu]    [···] │  Bottom action bar
├─────────────────────────────────┤  Terapkan = apply refrasa
│ safe-area-bottom                │  ⚠ N isu = buka issues sheet
└─────────────────────────────────┘  ··· = Salin, Unduh, Hapus
```

**Tap "⚠ 3 isu" → Bottom Sheet (not floating panel):**

```
┌─────────────────────────────────┐
│  ─  Masalah Terdeteksi (3)      │
├─────────────────────────────────┤
│  ▾ Naturalness (2)             │  Collapsible sections
│  ┌───────────────────────────┐  │  (RefrasaIssueItem)
│  │ PERINGATAN                │  │
│  │ Pengulangan Kosa Kata    │  │
│  │ Kata "penelitian" muncul │  │
│  │ 5x dalam satu paragraf   │  │
│  │ → Variasikan: "studi",   │  │
│  │   "riset"                │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ INFO                      │  │
│  │ Pola Kalimat             │  │
│  │ ...                       │  │
│  └───────────────────────────┘  │
│                                 │
│  ▸ Style (1)                   │
└─────────────────────────────────┘
```

**Terapkan behavior (from RefrasaToolbar):**
Normal → applying (spinner) → applied (success bg). After apply, auto-navigate back to source artifact tab in 1.5s.

**Design tokens:**
- Toggle active: `--chat-foreground` text, `--chat-border` bottom border
- Toggle inactive: `--chat-muted-foreground`
- Terapkan: `--chat-secondary` bg → `--chat-success` bg when applied
- Issues badge: `--chat-warning` bg, white text
- Issue severity KRITIS: `--chat-destructive`, PERINGATAN: `--chat-warning`, INFO: `--chat-info`

### Screen 4: Sidebar Drawer

```
┌───────────────────────────┬─────┐
│ safe-area-top              │     │
├───────────────────────────┤     │
│                           │     │
│  [+ Percakapan Baru]     │     │  createNewConversation()
│                           │ dim │
├───────────────────────────┤     │
│  RIWAYAT  PAPER  PROGRES │     │  3 tabs (from ActivityBar
├───────────────────────────┤     │  panel types: chat-history,
│                           │     │  paper, progress)
```

**Tab: RIWAYAT (SidebarChatHistory)**

```
│                           │     │
│  HARI INI                 │     │  Grouped by time
│  ● Riset metodologi       │     │
│    kualitatif        3j   │     │  Relative time
│  ● Outline bab 2    11j  │     │
│                           │     │
│  KEMARIN                  │     │
│  ● Draft abstrak          │     │
│    📁 Paper · 5/13        │     │  PaperSessionBadge
│                           │     │
│  7 HARI TERAKHIR          │     │
│  ● Brainstorm topik  4h   │     │
│                           │     │
```

**Tab: PAPER (SidebarPaperSessions)**

```
│                           │     │
│  📁 Skripsi Bab 1-5      │     │  PaperFolderItem
│     ▾ expand              │     │  Status dot (sky/green)
│     📄 Abstrak v2  FINAL  │     │  ArtifactTreeItem
│     📄 Bab 1 v1   REVISI │     │
│     R  Refrasa Bab 1      │     │  "R" badge = refrasa
│                           │     │
│  (empty: "Tidak ada paper │     │
│   aktif di percakapan ini")│    │
│                           │     │
```

**Tab: PROGRES (SidebarProgress)**

```
│                           │     │
│  Draft skripsi            │     │  Paper title
│  ▓▓▓▓▓░░░░ 38% · 5/13   │     │  Progress bar
│                           │     │
│  ● Gagasan    Selesai     │     │  Vertical timeline
│  │                        │     │  Completed: teal dot
│  ● Topik      Selesai     │     │  Current: success + ring
│  │                        │     │  Pending: hollow muted
│  ● Outline    Sedang...   │     │
│  ┊                        │     │  Tap completed dot
│  ○ Abstrak                │     │  (max 2 back) → rewind
│  ┊                        │     │
│  ○ Pendahuluan            │     │
│                           │     │
```

**Footer (all tabs):**

```
│                           │     │
├───────────────────────────┤     │
│  ▓▓▓░░ 142/300 kredit    │     │  CreditMeter (compact)
│  ⚙ Pengaturan             │     │  Tap → /settings
├───────────────────────────┤     │
│ safe-area-bottom           │     │
└───────────────────────────┴─────┘
```

**Interactions:**
- Tap conversation → navigate to `/chat/[id]`, auto-close drawer
- Swipe left on conversation → delete (AlertDialog confirmation)
- Long press conversation → context menu (Edit Judul / Hapus)
- Double-tap conversation → inline rename (max 50 chars)
- Tap artifact item → navigate to conversation, open artifact viewer
- Tap completed timeline dot → RewindConfirmationDialog
- Tap CreditMeter → navigate to `/subscription/overview`
- Tap ⚙ → navigate to settings (includes theme, sign out)
- Tap outside drawer = close

**Design tokens:**
- Drawer bg: `--chat-accent`
- Tab active: `--chat-foreground`, border-bottom `--chat-border`
- Tab inactive: `--chat-muted-foreground`
- Section headers: `--chat-muted-foreground`, Geist Mono, 10px, uppercase, tracking-widest
- Item title: `--chat-foreground`, Geist Mono, text-xs
- Item time: `--chat-muted-foreground`, 11px
- Footer: `--chat-sidebar` bg, `--chat-sidebar-border` top border

### Screen 5: Action Sheet (··· in Conversation Header)

```
                 (overlay dim)
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │  iOS-style action sheet
│  │ 📄 Lihat Artifacts (3)  │    │
│  ├─────────────────────────┤    │
│  │ ✏ Edit Judul            │    │  → inline rename
│  ├─────────────────────────┤    │
│  │ 📤 Export Percakapan    │    │  → submenu: DOCX/PDF
│  ├─────────────────────────┤    │
│  │ 🗑 Hapus Percakapan     │    │  → AlertDialog confirmation
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │       Batal              │    │
│  └─────────────────────────┘    │
│ safe-area-bottom                │
└─────────────────────────────────┘
```

**"Lihat Artifacts" → Push to Artifact List:**

```
┌─────────────────────────────────┐
│ safe-area-top                   │
├─────────────────────────────────┤
│ ◀ Back        Artifacts (3)     │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │  List dari artifacts query
│  │ 📄 Bab 2: Tinjauan Lit.  │  │  (useQuery listByConversation)
│  │    BAGIAN · v2 · 1,245w  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │  Type icons:
│  │ 📄 Abstrak               │  │  code, outline, section,
│  │    BAGIAN · v1 · 312w    │  │  table, citation, formula
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 📊 Data Responden        │  │
│  │    TABEL · v1             │  │
│  └───────────────────────────┘  │
│                                 │
│  Tap item = push to             │
│  Artifact Viewer (Screen 3)     │
└─────────────────────────────────┘
```

## Feature Completeness Checklist

| # | Feature | Component | Mobile Screen | Treatment |
|---|---------|-----------|---------------|-----------|
| 1 | Chat input + send/stop | `ChatInput.tsx` | Screen 1, 2 | Direct |
| 2 | File upload | `FileUploadButton.tsx` | 📎 in input | Direct |
| 3 | User message bubble | `MessageBubble.tsx` | Screen 2 right | Direct |
| 4 | User message edit | `MessageBubble.tsx` | ✏ tap (not hover) | Adapted |
| 5 | Approved/revision cards | `MessageBubble.tsx` | Screen 2 inline | Direct |
| 6 | AI response markdown | `MarkdownRenderer.tsx` | Screen 2 left | Direct |
| 7 | Inline citations [1] | `InlineCitationChip.tsx` | Tap → Sheet | Already mobile |
| 8 | Sources collapsible | `SourcesIndicator.tsx` | Screen 2, 3 | Direct |
| 9 | Search status | `SearchStatusIndicator.tsx` | Screen 2 above AI | Direct |
| 10 | Tool state indicators | `ToolStateIndicator.tsx` | Screen 2 above AI | Direct |
| 11 | Artifact indicator card | `ArtifactIndicator.tsx` | Screen 2 tap→push | Direct |
| 12 | Quick actions (copy) | `QuickActions.tsx` | Screen 2 below AI | Direct |
| 13 | Process status bar | `ChatProcessStatusBar.tsx` | Above input streaming | Direct |
| 14 | Quota warning banner | `QuotaWarningBanner.tsx` | Screen 2 top | Direct |
| 15 | Artifact viewer | `ArtifactViewer.tsx` | Screen 3 full-screen | Adapted |
| 16 | Artifact editor | `ArtifactEditor.tsx` | Screen 3 inline | Direct |
| 17 | Artifact toolbar/actions | `ArtifactToolbar.tsx` | Screen 3 bottom bar | Adapted |
| 18 | Artifact version selector | `ArtifactViewer.tsx` | Screen 3 header ▾ | Direct |
| 19 | Invalidation warning | `ArtifactViewer.tsx` | Screen 3 banner | Direct |
| 20 | Artifact tabs (multi) | `ArtifactTabs.tsx` | Removed → list | Adapted |
| 21 | Fullsize modal | `FullsizeArtifactModal.tsx` | Not needed | Removed |
| 22 | Refrasa content | `RefrasaTabContent.tsx` | Screen 3a toggle | Already mobile |
| 23 | Refrasa toolbar | `RefrasaToolbar.tsx` | Screen 3a bottom | Adapted |
| 24 | Refrasa issues panel | `RefrasaIssueItem.tsx` | Bottom Sheet | Adapted |
| 25 | Refrasa loading | `RefrasaLoadingIndicator.tsx` | Overlay Screen 3a | Direct |
| 26 | Paper stage progress | `PaperStageProgress.tsx` | Mini-bar + pills | Adapted |
| 27 | Paper validation panel | `PaperValidationPanel.tsx` | Screen 2a inline | Direct |
| 28 | Rewind confirmation | `RewindConfirmationDialog.tsx` | AlertDialog | Direct |
| 29 | Paper session badge | `PaperSessionBadge.tsx` | Drawer history | Direct |
| 30 | Chat history list | `SidebarChatHistory.tsx` | Drawer RIWAYAT | Direct |
| 31 | Paper sessions list | `SidebarPaperSessions.tsx` | Drawer PAPER | Direct |
| 32 | Progress timeline | `SidebarProgress.tsx` | Drawer PROGRES | Direct |
| 33 | Activity bar nav | `ActivityBar.tsx` | Drawer tabs | Adapted |
| 34 | Credit meter | `CreditMeter.tsx` | Drawer footer | Direct |
| 35 | Theme toggle | `TopBar.tsx` | Landing / settings | Adapted |
| 36 | User dropdown | `TopBar.tsx` | Drawer → settings | Adapted |
| 37 | Template grid | `TemplateGrid.tsx` | Landing chips | Adapted |
| 38 | Mermaid diagrams | `MermaidRenderer.tsx` | Screen 2, 3 | Direct |
| 39 | Chart renderer | `ChartRenderer.tsx` | Screen 2, 3 | Direct |

**Total: 39 features mapped. 0 missing.**

## Responsive Breakpoint Strategy

Mobile design applies at `< md` (below 768px, matching existing `hidden md:flex` patterns).

| Breakpoint | Layout |
|------------|--------|
| `< 768px` (mobile) | This design document — composer-first, stack nav, drawer |
| `≥ 768px` (desktop) | Existing 6-column grid layout (no changes) |

The breakpoint already exists in codebase: `hidden md:flex` on sidebar, activity bar, artifact panel, and resizers. Mobile design layers on top of this existing responsive boundary.

## iOS-Specific Considerations

| Concern | Implementation |
|---------|---------------|
| Safe areas | `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)` on layout wrapper |
| Home indicator | Input area sits above `safe-area-bottom` |
| Notch | Header respects `safe-area-top` |
| Swipe-back gesture | CSS push/pop transitions, not conflicting with drawer swipe-right |
| Keyboard avoidance | `visualViewport` API or `dvh` units for input positioning |
| Haptic feedback | Optional: on send, on stage approve (if PWA) |

## Token Compliance

This mobile design uses **exclusively** `--chat-*` tokens from `globals-new.css`. No new tokens required. All rules from `chat-styling-rules.md` apply:

- Slate dominance: all text/icon/border are slate variants
- State colors (success/warning/destructive/info) only in badges and dots
- No transparency except shadow and modal backdrop
- No `dark:` overrides in components
- No hardcoded OKLCH except documented hover solid steps

## Out of Scope

- PWA / native app shell (service worker, manifest) — separate effort
- Offline support
- Push notifications
- Desktop layout changes (this doc is mobile-only)
- New features not in current codebase
- Animation/transition implementation details (covered in implementation plan)
