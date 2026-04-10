# Naskah Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build phase-1 `Naskah` as a read-only compiled paper workspace with explicit availability, compiled snapshot, manual refresh, and a dedicated fullscreen route.

**Architecture:** Add a dedicated `Naskah` compiler and types in `src/lib/naskah/**`, store availability and compiled snapshot state in Convex, and expose route-aware UI from the chat shell into a new `Naskah` page. Keep artifact as the only authoring source of truth, generate snapshots only from validated artifact references in `stageData`, and defer active export affordances until a separate export path exists.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Convex, existing paper/export helpers, shadcn/ui primitives.

---

### Task 1: Define Naskah Domain Types And Pure Compiler

**Files:**
- Create: `src/lib/naskah/types.ts`
- Create: `src/lib/naskah/compiler.ts`
- Create: `src/lib/naskah/compiler.test.ts`
- Modify: `src/lib/paper/title-resolver.ts`
- Reference: `src/lib/export/content-compiler.ts`
- Reference: `docs/naskah-feature/2026-04-10-naskah-design-doc.md`

**Step 1: Write the failing tests**

Create tests that prove:
- only validated stages become eligible sections
- `topik` can provide `working title`
- `judul` replaces `working title`
- `pembaruan_abstrak` replaces `abstrak`
- invalid or structurally broken sections are held back by the compile guard

```ts
import { describe, expect, it } from "vitest";
import { compileNaskahSnapshot } from "./compiler";

describe("compileNaskahSnapshot", () => {
  it("builds the first snapshot from abstrak plus working title", () => {
    const result = compileNaskahSnapshot({
      stageData: makeStageData({
        topik: validatedStage({ title: "Judul Kerja" }),
        abstrak: validatedStage({ content: "<h1>Abstrak</h1><p>Isi</p>" }),
      }),
      artifactsById: makeArtifacts(),
    });

    expect(result.isAvailable).toBe(true);
    expect(result.title).toBe("Judul Kerja");
    expect(result.sections.map((section) => section.key)).toEqual(["abstrak"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/lib/naskah/compiler.test.ts`

Expected: FAIL because `compileNaskahSnapshot` and helper types do not exist yet.

**Step 3: Write minimal implementation**

Implement:
- `NaskahSectionKey`, `NaskahCompiledSnapshot`, `NaskahAvailability`, `NaskahCompileInput`
- a pure compiler that:
  - reads validated artifact refs from `stageData`
  - maps internal stages to final academic sections
  - resolves title from `topik` then `judul`
  - applies deterministic compile guard
  - returns `isAvailable`, `sections`, and `pageEstimate`

Keep `pageEstimate` simple in phase 1:

```ts
const estimatedPages = Math.max(
  1,
  Math.ceil(compiledPlainText.length / PAGE_ESTIMATE_CHARS_PER_PAGE),
);
```

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/lib/naskah/compiler.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/naskah/types.ts src/lib/naskah/compiler.ts src/lib/naskah/compiler.test.ts src/lib/paper/title-resolver.ts
git commit -m "feat: add naskah compiler primitives"
```

### Task 2: Add Convex Schema And Snapshot Read Model

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/naskah.ts`
- Create: `convex/naskah.test.ts`
- Modify: `convex/_generated/api.d.ts`
- Reference: `convex/paperSessions.ts`
- Reference: `convex/artifacts.ts`

**Step 1: Write the failing tests**

Create tests that prove:
- latest snapshot can be stored and retrieved by `sessionId`
- availability can be read independently
- `update pending` is derived from latest revision vs viewed revision

```ts
import { describe, expect, it } from "vitest";
import { deriveUpdatePending } from "./naskah";

describe("deriveUpdatePending", () => {
  it("returns true when latest revision differs from viewed revision", () => {
    expect(
      deriveUpdatePending({ latestRevision: 4, viewedRevision: 3 }),
    ).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run convex/naskah.test.ts`

Expected: FAIL because the module and schema entries do not exist yet.

**Step 3: Write minimal implementation**

Add a dedicated `naskahSnapshots` table with fields such as:
- `sessionId`
- `revision`
- `compiledAt`
- `status`
- `title`
- `sections`
- `pageEstimate`
- `sourceArtifactRefs`

Add a lightweight viewed-state table, for example `naskahViews`:
- `sessionId`
- `userId`
- `lastViewedRevision`
- `viewedAt`

Implement Convex functions:
- `getAvailability(sessionId)`
- `getLatestSnapshot(sessionId)`
- `getViewState(sessionId, userId)`
- `markViewed(sessionId, revision)`
- `computeUpdatePending(latestRevision, viewedRevision)`

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run convex/naskah.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add convex/schema.ts convex/naskah.ts convex/naskah.test.ts convex/_generated/api.d.ts
git commit -m "feat: add naskah snapshot read model"
```

### Task 3: Trigger Snapshot Rebuild On Validation-Relevant Changes

**Files:**
- Modify: `convex/paperSessions.ts`
- Modify: `convex/artifacts.ts`
- Modify: `convex/paperSessions.test.ts`
- Create: `convex/naskahRebuild.ts`
- Reference: `convex/paperSessions/constants.ts`

**Step 1: Write the failing tests**

Add tests that prove:
- validating `abstrak` creates the first available snapshot
- validating `judul` updates title in the next snapshot
- rewind or invalidation removes ineligible sections from the next snapshot
- unvalidated artifact edits do not replace visible snapshot content

```ts
it("rebuilds naskah after abstrak approval", async () => {
  const result = await approveStageAndFetchNaskah("abstrak");
  expect(result.availability.isAvailable).toBe(true);
  expect(result.snapshot.sections[0].key).toBe("abstrak");
});
```

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run convex/paperSessions.test.ts`

Expected: FAIL on missing rebuild side effects and snapshot records.

**Step 3: Write minimal implementation**

Implement a rebuild helper that:
- loads the session
- reads current validated artifact references
- calls `compileNaskahSnapshot`
- writes a new snapshot only when compiled output meaningfully changes
- updates availability state

Wire it into stage lifecycle points that already change validated state:
- approval
- rewind / invalidation
- artifact replacement only after revalidation

Do not trigger rebuild from plain draft edits.

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run convex/paperSessions.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add convex/paperSessions.ts convex/artifacts.ts convex/paperSessions.test.ts convex/naskahRebuild.ts
git commit -m "feat: rebuild naskah snapshots from validation events"
```

### Task 4: Expose Naskah Availability And Route-Aware Navigation

**Files:**
- Create: `src/app/chat/naskah/page.tsx`
- Modify: `src/app/chat/layout.tsx`
- Modify: `src/components/chat/shell/TopBar.tsx`
- Create: `src/lib/hooks/useNaskah.ts`
- Create: `src/lib/hooks/useNaskah.test.ts`
- Reference: `src/lib/hooks/usePaperSession.ts`
- Reference: `src/components/chat/ChatContainer.tsx`

**Step 1: Write the failing tests**

Create tests that prove:
- `TopBar` shows `Naskah` only when availability is true
- `TopBar` shows the contextual opposite-page button
- the update dot appears only when `update pending` is true
- the new route renders an unavailable guard correctly

```tsx
it("shows the Naskah button only when availability is true", () => {
  render(<TopBar {...makeProps({ naskahAvailable: true })} />);
  expect(screen.getByRole("link", { name: /naskah/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/lib/hooks/useNaskah.test.ts src/components/chat/shell/TopBar.test.tsx`

Expected: FAIL because the hook, route wiring, and navigation behavior do not exist.

**Step 3: Write minimal implementation**

Implement:
- `useNaskah(sessionId)` to read availability, latest snapshot, view state, and pending flag
- route-aware `TopBar` props for `Chat` vs `Naskah`
- a new `/chat/naskah` page that:
  - redirects or guards when unavailable
  - loads the latest snapshot
  - renders a shell placeholder for the next task

Keep export actions disabled or omitted in this phase.

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/lib/hooks/useNaskah.test.ts src/components/chat/shell/TopBar.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/chat/naskah/page.tsx src/app/chat/layout.tsx src/components/chat/shell/TopBar.tsx src/lib/hooks/useNaskah.ts src/lib/hooks/useNaskah.test.ts
git commit -m "feat: add naskah route and topbar entry point"
```

### Task 5: Build Naskah Preview Page, Sidebar, And Paper Layout

**Files:**
- Create: `src/components/naskah/NaskahPage.tsx`
- Create: `src/components/naskah/NaskahHeader.tsx`
- Create: `src/components/naskah/NaskahSidebar.tsx`
- Create: `src/components/naskah/NaskahPreview.tsx`
- Create: `src/components/naskah/NaskahPage.test.tsx`
- Create: `src/components/naskah/naskah.css.ts` or `src/components/naskah/naskahTokens.ts`
- Modify: `src/app/chat/naskah/page.tsx`
- Reference: `src/lib/export/pdf-builder.ts`

**Step 1: Write the failing tests**

Create tests that prove:
- eligible sections render in final academic order
- sidebar labels use academic names, not stage names
- title page appears before `Abstrak`
- primary sections start on a new page container
- page estimate renders as estimate, not final count

```tsx
it("renders the title page before Abstrak", () => {
  render(<NaskahPreview snapshot={makeSnapshot()} />);
  expect(screen.getByText("Halaman Judul")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Abstrak" })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/components/naskah/NaskahPage.test.tsx`

Expected: FAIL because preview components do not exist yet.

**Step 3: Write minimal implementation**

Implement a paper-oriented page with:
- two-row header
- left sidebar outline
- centered A4-like page stack
- title page first
- `Abstrak` on page two
- page containers for major sections

Use existing export layout semantics as reference, not as direct renderer reuse.
Do not add active export UI.

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/components/naskah/NaskahPage.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/naskah/NaskahPage.tsx src/components/naskah/NaskahHeader.tsx src/components/naskah/NaskahSidebar.tsx src/components/naskah/NaskahPreview.tsx src/components/naskah/NaskahPage.test.tsx
git commit -m "feat: add naskah preview page"
```

### Task 6: Add Manual Refresh, Viewed Revision Tracking, And Changed-Section Highlight

**Files:**
- Modify: `convex/naskah.ts`
- Modify: `src/lib/hooks/useNaskah.ts`
- Modify: `src/components/naskah/NaskahPage.tsx`
- Modify: `src/components/naskah/NaskahHeader.tsx`
- Modify: `src/components/naskah/NaskahSidebar.tsx`
- Create: `src/components/naskah/NaskahRefresh.test.tsx`

**Step 1: Write the failing tests**

Create tests that prove:
- banner appears when latest revision differs from viewed revision
- clicking `Update` marks viewed revision and reloads latest snapshot
- changed sections receive temporary highlight after refresh
- entering `Naskah` from `Chat` does not auto-consume the pending state

```tsx
it("shows an update banner when latest revision differs from viewed revision", () => {
  render(<NaskahPage {...makeProps({ latestRevision: 4, viewedRevision: 3 })} />);
  expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/components/naskah/NaskahRefresh.test.tsx`

Expected: FAIL because viewed-state updates and refresh UI do not exist yet.

**Step 3: Write minimal implementation**

Implement:
- `markViewed(sessionId, revision)` mutation call
- pending-state comparison in the hook
- topbar dot and in-page update banner
- a small section-diff helper based on section keys + content hash
- temporary highlight after refresh completes

Do not auto-refresh on route entry.

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/components/naskah/NaskahRefresh.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add convex/naskah.ts src/lib/hooks/useNaskah.ts src/components/naskah/NaskahPage.tsx src/components/naskah/NaskahHeader.tsx src/components/naskah/NaskahSidebar.tsx src/components/naskah/NaskahRefresh.test.tsx
git commit -m "feat: add naskah manual refresh flow"
```

### Task 7: Final Integration, Regression Tests, And Docs Sync

**Files:**
- Modify: `docs/naskah-feature/2026-04-10-naskah-design-doc.md`
- Modify: `docs/naskah-feature/decisions.md`
- Modify: `docs/naskah-feature/context.md`
- Modify: `docs/naskah-feature/correction-checklist-context-decisions.md`
- Create: `src/components/chat/shell/TopBar.naskah-integration.test.tsx`
- Create: `src/app/chat/naskah/page.test.tsx`

**Step 1: Write the failing tests**

Create integration-style tests that prove:
- unavailable sessions do not show the `Naskah` entry point
- available sessions can open the page and read the latest snapshot
- no active export affordance appears in phase 1

```tsx
it("does not render active export controls in phase 1", () => {
  render(<NaskahPage {...makeProps()} />);
  expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/components/chat/shell/TopBar.naskah-integration.test.tsx src/app/chat/naskah/page.test.tsx`

Expected: FAIL until the final wiring is complete.

**Step 3: Write minimal implementation**

Finish the remaining integration glue:
- remove stale export placeholders if any remain
- sync docs only where implementation choices close an open design detail
- tighten prop names and state naming to match `availability`, `update pending`, and `compiled snapshot`

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/components/chat/shell/TopBar.naskah-integration.test.tsx src/app/chat/naskah/page.test.tsx`

Expected: PASS

**Step 5: Run the broader regression set**

Run:
- `npm exec vitest run src/lib/naskah/compiler.test.ts`
- `npm exec vitest run convex/naskah.test.ts`
- `npm exec vitest run convex/paperSessions.test.ts`
- `npm exec vitest run src/components/naskah/NaskahPage.test.tsx`
- `npm exec vitest run src/components/naskah/NaskahRefresh.test.tsx`
- `npm exec vitest run src/components/chat/shell/TopBar.naskah-integration.test.tsx src/app/chat/naskah/page.test.tsx`

Expected: PASS

**Step 6: Commit**

```bash
git add docs/naskah-feature/2026-04-10-naskah-design-doc.md docs/naskah-feature/decisions.md docs/naskah-feature/context.md docs/naskah-feature/correction-checklist-context-decisions.md src/components/chat/shell/TopBar.naskah-integration.test.tsx src/app/chat/naskah/page.test.tsx
git commit -m "feat: ship phase-one naskah workspace"
```

## Execution Notes

- Keep export `Naskah` deferred even if the header visually reserves space for document actions.
- Reuse existing paper/export semantics only as references; do not route phase-1 `Naskah` through completed-only export validation.
- Prefer pure compiler code in `src/lib/naskah/compiler.ts` so tests stay cheap and deterministic.
- Do not derive `update pending` from workflow dirtiness.

## Verification Checklist

- `Naskah` only appears after `abstrak` is validated and minimal compiled content exists.
- `Naskah` never renders unvalidated draft content.
- `TopBar` switches contextually between `Chat` and `Naskah`.
- `Update` is manual, not automatic.
- Changed sections can be highlighted after refresh.
- No active export affordance appears in phase 1.
- Terminology in code and docs matches: `availability`, `update pending`, `compiled snapshot`.
