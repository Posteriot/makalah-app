# Design: Sidebar All-Sessions + Read-Only Artifact Preview

**Date:** 2026-03-05
**Branch:** `feat/artifact-reinforcement`
**Status:** Approved

## Problem

Sidebar "Sesi Paper" saat ini hanya menampilkan 1 paper session yang terikat ke conversation aktif via `usePaperSession(conversationId)`. User tidak bisa melihat atau mengakses artifact dari paper session lain tanpa pindah conversation.

## Solution

Sidebar menampilkan semua paper session milik user dengan visual hierarchy dual-list (Sesi Aktif vs Sesi Lainnya). Artifact dari session lain bisa di-preview dalam read-only mode di artifact panel tanpa pindah conversation.

## Approach: Dual-List Sidebar + Shared Panel (Approach B)

Dipilih karena UX paling jelas — user langsung tahu mana session aktif vs yang lain. Risiko confusion paling rendah dibanding flat list atau minimal refactor.

## Design

### 1. Sidebar Layout & Data Flow

#### Structure

```
Header: "Sesi Paper" / "Folder Artifak"

--- SESI AKTIF ---
  [dot] [folder] Penyusunan_Paper:_G...  [pencil]
    Stage 2/13 - Penentuan Topik
    2 artifak
    [doc] Gagasan Paper:... [v3] [FINAL] [3-dot]
    [R]   Gagasan Paper:... [v1] [FINAL] [3-dot]

  (atau: "Percakapan ini belum memiliki sesi paper")

--- SESI LAINNYA ---
  [chevron] [folder] Paper_Metodologi_K...
    Stage 7/13 - 3 artifak
  [chevron] [folder] Tinjauan_Literatur...
    Stage 5/13 - 5 artifak
  [chevron] [folder] Paper_AI_Pendidik...
    Selesai - 11 artifak
```

#### Data Query

- **Sesi Aktif**: `usePaperSession(conversationId)` — existing, real-time
- **Sesi Lainnya**: `getByUser(userId)` — existing query, filter out active session on client
- **Artifact list per folder**: `api.artifacts.listByConversation` — lazy load on expand (existing pattern)

#### Visual Hierarchy

| Element | Sesi Aktif | Sesi Lainnya |
|---------|-----------|--------------|
| Section label | 10px mono bold uppercase, muted | Same |
| Folder | Full detail (stage label, artifact list) | Compact (stage number + artifact count) |
| Status dot | Sky-500 / Teal | Same but lower opacity |
| Expand | Default expanded | Default collapsed |
| Title edit | Enabled (pencil icon) | Disabled |

#### Empty States

- **Sesi Aktif kosong** (conversation tanpa paper session): "Percakapan ini belum memiliki sesi paper"
- **Sesi Aktif kosong** (no conversation selected): "Belum ada percakapan aktif"
- **Sesi Lainnya kosong**: Section hidden entirely

### 2. 3-Dot Menu & Artifact Interaction

#### Menu Placement

Icon button (MoreVert) di ujung kanan setiap `ArtifactTreeItem`:

```
[doc] Gagasan Paper:... [v3] [FINAL] [3-dot]
```

#### Menu Items

Satu item saat ini (prepared untuk future context injection):

| Menu Item | Action |
|-----------|--------|
| "Lihat Artifak" | Buka di artifact panel |

#### Trigger Behavior

- **Desktop**: Right-click artifact item = context menu. 3-dot icon visible on hover.
- **Mobile/Touch**: 3-dot icon always visible. Tap = dropdown menu.
- **Keyboard**: Focus item + Enter = default action. Shift+F10 = context menu.

#### Panel Opening Logic

```
if (artifact dari sesi aktif) {
  openTab({ ...artifact, readOnly: false })
} else {
  openTab({ ...artifact, readOnly: true, sourceConversationId })
}
```

#### ArtifactTab Interface Extension

```typescript
interface ArtifactTab {
  id: Id<"artifacts">
  title: string
  type: string
  sourceArtifactId?: Id<"artifacts">  // existing, for refrasa
  readOnly?: boolean                   // NEW
  sourceConversationId?: Id<"conversations">  // NEW
}
```

#### Tab Visual Distinction

Read-only tabs in `ArtifactTabs`:
- Lock icon (12px) next to title
- Slightly more muted text opacity
- No close-on-edit guard

### 3. Read-Only Panel Banner & Disabled Actions

#### Banner

Appears above artifact content when `tab.readOnly === true`:

```
[lock] Artifak dari sesi lain -- hanya baca    [Lihat Percakapan ->]
```

Styling:
- Background: `--muted` surface, `border-main` (1px solid)
- Icon: Lock (Iconoir), 16px
- Text: 12px mono
- Button: text button with arrow, navigates to `/chat/{sourceConversationId}`
- Radius: `rounded-action` (8px)
- Template: Reuse invalidation warning banner pattern from `ArtifactViewer.tsx`

#### Disabled Actions

| Action | State | Tooltip |
|--------|-------|---------|
| Edit | Disabled | "Buka percakapan asli untuk mengedit" |
| Refrasa | Disabled | "Buka percakapan asli untuk refrasa" |
| Copy | Enabled | Normal |
| Download | Enabled | Normal |
| Fullscreen | Enabled | Normal |

#### Fullscreen Read-Only

- Same banner above content
- Edit/Refrasa disabled
- "DAFTAR LAINNYA" sidebar shows artifacts from the same source session (not current conversation)
- Version history dropdown works (read-only, can switch versions)

#### "Lihat Percakapan" Navigation

1. `router.push(/chat/{sourceConversationId})`
2. Read-only tab auto-closed from tab list
3. If from fullscreen: close modal first, then navigate

## Scope Boundaries

### In Scope
- Sidebar dual-list (Sesi Aktif + Sesi Lainnya)
- 3-dot menu per artifact item with "Lihat Artifak"
- Read-only artifact preview in shared panel/fullscreen
- Banner with "Lihat Percakapan" navigation
- Disabled Edit/Refrasa for read-only artifacts

### Out of Scope
- Context injection (drag artifact to chat input) — separate branch, see `docs/artifact-context-injection/`
- "Salin Konten" in context menu — user should view first
- Cross-user artifact sharing
- Artifact search/filter in sidebar

## Key Files to Modify

| File | Change |
|------|--------|
| `src/components/chat/sidebar/SidebarPaperSessions.tsx` | Dual-list layout, getByUser query, 3-dot menu |
| `src/lib/hooks/useArtifactTabs.ts` | Extend ArtifactTab with readOnly, sourceConversationId |
| `src/components/chat/ArtifactTabs.tsx` | Lock icon for read-only tabs |
| `src/components/chat/ArtifactViewer.tsx` | Read-only banner, disabled actions |
| `src/components/chat/ArtifactToolbar.tsx` | Disable Edit/Refrasa when readOnly |
| `src/components/chat/ArtifactPanel.tsx` | Pass readOnly flag through |
| `src/components/chat/FullsizeArtifactModal.tsx` | Read-only banner, scoped "DAFTAR LAINNYA" |

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Performance: loading all user sessions | Medium | getByUser already exists with index, artifact list lazy-loaded on expand |
| Tab confusion: mixed read-only + editable | Low | Banner + lock icon + disabled actions make distinction clear |
| Navigation: "Lihat Percakapan" loses current context | Low | Tab auto-close, standard Next.js navigation |
| Mobile: 3-dot discoverability | Low | Always visible on mobile, hover on desktop |
| State complexity: readOnly flag propagation | Low | Single flag checked at ArtifactToolbar/Viewer level |
