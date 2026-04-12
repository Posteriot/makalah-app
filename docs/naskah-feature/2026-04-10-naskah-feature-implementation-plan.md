# Naskah Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build phase-1 `Naskah` as a read-only compiled paper workspace with explicit availability, compiled snapshot, manual refresh, and a dedicated fullscreen route.

**Architecture:** Add a dedicated `Naskah` compiler and types in `src/lib/naskah/**`, store availability and compiled snapshot state in Convex, and expose route-aware UI from the chat shell into a new `Naskah` page. Keep artifact as the only authoring source of truth, generate snapshots only from validated artifact references in `stageData`, and defer active export affordances until a separate export path exists.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Convex, existing paper/export helpers, shadcn/ui primitives.

---

## Codebase Anchors (verified pre-execution)

These are the real files and symbols the plan integrates with. Any task that references a different name is a bug and must be corrected to match this list:

- **Stage approval mutation:** `convex/paperSessions.ts::approveStage` — sets `stageData[currentStage].validatedAt = now`, advances `currentStage`, and (for `judul` stage) already writes `paperTitle` and `workingTitle` on the session. This is one rebuild trigger.
- **Rewind mutation:** `convex/paperSessions.ts::rewindToStage` — calls `clearValidatedAt(...)` and `invalidateArtifactsForStages(...)` for the invalidated range. This is the second rebuild trigger.
- **Stage order constant:** `convex/paperSessions/constants.ts::STAGE_ORDER`. Canonical list: `gagasan`, `topik`, `outline`, `abstrak`, `pendahuluan`, `tinjauan_literatur`, `metodologi`, `hasil`, `diskusi`, `kesimpulan`, `pembaruan_abstrak`, `daftar_pustaka`, `lampiran`, `judul`. The naskah compiler's section mapping MUST use these exact keys.
- **Existing export compiler (reference only, do NOT reuse for phase 1):** `src/lib/export/content-compiler.ts::compilePaperContent` — reads `stageData` directly and implements the `pembaruan_abstrak → abstrak` override via `ringkasanPenelitianBaru ?? ringkasanPenelitian` and `keywordsBaru ?? keywords`. Mirror this override semantics in the naskah compiler, but keep the code path independent.
- **Validated artifact reference shape:** per-stage entries in `session.stageData` have the shape `{ validatedAt?: number; artifactId?: Id<"artifacts">; revisionCount?: number; ...stageFields }`. A stage is a valid naskah input iff `validatedAt` is a number AND (for content stages) either `artifactId` resolves to a non-invalidated artifact OR the stage still carries legacy inline fields such as `ringkasanPenelitian`. Fetch artifact content via `ctx.db.get(artifactId as Id<"artifacts">)` and check `invalidatedAt` is undefined before using it.
- **Session-level `isDirty`:** `convex/paperSessions.ts` maintains `session.isDirty` at session level and resets it to `false` on approve. Do NOT conflate this with naskah `update pending`. Naskah `update pending` is a per-user comparison of `naskahSnapshots.revision` vs `naskahViews.lastViewedRevision`.
- **Title resolver:** `src/lib/paper/title-resolver.ts::resolvePaperDisplayTitle` already handles `paperTitle > workingTitle > conversationTitle > fallback`. `approveStage` already writes both `paperTitle` and `workingTitle` when stage `judul` is approved. The compiler reads `session.paperTitle`/`session.workingTitle` and optionally `stageData.topik` for a phase-1 working title fallback; **do not modify `title-resolver.ts`** — it is a reference only.
- **Chat shell host:** `src/components/chat/layout/ChatLayout.tsx` is where `TopBar` is mounted and where session/conversation context is available. TopBar today takes only `isSidebarCollapsed`, `onToggleSidebar`, `artifactCount` — no session. Naskah availability and `updatePending` props must be plumbed from `ChatLayout.tsx` into `TopBar.tsx`. Do NOT assume TopBar can fetch session state on its own.
- **Active route for chat:** `src/app/chat/[conversationId]/page.tsx`. Follow the same route pattern for the naskah page (see Task 4).
- **Convex test harness:** convex tests in this repo use **vitest with a hand-mocked `ctx` object** (see `convex/paperSessions.test.ts`), NOT `convex-test`. New convex tests MUST follow the mocked-ctx pattern.
- **Convex generated types (`convex/_generated/api.d.ts`):** **auto-generated** by `npx convex dev` / `npx convex codegen`. NEVER edit or commit it manually. It updates automatically once new Convex functions are defined and codegen runs.

---

### Task 1: Define Naskah Domain Types And Pure Compiler

**Files:**
- Create: `src/lib/naskah/types.ts`
- Create: `src/lib/naskah/compiler.ts`
- Create: `src/lib/naskah/compiler.test.ts`
- Reference: `src/lib/paper/title-resolver.ts` (do NOT modify — existing resolver already covers `paperTitle > workingTitle > conversationTitle > fallback`)
- Reference: `src/lib/export/content-compiler.ts` (mirror the `pembaruan_abstrak ?? abstrak` override, but keep code path independent)
- Reference: `convex/paperSessions/constants.ts` (STAGE_ORDER canonical keys)
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
      stageData: {
        topik: { validatedAt: 1, definitif: "Judul Kerja" },
        abstrak: { validatedAt: 2, artifactId: "art_abstrak_1" },
      },
      artifactsById: {
        art_abstrak_1: { _id: "art_abstrak_1", content: "Isi abstrak." },
      },
      paperTitle: null,
      workingTitle: null,
    });

    expect(result.isAvailable).toBe(true);
    expect(result.title).toBe("Judul Kerja");
    expect(result.titleSource).toBe("topik_definitif");
    expect(result.sections.map((s) => s.key)).toEqual(["abstrak"]);
  });
});
```

Fixture fields above use real schema names from `convex/schema.ts:537-688` and `src/lib/paper/stage-types.ts`. Do not introduce alias fields like `topik.title` or `abstrak.content` — the compiler reads `topik.definitif`, `abstrak.ringkasanPenelitian`, and `judul.judulTerpilih` only.

**Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/lib/naskah/compiler.test.ts`

Expected: FAIL because `compileNaskahSnapshot` and helper types do not exist yet.

**Step 3: Write minimal implementation**

Implement:
- `NaskahSectionKey` (union of final academic keys only, e.g. `"abstrak" | "pendahuluan" | "tinjauan_literatur" | "metodologi" | "hasil" | "diskusi" | "kesimpulan" | "daftar_pustaka" | "lampiran"`).
- `NaskahCompiledSnapshot`, `NaskahAvailability`, `NaskahCompileInput`.
- a **pure** compiler `compileNaskahSnapshot(input)` that:
  - takes `stageData` (the session's stageData), `artifactsById` (a map of already-loaded artifact records, keyed by `Id<"artifacts">` string), and session title fields (`paperTitle`, `workingTitle`) as inputs. Must not touch Convex `ctx` directly — the Convex wrapper is responsible for fetching artifacts and passing them in.
  - treats a stage as eligible only when BOTH:
    1. `stageData[stage].validatedAt` is a number, AND
    2. the stage's content source is resolvable (either the referenced artifact exists, is non-invalidated, and yields content, OR the legacy inline stage field exists).
  - maps internal stages to final academic sections using the canonical mapping below. Stages that are not in the mapping (`gagasan`, `outline`) are silently ignored. `topik` contributes only a working title. `judul` contributes only the final paper title. `pembaruan_abstrak` overrides the `abstrak` section via the same `?? ` fallback pattern as `content-compiler.ts`.
  - resolves title in this strict order, with explicit `titleSource` classification:
    1. validated `judul` stage with non-empty `judulTerpilih` → `titleSource: "judul_final"`
    2. non-empty `session.paperTitle` → `titleSource: "paper_title"` (NOT gated by `validatedAt`; the trim check is the only gate)
    3. non-empty `session.workingTitle` → `titleSource: "working_title"`
    4. validated `topik` stage with non-empty `definitif` → `titleSource: "topik_definitif"`
    5. fallback `"Paper Tanpa Judul"` → `titleSource: "fallback"`
  - applies a deterministic compile guard that rejects content when ANY of: `content.trim() === ""`, OR a line matches `^\s*\[(TODO|TBD|PLACEHOLDER)\]\s*$` (case-insensitive, multiline), OR content contains `{{\s*\w+\s*}}` (mustache hole). No heading regex is enforced in phase 1 — there is no verified shape of validated artifact bodies in the codebase yet, and pinning a heading regex against an imagined shape is a known footgun.
  - returns `{ isAvailable, reasonIfUnavailable, title, titleSource, sections, pageEstimate, status, sourceArtifactRefs }`. `isAvailable === true` iff at least the `abstrak` section survived the guard (matching D-008). `reasonIfUnavailable` is one of `"empty_session"` (no validated stages at all), `"no_validated_abstrak"` (some stages validated but none map to abstrak), or `"abstrak_guard_failed"` (abstrak considered but resolver dropped it).

Canonical section mapping (single source of truth — mirror in compiler):

| Internal stage | Final section | Notes |
|---|---|---|
| `gagasan` | — | ignored |
| `topik` | — | contributes `workingTitle` only |
| `outline` | — | ignored |
| `abstrak` | `Abstrak` | base content |
| `pembaruan_abstrak` | `Abstrak` | overrides base when present and validated |
| `pendahuluan` | `Pendahuluan` | |
| `tinjauan_literatur` | `Tinjauan Literatur` | |
| `metodologi` | `Metodologi` | |
| `hasil` | `Hasil` | |
| `diskusi` | `Diskusi` | |
| `kesimpulan` | `Kesimpulan` | |
| `daftar_pustaka` | `Daftar Pustaka` | |
| `lampiran` | `Lampiran` | only when eligible |
| `judul` | — | overrides title only |

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
git add src/lib/naskah/types.ts src/lib/naskah/compiler.ts src/lib/naskah/compiler.test.ts
git commit -m "feat: add naskah compiler primitives"
```

### Task 2: Add Convex Schema And Snapshot Read Model

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/naskah.ts`
- Create: `convex/naskah.test.ts`
- Reference: `convex/paperSessions.ts` (`approveStage`, `rewindToStage`)
- Reference: `convex/artifacts.ts` (`invalidatedAt` field)
- Reference: `convex/paperSessions.test.ts` (convex test harness pattern — mocked `ctx` via vitest, NOT `convex-test`)

**Do NOT touch `convex/_generated/api.d.ts` — it is auto-generated by `npx convex dev` / `npx convex codegen` and regenerates once `convex/naskah.ts` defines new exports. Any manual edit will be overwritten.**

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

Add a dedicated `naskahSnapshots` table in `convex/schema.ts` with fields:
- `sessionId: v.id("paperSessions")`
- `revision: v.number()` — monotonic per session
- `compiledAt: v.number()`
- `status: v.union(v.literal("growing"), v.literal("stable"))`
- `title: v.string()`
- `sections: v.array(v.any())` — serialized `NaskahSection[]`
- `pageEstimate: v.number()`
- `sourceArtifactRefs: v.array(v.object({ stage: v.string(), artifactId: v.optional(v.id("artifacts")), revisionCount: v.optional(v.number()), usedForRender: v.boolean(), resolution: v.union(v.literal("artifact"), v.literal("inline"), v.literal("dropped"), v.literal("overridden")) }))` — provenance refs per stage that the compiler actually considered (gated by `validatedAt != null`). `usedForRender` is true only when the ref supplied bytes to a rendered section. `resolution` captures the resolver outcome: `"artifact"` when the artifact body won, `"inline"` when inline fallback won, `"dropped"` when the resolver itself could not produce content (empty content, invalidated artifact with no inline, or guard rejection), and `"overridden"` when this stage had a valid source but was discarded because a higher-precedence stage won the section (e.g. `abstrak` when `pembaruan_abstrak` wins). The pembaruan_abstrak/abstrak override path MUST store both refs when both stages are validated.
- Index: `by_session` on `sessionId` so `getLatestSnapshot` can query cheaply.

Add a lightweight viewed-state table `naskahViews`:
- `sessionId: v.id("paperSessions")`
- `userId: v.id("users")`
- `lastViewedRevision: v.number()`
- `viewedAt: v.number()`
- Index: `by_session_user` on `(sessionId, userId)`.

Implement Convex functions in `convex/naskah.ts`:
- `getAvailability(sessionId)` query — returns `{ isAvailable, availableAtRevision, reasonIfUnavailable }` from the latest snapshot; falls back to `isAvailable: false` when no snapshot exists.
- `getLatestSnapshot(sessionId)` query — returns the most recent `naskahSnapshots` row by index, or `null`.
- `getViewState(sessionId, userId)` query — returns the `naskahViews` row or `null`.
- `markViewed(sessionId, revision)` mutation — upserts `naskahViews` for `(sessionId, currentUser)`.
- `deriveUpdatePending({ latestRevision, viewedRevision })` — **plain exported helper function, not a Convex handler.** Returns `latestRevision !== viewedRevision` when both defined, `true` when viewed is undefined and latest exists, `false` otherwise. This is the symbol the failing test imports.

All Convex handlers MUST follow the mocked-ctx vitest pattern from `convex/paperSessions.test.ts` — do NOT use `convex-test` in phase 1.

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run convex/naskah.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add convex/schema.ts convex/naskah.ts convex/naskah.test.ts
git commit -m "feat: add naskah snapshot read model"
```

### Task 3: Trigger Snapshot Rebuild On Validation-Relevant Changes

**Files:**
- Modify: `convex/paperSessions.ts` — hook `rebuildNaskahSnapshot` at the tail of `approveStage` (after `ctx.db.patch`) and at the tail of `rewindToStage` (after stage invalidation writes).
- Modify: `convex/paperSessions.test.ts` — follow the existing mocked-ctx pattern.
- Create: `convex/naskahRebuild.ts` — async helper `rebuildNaskahSnapshot(ctx, sessionId)` that loads the session, resolves artifacts via `ctx.db.get` for each validated stage's `artifactId`, calls `compileNaskahSnapshot` from `src/lib/naskah/compiler.ts`, and writes a new row into `naskahSnapshots` only when the compiled output differs from the previous snapshot (compare by a stable hash of `title + sections`).
- Reference: `convex/paperSessions/constants.ts`
- Reference: `convex/artifacts.ts` (skip artifacts with non-undefined `invalidatedAt`)

**Note:** `convex/artifacts.ts` does NOT need modification in this task — artifact invalidation is already handled inside `rewindToStage` via `invalidateArtifactsForStages`. The naskah rebuild only needs to run AFTER those mutations complete.

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
- loads the session via `ctx.db.get(sessionId)`
- iterates each stage in `STAGE_ORDER`, reads `stageData[stage]`, and — when `validatedAt` is set AND `artifactId` is present — calls `ctx.db.get(artifactId)` and skips the artifact when its `invalidatedAt` is defined
- calls `compileNaskahSnapshot({ stageData, artifactsById, paperTitle, workingTitle })`
- computes a stable hash of the compiled `title + sections` and compares to the latest snapshot; writes a new row with `revision = previous + 1` only when the hash differs
- when `isAvailable` flips from false to true, the new row's `revision` seeds availability

Wire the helper at exactly these two call sites:
1. `convex/paperSessions.ts::approveStage` — add `await rebuildNaskahSnapshot(ctx, args.sessionId);` AFTER the existing `await ctx.db.patch(args.sessionId, patchData);` call at the tail of the handler. This covers `abstrak`, `judul`, `pembaruan_abstrak`, and every other stage approval.
2. `convex/paperSessions.ts::rewindToStage` — add the same call AFTER `await ctx.db.patch(args.sessionId, { ... })` at the tail of the handler. This covers invalidation-driven snapshot shrinkage.

Do NOT hook `updateStageData`, `submitForValidation`, or any draft-edit mutation — those do not cross the validation boundary. Do NOT hook artifact content edits directly — the rebuild must be downstream of a `validatedAt` write.

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run convex/paperSessions.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add convex/paperSessions.ts convex/paperSessions.test.ts convex/naskahRebuild.ts
git commit -m "feat: rebuild naskah snapshots from validation events"
```

### Task 4: Expose Naskah Availability And Route-Aware Navigation

**Files:**
- Create: `src/app/chat/[conversationId]/naskah/page.tsx` — the `/chat/:conversationId/naskah` route (matches the existing `src/app/chat/[conversationId]/page.tsx` pattern; naskah is scoped per conversation, not global).
- Modify: `src/components/chat/layout/ChatLayout.tsx` — this is the real shell that mounts `TopBar`. Plumb naskah availability + `updatePending` into TopBar from here, and accept a `routeContext: "chat" | "naskah"` prop so the same layout can host both pages.
- Modify: `src/components/chat/shell/TopBar.tsx` — add optional props `naskahAvailable: boolean`, `naskahUpdatePending: boolean`, `routeContext: "chat" | "naskah"`, and render the contextual Chat/Naskah link button accordingly. Keep defaults false/`"chat"` so existing callers are unaffected.
- Create: `src/lib/hooks/useNaskah.ts`
- Create: `src/lib/hooks/useNaskah.test.ts`
- Reference: `src/lib/hooks/usePaperSession.ts`
- Reference: `src/components/chat/layout/ChatLayout.tsx` (existing TopBar mount site, around line 337)
- Reference: `src/app/chat/[conversationId]/page.tsx`

**Note:** The plan originally referenced `src/app/chat/layout.tsx` and `src/components/chat/ChatContainer.tsx` as edit points. Do NOT edit `src/app/chat/layout.tsx` — it is a thin generic layout. The real session-aware shell that mounts TopBar is `src/components/chat/layout/ChatLayout.tsx`. `ChatContainer.tsx` is not the shell and should not be modified for naskah wiring.

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
- `useNaskah(sessionId)` — thin hook that wraps `useQuery(api.naskah.getAvailability, ...)`, `useQuery(api.naskah.getLatestSnapshot, ...)`, and `useQuery(api.naskah.getViewState, ...)`. Derives `updatePending` locally using the `deriveUpdatePending` helper imported from `convex/naskah.ts`. Exposes `markViewed()` as a bound mutation.
- route-aware `TopBar` props and a small `NaskahButton` / `ChatButton` sub-component inside `TopBar.tsx` that renders the contextual link. The button is a Next `Link` to `/chat/:conversationId/naskah` or `/chat/:conversationId` respectively.
- `src/components/chat/layout/ChatLayout.tsx` passes `naskahAvailable`, `naskahUpdatePending`, and `routeContext` into TopBar; `routeContext` is derived from `usePathname()`.
- the new `/chat/[conversationId]/naskah/page.tsx` route that:
  - reuses `ChatLayout` with `routeContext="naskah"` (or a naskah-specific equivalent if layout nesting makes that cleaner)
  - guards when `availability.isAvailable === false` by rendering an unavailable state inline (do NOT redirect — per D-012, Naskah opens normally even while growing)
  - loads the latest snapshot via `useNaskah`
  - renders a placeholder shell for the preview components created in Task 5

Keep export actions disabled or omitted in this phase (per D-015, D-036).

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/lib/hooks/useNaskah.test.ts src/components/chat/shell/TopBar.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/chat/[conversationId]/naskah/page.tsx src/components/chat/layout/ChatLayout.tsx src/components/chat/shell/TopBar.tsx src/lib/hooks/useNaskah.ts src/lib/hooks/useNaskah.test.ts
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
- Modify: `src/app/chat/[conversationId]/naskah/page.tsx`
- Reference: `src/lib/export/pdf-builder.ts` (A4 margins: 2.5cm top/bottom, 3cm left, 2cm right, Times-Roman, line-height 1.5 — mirror these for the web preview so phase 1 preview stays visually close to the eventual export path)

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
- Create: `src/app/chat/[conversationId]/naskah/page.test.tsx`

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

Run: `npm exec vitest run src/components/chat/shell/TopBar.naskah-integration.test.tsx src/app/chat/[conversationId]/naskah/page.test.tsx`

Expected: FAIL until the final wiring is complete.

**Step 3: Write minimal implementation**

Finish the remaining integration glue:
- remove stale export placeholders if any remain
- sync docs only where implementation choices close an open design detail
- tighten prop names and state naming to match `availability`, `update pending`, and `compiled snapshot`

**Step 4: Run test to verify it passes**

Run: `npm exec vitest run src/components/chat/shell/TopBar.naskah-integration.test.tsx src/app/chat/[conversationId]/naskah/page.test.tsx`

Expected: PASS

**Step 5: Run the broader regression set**

Run:
- `npm exec vitest run src/lib/naskah/compiler.test.ts`
- `npm exec vitest run convex/naskah.test.ts`
- `npm exec vitest run convex/paperSessions.test.ts`
- `npm exec vitest run src/components/naskah/NaskahPage.test.tsx`
- `npm exec vitest run src/components/naskah/NaskahRefresh.test.tsx`
- `npm exec vitest run src/components/chat/shell/TopBar.naskah-integration.test.tsx src/app/chat/[conversationId]/naskah/page.test.tsx`

Expected: PASS

**Step 6: Commit**

```bash
git add docs/naskah-feature/2026-04-10-naskah-design-doc.md docs/naskah-feature/decisions.md docs/naskah-feature/context.md docs/naskah-feature/correction-checklist-context-decisions.md src/components/chat/shell/TopBar.naskah-integration.test.tsx src/app/chat/[conversationId]/naskah/page.test.tsx
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
