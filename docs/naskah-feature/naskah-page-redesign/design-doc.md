# Naskah Page Redesign — Design Doc

**Date:** 2026-04-11
**Branch:** `naskah-feature`
**Status:** Draft, awaiting implementation
**Supersedes:** Task 4 (partial) and Task 5 (partial) of `docs/naskah-feature/2026-04-10-naskah-feature-implementation-plan.md`

---

## 1. Context

### 1.1 Why this redesign exists

Phase-1 Naskah shipped a working route-aware preview at `/chat/:conversationId/naskah`. During UI testing, the actual rendered page revealed two structural mismatches against the original design intent, neither of which surfaced in code review or unit tests:

1. **The naskah page still wears the chat shell.** The naskah route mounts `ChatLayout`, which in turn mounts `ActivityBar`, `ChatSidebar`, and the whole left-rail chat chrome. A page whose only job is to render a read-only paper preview ends up sharing 4 columns of screen real estate with chat-only navigation that has zero function on this page. D-019 explicitly said Naskah is a sibling page with *shared shell behavior only at the topbar level*; the current implementation violates that by sharing shell behavior at the sidebar level.

2. **The route path `/chat/:conversationId/naskah` reinforces the wrong hierarchy.** The URL names naskah as a subroute of chat, which is the literal opposite of what D-019 asked for. The URL is a semantic contract with the user; when it says `chat/.../naskah` the browser is teaching the user that naskah is owned by chat, even though the design explicitly calls naskah a sibling.

Both issues are traceable to a single implementation shortcut in Task 4:

> `reuses ChatLayout with routeContext="naskah"`

Reusing the chat layout was the cheapest path to getting a working route. It also dragged every chat-shell concern into a page that should not have any. The redesign fixes that at the root instead of patching the symptoms.

### 1.2 What the screenshots show

Four reference screenshots were captured during UI testing on 2026-04-11:

- **Full naskah page** (`2026-04-11 at 23.45.09`) — the current rendered state, showing 4 columns: ActivityBar, ChatSidebar, NaskahSidebar, NaskahPreview, plus TopBar on top.
- **TopBar on naskah route** (`2026-04-11 at 23.48.29`) — "Percakapan" button, theme toggle, artifact count (5), user dropdown.
- **ChatSidebar panel** (`2026-04-11 at 23.49.06`) — "+ Percakapan Baru", "Riwayat", conversation list with artifact counts, "Unlimited" footer — the full conversation history list.
- **ActivityBar** (`2026-04-11 at 23.49.44`) — vertical rail with chat bubble icon and branch icon.

The ChatSidebar and ActivityBar exist to serve **chat authoring** workflows: switching between conversations, toggling history vs timeline, creating new chats. None of those actions are meaningful while the user is reading a compiled paper. They are pure visual debt on the naskah route.

### 1.3 What the plan already said (D-019)

From `docs/naskah-feature/decisions.md:296-310`:

> **D-019: Chat Dan Naskah Dipindahkan Lewat Tombol Kontekstual Di Topbar**
>
> Keputusan:
> - perpindahan antara `Chat` dan `Naskah` dilakukan lewat tombol kontekstual di topbar
> - di halaman `Chat`, yang tampil adalah tombol `Naskah`
> - di halaman `Naskah`, yang tampil adalah tombol `Chat`
> - `Naskah` tidak diperlakukan sebagai halaman anak yang kembali lewat tombol back lokal
> - ini mengandaikan route hierarchy antar halaman saudara dengan shared shell behavior di level topbar, bukan relasi parent-child lokal

The decision is unambiguous. This redesign does not invent new design intent — it pays the debt the original plan incurred by taking a layout shortcut.

### 1.4 Current routing and file structure

```
src/app/
├── chat/
│   ├── layout.tsx                          (thin generic layout)
│   ├── page.tsx                            (chat list / landing)
│   └── [conversationId]/
│       ├── page.tsx                        (chat conversation)
│       └── naskah/
│           ├── page.tsx                    (← naskah CURRENT)
│           └── page.test.tsx
```

The naskah page currently wraps itself in `ChatLayout` with `routeContext="naskah"`, which then mounts the full chat shell (ActivityBar, ChatSidebar, TopBar, PanelResizer).

### 1.5 Current ChatLayout (what we are NOT reusing anymore)

`src/components/chat/layout/ChatLayout.tsx` is 504 lines of chat shell logic including:
- Desktop 6-column CSS grid (activityBar, sidebar, leftResizer, main, rightResizer, panel)
- Mobile sheet drawer pattern with separate ChatSidebar mount
- Sidebar width resize + collapse state + localStorage persistence
- Panel resizer for artifact panel
- Conversation management handlers (`handleNewChat`, `handleDeleteConversation`, etc.)
- `usePaperSession` + `useNaskah` hooks called here for TopBar props
- `resolvedRouteContext` derivation from `usePathname()`

Only one line of this is relevant to the naskah page: the `<TopBar .../>` mount at L352. Everything else is chat concern.

### 1.6 Auth and middleware

`src/proxy.ts` (Next.js 16 proxy middleware) uses a whitelist pattern:

```ts
const PUBLIC_ROUTES = [
  "/", "/sign-in", "/sign-up", "/verify-2fa", "/api",
  "/about", "/pricing", "/blog", "/documentation",
  "/waitinglist", "/privacy", "/security", "/terms",
]
```

Any route NOT in the whitelist is auto-protected via `ba_session` cookie presence check, with a redirect to `/sign-in?redirect_url=...` when missing. The logic is path-prefix based. Moving naskah to top-level `/naskah/*` inherits the same protection automatically — no proxy changes required, and `/naskah/*` is NOT in PUBLIC_ROUTES so it will be gated on first request.

### 1.7 Current hardcoded `/chat/.../naskah` link references

Grep across the repo found only three source files that reference the current URL pattern:

| File | Line | Kind |
|---|---|---|
| `src/components/chat/shell/TopBar.tsx` | 110 | Production `Link` href |
| `src/components/chat/shell/TopBar.test.tsx` | 83 | Test assertion |
| `src/components/chat/shell/TopBar.naskah-integration.test.tsx` | 150 | Test assertion |

Three other matches are in historical documentation (`2026-04-10-naskah-feature-implementation-plan.md`, `codex-audit-prompt.md`, `pre-existing-test-debt-2026-04-11.md`) and do not need updating — they describe state at the time of writing, not active contract.

---

## 2. Goals

1. Remove all chat-shell UI from the naskah page: ActivityBar, ChatSidebar (desktop and mobile), PanelResizer, and every other chat-authoring chrome.
2. Replace the shell with a minimal `NaskahShell` component whose only responsibility is to render `TopBar` + a body slot for `NaskahPage`.
3. Move the route from `/chat/:conversationId/naskah` to `/naskah/:conversationId`.
4. Keep `NaskahPage` and its internal sidebar (section outline) exactly as-is. Only the outer shell and the URL change.
5. Preserve all of the D-018 manual refresh contract and the first-visit bootstrap that Fix 1 in `bcb34a6f` committed. None of that logic is in scope for removal.
6. Preserve the TopBar button ecosystem: "Percakapan" button on naskah route, "Pratinjau" button on chat route, theme toggle, artifact count, user dropdown.
7. Keep auth protection — new route must stay gated by the same cookie-presence middleware.

## 3. Non-Goals

1. Touching `ChatLayout.tsx`. Chat page continues to use it unchanged.
2. Refactoring `NaskahPage`, `NaskahHeader`, `NaskahSidebar`, or `NaskahPreview`. They stay as-is.
3. Refactoring `useNaskah`, `usePaperSession`, or any Convex queries/mutations.
4. Adding artifact panel or any right-side panel to the naskah page.
5. Building a new naskah route tree (no `/naskah/:id/history`, no `/naskah/:id/export`). Phase 1 still ships a single `/naskah/:conversationId` route.
6. Changing mobile layout semantics for NaskahPage itself. The existing fixed `w-64` NaskahSidebar is out of scope for mobile refactor — handled separately if needed.
7. Renaming the feature identifier `naskah` anywhere in code, props, variables, directory names, or documentation. Only the URL path and the shell change.

## 4. Current State vs Target State

### 4.1 Current state (what the screenshots show)

```
┌────────────────────────────────────────────────────────────────────────┐
│ TopBar: Percakapan | theme | artifacts(5) | Erik                       │
├──────┬──────────────┬──────────────────────────────────────────────────┤
│      │              │ NaskahHeader (title + status + badge + pages)    │
│      │              ├──────────────┬───────────────────────────────────┤
│ Act  │ ChatSidebar  │ NaskahSide-  │                                   │
│ ivi  │ (conv list,  │ bar          │ NaskahPreview                     │
│ ty   │ +Percakapan  │ (sections)   │ (A4 paper)                        │
│ Bar  │ Baru, etc)   │              │                                   │
│      │              │              │                                   │
└──────┴──────────────┴──────────────┴───────────────────────────────────┘
URL: /chat/:conversationId/naskah
```

### 4.2 Target state (after redesign)

```
┌────────────────────────────────────────────────────────────────────────┐
│ TopBar: Percakapan | theme | artifacts(5) | Erik                       │
├────────────────────────────────────────────────────────────────────────┤
│ NaskahHeader (title + status + badge + pages)                          │
├──────────────┬─────────────────────────────────────────────────────────┤
│ NaskahSide-  │                                                         │
│ bar          │ NaskahPreview                                           │
│ (sections)   │ (A4 paper)                                              │
│              │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘
URL: /naskah/:conversationId
```

Net changes: 2 columns removed (ActivityBar, ChatSidebar). URL path rewritten. Everything inside the main content area is unchanged.

## 5. Architecture Decisions

### 5.1 Decision: New top-level route `/naskah/:conversationId`

Chosen over the alternative `/chat/naskah/:conversationId` proposed earlier.

**Rationale:**
- The semantic complaint is that the URL says "chat". Moving `naskah` to the front of the path without removing `/chat/` is a half-fix — the user still sees "chat" in the URL.
- Next.js App Router prefers a clean namespace separation. A top-level `app/naskah/` folder mirrors the intent that naskah is a sibling page at the filesystem level, not just at the component level.
- Existing auth protection in `src/proxy.ts` covers any route not in PUBLIC_ROUTES. `/naskah/*` is not in that whitelist, so it inherits the same cookie-presence gate as `/chat/*` without any proxy changes.
- Zero routing conflict: `app/chat/[conversationId]/page.tsx` stays where it is; `app/naskah/[conversationId]/page.tsx` is new and independent.

**Rejected alternative A:** `/chat/:conversationId/naskah` (current state, no change) — fails D-019 semantic hierarchy.

**Rejected alternative B:** `/chat/naskah/:conversationId` (user's initial proposal) — still carries `/chat/` prefix; only a cosmetic rearrangement; asymmetric file structure mixing static and dynamic segments under `app/chat/`.

**Rejected alternative C:** `/naskah/:paperSessionId` keyed by paper session id instead of conversation id — out of scope. The existing data flow keys everything off `conversationId`, and switching keys would require refactoring `usePaperSession`, `useNaskah`, and every callsite. Phase 1 is not the right time for that kind of data model shift.

### 5.2 Decision: Create `NaskahShell` as a dedicated component

`NaskahShell` is a new component file at `src/components/naskah/NaskahShell.tsx`. Its only responsibility is to render `TopBar` and a body slot.

**Rationale:**
- Separates layout chrome from page logic. The new page.tsx stays focused on data fetching and routing concerns; the shell owns visual shell.
- Opens the door for future naskah sub-pages (phase 2+: possibly `/naskah/:id/history`, `/naskah/:id/export`) to reuse the same shell.
- Testable in isolation (a shell snapshot test could pin the rendered chrome independently of NaskahPage internals).
- Mirrors the `ChatLayout` pattern at a much smaller scale, so the two shells are architecturally parallel.

**Rejected alternative:** Inline the minimal shell inside `src/app/naskah/[conversationId]/page.tsx`. That keeps the file count lower but bundles routing concerns with layout concerns, which is exactly the kind of tangle we are trying to avoid by doing this redesign in the first place.

### 5.3 Decision: NaskahShell owns its own `useNaskah` + `usePaperSession` calls

Instead of the page passing `availability`/`updatePending` down to the shell as props, the shell hooks into the same queries independently.

**Rationale:**
- Follows the same pattern as `ChatLayout` which calls `usePaperSession` + `useNaskah` on its own to feed TopBar.
- Convex query subscriptions dedupe at the transport layer, so calling the same query in two places in the tree creates one subscription, not two.
- Decouples shell from page: the shell does not need to know what the page is fetching; it reads its own contract.
- Keeps the page component simpler — it doesn't thread shell-specific props through its own signature.

**Trade-off accepted:** The shell and the page both call `useNaskah(session?._id)`. If the hook contract ever drifts between calls, there is some risk of drift. Mitigated by: both callers consume the same return shape, and the deduplication happens at Convex level, not at React level.

### 5.4 Decision: TopBar props that don't apply to naskah are passed as no-ops

`TopBar` expects `isSidebarCollapsed` and `onToggleSidebar` props to drive the "expand sidebar" button on the chat page. On the naskah page there is no collapsible sidebar to expand.

**Chosen approach:** Pass `isSidebarCollapsed={false}` and `onToggleSidebar={() => {}}` from NaskahShell. TopBar's existing conditional `{isSidebarCollapsed && (...)}` gates the expand button on `isSidebarCollapsed`, so passing `false` means the button does not render. No TopBar refactor required.

**Rejected alternative:** Refactor TopBar to make `isSidebarCollapsed` and `onToggleSidebar` optional with safe defaults. That is a larger change that benefits only this one callsite, and the current no-op approach is self-documenting (the shell tells TopBar "no sidebar here, nothing to toggle").

### 5.5 Decision: `artifactCount` stays visible in TopBar on naskah route

TopBar shows an artifact count badge. The question is whether to keep it on naskah route.

**Chosen approach:** Keep it. The naskah page is still a view of the same session — if the session has N artifacts, that count is factually true on both routes. Hiding it creates a confusing inconsistency ("where did my artifact count go?").

**Implementation:** NaskahShell fetches `artifacts` list via `api.artifacts.listByConversation` the same way the current naskah page.tsx does now, and passes `artifactCount` to TopBar.

### 5.6 Decision: Mobile layout is out of scope for this redesign

The current `NaskahPage` component renders a fixed `w-64` NaskahSidebar that will overflow on phones. That is a pre-existing gap from Task 5.

**Chosen approach:** Do not fix mobile in this redesign. The redesign is about shell and route, not about responsive breakpoints. A dedicated mobile pass should follow as a separate unit of work.

**Implementation implication:** `NaskahShell` uses the same desktop-oriented layout as the current naskah page. If a mobile fix is needed urgently, it can ship as a follow-up PR without touching any of the architecture this redesign puts in place.

## 6. Component Boundaries

### 6.1 NaskahShell (new)

**File:** `src/components/naskah/NaskahShell.tsx`

**Responsibilities:**
- Mount `TopBar` with hardcoded `routeContext="naskah"`
- Fetch `usePaperSession(conversationId)` and `useNaskah(session?._id)` to feed TopBar with `naskahAvailable` and `naskahUpdatePending`
- Fetch `artifacts` via `api.artifacts.listByConversation` to feed `artifactCount`
- Render body slot (`children`) below TopBar
- Full-height flex column layout bound to the chat background token
- Pass `isSidebarCollapsed={false}` and `onToggleSidebar={() => {}}` to TopBar (no-op — no collapsible sidebar on this route)

**Props:**
- `conversationId: string | null`
- `children: ReactNode`

**What it does NOT do:**
- Render ActivityBar, ChatSidebar, PanelResizer, mobile Sheet, or any chat chrome
- Handle sidebar state, panel resize, or mobile drawer
- Dispatch chat-specific actions (new conversation, delete conversation, etc.)
- Own the naskah page data (viewed snapshot, latest snapshot, refresh flow) — that stays in the page component

### 6.2 NaskahPage (unchanged)

`src/components/naskah/NaskahPage.tsx` stays exactly as-is. Its internal contract (viewed vs latest snapshot, pending banner suppression, refresh flow) was fixed by commit `bcb34a6f` and must not be touched by this redesign.

### 6.3 Naskah page route file

**File:** `src/app/naskah/[conversationId]/page.tsx` (new file, not a move — content is rewritten to use NaskahShell)

**Responsibilities:**
- Read `conversationId` via `useParams`
- Validate conversationId shape (`^[a-z0-9]{32}$`)
- Fetch `usePaperSession` + `useNaskah` (same as current naskah page)
- Fire first-visit bootstrap `markViewed` via useEffect (preserved from bcb34a6f)
- Compute `visibleSnapshot`, `effectiveUpdatePending`, `isFirstVisit` (preserved from bcb34a6f)
- Render `<NaskahShell conversationId={conversationId}><NaskahPage ... /></NaskahShell>`
- Show loading placeholder while `isSessionLoading || isLoading`

**What changes from the current file at `src/app/chat/[conversationId]/naskah/page.tsx`:**
- Import `NaskahShell` instead of `ChatLayout`
- Drop `artifactCount` prop passing (NaskahShell fetches its own)
- Drop `routeContext="naskah"` prop (NaskahShell hardcodes it)
- Everything else (bootstrap useEffect, visibleSnapshot derivation, banner suppression) stays line-for-line identical

### 6.4 Old naskah page (removed)

**File:** `src/app/chat/[conversationId]/naskah/page.tsx` is **deleted**. Same for `page.test.tsx` in the same folder.

**Why delete instead of redirect:** Phase 1 is pre-launch. There are no external bookmarks to preserve. A redirect handler would add routing complexity without benefit. Clean break is cheaper and clearer.

### 6.5 TopBar (one-line update)

**File:** `src/components/chat/shell/TopBar.tsx`

**Change:** Line 110 — Link href from `/chat/${conversationId}/naskah` to `/naskah/${conversationId}`. That is the entire production code change in TopBar. Everything else — label (already "Pratinjau"/"Percakapan"), structure, styles, update dot — is unchanged.

## 7. Data Flow

```
/naskah/:conversationId (URL)
        │
        ▼
src/app/naskah/[conversationId]/page.tsx
        │
        │  (a) useParams → conversationId
        │  (b) usePaperSession → session
        │  (c) useNaskah → availability, latestSnapshot, viewedSnapshot,
        │                  viewState, updatePending, markViewed, isLoading
        │  (d) useEffect (first-visit bootstrap) → markViewed(latestRev)
        │  (e) compute visibleSnapshot, effectiveUpdatePending, isFirstVisit
        │
        ▼
<NaskahShell conversationId={conversationId}>
        │
        │  (f) usePaperSession (own call, dedupe at Convex layer)
        │  (g) useNaskah (own call, dedupe at Convex layer)
        │  (h) useQuery(api.artifacts.listByConversation) → artifactCount
        │
        │  Renders TopBar (routeContext="naskah", no-op sidebar props)
        │  Renders children (NaskahPage)
        │
        ▼
<NaskahPage snapshot={visibleSnapshot}
            latestSnapshot={latestSnapshot}
            updatePending={effectiveUpdatePending}
            onRefresh={markViewed} />
```

## 8. Route Migration

| Aspect | Current | After redesign |
|---|---|---|
| URL | `/chat/:conversationId/naskah` | `/naskah/:conversationId` |
| File | `app/chat/[conversationId]/naskah/page.tsx` | `app/naskah/[conversationId]/page.tsx` |
| Layout | `ChatLayout` with `routeContext="naskah"` | `NaskahShell` |
| Test file | `app/chat/[conversationId]/naskah/page.test.tsx` | `app/naskah/[conversationId]/page.test.tsx` |
| TopBar Link | `href={/chat/${id}/naskah}` | `href={/naskah/${id}}` |
| Auth gate | proxy.ts cookie check (not in PUBLIC_ROUTES) | proxy.ts cookie check (not in PUBLIC_ROUTES) |
| Middleware | No change needed | No change needed |

## 9. Risk Analysis

### 9.1 Auth protection

**Risk:** If something in the repo relies on the literal prefix `/chat/` for authz (e.g., "authenticated area starts with `/chat`"), moving to `/naskah/*` could bypass protection.

**Mitigation:**
- `src/proxy.ts` uses a whitelist pattern, not a `/chat`-prefix pattern. `/naskah/*` is outside the whitelist, so it is auto-protected.
- Grep confirms no other middleware or `/chat/`-prefix hardcoding.

**Residual risk:** Low. One verification step during implementation: hit `/naskah/abc123` without auth and confirm redirect to `/sign-in?redirect_url=%2Fnaskah%2Fabc123`.

### 9.2 Test drift

**Risk:** Three test files assert the current URL string. If the redesign changes those strings in the wrong direction or misses a file, tests will lie about correctness.

**Mitigation:**
- Grep scope is small (3 files). Each is identified by exact line in §1.7.
- Implementation plan Task 4 explicitly enumerates every assertion that must be updated.

### 9.3 Subscription double-fetching

**Risk:** Shell and page both call `useNaskah(session?._id)`. In theory this could create two subscriptions.

**Mitigation:**
- Convex subscriptions dedupe by query identity at the client transport layer.
- Same pattern is used today in `ChatLayout`, where the layout calls `useNaskah` and the naskah page calls `useNaskah` simultaneously.
- Verified: existing code works without drift.

### 9.4 `ChatLayout` still referenced elsewhere

**Risk:** If any non-chat callsite imports `ChatLayout`, removing it from naskah's file tree while keeping the file intact still works, but if we accidentally modify `ChatLayout` logic while doing the redesign, chat page could regress.

**Mitigation:**
- This redesign explicitly does NOT touch `ChatLayout.tsx`. Non-negotiable.
- Implementation plan makes this explicit as a constraint.

### 9.5 Ongoing inbound links from chat UI

**Risk:** The chat UI (ChatSidebar, artifact list, progress list, etc.) may have inbound links to naskah that we have not found yet.

**Mitigation:**
- Grep across `src/` for any string matching `/chat/[^/]*/naskah` returned only the three files already identified.
- Implementation plan Task 4 includes a post-migration grep as a verification step to catch anything that was missed or added by a future unrelated commit.

### 9.6 Mobile layout regression

**Risk:** The current mobile shell comes from `ChatLayout`'s mobile Sheet pattern. Removing ChatLayout removes the mobile pattern, and `NaskahPage` is not responsive (fixed `w-64` sidebar).

**Mitigation:**
- Out of scope per §3 non-goal #6. Mobile is a separate follow-up.
- Implementation should verify desktop works before shipping; mobile verification defers to the follow-up.

## 10. Success Criteria

A redesign is successful when all of the following hold on a fresh dev build:

1. Navigating to `/naskah/:conversationId` renders a page with TopBar, NaskahHeader, NaskahSidebar, NaskahPreview — and NOTHING ELSE from the chat shell.
2. The TopBar "Percakapan" button is present and links to `/chat/${conversationId}`.
3. Navigating to `/chat/:conversationId` and clicking the TopBar "Pratinjau" button routes to `/naskah/:conversationId`.
4. The old URL `/chat/:conversationId/naskah` returns a 404 (clean break, no redirect).
5. `useNaskah`, `usePaperSession`, the first-visit bootstrap, and the manual refresh banner all still work on the new route.
6. Visiting `/naskah/abc123` without a `ba_session` cookie redirects to `/sign-in?redirect_url=%2Fnaskah%2Fabc123`.
7. All existing naskah tests (compiler, rebuild, hook, page, refresh, TopBar) pass on the new architecture.
8. The full vitest suite reports the same 18 pre-existing failures as `bcb34a6f` (no new regressions).

## 11. Open Questions

None. All architectural decisions are resolved. Implementation can proceed against §6 component boundaries and §8 route migration.

## 12. Change Log

- **2026-04-11**: Initial draft, created after Codex audit Fix 1 (bcb34a6f) shipped and UI testing revealed the shell/route mismatch.
