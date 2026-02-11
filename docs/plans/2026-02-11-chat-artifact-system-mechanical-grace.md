# Chat Artifact System & Indicators — Mechanical Grace Migration (Phase 3)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate 10 chat artifact & indicator components to Makalah-Carbon design tokens (Phase 3 — final phase of Chat Redesign).

**Architecture:** Pure frontend CSS token replacement. Replace legacy Tailwind classes (`rounded-lg`, `rounded-2xl`, `rounded-md`, `rounded-full`, `rounded`, `border-slate-800`) with Mechanical Grace tokens (`.rounded-shell`, `.rounded-action`, `.rounded-badge`, `border-border/50`). No logic, backend, or structural changes.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Makalah-Carbon design tokens (defined in `src/app/globals.css`).

**Branch:** `feat/chat-page-redesign-mechanical-grace` (13 commits from Phase 1+2 already present).

---

## MANDATORY (applies to ALL tasks)

- **FRONTEND ONLY** — no backend (`convex/`) changes
- **Commit only on branch** `feat/chat-page-redesign-mechanical-grace`
- **Token mapping is strict** — use ONLY these Carbon tokens:
  - `.rounded-shell` (16px) — outer panels, modal containers
  - `.rounded-action` (8px via spec) — buttons, inputs, interactive controls
  - `.rounded-badge` (6px) — badges, tags, status indicators, compact labels
  - `.rounded-none` (0px) — data grids, terminal lines
  - `border-border/50` — replaces `border-slate-800`, `border-slate-700`
  - `font-mono` — all system labels, version numbers, dates, metadata

## Constraints (applies to ALL tasks)

- DILARANG mengubah LLM/provider settings
- DILARANG mengubah web search tool settings
- DILARANG mengubah artifact logic (business logic, state management, data flow)
- DILARANG mengubah paper workflow logic
- DILARANG mengubah Convex backend files
- DILARANG menambah/menghapus imports kecuali `cn` dari `@/lib/utils` jika belum ada
- DILARANG mengubah component props, interfaces, atau function signatures
- DILARANG menambah fitur baru atau refactor struktur
- Preserve ALL existing className values yang bukan target migrasi

---

### Task 1: ArtifactPanel.tsx — Panel Shell & Action Buttons

**Files:**
- Modify: `src/components/chat/ArtifactPanel.tsx`

**Step 1: Panel container radius + border (line 151)**

Replace:
```
"bg-slate-950 rounded-2xl border border-slate-800",
```
With:
```
"bg-slate-950 rounded-shell border border-border/50",
```

**Step 2: Count badge (lines 163-166)**

Replace:
```
"text-xs font-medium shrink-0",
"px-2 py-0.5 rounded-full",
"bg-muted text-muted-foreground"
```
With:
```
"text-xs font-mono font-medium shrink-0",
"px-2 py-0.5 rounded-badge",
"bg-muted text-muted-foreground"
```

**Step 3: Action buttons — wide view (lines 189, 238, 259, 283)**

All 4 action buttons (Download, Edit, Refrasa, Copy) use identical pattern. Replace each `"h-7 w-7 rounded"` with `"h-7 w-7 rounded-action"`.

Exact locations:
- Line 189: Download button
- Line 238: Edit button
- Line 259: Refrasa button
- Line 283: Copy button

**Step 4: Action buttons — narrow view 3-dot menu + expand + close (lines 315, 407, 429)**

Replace each `"h-7 w-7 rounded"` or `"h-7 w-7 rounded shrink-0"` with `"h-7 w-7 rounded-action"` or `"h-7 w-7 rounded-action shrink-0"`.

Exact locations:
- Line 315: 3-dot MoreVert button
- Line 407: Expand fullscreen button (has `"hidden @[280px]/artifact:flex"` prefix — preserve it)
- Line 429: Close button (has `shrink-0` — preserve it)

**Step 5: Version Badge in selector (lines 483-486)**

Replace:
```
<Badge
  variant="secondary"
  className="shrink-0 text-[10px] px-1.5 py-0"
>
```
With:
```
<Badge
  variant="secondary"
  className="shrink-0 text-[10px] font-mono px-1.5 py-0 rounded-badge"
>
```

**Step 6: Type Badge in selector (lines 498-501)**

Replace:
```
<Badge
  variant="outline"
  className="text-[10px] px-1.5 py-0 capitalize"
>
```
With:
```
<Badge
  variant="outline"
  className="text-[10px] font-mono px-1.5 py-0 rounded-badge capitalize"
>
```

**Step 7: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

**Step 8: Commit**

```bash
git add src/components/chat/ArtifactPanel.tsx
git commit -m "feat(chat): apply Mechanical Grace tokens to ArtifactPanel shell and action buttons"
```

---

### Task 2: ArtifactList.tsx — List Items & Badges

**Files:**
- Modify: `src/components/chat/ArtifactList.tsx`

**Step 1: List item button radius (line 137)**

Replace:
```
"w-full p-2 rounded-lg text-left transition-colors",
```
With:
```
"w-full p-2 rounded-action text-left transition-colors",
```

**Step 2: Version Badge (lines 151-154)**

Replace:
```
<Badge
    variant="secondary"
    className="shrink-0 text-[10px] font-mono px-1 py-0"
>
```
With:
```
<Badge
    variant="secondary"
    className="shrink-0 text-[10px] font-mono px-1 py-0 rounded-badge"
>
```

**Step 3: Type Badge (lines 159-162)**

Replace:
```
<Badge
    variant="outline"
    className="text-[10px] px-1 py-0 capitalize"
>
```
With:
```
<Badge
    variant="outline"
    className="text-[10px] font-mono px-1 py-0 rounded-badge capitalize"
>
```

**Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactList.tsx
git commit -m "feat(chat): apply Mechanical Grace tokens to ArtifactList items and badges"
```

---

### Task 3: ArtifactViewer.tsx + ArtifactEditor.tsx — Viewer Badges & Editor Textarea

**Files:**
- Modify: `src/components/chat/ArtifactViewer.tsx`
- Modify: `src/components/chat/ArtifactEditor.tsx`

**Step 1: ArtifactViewer — Version selector trigger (line 359)**

Replace:
```
className="h-6 text-[11px] font-medium w-auto min-w-[60px] px-2 py-0 rounded bg-muted border-0"
```
With:
```
className="h-6 text-[11px] font-mono font-medium w-auto min-w-[60px] px-2 py-0 rounded-action bg-muted border-0"
```

**Step 2: ArtifactViewer — FINAL badge (line 375)**

Replace:
```
<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
```
With:
```
<span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-badge bg-emerald-500 text-white">
```

**Step 3: ArtifactViewer — Invalidation badge (line 386)**

Replace:
```
"px-2 py-0.5 rounded text-[11px] cursor-help",
```
With:
```
"px-2 py-0.5 rounded-badge text-[11px] font-mono cursor-help",
```

**Step 4: ArtifactViewer — Fallback pre element (line 468)**

Replace:
```
<pre className="whitespace-pre-wrap font-sans bg-muted p-4 rounded-lg text-sm leading-relaxed">
```
With:
```
<pre className="whitespace-pre-wrap font-sans bg-muted p-4 rounded-action text-sm leading-relaxed">
```

**Step 5: ArtifactEditor — Textarea (line 64)**

Replace:
```
className="w-full h-full resize-none bg-muted rounded-lg p-4 text-sm font-mono border border-dashed border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
```
With:
```
className="w-full h-full resize-none bg-muted rounded-action p-4 text-sm font-mono border border-dashed border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
```

**Step 6: ArtifactEditor — Keyboard shortcut kbd elements (line 104)**

Replace:
```
<kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">⌘</kbd>+<kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> simpan • <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> batal
```
With:
```
<kbd className="px-1 py-0.5 bg-muted rounded-badge text-[10px]">⌘</kbd>+<kbd className="px-1 py-0.5 bg-muted rounded-badge text-[10px]">Enter</kbd> simpan • <kbd className="px-1 py-0.5 bg-muted rounded-badge text-[10px]">Esc</kbd> batal
```

**Step 7: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

**Step 8: Commit**

```bash
git add src/components/chat/ArtifactViewer.tsx src/components/chat/ArtifactEditor.tsx
git commit -m "feat(chat): apply Mechanical Grace tokens to ArtifactViewer badges and ArtifactEditor textarea"
```

---

### Task 4: FullsizeArtifactModal.tsx — Modal Shell, Buttons & Borders

**Files:**
- Modify: `src/components/chat/FullsizeArtifactModal.tsx`

**Step 1: Modal container shell (line 287)**

Replace:
```
"bg-slate-950 rounded-2xl border border-slate-800",
```
With:
```
"bg-slate-950 rounded-shell border border-border/50",
```

**Step 2: Header border (line 292)**

Replace:
```
"flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900 shrink-0"
```
With:
```
"flex items-center justify-between px-5 py-4 border-b border-border/50 bg-slate-900 shrink-0"
```

**Step 3: Version badge (line 298)**

Replace:
```
<span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
```
With:
```
<span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-badge bg-amber-500/20 text-amber-400 border border-amber-500/30">
```

**Step 4: Minimize button (line 309)**

Replace:
```
"w-8 h-8 flex items-center justify-center rounded-md",
```
With:
```
"w-8 h-8 flex items-center justify-center rounded-action",
```

**Step 5: Close button (line 326)**

Replace:
```
"w-8 h-8 flex items-center justify-center rounded-md",
```
With:
```
"w-8 h-8 flex items-center justify-center rounded-action",
```

**Step 6: Edit textarea (line 362)**

Replace:
```
"bg-slate-900 rounded-lg border border-dashed border-sky-500/50",
```
With:
```
"bg-slate-900 rounded-action border border-dashed border-sky-500/50",
```

**Step 7: Fallback pre element (line 393)**

Replace:
```
<pre className="whitespace-pre-wrap font-sans bg-muted p-6 rounded-lg">
```
With:
```
<pre className="whitespace-pre-wrap font-sans bg-muted p-6 rounded-action">
```

**Step 8: Footer border (line 402)**

Replace:
```
"flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900 shrink-0"
```
With:
```
"flex items-center justify-between px-5 py-3 border-t border-border/50 bg-slate-900 shrink-0"
```

**Step 9: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

**Step 10: Commit**

```bash
git add src/components/chat/FullsizeArtifactModal.tsx
git commit -m "feat(chat): apply Mechanical Grace tokens to FullsizeArtifactModal shell and borders"
```

---

### Task 5: VersionHistoryDialog.tsx + ArtifactIndicator.tsx — History Items & Indicator

**Files:**
- Modify: `src/components/chat/VersionHistoryDialog.tsx`
- Modify: `src/components/chat/ArtifactIndicator.tsx`

**Step 1: VersionHistoryDialog — Version item button (line 97)**

Replace:
```
"w-full text-left p-3 rounded-lg transition-colors",
```
With:
```
"w-full text-left p-3 rounded-action transition-colors",
```

**Step 2: VersionHistoryDialog — Version item border (line 99)**

Replace:
```
"border border-slate-800 hover:border-slate-700",
```
With:
```
"border border-border/50 hover:border-border",
```

**Step 3: VersionHistoryDialog — Footer border (line 146)**

Replace:
```
"pt-4 border-t border-slate-800 text-xs font-mono text-muted-foreground text-center"
```
With:
```
"pt-4 border-t border-border/50 text-xs font-mono text-muted-foreground text-center"
```

**Step 4: ArtifactIndicator — Main button (line 40)**

Replace:
```
"px-3 py-2.5 rounded-md",
```
With:
```
"px-3 py-2.5 rounded-action",
```

**Step 5: ArtifactIndicator — SYSTEM_OUTPUT badge (line 57)**

Replace:
```
<span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wide bg-sky-500/20 text-sky-400 border border-dashed border-sky-500/30">
```
With:
```
<span className="inline-flex px-2 py-0.5 rounded-badge text-[10px] font-mono font-semibold uppercase tracking-wide bg-sky-500/20 text-sky-400 border border-dashed border-sky-500/30">
```

**Step 6: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

**Step 7: Commit**

```bash
git add src/components/chat/VersionHistoryDialog.tsx src/components/chat/ArtifactIndicator.tsx
git commit -m "feat(chat): apply Mechanical Grace tokens to VersionHistoryDialog and ArtifactIndicator"
```

---

### Task 6: ToolStateIndicator.tsx + SourcesIndicator.tsx + QuotaWarningBanner.tsx — Remaining Indicators

**Files:**
- Modify: `src/components/chat/ToolStateIndicator.tsx`
- Modify: `src/components/chat/SourcesIndicator.tsx`
- Modify: `src/components/chat/QuotaWarningBanner.tsx`

**Step 1: ToolStateIndicator — Container radius (line 36)**

Replace:
```
"flex w-fit items-center gap-2 rounded-lg border border-dashed px-3 py-2",
```
With:
```
"flex w-fit items-center gap-2 rounded-action border border-dashed px-3 py-2",
```

**Step 2: SourcesIndicator — Found sources header (line 51)**

Replace:
```
"rounded-md bg-emerald-500/10 border-l-4 border-l-emerald-500",
```
With:
```
"rounded-badge bg-emerald-500/10 border-l-4 border-l-emerald-500",
```

**Step 3: SourcesIndicator — Collapsible container (line 66)**

Replace:
```
className="rounded-md border border-slate-800 bg-muted/30"
```
With:
```
className="rounded-badge border border-border/50 bg-muted/30"
```

**Step 4: SourcesIndicator — Collapsible trigger (lines 74-75)**

Replace:
```
"hover:bg-accent/50 transition-colors rounded-md",
isOpen && "border-b border-slate-800 rounded-b-none"
```
With:
```
"hover:bg-accent/50 transition-colors rounded-badge",
isOpen && "border-b border-border/50 rounded-b-none"
```

**Step 5: SourcesIndicator — Dividers (line 93)**

Replace:
```
<div className="flex flex-col divide-y divide-slate-800">
```
With:
```
<div className="flex flex-col divide-y divide-border/50">
```

**Step 6: QuotaWarningBanner — Container radius (line 126)**

Replace:
```
"flex items-center gap-3 px-4 py-2.5 border rounded-lg text-sm",
```
With:
```
"flex items-center gap-3 px-4 py-2.5 border rounded-action text-sm",
```

**Step 7: QuotaWarningBanner — Dismiss button (line 150)**

Replace:
```
className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
```
With:
```
className="p-1 rounded-action hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
```

**Step 8: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

**Step 9: Commit**

```bash
git add src/components/chat/ToolStateIndicator.tsx src/components/chat/SourcesIndicator.tsx src/components/chat/QuotaWarningBanner.tsx
git commit -m "feat(chat): apply Mechanical Grace tokens to ToolState, Sources, and QuotaWarning indicators"
```

---

## Verification Checklist (Post-Implementation)

After all 6 tasks complete:

```bash
# Full build verification
npx tsc --noEmit && npm run build && npm run lint

# Grep audit: no legacy rounded tokens in modified files
grep -n "rounded-2xl\|rounded-lg\|rounded-full" \
  src/components/chat/ArtifactPanel.tsx \
  src/components/chat/ArtifactList.tsx \
  src/components/chat/ArtifactViewer.tsx \
  src/components/chat/ArtifactEditor.tsx \
  src/components/chat/FullsizeArtifactModal.tsx \
  src/components/chat/VersionHistoryDialog.tsx \
  src/components/chat/ArtifactIndicator.tsx \
  src/components/chat/ToolStateIndicator.tsx \
  src/components/chat/SourcesIndicator.tsx \
  src/components/chat/QuotaWarningBanner.tsx

# Grep audit: no bare border-slate-800 in modified files
grep -n "border-slate-800\|border-slate-700" \
  src/components/chat/ArtifactPanel.tsx \
  src/components/chat/FullsizeArtifactModal.tsx \
  src/components/chat/VersionHistoryDialog.tsx \
  src/components/chat/SourcesIndicator.tsx
```

Expected: Zero legacy token matches in all modified files.

## Summary

| Task | Files | Changes |
|------|-------|---------|
| 1 | ArtifactPanel.tsx | Shell → rounded-shell, 7 buttons → rounded-action, count badge → rounded-badge, 2 Badges → rounded-badge + font-mono |
| 2 | ArtifactList.tsx | Items → rounded-action, 2 Badges → rounded-badge + font-mono |
| 3 | ArtifactViewer.tsx + ArtifactEditor.tsx | Selector → rounded-action, FINAL/invalidation badges → rounded-badge, textarea → rounded-action, kbd → rounded-badge |
| 4 | FullsizeArtifactModal.tsx | Shell → rounded-shell, 3 borders → border/50, 2 buttons → rounded-action, textarea → rounded-action, badge → rounded-badge |
| 5 | VersionHistoryDialog.tsx + ArtifactIndicator.tsx | Items → rounded-action, borders → border/50, indicator → rounded-action, badge → rounded-badge |
| 6 | ToolState + Sources + QuotaWarning | Containers → rounded-action/rounded-badge, borders → border/50, dividers → divide-border/50 |
