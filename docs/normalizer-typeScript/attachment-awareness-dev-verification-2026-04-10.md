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

### Verification layer semantics (important clarification added 2026-04-10 in response to Codex Audit 6)

The deployment script runs TWO verification layers. They validate different things:

**Layer 1 (authoritative): Readback diff against local files** — `scripts/deploy-attachment-awareness-dev.mjs:128-140`

For each of the 14 stage skills, the script calls `stageSkills.getActiveByStage({ stageScope })` after the activate mutation and compares the returned `active.content` byte-for-byte against the expected content loaded from `.references/system-prompt-skills-active/updated-4/<skill>.md`. Any mismatch throws and aborts the deploy.

The same readback-and-diff is performed for the system prompt against `.references/system-prompt-skills-active/updated-4/system-prompt.md`.

This is the authoritative proof that the NEWLY ACTIVE version on the dev DB matches the local target files. The deploy script returning `"ok": true` in the result JSON implies all 14 readback diffs plus the system prompt readback diff passed. If any had failed, the script would have thrown before reaching the completion log.

**Layer 2 (secondary, non-authoritative): `runPreActivationDryRun`** — `scripts/deploy-attachment-awareness-dev.mjs:142-149`

The script then calls `stageSkills.runPreActivationDryRun` and records the result into the progress JSON under `verification.dryRun`. This is useful as a validator regression check, but it does NOT validate the newly active version. Here's why:

Per `convex/stageSkills.ts:1028-1031`, the dry run picks candidate content in this precedence order for each stage:
```
const candidate = latestDraft ?? latestPublished ?? active;
```

The `versions` query uses `.order("desc")` on `_creationTime`, so after the deploy sequence (`createOrUpdateDraft` → `publishVersion` → `activateVersion`):
- `latestDraft` is undefined — no drafts remain; the one we created was immediately activated
- `latestPublished` is the PREVIOUS active version that `activateVersion` just demoted to `"published"` status — the most recently `_creationTime`-ordered published version is usually the just-demoted one
- `active` is the newly deployed version

The candidate = `undefined ?? <just-demoted-previous-active> ?? <newly-deployed-active>` = **just-demoted-previous-active**.

So `runPreActivationDryRun` after an activate cycle validates the **previous** version (now published), not the **newly active** version. It is still a useful sanity check (confirms the previous version was structurally valid at deploy time), but it is NOT the deployment verification proof.

**Where to find the authoritative verification proof in committed artifacts:**
1. **Deploy script result JSON** — the `"ok": true` above implies all 14 readback diffs passed (script would have thrown otherwise)
2. **Deploy script source** — `scripts/deploy-attachment-awareness-dev.mjs:128-140` shows the readback-diff logic
3. **Progress JSON `stageSkills` array** — lists all 14 skills with their newly active version numbers, recorded after each successful readback

The progress JSON's `verification.dryRun` field should be read as "latest_published candidate validator result," not "newly active deployment validator result." A future revision of the deployment script could either:
- Stop recording dry run into the `verification` field (move it to `sanityChecks`), or
- Add a new `verification.readbackDiff` field that captures the per-stage readback result explicitly

This clarification does NOT change the correctness of the actual deployment — the readback diff at lines 128-140 is authoritative and it passed for all 14 skills and the system prompt. This only corrects the semantic framing of the progress JSON's `verification.dryRun` field.

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
- Summarized content: `4/5` (attempt 1 unverified after Codex Audit 6 correction — see observation log correction note)
- Integrated into turn: `5/5`
- Severe limitation threshold: `NOT TRIGGERED` (threshold requires ≥3 of 5 attempts to ignore the file entirely; all 5 at minimum mentioned and integrated the file)

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

- Each failing assertion receives `Promise {}` instead of the expected string mode — signature of a sync test calling an async function without `await`.

Scope evidence (why these are pre-existing, not introduced by this branch):

- Neither the test file `__tests__/reference-presentation.test.ts` nor its target `src/lib/ai/web-search/reference-presentation.ts` is touched by any commit in this branch. Verifiable via:
  ```bash
  git log --oneline $(git merge-base main normalizer-typeScript)..normalizer-typeScript -- \
    __tests__/reference-presentation.test.ts \
    src/lib/ai/web-search/reference-presentation.ts
  ```
  This command returns zero commits when run against the branch state at commit `6f2cc73e` (dev-verification head), confirming these files were not modified by Change Groups A, B, or C.
- The failure mode (`Promise {}` sync/async mismatch) is a property of `reference-presentation.ts` and its sync test — it can only be caused by changes to those files, which this branch makes none of.
- The Audit 4 report previously confirmed these same 3 failures existed on the baseline commit used for that audit (see `git diff 0c3f2b95..31e4a913` audit history).

Therefore these 3 failures are classified as pre-existing, unrelated to the attachment awareness work in this branch.

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
- T11: complete and favorable (`5/5` acknowledgment, `4/5` confirmed summary with attempt 1 unverified per Audit 6 correction, `5/5` integration — severe limitation threshold NOT TRIGGERED)

## Conclusion

From a verification standpoint, the branch is ready for final review.

Branch decision for audit traceability:

- helper scripts are included in the branch
- snapshot JSON artifacts are included in the branch
- verification docs are included in the branch

Next step:

- run the final review/audit pass before merge or push
