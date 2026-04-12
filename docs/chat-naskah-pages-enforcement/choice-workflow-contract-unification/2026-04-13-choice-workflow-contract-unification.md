# Choice Workflow Contract Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menyatukan kontrak choice workflow dari schema sampai prompt source aktif agar alur `choice -> artifact -> validation` jadi durable, reusable, dan tidak split-brain lagi.

**Architecture:** Pendekatan terbaik adalah mengganti keputusan runtime yang sekarang tersebar dengan typed workflow contract tunggal, lalu menurunkannya ke frontend submit event, backend resolver, workflow registry, rescue layer, dan action-aware outcome guard. Setelah runtime stabil, prompt source aktif di `updated-5`, fallback prompt code, dan seed/migration source disinkronkan ke vocabulary workflow yang sama, lalu diverifikasi di dev sebelum prod disentuh.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Convex, AI SDK, JSON Render, Python deploy scripts.

---

## Tasks

### Task 1: Lock Baseline Contract with Failing Tests

**Files:**
- Modify: `src/lib/chat/__tests__/choice-request.test.ts`
- Modify: `src/lib/chat/__tests__/choice-submit.test.ts`
- Modify: `src/lib/json-render/__tests__/choice-payload.test.ts`
- Modify: `src/lib/json-render/__tests__/compile-choice-spec.test.ts`
- Create: `src/lib/chat/__tests__/choice-workflow-resolver.test.ts`
- Create: `src/lib/chat/__tests__/choice-workflow-observability.test.ts`

**Step 1: Write failing tests for the new workflow contract**

```ts
it("parses workflowAction from choice submit event", () => {
  const event = parseOptionalChoiceInteractionEvent({
    interactionEvent: {
      type: "paper.choice.submit",
      version: 1,
      conversationId: "conv-1",
      stage: "gagasan",
      sourceMessageId: "msg-1",
      choicePartId: "part-1",
      kind: "single-select",
      selectedOptionIds: ["opsi-a"],
      workflowAction: "continue_discussion",
      submittedAt: Date.now(),
    },
  })

  expect(event?.workflowAction).toBe("continue_discussion")
})

it("rejects ChoiceCardShell spec without typed workflowAction after migration flag is enabled", () => {
  expect(() => parseJsonRendererChoicePayload(payloadWithoutWorkflowAction)).toThrow()
})

it("marks legacy contract path when workflowAction is missing but decisionMode still exists", () => {
  const result = resolveChoiceWorkflow({
    stage: "outline",
    decisionMode: "commit",
    stageStatus: "drafting",
  })

  expect(result.contractVersion).toBe("legacy")
})
```

**Step 2: Run targeted tests to verify they fail**

Run: `npm test -- choice-request choice-submit choice-payload compile-choice-spec choice-workflow`

Expected: FAIL on missing `workflowAction` support and missing resolver file.

**Step 3: Add placeholder test file for resolver coverage**

```ts
describe("resolveChoiceWorkflow", () => {
  it("prefers workflowAction over decisionMode", () => {
    expect(true).toBe(false)
  })
})
```

**Step 4: Run tests again to confirm failure shape is correct**

Run: `npx vitest run src/lib/chat/__tests__/choice-workflow-resolver.test.ts`

Expected: FAIL with assertion error, not import/config noise.

**Step 5: Commit**

```bash
git add src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-submit.test.ts src/lib/json-render/__tests__/choice-payload.test.ts src/lib/json-render/__tests__/compile-choice-spec.test.ts src/lib/chat/__tests__/choice-workflow-resolver.test.ts
git commit -m "test: lock choice workflow contract baseline"
```

### Task 2: Add Typed `workflowAction` to Choice Schema and Frontend Submit Event

**Files:**
- Modify: `src/lib/json-render/choice-payload.ts`
- Modify: `src/lib/json-render/choice-catalog.ts`
- Modify: `src/components/chat/json-renderer/components/ChoiceCardShell.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/lib/chat/choice-submit.ts`
- Test: `src/lib/chat/__tests__/choice-submit.test.ts`
- Test: `src/lib/json-render/__tests__/choice-payload.test.ts`
- Test: `src/lib/json-render/__tests__/compile-choice-spec.test.ts`

**Step 1: Extend the typed prop schema**

```ts
const workflowActionSchema = z.enum([
  "continue_discussion",
  "finalize_stage",
  "compile_then_finalize",
  "special_finalize",
  "validation_ready",
])

const choiceCardShellPropsSchema = z.object({
  title: z.string().min(1),
  workflowAction: workflowActionSchema,
  decisionMode: z.enum(["exploration", "commit"]).optional(),
})
```

**Step 2: Run the payload tests**

Run: `npx vitest run src/lib/json-render/__tests__/choice-payload.test.ts src/lib/json-render/__tests__/compile-choice-spec.test.ts`

Expected: FAIL first on fixtures that still omit `workflowAction`.

**Step 3: Update frontend submit extraction and event builder**

```ts
const workflowAction = cardShell?.props?.workflowAction

const event = buildChoiceInteractionEvent({
  conversationId,
  sourceMessageId,
  choicePartId,
  stage: currentStage,
  kind: "single-select",
  selectedOptionId,
  customText,
  workflowAction,
  decisionMode,
})
```

**Step 4: Run submit/event tests**

Run: `npx vitest run src/lib/chat/__tests__/choice-submit.test.ts`

Expected: PASS with `workflowAction` persisted in event payload.

**Step 5: Commit**

```bash
git add src/lib/json-render/choice-payload.ts src/lib/json-render/choice-catalog.ts src/components/chat/json-renderer/components/ChoiceCardShell.tsx src/components/chat/ChatWindow.tsx src/lib/chat/choice-submit.ts src/lib/chat/__tests__/choice-submit.test.ts src/lib/json-render/__tests__/choice-payload.test.ts src/lib/json-render/__tests__/compile-choice-spec.test.ts
git commit -m "feat: type workflow action in choice contract"
```

### Task 3: Introduce Unified Choice Workflow Resolver and Registry

**Files:**
- Create: `src/lib/chat/choice-workflow-registry.ts`
- Modify: `src/lib/chat/choice-request.ts`
- Test: `src/lib/chat/__tests__/choice-workflow-resolver.test.ts`
- Test: `src/lib/chat/__tests__/choice-request.test.ts`
- Test: `src/lib/chat/__tests__/choice-workflow-observability.test.ts`

**Step 1: Write failing resolver tests for action precedence**

```ts
it("prefers workflowAction over decisionMode", () => {
  const result = resolveChoiceWorkflow({
    stage: "topik",
    workflowAction: "continue_discussion",
    decisionMode: "commit",
    stageStatus: "drafting",
  })

  expect(result.action).toBe("continue_discussion")
  expect(result.reason).toBe("workflow_action_continue_discussion")
})

it("maps daftar_pustaka to compile_then_finalize", () => {
  const result = resolveChoiceWorkflow({
    stage: "daftar_pustaka",
    workflowAction: "compile_then_finalize",
    stageStatus: "drafting",
  })

  expect(result.workflowClass).toBe("compile_finalize")
})

it("returns legacy contractVersion when workflowAction is absent", () => {
  const result = resolveChoiceWorkflow({
    stage: "gagasan",
    decisionMode: "exploration",
    stageStatus: "drafting",
  })

  expect(result.contractVersion).toBe("legacy")
})
```

**Step 2: Run resolver tests to verify they fail**

Run: `npx vitest run src/lib/chat/__tests__/choice-workflow-resolver.test.ts src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts`

Expected: FAIL because resolver/registry is not implemented yet.

**Step 3: Implement registry plus resolver**

```ts
export function resolveChoiceWorkflow(input: ResolveChoiceWorkflowInput): ResolvedChoiceWorkflow {
  if (input.workflowAction) {
    return resolveFromWorkflowAction(input)
  }

  return resolveLegacyChoiceWorkflow(input)
}
```

**Step 4: Update `choice-request.ts` to use resolved workflow object instead of bare `finalize: boolean`**

```ts
const resolved = resolveChoiceWorkflow({
  stage,
  workflowAction,
  decisionMode,
  stageData,
  hasExistingArtifact,
  stageStatus,
})
```

**Step 5: Run tests and commit**

Run: `npx vitest run src/lib/chat/__tests__/choice-workflow-resolver.test.ts src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts`

Expected: PASS.

```bash
git add src/lib/chat/choice-workflow-registry.ts src/lib/chat/choice-request.ts src/lib/chat/__tests__/choice-workflow-resolver.test.ts src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts
git commit -m "feat: unify choice workflow resolution"
```

### Task 4: Refactor Note Builder, Commit Detection, and Route Wiring Around Resolved Workflow

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/chat/choice-request.ts`
- Test: `src/lib/chat/__tests__/choice-request.test.ts`
- Test: `src/lib/chat/__tests__/choice-workflow-observability.test.ts`

**Step 1: Write failing tests for note generation from resolved workflow**

```ts
it("builds continue-discussion note from resolved workflow", () => {
  const note = buildChoiceContextNote(event, {
    resolvedWorkflow: {
      action: "continue_discussion",
      workflowClass: "discussion_choice",
      toolStrategy: "none",
      prosePolicy: "discussion_only",
      fallbackPolicy: "no_rescue",
      reason: "workflow_action_continue_discussion",
      contractVersion: "v2",
    },
  })

  expect(note).toContain("Mode: continue-discussion")
  expect(note).not.toContain("submitStageForValidation")
})
```

**Step 2: Run note tests**

Run: `npx vitest run src/lib/chat/__tests__/choice-request.test.ts`

Expected: FAIL because note builder still expects `forceFinalize`.

**Step 3: Update route wiring to persist `resolvedWorkflow`**

```ts
const resolvedWorkflow = resolveChoiceWorkflow(...)

choiceContextNote = buildChoiceContextNote(choiceInteractionEvent, {
  hasExistingArtifact,
  resolvedWorkflow,
})
```

**Step 4: Replace commit-point detection that still keys off `decisionMode === "commit"`**

```ts
const wasCommitPoint = resolvedWorkflow.action !== "continue_discussion"
```

**Step 5: Add observability assertions for resolved workflow payload**

```ts
expect(logPayload).toMatchObject({
  action: "continue_discussion",
  workflowClass: "discussion_choice",
  contractVersion: "v2",
})
```

**Step 6: Run tests and commit**

Run: `npx vitest run src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts`

Expected: PASS.

```bash
git add src/app/api/chat/route.ts src/lib/chat/choice-request.ts src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts
git commit -m "refactor: derive choice note and commit path from resolved workflow"
```

### Task 5: Consolidate Stage Registry Rescue for `judul`, `lampiran`, `hasil`, and `daftar_pustaka`

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/lib/chat/choice-workflow-registry.ts`
- Create: `src/lib/chat/__tests__/choice-workflow-rescue.test.ts`
- Test: `src/lib/chat/__tests__/choice-workflow-observability.test.ts`

**Step 1: Write failing rescue tests**

```ts
it("allows deterministic rescue for judul special finalize", () => {
  const workflow = resolveChoiceWorkflow({
    stage: "judul",
    workflowAction: "special_finalize",
    stageStatus: "drafting",
  })

  expect(workflow.fallbackPolicy).toBe("deterministic_rescue")
})
```

**Step 2: Run rescue tests**

Run: `npx vitest run src/lib/chat/__tests__/choice-workflow-rescue.test.ts`

Expected: FAIL because registry does not expose rescue policy yet.

**Step 3: Extract route special-cases behind registry-driven helpers**

```ts
if (resolvedWorkflow.fallbackPolicy === "deterministic_rescue") {
  await maybeRunWorkflowRescue(...)
}
```

**Step 4: Keep behavior parity while removing raw ad hoc branching**

Run: `npx vitest run src/lib/chat/__tests__/choice-workflow-rescue.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts`

Expected: PASS, and route code no longer invents stage logic outside registry ownership.

**Step 5: Add observability assertion that rescue path is explicit**

```ts
expect(logPayload.rescueTriggered).toBe(true)
expect(logPayload.fallbackPolicy).toBe("deterministic_rescue")
```

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/chat/choice-workflow-registry.ts src/lib/chat/__tests__/choice-workflow-rescue.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts
git commit -m "refactor: move special choice rescue into workflow registry"
```

### Task 6: Build Action-Aware Outcome Guard and Remove Duplicate Sanitize Logic

**Files:**
- Create: `src/lib/chat/choice-outcome-guard.ts`
- Modify: `src/app/api/chat/route.ts`
- Create: `src/lib/chat/__tests__/choice-outcome-guard.test.ts`
- Test: `src/lib/chat/__tests__/choice-workflow-observability.test.ts`

**Step 1: Write failing guard tests**

```ts
it("sanitizes false draft handoff for continue_discussion", () => {
  const result = sanitizeChoiceOutcome({
    action: "continue_discussion",
    text: "Berikut adalah draf. Silakan review di panel validasi.",
    hasArtifactSuccess: false,
    submittedForValidation: false,
  })

  expect(result.text).not.toContain("panel validasi")
  expect(result.text).not.toContain("Berikut adalah draf")
})

it("keeps healthy prose while removing recovery leakage after finalize", () => {
  const result = sanitizeChoiceOutcome({
    action: "finalize_stage",
    text: "Draft selesai. Maaf ada kendala teknis. Silakan review di panel validasi.",
    hasArtifactSuccess: true,
    submittedForValidation: true,
  })

  expect(result.text).toContain("Silakan review di panel validasi")
  expect(result.text).not.toContain("kendala teknis")
})
```

**Step 2: Run guard tests**

Run: `npx vitest run src/lib/chat/__tests__/choice-outcome-guard.test.ts`

Expected: FAIL because guard util does not exist yet.

**Step 3: Implement shared guard util and wire both primary/fallback route paths to it**

```ts
const guardResult = sanitizeChoiceOutcome({
  action: resolvedWorkflow.action,
  text: normalizedText,
  hasArtifactSuccess,
  submittedForValidation,
})
```

**Step 4: Run focused tests**

Run: `npx vitest run src/lib/chat/__tests__/choice-outcome-guard.test.ts src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/chat/choice-outcome-guard.ts src/app/api/chat/route.ts src/lib/chat/__tests__/choice-outcome-guard.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts
git commit -m "feat: add action-aware choice outcome guard"
```

### Task 7: Migrate Prompt Sources to the New Workflow Vocabulary

**Files:**
- Modify: `.references/system-prompt-skills-active/updated-5/system-prompt.md`
- Modify: `.references/system-prompt-skills-active/updated-5/01-gagasan-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/02-topik-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/03-outline-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/04-abstrak-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/05-pendahuluan-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/06-tinjauan-literatur-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/07-metodologi-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/08-hasil-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/09-diskusi-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/10-kesimpulan-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/11-pembaruan-abstrak-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/12-daftar-pustaka-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/13-lampiran-skill.md`
- Modify: `.references/system-prompt-skills-active/updated-5/14-judul-skill.md`
- Modify: `src/lib/json-render/choice-yaml-prompt.ts`
- Modify: `src/lib/ai/paper-mode-prompt.ts`
- Modify: `src/lib/ai/paper-stages/foundation.ts`
- Modify: `src/lib/ai/paper-stages/core.ts`
- Modify: `src/lib/ai/paper-stages/results.ts`
- Modify: `src/lib/ai/paper-stages/finalization.ts`
- Modify: `src/lib/ai/paper-stages/index.ts`
- Modify: `src/lib/ai/stage-skill-resolver.ts`
- Modify: `scripts/deploy-skills-dev.py`
- Modify: `scripts/deploy-skills-prod.py`
- Modify: `convex/migrations/wipeAndReseedStageSkills.ts`
- Test: `src/lib/ai/stage-skill-validator.test.ts`
- Test: `src/lib/ai/stage-skill-resolver.test.ts`

**Step 1: Update the downloaded active skills in `updated-5` first**

```md
- Choice cards MUST set workflowAction.
- Use continue_discussion only when artifact lifecycle must not start.
- Use finalize_stage only when the same turn must complete updateStageData/createArtifact-or-updateArtifact/submitStageForValidation.
```

**Step 2: Update deploy scripts so they really point to `updated-5`**

```py
CHANGE_NOTE = "updated-5: unified choice workflow contract"
SRC_DIR = ".references/system-prompt-skills-active/updated-5"
```

**Step 3: Run validator tests to expose fallback prompt drift**

Run: `npx vitest run src/lib/ai/stage-skill-validator.test.ts src/lib/ai/stage-skill-resolver.test.ts`

Expected: FAIL until fallback prompt sources are updated to the same vocabulary.

**Step 4: Update fallback prompt code and migration/seed source**

```ts
- workflowAction: "continue_discussion" | "finalize_stage" | ...
- decisionMode is compatibility-only, not source of truth
```

**Step 5: Re-run validator tests**

Run: `npx vitest run src/lib/ai/stage-skill-validator.test.ts src/lib/ai/stage-skill-resolver.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add .references/system-prompt-skills-active/updated-5 src/lib/json-render/choice-yaml-prompt.ts src/lib/ai/paper-mode-prompt.ts src/lib/ai/paper-stages/foundation.ts src/lib/ai/paper-stages/core.ts src/lib/ai/paper-stages/results.ts src/lib/ai/paper-stages/finalization.ts src/lib/ai/paper-stages/index.ts src/lib/ai/stage-skill-resolver.ts src/lib/ai/stage-skill-resolver.test.ts scripts/deploy-skills-dev.py scripts/deploy-skills-prod.py convex/migrations/wipeAndReseedStageSkills.ts src/lib/ai/stage-skill-validator.test.ts
git commit -m "docs(prompt): align active and fallback prompts with workflow contract"
```

### Task 8: Full Verification, Dev Deploy, and Prod Gate

**Files:**
- Modify: `docs/chat-naskah-pages-enforcement/2026-04-13-problem-context-choice-artifact-desync.md` if verification reveals mismatch
- Modify: `docs/chat-naskah-pages-enforcement/2026-04-13-reusable-patch-design-choice-workflow.md` if verification reveals mismatch
- Use: `scripts/deploy-skills-dev.py`
- Use: `scripts/deploy-skills-prod.py`

**Step 1: Run the focused test suite**

Run:

```bash
npx vitest run src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-submit.test.ts src/lib/chat/__tests__/choice-workflow-resolver.test.ts src/lib/chat/__tests__/choice-workflow-rescue.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts src/lib/chat/__tests__/choice-outcome-guard.test.ts src/lib/json-render/__tests__/choice-payload.test.ts src/lib/json-render/__tests__/compile-choice-spec.test.ts src/lib/ai/stage-skill-validator.test.ts src/lib/ai/stage-skill-resolver.test.ts
```

Expected: PASS.

**Step 2: Run repo-level safety checks**

Run:

```bash
npm run typecheck
npm run test
```

Expected: PASS.

**Step 3: Deploy prompt/skills to dev `wary-ferret-59`**

Run:

```bash
python3 scripts/deploy-skills-dev.py
```

Expected: Successful deploy log with updated skills/system prompt synced to dev.

**Step 4: Verify deploy script result, not just exit code**

Check:

- script output shows `updated-5` source path
- dry run verification passes
- no stage skill activation failures remain

Expected: Dev deploy output proves the new source was activated, not the stale `updated-4` source.

**Step 5: Manual dev verification checklist**

Run these scenario checks in dev:

- `gagasan` `continue_discussion` card: no artifact lifecycle, no false handoff prose
- `topik` or `outline` `finalize_stage`: full tool chain + healthy closing
- `daftar_pustaka` compile path: compile then artifact then submit
- `lampiran` no-appendix path: special finalize works without ad hoc drift
- `judul` selection path: special finalize/rescue remains deterministic

Expected: All pass in dev before prod is even considered.

**Step 6: Record any mismatch back into the two source docs before prod gate**

If dev verification exposes behavior not covered by the two source docs:

- patch `2026-04-13-problem-context-choice-artifact-desync.md`
- patch `2026-04-13-reusable-patch-design-choice-workflow.md`
- then update implementation branch accordingly

Expected: implementation reality and design docs remain synchronized.

**Step 7: Commit and prod gate**

```bash
git add .
git commit -m "feat: unify choice workflow contract across runtime and prompts"
```

Only if the entire branch is complete and dev verification is clean:

```bash
python3 scripts/deploy-skills-prod.py
```

Expected: Prod deploy is performed once, intentionally, after branch completion. If branch scope is still open, skip prod deploy.

---

Plan complete and saved to `docs/plans/2026-04-13-choice-workflow-contract-unification.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
