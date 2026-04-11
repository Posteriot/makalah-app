# Naskah Page Redesign v2 — Chat-Parallel Shell

**Date:** 2026-04-12
**Branch:** `naskah-feature`
**Companion docs:**
- `./design-doc.md` (original redesign context, pre-v1)
- `./implementation-plan.md` (v1 — superseded in spirit by this v2)
- `docs/naskah-feature/decisions.md` (D-018, D-019)

**Baseline state:**
- Last committed: `20b87490 refactor(naskah): repoint TopBar Pratinjau link to /naskah/:id`
- Working tree (uncommitted): 8 files modified + `NaskahSidebar.test.tsx` new — this is the **failed v1 redesign** that this v2 plan refines, not discards.
- Tests: 136/136 naskah subset green on current state.

> **For Claude executing this plan:** Do not start coding until the user approves §5 (Open Questions). The plan intentionally stops at decision gates instead of assuming answers.

---

## 1. Context

### 1.1 What failed in v1

The v1 plan (`./implementation-plan.md`) specified a **"minimal shell"** — `NaskahShell` owns only `TopBar` + body slot, no sidebar, no left rail. Goal: strip every non-topbar chat chrome per D-019 "shared shell behavior di level topbar, bukan sidebar."

UI testing revealed the minimal-shell interpretation **overshot**:
- Removing the left rail entirely made the naskah page feel visually unmoored from the chat page.
- The NaskahSidebar (section outline) still needed a home, so v1 ended up putting it inside NaskahPage as a 2-column layout with a fixed `w-64` aside — which then required a completely different visual treatment than the chat sidebar.
- User verdict: *"redesain ini gagal karena tidak sesuai yang saya maksud"*.

The lesson: "sibling page" per D-019 does NOT mean "different shell." It means "same shell scaffolding with different content ownership." Chat and naskah should share the same **visual skeleton** (rail + sidebar + topbar + main), differing only in **what lives inside** each region.

### 1.2 What user actually wants (v2 directive)

Verbatim from user:

1. Halaman naskah merupakan duplikasi dari halaman chat, tanpa buttons di activity bar, dengan ada logo, dan chevron expand collapse sidebar.
2. Sidebar juga meniru halaman chat, pakoknya persis.
3. Border di bawah header harus dihapus karena di halaman chat tidak ada yang bergaya begitu.
4. Background untuk page/paper, gunakan warna background dari chat input di halaman chat.
5. Seluruh warna, border, fonts, menggunakan tokens dari halaman chat di `src/app/globals-new.css`.
6. Styling dan desain halaman naskah ini juga harup adaptif terhadap lightmode dan darkmode.

Translated to engineering contract:

| # | Requirement | Concrete target |
|---|---|---|
| 1 | Rail = chat's ActivityBar minus panel buttons | 48px column with logo + (no panel buttons) + TopBar expand-chevron when sidebar collapsed |
| 2 | Sidebar = chat's ChatSidebar visual skeleton | `aside` with `bg-[var(--chat-accent)]` + `border-r border-sidebar-border` + collapse-header with FastArrowLeft + content + footer |
| 3 | Remove NaskahHeader bottom border | Drop `border-b border-[color:var(--chat-border)]` from `NaskahHeader.tsx:41` |
| 4 | Paper page bg = chat input bg | `NaskahPreview.tsx:92` `bg-white` → `bg-[var(--chat-muted)]`; `text-[#1a1a1a]` → `text-[var(--chat-foreground)]` |
| 5 | All colors/borders/fonts via chat-* tokens | No hardcoded hex, no Tailwind color names outside the `var(--chat-*)` ecosystem |
| 6 | Light + dark mode both work | Point #6 is satisfied automatically by point #5 IFF the `[data-chat-scope]` wrapper is present — see §1.5 blocker below |

### 1.3 Current uncommitted state — how close are we?

The v1 uncommitted work ALREADY landed about 60% of the v2 target. It has:
- Grid layout (`48px ${sidebar} 1fr`) ✓
- Logo in rail ✓
- Collapse-header pattern ✓
- NaskahSidebar rendering inside sidebar column ✓
- Mobile Sheet drawer ✓
- `onSidebarStateChange` callback flow for highlighted sections ✓

Gaps that v2 must close:
- Rail structure diverges from chat's ActivityBar (custom inline vs ActivityBar's `h-11 border-b full-width hover` pattern)
- Sidebar wrapper diverges from chat's ChatSidebar wrapper (`bg-[var(--chat-accent)]` is correct but other details drift)
- NaskahHeader still has `border-b`
- NaskahPreview paper still `bg-white text-[#1a1a1a]` hardcoded
- No sidebar footer (chat has CreditMeter + mobile UserDropdown)
- Sidebar is missing the slot where chat has "+ Percakapan Baru" — decision needed (see §5 Open Questions)

### 1.5 CRITICAL PREREQUISITE — `[data-chat-scope]` gap (empirically verified blocker)

**Discovered during v2 self-audit via Chrome DevTools inspection of the running dev server on 2026-04-12.**

All `--chat-*` custom properties in `src/app/globals-new.css` are scoped inside `[data-chat-scope] { ... }` (lines 599-671 for light mode, lines 674-744 for dark mode). They do NOT exist at `:root` or on `html`. They are ONLY defined for elements that either have `data-chat-scope=""` themselves or are descendants of such an element.

**Chat route has this wrapper:**
```tsx
// src/app/chat/layout.tsx
<div data-chat-scope="" className="...">
  {children}
</div>
```

**Naskah route does NOT.** `src/app/naskah/` has only `[conversationId]/page.tsx` + `page.test.tsx`. No `layout.tsx`. Therefore the entire `/naskah/*` subtree inherits only from the root layout (`src/app/layout.tsx`), which has no chat-scope wrapper.

**Empirical verification performed via Chrome DevTools MCP:**

```js
getComputedStyle(document.documentElement).getPropertyValue('--chat-background')
// → "" (empty string — UNDEFINED at html root)

getComputedStyle(document.body).getPropertyValue('--chat-background')
// → "" (empty string — UNDEFINED at body)

getComputedStyle(document.querySelector('[data-chat-scope]')).getPropertyValue('--chat-background')
// → "lab(8.128% 0 0)" (RESOLVED inside scope, = neutral-900 in dark mode)
```

**Implication for current naskah state:** Every `bg-[var(--chat-background)]`, `bg-[var(--chat-muted)]`, `bg-[var(--chat-accent)]`, `border-[color:var(--chat-border)]`, `text-[var(--chat-foreground)]` in the naskah components currently evaluates to an INVALID custom property reference. Per CSS spec, an invalid `var()` reference causes the property to be treated as unset, which cascades to inherited or initial values:
- `background-color: var(--chat-background)` with undefined `--chat-background` → treated as `unset` → falls back to `transparent` initial value → shows parent's background through
- `color: var(--chat-foreground)` → `unset` → inherits parent
- `border-color: var(--chat-border)` → border color becomes `currentColor` (initial)

**Why the current naskah page LOOKS correct in screenshots** despite broken token resolution: the root body has `bg-background` (via `globals.css` body rule) which in dark mode resolves to `var(--slate-900)` — visually close to chat's `neutral-900`. The naskah components are transparent on top and show body bg through. It's a visual coincidence, not correct rendering.

**Light/dark adaptivity implication (user's point #6):** NOT satisfied by the current state. In dark mode, the naskah "works by coincidence." In light mode, globals.css body bg (slate-50) happens to be close to chat light bg (also slate-50), so it may look OK too. BUT:
- `chat-muted` (dark = neutral-800) has NO globals.css counterpart with matching value. Paper bg change (v2 Task 5) would NOT render the intended neutral-800; it would remain transparent.
- `chat-accent` for sidebar has NO matching globals.css fallback. Sidebar appears transparent, showing body through — no visible panel separation from main content. This is a subtle bug in the current uncommitted redesign.

**This gap is a BLOCKER for v2.** Any v2 work that changes a hardcoded color (`bg-white`, `text-[#1a1a1a]`) to a `var(--chat-*)` token would produce a TRANSPARENT element instead of the intended adaptive token. The fix is a one-file addition and must happen BEFORE any component change.

**Fix: Create `src/app/naskah/layout.tsx` that mirrors `src/app/chat/layout.tsx` exactly.** See §6 Task 0.

---

### 1.4 Chat shell as source of truth — inventory

Read from `src/components/chat/shell/ActivityBar.tsx`, `src/components/chat/ChatSidebar.tsx`, and `src/components/chat/layout/ChatLayout.tsx`. Tokens confirmed in `src/app/globals-new.css`.

**ActivityBar (`src/components/chat/shell/ActivityBar.tsx`):**
```
<nav
  className={cn(
    "flex flex-col items-center gap-0 py-0",
    "w-[var(--activity-bar-width)] min-w-[48px]",
    "border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar)]"
  )}
  data-testid="activity-bar"
>
  <Link href="/" className="flex items-center justify-center h-11 w-full rounded-none border-b border-[color:var(--chat-sidebar-border)] hover:bg-[var(--chat-sidebar-accent)] transition-colors">
    <Image src="/logo/makalah_logo_light.svg" ... /> {/* dark mode */}
    <Image src="/logo/makalah_logo_dark.svg" ... />  {/* light mode */}
  </Link>
  <div className="mt-3 flex flex-col items-center gap-1">
    {/* panel items — chat-history, progress */}
  </div>
</nav>
```

Key tokens: `--chat-sidebar` (bg), `--chat-sidebar-border` (right + bottom border), `--chat-sidebar-accent` (hover). Logo is 20x20 SVG, swap by `.dark:` visibility.

**ChatSidebar wrapper (`src/components/chat/ChatSidebar.tsx` L181-L265):**
```
<aside className="flex h-full min-h-0 w-full flex-col overflow-visible border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)] md:overflow-hidden">
  {/* collapse header (desktop only, when onCollapseSidebar provided) */}
  <div className="flex h-11 shrink-0 items-center justify-end border-b border-[color:var(--chat-sidebar-border)] px-3">
    <button aria-label="Collapse sidebar" className="flex items-center justify-center w-7 h-7 rounded-action text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-foreground)] transition-colors duration-150">
      <FastArrowLeft className="h-4 w-4" />
    </button>
  </div>

  {/* "+ Percakapan Baru" button (desktop only, chat-history only) */}
  <div className="hidden md:block shrink-0 px-3 pb-3 pt-3">
    <Button className="h-10 w-full ... rounded-action border border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar)] text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-accent)]">
      <Plus /> Percakapan Baru
    </Button>
  </div>

  {/* content (SidebarChatHistory or SidebarQueueProgress) */}
  <div data-testid="chat-sidebar-content" className="min-h-0 flex-1 overflow-hidden">...</div>

  {/* footer */}
  <div data-testid="chat-sidebar-footer" className="shrink-0 border-t border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)]">
    <CreditMeter variant="compact" ... />
    <div className="shrink-0 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <UserDropdown ... />
    </div>
  </div>
</aside>
```

Key tokens:
- `--chat-sidebar-border` — right border + internal separators
- `--chat-accent` — sidebar background (distinct from `--chat-sidebar` which is slightly darker — the `--chat-sidebar` token is used by ActivityBar; the inner sidebar uses `--chat-accent`)
- `--chat-sidebar` — used for "+ Percakapan Baru" button fill
- `--chat-sidebar-accent` — hover background
- `--chat-muted-foreground` — icon color (collapse button)

**ChatLayout grid (`ChatLayout.tsx` L263-L271):**
```
gridTemplateColumns =
  "48px" +                              // activity bar
  (isSidebarCollapsed ? "0px" : "{sidebarWidth}px") +   // sidebar
  (isSidebarCollapsed ? "0px" : "2px") + // left resizer
  "1fr" +                                // main
  (isRightPanelOpen ? "2px" : "0px") +  // right resizer (naskah: never open)
  (isRightPanelOpen ? "{panelWidth}px" : "0px") // right panel (naskah: never open)
```

Naskah's simplified grid: `48px ${sidebar||0} ${resizer||0} 1fr` — same pattern minus the right panel.

**TopBar expand chevron (`src/components/chat/shell/TopBar.tsx` L82-L102):**
```
{isSidebarCollapsed && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button ... onClick={onToggleSidebar} aria-label="Expand sidebar">
        <FastArrowRight className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">Expand sidebar</TooltipContent>
  </Tooltip>
)}
```

Already works on naskah route AS LONG AS NaskahShell passes `isSidebarCollapsed` truthfully. Already does.

**ChatInput background (`src/components/chat/ChatInput.tsx` L305, L344):**
```
className="w-full rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-muted)] ..."
```

Confirmed: `bg-[var(--chat-muted)]` + `border border-[color:var(--chat-border)]`. This is the exact treatment user wants for the paper.

---

## 2. Target Contract

### 2.1 Shell skeleton (desktop)

```
┌───────┬────────────────────┬─────────────────────────────────────────┐
│       │ [h-11 collapse ←]  │ [TopBar: (>>) Percakapan | theme | ...] │
│ logo  │──────────────────── │                                         │
│ (h-11)│ (new-chat slot?)    │ NaskahHeader (NO border-b)              │
│       │                     │                                         │
│       │ NaskahSidebar       │ NaskahPreview                           │
│       │ (outline list)      │   [paper: bg-chat-muted,                │
│       │                     │    border-chat-border,                  │
│       │                     │    text-chat-foreground]                │
│       │                     │                                         │
│       │ ───────────────     │                                         │
│       │ footer:             │                                         │
│       │ CreditMeter         │                                         │
└───────┴────────────────────┴─────────────────────────────────────────┘
  48px      288px                              1fr
```

Grid columns: `48px` rail + `288px or 0px` sidebar + `1fr` main. Resizer (2px) deferred — not a user requirement. Match ChatLayout's `sidebarWidth` default (280px) or the 288px already in NaskahShell — **decide in §5**.

### 2.2 Shell skeleton (mobile)

Same as v1 uncommitted: TopBar on top, body fills remaining. Sidebar becomes a Sheet drawer opened via TopBar expand button. No rail column on mobile (rail hides via `min-w-[0]` + grid collapsing, or `md:` conditional).

Per globals-new.css L746-L752: `@media (max-width: 767px)` sets `--activity-bar-width: 0px`. Follow that.

### 2.3 Per-area spec

#### Area 1: Rail (activity bar column, naskah-specific)

**Source of truth:** Mirror `src/components/chat/shell/ActivityBar.tsx` L178-L235 visual structure.

**Differences from chat:**
- No `<div role="tablist">` with panel buttons (chat-history, progress). Naskah has no panels.
- Keep only the logo `<Link href="/">` with identical classes: `flex items-center justify-center h-11 w-full rounded-none border-b border-[color:var(--chat-sidebar-border)] hover:bg-[var(--chat-sidebar-accent)] transition-colors`.

**Nav wrapper classes (identical to ActivityBar):**
```
"flex flex-col items-center gap-0 py-0"
"w-[var(--activity-bar-width)] min-w-[48px]"
"border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar)]"
```

**New file:** `src/components/naskah/NaskahActivityBar.tsx` — mirrors ActivityBar structurally, renders only the logo. No props needed beyond optional className.

**Why new file instead of reusing ActivityBar:**
- ActivityBar has hardcoded `panelItems` array internally and requires `activePanel` / `onPanelChange` props it can't make optional without refactoring.
- Refactoring ActivityBar to make panels optional crosses the "do not touch chat shell" guardrail.
- Parallel file is cheap (~30 lines).

**What NOT to put in the rail:** Expand-sidebar chevron. Chat doesn't put it in the rail either — it lives in TopBar. Let TopBar handle it.

#### Area 2: Sidebar container (naskah-specific)

**Source of truth:** Mirror `src/components/chat/ChatSidebar.tsx` L181-L265 visual structure.

**Differences from chat:**
- No `<SidebarChatHistory>` or `<SidebarQueueProgress>` — use `<NaskahSidebar>` for content
- "+ Percakapan Baru" button: **§5 decision** — omit entirely, or replace with naskah-specific action (e.g., explicit "Update" / "Muat ulang")
- No `manageModeConversationCount` logic

**Wrapper classes (identical to ChatSidebar):**
```
"flex h-full min-h-0 w-full flex-col overflow-visible"
"border-r border-[color:var(--chat-sidebar-border)]"
"bg-[var(--chat-accent)]"
"md:overflow-hidden"
```

**Collapse header (identical):**
```tsx
<div className="flex h-11 shrink-0 items-center justify-end border-b border-[color:var(--chat-sidebar-border)] px-3">
  <button
    onClick={onCollapseSidebar}
    className="flex items-center justify-center w-7 h-7 rounded-action text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-foreground)] transition-colors duration-150"
    aria-label="Collapse sidebar"
  >
    <FastArrowLeft className="h-4 w-4" aria-hidden="true" />
  </button>
</div>
```

**Content area:**
```tsx
<div data-testid="naskah-sidebar-content" className="min-h-0 flex-1 overflow-hidden">
  <NaskahSidebar sections={sidebarSections} highlightedSectionKeys={highlightedSectionKeys} />
</div>
```

**Footer (identical to chat):**
```tsx
<div data-testid="naskah-sidebar-footer" className="shrink-0 border-t border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)]">
  <CreditMeter variant="compact" className="shrink-0 bg-transparent" onClick={...} />
  <div className="shrink-0 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
    <UserDropdown variant="compact" compactLabel="first-name" compactFill placement="top-start" onActionComplete={onCloseMobile} />
  </div>
</div>
```

**New file:** `src/components/naskah/NaskahSidebarContainer.tsx` — wraps the NaskahSidebar content in the same chrome chat uses. Accepts props: `onCollapseSidebar`, `sections`, `highlightedSectionKeys`, `onCloseMobile`.

**Why new file instead of reusing ChatSidebar:**
- ChatSidebar has ~15 props tightly coupled to conversation management (`conversations`, `onNewChat`, `onDeleteConversation`, etc.). Making them optional is a refactor.
- Extracting a shared `SidebarShell` component from ChatSidebar is a larger scope refactor that touches chat code — violates guardrail.

**Trade-off acknowledged:** If ChatSidebar's visual style changes later, NaskahSidebarContainer can drift. Mitigation: the tokens are the same, so most changes land via tokens. For structural changes, a manual re-sync is required.

#### Area 3: NaskahSidebar inner content

**No changes required** except possibly to its wrapper (currently has its own `bg-[var(--chat-accent)]` at L35 which will conflict with NaskahSidebarContainer's own `bg-[var(--chat-accent)]`). Need to drop the redundant wrapper bg inside NaskahSidebar, let the container own it.

Specifically: `NaskahSidebar.tsx:35` currently has:
```
className="flex h-full w-full min-h-0 flex-col bg-[var(--chat-accent)] text-[var(--chat-sidebar-foreground)]"
```

Change to:
```
className="flex h-full w-full min-h-0 flex-col text-[var(--chat-sidebar-foreground)]"
```

Drop `bg-[var(--chat-accent)]` — inherited from container.

Also review `NaskahSidebar.tsx:37-44` — "Outline / Struktur naskah" header. Chat sidebar doesn't have this exact header (it has "Riwayat" rendered inside SidebarChatHistory). **§5 decision**: keep "Outline / Struktur naskah", or mirror chat's list structure more closely?

#### Area 4: NaskahHeader border removal

**Target file:** `src/components/naskah/NaskahHeader.tsx:41`

**Current:**
```tsx
className="border-b border-[color:var(--chat-border)] bg-[var(--chat-background)] px-6 py-5 md:px-8"
```

**Change to:**
```tsx
className="bg-[var(--chat-background)] px-6 py-5 md:px-8"
```

Drop `border-b border-[color:var(--chat-border)]`. Nothing else in the header changes.

#### Area 5: NaskahPreview paper bg

**Target file:** `src/components/naskah/NaskahPreview.tsx:92-94`

**Current:**
```tsx
"rounded-sm border border-[color:var(--chat-border)] bg-white shadow-sm",
"text-[#1a1a1a]",
```

**Change to:**
```tsx
"rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-muted)]",
"text-[var(--chat-foreground)]",
```

Rationale:
- `bg-white` → `bg-[var(--chat-muted)]`: matches chat input fill (`ChatInput.tsx:305`).
- `text-[#1a1a1a]` → `text-[var(--chat-foreground)]`: hardcoded dark text would be invisible on the new dark fill in dark mode. Use the token so it inverts correctly per theme.
- `rounded-sm` → `rounded-lg`: matches chat input's `rounded-lg` radius at `ChatInput.tsx:305, 344`.
- Drop `shadow-sm`: chat input has no shadow, and shadow on a slightly-lighter surface against the same-family bg creates a weird halo. User didn't explicitly ask to drop it but the "pakoknya persis" directive implies visual parity, and chat input has no shadow.

**Comment cleanup:** Lines 42-47 of NaskahPreview.tsx contain a comment explaining why the h1 inherits color instead of using `text-[var(--chat-foreground)]`. With the new `text-[var(--chat-foreground)]` on PageContainer, that comment becomes obsolete. Remove the comment.

---

## 3. Architecture Decisions

### 3.1 Two new files vs refactor chat components

**Chosen:** Create `NaskahActivityBar.tsx` and `NaskahSidebarContainer.tsx` as parallel components.

**Rejected alternative A:** Refactor `ChatSidebar.tsx` + `ActivityBar.tsx` to extract shared `SidebarShell.tsx` + `ActivityBarShell.tsx`. Benefits: true DRY, both pages render the same DOM. Drawbacks: touches chat code (violates guardrail), larger diff, larger regression surface, naskah's sidebar doesn't actually need 80% of ChatSidebar's props.

**Rejected alternative B:** Inline the chat-shell CSS classes directly into `NaskahShell.tsx`. Benefits: zero new files. Drawbacks: NaskahShell balloons, single-responsibility violated, no testable boundary for the rail and sidebar separately.

**Trade-off accepted:** If chat's sidebar visual language changes (e.g., border-right removed), NaskahSidebarContainer can drift until manually re-synced. Mitigated by: (a) tokens are shared, so most changes land automatically; (b) a NaskahSidebarContainer snapshot test pins the current chrome, so drift becomes visible in diffs.

### 3.2 NaskahShell role after refactor

NaskahShell becomes **thin**: just composes `NaskahActivityBar` + `NaskahSidebarContainer` + `TopBar` + body in the grid. The v1 uncommitted state has ~275 lines of shell logic; v2 target is ~150 lines max (rail + sidebar extracted out).

### 3.3 TopBar expand-chevron inert-button fix

The v1 uncommitted state has a bug (flagged in the earlier code review): when `!shouldShowSidebar`, `topBarSidebarCollapsed` is set to `true`, causing TopBar to render an expand button that calls a no-op handler. v2 fixes this:

```diff
- const topBarSidebarCollapsed = isDesktop
-   ? isSidebarCollapsed || !shouldShowSidebar
-   : true
+ const topBarSidebarCollapsed = isDesktop && shouldShowSidebar
+   ? isSidebarCollapsed
+   : false
```

When there's nothing to expand, don't render the expand button at all. On mobile, the expand button moves to triggering the drawer, so keep the mobile path opening the Sheet.

Actually, mobile case needs care: on mobile the rail is hidden (width 0 via the CSS var), so the ONLY way to open the sidebar drawer is the TopBar expand button. Mobile MUST render it. Revised:

```
const topBarSidebarCollapsed = isDesktop
  ? (shouldShowSidebar && isSidebarCollapsed)  // desktop: only true when collapsible and actually collapsed
  : shouldShowSidebar                            // mobile: only render when there's a sidebar to open
```

### 3.4 Footer CreditMeter — keep or omit

**Chosen:** Keep. CreditMeter is a global system indicator, not chat-specific. It reports the user's subscription credits, which are account-level state. Omitting it on the naskah route creates a confusing inconsistency ("where did my credit meter go?").

**Trade-off:** Naskah page imports `CreditMeter` from `@/components/billing`. Adds a small dependency chain to NaskahSidebarContainer. Minimal cost.

---

## 4. Do Not Change Behavior Contracts (carry-forward from v1 plan)

These contracts remain locked, same as v1 §"Do Not Change Behavior Contracts":

1. **D-018 bootstrap logic** — `bootstrappedRef` useEffect + `visibleSnapshot` derivation + `effectiveUpdatePending` override stay byte-identical.
2. **TopBar update-dot semantics** — dot lives inside `Pratinjau` link on chat route only. Naskah route has no dot.
3. **TopBar button visibility rules** — `showNaskahLink`/`showChatLink` gating unchanged.
4. **TopBar production code** — only the `Pratinjau` href was touched (commit `20b87490`). Nothing else.
5. **No refactor of shared hooks or Convex modules.**
6. **No redirect from old route to new route.**
7. **No touching `ChatLayout.tsx`, `ChatSidebar.tsx`, `ActivityBar.tsx`.**
8. **No touching `NaskahPage.tsx` D-018 logic.** (NaskahHeader border removal is in scope; NaskahPreview bg is in scope; NaskahPage internal state flow is NOT.)
9. **No touching `src/proxy.ts`.**
10. **Feature identifier `naskah` stays everywhere** — file names, variable names, data-testid, URL segment.

**Additional v2 locks:**

11. **Do not fix the double state derivation issue flagged in the earlier code review.** That is a separate cleanup task. v2 is a visual-parity refactor, not an architectural cleanup.
12. **Do not rename any existing data-testid.** `naskah-shell`, `naskah-shell-rail`, `naskah-shell-sidebar`, `naskah-sidebar`, `naskah-header`, `naskah-title-page`, `naskah-update-dot` all stay. v2 may ADD new test ids (`naskah-sidebar-content`, `naskah-sidebar-footer`) but must not rename or remove.
13. **`data-chat-scope=""` MUST wrap every page in the `/naskah/*` route subtree.** Via `src/app/naskah/layout.tsx` (see Task 0). Without this, every chat-* token reference in the naskah components resolves to empty and every v2 styling change is silently broken. This is a hard prerequisite for tasks 1-7. Empirical verification is mandatory before declaring Task 0 complete.
14. **Light/dark adaptivity (user requirement #6) is MANDATORY and is satisfied entirely by using `var(--chat-*)` tokens INSIDE the `[data-chat-scope]` wrapper.** No manual `.dark:` Tailwind variants needed in the naskah components. The token system handles the mode swap automatically via the `:root [data-chat-scope] { ... }` (light) and `.dark [data-chat-scope] { ... }` (dark) blocks in `globals-new.css`. Any hardcoded color (like the existing `bg-white` / `text-[#1a1a1a]` on the paper) is a violation of this contract and must be replaced with a token.
15. **Do not add any `dark:` Tailwind variants in the naskah components.** Token-based adaptivity is the ONLY approved mechanism. Inline `dark:` variants would fork the mode semantics from the rest of the chat-scope and create drift.

---

## 5. Open Questions (resolve before coding)

### Q1: Sidebar "new action" slot — what goes here?

Chat sidebar has a `+ Percakapan Baru` button at the top of the content area (ChatSidebar.tsx L205-L237). Naskah doesn't have a "new" action.

**Options:**
- **A.** Omit the slot entirely. Collapse header → content directly. Cleaner but slightly shorter than chat's sidebar.
- **B.** Keep the slot, use it for the naskah "Update" / "Muat Ulang" button when `updatePending === true`. Semantics: "Refresh" is the naskah analog of "new chat." Also gives the user a more visible affordance than the in-header banner (though the banner stays too).
- **C.** Keep the slot, always-visible "Kembali ke Chat" (redundant with TopBar Percakapan button — not great).

**Gue's recommendation:** **A (omit)**. Rationale: the content area naturally fills the vertical space, and the "pakoknya persis" directive is about visual vocabulary (wrapper, border, bg, footer, collapse header), not literal button-for-button parity. Adding an empty slot just for visual symmetry creates a dead area.

**User answer needed.**

### Q2: NaskahSidebar inner "Outline / Struktur naskah" header — keep or restructure?

Current `NaskahSidebar.tsx:37-44`:
```tsx
<div className="shrink-0 px-5 pb-3 pt-4">
  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--chat-muted-foreground)]">Outline</p>
  <p className="mt-1 text-[15px] font-semibold text-[var(--chat-sidebar-foreground)]">Struktur naskah</p>
</div>
```

Chat's equivalent header (inside SidebarChatHistory, rendered in the same vertical position):
```tsx
// approx — "Riwayat 28+" with filter icon
```

**Options:**
- **A.** Keep "Outline / Struktur naskah" as-is. Different text from chat, same visual weight.
- **B.** Rename to match chat's label style: e.g., `Outline` as the top label + `N section` counter.
- **C.** Remove entirely — section list goes straight below collapse header with no label.

**Gue's recommendation:** **A (keep)**. Reason: the "Outline" label gives useful orientation on what the list represents. Matching chat's "Riwayat 28+" pattern would require adding a counter prop and updating tests for no user benefit. The visual weight is similar enough.

**User answer needed.**

### Q3: Sidebar default width — 280px (chat default) or 288px (current uncommitted)?

Chat's ChatLayout defaults `sidebarWidth = DEFAULT_SIDEBAR_WIDTH = 280` (`ChatLayout.tsx:59`).
Current uncommitted NaskahShell uses `SIDEBAR_WIDTH = 288` (`NaskahShell.tsx:39`).

8px difference. Visible only side-by-side.

**Gue's recommendation:** **280px** to match chat exactly. The 8px delta has no functional justification.

**User answer needed (or just approve).**

### Q4: NaskahPreview paper — drop shadow or keep?

Currently: `shadow-sm`.

Chat input has NO shadow. For strict "chat-parity," drop shadow. Without shadow, the paper becomes a flat panel against the dark bg with only the border to delineate it. Acceptable visual.

**Gue's recommendation:** **Drop shadow.** Chat parity > paper metaphor polish. If user misses the shadow later, easy to add back.

**User answer needed.**

### Q5: Sidebar footer on naskah — keep CreditMeter + mobile UserDropdown, or strip?

Chat sidebar footer has both. CreditMeter is a global account indicator. Mobile UserDropdown is a compact user menu on mobile only.

**Options:**
- **A.** Keep both. Full chat parity. Needs CreditMeter + UserDropdown imports in NaskahSidebarContainer.
- **B.** Keep CreditMeter, drop mobile UserDropdown (naskah route's TopBar already has user dropdown).
- **C.** Drop the entire footer.

**Gue's recommendation:** **A (keep both)**. "Pakoknya persis." Plus: the mobile UserDropdown lives in the sidebar footer because mobile TopBar may not have room for it — that logic applies equally on naskah route.

**User answer needed.**

### Q6: PanelResizer between sidebar and main — include or skip?

Chat's ChatLayout has a 2px `PanelResizer` between sidebar and main content that enables drag-to-resize for the sidebar width (`ChatLayout.tsx:341-349`). User didn't mention it in the 6-point directive, but "pakoknya persis" could imply it.

**Options:**
- **A.** Skip. Naskah sidebar uses fixed width (280px or 288px). No drag resize. Simpler, smaller diff, matches v1 uncommitted state.
- **B.** Include. Full chat parity including drag behavior. Requires sidebarWidth state in NaskahShell (ref or useState), a `PanelResizer` mount, and the resize handler plumbing ChatLayout already has.

**Gue's recommendation:** **A (skip)**. Rationale: drag resize is a power-user affordance, not a visual parity concern. Users who look at the two pages side-by-side won't notice the difference until they actually try to drag the divider. Meanwhile, including the resizer adds ~60 lines of state + handlers + tests. Defer to a later phase if users complain.

**User answer needed.**

---

## 6. Task Breakdown

> Execution starts only after §5 open questions are resolved by user.

### Task 0 — PRE-REQUISITE: Create `src/app/naskah/layout.tsx` with `[data-chat-scope]`

**This is the #1 blocker and MUST be done before any other task.** Without it, every chat-* token reference in the naskah components resolves to empty and the entire redesign is visually broken. See §1.5 for empirical proof.

**Files:**
- Create: `src/app/naskah/layout.tsx` — NEW FILE
- Reference: `src/app/chat/layout.tsx` (source of truth — must mirror byte-for-byte except for the component name)

**Implementation:**

```tsx
// src/app/naskah/layout.tsx
import type { ReactNode } from "react"

export default function NaskahLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-chat-scope=""
      className="min-h-dvh max-w-dvw overflow-x-hidden bg-background text-foreground"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {children}
    </div>
  )
}
```

This is literally `src/app/chat/layout.tsx` with the function renamed from `ChatLayout` to `NaskahLayout`. Nothing else changes. The `data-chat-scope=""` attribute is what makes every `var(--chat-*)` reference in the naskah subtree resolve correctly.

**Why mirror exactly instead of reusing chat's layout file:**
- Next.js App Router file-based routing does not allow one layout file to serve two sibling routes. `/chat/*` uses `src/app/chat/layout.tsx`; `/naskah/*` must have its own `src/app/naskah/layout.tsx`.
- Even if we extracted a shared `ChatScopeWrapper` component, each route would still import and wrap it — the file count stays the same.
- Direct mirror keeps diff small and reviewable.

**Empirical verification (must pass before Task 1):**

1. Start the dev server.
2. Log in.
3. Navigate to any `/naskah/<validConversationId>` that has a naskah available.
4. Open Chrome DevTools and evaluate:
   ```js
   const el = document.querySelector('[data-chat-scope]')
   if (!el) throw new Error('No chat scope found')
   const s = getComputedStyle(el)
   console.log({
     chatBackground: s.getPropertyValue('--chat-background').trim(),
     chatMuted: s.getPropertyValue('--chat-muted').trim(),
     chatForeground: s.getPropertyValue('--chat-foreground').trim(),
     chatAccent: s.getPropertyValue('--chat-accent').trim(),
     chatBorder: s.getPropertyValue('--chat-border').trim(),
   })
   ```
5. All five values must be non-empty.
6. In dark mode, `chatBackground` should be approximately `lab(8.128% ...)` (= `oklch(0.208 0 0)` = neutral-900).
7. Toggle to light mode. All five values should change (light palette = slate-*).

If any value is empty, Task 0 failed — `data-chat-scope=""` is either missing from the layout file or the layout file is in the wrong directory. Fix before proceeding.

**Tests:** No unit test changes needed for this task. The layout file is pure structure. Its effect is only visible in integration / real browser.

**Commit boundary:** Task 0 ships as its own commit so the fix is reviewable independently.

```bash
git add src/app/naskah/layout.tsx
git commit -m "fix(naskah): add naskah route layout with data-chat-scope wrapper"
```

### Task 1 — Extract `NaskahActivityBar.tsx`

**Files:**
- Create: `src/components/naskah/NaskahActivityBar.tsx`
- Create: `src/components/naskah/NaskahActivityBar.test.tsx`
- Reference: `src/components/chat/shell/ActivityBar.tsx` L178-L235 (visual skeleton)

**Contract:**
- Props: `className?: string`
- Renders: `<nav data-testid="naskah-activity-bar">` containing ONLY the logo Link to `/`
- Classes MUST match ActivityBar wrapper + logo link byte-for-byte except:
  - `data-testid="naskah-activity-bar"` (not `activity-bar`)
- **Drop ALL of these from the ActivityBar reference code:**
  - `TooltipProvider` wrapper — no tooltips because no buttons
  - The `<div className="mt-3 flex flex-col items-center gap-1">` panel-items wrapper — empty with no children is dead markup
  - The `ActivityBarItem` helper component
  - The `panelItems` array
  - `handlePanelClick` and `handleKeyDown` handlers
  - `useCallback`, `onKeyDown`, `role="tablist"` — none apply
- **Keep from the ActivityBar reference:**
  - The `<nav>` wrapper with `role="navigation"`, `aria-label="Sidebar navigation"`, `data-testid`
  - The logo `<Link href="/">` with identical classes and both light/dark `<Image>` variants
- Light/dark logo SVG swap preserved via `.hidden dark:block` / `.block dark:hidden` pattern

**Tests:**
- Renders logo Link pointing to `/`
- No buttons/tablist rendered
- Wrapper has expected classes (smoke check via `toHaveClass`)
- Light and dark logo variants both exist in DOM (one hidden via `.dark:` selector)

### Task 2 — Extract `NaskahSidebarContainer.tsx`

**Files:**
- Create: `src/components/naskah/NaskahSidebarContainer.tsx`
- Create: `src/components/naskah/NaskahSidebarContainer.test.tsx`
- Reference: `src/components/chat/ChatSidebar.tsx` L181-L265 (visual skeleton)

**Contract:**
- Props: `onCollapseSidebar?: () => void`, `sections: NaskahSection[]`, `highlightedSectionKeys?: NaskahSectionKey[]`, `onCloseMobile?: () => void`, `className?: string`
- Renders: outer `<aside data-testid="naskah-sidebar-container">`, collapse header (only when `onCollapseSidebar` provided), content slot with `<NaskahSidebar>`, footer with `<CreditMeter>` + mobile `<UserDropdown>`
- NO "+ new" button (per Q1 recommendation — user to confirm)
- Wrapper classes MUST match ChatSidebar's outer `<aside>` byte-for-byte except `data-testid`

**Tests:**
- Renders collapse button when `onCollapseSidebar` provided; omits when not
- Renders NaskahSidebar with forwarded props
- Renders CreditMeter in footer
- Footer has `naskah-sidebar-footer` testid
- No "new chat" button (unless Q1 resolves to option B)

### Task 3 — Refactor `NaskahShell.tsx` to use new components

**Files:**
- Modify: `src/components/naskah/NaskahShell.tsx`
- Modify: `src/components/naskah/NaskahShell.test.tsx`

**Changes:**
- Replace the inline rail `<aside data-testid="naskah-shell-rail">` with `<NaskahActivityBar />`
- Replace the inline sidebar `<aside data-testid="naskah-shell-sidebar">` with `<NaskahSidebarContainer ... />`
- Keep the grid layout, desktop/mobile split, Sheet drawer for mobile
- Fix `topBarSidebarCollapsed` derivation per §3.3 (no inert expand button)
- Keep `data-testid="naskah-shell"` on the grid container
- Move the `naskah-shell-rail` testid to NaskahActivityBar (see Task 1)
- Move the `naskah-shell-sidebar` testid to NaskahSidebarContainer (see Task 2)

**Test updates:**
- Existing NaskahShell.test.tsx tests need to be updated for the new child component structure (testids may move)
- Keep all 8 existing test assertions green
- Add one new assertion: when `shouldShowSidebar === false`, TopBar does NOT render an expand button (fixes the inert button bug)

### Task 4 — Remove `NaskahHeader` bottom border

**Files:**
- Modify: `src/components/naskah/NaskahHeader.tsx` (L41)

**Change:**
```diff
- className="border-b border-[color:var(--chat-border)] bg-[var(--chat-background)] px-6 py-5 md:px-8"
+ className="bg-[var(--chat-background)] px-6 py-5 md:px-8"
```

**Test updates:** None. No existing test asserts the border.

### Task 5 — Update `NaskahPreview` paper styling

**Files:**
- Modify: `src/components/naskah/NaskahPreview.tsx` (L42-L47 comment, L92-L94 classes)

**Changes:**
```diff
- "rounded-sm border border-[color:var(--chat-border)] bg-white shadow-sm",
- "text-[#1a1a1a]",
+ "rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-muted)]",
+ "text-[var(--chat-foreground)]",
```

Remove the comment at L42-L47 that explains why h1 doesn't use `text-[var(--chat-foreground)]` — the reason no longer applies.

**Test updates:** None. No test asserts the paper color.

**Visual verification gates (manual smoke):**
- Light mode: paper has light slate-200 fill, slate-950 text. Readable.
- Dark mode: paper has neutral-800 fill, neutral-100 text. Readable.
- Border still visible in both modes.
- Compare side-by-side with chat input bg. Should look like the same surface family.

### Task 6 — Update `NaskahSidebar.tsx` wrapper bg

**Files:**
- Modify: `src/components/naskah/NaskahSidebar.tsx` (L35)

**Change:**
```diff
- className="flex h-full w-full min-h-0 flex-col bg-[var(--chat-accent)] text-[var(--chat-sidebar-foreground)]"
+ className="flex h-full w-full min-h-0 flex-col text-[var(--chat-sidebar-foreground)]"
```

Reason: NaskahSidebarContainer now owns `bg-[var(--chat-accent)]`. Keeping it on NaskahSidebar creates redundant fill that doesn't visually break anything but pollutes the component boundary.

**Test updates:** None if NaskahSidebar.test.tsx doesn't assert the bg class.

### Task 7 — Full verification

Run in this order:
1. `npm exec vitest run src/lib/naskah/ convex/naskah*.ts convex/paperSessions.test.ts src/lib/hooks/useNaskah.test.ts src/components/naskah/ 'src/app/naskah/[conversationId]/' src/components/chat/shell/TopBar.test.tsx src/components/chat/shell/TopBar.naskah-integration.test.tsx src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`
   - **Expected:** all green
2. `npm exec vitest run`
   - **Expected:** same 18 pre-existing failures, no new ones
3. Dev server manual smoke:
   - Navigate to `/chat/<id>` → click "Pratinjau" → `/naskah/<id>` loads
   - Visual: rail has logo only, no panel buttons
   - Visual: sidebar matches chat's visual structure (collapse header + content + footer)
   - Visual: NaskahHeader has NO bottom border
   - Visual: paper is NOT white anymore — uses chat-muted fill
   - Behavior: collapse sidebar → expand chevron appears in TopBar, rail still shows logo
   - Behavior: click TopBar expand → sidebar reopens
   - Behavior: D-018 banner still appears on pending update, click Update still swaps revision + highlights changed sections

### Task 8 — Commit

Suggested commit boundaries:
1. `feat(naskah): extract NaskahActivityBar parallel to chat` (Task 1)
2. `feat(naskah): extract NaskahSidebarContainer parallel to chat` (Task 2)
3. `refactor(naskah): shell now composes parallel rail + sidebar containers` (Task 3)
4. `style(naskah): drop header bottom border for chat parity` (Task 4)
5. `style(naskah): paper uses chat-muted fill per chat input parity` (Tasks 5 + 6)

Or a single bundled commit: `feat(naskah): chat-parallel shell redesign v2`. Decision at execution time based on how the intermediate states compile.

---

## 7. Token Reference

Canonical chat-* tokens used by this redesign. All from `src/app/globals-new.css`.

| Token | Dark mode | Light mode | Used for |
|---|---|---|---|
| `--chat-background` | neutral-900 | slate-50 | Main app bg, outer container around paper |
| `--chat-foreground` | neutral-100 | slate-950 | Primary text (including paper text) |
| `--chat-muted` | neutral-800 | slate-200 | **Paper fill (new)**, chat input fill |
| `--chat-muted-foreground` | neutral-400 | slate-500 | Secondary text, icon color |
| `--chat-accent` | between neutral-900/800 | slate-100 | Sidebar container fill |
| `--chat-sidebar` | neutral-800 | blended slate-100/200 | Activity bar fill |
| `--chat-sidebar-foreground` | neutral-100 | slate-950 | Sidebar text |
| `--chat-sidebar-accent` | between neutral-700/800 | slate-200 | Sidebar hover bg |
| `--chat-sidebar-border` | neutral-700 | slate-300 | Sidebar borders (right + internal) |
| `--chat-border` | neutral-700 | slate-300 | Generic borders (paper border) |

Fonts: `var(--font-sans)` and `var(--font-mono)` via Next.js root layout. No naskah-specific font variables needed.

**How adaptivity works (user requirement #6):**

Every chat-* token has TWO definitions in `globals-new.css`:
- `:root [data-chat-scope]` at L599-L671 — light mode values
- `.dark [data-chat-scope]` at L674-L744 — dark mode values

When `next-themes` toggles the `.dark` class on `html`, the CSS cascade picks up the dark block and the token values swap atomically. No component code needs to check the theme — `bg-[var(--chat-muted)]` just renders the right color for whichever mode is active.

**This ONLY works inside the `[data-chat-scope]` subtree.** Outside the scope, both blocks are inactive and the token is undefined — see §1.5 for why this matters and why Task 0 creates `src/app/naskah/layout.tsx`.

---

## 8. Verification Checklist

**Prerequisite questions (must be answered by user before Task 1):**
- [ ] §5 Q1 (sidebar new-action slot) resolved
- [ ] §5 Q2 (NaskahSidebar inner header) resolved
- [ ] §5 Q3 (sidebar width) resolved
- [ ] §5 Q4 (paper shadow) resolved
- [ ] §5 Q5 (sidebar footer) resolved
- [ ] §5 Q6 (PanelResizer) resolved

**Task 0 — scope wrapper prerequisite:**
- [ ] `src/app/naskah/layout.tsx` created, mirrors `src/app/chat/layout.tsx`
- [ ] `data-chat-scope=""` attribute present on the wrapper div
- [ ] Dev server Chrome DevTools verification: `getComputedStyle(document.querySelector('[data-chat-scope]')).getPropertyValue('--chat-background')` returns a non-empty value on `/naskah/<validId>`
- [ ] Same verification for `--chat-muted`, `--chat-foreground`, `--chat-accent`, `--chat-border`
- [ ] Dark mode: `--chat-background` ≈ `lab(8.128% ...)` (= `oklch(0.208 0 0)` = neutral-900)
- [ ] Light mode: `--chat-background` ≠ dark mode value (confirms light block is also active)

**Task 1-6 — component changes:**
- [ ] `NaskahActivityBar.tsx` created with parallel chat classes (no TooltipProvider, no empty panel div)
- [ ] `NaskahSidebarContainer.tsx` created with parallel chat classes
- [ ] `NaskahShell.tsx` refactored to use both new components
- [ ] `NaskahHeader.tsx` L41 `border-b` removed
- [ ] `NaskahPreview.tsx` L92-L94 paper bg + text tokens swapped (`bg-white` → `bg-[var(--chat-muted)]`, `text-[#1a1a1a]` → `text-[var(--chat-foreground)]`)
- [ ] `NaskahPreview.tsx` comment at L42-L47 about "invert to white in dark mode" removed (obsolete after token swap)
- [ ] `NaskahSidebar.tsx` L35 redundant `bg-[var(--chat-accent)]` dropped
- [ ] `topBarSidebarCollapsed` derivation fixed per §3.3 to not render inert expand button
- [ ] No `dark:` Tailwind variants added anywhere in naskah components (token system handles mode swap — see contract #15)

**Task 7 — test suite:**
- [ ] All 136 naskah subset tests green
- [ ] Full suite: failure set by identity matches baseline `bcb34a6f` (same file names, same `it()` names)
- [ ] No new test failures introduced

**Task 7 — manual smoke (desktop):**
- [ ] Dev server running, logged in
- [ ] Navigate to `/chat/<id>` → click "Pratinjau" → `/naskah/<id>` loads
- [ ] Visual side-by-side with chat page shows same rail/sidebar skeleton
- [ ] Rail on naskah has ONLY logo (no chat/branch icons)
- [ ] Header on naskah has NO bottom border
- [ ] Paper on naskah is NOT white — uses chat-muted fill (`bg-[var(--chat-muted)]` resolved value)
- [ ] Sidebar collapse works → TopBar chevron appears when collapsed
- [ ] Sidebar expand works → collapse chevron back in sidebar
- [ ] D-018 behavior still works (first-visit bootstrap, pending banner, refresh click, section highlight)

**Task 7 — manual smoke (light AND dark mode, user requirement #6):**
- [ ] DARK MODE: naskah page renders with chat-identical dark palette — rail = `neutral-800`, sidebar fill = `between neutral-900/800`, paper fill = `neutral-800`, paper text = `neutral-100`, header text = `neutral-100`, borders visible at `neutral-700`
- [ ] LIGHT MODE: toggle via `next-themes` → naskah page renders with chat-identical light palette — rail = `blended slate-100/200`, sidebar fill = `slate-100`, paper fill = `slate-200`, paper text = `slate-950`, header text = `slate-950`, borders visible at `slate-300`
- [ ] Side-by-side compare: chat page and naskah page in light mode look like the same design family
- [ ] Side-by-side compare: chat page and naskah page in dark mode look like the same design family
- [ ] Mode toggle roundtrip: dark → light → dark — no flicker, no broken styles

**Task 7 — manual smoke (mobile):**
- [ ] Resize browser to mobile width (<768px)
- [ ] Rail column hides (width 0 via `--activity-bar-width: 0px` mobile override)
- [ ] TopBar expand button opens Sheet drawer containing sidebar content
- [ ] Sheet drawer closes on content tap / close button
- [ ] Mobile light AND dark mode both work

**Task 7 — Chrome DevTools empirical re-verification:**
- [ ] On `/naskah/<id>`, evaluate `getComputedStyle` on `document.querySelector('[data-chat-scope]')` → `--chat-background`, `--chat-muted`, `--chat-accent`, `--chat-border`, `--chat-foreground` all return non-empty
- [ ] Evaluate `getComputedStyle(document.querySelector('[data-testid=\"naskah-title-page\"]'))` → `background-color` is a resolved color (not `transparent` / `rgba(0,0,0,0)`)
- [ ] In dark mode, paper `background-color` should match chat input computed value; evaluate chat input: `getComputedStyle(document.querySelector('[data-testid=\"desktop-chat-input\"]')).backgroundColor` should match the naskah paper value

**Scope lock verification (non-regression):**
- [ ] No changes to `ChatLayout.tsx`, `ChatSidebar.tsx`, `ActivityBar.tsx`
- [ ] No changes to `TopBar.tsx` production code (Task 4 of v1 already repointed href; v2 does not touch TopBar again)
- [ ] No changes to `useNaskah.ts`, `usePaperSession.ts`, Convex modules
- [ ] No changes to D-018 bootstrap logic in `src/app/naskah/[conversationId]/page.tsx`
- [ ] No changes to `src/proxy.ts`
- [ ] No `next.config.js` redirects added

---

## 9. Change Log

- **2026-04-12 (initial v2 draft)**: written after v1 UI testing revealed "minimal shell" interpretation missed user intent. Re-grounded in user's 5-point directive for chat-parallel visual vocabulary.
- **2026-04-12 (v2 self-audit patch)**: after user added requirement #6 (light/dark adaptivity), self-audit discovered a **blocker**: `/naskah/*` routes have no `[data-chat-scope]` wrapper because `src/app/naskah/` has no `layout.tsx`. Empirically verified via Chrome DevTools MCP that `--chat-*` tokens evaluate to empty on the naskah route. Current uncommitted redesign works only by visual coincidence with body bg from `globals.css`. Patches applied:
  - §1.2 table updated with requirement #6
  - §1.5 added — full blocker analysis with empirical evidence
  - §4 contracts added — #13 (data-chat-scope mandatory), #14 (token-based adaptivity mandatory), #15 (no dark: Tailwind variants)
  - §5 Q6 added — PanelResizer decision
  - §6 Task 0 added — create `src/app/naskah/layout.tsx` as prerequisite before Task 1
  - §6 Task 1 spec sharpened — explicit list of what to DROP from ActivityBar reference (TooltipProvider, empty panel div, handlers)
  - §7 token reference — added explanation of how adaptivity works
  - §8 checklist expanded from ~20 items to ~50 — prerequisites, Task 0 empirical checks, light+dark mode smoke tests, Chrome DevTools re-verification steps
