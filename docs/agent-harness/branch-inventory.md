# Branch Inventory — feature/plan-task-queue-components

> Status: REVIEW NEEDED. Branch terlalu gendut (82 commits, 57 files, 10K+ lines).
> Dokumen ini inventory untuk decide next steps.

## Stats
- 82 commits from main
- 57 files changed (committed)
- 10,133 insertions, 146 deletions (committed)
- 14 files, 716 insertions uncommitted
- 4 reverts in history

---

## Work Streams (Chronological)

### Stream 1: Plan/Task/Queue UI + CoT (oldest)
Commits: `25b5f168` → `32ea00d3` (12 commits + 1 revert)

What it does:
- Task derivation engine (`task-derivation.ts`)
- Plan card with stage description
- ChainOfThought universal indicator
- Queue sidebar
- Force updateStageData after search via prepareStep

Status: **PARTIALLY STABLE** — core UI works, but `a8e917ac` (force updateStageData after search) was an early harness attempt that may conflict with later harness work.

Key files:
- `src/lib/paper/task-derivation.ts` (new)
- `src/components/chat/MessageBubble.tsx` (modified)
- `src/app/api/chat/route.ts` (modified)

### Stream 2: Backend revert + choice fix
Commits: `4a6b7d73` → `28df4fb6` (4 commits including 1 revert)

What it does:
- Restore backend files to pre-branch state
- Choice key rehydration fix + revert

Status: **NEUTRAL** — revert cleaned up, net effect minimal.

### Stream 3: UnifiedProcessCard
Commits: `8e7b58c1` → `ccabea0a` (18 commits)

What it does:
- Replace TaskProgress + ChainOfThought with UnifiedProcessCard
- Collapsible process card with amber dots animation
- Pending indicator fixes

Status: **STABLE** — purely UI, well-tested, no runtime logic changes.

Key files:
- `src/components/chat/UnifiedProcessCard.tsx` (new)
- `src/components/chat/MessageBubble.tsx` (modified)
- `src/components/chat/ChatWindow.tsx` (modified)

### Stream 4: Incremental Save Harness v1
Commits: `91772fc6` → `866e4ba7` (21 commits, feat:fix 5:14, 2 reverts)

What it does:
- `saveStageDraft` tool with hard-gate + allowlist
- `buildIncrementalSavePrepareStep` harness
- Mature save mode (force chain: updateStageData → createArtifact → submit)
- prepareStep priority chain in route.ts

Status: **UNSTABLE** — README says so. OCC bug found + fixed with queue/dedup. Multiple unverified fixes (Bug #3, #4, #5). Fundamental issues remain (Bug #1 search turn, Bug #6 retroactive update).

Key files:
- `src/lib/ai/incremental-save-harness.ts` (new)
- `src/lib/ai/draft-save-fields.ts` (new)
- `src/lib/ai/paper-tools-draft-save.ts` (new)
- `src/lib/ai/paper-tools.ts` (modified)
- `src/app/api/chat/route.ts` (modified)

### Stream 5: Auto-Present Validation Contract (this session)
Commits: `237e024a` → `f5279f0d` (19 commits)

What it does:
- Fix README inaccuracies
- Migrate "explicit user confirmation" → "auto-present validation panel"
- Update wording across prompts, stage instructions, fixtures, migrations
- Artifact readiness guard in submitForValidation
- Observability logs [AutoPresent]
- OCC fix: queue/dedup for saveStageDraft

Status: **WORDING COMPLETE, RUNTIME UNTESTED** — wording migration done but UI test blocked by regression.

Key files:
- `docs/agent-harness/README.md` (modified)
- `docs/agent-harness/auto-present-validation-contract.md` (new)
- `docs/agent-harness/global-auto-present-design.md` (new)
- `src/lib/ai/paper-mode-prompt.ts` (modified)
- `src/lib/ai/paper-stages/foundation.ts` (modified)
- `src/lib/ai/paper-stages/core.ts` (modified)
- `src/lib/ai/paper-stages/results.ts` (modified)
- `src/lib/ai/paper-stages/finalization.ts` (modified)
- `convex/paperSessions.ts` (modified — artifact guard)
- `convex/paperSessions.test.ts` (new)
- `src/lib/ai/paper-tools.ts` (modified — queue/dedup)

### Stream 6: Uncommitted changes (lo apply di luar sesi gue)
NOT committed. 14 files, 716 insertions.

What it does:
- `buildValidationSubmitPrepareStep` — new harness function
- `validationSubmitConfig` wiring in route.ts
- `isValidationChoiceInteractionEvent` — choice detection refactor
- `normalizeChoiceSpec` — spec normalization (CRASH: null children)
- `getActiveStageArtifactContext` — artifact context in paper prompt
- `createArtifact` duplicate guard (block if artifactId exists)
- queue/dedup additions to saveStageDraft
- Misc test additions

Status: **BROKEN** — `normalizeChoiceSpec` has null crash. Needs review before commit.

---

## Known Bugs (All Streams)

| # | Bug | Stream | Status |
|---|-----|--------|--------|
| 1 | Search turn generate tanpa save | 4 | UNRESOLVED (architectural) |
| 2 | Pending indicator duplicate | 3 | PARTIALLY FIXED |
| 3 | yaml-spec card gak render | 4 | FIX APPLIED, UNVERIFIED |
| 4 | Choice card button stays active | 4 | FIX APPLIED, UNVERIFIED |
| 5 | Artifact gagal di-generate final turn | 4 | FIX APPLIED, UNVERIFIED |
| 6 | Retroactive task update semua bubble | 1 | UNRESOLVED |
| 7 | Refs auto-persist terlambat | pre-existing | UNRESOLVED |
| 8 | OCC storm saveStageDraft | 4+5 | FIXED (queue/dedup) |
| 9 | normalizeChoiceSpec null crash | 6 | BROKEN (uncommitted) |
| 10 | Model output garbage code turn 1 | 6? | UNRESOLVED |
| 11 | Search turn output 577 chars | 6? | UNRESOLVED |

---

## Options

### Option A: Triage — save what works, discard what doesn't
1. Commit Stream 3 (UnifiedProcessCard) — stable, tested
2. Cherry-pick Stream 5 docs + tests — contract wording, plans, design docs
3. Discard Stream 4 harness entirely — too unstable, needs rethink
4. Discard Stream 6 uncommitted — broken
5. Keep Stream 1 selectively — task derivation OK, prepareStep changes need review

### Option B: Fresh branch — surgical extraction
1. Create new branch from main
2. Cherry-pick only stable, tested commits
3. Leave this branch as reference/archive

### Option C: Fix forward — stabilize this branch
1. Fix Stream 6 crash (normalizeChoiceSpec)
2. Verify Streams 4+5 end-to-end
3. Risk: more patches on unstable foundation

---

## Recommendation

TBD — needs user decision.
