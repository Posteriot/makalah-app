# Reactive Revision Chain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove regex-based revision intent detection and replace with reactive chain enforcement — model detects intent, harness enforces chain after model commits.

**Architecture:** Delete `revisionIntentPattern` regex + `shouldForceRequestRevision` + proactive forcing logic. Add reactive `revisionChainEnforcer` that watches tool calls via AI SDK `prepareStep` `steps` history. Isolate exact source routing from `pending_validation` to prevent `maxToolSteps` collision.

**Tech Stack:** AI SDK v6 (`prepareStep` with `steps` array), Next.js API route

**Design doc:** `docs/validation-panel-artifact-consistency/artifact-reinforcement/DESIGN-reactive-revision-chain-2026-04-08.md`

---

### Task 1: Remove regex intent detection and forcing logic from primary path

**Files:**
- Modify: `src/app/api/chat/route.ts:2060` (variable declaration)
- Modify: `src/app/api/chat/route.ts:2625-2641` (regex + assignment)
- Modify: `src/app/api/chat/route.ts:2685-2716` (forcedToolChoice + maxToolSteps + revisionChainPrepareStep)

**Step 1: Neutralize `shouldForceRequestRevision` assignment (keep declaration for now — fallback still references it, removed in Task 2)**

At line 2060, the declaration `let shouldForceRequestRevision = false` stays unchanged. It will be removed in Task 2 after all references are cleaned.

**Step 2: Remove regex block**

Delete lines 2625-2641 entirely (from `// Force requestRevision when user sends` through the `console.info` closing brace).

**Step 3: Simplify `forcedToolChoice`**

At lines 2685-2689, change:

```typescript
// BEFORE
const forcedToolChoice = shouldForceSubmitValidation
        ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
        : shouldForceRequestRevision
        ? ({ type: "tool", toolName: "requestRevision" } as const)
        : undefined
```

```typescript
// AFTER
const forcedToolChoice = shouldForceSubmitValidation
        ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
        : undefined
```

**Step 4: Simplify `maxToolSteps`**

At lines 2692-2696, change:

```typescript
// BEFORE
const maxToolSteps = shouldForceGetCurrentPaperState
        ? 2
        : shouldForceRequestRevision
        ? 5 // requestRevision → updateArtifact → submitStageForValidation + margin
        : 5
```

```typescript
// AFTER
const maxToolSteps = shouldForceGetCurrentPaperState
        ? 2
        : 5
```

**Step 5: Delete `revisionChainPrepareStep`**

Delete lines 2697-2716 entirely (from `// Revision chain: force tool calling` through `: undefined`).

**Step 6: Verify build compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: PASS. The `shouldForceRequestRevision` declaration is kept (always `false`), so fallback references still compile. Variable becomes dead code until Task 2 removes it.

**Step 7: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: remove regex revision intent detection from primary path

Remove revisionIntentPattern, shouldForceRequestRevision, and proactive
forcing logic. Model detects revision intent via prompt instructions.
Reactive chain enforcer added in next commit."
```

---

### Task 2: Remove regex forcing from fallback path + clean up declaration

**Files:**
- Modify: `src/app/api/chat/route.ts:2060` (remove dead declaration)
- Modify: `src/app/api/chat/route.ts:3554-3558` (fallback forcedToolChoice)
- Modify: `src/app/api/chat/route.ts:3610` (fallback prepareStep)

**Step 1: Remove `shouldForceRequestRevision` declaration**

At line 2060, change:

```typescript
// BEFORE
let shouldForceGetCurrentPaperState = false
let shouldForceSubmitValidation = false
let shouldForceRequestRevision = false
let missingArtifactNote = ""
```

```typescript
// AFTER
let shouldForceGetCurrentPaperState = false
let shouldForceSubmitValidation = false
let missingArtifactNote = ""
```

**Step 3: Simplify fallback `forcedToolChoice`**

At lines 3554-3558, change:

```typescript
// BEFORE
const fallbackForcedToolChoice = shouldForceSubmitValidation
    ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
    : shouldForceRequestRevision
    ? ({ type: "tool", toolName: "requestRevision" } as const)
    : undefined
```

```typescript
// AFTER
const fallbackForcedToolChoice = shouldForceSubmitValidation
    ? ({ type: "tool", toolName: "submitStageForValidation" } as const)
    : undefined
```

**Step 4: Remove `revisionChainPrepareStep` from fallback prepareStep composition**

At line 3610, change:

```typescript
// BEFORE
prepareStep: (revisionChainPrepareStep ?? fallbackExactSourceRoutePlan.prepareStep ?? fallbackDeterministicSyncPrepareStep) as any,
```

```typescript
// AFTER — placeholder, will be replaced with revisionChainEnforcer in Task 4
prepareStep: (fallbackExactSourceRoutePlan.prepareStep ?? fallbackDeterministicSyncPrepareStep) as any,
```

**Note:** Between this commit and Task 4, the fallback path has no revision chain enforcement. This is acceptable for a development branch — if primary model fails during `pending_validation`, the fallback won't enforce the chain until Task 4 wires in `revisionChainEnforcer`.

**Step 5: Verify build compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: PASS. All references to `shouldForceRequestRevision` and `revisionChainPrepareStep` are gone.

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: remove regex revision forcing from fallback path

Also removes shouldForceRequestRevision declaration (dead code after
primary path cleanup in previous commit)."
```

---

### Task 3: Isolate exact source routing from `pending_validation`

**Files:**
- Modify: `src/app/api/chat/route.ts:2736-2740` (primary exact source guard)
- Modify: `src/app/api/chat/route.ts:3579-3583` (fallback exact source guard)

**Step 1: Add `pending_validation` exclusion to primary guard**

At lines 2736-2740, change:

```typescript
// BEFORE
const shouldApplyDeterministicExactSourceRouting =
    !enableWebSearch &&
    !shouldForceGetCurrentPaperState &&
    !shouldForceSubmitValidation &&
    availableExactSources.length > 0
```

```typescript
// AFTER
const shouldApplyDeterministicExactSourceRouting =
    !enableWebSearch &&
    !shouldForceGetCurrentPaperState &&
    !shouldForceSubmitValidation &&
    paperSession?.stageStatus !== "pending_validation" &&
    availableExactSources.length > 0
```

**Step 2: Add same exclusion to fallback guard**

At lines 3579-3583, change:

```typescript
// BEFORE
const shouldApplyFallbackDeterministicExactSourceRouting =
    !enableWebSearch &&
    !shouldForceGetCurrentPaperState &&
    !shouldForceSubmitValidation &&
    availableExactSources.length > 0
```

```typescript
// AFTER
const shouldApplyFallbackDeterministicExactSourceRouting =
    !enableWebSearch &&
    !shouldForceGetCurrentPaperState &&
    !shouldForceSubmitValidation &&
    paperSession?.stageStatus !== "pending_validation" &&
    availableExactSources.length > 0
```

**Step 3: Verify build compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix: isolate exact source routing from pending_validation

Prevents maxToolSteps collision — exact source routing returned 1-2
steps, truncating the revision chain before updateArtifact could run."
```

---

### Task 4: Add reactive `revisionChainEnforcer`

**Files:**
- Modify: `src/app/api/chat/route.ts` — add enforcer after `maxToolSteps` declaration, update primary and fallback `prepareStep` composition

**Step 1: Add `revisionChainEnforcer` after `maxToolSteps` (replacing where `revisionChainPrepareStep` was)**

Insert after the `maxToolSteps` declaration (after line ~2693 post-Task-1 edits):

```typescript
            // Reactive revision chain enforcer — active during pending_validation only.
            // Does NOT detect intent (no regex). Model decides freely at step 0.
            // After model commits to revision (calls requestRevision), harness
            // enforces the full chain: updateArtifact → submitStageForValidation.
            const revisionChainEnforcer = paperSession?.stageStatus === "pending_validation"
                ? ({ steps, stepNumber }: {
                    steps: Array<{ toolCalls?: Array<{ toolName: string }> }>;
                    stepNumber: number;
                  }) => {
                    if (stepNumber === 0) return undefined

                    const prevToolNames = steps[stepNumber - 1]?.toolCalls?.map(tc => tc.toolName) ?? []

                    if (prevToolNames.includes("requestRevision")) {
                        return { toolChoice: "required" as const }
                    }
                    if (prevToolNames.includes("updateStageData")) {
                        return { toolChoice: "required" as const }
                    }
                    if (prevToolNames.includes("updateArtifact") || prevToolNames.includes("createArtifact")) {
                        return { toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const }
                    }

                    return undefined
                  }
                : undefined
```

**Step 2: Wire into primary `prepareStep` composition**

At the primary `streamText` call (line ~2912 post-edits), change:

```typescript
// BEFORE (after Task 1 removed revisionChainPrepareStep)
prepareStep: (primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep) as any,
```

```typescript
// AFTER
prepareStep: (revisionChainEnforcer ?? primaryExactSourceRoutePlan.prepareStep ?? deterministicSyncPrepareStep) as any,
```

**Step 3: Wire into fallback `prepareStep` composition**

At the fallback `streamText` call (line ~3610 post-edits), change:

```typescript
// BEFORE (after Task 2)
prepareStep: (fallbackExactSourceRoutePlan.prepareStep ?? fallbackDeterministicSyncPrepareStep) as any,
```

```typescript
// AFTER
prepareStep: (revisionChainEnforcer ?? fallbackExactSourceRoutePlan.prepareStep ?? fallbackDeterministicSyncPrepareStep) as any,
```

**Step 4: Verify build compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: add reactive revisionChainEnforcer for pending_validation

Model detects revision intent via prompt (no regex). After model calls
requestRevision, harness enforces chain completion deterministically:
requestRevision → updateStageData/updateArtifact → submitStageForValidation."
```

---

### Task 5: Verify no stale references

**Step 1: Search for any remaining references to removed code**

Run:
```bash
grep -n "shouldForceRequestRevision\|revisionIntentPattern\|revisionChainPrepareStep" src/app/api/chat/route.ts
```
Expected: No output (zero matches).

Run:
```bash
grep -rn "shouldForceRequestRevision\|revisionIntentPattern" src/ --include="*.ts" --include="*.tsx"
```
Expected: No output. If any references exist in other files, they must be cleaned up.

**Step 2: Full TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -50`
Expected: PASS (or only pre-existing warnings unrelated to this change).

**Step 3: Run existing tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All existing tests pass. No test should reference `shouldForceRequestRevision` or `revisionIntentPattern`. If any do, they need updating (remove assertions about regex forcing, test the reactive enforcer instead).

**Step 4: Commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: clean up stale references to removed regex forcing"
```

---

### Task 6: Manual smoke test

This cannot be automated — it requires the actual AI model responding to messages.

**Test 1: Revision via chat during `pending_validation`**

1. Navigate to any stage that has reached `pending_validation` (artifact submitted, validation panel visible)
2. Send a revision message: "paragraf kedua harusnya lebih akademis"
3. Expected: Model calls `requestRevision` → `updateArtifact` → `submitStageForValidation`. Artifact updated. Validation panel reappears.
4. Evidence: Check server logs for `requestRevision` tool call, no `revision-auto-rescued-by-backend`.

**Test 2: Revision with non-keyword intent**

1. Same setup — `pending_validation` state
2. Send: "bikin lebih akademis dan tambah argumen yang lebih kuat"
3. Expected: Same as Test 1 — model detects revision intent semantically, calls `requestRevision`.
4. This is the case that regex MISSED before.

**Test 3: Discussion during `pending_validation`**

1. Same setup
2. Send: "kenapa kamu pilih pendekatan ini?"
3. Expected: Model responds with text, NO tool calls. Validation panel unchanged.

**Test 4: First-pass flow still works**

1. Start a new stage (drafting)
2. Complete the normal flow: choice card → artifact → validation panel
3. Expected: No regression.

**Test 5: Backend auto-rescue still works**

1. This is harder to trigger intentionally — it happens when model skips `requestRevision` and directly calls `updateArtifact`
2. If triggered: check logs for `revision-auto-rescued-by-backend` event
3. Expected: Auto-rescue transitions to revision, flow continues.

**Test 6: Exact source routing unaffected outside `pending_validation`**

1. Navigate to a stage in `drafting` status where source documents exist
2. Send a message that triggers exact source inspection (e.g., ask about a specific source by title)
3. Expected: Exact source routing activates normally — `inspectSourceDocument` called, model answers from source.
4. Evidence: Exact source routing works identically to before this change. Only `pending_validation` is isolated.

**Test 7: Fallback model has same enforcer behavior**

1. This requires the primary model to fail (timeout, error) during a revision in `pending_validation`
2. When fallback kicks in, the `revisionChainEnforcer` should be wired identically
3. Expected: Same chain enforcement as primary path.
4. Evidence: Code review confirms both `streamText` calls use `revisionChainEnforcer` in the `??` chain (verified in Task 5 Step 1).
