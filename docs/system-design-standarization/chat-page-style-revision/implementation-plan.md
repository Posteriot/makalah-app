# Chat Page Token Reset — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 130+ custom `--ds-*` tokens with 34 standard shadcn/ui `--chat-*` tokens across all chat components.

**Architecture:** Single-layer token system scoped to `[data-chat-scope]` in `globals-new.css`. Components consume tokens via Tailwind utilities or `var(--chat-*)`. No transparency except shadows and modal backdrop.

**Tech Stack:** Tailwind CSS v4, OKLCH color values, CSS custom properties, `@theme inline` bridge.

**Design Reference:** `docs/system-design-standarization/chat-page-style-revision/design.md`

---

## Task 1: Reset globals-new.css

**Files:**
- Rewrite: `src/app/globals-new.css`

**Step 1: Replace entire globals-new.css with new token system**

Replace the full contents of `src/app/globals-new.css` with:

```css
/* ==========================================================================
 * Chat Token System (Staging)
 * Scoped to [data-chat-scope] — will be promoted to globals.css when stable
 * Palette: Makalah OKLCH (true neutral, hue 0)
 * Rules: No transparency (except shadow/backdrop), min 4-step contrast gap
 * ========================================================================== */

@theme inline {
  --color-chat-background: var(--chat-background);
  --color-chat-foreground: var(--chat-foreground);
  --color-chat-card: var(--chat-card);
  --color-chat-card-foreground: var(--chat-card-foreground);
  --color-chat-popover: var(--chat-popover);
  --color-chat-popover-foreground: var(--chat-popover-foreground);
  --color-chat-primary: var(--chat-primary);
  --color-chat-primary-foreground: var(--chat-primary-foreground);
  --color-chat-secondary: var(--chat-secondary);
  --color-chat-secondary-foreground: var(--chat-secondary-foreground);
  --color-chat-muted: var(--chat-muted);
  --color-chat-muted-foreground: var(--chat-muted-foreground);
  --color-chat-accent: var(--chat-accent);
  --color-chat-accent-foreground: var(--chat-accent-foreground);
  --color-chat-destructive: var(--chat-destructive);
  --color-chat-destructive-foreground: var(--chat-destructive-foreground);
  --color-chat-success: var(--chat-success);
  --color-chat-success-foreground: var(--chat-success-foreground);
  --color-chat-warning: var(--chat-warning);
  --color-chat-warning-foreground: var(--chat-warning-foreground);
  --color-chat-info: var(--chat-info);
  --color-chat-info-foreground: var(--chat-info-foreground);
  --color-chat-border: var(--chat-border);
  --color-chat-input: var(--chat-input);
  --color-chat-ring: var(--chat-ring);
  --color-chat-sidebar: var(--chat-sidebar);
  --color-chat-sidebar-foreground: var(--chat-sidebar-foreground);
  --color-chat-sidebar-primary: var(--chat-sidebar-primary);
  --color-chat-sidebar-primary-foreground: var(--chat-sidebar-primary-foreground);
  --color-chat-sidebar-accent: var(--chat-sidebar-accent);
  --color-chat-sidebar-accent-foreground: var(--chat-sidebar-accent-foreground);
  --color-chat-sidebar-border: var(--chat-sidebar-border);
  --color-chat-sidebar-ring: var(--chat-sidebar-ring);
}

/* ── Light Mode ── */
[data-chat-scope] {
  /* Surface & Text */
  --chat-background: oklch(0.984 0 0);           /* slate-50 */
  --chat-foreground: oklch(0.129 0 0);           /* slate-950 */
  --chat-card: oklch(1 0 0);                     /* white */
  --chat-card-foreground: oklch(0.129 0 0);      /* slate-950 */
  --chat-popover: oklch(1 0 0);                  /* white */
  --chat-popover-foreground: oklch(0.129 0 0);   /* slate-950 */
  --chat-muted: oklch(0.929 0 0);               /* slate-200 */
  --chat-muted-foreground: oklch(0.554 0 0);    /* slate-500 */
  --chat-accent: oklch(0.968 0 0);              /* slate-100 */
  --chat-accent-foreground: oklch(0.129 0 0);   /* slate-950 */
  --chat-secondary: oklch(0.929 0 0);           /* slate-200 */
  --chat-secondary-foreground: oklch(0.208 0 0); /* slate-900 */

  /* Brand & States */
  --chat-primary: oklch(0.769 0.188 70.08);      /* amber-500 */
  --chat-primary-foreground: oklch(1 0 0);       /* white */
  --chat-destructive: oklch(0.586 0.253 17.585); /* rose-600 */
  --chat-destructive-foreground: oklch(1 0 0);   /* white */
  --chat-success: oklch(0.6 0.118 184.704);      /* teal-600 */
  --chat-success-foreground: oklch(1 0 0);       /* white */
  --chat-warning: oklch(0.666 0.179 58.318);     /* amber-600 */
  --chat-warning-foreground: oklch(1 0 0);       /* white */
  --chat-info: oklch(0.588 0.158 241.966);       /* sky-600 */
  --chat-info-foreground: oklch(1 0 0);          /* white */

  /* Border & Focus */
  --chat-border: oklch(0.929 0 0);              /* slate-200 */
  --chat-input: oklch(0.929 0 0);               /* slate-200 */
  --chat-ring: oklch(0.769 0.188 70.08);        /* amber-500 */

  /* Sidebar */
  --chat-sidebar: oklch(0.968 0 0);             /* slate-100 */
  --chat-sidebar-foreground: oklch(0.129 0 0);  /* slate-950 */
  --chat-sidebar-primary: oklch(0.446 0 0);     /* slate-600 */
  --chat-sidebar-primary-foreground: oklch(1 0 0); /* white */
  --chat-sidebar-accent: oklch(0.929 0 0);      /* slate-200 */
  --chat-sidebar-accent-foreground: oklch(0.129 0 0); /* slate-950 */
  --chat-sidebar-border: oklch(0.929 0 0);      /* slate-200 */
  --chat-sidebar-ring: oklch(0.769 0.188 70.08); /* amber-500 */
}

/* ── Dark Mode ── */
.dark [data-chat-scope] {
  /* Surface & Text */
  --chat-background: oklch(0.208 0 0);           /* slate-900 */
  --chat-foreground: oklch(0.968 0 0);           /* slate-100 */
  --chat-card: oklch(0.208 0 0);                 /* slate-900 */
  --chat-card-foreground: oklch(0.968 0 0);      /* slate-100 */
  --chat-popover: oklch(0.279 0 0);              /* slate-800 */
  --chat-popover-foreground: oklch(0.968 0 0);   /* slate-100 */
  --chat-muted: oklch(0.279 0 0);               /* slate-800 */
  --chat-muted-foreground: oklch(0.704 0 0);    /* slate-400 */
  --chat-accent: oklch(0.372 0 0);              /* slate-700 */
  --chat-accent-foreground: oklch(0.984 0 0);   /* slate-50 */
  --chat-secondary: oklch(0.279 0 0);           /* slate-800 */
  --chat-secondary-foreground: oklch(0.968 0 0); /* slate-100 */

  /* Brand & States */
  --chat-primary: oklch(0.769 0.188 70.08);      /* amber-500 */
  --chat-primary-foreground: oklch(1 0 0);       /* white */
  --chat-destructive: oklch(0.586 0.253 17.585); /* rose-600 */
  --chat-destructive-foreground: oklch(0 0 0);   /* black */
  --chat-success: oklch(0.6 0.118 184.704);      /* teal-600 */
  --chat-success-foreground: oklch(0 0 0);       /* black */
  --chat-warning: oklch(0.666 0.179 58.318);     /* amber-600 */
  --chat-warning-foreground: oklch(0 0 0);       /* black */
  --chat-info: oklch(0.588 0.158 241.966);       /* sky-600 */
  --chat-info-foreground: oklch(0 0 0);          /* black */

  /* Border & Focus */
  --chat-border: oklch(0.372 0 0);              /* slate-700 */
  --chat-input: oklch(0.372 0 0);               /* slate-700 */
  --chat-ring: oklch(0.769 0.188 70.08);        /* amber-500 */

  /* Sidebar */
  --chat-sidebar: oklch(0.129 0 0);             /* slate-950 */
  --chat-sidebar-foreground: oklch(0.968 0 0);  /* slate-100 */
  --chat-sidebar-primary: oklch(1 0 0);         /* white */
  --chat-sidebar-primary-foreground: oklch(0.279 0 0); /* slate-800 */
  --chat-sidebar-accent: oklch(0.279 0 0);      /* slate-800 */
  --chat-sidebar-accent-foreground: oklch(0.984 0 0); /* slate-50 */
  --chat-sidebar-border: oklch(0.372 0 0);      /* slate-700 */
  --chat-sidebar-ring: oklch(0.769 0.188 70.08); /* amber-500 */
}
```

**Step 2: Update scope attribute in chat layout**

File: `src/app/chat/layout.tsx:6`

Replace `data-ds-scope="chat-v1"` with `data-chat-scope`.

**Step 3: Validate reset**

Run:
```bash
# globals-new.css must have zero --ds- tokens
grep "var(--ds-" src/app/globals-new.css
# Expected: 0 results

# globals-new.css must have chat- tokens
grep "var(--chat-" src/app/globals-new.css
# Expected: 34 results (in @theme inline)

# Scope attribute updated
grep "data-chat-scope" src/app/chat/layout.tsx
# Expected: 1 result
```

**Step 4: Commit**

```bash
git add src/app/globals-new.css src/app/chat/layout.tsx
git commit -m "refactor(tokens): reset globals-new.css to 34 chat-* tokens

Replace 130+ --ds-* tokens with 34 shadcn-pattern --chat-* tokens.
All OKLCH values from Makalah palette (true neutral, hue 0).
Scope changed from data-ds-scope to data-chat-scope.

Components will break — migration follows in W1-W5."
```

---

## Task 2: Wave 1 — Shell & Entry (13 files)

**Files:**
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/shell/TopBar.tsx`
- `src/components/chat/shell/ActivityBar.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/ui/PanelResizer.tsx`
- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- `src/components/chat/messages/TemplateGrid.tsx`
- `src/components/chat/ChatProcessStatusBar.tsx`
- `src/components/chat/ThinkingIndicator.tsx`
- `src/components/chat/QuickActions.tsx`

**Token mapping guide for this wave:**

| Legacy pattern | Replacement |
|---|---|
| `var(--ds-surface-base)` | `var(--chat-background)` |
| `var(--ds-surface-subtle)` | `var(--chat-accent)` |
| `var(--ds-surface-panel)` | `var(--chat-card)` |
| `var(--ds-surface-elevated)` | `var(--chat-muted)` |
| `var(--ds-surface-activitybar)` | `var(--chat-sidebar)` |
| `var(--ds-surface-activitybar-hover)` | `var(--chat-sidebar-accent)` |
| `var(--ds-text-primary-strong)` | `var(--chat-foreground)` |
| `var(--ds-text-muted)` | `var(--chat-muted-foreground)` |
| `var(--ds-text-muted-strong)` | `var(--chat-secondary-foreground)` |
| `var(--ds-text-toolbar-muted)` | `var(--chat-muted-foreground)` |
| `var(--ds-text-toolbar-hover)` | `var(--chat-foreground)` |
| `var(--ds-text-toolbar-active)` | `var(--chat-foreground)` |
| `var(--ds-text-toolbar-disabled)` | `var(--chat-muted-foreground)` |
| `var(--ds-border-subtle)` | `var(--chat-border)` |
| `var(--ds-border-strong)` | `var(--chat-border)` |
| `var(--ds-border-activitybar)` | `var(--chat-sidebar-border)` |
| `var(--ds-sidebar-surface)` | `var(--chat-sidebar)` |
| `var(--ds-sidebar-border)` | `var(--chat-sidebar-border)` |
| `var(--ds-sidebar-cta-bg)` | `var(--chat-sidebar-primary)` |
| `var(--ds-sidebar-cta-fg)` | `var(--chat-sidebar-primary-foreground)` |
| `var(--ds-sidebar-cta-bg-hover)` | `var(--chat-sidebar-primary)` with `hover:opacity-90` |
| `var(--ds-activity-item-fg)` | `var(--chat-sidebar-foreground)` |
| `var(--ds-activity-item-hover-bg)` | `var(--chat-sidebar-accent)` |
| `var(--ds-activity-item-active-bg)` | `var(--chat-sidebar-accent)` |
| `var(--ds-activity-item-active-border)` | `var(--chat-sidebar-border)` |
| `var(--ds-user-message-bg)` | `var(--chat-muted)` |
| `var(--ds-template-button-bg)` | `var(--chat-secondary)` |
| `var(--ds-template-button-bg-hover)` | `var(--chat-accent)` |
| `var(--ds-thinking-dot)` | `var(--chat-muted-foreground)` |
| `var(--ds-resizer-base)` | `var(--chat-border)` |
| `var(--ds-resizer-active)` | `var(--chat-info)` |
| `var(--ds-chat-history-item-active-bg)` | `var(--chat-accent)` |
| `var(--ds-chat-history-item-hover-bg)` | `var(--chat-sidebar-accent)` |
| `var(--ds-status-surface)` | `var(--chat-card)` |
| `var(--ds-status-border)` | `var(--chat-border)` |
| `var(--ds-status-track-bg)` | `var(--chat-muted)` |
| `var(--ds-status-progress-success)` | `var(--chat-success)` |
| `var(--ds-status-progress-error)` | `var(--chat-destructive)` |
| Hardcoded `dark:(bg\|text\|border)-*` | Corresponding `var(--chat-*)` |

**Step 1: Migrate each file**

For each of the 13 files:
1. Open file
2. Replace all `var(--ds-*)` using the mapping table above
3. Replace all hardcoded color + `dark:` pairs with `var(--chat-*)`
4. Remove any remaining `dark:` prefixes for color/border/shadow

**Step 2: Validate wave 1**

Run for each file:
```bash
grep "var(--ds-" <file>                      # must return 0
grep -P "dark:(bg|text|border|shadow)-" <file> # must return 0
grep "var(--chat-" <file>                     # must return >= 1
```

**Step 3: Visual check**

Start dev server (`npm run dev`), open `/chat` in browser:
- Light mode: verify layout renders, sidebar visible, activity bar clickable, messages styled
- Dark mode: verify same; check contrast is readable

**Step 4: Commit**

```bash
git add src/components/chat/layout/ src/components/chat/shell/ \
  src/components/chat/ChatSidebar.tsx src/components/chat/ChatWindow.tsx \
  src/components/chat/ChatInput.tsx src/components/chat/MessageBubble.tsx \
  src/components/ui/PanelResizer.tsx src/components/chat/sidebar/SidebarChatHistory.tsx \
  src/components/chat/messages/TemplateGrid.tsx src/components/chat/ChatProcessStatusBar.tsx \
  src/components/chat/ThinkingIndicator.tsx src/components/chat/QuickActions.tsx
git commit -m "refactor(chat): migrate W1 shell components to chat-* tokens"
```

---

## Task 3: Wave 2 — Artifact Workspace (9 files)

**Files:**
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ArtifactEditor.tsx`
- `src/components/chat/ArtifactIndicator.tsx`
- `src/components/chat/ArtifactList.tsx`
- `src/components/chat/MarkdownRenderer.tsx`

**Token mapping guide for this wave:**

This wave has the largest token reduction: 60+ `--ds-artifact-*` tokens → ~8 generic tokens.

| Legacy pattern | Replacement |
|---|---|
| `var(--ds-artifact-panel-bg)` | `var(--chat-card)` |
| `var(--ds-artifact-panel-border)` | `var(--chat-border)` |
| `var(--ds-artifact-divider-border)` | `var(--chat-border)` |
| `var(--ds-artifact-text-primary)` | `var(--chat-card-foreground)` |
| `var(--ds-artifact-text-secondary)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-text-muted)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-text-subtle)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-empty-icon)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-chip-bg)` | `var(--chat-secondary)` |
| `var(--ds-artifact-chip-hover-bg)` | `var(--chat-accent)` |
| `var(--ds-artifact-chip-border)` | `var(--chat-border)` |
| `var(--ds-artifact-chip-fg)` | `var(--chat-secondary-foreground)` |
| `var(--ds-artifact-icon-fg)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-icon-hover-bg)` | `var(--chat-accent)` |
| `var(--ds-artifact-icon-hover-fg)` | `var(--chat-foreground)` |
| `var(--ds-artifact-focus-offset)` | `var(--chat-card)` |
| `var(--ds-artifact-action-bg)` | `var(--chat-primary)` |
| `var(--ds-artifact-action-border)` | `var(--chat-border)` |
| `var(--ds-artifact-action-fg)` | `var(--chat-primary-foreground)` |
| `var(--ds-artifact-action-hover-bg)` | `var(--chat-primary)` with `hover:opacity-90` |
| `var(--ds-artifact-action-copied-bg)` | `var(--chat-success)` |
| `var(--ds-artifact-action-copied-border)` | `var(--chat-border)` |
| `var(--ds-artifact-action-disabled-fg)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-expand-bg)` | `var(--chat-secondary)` |
| `var(--ds-artifact-expand-border)` | `var(--chat-border)` |
| `var(--ds-artifact-expand-fg)` | `var(--chat-secondary-foreground)` |
| `var(--ds-artifact-expand-hover-bg)` | `var(--chat-accent)` |
| `var(--ds-artifact-tab-gradient)` | `var(--chat-card)` |
| `var(--ds-artifact-tab-active-bg)` | `var(--chat-card)` |
| `var(--ds-artifact-tab-active-border)` | `var(--chat-border)` |
| `var(--ds-artifact-tab-inactive-bg)` | `var(--chat-muted)` |
| `var(--ds-artifact-tab-inactive-hover-bg)` | `var(--chat-accent)` |
| `var(--ds-artifact-tab-icon-bg)` | `var(--chat-muted)` |
| `var(--ds-artifact-tab-icon-border)` | `var(--chat-border)` |
| `var(--ds-artifact-tab-icon-fg)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-tab-text-active)` | `var(--chat-foreground)` |
| `var(--ds-artifact-tab-text-inactive)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-tab-close-fg)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-tab-controls-border)` | `var(--chat-border)` |
| `var(--ds-artifact-tab-controls-fg)` | `var(--chat-muted-foreground)` |
| `var(--ds-artifact-tab-controls-hover-fg)` | `var(--chat-foreground)` |
| `var(--ds-artifact-tab-controls-hover-bg)` | `var(--chat-accent)` |
| `var(--ds-artifact-viewer-select-bg)` | `var(--chat-secondary)` |
| `var(--ds-artifact-viewer-select-border)` | `var(--chat-border)` |
| `var(--ds-artifact-viewer-select-fg)` | `var(--chat-secondary-foreground)` |
| `var(--ds-artifact-viewer-canvas-bg)` | `var(--chat-background)` |
| `var(--ds-artifact-viewer-canvas-border)` | `var(--chat-border)` |
| `var(--ds-artifact-viewer-overlay-bg)` | `var(--chat-card)` |
| `var(--ds-artifact-backdrop)` | Inline `oklch(0 0 0 / 0.55)` (backdrop exception) |
| `var(--ds-artifact-warning-text-strong)` | `var(--chat-warning)` |
| `var(--ds-artifact-warning-text-muted)` | `var(--chat-warning)` |
| `var(--ds-artifact-meta-card-bg)` | `var(--chat-muted)` |
| `var(--ds-artifact-meta-card-border)` | `var(--chat-border)` |
| `var(--ds-artifact-mode-badge-bg)` | `var(--chat-info)` |
| `var(--ds-artifact-mode-badge-border)` | `var(--chat-border)` |
| `var(--ds-artifact-mode-badge-fg)` | `var(--chat-info-foreground)` |
| `var(--ds-artifact-copy-badge-bg)` | `var(--chat-info)` |
| `var(--ds-artifact-copy-badge-border)` | `var(--chat-border)` |
| `var(--ds-artifact-copy-badge-fg)` | `var(--chat-info-foreground)` |
| `var(--ds-artifact-danger-bg)` | `var(--chat-destructive)` |
| `var(--ds-artifact-danger-fg)` | `var(--chat-destructive-foreground)` |
| `var(--ds-artifact-danger-hover-bg)` | `var(--chat-destructive)` with `hover:opacity-90` |
| `var(--ds-badge-artifact-bg)` | `var(--chat-success)` |
| `var(--ds-badge-artifact-fg)` | `var(--chat-success-foreground)` |
| `var(--ds-artifact-tab-active-shadow)` | Keep as shadow (transparency allowed) |

**Step 1: Migrate each file**

For each of the 9 files, apply mapping table above. Special attention to `FullsizeArtifactModal.tsx` — backdrop overlay uses inline style with `oklch(0 0 0 / 0.55)` instead of token.

**Step 2: Validate wave 2**

```bash
grep -r "var(--ds-" src/components/chat/Artifact*.tsx src/components/chat/FullsizeArtifactModal.tsx src/components/chat/MarkdownRenderer.tsx
# Expected: 0 results
```

**Step 3: Visual check**

Open chat with an artifact, verify:
- Artifact panel renders correctly
- Tabs switch properly with visible active/inactive states
- Fullscreen modal overlay works (backdrop should be semi-transparent)
- Copy/expand buttons visible and clickable

**Step 4: Commit**

```bash
git add src/components/chat/Artifact*.tsx \
  src/components/chat/FullsizeArtifactModal.tsx \
  src/components/chat/MarkdownRenderer.tsx
git commit -m "refactor(chat): migrate W2 artifact workspace to chat-* tokens

60+ --ds-artifact-* tokens collapsed to ~8 generic chat-* tokens."
```

---

## Task 4: Wave 3 — Paper/Rewind UI (7 files)

**Files:**
- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/paper/PaperValidationPanel.tsx`
- `src/components/paper/RewindConfirmationDialog.tsx`
- `src/components/paper/PaperSessionBadge.tsx`
- `src/components/paper/PaperStageProgress.tsx`
- `src/components/chat/VersionHistoryDialog.tsx`

**Token mapping guide for this wave:**

| Legacy pattern | Replacement |
|---|---|
| `var(--ds-surface-*)` | `var(--chat-card)` or `var(--chat-background)` |
| `var(--ds-text-*)` | `var(--chat-foreground)` or `var(--chat-muted-foreground)` |
| `var(--ds-border-*)` | `var(--chat-border)` |
| `var(--ds-state-success-*)` | `var(--chat-success)` / `var(--chat-success-foreground)` |
| `var(--ds-state-warning-*)` | `var(--chat-warning)` / `var(--chat-warning-foreground)` |
| `var(--ds-state-danger-*)` | `var(--chat-destructive)` / `var(--chat-destructive-foreground)` |
| `var(--ds-state-info-*)` | `var(--chat-info)` / `var(--chat-info-foreground)` |

**Step 1: Migrate each file**

Apply token mapping. Paper components heavily use state tokens (success for completed stages, warning for in-progress, info for navigation).

**Step 2: Validate wave 3**

```bash
grep -r "var(--ds-" src/components/chat/sidebar/SidebarProgress.tsx \
  src/components/chat/sidebar/SidebarPaperSessions.tsx \
  src/components/paper/*.tsx \
  src/components/chat/VersionHistoryDialog.tsx
# Expected: 0 results
```

**Step 3: Visual check**

Open a paper session in chat:
- Stage progress badges render with correct state colors
- Rewind dialog appears properly
- Version history dialog styled correctly

**Step 4: Commit**

```bash
git add src/components/chat/sidebar/SidebarProgress.tsx \
  src/components/chat/sidebar/SidebarPaperSessions.tsx \
  src/components/paper/*.tsx \
  src/components/chat/VersionHistoryDialog.tsx
git commit -m "refactor(chat): migrate W3 paper/rewind UI to chat-* tokens"
```

---

## Task 5: Wave 4 — Refrasa (4 files)

**Files:**
- `src/components/refrasa/RefrasaToolbar.tsx`
- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaIssueItem.tsx`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx`

**Token mapping guide:** Same generic mapping as Wave 3. Refrasa components use surface, text, border, and state tokens.

**Step 1: Migrate each file**

**Step 2: Validate wave 4**

```bash
grep -r "var(--ds-" src/components/refrasa/*.tsx
# Expected: 0 results
```

**Step 3: Visual check**

Trigger refrasa in artifact workspace:
- Toolbar renders properly
- Issue items show correct state indicators
- Loading state visible

**Step 4: Commit**

```bash
git add src/components/refrasa/*.tsx
git commit -m "refactor(chat): migrate W4 refrasa components to chat-* tokens"
```

---

## Task 6: Wave 5 — Indicators (5 files)

**Files:**
- `src/components/chat/ToolStateIndicator.tsx`
- `src/components/chat/SearchStatusIndicator.tsx`
- `src/components/chat/SourcesIndicator.tsx`
- `src/components/chat/QuotaWarningBanner.tsx`
- `src/components/chat/InlineCitationChip.tsx`

**Note:** These files have unstaged changes from previous work. Discard unstaged changes first, then migrate fresh from the committed state.

**Token mapping guide:** These are small indicator components. Primary tokens used: `--chat-success`, `--chat-warning`, `--chat-info`, `--chat-muted-foreground`, `--chat-border`.

**Step 1: Discard unstaged changes**

```bash
git checkout -- src/components/chat/InlineCitationChip.tsx \
  src/components/chat/QuotaWarningBanner.tsx \
  src/components/chat/SearchStatusIndicator.tsx \
  src/components/chat/SourcesIndicator.tsx \
  src/components/chat/ToolStateIndicator.tsx
```

**Step 2: Migrate each file**

**Step 3: Validate wave 5**

```bash
grep -r "var(--ds-" src/components/chat/ToolStateIndicator.tsx \
  src/components/chat/SearchStatusIndicator.tsx \
  src/components/chat/SourcesIndicator.tsx \
  src/components/chat/QuotaWarningBanner.tsx \
  src/components/chat/InlineCitationChip.tsx
# Expected: 0 results
```

**Step 4: Visual check**

Trigger each indicator in chat:
- Tool state shows during AI response
- Search status during web search
- Sources list after web search completes
- Quota warning when approaching limit
- Citation chips render with hover preview

**Step 5: Commit**

```bash
git add src/components/chat/ToolStateIndicator.tsx \
  src/components/chat/SearchStatusIndicator.tsx \
  src/components/chat/SourcesIndicator.tsx \
  src/components/chat/QuotaWarningBanner.tsx \
  src/components/chat/InlineCitationChip.tsx
git commit -m "refactor(chat): migrate W5 indicator components to chat-* tokens"
```

---

## Task 7: Final Validation & Cleanup

**Step 1: Full scope grep — zero legacy tokens**

```bash
grep -r "var(--ds-" src/components/chat/ src/components/paper/ src/components/refrasa/ src/components/ui/PanelResizer.tsx
# Expected: 0 results
```

**Step 2: Full scope grep — zero dark prefix for colors**

```bash
grep -rn -P "dark:(bg|text|border|shadow)-(slate|amber|emerald|rose|sky|teal|stone|green|red)" \
  src/components/chat/ src/components/paper/ src/components/refrasa/ src/components/ui/PanelResizer.tsx
# Expected: 0 results
```

**Step 3: Discard unstaged globals-new.css changes (if any leftover)**

```bash
git checkout -- src/app/globals-new.css
```

This only applies if there were unstaged changes from before the reset.

**Step 4: Remove empty legacy folder**

```bash
rmdir docs/system-design-standarization/chat-page-style 2>/dev/null || true
```

**Step 5: Full visual check**

Dev server running, test in browser:

| Area | Light | Dark |
|---|---|---|
| Chat landing `/chat` | ☐ | ☐ |
| Active conversation | ☐ | ☐ |
| Sidebar navigation | ☐ | ☐ |
| Activity bar | ☐ | ☐ |
| Artifact panel | ☐ | ☐ |
| Fullscreen artifact | ☐ | ☐ |
| Paper session progress | ☐ | ☐ |
| Refrasa toolbar | ☐ | ☐ |
| All 5 indicators | ☐ | ☐ |

**Step 6: Final commit**

```bash
git add -A
git commit -m "refactor(chat): complete token reset — 34 chat-* tokens replacing 130+ ds-* tokens

All chat components now use shadcn-pattern semantic tokens.
Zero hardcoded colors, zero dark: prefixes for colors.
Ready for promotion to globals.css after cross-page validation."
```
