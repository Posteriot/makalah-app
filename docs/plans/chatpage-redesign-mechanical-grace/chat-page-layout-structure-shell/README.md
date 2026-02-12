# Chat Page Layout Structure & Shell — Current State

> Dokumentasi arsitektur spasial dan shell halaman chat (`/chat`, `/chat/[conversationId]`) setelah implementasi layout restructuring (branch `feat/chatpage-redesign-mechanical-grace`).

## Scope Dokumen

Dokumen ini mencakup **layout structure dan shell** — bagaimana halaman chat disusun secara spasial (grid, panel, bar, resizer) dan bagaimana state layout-nya dikelola.

**Tercakup:**
- Grid architecture (6 kolom, dimensi, constraints, CSS variables)
- Shell components (ActivityBar, TopBar, ChatSidebar header, PanelResizer)
- Layout state management (sidebar collapse, panel width, active panel)
- Artifact tab state model (useArtifactTabs)
- Container orchestration (ChatContainer → ChatLayout prop flow)
- Layout interactions (collapse/expand, resize, grid transitions)
- UserDropdown variant system (default vs compact)
- Mobile layout (Sheet mechanism)

**Tidak tercakup:**
- Konten pesan (MessageBubble, MarkdownRenderer, InlineCitationChip)
- Chat input (ChatInput, file upload, template selection)
- AI/streaming layer (useChat, transport, status handling)
- Paper mode (PaperValidationPanel, stage management, rewind)
- Konten sidebar (SidebarChatHistory, SidebarPaperSessions, SidebarProgress internals)
- Artifact viewer (ArtifactViewer, FullsizeArtifactModal, Refrasa)
- Data flow (useMessages, useConversations, Convex queries)
- Notifikasi (NotificationDropdown internals)
- Billing/quota (QuotaWarningBanner)
- Routing (`/chat` vs `/chat/[conversationId]` page components)

---

## Arsitektur Grid

ChatLayout menggunakan **6-column CSS Grid** dalam satu row full-height:

```
┌──────────┬───────────┬──┬─────────────────────┬──┬──────────────┐
│ Activity │  Sidebar  │R │    Main Content      │R │  Artifact    │
│   Bar    │           │e │                      │e │   Panel      │
│  (48px)  │ (280px*)  │s │      (1fr)           │s │  (360px*)    │
│          │           │  │                      │  │              │
│  fixed   │ resizable │4 │ TopBar + ChatWindow  │4 │ Tabs+Viewer  │
│          │           │px│                      │px│              │
└──────────┴───────────┴──┴─────────────────────┴──┴──────────────┘
                                                     * = default, resizable
```

### Dimensi dan Constraints

| Elemen | Default | Min | Max | Collapse |
|--------|---------|-----|-----|----------|
| Activity Bar | 48px | 48px | 48px | Tidak bisa |
| Sidebar | 280px | 180px | 50% viewport | < 100px threshold |
| Left Resizer | 4px | — | — | 0px saat sidebar collapsed |
| Main Content | 1fr | — | — | Tidak bisa |
| Right Resizer | 4px | — | — | 0px saat panel closed |
| Artifact Panel | 360px | 280px | 50% viewport | 0px saat tidak ada tab |

### CSS Variables

```css
--activity-bar-width: 48px;
--sidebar-width: 280px;
--sidebar-min-width: 180px;
--sidebar-max-width: 50%;
--panel-width: 360px;
--panel-min-width: 280px;
--panel-max-width: 50%;
--shell-footer-h: 32px;
```

## Struktur Vertikal

```
┌─────────────────────────────────────────────────────────┐
│  CSS Grid (flex-1, min-h-0)                             │
│  ┌────┬─────────┬──┬──────────────────┬──┬────────────┐ │
│  │    │         │  │ TopBar (shrink-0)│  │            │ │
│  │ AB │ Sidebar │R │─────────────────-│R │  Artifact  │ │
│  │    │         │  │ ChatWindow       │  │   Panel    │ │
│  │    │         │  │ (flex-1)         │  │            │ │
│  └────┴─────────┴──┴──────────────────┴──┴────────────┘ │
├─────────────────────────────────────────────────────────┤
│  ChatMiniFooter (32px, full-width)                      │
└─────────────────────────────────────────────────────────┘
```

## Komponen per Kolom

### Column 1: ActivityBar (`src/components/chat/shell/ActivityBar.tsx`)

Navigasi vertikal 48px, berisi:
1. **Logo** — Link ke `/`, Makalah logo (light/dark mode), `w-10 h-10`
2. **Separator** — hairline horizontal
3. **Panel items** (tablist, vertical):
   - Chat History (`ChatBubble` icon)
   - Paper Sessions (`Page` icon)
   - Progress Timeline (`GitBranch` icon)

Active state: `border-l-2 border-amber-500 bg-amber-500/10`.
Klik panel saat sidebar collapsed → auto-expand sidebar.

### Column 2: ChatSidebar (`src/components/chat/ChatSidebar.tsx`)

Multi-state container, render konten sesuai `activePanel`:

```
┌──────────────────────────┐
│ [Collapse toggle >>]     │  ← h-11, border-b, hanya desktop
├──────────────────────────┤
│ [+ Percakapan Baru]      │  ← hanya panel "chat-history"
├──────────────────────────┤
│ RIWAYAT CHAT  12         │  ← label, hanya "chat-history"
├──────────────────────────┤
│                          │
│ (content area, flex-1)   │  ← SidebarChatHistory / SidebarPaperSessions / SidebarProgress
│                          │
├──────────────────────────┤
│ [Upgrade]                │  ← hanya non-PRO users
└──────────────────────────┘
```

- Collapse toggle: `FastArrowLeft` icon, hanya muncul saat `onCollapseSidebar` di-pass (desktop only)
- Saat collapsed: `w-0 border-r-0`, grid column = `0px`

### Column 3: Left PanelResizer

Drag handle 4px untuk resize sidebar. Double-click → reset ke 280px default.
Hidden saat sidebar collapsed (diganti `<div>` kosong untuk grid slot).

### Column 4: Main Content

Flex column berisi **TopBar** + **ChatWindow**:

```
┌────────────────────────────────────────┐
│ TopBar (shrink-0, solid bg)            │
│ [>>]          [🔔][☀][⬚][PRO][👤]    │
├────────────────────────────────────────┤
│                                        │
│ ChatWindow (flex-1, overflow-hidden)   │
│ - Messages (Virtuoso, px-6)            │
│ - ChatInput (bottom, persistent)       │
│                                        │
└────────────────────────────────────────┘
```

Background: `bg-[color:var(--section-bg-alt)]` (seragam TopBar + chat area).

### Column 4a: TopBar (`src/components/chat/shell/TopBar.tsx`)

Normal flow element (`shrink-0`), bukan absolute overlay. Solid background sama dengan chat area sehingga teks yang di-scroll tidak terlihat di belakangnya.

**Kiri:**
- Expand sidebar toggle (`FastArrowRight`) — hanya muncul saat sidebar collapsed

**Kanan (gap-2, pr-6 sejajar batas kanan chat bubble):**
1. NotificationDropdown
2. Theme toggle (sun/moon)
3. Artifact panel toggle (badge count saat collapsed)
4. SegmentBadge (GRATIS/BPP/PRO)
5. UserDropdown (`variant="compact"` — icon user + green status dot)

### Column 4b: ChatWindow (`src/components/chat/ChatWindow.tsx`)

Tiga state:
1. **Landing** (`conversationId === null`): Empty state + template cards + persistent ChatInput
2. **Active conversation**: Virtuoso message list (`px-6`) + ChatInput
3. **Not found**: Error state

ChatInput selalu visible di bottom, termasuk di landing state.

### Column 5: Right PanelResizer

Drag handle 4px untuk resize artifact panel. Hidden saat panel closed.

### Column 6: ArtifactPanel (`src/components/chat/ArtifactPanel.tsx`)

Panel artifact dengan tabbed document switching:

```
┌──────────────────────────┐
│ ArtifactTabs             │  ← 36px, scrollable, keyboard nav
├──────────────────────────┤
│ ArtifactToolbar          │  ← metadata + actions (download, edit, refrasa, copy, expand)
├──────────────────────────┤
│                          │
│ ArtifactViewer (flex-1)  │  ← render artifact content
│                          │
└──────────────────────────┘
```

- Saat closed: `w-0 border-l-0`, grid column = `0px`
- Panel open/close di-drive oleh ada/tidaknya tab di `useArtifactTabs`
- `@container/artifact` untuk responsive toolbar

## State Management

### ChatContainer (`src/components/chat/ChatContainer.tsx`)

Orchestrator utama yang menghubungkan semua komponen:

| State | Hook/Source | Keterangan |
|-------|------------|------------|
| Artifact tabs | `useArtifactTabs()` | Multi-tab, session-only, max 8 tabs |
| Panel open | `artifactTabs.length > 0` | Derived dari jumlah open tabs |
| Artifact data | `useQuery(api.artifacts.listByConversation)` | Convex real-time query |
| Mobile sidebar | `useState` | Controlled, passed ke ChatLayout |
| Conversations | Delegated ke `ChatLayout` | `useConversations()` di ChatLayout |

### ChatLayout State

| State | Default | Behavior |
|-------|---------|----------|
| `activePanel` | `"chat-history"` | Dikontrol oleh ActivityBar |
| `isSidebarCollapsed` | `false` | Auto-collapse saat `conversationId === null`, auto-expand saat ada |
| `sidebarWidth` | 280px | Resizable via drag, collapse < 100px |
| `panelWidth` | 360px | Resizable via drag |

### useArtifactTabs (`src/lib/hooks/useArtifactTabs.ts`)

```
openTab(artifact)   → Buka/activate tab (max 8, oldest evicted)
closeTab(id)        → Tutup tab, switch ke neighbor
setActiveTab(id)    → Activate tanpa buka baru
closeAllTabs()      → Tutup semua, panel otomatis close
updateTabTitle(id)  → Update title tab
```

## Interaksi Layout

### Sidebar Collapse/Expand
- **Collapse**: Klik `<<` di sidebar header → `isSidebarCollapsed = true` → grid column = `0px`
- **Expand**: Klik `>>` di TopBar kiri → `isSidebarCollapsed = false` → grid column = `{sidebarWidth}px`
- **Auto**: Landing page → collapsed. Active conversation → expanded.
- **Via ActivityBar**: Klik panel icon saat collapsed → auto-expand + switch panel

### Artifact Panel Open/Close
- **Open**: Artifact dibuat/dipilih → `openTab()` → `artifactTabs.length > 0` → panel open
- **Close**: Klik panel toggle di TopBar → `closeAllTabs()` → panel close
- **Toggle**: Klik toggle saat closed → buka artifact terbaru (`artifacts[0]`)

### Grid Transition
`transition-[grid-template-columns] duration-300 ease-in-out` — smooth animation saat sidebar/panel collapse/expand.

## UserDropdown Variant

`UserDropdown` (`src/components/layout/header/UserDropdown.tsx`) mendukung dua variant:

| Variant | Trigger | Dipakai di |
|---------|---------|------------|
| `"default"` | Nama lengkap + chevron + stripes animation | GlobalHeader (marketing, dashboard) |
| `"compact"` | Icon user (18px) + green status dot, `w-8 h-8 rounded-full` | TopBar (chat area) |

Dropdown menu identik di kedua variant: Atur Akun, Subskripsi, Admin Panel (conditional), Sign out.

## Mobile Layout

Sidebar diganti **Sheet** (slide-in dari kiri, 300px). Trigger via hamburger menu di ChatWindow mobile header. Sheet berisi `ChatSidebar` tanpa `onCollapseSidebar` (collapse hanya desktop).

## File Index

### Komponen Aktif

| File | Fungsi |
|------|--------|
| `src/components/chat/layout/ChatLayout.tsx` | Grid orchestrator, state management |
| `src/components/chat/layout/PanelResizer.tsx` | Drag-to-resize handler |
| `src/components/chat/shell/ActivityBar.tsx` | Navigasi vertikal + logo |
| `src/components/chat/shell/TopBar.tsx` | Controls bar di atas chat area |
| `src/components/chat/shell/NotificationDropdown.tsx` | Notification bell dropdown |
| `src/components/chat/ChatSidebar.tsx` | Multi-state sidebar container |
| `src/components/chat/ChatContainer.tsx` | Orchestrator utama |
| `src/components/chat/ChatWindow.tsx` | Messages + input + empty state |
| `src/components/chat/ArtifactPanel.tsx` | Artifact viewer panel |
| `src/components/chat/ArtifactTabs.tsx` | Tab bar untuk artifact switching |
| `src/components/chat/ArtifactToolbar.tsx` | Metadata + action buttons |
| `src/components/chat/ChatMiniFooter.tsx` | Footer copyright |
| `src/components/layout/header/UserDropdown.tsx` | User menu (default + compact variant) |
| `src/components/ui/SegmentBadge.tsx` | Tier badge (GRATIS/BPP/PRO) |
| `src/lib/hooks/useArtifactTabs.ts` | Multi-tab state hook |

### File yang Dihapus (deprecated)

| File | Digantikan oleh |
|------|-----------------|
| `src/components/chat/shell/ShellHeader.tsx` | TopBar.tsx |
| `src/components/chat/shell/ChatTabs.tsx` | ArtifactTabs.tsx |
| `src/lib/hooks/useTabState.ts` | useArtifactTabs.ts |
| `__tests__/chat-shell/shell-components.test.tsx` | (dihapus, test komponen deprecated) |
| `__tests__/chat-integration/chat-integration.test.tsx` | (dihapus, test komponen deprecated) |
