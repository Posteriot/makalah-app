# Artifact & Paper Session — Current State Reference

> Dokumen faktual tentang arsitektur dan keadaan terkini artifact system dan paper session setelah perubahan di branch `feat/artifact-reinforcement`.

## Table of Contents

- [Data Model](#data-model)
- [Artifact Lifecycle](#artifact-lifecycle)
- [Paper Session Lifecycle](#paper-session-lifecycle)
- [Sidebar Paper Sessions Architecture](#sidebar-paper-sessions-architecture)
- [Artifact Panel Architecture](#artifact-panel-architecture)
- [Deep Linking](#deep-linking)
- [Cross-Session Read-Only Preview](#cross-session-read-only-preview)
- [Rewind & Invalidation](#rewind--invalidation)
- [Known Constraints & Edge Cases](#known-constraints--edge-cases)
- [File Map](#file-map)

---

## Data Model

### `artifacts` table

| Field | Type | Purpose |
|-------|------|---------|
| `conversationId` | `Id<"conversations">` | Owning conversation |
| `userId` | `Id<"users">` | Owning user |
| `messageId` | `Id<"messages">?` | Which message generated this artifact |
| `type` | union: code, outline, section, table, citation, formula, chart, refrasa | Content category |
| `title` | string | Display title |
| `content` | string | Markdown/LaTeX/code content |
| `format` | union: markdown, latex, python, r, javascript, typescript, json | Content format |
| `version` | number | Incremental version counter |
| `parentId` | `Id<"artifacts">?` | Link to previous version |
| `invalidatedAt` | number? | Timestamp when invalidated by rewind |
| `invalidatedByRewindToStage` | string? | Stage that triggered invalidation |
| `sourceArtifactId` | `Id<"artifacts">?` | Refrasa: link to source artifact |
| `sources` | array of `{ url, title, publishedAt? }`? | Web search sources |
| `createdAt` | number | Creation timestamp |
| `updatedAt` | number | Last update timestamp |

**Indexes:** `by_conversation`, `by_type`, `by_user`, `by_parent`, `by_source_artifact`

### `paperSessions` table

| Field | Type | Purpose |
|-------|------|---------|
| `conversationId` | `Id<"conversations">` | 1:1 link to conversation |
| `userId` | `Id<"users">` | Owning user |
| `currentStage` | string (PaperStageId) | Active workflow stage (13 stages) |
| `stageStatus` | string | drafting, pending_validation, approved, revision |
| `stageData` | object | Accumulated data for all 13 stages |
| `paperTitle` | string? | Working paper title |
| `archivedAt` | number? | Archive timestamp |
| `completedAt` | number? | Completion timestamp |
| `paperMemoryDigest` | string? | AI memory digest |

### `rewindHistory` table

| Field | Type | Purpose |
|-------|------|---------|
| `sessionId` | `Id<"paperSessions">` | Which session |
| `fromStage` / `toStage` | string | Rewind range |
| `invalidatedArtifactIds` | `Id<"artifacts">[]` | Artifacts invalidated |
| `invalidatedStages` | string[]? | Stages invalidated |
| `createdAt` | number | When rewind occurred |

### Relationship: paperSession ↔ artifacts

- A `paperSession` links to a `conversation` via `conversationId`
- Artifacts belong to a `conversation` (same `conversationId`)
- There is **no direct FK** from `paperSessions` to `artifacts`
- The connection is indirect: `paperSession.conversationId` → `artifacts.conversationId`
- A conversation can have artifacts WITHOUT a paper session (e.g., chat-only artifacts)

---

## Artifact Lifecycle

1. **Creation**: AI tool call creates artifact via `convex/artifacts.ts` mutation → linked to conversation + user
2. **Versioning**: New version creates a new row with `parentId` pointing to previous version, `version` incremented
3. **Invalidation**: Rewind sets `invalidatedAt` + `invalidatedByRewindToStage` on affected artifacts
4. **Clear invalidation**: After artifact is updated post-rewind, `invalidatedAt` is cleared

---

## Paper Session Lifecycle

13 stages across 5 phases:

| Phase | Stages |
|-------|--------|
| Foundation | gagasan, topik |
| Outline | outline |
| Core | abstrak, pendahuluan, tinjauan_literatur, metodologi |
| Results | hasil, diskusi, kesimpulan |
| Finalization | daftar_pustaka, lampiran, judul |

**Stage status flow:** `drafting` → `pending_validation` → `approved` (or `revision` → `drafting`)

---

## Sidebar Paper Sessions Architecture

`SidebarPaperSessions` renders a dual-list layout:

### Active Session (current conversation's paper session)
- Shown as an expanded folder with artifact tree
- Auto-expanded via derived state sync (tracks `activeSessionId` changes)
- Shows stage progress, paper title (editable), and artifact list

### Sesi Lainnya (all other user sessions)
- Collapsible accordion folders (only one expanded at a time)
- Lazy-loads artifacts when expanded
- Shows compact info: stage label + artifact count
- Artifact count highlighted with `text-[var(--chat-foreground)]` when > 0
- Read-only access: clicking opens artifact in panel as read-only preview

### Render Paths (4 scenarios)

| Condition | What renders |
|-----------|-------------|
| No conversation (`currentConversationId === null`) | Header + separator + Sesi Lainnya |
| Loading session data | Header + skeleton + Sesi Lainnya |
| Conversation active, no paper session | Header + "Belum ada sesi" indicator + separator + Sesi Lainnya |
| Conversation active, paper session exists | Header + Active folder + separator + Sesi Lainnya |

All paths share consistent separator styling (full-width `border-t`).

---

## Artifact Panel Architecture

`ArtifactPanel` is a multi-tab document workspace:

### Tab Model (`ArtifactTab`)

```typescript
interface ArtifactTab {
  id: Id<"artifacts">
  title: string
  type: string
  readOnly?: boolean
  sourceConversationId?: Id<"conversations">
  sourceArtifactId?: Id<"artifacts">
}
```

### Key Behaviors
- Panel is open when `openTabs.length > 0`
- Tab titles sync with Convex data via `useEffect` in `ChatContainer`
- Active tab determines which artifact is rendered
- Closing all tabs closes the panel
- Refrasa tabs render `RefrasaTabContent` instead of `ArtifactViewer`

### Data Resolution
- Active conversation artifacts: queried via `api.artifacts.listByConversation`
- Cross-session artifacts: second query using `sourceConversationId` from active tab
- Fallback: if artifact not found in either, shows "not found" UI with close button

---

## Deep Linking

URL pattern: `/chat/{conversationId}?artifact={artifactId}`

**Flow:**
1. `ChatContainer` reads `?artifact=` from `useSearchParams()`
2. `useEffect` waits for `artifacts` query to load
3. Finds matching artifact → opens tab via `openArtifactTab()`
4. Cleans URL via `router.replace()` (removes `?artifact=` param)
5. `useRef(deepLinkHandled)` prevents re-triggering

**Usage:**
- "Lihat percakapan terkait" link in `ArtifactViewer` and `FullsizeArtifactModal` navigates to source conversation with deep link
- Closes read-only tab before navigating

---

## Cross-Session Read-Only Preview

When user opens an artifact from "Sesi Lainnya" (different conversation):

1. `SidebarPaperSessions` calls `onArtifactSelect(id, { readOnly: true, sourceConversationId, title, type })`
2. `ChatContainer.handleArtifactSelect` opens tab with `readOnly` + `sourceConversationId` metadata
3. `ArtifactPanel` queries artifacts from source conversation for data resolution
4. `ArtifactViewer` shows read-only banner + disabled edit/refrasa buttons
5. "Lihat percakapan terkait" link deep-links to source conversation

**Title propagation:** `title` and `type` are passed via callback opts to prevent "Loading..." fallback (since cross-session artifacts aren't in the current conversation query).

---

## Rewind & Invalidation

- User clicks previous stage badge → `RewindConfirmationDialog` → `rewindToStage` mutation
- Artifacts from invalidated stages get `invalidatedAt` set
- `ArtifactViewer` shows invalidation warning banner
- After artifact is updated, `clearInvalidation` removes the flag

---

## Known Constraints & Edge Cases

1. **Paper session ↔ conversation is 1:1**: Each paper session belongs to exactly one conversation. No multi-conversation sessions.

2. **Artifact belongs to conversation, not session**: An artifact's `conversationId` ties it to a conversation. If a conversation has no paper session, its artifacts still exist but won't appear in paper session folders.

3. **Sidebar accordion**: Only one folder can be expanded at a time. Expanding a folder collapses the previous one.

4. **Read-only limitation**: Cross-session preview is read-only. Editing requires navigating to the source conversation.

5. **Deep link one-shot**: Deep link fires once per page load (guarded by `useRef`). If artifacts haven't loaded when the effect runs, it waits for them via dependency array.

6. **Tab title sync**: Tab titles may show "Loading..." briefly if Convex data hasn't loaded yet. The `useEffect` in `ChatContainer` syncs titles once data arrives.

7. **Mobile**: Artifacts open in `MobileArtifactViewer` overlay on screens < 768px. The tabbed panel is desktop-only.

---

## File Map

### Core Orchestration

| File | Purpose |
|------|---------|
| `src/components/chat/ChatContainer.tsx` | Main container: artifact tab state, deep linking, artifact selection handler |
| `src/components/chat/layout/ChatLayout.tsx` | 6-column CSS Grid: ActivityBar, Sidebar, Resizer, Main, Resizer, Panel |
| `src/components/chat/ChatSidebar.tsx` | Sidebar wrapper: routes to SidebarChatHistory or SidebarPaperSessions |
| `src/components/chat/ChatWindow.tsx` | Message list, chat input, empty state |

### Artifact Panel Components

| File | Purpose |
|------|---------|
| `src/components/chat/ArtifactPanel.tsx` | Tabbed panel: tabs bar, toolbar, viewer/refrasa routing, fullsize modal |
| `src/components/chat/ArtifactTabs.tsx` | Tab bar UI: tab switching, close buttons, read-only indicator |
| `src/components/chat/ArtifactToolbar.tsx` | Document header + actions: edit, copy, refrasa, download, fullscreen |
| `src/components/chat/ArtifactViewer.tsx` | Content renderer: markdown/code display, edit mode, read-only banner, deep link |
| `src/components/chat/ArtifactEditor.tsx` | Inline editor for artifact content |
| `src/components/chat/ArtifactIndicator.tsx` | Message bubble indicator showing artifact was created |
| `src/components/chat/FullsizeArtifactModal.tsx` | Fullscreen modal: expanded artifact view with tabs |

### Sidebar Components

| File | Purpose |
|------|---------|
| `src/components/chat/sidebar/SidebarPaperSessions.tsx` | Dual-list paper sessions: active session + all other sessions |
| `src/components/chat/sidebar/SidebarChatHistory.tsx` | Conversation list (non-paper mode) |
| `src/components/chat/sidebar/SidebarProgress.tsx` | Paper stage progress in sidebar |

### Paper UI Components

| File | Purpose |
|------|---------|
| `src/components/paper/PaperStageProgress.tsx` | Clickable stage badges for rewind |
| `src/components/paper/PaperSessionBadge.tsx` | Session status badge |
| `src/components/paper/PaperValidationPanel.tsx` | Stage validation UI |
| `src/components/paper/RewindConfirmationDialog.tsx` | Rewind confirmation dialog |

### Shell Components

| File | Purpose |
|------|---------|
| `src/components/chat/shell/ActivityBar.tsx` | Left activity bar: panel switching |
| `src/components/chat/shell/TopBar.tsx` | Top bar: sidebar toggle, panel toggle, artifact count badge |

### Hooks

| File | Purpose |
|------|---------|
| `src/lib/hooks/useArtifactTabs.ts` | Tab state management: open/close/switch/update tabs |
| `src/lib/hooks/usePaperSession.ts` | Paper session hook: session data, stage, rewind functions |

### Backend (Convex)

| File | Purpose |
|------|---------|
| `convex/artifacts.ts` | CRUD: create, update, list by conversation/user, version tracking |
| `convex/paperSessions.ts` | CRUD: create, update stage, rewind, archive, complete |
| `convex/paperSessions/constants.ts` | Stage order, labels, navigation helpers |
| `convex/paperSessions/types.ts` | TypeScript types for stage data |
| `convex/paperSessions/stageDataWhitelist.ts` | Whitelist for stage data fields |
| `convex/paperSessions/daftarPustakaCompiler.ts` | Bibliography compiler logic |

### Utility

| File | Purpose |
|------|---------|
| `src/lib/paper/title-resolver.ts` | Resolve paper display title (session title or conversation title fallback) |
| `src/lib/paper/stage-types.ts` | Stage type definitions |

### Mobile

| File | Purpose |
|------|---------|
| `src/components/chat/mobile/MobileArtifactViewer.tsx` | Mobile artifact overlay (< 768px) |

### Design/Plan Docs (in this branch)

| File | Purpose |
|------|---------|
| `docs/artifact-context-injection/README.md` | Artifact context injection documentation |
| `docs/plans/2026-03-05-sidebar-all-sessions-readonly-preview-design.md` | Design doc for all-sessions sidebar |
| `docs/plans/2026-03-05-sidebar-all-sessions-readonly-preview.md` | Implementation plan for all-sessions sidebar |
