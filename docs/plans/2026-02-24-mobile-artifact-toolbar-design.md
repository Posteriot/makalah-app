# Mobile Artifact/Refrasa Toolbar Redesign — Design Document

**Date:** 2026-02-24
**Branch:** `feature/mobile-chat-redesign` (worktree)
**Status:** Approved by user

---

## Goal

Redesign the mobile fullscreen artifact viewer toolbar from text-labeled bottom bar to icon-only top toolbar with tooltips, matching desktop patterns. Add proper refrasa split compare (top-bottom) and issues bottom sheet.

## Current State (Problems)

1. **Bottom toolbar with text labels** — `Edit | Refrasa | Copy` takes too much space, doesn't match desktop icon pattern
2. **No distinction between artifact and refrasa** — both show same toolbar
3. **No split compare view** — refrasa has no way to compare original vs refrasa
4. **No issues panel** — "Lihat masalah" not accessible on mobile

## Approved Redesign

### 1. Artifact Toolbar (non-refrasa)

Move from bottom bar to **toolbar row below header title**, separated by border-bottom.

**Icon buttons (left to right), each with Tooltip:**
1. `EditPencil` — "Edit"
2. `Copy` / `Check` — "Salin" (toggle to Check after copy)
3. `MagicWand` — "Refrasa" (trigger onRefrasa)
4. `Download` — "Unduh"

**Styling:** `text-[var(--chat-muted-foreground)]`, `active:bg-[var(--chat-accent)]`, rounded-action, p-2.

### 2. Refrasa Toolbar

Same position — toolbar row below header title.

**Icon buttons (left to right), each with Tooltip:**
1. `WarningTriangle` + count badge — "Lihat masalah" (opens issues bottom sheet)
2. `ViewColumns2` — "Bandingkan" (toggle split view top-bottom)
3. `Download` — "Unduh"
4. `Copy` / `Check` — "Salin"
5. `Trash` — "Hapus"
6. **Button "Terapkan"** — `Check` icon + text, bg primary. 3 states: idle, loading ("Menerapkan..."), done ("Diterapkan" bg success)

**Layout:** Issues badge left-aligned, "Terapkan" button right-aligned via `ml-auto`.

### 3. Split Compare View (Top-Bottom)

Activated when user taps `ViewColumns2` in refrasa toolbar.

- Two panels each `h-1/2` of content area, each `overflow-y-auto`
- Badge "ASLI" — `rounded-badge`, bg secondary, font-mono uppercase text-[10px]
- Badge "REFRASA" — `rounded-badge`, bg `--chat-info`, font-mono uppercase text-[10px]
- Separator: `border-t` between panels
- `ViewColumns2` icon gets active state (bg accent) when compare is on
- Tap again to return to single view

### 4. Issues Bottom Sheet ("Lihat Masalah")

Triggered by tapping `WarningTriangle` badge in refrasa toolbar.

- Bottom Sheet (`side="bottom"`) — `max-h-[70vh]`, `rounded-t-shell`, `data-chat-scope=""`
- Spacing: `pt-1 pb-0` handle, `gap-0.5` header (matching MobilePaperSessionsSheet)
- Title: "Masalah Refrasa" + subtitle with count
- Two Collapsible sections: **NATURALNESS** and **STYLE**, each with count
- Reuse existing `RefrasaIssueItem` component for each issue
- Issues data from `artifact.issues`
- Scrollable `overflow-y-auto`

## Files Impact

### Modify
| File | Change |
|---|---|
| `src/components/chat/mobile/MobileArtifactViewer.tsx` | Full redesign: toolbar to top, icon-only with tooltips, conditional artifact vs refrasa toolbar, split compare view |

### Create
| File | Purpose |
|---|---|
| `src/components/chat/mobile/MobileRefrasaIssuesSheet.tsx` | Bottom sheet for refrasa issues panel, reuses `RefrasaIssueItem` |

## Styling Rules

All components follow existing chat-styling-rules:
- `data-chat-scope=""` on Sheet portal content
- Border classes with `color:` prefix (e.g. `border-[color:var(--token)]`)
- `font-sans` for UI text, `font-mono` for signal labels
- `active:` for touch interactions
- `rounded-action` for buttons, `rounded-shell` for sheet containers
- Tooltip via Radix Tooltip (already used in progress bar and sidebar)

## Icon Mapping

| Action | Icon (iconoir) | Tooltip Label |
|---|---|---|
| Edit | `EditPencil` | "Edit" |
| Copy | `Copy` / `Check` | "Salin" |
| Refrasa | `MagicWand` | "Refrasa" |
| Download | `Download` | "Unduh" |
| Issues | `WarningTriangle` | "Lihat masalah" |
| Compare | `ViewColumns2` | "Bandingkan" |
| Delete | `Trash` | "Hapus" |
| Apply | `Check` | (button label "Terapkan") |
