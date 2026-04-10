# Attachment Awareness Dev Verification — 2026-04-10

## Scope

This note records the post-implementation verification evidence for:

- D1.5 pre-deployment snapshot
- D2 dev deployment to `wary-ferret-59`
- Smoke tests `T2-T8`
- Observation test `T11`
- Regression test `T9`
- Skill diff verification `T10`

## D1.5 Snapshot

Command:

```bash
node scripts/create-convex-snapshot.mjs dev
```

Result:

```json
{
  "ok": true,
  "outputPath": "snapshots/pre-deployment-2026-04-10T11-07-41Z.json",
  "sourceDatabase": "wary-ferret-59",
  "stageCount": 14,
  "systemPromptVersion": 24
}
```

Snapshot file:

- `snapshots/pre-deployment-2026-04-10T11-07-41Z.json`

## D2 Dev Deployment

Command:

```bash
node scripts/deploy-attachment-awareness-dev.mjs
```

Result:

```json
{
  "ok": true,
  "target": "wary-ferret-59",
  "progressPath": "snapshots/deployment-progress-2026-04-10T11-10-11Z.json",
  "skillsDeployed": 14,
  "systemPromptVersion": 25,
  "dryRunPassedStages": 14,
  "dryRunTotalStages": 14
}
```

Deployment progress file:

- `snapshots/deployment-progress-2026-04-10T11-10-11Z.json`

## Smoke Tests

### T2 — First turn with medium file in paper mode

- Status: `PASS`
- Conversation: `http://localhost:3000/chat/j576rz86bwg0awahdd0f9whhrn84jd0t`
- Evidence: assistant acknowledged the uploaded file first and summarized it before continuing ideation.

### T3 — First turn with medium file plus longer prompt in paper mode

- Status: `PASS`
- Conversation: `http://localhost:3000/chat/j577a88tmynjfxjg4ez63fzq6184j3t3`
- Evidence: assistant still acknowledged and summarized the file first, then continued the discussion.

### T4 — Non-paper mode attachment awareness

- Status: `PASS`
- Conversation: `http://localhost:3000/chat/j57e6fvyntertxvjtcwkra9ann84j882`
- Evidence: assistant acknowledged `t2-medium-reference.pdf` and answered from its content in non-paper mode.

### T5 — Follow-up question in same conversation

- Status: `PASS`
- Conversation: `http://localhost:3000/chat/j576rz86bwg0awahdd0f9whhrn84jd0t`
- Evidence: assistant answered `Apa metodologi yang mereka pakai?` from the already uploaded PDF.

### T6 — Large file with truncation marker handling

- Status: `PASS`
- Conversation: `http://localhost:3000/chat/j573qmtts3a63rjpehr32an8f184jx0f`
- Evidence: assistant explicitly said the file was partial/terpotong and mentioned `quoteFromSource` / `searchAcrossSources`.

### T7 — Multiple files total budget

- Status: `PASS`
- Conversation: `http://localhost:3000/chat/j577t7saze3j8n0bm9d0eqp93x84k347`
- Files uploaded:
  - `t7-budget-file-1.pdf`
  - `t7-budget-file-2.pdf`
  - `t7-budget-file-3.pdf`
  - `t7-budget-file-4.pdf`
  - `t7-budget-file-5.pdf`
- Evidence summary:
  - assistant acknowledged all five files
  - assistant summarized files 1-4
  - assistant explicitly said files 1-4 were truncated
  - assistant explicitly said file 5 was omitted because of the total file budget

Key evidence:

```text
t7-budget-file-1.pdf ... File ini terpotong
t7-budget-file-2.pdf ... File ini juga terpotong
t7-budget-file-3.pdf ... File ini juga terpotong
t7-budget-file-4.pdf ... File ini terpotong
Untuk file t7-budget-file-5.pdf, file tersebut tidak dapat dimuat ke dalam konteks percakapan saat ini karena batasan ukuran total file.
```

### T8 — No files attached regression

- Status: `PASS`
- Conversation: `http://localhost:3000/chat/j578yhepbr4sgvsjd0ecyy4k6d84jmz5`
- Evidence: assistant brainstormed normal paper ideas with no fake attachment acknowledgment.

## T11 Observation Test

Observation log:

- `docs/normalizer-typeScript/t11-observation-log-2026-04-10.md`

Summary:

- Status: `PASS (non-blocking observation)`
- Attempts: `5`
- Mentioned file name: `5/5`
- Summarized content: `5/5`
- Integrated into turn: `5/5`
- Severe limitation threshold: `NOT TRIGGERED`

## T9 Regression Test

Command:

```bash
npx vitest run
```

Fresh result:

- `969` tests passed
- `3` tests failed
- total: `972`

Failure set:

- `__tests__/reference-presentation.test.ts`
  - `switches to reference_inventory mode for explicit link/pdf requests`
  - `keeps synthesis mode for analytical prompts without reference-list intent`
  - `recognizes common inventory phrasing as reference inventory mode`

Failure shape:

- Each failing assertion receives `Promise {}` instead of the expected string mode.
- This failure set matches the already known pre-existing baseline mentioned before deployment.

## T10 Skill Diff Verification

Verification script result:

```text
files= 14
all_match= True
sha1= c3ba591c4b1eb4a2a08a51f6601758afafbfb348
```

Interpretation:

- all 14 `## Attachment Handling` blocks are byte-identical
- no stage-specific framing slipped into Change Group C

## Branch Status After Verification

Artifacts included in this branch:

- `scripts/create-convex-snapshot.mjs`
- `scripts/deploy-attachment-awareness-dev.mjs`
- `scripts/generate-attachment-awareness-test-pdfs.mjs`
- `snapshots/`
- `docs/normalizer-typeScript/attachment-awareness-dev-verification-2026-04-10.md`
- `docs/normalizer-typeScript/t11-observation-log-2026-04-10.md`

## Readiness Summary

- Change Group A: audited and approved
- Change Groups B + C: audited and approved
- D1.5: complete on dev
- D2: complete on dev
- T2-T8: complete and passing
- T9: fresh baseline confirmed (`969/972`, same 3 known failures)
- T10: complete and passing
- T11: complete and favorable (`5/5` acknowledgment, summary, integration)

## Conclusion

From a verification standpoint, the branch is ready for final review.

Branch decision for audit traceability:

- helper scripts are included in the branch
- snapshot JSON artifacts are included in the branch
- verification docs are included in the branch

Next step:

- run the final review/audit pass before merge or push
