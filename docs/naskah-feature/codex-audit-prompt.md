# Codex Audit Prompt — Naskah Feature Phase 1

> **Instruction language policy**: This prompt is written in English per `CLAUDE.md` rule that all model-facing instructions must be in English. Codex's audit output should also be in English.

---

## 1. Audit Mandate

You are Codex, the audit agent for this repository. Claude Code implemented the phase-1 `Naskah` feature on the `naskah-feature` worktree branch. Your job is to perform a **rigorous, evidence-based code review** of that implementation before it proceeds to UI testing.

Ground rules:

- **Be adversarial, not agreeable.** Assume the implementation has bugs until you have personally verified correctness. Do not trust commit messages, test names, or comments at face value — read the actual code.
- **Cite everything.** Every finding must cite `file:line` ranges. No vague claims.
- **Distinguish severity.** Label each finding as `BLOCKER`, `HIGH`, `MEDIUM`, or `NIT`. Reserve `BLOCKER` for correctness, security, data-integrity, or plan-violation issues that MUST be fixed before UI testing.
- **No false positives from style.** Ignore formatting, linter-catchable issues, and unchanged pre-existing code unless they directly interact with the naskah diff.
- **Verify, do not guess.** If you are unsure whether something is a bug, run the relevant test or read supporting files. Do not flag speculative issues.

---

## 2. Branch Context

- **Worktree path**: `.worktrees/naskah-feature/`
- **Branch**: `naskah-feature`
- **Base**: branched from `main` at commit `5f40848b`
- **IMPORTANT**: `main` has advanced 30+ commits since the branch point (chat-bubble-ui-enforcement, normalizer-typeScript merges, etc). A raw `git diff main..HEAD` will show those downstream changes as "deletions" in HEAD. **Ignore them.** Only audit the files listed in §4.
- **Review scope window**: commits `5f40848b..HEAD` (12 commits, all naskah-related):

  ```
  62de0396 feat: ship phase-one naskah workspace
  431c416d feat: add naskah manual refresh flow
  1e01045d feat: add naskah route and topbar entry point
  ada3a300 chore: regenerate convex types for naskah modules
  7b807593 feat: add naskah preview page
  a92b52b5 feat: rebuild naskah snapshots from validation events
  f5ac1435 feat: add naskah snapshot read model
  f68a668c docs: align naskah implementation plan with audited contract
  65d398c4 feat: add naskah compiler primitives
  c0b34a46 docs: finalize naskah design and implementation docs
  3e7325cc docs: refine naskah decisions and context
  bc147ccc docs: add naskah context and decisions
  ```

- **No PR**: this is a local worktree review, not a GitHub PR. Do not try to query GitHub. Read files directly from the worktree path.

---

## 3. Authoritative Reference Documents (READ FIRST)

Read these in order before touching code. They define the contract the implementation must satisfy:

1. `docs/naskah-feature/2026-04-10-naskah-design-doc.md` — design anchor (problem, goals, non-goals, data model, compiler contract, state transitions, failure modes).
2. `docs/naskah-feature/2026-04-10-naskah-feature-implementation-plan.md` — task-by-task plan with explicit codebase anchors, failing tests, canonical mappings, and commit boundaries. **This is the primary contract**. Every task specifies files, acceptance criteria, and run commands.
3. `docs/naskah-feature/decisions.md` — design decisions (D-###). The plan references specific decisions (e.g. D-008, D-012, D-015, D-036). Validate that implementation respects them.
4. `docs/naskah-feature/correction-checklist-context-decisions.md` — open-item checklist that was closed before implementation.
5. `CLAUDE.md` — project-wide behavior and quality rules. See §7 of this prompt for specific checkpoints.

---

## 4. Scope File Manifest

Audit ONLY these files. Anything outside this list is out of scope.

### Added — Compiler & Types (pure domain)
- `src/lib/naskah/types.ts` (133 lines)
- `src/lib/naskah/compiler.ts` (516 lines)
- `src/lib/naskah/compiler.test.ts` (772 lines)
- `src/lib/naskah/anchors.ts` (20 lines)
- `src/lib/naskah/updatePending.ts` (10 lines)

### Added — Convex Backend
- `convex/naskah.ts` (201 lines) — queries/mutations + `deriveUpdatePending` helper
- `convex/naskah.test.ts` (790 lines)
- `convex/naskahRebuild.ts` (174 lines) — rebuild helper
- `convex/naskahRebuild.test.ts` (608 lines)

### Modified — Convex Shared
- `convex/schema.ts` — added `naskahSnapshots` and `naskahViews` tables
- `convex/paperSessions.ts` — added `rebuildNaskahSnapshot` hook at tail of `approveStage` and `rewindToStage`
- `convex/paperSessions.test.ts` — regression tests for rebuild hook
- `convex/_generated/api.d.ts` — auto-regenerated; **do NOT flag formatting or structure issues**, but verify it actually exports the new functions

### Added — Frontend Route & Hook
- `src/app/chat/[conversationId]/naskah/page.tsx` (95 lines)
- `src/app/chat/[conversationId]/naskah/page.test.tsx` (100 lines)
- `src/lib/hooks/useNaskah.ts` (81 lines)
- `src/lib/hooks/useNaskah.test.ts` (138 lines)

### Added — Naskah UI
- `src/components/naskah/NaskahPage.tsx` (169 lines)
- `src/components/naskah/NaskahPage.test.tsx` (438 lines)
- `src/components/naskah/NaskahHeader.tsx` (101 lines)
- `src/components/naskah/NaskahSidebar.tsx` (65 lines)
- `src/components/naskah/NaskahPreview.tsx` (100 lines)
- `src/components/naskah/NaskahRefresh.test.tsx` (204 lines)

### Modified — Chat Shell Plumbing
- `src/components/chat/shell/TopBar.tsx` — added `naskahAvailable`, `naskahUpdatePending`, `routeContext` props
- `src/components/chat/shell/TopBar.test.tsx` (added)
- `src/components/chat/shell/TopBar.naskah-integration.test.tsx` (added)
- `src/components/chat/layout/ChatLayout.tsx` — plumbs naskah props to TopBar
- `src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx` — minor prop fix

**Out of scope (do NOT audit)**:
- Anything in `src/lib/ai/`, `src/app/api/chat/`, `src/app/api/extract-file/`, `src/components/admin/`, `src/components/chat/ChatInput*`, `src/components/chat/MessageBubble*`, `src/lib/ingestion/`, `src/lib/json-render/`, `scripts/`, `snapshots/`, `docs/` other than `docs/naskah-feature/` — those are either main-ahead artifacts or unrelated to naskah.

---

## 5. Primary Audit Focus Areas

Work through these in order. Each section has explicit verification steps.

### 5.1 Compiler Correctness (`src/lib/naskah/compiler.ts`)

The compiler is a pure function and the critical correctness surface. Verify:

1. **Section mapping parity with the plan's canonical table** (plan §Task 1, "Canonical section mapping"):
   - `gagasan`, `outline` → silently ignored (no section produced)
   - `topik` → contributes `workingTitle` only (no section)
   - `judul` → overrides title only (no section)
   - `pembaruan_abstrak` → overrides `abstrak` via `?? ` fallback (mirror of `src/lib/export/content-compiler.ts`)
   - Eligible stages: `abstrak`, `pendahuluan`, `tinjauan_literatur`, `metodologi`, `hasil`, `diskusi`, `kesimpulan`, `daftar_pustaka`, `lampiran`
2. **Title resolution strict order** (plan §Task 1):
   1. validated `judul.judulTerpilih` → `titleSource: "judul_final"`
   2. trimmed non-empty `session.paperTitle` → `titleSource: "paper_title"` (NOT gated by `validatedAt`)
   3. trimmed non-empty `session.workingTitle` → `titleSource: "working_title"`
   4. validated `topik.definitif` → `titleSource: "topik_definitif"`
   5. fallback `"Paper Tanpa Judul"` → `titleSource: "fallback"`
3. **Compile guard determinism** (plan §Task 1):
   - `content.trim() === ""` → reject
   - Line matching `^\s*\[(TODO|TBD|PLACEHOLDER)\]\s*$` (case-insensitive, multiline) → reject
   - Content containing `{{\s*\w+\s*}}` (mustache hole) → reject
   - **No heading regex** must be enforced in phase 1 (this is a plan-level constraint; flag if present)
4. **`isAvailable` semantics**: must be `true` iff at least the `abstrak` section survived the guard (D-008).
5. **`reasonIfUnavailable` taxonomy**: must be one of `"empty_session" | "no_validated_abstrak" | "abstrak_guard_failed"`. Anything else → BLOCKER.
6. **Artifact resolution contract**: compiler must accept `artifactsById` as input and NOT touch Convex `ctx` directly. Verify the compiler is genuinely pure (no imports from `convex/`).
7. **Fixture field names**: compiler must read `topik.definitif`, `abstrak.ringkasanPenelitian`, `judul.judulTerpilih`. Any alias like `topik.title`, `abstrak.content`, etc. is a bug per the plan.
8. **Override provenance**: when `pembaruan_abstrak` wins the abstrak section, the `sourceArtifactRefs` for the base `abstrak` stage must be recorded with `resolution: "overridden"` (plan §Task 2, schema section).

### 5.2 Snapshot Schema & Rebuild (`convex/schema.ts`, `convex/naskah.ts`, `convex/naskahRebuild.ts`, `convex/paperSessions.ts`)

Verify:

1. **Schema shape** matches plan §Task 2:
   - `naskahSnapshots`: `sessionId`, `revision`, `compiledAt`, `status ∈ {"growing","stable"}`, `title`, `sections: v.array(v.any())`, `pageEstimate`, `sourceArtifactRefs` with `resolution ∈ {"artifact","inline","dropped","overridden"}`
   - `naskahViews`: `sessionId`, `userId`, `lastViewedRevision`, `viewedAt`
   - Indexes: `by_session` on `naskahSnapshots.sessionId`; `by_session_user` on `naskahViews.(sessionId, userId)`
2. **Query contract**:
   - `getAvailability(sessionId)` returns `{ isAvailable, availableAtRevision, reasonIfUnavailable }` from latest snapshot; `isAvailable: false` when no snapshot exists
   - `getLatestSnapshot(sessionId)` returns most recent row by index or `null`
   - `getViewState(sessionId, userId)` returns `naskahViews` row or `null`
   - `markViewed(sessionId, revision)` upserts the user's view state
   - `deriveUpdatePending({ latestRevision, viewedRevision })` is a **plain exported function**, not a Convex handler (plan §Task 2 Step 3 final bullet)
3. **Rebuild hook call sites** (plan §Task 3):
   - `approveStage` tail: `await rebuildNaskahSnapshot(ctx, args.sessionId)` AFTER `ctx.db.patch`
   - `rewindToStage` tail: same, AFTER stage invalidation patch
   - **Must NOT** be hooked into `updateStageData`, `submitForValidation`, or draft-edit paths
4. **Idempotency**: rebuild helper must write a new row only when compiled output differs from the previous snapshot (stable hash of `title + sections`). Verify this comparison exists and is correct.
5. **Invalidated artifact skip**: rebuild must skip artifacts whose `invalidatedAt` is defined (fall back to inline fields if present, else drop).
6. **Revision monotonicity**: new row's `revision = previous + 1`. First snapshot starts at `1` (not `0`).
7. **Auto-generated file**: `convex/_generated/api.d.ts` should not have been manually edited. Spot-check the diff is consistent with the new exports.

### 5.3 Route, Hook, and Shell Wiring

Verify:

1. **Route availability guard** (`src/app/chat/[conversationId]/naskah/page.tsx`):
   - When `availability.isAvailable === false`, render an unavailable state **inline** (do NOT redirect). Per D-012, Naskah opens normally even while growing.
   - No active export affordance anywhere in the tree (plan §Task 4, D-015, D-036).
2. **`useNaskah` hook** (`src/lib/hooks/useNaskah.ts`):
   - Wraps `api.naskah.getAvailability`, `getLatestSnapshot`, `getViewState`
   - Derives `updatePending` locally using `deriveUpdatePending` imported from `convex/naskah.ts`
   - Exposes `markViewed()` as a bound mutation
   - Does NOT use `session.isDirty` as the update-pending source (plan §Execution Notes)
3. **TopBar plumbing** (`src/components/chat/shell/TopBar.tsx`):
   - Adds `naskahAvailable`, `naskahUpdatePending`, `routeContext: "chat" | "naskah"` with safe defaults (`false`, `"chat"`) so existing callers are unaffected
   - Contextual button: on `chat` page shows "Naskah" link (only when `naskahAvailable === true`); on `naskah` page shows "Chat" link
   - Update dot appears only when `naskahUpdatePending === true`
   - Uses Next `Link` to `/chat/:conversationId/naskah` or `/chat/:conversationId`
4. **ChatLayout plumbing** (`src/components/chat/layout/ChatLayout.tsx`):
   - Derives `routeContext` from `usePathname()`
   - Passes `naskahAvailable`, `naskahUpdatePending`, `routeContext` into TopBar
   - Does NOT fetch session state inside TopBar itself (plan §Task 4 anchor note)
5. **Manual refresh flow** (plan §Task 6):
   - `markViewed` is invoked only on explicit user action (the `Update` button). No auto-refresh on route entry.
   - Changed-section highlight is temporary and derived from a section-key + content-hash diff.

### 5.4 Test Adequacy

This codebase uses **vitest with hand-mocked `ctx`**, NOT `convex-test` (plan §Codebase Anchors). Verify:

1. All new Convex tests follow the mocked-ctx pattern from `convex/paperSessions.test.ts`.
2. Compiler tests exercise: validated-only eligibility, title resolution order (all 5 cases), pembaruan_abstrak override, compile guard rejection cases (empty, TODO, mustache), override provenance recorded in `sourceArtifactRefs`.
3. Rebuild tests exercise: first-snapshot on abstrak approval, title update on judul approval, section drop on rewind, no-op when compiled output unchanged.
4. UI tests exercise: availability gating on TopBar button, update dot visibility, contextual Chat/Naskah button swap, unavailable guard render, no export affordance.
5. **Red flag**: any test that stubs the compiler output instead of feeding it real fixture data is a weak test — note it.

### 5.5 Terminology Consistency

Plan §Verification Checklist: "Terminology in code and docs matches: `availability`, `update pending`, `compiled snapshot`". Scan for:

- Any use of `isDirty` as a proxy for `updatePending` → BLOCKER (explicit plan violation)
- Any use of `compiled state` vs `compiled snapshot` → flag as MEDIUM
- Any leftover `export` button or copy in naskah UI → BLOCKER per D-015

---

## 6. Plan Verification Checklist (must pass)

Tick each item with evidence (`file:line`). Missing items = BLOCKER.

- [ ] `Naskah` entry point only appears when `abstrak` is validated AND minimal compiled content exists
- [ ] `Naskah` never renders unvalidated draft content
- [ ] `TopBar` switches contextually between `Chat` and `Naskah` based on route
- [ ] `Update` is manual, never automatic
- [ ] Changed sections can be highlighted after refresh
- [ ] No active export affordance appears in phase 1
- [ ] Terminology in code matches `availability`, `update pending`, `compiled snapshot`
- [ ] Compiler is pure — no Convex `ctx` imports in `src/lib/naskah/`
- [ ] Rebuild is hooked only at `approveStage` tail and `rewindToStage` tail
- [ ] `deriveUpdatePending` is a plain exported function, not a Convex handler

---

## 7. CLAUDE.md Compliance Checkpoints

Not every rule in `CLAUDE.md` applies at review time, but these do. Flag any violation:

1. **Model instruction language policy** — any instruction string (code comments that instruct the model, prompt templates, Zod `.describe()`, tool descriptions) in the naskah files must be English. Indonesian is allowed only for: (a) regex detecting Indonesian input, (b) user-facing UI strings, (c) observability labels. Flag any Indonesian instruction string as HIGH.
2. **Regex & pattern matching policy** — compiler guard uses regex for placeholder detection, which is deterministic parsing of technical markers (OK). But any regex used to classify or interpret natural language user input is a violation. Flag if found.
3. **Tools as simple executors** — the naskah feature does not ship new AI tools, so this is likely moot. But if any compiler step performs "quality scoring" or "filtering" dressed up as simple code, note it.
4. **Don't overcomplicate / not over-engineered** — call out speculative abstractions, unused exports, or code written "for future phase 2" that has no current caller.
5. **No unused exports** — every exported symbol in `src/lib/naskah/**` and `convex/naskah*.ts` must have a caller inside the naskah scope. Unused = HIGH.
6. **Agent role assignment** — this is the role rule that triggered the audit itself. Do not enforce it against the code; it is a process rule for Claude Code.
7. **Evidence-based claims** — if the implementation contains log messages or UI copy that asserts success without a verifiable basis, flag as HIGH.

---

## 8. Historical Context to Pull In

Read these supporting files when you need to verify a claim:

- `docs/naskah-feature/context.md` — prior research notes
- `docs/naskah-feature/decisions.md` — D-### table of decisions
- `src/lib/export/content-compiler.ts` — the reference compiler whose override semantics the naskah compiler must mirror (but NOT reuse)
- `src/lib/paper/title-resolver.ts` — reference title resolver (must NOT be modified; verify it wasn't)
- `convex/paperSessions.test.ts` — mocked-ctx test pattern the new convex tests must follow
- `convex/paperSessions/constants.ts` — `STAGE_ORDER` canonical keys

---

## 9. Deliverable Format

Respond with a single markdown document, using exactly this structure:

```markdown
# Codex Audit — Naskah Feature Phase 1

## Verdict
APPROVE | APPROVE WITH CHANGES | REJECT

## Summary
(2–4 sentences: overall quality, biggest risks, whether it's ready for UI testing.)

## Blockers
(Must be fixed before UI testing. If none, write "None.")
1. **[BLOCKER]** <title>
   - File: `path/to/file.ts:L123-L145`
   - Evidence: <quote or paraphrase the offending code>
   - Why it's wrong: <reference the plan/design/CLAUDE.md rule it violates>
   - Suggested fix: <concrete direction, not vague "refactor this">

## High-Severity Findings
(Should be fixed before merge, but not necessarily before UI testing.)
1. **[HIGH]** …

## Medium-Severity Findings
(Fix when convenient.)
1. **[MEDIUM]** …

## Nits
(Optional, one-line bullets. Do not pad.)

## Plan Verification Checklist
(Paste §6 with each item marked ✅/❌ and evidence.)

## What Was Done Well
(Brief. Claude needs calibration — if something was cleanly executed, say so.)
```

Do not:
- Repeat the prompt back.
- Include code you did not read.
- Add any finding you cannot cite with `file:line`.
- Be polite for politeness's sake — be accurate.

---

## 10. Execution Hint

Suggested order of operations:

1. Read the design doc + implementation plan end-to-end.
2. Read `src/lib/naskah/types.ts`, `compiler.ts`, `compiler.test.ts` (the pure core).
3. Read `convex/schema.ts` diff, then `convex/naskah.ts`, `convex/naskahRebuild.ts`, `convex/paperSessions.ts` rebuild hook.
4. Read `src/lib/hooks/useNaskah.ts`, then the route file, then the naskah UI components top-down (`NaskahPage` → `NaskahHeader` → `NaskahSidebar` → `NaskahPreview`).
5. Read `TopBar.tsx` and `ChatLayout.tsx` plumbing last.
6. Sweep tests for adequacy using §5.4.
7. Produce the deliverable.

---

## 11. Pre-Existing Main Test Debt — DO NOT CONSUME AUDIT BUDGET

After merging `main` into `naskah-feature` (merge commit `da1c22cb`), the full test suite reports:

```
Test Files  8 failed | 158 passed (166)
     Tests  18 failed | 1077 passed (1095)
```

**These 18 failures are pre-existing technical debt inherited from `main`. They are OUT OF SCOPE for this audit.** Do NOT flag them as naskah findings. Do NOT spend audit cycles reading them. Do NOT include them in the Blockers section.

### Affected files (all stale chat UI tests)

- `__tests__/chat/attachment-send-rule.test.tsx` — 3 tests
- `__tests__/chat/chat-input-desktop-layout.test.tsx` — 5 tests
- `__tests__/chat/chat-input-desktop-limit.test.tsx` — 2 tests
- `__tests__/chat/clear-attachment-context.test.tsx` — 2 tests
- `__tests__/chat/explicit-vs-inherit-bubble-visibility.test.tsx` — 1 test
- `__tests__/chat/konteks-tray-ui.test.tsx` — 1 test
- `__tests__/chat/message-bubble-attachment-chip-format.test.tsx` — 1 test
- `__tests__/reference-presentation.test.ts` — 3 tests

### Evidence of pre-existing status

Each of these test files was **last touched before the branch point** `5f40848b` (verified via `git merge-base --is-ancestor`):

| Test file | Last-touch commit | Pre-branch-point? |
|---|---|---|
| `attachment-send-rule.test.tsx` | `63087946 feat(chat): unify attachment chip format before and after send` | ✓ |
| `chat-input-desktop-layout.test.tsx` | `4f16bc6d refactor: streamline desktop chat composer` | ✓ |
| `konteks-tray-ui.test.tsx` | `12532764 refactor(chat): streamline konteks row actions and delete affordance` | ✓ |
| `message-bubble-attachment-chip-format.test.tsx` | `f13d64b2 feat(chat): stabilize conversation attachment context and explicit bubble contract` | ✓ |
| `reference-presentation.test.ts` | `d4c5970e fix: gate and restore source inventory UI behavior (#120)` | ✓ |

Since branch point, `main` received **10 commits** that refactored `ChatInput.tsx`, `ContextAddMenu.tsx`, and `MessageBubble.tsx` — `feat(chat): replace attachment chip with thumbnail card`, `refactor(chat): streamline desktop chat composer`, `feat(chat): redesign + Konteks to icon button + type dropdown`, etc. — without updating the corresponding tests. The tests are broken on `main` itself, independent of naskah work.

### Root cause classification

These failures are **main-branch test debt**, not naskah regressions. They will be addressed in a dedicated follow-up branch after naskah is merged. See `docs/naskah-feature/pre-existing-test-debt-2026-04-11.md` for the full investigation record.

### Your instructions regarding these tests

1. **Do not read** `__tests__/chat/*.test.tsx` or `__tests__/reference-presentation.test.ts`. They are out of scope.
2. **Do not flag** any of these 18 test failures as audit findings. Claude Code already owns them.
3. **Do not recommend** fixing them as part of this cycle.
4. If your audit logic touches the green naskah test files in §5.4, **do not confuse them** with the broken `__tests__/chat/*` files. The naskah tests live under `src/lib/naskah/`, `convex/naskah*.ts`, `src/components/naskah/`, `src/lib/hooks/useNaskah.test.ts`, `src/app/chat/[conversationId]/naskah/`, and `src/components/chat/shell/TopBar*.test.tsx`.
5. If you discover that naskah code indirectly imports or depends on code paths that caused the chat UI test failures, that IS in scope — flag it. But the test file breakage itself is not.

### Naskah test status (for reference)

When run in isolation, **all 117 naskah tests pass** across 11 test files (verified post-merge). Reference this number in your verdict summary to confirm naskah work is clean.

---

Begin.
