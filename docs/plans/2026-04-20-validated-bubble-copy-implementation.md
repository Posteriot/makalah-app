# Validated Bubble Copy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the chat approved bubble from the validation panel render clear, stage-specific copy for every stage, remove the lifecycle lock line, and keep the change strictly limited to this validation-approved bubble flow.

**Architecture:** Keep the change on the existing approval path only: `PaperValidationPanel` triggers `ChatWindow.handleApprove`, which writes the synthetic `[Approved: ...]` message, and `MessageBubble` renders that synthetic message. Generate the approved sentence from the existing paper stage source of truth (`getNextStage`, `getStageLabel`) so every stage follows the same rule, including the final stage edge case.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Verify the exact approval bubble scope and lock the file list

**Files:**
- Modify: `docs/plans/2026-04-20-validated-bubble-copy-implementation.md`
- Inspect only: `src/components/chat/ChatWindow.tsx`
- Inspect only: `src/components/chat/MessageBubble.tsx`
- Inspect only: `src/components/paper/PaperValidationPanel.tsx`
- Inspect only: `convex/paperSessions/constants.ts`

**Step 1: Re-read the approval flow entry point**

Inspect:

```bash
sed -n '2500,2532p' src/components/chat/ChatWindow.tsx
```

Expected:
- `handleApprove` calls `approveStage(userId)`
- approval synthetic message is emitted from `sendMessageWithPendingIndicator(...)`

**Step 2: Re-read the approved bubble renderer**

Inspect:

```bash
sed -n '1542,1558p' src/components/chat/MessageBubble.tsx
```

Expected:
- approved bubble shows `Tahap disetujui`
- approved bubble still shows `Lifecycle artifak: terkunci`
- approved bubble still falls back to `Lanjut ke tahap berikutnya.`

**Step 3: Re-read the stage source of truth**

Inspect:

```bash
sed -n '1,70p' convex/paperSessions/constants.ts
```

Expected:
- `getNextStage(current)` exists
- `getStageLabel(stage)` exists
- final stage returns `"completed"`

**Step 4: Re-read the approve toast source**

Inspect:

```bash
sed -n '32,37p' src/components/paper/PaperValidationPanel.tsx
```

Expected:
- approve toast is still generic and does not mention the next stage label

**Step 5: Confirm implementation scope before code edits**

Allowed code files for this task:
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/paper/PaperValidationPanel.tsx`
- One narrowly related test file for `MessageBubble`
- Optional: one tiny helper file only if extracting the approved sentence is necessary for testability

Disallowed:
- Any non-chat workflow code
- Convex mutations/actions
- Validation panel behavior beyond its approve toast copy
- Styling changes unrelated to the approved bubble content

### Task 2: Write failing tests for the approved bubble contract

**Files:**
- Create: `src/components/chat/MessageBubble.approved-stage.test.tsx`
- Inspect only: `src/components/chat/MessageBubble.reference-inventory.test.tsx`
- Inspect only: `src/components/chat/MessageBubble.search-status.test.tsx`

**Step 1: Copy the existing MessageBubble test harness pattern**

Inspect:

```bash
sed -n '1,120p' src/components/chat/MessageBubble.reference-inventory.test.tsx
```

Expected:
- lightweight mocks already show the preferred testing style for `MessageBubble`

**Step 2: Write the first failing test for a normal stage**

Add a test that renders a user message with approved synthetic content for a normal stage, for example:

```ts
const message = {
  id: "approved-gagasan",
  role: "user",
  parts: [
    {
      type: "text",
      text: "[Approved: Gagasan Paper] Tahap Gagasan Paper disetujui. Lanjut ke tahap berikutnya, yakni Penentuan Topik.",
    },
  ],
} as unknown as UIMessage
```

Assert:
- `Tahap disetujui` remains visible
- `Tahap Gagasan Paper disetujui. Lanjut ke tahap berikutnya, yakni Penentuan Topik.` is visible
- `Lifecycle artifak: terkunci` is not rendered
- fallback text `Lanjut ke tahap berikutnya.` by itself is not rendered

**Step 3: Write the second failing test for a mid-pipeline stage**

Add a case like:

```ts
"[Approved: Diskusi] Tahap Diskusi disetujui. Lanjut ke tahap berikutnya, yakni Kesimpulan."
```

Assert:
- the next stage label is `Kesimpulan`
- no lifecycle lock line is shown

**Step 4: Write the third failing test for the final stage**

Add a case like:

```ts
"[Approved: Pemilihan Judul] Tahap Pemilihan Judul disetujui. Semua tahap selesai."
```

Assert:
- the final-stage sentence renders exactly
- no next-stage sentence is shown

**Step 5: Run the focused test file to confirm failure**

Run:

```bash
npx vitest run src/components/chat/MessageBubble.approved-stage.test.tsx
```

Expected:
- FAIL because current renderer still prints the lifecycle lock line and generic fallback structure

### Task 3: Generate approved copy from the factual stage sequence

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Optional create only if needed: `src/components/chat/approved-stage-copy.ts`
- Optional test if helper extracted: `src/components/chat/approved-stage-copy.test.ts`
- Inspect only: `convex/paperSessions/constants.ts`

**Step 1: Choose the narrowest implementation shape**

Recommended:
- keep the approved message generation in `ChatWindow.tsx` if the logic stays short
- extract a tiny pure helper only if that materially improves testability and avoids duplicating string logic

Do not:
- move approval behavior into Convex
- introduce global copy utilities unrelated to chat approved messages

**Step 2: Implement the approved sentence builder**

Required logic:
- input: current stage label and current stage id
- compute `nextStage = getNextStage(currentStage)`
- if `nextStage !== "completed"`:

```ts
`Tahap ${currentLabel} disetujui. Lanjut ke tahap berikutnya, yakni ${getStageLabel(nextStage)}.`
```

- else:

```ts
`Tahap ${currentLabel} disetujui. Semua tahap selesai.`
```

**Step 3: Replace the old generic synthetic message**

In `handleApprove`, replace:

```ts
`[Approved: ${stageLabel}] Lanjut ke tahap berikutnya.`
```

with the stage-specific sentence produced in Step 2.

**Step 4: Run focused tests for the helper path**

Run one of:

```bash
npx vitest run src/components/chat/MessageBubble.approved-stage.test.tsx
```

or, if a helper file is extracted:

```bash
npx vitest run src/components/chat/approved-stage-copy.test.ts src/components/chat/MessageBubble.approved-stage.test.tsx
```

Expected:
- previous failure shifts from generation to rendering details, or passes if both sides already align

### Task 4: Simplify the approved bubble renderer without broad UI changes

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Test: `src/components/chat/MessageBubble.approved-stage.test.tsx`

**Step 1: Preserve the approved synthetic detection**

Keep:
- `[Approved: ...]` parsing
- `kind: "approved"` branch

Do not:
- change revision flow
- change choice flow
- change message parsing for unrelated message types

**Step 2: Remove the lifecycle lock line**

Delete the approved-only block that currently renders:

```tsx
Lifecycle artifak: terkunci
```

**Step 3: Render the approved sentence as the main body**

Update the approved branch so it renders:
- heading: `Tahap disetujui`
- body text: the full approved sentence stored in `autoUserAction.followupText`

Keep the layout minimal:
- no extra informational sub-row
- no new visual treatment outside the approved bubble block

**Step 4: Keep backward compatibility for legacy approved messages**

If `followupText` is missing or empty, render the safest fallback:

```ts
`Tahap ${autoUserAction.stageLabel} disetujui.`
```

Do not fall back to the old generic sentence.

**Step 5: Run the approved bubble test file**

Run:

```bash
npx vitest run src/components/chat/MessageBubble.approved-stage.test.tsx
```

Expected:
- PASS for normal stage
- PASS for middle stage
- PASS for final stage

### Task 5: Align the validation panel approve toast with the same copy rule

**Files:**
- Modify: `src/components/paper/PaperValidationPanel.tsx`
- Optional test only if already covered nearby: none required unless a tiny pure helper is extracted

**Step 1: Keep the scope limited to approve success toast**

Do not touch:
- button behavior
- revision form
- dirty-state warning
- loading state

**Step 2: Reuse the same sentence source if available**

Preferred:
- use the same approved sentence builder from Task 3

Fallback:
- if no helper exists, duplicate only the final toast string composition with the same rule

**Step 3: Update the success toast**

Replace:

```ts
`Tahap "${stageLabel}" disetujui. Lanjut ke tahap berikutnya.`
```

with:
- normal stage: `Tahap {stage} disetujui. Lanjut ke tahap berikutnya, yakni {next stage}.`
- final stage: `Tahap {stage} disetujui. Semua tahap selesai.`

**Step 4: Run the approved bubble test again**

Run:

```bash
npx vitest run src/components/chat/MessageBubble.approved-stage.test.tsx
```

Expected:
- PASS remains stable after the toast-only change

### Task 6: Run targeted verification and stop without unrelated edits

**Files:**
- Verify only: `src/components/chat/ChatWindow.tsx`
- Verify only: `src/components/chat/MessageBubble.tsx`
- Verify only: `src/components/paper/PaperValidationPanel.tsx`
- Verify only: `src/components/chat/MessageBubble.approved-stage.test.tsx`
- Verify only helper file if created

**Step 1: Run all directly related tests**

Run:

```bash
npx vitest run \
  src/components/chat/MessageBubble.approved-stage.test.tsx \
  src/components/chat/MessageBubble.search-status.test.tsx \
  src/components/chat/MessageBubble.reference-inventory.test.tsx
```

Expected:
- PASS
- no regressions in adjacent `MessageBubble` rendering paths

**Step 2: Optional narrow type/lint sanity check for touched files only**

Run:

```bash
npx eslint \
  src/components/chat/ChatWindow.tsx \
  src/components/chat/MessageBubble.tsx \
  src/components/paper/PaperValidationPanel.tsx \
  src/components/chat/MessageBubble.approved-stage.test.tsx
```

Expected:
- no lint errors in touched files

**Step 3: Manual UI verification if authenticated session is available**

Verify in browser:
- approve a non-final stage and confirm the bubble reads:
  `Tahap {stage} disetujui. Lanjut ke tahap berikutnya, yakni {next stage}.`
- approve the final stage and confirm the bubble reads:
  `Tahap {stage} disetujui. Semua tahap selesai.`
- confirm `Lifecycle artifak: terkunci` no longer appears

**Step 4: Confirm no unrelated files changed**

Run:

```bash
git diff -- src/components/chat/ChatWindow.tsx src/components/chat/MessageBubble.tsx src/components/paper/PaperValidationPanel.tsx src/components/chat/MessageBubble.approved-stage.test.tsx src/components/chat/approved-stage-copy.ts src/components/chat/approved-stage-copy.test.ts
```

Expected:
- diff is limited to the approved validation bubble flow only

**Step 5: Commit**

Only after verification passes:

```bash
git add \
  src/components/chat/ChatWindow.tsx \
  src/components/chat/MessageBubble.tsx \
  src/components/paper/PaperValidationPanel.tsx \
  src/components/chat/MessageBubble.approved-stage.test.tsx \
  src/components/chat/approved-stage-copy.ts \
  src/components/chat/approved-stage-copy.test.ts
git commit -m "fix: clarify approved validation bubble copy"
```

Skip helper files in `git add` if they were not created.
