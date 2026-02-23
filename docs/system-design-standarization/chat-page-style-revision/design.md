# Chat Page Token Reset — Design Document

Date: 2026-02-23
Status: APPROVED
Approach: B (shadcn pattern + Makalah palette)

## 1. Token Architecture & Naming

### Architecture

Single layer — no reference tokens, no alias tokens. Each token directly contains an OKLCH value from the Makalah palette.

```
global-css-template.css (panduan pokok)
        ↓ remap to Makalah palette
globals-new.css (staging, prefix chat-)
        ↓ after stabilization
globals.css (production, prefix removed)
```

### Naming Convention

All tokens use `chat-` prefix following shadcn/ui pattern:

| Token | Role |
|---|---|
| `--chat-background` | Main page surface |
| `--chat-foreground` | Primary text on background |
| `--chat-card` | Card/panel surface |
| `--chat-card-foreground` | Text on card |
| `--chat-popover` | Popover/dropdown surface |
| `--chat-popover-foreground` | Text on popover |
| `--chat-primary` | Primary CTA color |
| `--chat-primary-foreground` | Text on primary |
| `--chat-secondary` | Secondary surface |
| `--chat-secondary-foreground` | Text on secondary |
| `--chat-muted` | Muted/subtle surface |
| `--chat-muted-foreground` | Secondary/muted text |
| `--chat-accent` | Hover/highlight surface |
| `--chat-accent-foreground` | Text on accent |
| `--chat-destructive` | Danger/delete state |
| `--chat-destructive-foreground` | Text on destructive |
| `--chat-success` | Success state |
| `--chat-success-foreground` | Text on success |
| `--chat-warning` | Warning state |
| `--chat-warning-foreground` | Text on warning |
| `--chat-info` | Info/AI state |
| `--chat-info-foreground` | Text on info |
| `--chat-border` | Default border |
| `--chat-input` | Input field border |
| `--chat-ring` | Focus ring |
| `--chat-sidebar` | Sidebar surface |
| `--chat-sidebar-foreground` | Sidebar text |
| `--chat-sidebar-primary` | Sidebar CTA |
| `--chat-sidebar-primary-foreground` | Text on sidebar CTA |
| `--chat-sidebar-accent` | Sidebar hover surface |
| `--chat-sidebar-accent-foreground` | Text on sidebar hover |
| `--chat-sidebar-border` | Sidebar border |
| `--chat-sidebar-ring` | Sidebar focus ring |

**Total: 34 tokens** (down from 130+).

### Hard Rules

1. **No transparency** — except shadow tokens and modal backdrop
2. **No thin contrast** — minimum 4-step gap in 50-950 scale
3. **No hue manipulation** — use palette values as-is
4. **No component-specific tokens** — no `--chat-artifact-*`, `--chat-activity-*`; components use generic tokens + Tailwind utilities
5. **Readability first** — all decisions optimized for readability

### Scope Strategy

Tokens scoped to `[data-chat-scope]` in `globals-new.css` to avoid collision with `globals.css`. On promotion to `globals.css`, selector changes to `:root`/`.dark` and `chat-` prefix is removed.

```css
/* globals-new.css (staging) */
[data-chat-scope] { --chat-background: ...; }
.dark [data-chat-scope] { --chat-background: ...; }
```

---

## 2. Value Mapping — Makalah Palette to Tokens

All values are solid OKLCH from the Makalah palette. Zero transparency.

### Light Mode

#### Surface & Text

| Token | OKLCH | Palette |
|---|---|---|
| `--chat-background` | `oklch(0.984 0 0)` | slate-50 |
| `--chat-foreground` | `oklch(0.129 0 0)` | slate-950 |
| `--chat-card` | `oklch(1 0 0)` | neutral-0 (white) |
| `--chat-card-foreground` | `oklch(0.129 0 0)` | slate-950 |
| `--chat-popover` | `oklch(1 0 0)` | neutral-0 (white) |
| `--chat-popover-foreground` | `oklch(0.129 0 0)` | slate-950 |
| `--chat-muted` | `oklch(0.929 0 0)` | slate-200 |
| `--chat-muted-foreground` | `oklch(0.554 0 0)` | slate-500 |
| `--chat-accent` | `oklch(0.968 0 0)` | slate-100 |
| `--chat-accent-foreground` | `oklch(0.129 0 0)` | slate-950 |
| `--chat-secondary` | `oklch(0.929 0 0)` | slate-200 |
| `--chat-secondary-foreground` | `oklch(0.208 0 0)` | slate-900 |

#### Brand & States

| Token | OKLCH | Palette |
|---|---|---|
| `--chat-primary` | `oklch(0.769 0.188 70.08)` | amber-500 |
| `--chat-primary-foreground` | `oklch(1 0 0)` | white |
| `--chat-destructive` | `oklch(0.586 0.253 17.585)` | rose-600 |
| `--chat-destructive-foreground` | `oklch(1 0 0)` | white |
| `--chat-success` | `oklch(0.6 0.118 184.704)` | teal-600 |
| `--chat-success-foreground` | `oklch(1 0 0)` | white |
| `--chat-warning` | `oklch(0.666 0.179 58.318)` | amber-600 |
| `--chat-warning-foreground` | `oklch(1 0 0)` | white |
| `--chat-info` | `oklch(0.588 0.158 241.966)` | sky-600 |
| `--chat-info-foreground` | `oklch(1 0 0)` | white |

#### Border & Focus

| Token | OKLCH | Palette |
|---|---|---|
| `--chat-border` | `oklch(0.929 0 0)` | slate-200 |
| `--chat-input` | `oklch(0.929 0 0)` | slate-200 |
| `--chat-ring` | `oklch(0.769 0.188 70.08)` | amber-500 |

#### Sidebar

| Token | OKLCH | Palette |
|---|---|---|
| `--chat-sidebar` | `oklch(0.968 0 0)` | slate-100 |
| `--chat-sidebar-foreground` | `oklch(0.129 0 0)` | slate-950 |
| `--chat-sidebar-primary` | `oklch(0.446 0 0)` | slate-600 |
| `--chat-sidebar-primary-foreground` | `oklch(1 0 0)` | white |
| `--chat-sidebar-accent` | `oklch(0.929 0 0)` | slate-200 |
| `--chat-sidebar-accent-foreground` | `oklch(0.129 0 0)` | slate-950 |
| `--chat-sidebar-border` | `oklch(0.929 0 0)` | slate-200 |
| `--chat-sidebar-ring` | `oklch(0.769 0.188 70.08)` | amber-500 |

### Dark Mode

#### Surface & Text

| Token | OKLCH | Palette |
|---|---|---|
| `--chat-background` | `oklch(0.208 0 0)` | slate-900 |
| `--chat-foreground` | `oklch(0.968 0 0)` | slate-100 |
| `--chat-card` | `oklch(0.208 0 0)` | slate-900 |
| `--chat-card-foreground` | `oklch(0.968 0 0)` | slate-100 |
| `--chat-popover` | `oklch(0.279 0 0)` | slate-800 |
| `--chat-popover-foreground` | `oklch(0.968 0 0)` | slate-100 |
| `--chat-muted` | `oklch(0.279 0 0)` | slate-800 |
| `--chat-muted-foreground` | `oklch(0.704 0 0)` | slate-400 |
| `--chat-accent` | `oklch(0.372 0 0)` | slate-700 |
| `--chat-accent-foreground` | `oklch(0.984 0 0)` | slate-50 |
| `--chat-secondary` | `oklch(0.279 0 0)` | slate-800 |
| `--chat-secondary-foreground` | `oklch(0.968 0 0)` | slate-100 |

#### Brand & States

| Token | OKLCH | Palette |
|---|---|---|
| `--chat-primary` | `oklch(0.769 0.188 70.08)` | amber-500 |
| `--chat-primary-foreground` | `oklch(1 0 0)` | white |
| `--chat-destructive` | `oklch(0.586 0.253 17.585)` | rose-600 |
| `--chat-destructive-foreground` | `oklch(0 0 0)` | black |
| `--chat-success` | `oklch(0.6 0.118 184.704)` | teal-600 |
| `--chat-success-foreground` | `oklch(0 0 0)` | black |
| `--chat-warning` | `oklch(0.666 0.179 58.318)` | amber-600 |
| `--chat-warning-foreground` | `oklch(0 0 0)` | black |
| `--chat-info` | `oklch(0.588 0.158 241.966)` | sky-600 |
| `--chat-info-foreground` | `oklch(0 0 0)` | black |

#### Border & Focus

| Token | OKLCH | Palette |
|---|---|---|
| `--chat-border` | `oklch(0.372 0 0)` | slate-700 |
| `--chat-input` | `oklch(0.372 0 0)` | slate-700 |
| `--chat-ring` | `oklch(0.769 0.188 70.08)` | amber-500 |

#### Sidebar

| Token | OKLCH | Palette |
|---|---|---|
| `--chat-sidebar` | `oklch(0.129 0 0)` | slate-950 |
| `--chat-sidebar-foreground` | `oklch(0.968 0 0)` | slate-100 |
| `--chat-sidebar-primary` | `oklch(1 0 0)` | white |
| `--chat-sidebar-primary-foreground` | `oklch(0.279 0 0)` | slate-800 |
| `--chat-sidebar-accent` | `oklch(0.279 0 0)` | slate-800 |
| `--chat-sidebar-accent-foreground` | `oklch(0.984 0 0)` | slate-50 |
| `--chat-sidebar-border` | `oklch(0.372 0 0)` | slate-700 |
| `--chat-sidebar-ring` | `oklch(0.769 0.188 70.08)` | amber-500 |

---

## 3. Migration Strategy

### Phase 1: Reset globals-new.css

Rewrite `globals-new.css` completely — remove all `--ds-*` tokens, replace with 34 `--chat-*` tokens from Section 2. Include `@theme inline` bridge so Tailwind utilities work (`bg-chat-background`, `text-chat-foreground`, etc.).

After this phase: all 38 chat components break because `var(--ds-*)` won't resolve. This is expected.

### Phase 2: Component Migration (Wave-by-Wave)

| Wave | Focus | Files | Count |
|---|---|---|---|
| W1 | Shell & entry | ChatLayout, TopBar, ActivityBar, ChatSidebar, ChatWindow, ChatInput, MessageBubble, PanelResizer, SidebarChatHistory, TemplateGrid, ChatProcessStatusBar, ThinkingIndicator, QuickActions | 13 |
| W2 | Artifact workspace | ArtifactPanel, ArtifactTabs, ArtifactToolbar, ArtifactViewer, FullsizeArtifactModal, ArtifactEditor, ArtifactIndicator, ArtifactList, MarkdownRenderer | 9 |
| W3 | Paper/rewind UI | SidebarProgress, SidebarPaperSessions, PaperValidationPanel, RewindConfirmationDialog, PaperSessionBadge, PaperStageProgress, VersionHistoryDialog | 7 |
| W4 | Refrasa | RefrasaToolbar, RefrasaTabContent, RefrasaIssueItem, RefrasaLoadingIndicator | 4 |
| W5 | Indicators | ToolStateIndicator, SearchStatusIndicator, SourcesIndicator, QuotaWarningBanner, InlineCitationChip | 5 |

**Total: 38 files.**

### Per-File Migration Method

**Step 1 — Scan:** Identify all `var(--ds-*)`, hardcoded color classes, and `dark:` prefixes.

**Step 2 — Map:** Replace each occurrence with the correct `--chat-*` token:

| Legacy | New |
|---|---|
| `var(--ds-surface-base)` | `var(--chat-background)` |
| `var(--ds-text-muted)` | `var(--chat-muted-foreground)` |
| `var(--ds-border-subtle)` | `var(--chat-border)` |
| `var(--ds-state-danger-fg)` | `var(--chat-destructive)` |
| `var(--ds-state-success-fg)` | `var(--chat-success)` |
| `var(--ds-artifact-panel-bg)` | `var(--chat-card)` |
| `var(--ds-sidebar-surface)` | `var(--chat-sidebar)` |
| `bg-slate-200 dark:bg-slate-800` | `bg-[var(--chat-muted)]` |
| `text-slate-600 dark:text-slate-300` | `text-[var(--chat-muted-foreground)]` |

**Step 3 — Simplify:** Collapse component-specific tokens to generic roles:

| Legacy --ds-* tokens (many names) | New --chat-* (one token) |
|---|---|
| `--ds-artifact-panel-bg` | `--chat-card` |
| `--ds-artifact-text-primary` | `--chat-card-foreground` |
| `--ds-artifact-text-secondary` | `--chat-muted-foreground` |
| `--ds-artifact-text-muted` | `--chat-muted-foreground` |
| `--ds-artifact-chip-bg` | `--chat-secondary` |
| `--ds-artifact-chip-fg` | `--chat-secondary-foreground` |
| `--ds-artifact-icon-fg` | `--chat-muted-foreground` |
| `--ds-artifact-icon-hover-fg` | `--chat-foreground` |
| `--ds-artifact-action-bg` | `--chat-primary` |
| `--ds-artifact-action-fg` | `--chat-primary-foreground` |

60+ artifact tokens → ~8 generic tokens. Remaining variations handled by Tailwind utilities.

**Step 4 — Validate:** Each file must pass 3 checks:

```bash
grep "var(--ds-" file.tsx          # must return 0
grep "dark:(bg|text|border)" file.tsx # must return 0
grep "var(--chat-" file.tsx         # must return >= 1
```

### Phase 3: Cleanup

1. Remove empty `chat-page-style/` directory
2. Replace `data-ds-scope="chat-v1"` with `data-chat-scope` in chat wrapper
3. Visual verification light/dark mode

### Edge Cases

**Modal backdrop:** Only allowed transparency case. Handled directly in `FullsizeArtifactModal.tsx`:
```tsx
<div className="fixed inset-0" style={{ backgroundColor: 'oklch(0 0 0 / 0.55)' }} />
```

**Shadow:** Uses template shadow tokens (`--shadow-sm`, `--shadow-md`, etc.) which contain transparency by design.

**Token-friendly files (W6 monitor-only):** 6 files already clean — `ChartRenderer`, `MermaidRenderer`, `FileUploadButton`, `ChatMiniFooter`, `RefrasaButton`, `chat/layout.tsx` — review only, no heavy migration.

---

## 4. Validation & Promotion to Global

### Quality Gate per Wave

| Gate | Method | Pass Criteria |
|---|---|---|
| G1: Zero Legacy | `grep -r "var(--ds-" src/components/chat/` | 0 results for files in that wave |
| G2: Zero Dark Prefix | `grep -rn "dark:(bg\|text\|border\|shadow)-" file.tsx` | 0 results |
| G3: Visual Parity | Screenshot comparison light + dark mode | No layout regression or contrast violation (min 4-step gap) |

G1 and G2 are automated (grep). G3 is manual (visual check).

### Exit Criteria: Chat Complete

All 5 conditions must be met:

1. **38 component files** → 0 `var(--ds-*)`, 0 `dark:` color/border/shadow, 0 hardcoded color classes
2. **`globals-new.css`** → contains only 34 `--chat-*` tokens (light + dark) + `@theme inline` bridge
3. **`data-ds-scope="chat-v1"`** → replaced with `data-chat-scope` in chat wrapper
4. **Light & dark mode** → visual check pass, no contrast violations
5. **No transparency** → except shadow tokens and modal backdrop

### Promotion: Chat → Global

After exit criteria are met, the chat page becomes the **reference implementation**.

**Step 1 — Rename tokens:** Remove `chat-` prefix from `globals-new.css`

**Step 2 — Change selector:** `[data-chat-scope]` → `:root` / `.dark`

**Step 3 — Merge to globals.css:** Replace semantic token section. Palette section (slate, amber, emerald, teal, rose, sky) stays intact.

**Step 4 — Update chat components:** `var(--chat-background)` → `var(--background)`, or better: use Tailwind class `bg-background` directly (shadcn `@theme inline` bridge resolves it).

**Step 5 — Remove `data-chat-scope`:** Attribute no longer needed since tokens are global.

**Step 6 — Migrate other pages:** Marketing, admin, dashboard pages migrated using the same pattern — scan hardcoded → map to semantic tokens → validate.

### Deliverables in `chat-page-style-revision/`

| File | Contents |
|---|---|
| `global-css-template.css` | Primary token reference (exists) |
| `design.md` | This design document |
| `implementation-plan.md` | Step-by-step implementation plan (created after design approval) |
