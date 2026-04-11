# Naskah Page Redesign — Implementation Plan

**Date:** 2026-04-12
**Branch:** `naskah-feature`
**Companion doc:** `./design-doc.md`
**Supersedes:** Task 4 (partial) + Task 5 (partial) of `docs/naskah-feature/2026-04-10-naskah-feature-implementation-plan.md`

> **For Claude:** This plan is executable task-by-task. Do not skip the pre-execution verification step. Do not touch any file outside the explicit file list in each task. Do not refactor `ChatLayout.tsx`, `NaskahPage.tsx`, or any of the shared hooks — they are out of scope.

---

## Goal

Replace the naskah page's reuse of `ChatLayout` with a dedicated `NaskahShell` component, and move the route from `/chat/:conversationId/naskah` to `/naskah/:conversationId`, while preserving every piece of data-flow and refresh-contract logic committed in `bcb34a6f`.

## Architecture

- New component file `src/components/naskah/NaskahShell.tsx` that owns only TopBar + body slot
- New route file `src/app/naskah/[conversationId]/page.tsx` that wraps NaskahPage in NaskahShell
- Old route directory `src/app/chat/[conversationId]/naskah/` deleted entirely
- One-line update to `src/components/chat/shell/TopBar.tsx` (Link href)
- Test assertions in three files updated to match new URL
- No changes to `ChatLayout.tsx`, `NaskahPage.tsx`, `NaskahHeader.tsx`, `NaskahSidebar.tsx`, `NaskahPreview.tsx`, `useNaskah.ts`, `usePaperSession.ts`, or any Convex module
- No changes to `src/proxy.ts` (auth protection inherited via whitelist fallthrough)

## Tech Stack

Next.js 16 App Router, React, TypeScript, Vitest, Convex, shadcn/ui primitives, same as existing phase-1 stack.

---

## Do Not Change Behavior Contracts

This redesign is a **shell swap and route migration only**. The following behavior contracts are LOCKED. If any task instruction in the plan appears to require changing one of these, stop and flag it as a plan bug — do not silently break the contract.

**1. D-018 manual refresh bootstrap logic stays byte-for-byte identical.**
The first-visit bootstrap `useEffect` (with `bootstrappedRef`), the `visibleSnapshot` derivation (`isFirstVisit ? latestSnapshot : viewedSnapshot ?? latestSnapshot`), and the `effectiveUpdatePending` override were committed in `bcb34a6f` to resolve Codex BLOCKER #1. They must survive the redesign unchanged.

**2. TopBar update-dot semantics stay identical.**
`naskah-update-dot` is rendered inside the `Pratinjau` link on the CHAT route, gated on `routeContext === "chat"` AND `naskahAvailable === true` AND `naskahUpdatePending === true` (see `src/components/chat/shell/TopBar.tsx` L108-L125). The dot does NOT exist on the naskah route, and this redesign does NOT move it there. Tests and code must reflect that the dot is a chat-route-only affordance.

**3. TopBar button visibility rules stay identical.**
`showNaskahLink` is gated on `routeContext === "chat"` and renders the `Pratinjau` link. `showChatLink` is gated on `routeContext === "naskah"` and renders the `Percakapan` link. Never both simultaneously. Never swapped. Never relabeled by this redesign.

**4. TopBar production code changes are limited to the `Pratinjau` href.**
The only production line of `TopBar.tsx` this redesign touches is the `href` attribute of the `Pratinjau` `Link`. Label, className, structure, conditional gates, aria attributes, data-testid, and tooltip stay as-is.

**5. No refactor of shared hooks or Convex modules.**
`useNaskah.ts`, `usePaperSession.ts`, `useCurrentUser.ts`, `deriveNaskahUpdatePending`, `convex/naskah.ts`, `convex/naskahRebuild.ts`, and the Convex schema are out of scope. Even a cosmetic change (removing unused imports, renaming a local variable) is forbidden — it would dilute the diff and make this commit hard to audit.

**6. No redirect from old route to new route.**
`/chat/:conversationId/naskah` becomes a 404 after deletion. Do NOT add a `redirects` block in `next.config.js` or a catch-all page that redirects to `/naskah/:id`. Phase 1 is pre-launch; no bookmarks to preserve; clean break is cheaper and clearer.

**7. No touching `ChatLayout.tsx`.**
The chat page continues to use `ChatLayout` exactly as it is. Any change to `ChatLayout.tsx`, however small, is a scope violation.

**8. No touching `NaskahPage.tsx`, `NaskahHeader.tsx`, `NaskahSidebar.tsx`, `NaskahPreview.tsx`.**
Their contracts were stabilized in `bcb34a6f`. Do not refactor, rename, or "improve" them as part of this redesign.

**9. No touching `src/proxy.ts`.**
Auth protection for the new `/naskah/*` route is inherited via the existing whitelist fallthrough pattern. Do not add `/naskah` to PUBLIC_ROUTES. Do not add a path-specific gate.

**10. Feature identifier `naskah` stays everywhere.**
Variable names, prop names, directory names, `data-testid="naskah-update-dot"`, `routeContext: "naskah"`, and the new URL segment `/naskah/` all stay lowercase `naskah`. The redesign is about structure and routing, not rebranding.

If during execution you encounter a step that appears to require violating any of these contracts, stop immediately and report the conflict. The plan has a bug, not the code.

---

## Pre-Execution Verification (run before Task 1)

Before touching any file, run these checks and confirm each result matches expectation. If any check fails, stop and report before proceeding.

### Check A: Grep for `/chat/.../naskah` hardcoded references

```bash
grep -rn --include='*.ts' --include='*.tsx' \
  -E 'chat/[^/]+/naskah|/chat/\${[^}]+}/naskah' \
  src/
```

**Expected:** Exactly 3 matches, all in `src/components/chat/shell/`:
- `src/components/chat/shell/TopBar.tsx` (one Link href)
- `src/components/chat/shell/TopBar.test.tsx` (one test assertion)
- `src/components/chat/shell/TopBar.naskah-integration.test.tsx` (one test assertion)

If more matches are found, add each to Task 4 before proceeding.

### Check B: Confirm `/naskah` is not in PUBLIC_ROUTES

```bash
grep -n 'naskah' src/proxy.ts
```

**Expected:** Zero matches. `src/proxy.ts` must not reference naskah anywhere. Auth inheritance is via the whitelist fallthrough (any non-PUBLIC route is protected).

### Check C: Confirm current naskah page imports ChatLayout

```bash
grep -n 'ChatLayout' 'src/app/chat/[conversationId]/naskah/page.tsx'
```

**Expected:** 2+ matches (import + usage). This confirms we are removing the right dependency.

### Check D: Confirm no other file imports the naskah page directly

```bash
grep -rn --include='*.ts' --include='*.tsx' \
  'app/chat/\[conversationId\]/naskah/page' src/
```

**Expected:** Zero matches. Next.js routes are discovered via the filesystem, so no explicit imports should exist. If a match is found, that is an unexpected import that needs separate handling.

---

## Task 1 — Create `NaskahShell` Component

**Files:**
- Create: `src/components/naskah/NaskahShell.tsx`
- Create: `src/components/naskah/NaskahShell.test.tsx`
- Reference: `src/components/chat/layout/ChatLayout.tsx` L90–L113 (for hook pattern) and L352–L360 (for TopBar prop shape)
- Reference: `src/components/chat/shell/TopBar.tsx` (prop contract)
- Reference: `docs/naskah-feature/naskah-page-redesign/design-doc.md` §6.1

### Step 1: Write the failing tests

Create `src/components/naskah/NaskahShell.test.tsx`.

**Critical constraint — `NaskahShell` must NOT change TopBar behavior.** The redesign only moves the shell mount point; every semantic of `TopBar` (update dot location, button visibility rules, prop shape) stays untouched. This test file MUST NOT assert anything that would force a TopBar refactor. Specifically: the `naskah-update-dot` is rendered inside the `Pratinjau` link on the CHAT route only (`src/components/chat/shell/TopBar.tsx` L108-L125). It does NOT exist on the naskah route where `NaskahShell` mounts. Do not write a test that expects the dot to appear on the naskah route — it never does by design.

**Mocking reference.** Reuse the mocking style for `usePaperSession` and `useNaskah` from `src/components/chat/shell/TopBar.naskah-integration.test.tsx` (same hook signatures, same beforeEach reset pattern). However, that file does NOT mock `convex/react` because `ChatLayout` does not call `useQuery` directly. **`NaskahShell` DOES call `useQuery(api.artifacts.listByConversation)` directly**, so this test file must **add a `convex/react` mock locally**. A more complete reference is `src/app/chat/[conversationId]/naskah/page.test.tsx`, which already demonstrates both the hook mocks and a `convex/react` mock side-by-side.

Cover the following five cases:

1. **Renders TopBar with "Percakapan" button and body children** — given `NaskahShell` always mounts TopBar with `routeContext="naskah"`, assert a link matching `/percakapan/i` is in the document AND that the body children are rendered.
2. **Does NOT render ChatSidebar or ActivityBar chrome** — query for `data-testid="chat-sidebar"` and `data-testid="activity-bar"` and assert both are NOT in the document. These are the test ids exposed by the chat-shell components that `ChatLayout` mounts; `NaskahShell` must never mount them.
3. **Does NOT render a `Pratinjau` link on the naskah route** — `NaskahShell` mounts TopBar with `routeContext="naskah"`, so the `Pratinjau` link (gated on `showNaskahLink` / `routeContext === "chat"` in `TopBar.tsx`) must NOT appear. Assert `screen.queryByRole("link", { name: /pratinjau/i })` returns null. This locks in the contract that the naskah route has no Pratinjau entry point, which is a necessary condition for TopBar's existing `naskah-update-dot` semantics to stay unchanged (the dot lives inside Pratinjau, and if there's no Pratinjau link, there's no dot — exactly as intended).
4. **Passes `useNaskah` availability and update-pending state into TopBar without crashing** — mock `useNaskah` with `{ availability: { isAvailable: true }, updatePending: true }` and render. Assert the Percakapan link is still present and the component does not throw. Do NOT assert anything about dot visibility here — this test case only proves the shell wires the hook return into TopBar's prop contract; the dot's visibility is TopBar's own contract, not NaskahShell's.
5. **Fetches artifact count and feeds it to TopBar** — mock `useQuery(api.artifacts.listByConversation)` to return `[a, b, c]` and assert the TopBar artifact indicator renders in an enabled state (the TopBar tooltip label reads `3 artifak pada sesi ini` when `artifactCount > 0`, per `TopBar.tsx` L188-L191 — use that string to pin the wired prop).
6. **Accepts null conversationId without crashing** — shell must tolerate `conversationId={null}` (race during session load) and render a safe TopBar (no Percakapan link because `showChatLink` is gated on `conversationId` in TopBar).

```tsx
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NaskahShell } from "./NaskahShell"

const mockUseQuery = vi.fn()
const mockUsePaperSession = vi.fn()
const mockUseNaskah = vi.fn()
const mockUseCurrentUser = vi.fn()

// NaskahShell calls useQuery(api.artifacts.listByConversation) directly,
// so we must mock convex/react — unlike TopBar.naskah-integration.test.tsx
// which does not need this mock because ChatLayout does not call useQuery
// directly (all its data flows through hooks that ARE mocked).
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

vi.mock("@/lib/hooks/usePaperSession", () => ({
  usePaperSession: (...args: unknown[]) => mockUsePaperSession(...args),
}))

vi.mock("@/lib/hooks/useNaskah", () => ({
  useNaskah: (...args: unknown[]) => mockUseNaskah(...args),
}))

// Mock the chat-shell test-id-exposing components so any accidental
// mount by NaskahShell becomes visible. These are the exact ids
// TopBar.naskah-integration.test.tsx uses.
vi.mock("@/components/chat/ChatSidebar", () => ({
  ChatSidebar: () => <div data-testid="chat-sidebar" />,
}))
vi.mock("@/components/chat/shell/ActivityBar", () => ({
  ActivityBar: () => <div data-testid="activity-bar" />,
}))

// ... plus the same theme / button / tooltip / UserDropdown mocks
// that TopBar.naskah-integration.test.tsx uses. Reuse them verbatim.

describe("NaskahShell", () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUsePaperSession.mockReset()
    mockUseNaskah.mockReset()
    mockUseCurrentUser.mockReset()

    mockUseCurrentUser.mockReturnValue({
      user: { _id: "users_1", firstName: "Erik" },
      isLoading: false,
    })
    mockUsePaperSession.mockReturnValue({
      session: { _id: "paperSessions_1" },
    })
    mockUseNaskah.mockReturnValue({
      availability: { isAvailable: true },
      updatePending: false,
    })
    mockUseQuery.mockReturnValue([])
  })

  it("merender TopBar dengan tombol Percakapan dan body children", () => {
    render(
      <NaskahShell conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>body-content</div>
      </NaskahShell>,
    )

    expect(
      screen.getByRole("link", { name: /percakapan/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("body-content")).toBeInTheDocument()
  })

  it("tidak merender chat sidebar atau activity bar", () => {
    render(
      <NaskahShell conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>body</div>
      </NaskahShell>,
    )

    expect(screen.queryByTestId("chat-sidebar")).not.toBeInTheDocument()
    expect(screen.queryByTestId("activity-bar")).not.toBeInTheDocument()
  })

  it("tidak merender link Pratinjau pada route naskah", () => {
    render(
      <NaskahShell conversationId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">
        <div>body</div>
      </NaskahShell>,
    )

    // Pratinjau lives inside showNaskahLink which is gated on
    // routeContext === "chat". NaskahShell hardcodes routeContext="naskah",
    // so Pratinjau must never render. This is a direct consequence of
    // TopBar's existing contract — NaskahShell does not change that
    // contract, it only selects routeContext="naskah".
    expect(
      screen.queryByRole("link", { name: /pratinjau/i }),
    ).not.toBeInTheDocument()
  })
})
```

The full test file must also cover cases 4, 5, and 6. The snippet above shows the critical scaffolding, the correct mocking layout, and the three "negative" assertions that lock in the non-contract. Remaining cases follow the same mocking pattern.

### Step 2: Run test to verify it fails

```bash
npm exec vitest run src/components/naskah/NaskahShell.test.tsx
```

**Expected:** FAIL — `NaskahShell` does not exist yet.

### Step 3: Write the minimal NaskahShell implementation

```tsx
// src/components/naskah/NaskahShell.tsx
"use client"

import { useQuery } from "convex/react"
import type { ReactNode } from "react"
import { TopBar } from "@/components/chat/shell/TopBar"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useNaskah } from "@/lib/hooks/useNaskah"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

interface NaskahShellProps {
  conversationId: string | null
  children: ReactNode
}

/**
 * NaskahShell — minimal layout chrome for the /naskah/:conversationId route.
 *
 * Unlike ChatLayout, this shell renders ONLY TopBar + a body slot. No
 * ActivityBar, no ChatSidebar, no PanelResizer, no mobile drawer. Per D-019
 * Naskah is a sibling page of Chat with shared shell behavior limited to
 * the topbar level — this file encodes that constraint as code.
 *
 * The shell fetches its own session + naskah availability + artifact count
 * so TopBar can render contextual buttons (`Percakapan` link, artifact
 * badge). Convex query subscriptions dedupe at the transport layer, so
 * calling these hooks here in parallel with the naskah page's own calls
 * creates one subscription, not two.
 */
export function NaskahShell({ conversationId, children }: NaskahShellProps) {
  const { user } = useCurrentUser()

  const safeConversationId =
    typeof conversationId === "string" && /^[a-z0-9]{32}$/.test(conversationId)
      ? (conversationId as Id<"conversations">)
      : undefined

  const { session } = usePaperSession(safeConversationId)
  const { availability, updatePending } = useNaskah(session?._id)

  const artifacts = useQuery(
    api.artifacts.listByConversation,
    safeConversationId && user?._id
      ? { conversationId: safeConversationId, userId: user._id }
      : "skip",
  )

  return (
    <div className="flex h-dvh flex-col bg-[var(--chat-background)]">
      <TopBar
        isSidebarCollapsed={false}
        onToggleSidebar={() => {}}
        artifactCount={artifacts?.length ?? 0}
        conversationId={conversationId}
        routeContext="naskah"
        naskahAvailable={availability?.isAvailable ?? false}
        naskahUpdatePending={updatePending ?? false}
      />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
```

Key constraints this implementation honors:
- `routeContext="naskah"` is hardcoded, not derived from `usePathname`. The shell is route-specific.
- `isSidebarCollapsed={false}` + no-op `onToggleSidebar` — TopBar's expand button will not render because it is gated on `isSidebarCollapsed === true`.
- `conversationId` is validated with the same 32-char hex regex the current naskah page.tsx uses.
- Convex queries use `"skip"` until `user?._id` is ready, preventing unauthenticated flashes.

### Step 4: Run test to verify it passes

```bash
npm exec vitest run src/components/naskah/NaskahShell.test.tsx
```

**Expected:** PASS (all 5 test cases green).

### Step 5: No commit yet — Task 1 ships together with Task 2.

---

## Task 2 — Create New Route File `src/app/naskah/[conversationId]/page.tsx`

**Files:**
- Create: `src/app/naskah/[conversationId]/page.tsx`
- Create: `src/app/naskah/[conversationId]/page.test.tsx`
- Reference: `src/app/chat/[conversationId]/naskah/page.tsx` (source to transplant from — everything EXCEPT the ChatLayout wrapper)
- Reference: `src/app/chat/[conversationId]/naskah/page.test.tsx` (source to transplant tests from)
- Reference: `src/components/naskah/NaskahShell.tsx` (new from Task 1)

### Step 1: Write the failing tests

Create `src/app/naskah/[conversationId]/page.test.tsx` by copying the current `src/app/chat/[conversationId]/naskah/page.test.tsx` verbatim and then applying these diffs:

- Update the mock for `@/components/chat/layout/ChatLayout` → replace with a mock for `@/components/naskah/NaskahShell`
- Keep all 5 existing test cases intact: steady-state viewed render, D-018 pending view, first-visit bootstrap, unavailable state, no-export affordance

Verify the test file runs and asserts against `NaskahShell`, not `ChatLayout`.

### Step 2: Run test to verify it fails

```bash
npm exec vitest run 'src/app/naskah/[conversationId]/page.test.tsx'
```

**Expected:** FAIL — `src/app/naskah/[conversationId]/page.tsx` does not exist yet.

### Step 3: Write the minimal page implementation

Copy the current `src/app/chat/[conversationId]/naskah/page.tsx` as the starting point, then apply these surgical edits:

1. Replace the `ChatLayout` import with `NaskahShell` import:
   ```tsx
   // remove: import { ChatLayout } from "@/components/chat/layout/ChatLayout"
   import { NaskahShell } from "@/components/naskah/NaskahShell"
   ```
2. Remove the `useQuery(api.artifacts.listByConversation, ...)` call — NaskahShell owns this now.
3. Replace both `ChatLayout` usages (loading branch and main render branch):
   ```tsx
   // loading branch:
   return (
     <NaskahShell conversationId={conversationId}>
       <div className="flex h-full items-center justify-center text-sm text-[var(--chat-muted-foreground)]">
         Memuat naskah...
       </div>
     </NaskahShell>
   )

   // main render branch:
   return (
     <NaskahShell conversationId={conversationId}>
       <NaskahPage
         snapshot={visibleSnapshot}
         latestSnapshot={latestSnapshot ?? undefined}
         updatePending={effectiveUpdatePending}
         onRefresh={markViewed}
       />
     </NaskahShell>
   )
   ```
4. Drop the now-unused `artifacts` variable and `api.artifacts.listByConversation` import if it is no longer referenced.
5. Keep every other line identical to the source — in particular:
   - `useParams`, `safeConversationId` validation
   - `usePaperSession` call
   - `useNaskah` destructure with all six fields including `viewedSnapshot` and `viewState`
   - `deriveFallbackTitleSource` helper
   - `emptyFallbackSnapshot` builder
   - `isFirstVisit` derivation
   - `bootstrappedRef` useEffect that fires `markViewed()` on first visit
   - `visibleSnapshot` computation
   - `effectiveUpdatePending` override
   - Loading gate based on `isSessionLoading || isLoading`

Do NOT alter the bootstrap logic. It was fixed in commit `bcb34a6f` to resolve Codex BLOCKER #1 and must survive the redesign intact.

### Step 4: Run test to verify it passes

```bash
npm exec vitest run 'src/app/naskah/[conversationId]/page.test.tsx'
```

**Expected:** PASS (all 5 test cases green on the new route file).

### Step 5: Commit Task 1 + Task 2 together

```bash
git add \
  src/components/naskah/NaskahShell.tsx \
  src/components/naskah/NaskahShell.test.tsx \
  src/app/naskah/[conversationId]/page.tsx \
  src/app/naskah/[conversationId]/page.test.tsx

git commit -m "feat(naskah): introduce dedicated NaskahShell and /naskah/:id route"
```

---

## Task 3 — Delete the Old Naskah Route Under `/chat/`

**Files:**
- Delete: `src/app/chat/[conversationId]/naskah/page.tsx`
- Delete: `src/app/chat/[conversationId]/naskah/page.test.tsx`
- Delete: `src/app/chat/[conversationId]/naskah/` directory once empty

### Step 1: Verify Task 2 is merged into the working tree

```bash
git log --oneline -1 -- src/app/naskah/
```

**Expected:** A commit from Task 2 that added `src/app/naskah/[conversationId]/page.tsx` and its test.

### Step 2: Delete the old files

```bash
git rm 'src/app/chat/[conversationId]/naskah/page.tsx'
git rm 'src/app/chat/[conversationId]/naskah/page.test.tsx'
```

### Step 3: Verify the directory is empty

```bash
ls 'src/app/chat/[conversationId]/naskah/' 2>&1 || echo "directory already cleaned up"
```

If the directory still exists and is empty, `git rm` above should have handled the files. Next.js is happy to tolerate an empty directory, but we remove it to keep the filesystem clean:

```bash
rmdir 'src/app/chat/[conversationId]/naskah/' 2>&1 || true
```

### Step 4: Verify the old route returns 404

This step is a manual smoke test — cannot be automated inside vitest.

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/chat/anyvalidconvid/naskah`
3. **Expected:** Next.js 404 page.

If instead the old route still loads, check for leftover files or caching. Do not proceed until 404 is confirmed.

### Step 5: Commit

```bash
git commit -m "chore(naskah): remove old /chat/:id/naskah route tree"
```

---

## Task 4 — Update TopBar Link Target

**Files:**
- Modify: `src/components/chat/shell/TopBar.tsx`
- Modify: `src/components/chat/shell/TopBar.test.tsx`
- Modify: `src/components/chat/shell/TopBar.naskah-integration.test.tsx`

### Step 1: Write / update the failing tests

#### 4.1a — `TopBar.test.tsx`

Update the test at the "menampilkan tombol Pratinjau hanya saat availability true di route chat" case. The assertion currently expects:

```tsx
expect(link).toHaveAttribute("href", "/chat/conversation_1/naskah")
```

Change to:

```tsx
expect(link).toHaveAttribute("href", "/naskah/conversation_1")
```

#### 4.1b — `TopBar.naskah-integration.test.tsx`

Update the test at the "menampilkan entry point Pratinjau dan titik update" case. The assertion currently expects:

```tsx
expect(naskahLink).toHaveAttribute(
  "href",
  "/chat/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/naskah",
)
```

Change to:

```tsx
expect(naskahLink).toHaveAttribute(
  "href",
  "/naskah/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
)
```

### Step 2: Run tests to verify they fail

```bash
npm exec vitest run \
  src/components/chat/shell/TopBar.test.tsx \
  src/components/chat/shell/TopBar.naskah-integration.test.tsx
```

**Expected:** FAIL — the assertions expect `/naskah/...` but the production component still renders `/chat/.../naskah`.

### Step 3: Update the production code

In `src/components/chat/shell/TopBar.tsx`, find the Pratinjau `Link`:

```tsx
<Link
  href={`/chat/${conversationId}/naskah`}
  ...
>
  <span>Pratinjau</span>
  ...
</Link>
```

Change `href` to:

```tsx
  href={`/naskah/${conversationId}`}
```

That is the entire production change. Do not touch the button label, className, update dot, or any surrounding logic.

### Step 4: Run tests to verify they pass

```bash
npm exec vitest run \
  src/components/chat/shell/TopBar.test.tsx \
  src/components/chat/shell/TopBar.naskah-integration.test.tsx
```

**Expected:** PASS (5 tests total across the two files).

### Step 5: Commit

```bash
git add \
  src/components/chat/shell/TopBar.tsx \
  src/components/chat/shell/TopBar.test.tsx \
  src/components/chat/shell/TopBar.naskah-integration.test.tsx

git commit -m "refactor(naskah): repoint TopBar Pratinjau link to /naskah/:id"
```

---

## Task 5 — Full Regression Verification

**Files:**
- No new files; this task is verification-only.

### Step 1: Run the naskah test subset

```bash
npm exec vitest run \
  src/lib/naskah/ \
  convex/naskah.test.ts \
  convex/naskahRebuild.test.ts \
  convex/paperSessions.test.ts \
  src/lib/hooks/useNaskah.test.ts \
  src/components/naskah/ \
  'src/app/naskah/[conversationId]/' \
  src/components/chat/shell/TopBar.test.tsx \
  src/components/chat/shell/TopBar.naskah-integration.test.tsx \
  src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx
```

**Expected:** All naskah subset tests PASS. Do NOT gate on an absolute test count — test counts drift as the branch receives unrelated commits, and fixing a pinned count after every drift is noise. The only acceptance criterion is "every test in the subset is green."

### Step 2: Run the full suite

```bash
npm exec vitest run
```

**Expected (acceptance semantics, not absolute numbers):**
- **No new failures introduced** — every test that is green in baseline `bcb34a6f` must still be green after this redesign.
- **Pre-existing failures unchanged by identity, not by count** — the 18 stale failures documented in `docs/naskah-feature/pre-existing-test-debt-2026-04-11.md` must still be the SAME 18 tests (same file, same `it()` name), not merely the same numeric total. If a failure disappears and a new one takes its place, the count matches but the set drifted — that is still a regression and must be investigated.
- Passing count and total test count are NOT gate criteria. They are only informative — record them in the report but do not fail on them.

To verify the failing set by identity rather than by count:

```bash
npm exec vitest run 2>&1 | grep -E "^\s*FAIL\s" | sort > /tmp/post-redesign-failures.txt
# Compare against the baseline set from bcb34a6f
```

The diff between `/tmp/post-redesign-failures.txt` and the baseline list must be empty.

### Step 3: Manual smoke test

In a dev server:

1. Sign in.
2. Navigate to `/chat`. Confirm the chat page loads normally.
3. Pick or create a conversation with a validated abstrak.
4. Click the "Pratinjau" button in TopBar. Confirm the URL becomes `/naskah/<conversationId>` and the naskah page renders WITHOUT ActivityBar or ChatSidebar.
5. Confirm TopBar is present with "Percakapan", theme toggle, artifact badge, user dropdown.
6. Click "Percakapan". Confirm the URL returns to `/chat/<conversationId>` and the full chat shell comes back.
7. Navigate directly to the OLD URL `/chat/<conversationId>/naskah`. Confirm 404.
8. Sign out. Navigate to `/naskah/<conversationId>`. Confirm redirect to `/sign-in?redirect_url=%2Fnaskah%2F<conversationId>`.

### Step 4: Commit any doc updates that arose from verification

If the verification surfaces a gap (e.g., missed grep target, unexpected middleware behavior), add a note to `./implementation-plan.md` under a "Verification Findings" heading and commit it separately.

```bash
git add docs/naskah-feature/naskah-page-redesign/implementation-plan.md
git commit -m "docs(naskah): note verification findings from redesign rollout"
```

If the verification is clean, no commit is needed for Task 5 itself.

---

## Execution Notes

- Do NOT touch `ChatLayout.tsx`. Chat page continues to rely on it unchanged.
- Do NOT touch `NaskahPage.tsx`, `NaskahHeader.tsx`, `NaskahSidebar.tsx`, `NaskahPreview.tsx`. Their contracts were stabilized in `bcb34a6f` and are explicitly out of scope.
- Do NOT touch `useNaskah.ts`, `usePaperSession.ts`, `deriveNaskahUpdatePending`, or any Convex module.
- Do NOT add a redirect from `/chat/:id/naskah` to `/naskah/:id`. The old route is a clean break (pre-launch, no bookmarks to preserve). A redirect adds routing complexity without benefit.
- If any step fails unexpectedly, stop and report. Do not try to fix forward — the plan is designed so each task is reversible by rolling back its commit.

## Verification Checklist

- [ ] Pre-execution grep (Check A) returned exactly 3 matches in `src/components/chat/shell/`
- [ ] `src/proxy.ts` does not reference naskah (Check B)
- [ ] `NaskahShell.tsx` created; every test in `NaskahShell.test.tsx` passes
- [ ] `NaskahShell.test.tsx` explicitly asserts NO `Pratinjau` link renders on the naskah route (contract lock)
- [ ] `NaskahShell.test.tsx` explicitly asserts NO `chat-sidebar` or `activity-bar` test ids render
- [ ] `app/naskah/[conversationId]/page.tsx` created; every test in `page.test.tsx` passes
- [ ] `app/chat/[conversationId]/naskah/` directory removed
- [ ] Old URL returns 404
- [ ] `TopBar.tsx` Link href updated to `/naskah/${conversationId}` — and NOTHING ELSE in TopBar touched
- [ ] Both TopBar test files assert the new URL
- [ ] TopBar update-dot semantics unchanged by this redesign (still inside `Pratinjau` link on chat route, never on naskah route)
- [ ] Naskah test subset: every test green
- [ ] Full suite: failing test set by identity matches baseline `bcb34a6f` exactly — same file names, same `it()` names, no additions, no silent substitutions
- [ ] No new test failures introduced
- [ ] Manual smoke test: all 8 steps in Task 5 Step 3 verified
- [ ] Unauthenticated request to `/naskah/<id>` redirects to `/sign-in?redirect_url=%2Fnaskah%2F<id>`
- [ ] No changes to `ChatLayout.tsx`
- [ ] No changes to `NaskahPage.tsx`, `NaskahHeader.tsx`, `NaskahSidebar.tsx`, `NaskahPreview.tsx`
- [ ] No changes to `useNaskah.ts`, `usePaperSession.ts`, `deriveNaskahUpdatePending`, or any Convex module
- [ ] No changes to `src/proxy.ts`
- [ ] No `redirects` block added to `next.config.js` or equivalent

## Commit Graph (expected after plan execution)

```
<hash>  docs(naskah): note verification findings from redesign rollout (optional, only if verification surfaced something)
<hash>  refactor(naskah): repoint TopBar Pratinjau link to /naskah/:id
<hash>  chore(naskah): remove old /chat/:id/naskah route tree
<hash>  feat(naskah): introduce dedicated NaskahShell and /naskah/:id route
35efee0a chore: expand execution scope policy
09c8a459 refactor(naskah): rename topbar buttons to Pratinjau and Percakapan
bcb34a6f fix(naskah): address Codex audit findings for phase 1
```

Four new commits (three if Task 5 Step 4 produces nothing). Net diff across all four: ~8 files, ~300 lines of production + test code.
