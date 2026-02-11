# Chat Page Existing State - Mechanical Grace Audit

> Dokumen ini mendokumentasikan keadaan terkini (existing state)
> komponen-komponen chat page sebelum redesign. Disusun berdasarkan
> user journey flow: dari hal pertama yang user lihat sampai fitur
> paling dalam.
>
> Dokumen ini BUKAN rencana aksi. Untuk detail perubahan, lihat
> dokumen task terpisah (dibuat setelah brainstorming).

**Compliance Score Saat Ini:** 65/100

| Metric | Score |
|--------|-------|
| Color Signal Theory | 60/100 |
| Typography System | 65/100 |
| Border System | 70/100 |
| Spacing/Layout | 80/100 |
| Dark Mode | 50/100 |
| Accessibility | 75/100 |

**User Journey Flow (urutan audit):**

```
PHASE 1: Shell + Empty State  → First impression saat buka /chat
PHASE 2: Sidebar Opens        → User expand sidebar
PHASE 3: Conversation Active  → Chat berlangsung
PHASE 4: Chat Features        → Citations, search, tools
PHASE 5: Paper Workflow       → Paper mode aktif
PHASE 6: Artifacts            → Panel kanan terbuka
PHASE 7: Advanced Features    → Edit, fullscreen, notifikasi
```

---

## PHASE 1: Shell + Empty State

> Hal PERTAMA yang user lihat saat membuka `/chat`. Sidebar
> collapsed, area utama menampilkan welcome message dan template
> cards. Shell header + activity bar selalu visible.
>
> Screenshots: `20.03.50.png` (dark, collapsed), `20.03.58.png`
> (light, collapsed)

### ShellHeader.tsx
`src/components/chat/shell/ShellHeader.tsx`

**Token saat ini:**
- Artifact count badge: `bg-amber-500 text-white`
- Buttons: `hover:text-foreground hover:bg-accent`
- Border bottom: `bg-border/50`

**Issue:** Badge pakai hardcoded `bg-amber-500 text-white`
— bukan semantic token `bg-primary text-primary-foreground`.

---

### ActivityBar.tsx
`src/components/chat/shell/ActivityBar.tsx`

**Token saat ini:**
- Active indicator: `border-amber-500`
- Active background: `bg-amber-500/10`
- Container: `bg-sidebar`

**Issue:** Active state pakai hardcoded `amber-500` — bukan
`border-primary` / `bg-primary/10`.

---

### ChatWindow.tsx (Empty State)
`src/components/chat/ChatWindow.tsx`

**Token saat ini:**
- Icon container: `bg-slate-200` + `text-slate-500`
- CTA button: `bg-slate-800 hover:bg-slate-700 text-slate-50`
- Error state: `bg-rose-500/10 border border-rose-500/30`,
  `text-rose-500/50`

**Issue:** Semua hardcoded slate — tidak ada dark mode variant.
Icon container dan CTA invisible/low contrast di dark mode.
Error state pakai `rose` langsung bukan `destructive` token.

---

### TemplateGrid.tsx
`src/components/chat/messages/TemplateGrid.tsx`

**Token saat ini:**
- Icon boxes: `bg-slate-200 text-slate-500`
- Card container: `rounded-shell border-hairline bg-card/90` ✓
- Header: `text-narrative text-2xl` ✓
- Badge: `text-signal rounded-badge` ✓

**Issue:** Icon boxes hardcoded `bg-slate-200 text-slate-500`
— no dark mode. Sisanya sudah compliant.

---

### ChatMiniFooter.tsx
`src/components/chat/ChatMiniFooter.tsx`

**Token saat ini:**
- Text: `text-interface text-[10px] text-muted-foreground
  tracking-wider uppercase` ✓
- Background: `bg-sidebar` ✓
- Border: `border-t border-border/50` ✓

**Issue:** 95% compliant. Perlu verifikasi visual saja.

---

## PHASE 2: Sidebar Opens

> User klik chevron atau expand sidebar. Muncul brand header,
> "Percakapan Baru" button, dan chat history list.
>
> Screenshots: `20.04.12.png` (light, expanded), `20.04.20.png`
> (dark, expanded)

### ChatSidebar.tsx
`src/components/chat/ChatSidebar.tsx`

**Token saat ini:**
- Upgrade button hover: `hover:bg-[oklch(0.65_0.181_125.2)]`
- New Chat button: `bg-primary hover:bg-primary/90 text-white
  rounded-action` ✓
- Label: `text-[10px] font-mono font-bold uppercase
  tracking-widest text-muted-foreground` ✓

**Issue:** Upgrade button pakai oklch hardcoded di hover state
— bukan semantic token atau CSS variable.

---

### SidebarChatHistory.tsx
`src/components/chat/sidebar/SidebarChatHistory.tsx`

**Token saat ini:**
- List hover: `bg-list-hover-bg` (custom CSS var)
- List selected: `bg-list-selected-bg` (custom CSS var)
- Action buttons: `opacity-0 group-hover:opacity-100`
- Edit input error: `border-destructive
  focus-visible:ring-destructive`
- Relative time: `font-mono` ✓

**Issue:** Custom `bg-list-*` CSS vars perlu verifikasi apakah
dark mode values cukup kontras. Action buttons opacity transition
perlu dicek visibility di dark mode.

---

## PHASE 3: Conversation Active

> User mulai percakapan. Layout utama aktif dengan message area,
> input bar, dan message bubbles. Core experience chat.
>
> Screenshots: `19.27.28.png` (light, active conversation),
> `19.27.36.png` (dark, active conversation)

### ChatLayout.tsx
`src/components/chat/layout/ChatLayout.tsx`

**Token saat ini:**
- Beberapa area: `bg-[color:var(--section-bg-alt)]`
- Container: `bg-sidebar`, `bg-card`, `bg-background`
- Dividers: `border-border/50`
- Transition: `transition-[grid-template-columns] duration-300`

**Issue:** `bg-[color:var(--section-bg-alt)]` bukan semantic
token standar — tidak konsisten dengan pattern halaman lain
yang pakai `bg-muted` atau `bg-sidebar`.

---

### PanelResizer.tsx
`src/components/chat/layout/PanelResizer.tsx`

**Token saat ini:**
- Hover: `hover:bg-amber-500/40`
- Dragging: `bg-amber-500/60`

**Issue:** Hardcoded `amber-500` — bukan `primary` token.

---

### ChatInput.tsx
`src/components/chat/ChatInput.tsx`

**Token saat ini:**
- Focus: custom `focus-ring` utility (dari globals.css)
- Textarea bg: `bg-card/90`
- Send button: `hover-slash` effect
- File attachment: `rounded-badge bg-muted`

**Issue:** Perlu verifikasi bahwa `focus-ring` utility benar
menggunakan `--ring` variable dan visible di kedua mode.
`hover-slash` perlu dicek diagonal stripe di dark mode.

---

### MessageBubble.tsx
`src/components/chat/MessageBubble.tsx`

**Token saat ini:**
- File badge: `bg-info/20 text-info border border-info/30`
- Edit textarea border: `border-sky-500`
- Focus ring: `focus:ring-amber-500`
- User bubble: `bg-card border border-border/50` ✓

**Issue:** File badge `bg-info/20` terlalu transparan di dark
mode — kontras rendah. Edit focus ring hardcoded
`focus:ring-amber-500` bukan `focus:ring-primary`.
`border-sky-500` hardcoded tapi semantically correct (AI edit).

---

### MarkdownRenderer.tsx
`src/components/chat/MarkdownRenderer.tsx`

**Token saat ini:**
- Headings (h1/h2/h3): `text-2xl font-bold tracking-tight
  text-foreground` (TANPA `.text-narrative`)
- Blockquote: `border-l-2`
- Inline code: `rounded-badge bg-background/50`
- Code blocks: `rounded-action`

**Issue:** Semua heading TIDAK pakai `.text-narrative` — artinya
tidak mendapat Geist Sans. Blockquote `border-l-2` lebih tebal
dari Mechanical Grace preference (1px). Inline code mungkin
perlu `dark:bg-background/70` untuk kontras.

---

## PHASE 4: Chat Features Appear

> Saat percakapan berlangsung, muncul fitur tambahan: citations,
> web search indicator, thinking dots, tool execution states,
> quick actions, file upload.
>
> Screenshots: `19.27.28.png` (citations + sources visible)

### InlineCitationChip.tsx
`src/components/chat/InlineCitationChip.tsx`

**Token saat ini:**
- Badge: shadcn `Badge variant="secondary"`, `rounded-badge`,
  `font-mono font-medium` ✓
- Mobile sheet: shadcn `SheetContent` ✓
- Desktop popover: delegasi ke `@/components/ai-elements/
  inline-citation` sub-components

**Issue:** Komponen ini sangat compliant. Pakai `rounded-badge`,
`font-mono`, shadcn primitives. Sub-component
`InlineCitationCardTrigger` dan `InlineCitationSource` perlu
di-audit terpisah (di folder `ai-elements/`).

---

### SourcesIndicator.tsx
`src/components/chat/SourcesIndicator.tsx`

**Token saat ini:**
- Header: `bg-emerald-500/10 border-l-4 border-l-emerald-500`,
  `text-emerald-500 font-mono uppercase text-xs tracking-wide`
- Icon: Iconoir `CheckCircle` ✓
- Container: `rounded-badge border border-border/50 bg-muted/30` ✓
- Trigger: `hover:bg-accent/50 rounded-badge` ✓
- Dividers: `divide-border/50` ✓
- Source title hover: `group-hover:text-sky-400`
- Source URL: `font-mono text-muted-foreground` ✓
- Source item radius: generic `rounded` (bukan scale MG)
- Show more button: `font-mono text-muted-foreground` ✓
- Icons: Iconoir (`NavArrowDown`, `OpenNewWindow`) ✓

**Issue:** `emerald-500` hardcoded (bukan `--success` token yang
adalah teal). Source hover `text-sky-400` hardcoded — no dark
variant. Source item pakai `rounded` generik bukan
`rounded-action`/`rounded-badge`. Tidak ada dark mode opacity
adjustment untuk `bg-emerald-500/10`.

---

### SearchStatusIndicator.tsx
`src/components/chat/SearchStatusIndicator.tsx`

**Token saat ini:**
- Searching: `bg-sky-500/10 border-l-sky-500`,
  `text-sky-500` (icon + text)
- Done: `bg-emerald-500/10 border-l-emerald-500`,
  `text-emerald-500`
- Error: `bg-rose-500/10 border-l-rose-500`, `text-rose-500`
- Default: `bg-muted border-l-muted-foreground`,
  `text-muted-foreground` ✓
- Layout: `rounded-badge`, `font-mono uppercase tracking-wide` ✓
- Icons: Iconoir (`Search`, `CheckCircle`, `XmarkCircle`) ✓

**Issue:** Semua status colors hardcoded (`sky-500`,
`emerald-500`, `rose-500`) — bukan semantic tokens
(`--info`, `--success`, `--destructive`). Tidak ada dark mode
opacity variants untuk `/10` backgrounds.

---

### ThinkingIndicator.tsx
`src/components/chat/ThinkingIndicator.tsx`

**Token saat ini:**
- Container bg: `bg-slate-900/80`
- Border: `border border-border/50` ✓
- Radius: `rounded-action` ✓
- Text: `text-[11px] font-mono uppercase tracking-wider
  text-muted-foreground` ✓
- Dots: `bg-muted-foreground` ✓ + `animate-thinking-dot`
  (globals.css) ✓

**Issue:** Container `bg-slate-900/80` hardcoded gelap —
di light mode ini terlalu gelap, seharusnya pakai semantic
token. Sama kayak ArtifactPanel problem.

---

### ToolStateIndicator.tsx
`src/components/chat/ToolStateIndicator.tsx`

**Token saat ini:**
- Processing: `border-sky-500/50 bg-sky-500/10 text-sky-400`,
  `border border-dashed` ✓
- Error: `border-rose-500/50 bg-rose-500/10 text-rose-500`
- Spinner: `border-sky-500 border-t-transparent`
- Radius: `rounded-action` ✓
- Text: `text-[11px] font-mono uppercase tracking-wide` ✓
- Icons: Iconoir (`WarningCircle`, `Globe`) ✓

**Issue:** Colors hardcoded (`sky-500`, `sky-400`, `rose-500`)
— bukan semantic tokens. `text-sky-400` terlalu terang di light
mode. Tidak ada dark mode opacity variants. Processing spinner
hardcoded `border-sky-500`.

---

### QuickActions.tsx
`src/components/chat/QuickActions.tsx`

**Token saat ini:**
- Button: `rounded-action hover:bg-muted` ✓
- Text: `text-[10px] font-mono text-muted-foreground
  hover:text-foreground` ✓
- Copied state: `text-emerald-500`
- Border: `border-t border-border/50` ✓
- Icons: Iconoir (`Copy`, `Check`) ✓

**Issue:** Largely compliant. `text-emerald-500` untuk copied
state hardcoded — bisa pakai `text-success` tapi emerald
sebagai "trust/validation" signal semantically masih bisa
diterima. Minor issue.

---

### FileUploadButton.tsx
`src/components/chat/FileUploadButton.tsx`

**Token saat ini:**
- Button: `rounded-action text-muted-foreground
  hover:text-foreground hover:bg-accent` ✓
- Spinner: `border-muted-foreground border-t-transparent` ✓
- Tooltip: `font-mono text-xs` ✓
- Icons: Iconoir (`Attachment`) ✓
- Disabled: `disabled:opacity-50` ✓

**Issue:** Fully compliant. Tidak ada perubahan yang diperlukan.

---

## PHASE 5: Paper Workflow Starts

> User memulai paper workflow. Sidebar berubah menampilkan paper
> sessions dan stage progress. Chat tabs muncul untuk
> multi-conversation. Quota warning mungkin tampil.
>
> Screenshots: `19.28.12.png` (paper sessions sidebar),
> `19.28.17.png` (stage progress sidebar)

### ChatTabs.tsx
`src/components/chat/shell/ChatTabs.tsx`

**Token saat ini:**
- Container: `bg-background border-b border-border/50` ✓
- Active tab: `bg-card border-b-amber-500`
- Active icon: `text-primary` ✓
- Tab text: `font-mono text-sm` ✓
- Hover: `hover:bg-accent` ✓
- Close button: `rounded-action`,
  `hover:bg-destructive hover:text-destructive-foreground` ✓
- Focus: `focus-visible:ring-primary` ✓
- Scroll buttons: `rounded-action`,
  `hover:bg-accent hover:text-foreground` ✓
- Fade gradients: `from-background to-transparent` ✓
- Tab separator: `after:bg-border` ✓
- Icons: Iconoir (`ChatBubble`, `Page`, `Xmark`,
  `NavArrowLeft`, `NavArrowRight`) ✓

**Issue:** Active tab pakai `border-b-amber-500` hardcoded —
bukan `border-b-primary`. Sisanya sangat compliant.

---

### SidebarPaperSessions.tsx
`src/components/chat/sidebar/SidebarPaperSessions.tsx`

**Token saat ini:**
- Folder icon: `text-amber-500`
- Status dot completed: `bg-emerald-500`
- Status dot in-progress: `bg-sky-500`
- Selected item: `bg-amber-500/10`
- Folder hover: `hover:bg-accent` ✓
- Chevron: `text-muted-foreground` ✓
- Folder name: `text-[13px] font-mono font-medium` ✓
- Stage info: `text-[11px] font-mono text-muted-foreground` ✓
- Version badge: `bg-muted text-muted-foreground` ✓,
  generic `rounded` (bukan `rounded-badge`)
- FINAL badge: `bg-emerald-500 text-white`,
  generic `rounded` (bukan `rounded-badge`)
- Empty state: `text-muted-foreground/50` ✓, `font-mono` ✓
- Header label: `text-[10px] font-mono font-bold uppercase
  tracking-widest text-muted-foreground` ✓
- Icons: Iconoir (`Page`, `Folder`, `NavArrowRight`) ✓

**Issue:** Folder icon `text-amber-500` hardcoded. Status dots
hardcoded (`emerald-500`, `sky-500`). Selected item
`bg-amber-500/10` tidak ada dark variant. Badges pakai generic
`rounded` bukan `rounded-badge`. FINAL badge `bg-emerald-500
text-white` hardcoded.

---

### SidebarProgress.tsx
`src/components/chat/sidebar/SidebarProgress.tsx`

**Token saat ini:**
- Progress bar track: `bg-slate-800`
- Progress bar fill: `bg-amber-500`
- Completed dot: `bg-amber-500 border-amber-500`
- Current dot: `bg-sky-500 border-sky-500 ring-2
  ring-sky-500/30 ring-offset-1 ring-offset-sidebar`
- Pending dot: `bg-transparent border-muted-foreground/50` ✓
- Connecting line completed: `bg-amber-500`
- Connecting line pending: `bg-border` ✓
- Current text: `text-sky-400`
- Completed status text: `text-amber-500`
- Pending text: `text-muted-foreground` ✓
- Rewind hover: `hover:ring-amber-500/50`,
  `group-hover:text-amber-400`
- Header: `text-[10px] font-mono font-bold uppercase
  tracking-widest text-muted-foreground` ✓
- Paper title: `text-xs font-mono text-muted-foreground` ✓
- Percentage: `text-xs font-mono text-muted-foreground` ✓
- Border: `border-b border-border/50` ✓
- Empty state: Iconoir `GitBranch` ✓, `font-mono` ✓
- Tooltip: `font-mono text-xs` ✓

**Issue:** CRITICAL — progress bar track `bg-slate-800`
hardcoded, invisible di light mode. Semua amber/sky colors
hardcoded (bukan `--primary`/`--info` tokens).
`ring-offset-sidebar` mungkin bermasalah jika sidebar bg
berubah. Tidak ada dark mode opacity variants.

---

### QuotaWarningBanner.tsx
`src/components/chat/QuotaWarningBanner.tsx`

**Token saat ini:**
- Warning: `bg-slate-900 border-amber-500/50 text-amber-200`
- Critical: `bg-slate-900 border-orange-500/50 text-orange-200`
- Depleted: `bg-slate-900 border-rose-500/50 text-rose-200`
- Action links: `text-amber-300` / `text-orange-300` /
  `text-rose-300`
- Radius: `rounded-action` ✓
- Text: `font-mono text-xs` ✓
- Dismiss button: `rounded-action`,
  `hover:bg-black/5 dark:hover:bg-white/5` ✓
- Icons: Iconoir (`WarningTriangle`, `Flash`,
  `CreditCard`, `Xmark`) ✓

**Issue:** SEMUA banner pakai `bg-slate-900` hardcoded — gelap
di kedua mode, sama seperti problem ThinkingIndicator dan
ArtifactPanel. Di light mode, banner ini akan terlihat sangat
kontras/out-of-place. Semua warna text (`text-amber-200`,
`text-orange-200`, `text-rose-200`) hardcoded untuk dark
background — tidak akan terbaca di light bg. `orange-500`
bukan bagian dari Mechanical Grace color system.

---

## PHASE 6: Artifacts Muncul

> AI menghasilkan artifact. Panel kanan terbuka menampilkan
> artifact viewer. Artifact indicator muncul di chat.
> List selector untuk multiple artifacts.
>
> Screenshots: `19.28.01.png` (3-column with artifact panel)

### ArtifactPanel.tsx
`src/components/chat/ArtifactPanel.tsx`

**Token saat ini:**
- Container: `bg-slate-950 rounded-shell border border-border/50`
- Header title: `text-xs font-mono font-medium uppercase
  tracking-wide text-foreground` ✓
- Count badge: `rounded-badge bg-muted text-muted-foreground` ✓
- Action buttons: `h-7 w-7 rounded-action text-muted-foreground
  hover:bg-accent hover:text-foreground` ✓
- Copy check icon: `text-emerald-500`
- Separator: `bg-border` ✓
- Collapsible trigger: `hover:bg-accent/30` ✓
- Version badge: shadcn `Badge variant="secondary"`,
  `rounded-badge font-mono` ✓
- Type badge: shadcn `Badge variant="outline"`,
  `rounded-badge font-mono` ✓
- Borders: `border-t border-border` ✓
- Empty state: `text-muted-foreground opacity-50` ✓
- Tooltips: `font-mono text-xs` ✓
- Icons: ALL Iconoir (`Page`, `Xmark`, `Expand`, `Download`,
  `EditPencil`, `MagicWand`, `Copy`, `Check`, `MoreVert`,
  `NavArrowDown`, `Code`, `List`, `Table2Columns`, `Book`,
  `Calculator`) ✓

**Issue:** CRITICAL — `bg-slate-950` hardcoded, gelap di KEDUA
mode. Di light mode, teks dan kontrol tidak terbaca. Sama
seperti ThinkingIndicator dan QuotaWarningBanner.
`text-emerald-500` pada copy check hardcoded (minor). Date
span tidak pakai `font-mono`.

---

### ArtifactViewer.tsx
`src/components/chat/ArtifactViewer.tsx`

**Token saat ini:**
- FINAL badge: `rounded-badge bg-emerald-500 text-white`
- Invalidation badge: `rounded-badge bg-amber-500/20
  text-amber-500`
- Invalidation helper: `text-amber-400/80`
- Version selector: `rounded-action bg-muted border-0
  font-mono text-[11px]` ✓
- Header border: `border-b border-border` ✓
- Spinner: `border-muted-foreground border-t-transparent` ✓
- Content area: `scrollbar-thin` ✓
- SyntaxHighlighter: inline style `borderRadius: "0.5rem"`
- Pre fallback: `bg-muted rounded-action` ✓
- Refrasa overlay: `bg-background/80 backdrop-blur-sm` ✓
- Empty/error states: `text-muted-foreground` ✓
- Icons: Iconoir (`Page`, `WarningTriangle`, `MagicWand`) ✓

**Issue:** FINAL badge `bg-emerald-500 text-white` hardcoded.
Invalidation badge `bg-amber-500/20 text-amber-500` dan helper
`text-amber-400/80` hardcoded — tidak ada dark variant.
SyntaxHighlighter `borderRadius: "0.5rem"` hardcoded (bukan
design system value).

---

### ArtifactList.tsx
`src/components/chat/ArtifactList.tsx`

**Token saat ini:**
- List items: `rounded-action hover:bg-accent/50
  focus:ring-primary` ✓
- Selected: `bg-accent text-accent-foreground` ✓
- Version badge: shadcn `Badge variant="secondary"`,
  `rounded-badge font-mono` ✓
- Type badge: shadcn `Badge variant="outline"`,
  `rounded-badge font-mono` ✓
- Date: `text-[10px] font-mono text-muted-foreground` ✓
- Empty state: `text-muted-foreground font-mono uppercase` ✓
- Scrollbar: `scrollbar-thin` ✓
- Icons: ALL Iconoir (`Page`, `Code`, `List`,
  `Table2Columns`, `Book`, `Calculator`) ✓

**Issue:** Sangat compliant. Tidak ada perubahan yang
diperlukan.

---

### ArtifactIndicator.tsx
`src/components/chat/ArtifactIndicator.tsx`

**Token saat ini:**
- Container: `rounded-action bg-sky-500/10 border
  border-dashed border-sky-500/50`
- Hover: `hover:bg-sky-500/20 hover:border-sky-500/70`
- Icon: `text-sky-500` (Iconoir `CheckCircle`) ✓
- Badge: `rounded-badge bg-sky-500/20 text-sky-400
  border border-dashed border-sky-500/30`
- Title: `text-sm font-medium text-foreground` ✓
- View button: `text-sky-400 font-mono uppercase` ✓
- Icons: Iconoir (`CheckCircle`, `NavArrowRight`) ✓

**Issue:** Semua sky colors hardcoded (`sky-500`, `sky-400`)
— bukan `--info`/`--ai-border` tokens. `text-sky-400` terlalu
terang di light mode, kontras rendah terhadap background putih.
Tidak ada dark mode opacity variants untuk `/10`, `/20`, `/50`
backgrounds.

---

## PHASE 7: Advanced Features

> Fitur lanjutan yang muncul saat interaksi mendalam: edit
> artifact, fullscreen viewer, version history, notifikasi.
>
> Screenshots: `19.28.31.png` (fullscreen artifact),
> `19.29.21.png` (refrasa modal)

### ArtifactEditor.tsx
`src/components/chat/ArtifactEditor.tsx`

**Token saat ini:**
- Textarea: `bg-muted rounded-action border border-dashed
  border-sky-500/50 focus:ring-amber-500`
- Unsaved indicator: `text-amber-500`
- Char count: `text-xs text-muted-foreground font-mono` ✓
- Kbd elements: `bg-muted rounded-badge text-[10px]` ✓
- Footer: `border-t` (tanpa warna spesifik)
- Buttons: shadcn `Button` + `Button variant="outline"` ✓
- Icons: Iconoir (`FloppyDisk`, `Xmark`) ✓

**Issue:** `focus:ring-amber-500` hardcoded — bukan
`focus:ring-primary`. `text-amber-500` untuk unsaved indicator
hardcoded. `border-sky-500/50` semantically correct (AI edit
= dashed Sky) tapi tidak ada dark variant.

---

### FullsizeArtifactModal.tsx
`src/components/chat/FullsizeArtifactModal.tsx`

**Token saat ini:**
- Container: `bg-slate-950 rounded-shell border border-border/50`
- Header bg: `bg-slate-900`
- Actions bar bg: `bg-slate-900`
- Edit textarea: `bg-slate-900 rounded-action border
  border-dashed border-sky-500/50 focus:ring-amber-500`
- Version badge: `rounded-badge bg-amber-500/20 text-amber-400
  border border-amber-500/30`
- Save button: `bg-amber-500 hover:bg-amber-600 text-slate-950`
- Close button: `hover:bg-rose-500/90 hover:text-white`
- Minimize button: `rounded-action text-muted-foreground
  hover:bg-accent` ✓
- Copy success: `text-emerald-500`
- Backdrop: `bg-black/70 backdrop-blur-sm`
- Refrasa overlay: `bg-background/80 backdrop-blur-sm` ✓
- MarkdownRenderer wrapper: `prose-lg prose-invert`
- Pre fallback: `bg-muted rounded-action` ✓
- SyntaxHighlighter: inline style `borderRadius: "0.5rem"`
- Buttons: shadcn `Button` + `font-mono` ✓
- Tooltips: `font-mono text-xs` ✓
- Icons: ALL Iconoir (`Xmark`, `Collapse`, `Download`,
  `Check`, `Copy`, `NavArrowDown`, `MagicWand`) ✓

**Issue:** CRITICAL — `bg-slate-950` dan `bg-slate-900`
hardcoded di container, header, actions bar, dan edit textarea
— gelap di kedua mode. Version badge, save button, close hover
semua hardcoded. `prose-invert` pada MarkdownRenderer akan
gagal di light mode (memaksa warna teks terang).
`focus:ring-amber-500` hardcoded. `text-emerald-500` hardcoded.

---

### VersionHistoryDialog.tsx
`src/components/chat/VersionHistoryDialog.tsx`

**Token saat ini:**
- Dialog: shadcn `Dialog`/`DialogContent` ✓
- List items: `rounded-action border border-border/50
  hover:bg-accent/50`
- Focus: `focus:ring-amber-500`
- Current version: `bg-accent border-amber-500/50`
- Timeline dot current: `bg-amber-500`
- Timeline dot other: `bg-muted-foreground/50` ✓
- "Dilihat" badge: `bg-amber-500/20 text-amber-400`
- "Terbaru" badge: shadcn `Badge variant="secondary"` ✓
- Version number: `font-mono font-medium` ✓
- Date: `text-xs font-mono text-muted-foreground` ✓
- Content preview: `text-xs text-muted-foreground` ✓
- Footer: `border-t border-border/50 text-xs font-mono
  text-muted-foreground` ✓
- Trigger: shadcn `Button variant="outline" font-mono` ✓
- Icons: Iconoir (`Clock`, `NavArrowRight`) ✓

**Issue:** `focus:ring-amber-500` hardcoded — bukan
`focus:ring-primary`. Badges `bg-amber-500/20 text-amber-400`
hardcoded. Timeline dot `bg-amber-500` hardcoded. Border
`border-amber-500/50` hardcoded. Tidak ada dark mode opacity
variants.

---

### NotificationDropdown.tsx
`src/components/chat/shell/NotificationDropdown.tsx`

**Token saat ini:**
- Trigger button: `rounded-lg` (generic)
- Dropdown panel: `rounded-lg` (generic), `bg-popover
  border border-border` ✓
- Badge dot: `bg-destructive` ✓
- Unread dot: `bg-primary` ✓
- Icon backgrounds: `bg-primary/15 text-primary` ✓,
  `bg-info/15 text-info` ✓, `bg-success/15 text-success` ✓,
  `bg-warning/15 text-warning`
- Notification item hover: `hover:bg-accent` ✓
- Unread bg: `bg-muted/50` ✓
- Text: `text-foreground`, `text-muted-foreground` ✓
- Time: `font-mono` ✓
- "Mark all as read": `text-primary` ✓
- "Show all" button: `rounded-lg` (generic), `text-primary` ✓
- Icon bg wrapper: `rounded-lg` (generic)
- Header/footer borders: `border-border` ✓
- Icons: ALL Iconoir (`Bell`, `Page`, `InfoCircle`,
  `Download`, `ChatBubble`, `NavArrowRight`) ✓

**Issue:** 4x `rounded-lg` generic — harus `rounded-action`
(trigger, icon wrapper) dan `rounded-shell` (dropdown panel).
Icon bg opacity `/15` mungkin terlalu tipis di dark mode.
`bg-warning/15 text-warning` — perlu verifikasi apakah
`--warning` token terdefinisi di globals.css. Header
"Notifications" dan "Show all" tidak pakai `font-mono`.

---

## Files yang TIDAK Perlu Diubah

| File | Alasan |
|------|--------|
| `src/app/chat/[conversationId]/page.tsx` | Server component, no styling |
| `src/app/chat/layout.tsx` | Minimal wrapper |
| `src/app/chat/page.tsx` | Minimal wrapper |
| `src/components/chat/ChatContainer.tsx` | Pure logic orchestrator, no UI |
| `src/components/chat/layout/useResizer.ts` | Hook, no UI |
| `src/app/globals.css` | Semua tokens sudah correctly defined |

---

## Compliance Score Saat Ini

| Metric | Score | Catatan |
|--------|-------|---------|
| Color Signal Theory | 60/100 | Banyak hardcoded `amber-500`, `sky-500`, `slate-*` |
| Typography System | 65/100 | `.text-narrative` missing di MarkdownRenderer headings |
| Border System | 70/100 | `rounded-lg` generik di NotificationDropdown |
| Spacing/Layout | 80/100 | Relatif baik, pakai CSS Grid variables |
| **Dark Mode** | **50/100** | Terburuk — `bg-slate-950/900` hardcoded di 4+ komponen |
| Accessibility | 75/100 | ARIA attributes ada, focus rings perlu standardisasi |
| **Overall** | **65/100** | |

### Pattern Masalah yang Berulang

| Pattern | Frekuensi | Komponen Terdampak |
|---------|-----------|-------------------|
| `bg-slate-950/900` hardcoded dark | 4 komponen | ArtifactPanel, FullsizeArtifactModal, ThinkingIndicator, QuotaWarningBanner |
| `amber-500` hardcoded (bukan `--primary`) | 8+ komponen | ShellHeader, ActivityBar, ChatTabs, PanelResizer, SidebarProgress, FullsizeArtifactModal, VersionHistoryDialog, ArtifactEditor |
| `sky-500/400` hardcoded (bukan `--info`) | 5+ komponen | ToolStateIndicator, SearchStatusIndicator, ArtifactIndicator, SourcesIndicator, SidebarProgress |
| `rounded-lg` generik | 1 komponen | NotificationDropdown (4 instances) |
| `focus:ring-amber-500` (bukan `--primary`) | 3 komponen | ArtifactEditor, FullsizeArtifactModal, VersionHistoryDialog |
| Missing dark mode opacity variants | 6+ komponen | MessageBubble, SearchStatusIndicator, ToolStateIndicator, SidebarPaperSessions, ArtifactIndicator, NotificationDropdown |
| `emerald-500` hardcoded (bukan `--success`) | 4+ komponen | SourcesIndicator, SearchStatusIndicator, QuickActions, SidebarPaperSessions |
