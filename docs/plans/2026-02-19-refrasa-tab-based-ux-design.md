# Refrasa Tab-Based UX — Design Doc

**Date:** 2026-02-19
**Status:** Approved
**Supersedes:** Dialog-based Refrasa flow (RefrasaConfirmDialog)

## Problem

Refrasa results are ephemeral — stored only in React state. When the dialog closes (intentionally or accidentally), the result is lost. User must regenerate (call LLM again, pay credits again). No versioning, no history, no way to revisit past results.

## Solution

Replace the dialog-based flow with a **tab-based flow** where Refrasa results are persisted as artifact records in Convex. Each generation creates a new artifact version that can be revisited, compared, downloaded, or applied.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data model | Refrasa = artifact record (`type: "refrasa"`) | Reuse existing tab system, versioning, and folder listing |
| Panel mode | New tab in existing tab bar | Consistent with how artifacts work |
| Fullscreen mode | Add tab bar to fullscreen modal | Consistent experience across modes |
| Folder listing | Sejajar with other artifacts, badge "R" | Easy to find, visually distinct |
| Dialog | Removed | Replaced by tab-based flow |

---

## Section 1: Data Model

### Schema Changes (`convex/schema.ts`)

**Add `"refrasa"` to artifact type union:**

```typescript
type: v.union(
  v.literal("code"),
  v.literal("outline"),
  v.literal("section"),
  v.literal("table"),
  v.literal("citation"),
  v.literal("formula"),
  v.literal("chart"),
  v.literal("refrasa"),  // NEW
),
```

**Add new fields:**

```typescript
// Link to source artifact that was refrasad
sourceArtifactId: v.optional(v.id("artifacts")),

// Refrasa analysis issues (previously ephemeral)
refrasaIssues: v.optional(v.array(v.object({
  type: v.string(),
  category: v.string(),    // "naturalness" | "style"
  message: v.string(),
  severity: v.string(),    // "info" | "warning" | "critical"
  suggestion: v.optional(v.string()),
}))),
```

### Versioning

Uses existing artifact versioning system:
- `version: v.number()` — increments on each regeneration
- `parentId: v.optional(v.id("artifacts"))` — links to previous version

### Data Flow

```
User clicks Refrasa
  → POST /api/refrasa (existing endpoint)
  → LLM returns { refrasedText, issues[] }
  → createArtifact mutation:
      type: "refrasa"
      content: refrasedText
      sourceArtifactId: source artifact ID
      refrasaIssues: issues[]
      version: 1 (or N+1 if regenerating)
      parentId: previous refrasa version ID (if regenerating)
  → openTab({ id: newId, title: "R: <source title>", type: "refrasa" })
  → Tab auto-activates
```

---

## Section 2: Tab System & UI Flow

### Panel Mode (ArtifactPanel)

1. User clicks Refrasa in artifact toolbar
2. Loading state shown in artifact panel content area
3. After API response: `createArtifact` mutation saves result to DB
4. `openTab()` called → new tab appears in tab bar, auto-activates
5. Tab displays: refrasa icon "R" (not document icon), title "R: <source title>"
6. Tab content: refrasedText + toolbar

### Fullscreen Mode (FullsizeArtifactModal)

1. **Add tab bar** to fullscreen modal (currently has no tab bar)
2. Tab bar behavior identical to panel mode
3. Click Refrasa → new tab in tab bar, auto-activates
4. Tab content same as panel mode

### ArtifactTab Interface Update

```typescript
export interface ArtifactTab {
  id: Id<"artifacts">
  title: string
  type: string  // existing types + "refrasa"
}
```

Tab icon mapping addition:
```
refrasa → custom "R" badge (not an Iconoir icon)
```

### Folder Artifak (Sidebar — SidebarPaperSessions)

- Refrasa artifacts listed alongside other artifacts in same stage
- Icon: badge "R" instead of document icon
- Title: source artifact title
- Version badge + status badge same as regular artifacts

---

## Section 3: Refrasa Tab Toolbar & Actions

### Toolbar Layout (right-aligned, inline with content header)

| Button | Icon | Function |
|--------|------|----------|
| Version dropdown | `Select` component | Switch between refrasa versions (v1, v2, ...) |
| Download | `Download` (Iconoir) | Dropdown: DOCX, PDF, TXT |
| Copy | `Copy` (Iconoir) | Copy refrasedText to clipboard |
| Delete | `Trash` (Iconoir) | Delete this refrasa version (with confirmation) |
| Issues | Badge `⚠ N` (clickable) | Toggle floating issues panel |
| Apply | `Check` + "Terapkan" (emerald-600) | Replace source artifact content with refrasedText |

### Version Dropdown Behavior

- Default: latest version selected
- Lists all versions: "v1", "v2", "v3", etc.
- Switching version loads content from that artifact version
- Regenerate = creates new version (version++), auto-switches to new

### Delete Behavior

- Deletes the specific version currently being viewed
- If all versions deleted → tab closes, artifact soft-deleted
- Simple confirmation dialog before delete

### Apply ("Terapkan") Behavior

- Replaces `content` in source artifact with refrasedText
- Source artifact version increments (version++)
- Refrasa artifact remains (as history/trail)

### Issues Panel

- Reuses the clickable badge pattern from RefrasaConfirmDialog redesign
- `totalIssues > 0`: amber badge `⚠ N`, click toggles floating panel
- `totalIssues === 0`: disabled DocMagnifyingGlass icon fallback
- Panel shows collapsible Naturalness + Style issue groups

---

## Components Affected

### New Components
- `RefrasaTabContent.tsx` — content view for refrasa tab (replaces RefrasaConfirmDialog)
- `RefrasaToolbar.tsx` — toolbar with version dropdown, download, copy, delete, issues, apply

### Modified Components
- `convex/schema.ts` — add "refrasa" type + new fields
- `convex/artifacts.ts` — createRefrasaArtifact mutation
- `src/lib/hooks/useArtifactTabs.ts` — no change needed (already supports any type string)
- `src/components/chat/ArtifactPanel.tsx` — render RefrasaTabContent for type "refrasa"
- `src/components/chat/ArtifactViewer.tsx` — change Refrasa trigger flow (create artifact instead of dialog)
- `src/components/chat/FullsizeArtifactModal.tsx` — add tab bar
- `src/components/chat/ArtifactTabs.tsx` — add "R" icon for refrasa type
- `src/components/chat/sidebar/SidebarPaperSessions.tsx` — add "R" badge for refrasa artifacts
- `src/app/api/refrasa/route.ts` — no change (API stays the same)
- `src/lib/hooks/useRefrasa.ts` — update to call createArtifact after API response

### Removed Components
- `src/components/refrasa/RefrasaConfirmDialog.tsx` — replaced by tab-based flow

### Kept Components (restyled in previous commits)
- `src/components/refrasa/RefrasaLoadingIndicator.tsx` — reused in tab loading state
- `src/components/refrasa/RefrasaIssueItem.tsx` — reused in issues panel
