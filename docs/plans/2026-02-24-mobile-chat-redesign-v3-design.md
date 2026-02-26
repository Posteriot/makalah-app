# Mobile Chat Redesign v3 — Design Document

**Date:** 2026-02-24
**Branch:** `mobile-chat-redesign` (worktree)
**Status:** Approved by user

---

## Goal

Restructure the mobile chat interface (`< md` breakpoint) to eliminate the overloaded sidebar tab system and distribute mobile-specific UI into purpose-built components — each accessible from logical touchpoints in the header, footer, and overlay sheets.

## Current Architecture (Problems)

The mobile sidebar currently mirrors the desktop 3-panel pattern (Riwayat/Paper/Progres tabs) inside a left Sheet. This causes:

1. **Overloaded sidebar** — tabs compete for space; Paper and Progress panels feel crammed on small screens
2. **"Percakapan Baru" button** — takes precious vertical space inside the sidebar
3. **3-dot MoreVert menu** — triggers MobileActionSheet with mixed concerns (new chat, artifacts, rename, delete)
4. **MobilePaperMiniBar** — collapsed progress indicator is disconnected from actual paper session management
5. **Settings link** — navigates away from chat entirely (`/settings`)

## Approved Redesign

### 1. Sidebar → Riwayat Only

The mobile sidebar (left Sheet) becomes a flat chat history list. Remove:
- Panel tabs (`Riwayat | Paper | Progres`)
- "Percakapan Baru" button
- Settings link at bottom

Keep:
- `SidebarChatHistory` (flat list with swipe/delete)
- `CreditMeter` (compact, at bottom)
- "Atur Akun" link replacing "Pengaturan" — opens settings page within chat context

### 2. Header Redesign

Current: `☰ | Title (font-mono) | ⋮ (MoreVert)`

New: `☰ | Title ▾ (font-sans, tappable) | [+💬] [»]`

- **Title** — `font-sans`, truncated, tappable. Tap opens Edit/Hapus bottom sheet
- **+💬 icon** — `ChatBubblePlusIn` from iconoir. Creates new conversation
- **» icon** — `FastArrowRightSquare` from iconoir (same as desktop TopBar artifact toggle). Opens Paper Sessions bottom sheet

### 3. Paper Sessions Sheet (Bottom)

New `MobilePaperSessionsSheet` — bottom Sheet triggered by `FastArrowRightSquare` icon in header. Contains the same folder/artifact tree structure as desktop `SidebarPaperSessions`:
- Paper folder items with chevron + status dot + title
- Artifact tree items with icon + title + version badge + FINAL/REVISI badge
- No edit/delete paper session actions (read-only browse)
- `data-chat-scope=""` on SheetContent for token resolution

### 4. Edit/Hapus Sheet (Bottom)

Small bottom Sheet triggered by tapping the conversation title in header. Two actions only:
- Edit Judul — inline rename with input field
- Hapus Percakapan — triggers AlertDialog confirmation
- Same styling rules as MobileActionSheet (font-sans, no semantic coloring, `data-chat-scope=""`)

### 5. Progress Timeline (Horizontal)

Replace `MobilePaperMiniBar` with new `MobileProgressBar`:
- **Position:** Sticky above ChatInput, only visible when paper session is active
- **Collapsed state:** `⊙─ Stage Name N/13 ⌄` — single line, tappable to expand
- **Expanded state:** Horizontal dot+line timeline with **number pills** (not text names)
  - Each pill: number in `rounded-action` container
  - Tap pill → tooltip shows full stage name
  - Completed = teal fill, Current = success + ring, Pending = transparent + border
  - Rewind: tap completed pill (max 2 stages back)
- **Icons:** Use `GitBranch` from iconoir (same as desktop ActivityBar progress icon)

### 6. "Atur Akun" Page

Replaces sidebar Settings link. 1-column card layout rendered within the chat layout (no navigation away):
- Profile info
- Dark/Light theme toggle (SunLight/HalfMoon icons from desktop TopBar)
- Account links (subscription, security, etc.)
- No back-to-home logo

---

## Icon Mapping (Desktop → Mobile)

| Desktop Component | Icon | Mobile Usage |
|---|---|---|
| ActivityBar: chat-history | `ChatBubble` | Sidebar (hamburger opens it) |
| ActivityBar: paper | `Page` | — (Paper Sessions in bottom sheet) |
| ActivityBar: progress | `GitBranch` | Progress bar collapsed state icon |
| TopBar: artifact toggle | `FastArrowRightSquare` | Header right icon → opens Paper Sessions sheet |
| TopBar: theme | `SunLight`/`HalfMoon` | Atur Akun page theme toggle |

## Files Impact Summary

### Modify
| File | Change |
|---|---|
| `ChatSidebar.tsx` | Remove mobile tabs, "Percakapan Baru" for mobile, add "Atur Akun" |
| `ChatWindow.tsx` | New mobile header layout, replace MoreVert, replace MobilePaperMiniBar |
| `ChatContainer.tsx` | State management for new sheets (paper sessions, edit/delete) |
| `ChatLayout.tsx` | Pass new props for sheet states |

### Create
| File | Purpose |
|---|---|
| `MobilePaperSessionsSheet.tsx` | Bottom sheet with paper folder/artifact tree |
| `MobileEditDeleteSheet.tsx` | Bottom sheet for title edit + delete |
| `MobileProgressBar.tsx` | Horizontal progress timeline with number pills |
| `MobileSettingsPage.tsx` | 1-column "Atur Akun" within chat |

### Delete/Deprecate
| File | Reason |
|---|---|
| `MobileActionSheet.tsx` | Replaced by MobilePaperSessionsSheet + MobileEditDeleteSheet |
| `MobilePaperMiniBar.tsx` | Replaced by MobileProgressBar |

## Styling Rules

All new mobile components follow `chat-styling-rules.md`:
- `data-chat-scope=""` on all Sheet/AlertDialog portal content
- Border classes MUST include the `color:` prefix inside arbitrary value brackets (e.g. `[color:var(--token)]`). Omitting it causes Tailwind to misinterpret the value as border-width.
- `font-sans` for all text (except signal labels: `font-mono` + uppercase + tracking-widest)
- `active:` not `hover:` for touch interactions
- No semantic coloring (`--chat-destructive`) on action items
- Artifact counts must deduplicate by `type-title`
- `rounded-action` for buttons, `rounded-shell` for sheet containers
