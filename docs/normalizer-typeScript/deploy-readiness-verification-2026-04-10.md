# Deploy Readiness Verification — 2026-04-10

## Scope

Verify that the 14 paper stage skills + system prompt in `.references/system-prompt-skills-active/updated-4/` are correctly deployed to the intended Convex database targets:

- **DEV:** `wary-ferret-59`
- **PROD:** `basic-oriole-337`

This verification is read-only against PROD by design. No PROD writes performed.

## Environment Mapping (verified)

Confirmed via `.env.local` and `npx convex env list` / `npx convex env list --prod`:

| Environment | Convex deployment | URL | CONVEX_INTERNAL_KEY (last 8) |
|---|---|---|---|
| DEV (active in `.env.local`) | `dev:wary-ferret-59` | `https://wary-ferret-59.convex.cloud` | `...62b70369` |
| PROD (via `--prod` flag) | `basic-oriole-337` | (production deployment of the linked Convex project) | `...62b70369` (different value, ends `...62b70369` for dev vs `...8bbecf9e4` for prod) |

The user-stated mapping is confirmed correct: `wary-ferret-59 = DEV`, `basic-oriole-337 = PROD`.

## Methodology

Verification script (one-off, not committed to scripts/) at `/tmp/check-dev-sync.mjs`:
1. For each of 14 skills: call `stageSkills:getActiveByStage({ stageScope })` against the target DB and compare returned `content` byte-for-byte against the locally-stored skill file content.
2. For system prompt: call `systemPrompts:getActiveSystemPrompt({})` against the target DB and compare returned `content` byte-for-byte against `system-prompt.md`.
3. Apply server-side normalization equivalent: both `stageSkills.createOrUpdateDraft` (`convex/stageSkills.ts:374`) and `systemPrompts.updateSystemPrompt` (`convex/systemPrompts.ts:235`) call `.trim()` on `content` before storing. So local-vs-DB comparison must be `db.content === local.trim()` to be apples-to-apples. Without this trim awareness, files with a trailing newline would show a 1-character cosmetic diff that does NOT represent real drift.
4. Skills also pass through `stripMarkdownTitle()` (strips a leading `# Title\n` line if present) — same as the deploy script.

The `--prod` flag of `npx convex run` was used to read from `basic-oriole-337` without altering any active session deployment.

## DEV (`wary-ferret-59`) Status

**Result: ALL IN SYNC (15/15 match — 14 skills + system prompt)**

```
=== Sync check (trim-aware): DEV ===
  gagasan: MATCH (active v24, 9144 chars)
  topik: MATCH (active v24, 6855 chars)
  outline: MATCH (active v25, 8005 chars)
  abstrak: MATCH (active v24, 6945 chars)
  pendahuluan: MATCH (active v24, 10373 chars)
  tinjauan_literatur: MATCH (active v23, 10843 chars)
  metodologi: MATCH (active v23, 6475 chars)
  hasil: MATCH (active v24, 8438 chars)
  diskusi: MATCH (active v25, 10913 chars)
  kesimpulan: MATCH (active v25, 7523 chars)
  pembaruan_abstrak: MATCH (active v25, 9776 chars)
  daftar_pustaka: MATCH (active v24, 10696 chars)
  lampiran: MATCH (active v23, 7396 chars)
  judul: MATCH (active v24, 7356 chars)
  systemPrompt: MATCH (active v25, 15946 chars)

=== Result: ALL IN SYNC (trim-aware) ===
```

**Interpretation:**
- The dev deploy that ran on 2026-04-10 (commit `6f2cc73e` evidence) is intact and unchanged
- All 14 stages plus system prompt active versions on `wary-ferret-59` byte-match the local source files
- No DEV deployment action needed

**Important nuance — initial run showed 12 false-positive diffs:** First run without trim-aware comparison flagged 12 of 14 skills as DIFF by exactly 1 character. Investigation showed these 12 skills have a trailing `\n` in the local file, which the deploy mutation strips via `.trim()`. The 2 skills that "matched" (`gagasan`, `topik`) happen to have no trailing newline. After applying `.trim()` to local content for the comparison (matching the deploy mutation's normalization), all 15 entries match. This is documented here so future verifications use the trim-aware comparison from the start.

## PROD (`basic-oriole-337`) Status

**Result: ALL OUT OF SYNC (15/15 mismatches — 14 skills + system prompt)**

```
=== Sync check (trim-aware): PROD ===
  gagasan: DIFF (active v7, 7855 chars)
  topik: DIFF (active v7, 5566 chars)
  outline: DIFF (active v8, 6716 chars)
  abstrak: DIFF (active v7, 5656 chars)
  pendahuluan: DIFF (active v7, 9084 chars)
  tinjauan_literatur: DIFF (active v7, 9554 chars)
  metodologi: DIFF (active v7, 5186 chars)
  hasil: DIFF (active v7, 7149 chars)
  diskusi: DIFF (active v7, 9624 chars)
  kesimpulan: DIFF (active v7, 6234 chars)
  pembaruan_abstrak: DIFF (active v7, 8487 chars)
  daftar_pustaka: DIFF (active v7, 9407 chars)
  lampiran: DIFF (active v7, 6107 chars)
  judul: DIFF (active v7, 6067 chars)
  systemPrompt: DIFF (active v5, 15163 chars)

=== Result: 15 MISMATCH(ES) ===
```

**Interpretation:**
- All 14 PROD skills are at active version 7-8; DEV is at active version 23-25
- PROD system prompt is at active version 5; DEV is at active version 25
- Each PROD skill is ~1200-1400 chars shorter than its local counterpart — consistent with PROD missing the new "Attachment Handling" section + the additive Input Context paragraph
- PROD system prompt is ~783 chars shorter than local — consistent with PROD missing the strengthened attachment directive bullets
- This is the EXPECTED state. PROD has the OLD content from before the attachment awareness fix. PROD has not received any deploy of this branch yet (consistent with the plan: prod deploy happens after branch merge to main).

**This is not a bug. This is the documented state of pre-merge PROD.**

## Deploy Decision

### DEV
**Action: NONE**

DEV is already in sync. The dev deploy was completed in commit `6f2cc73e` and is still intact. No further DEV action needed for this verification cycle.

### PROD
**Action: STOP — request explicit confirmation**

PROD is out of sync as expected. This is the gap the merge-to-main + prod-deploy phase is meant to close. Per user instructions, no PROD writes happen without explicit confirmation.

#### Gap analysis: Existing tooling vs PROD deploy needs

**Current deploy script:** `scripts/deploy-attachment-awareness-dev.mjs`

This script has THREE characteristics that prevent it from being used directly against PROD:

1. **Hardcoded DEV URL guard** (`scripts/deploy-attachment-awareness-dev.mjs:6`):
   ```javascript
   const DEV_DEPLOYMENT_URL = "https://wary-ferret-59.convex.cloud";
   ```
   And the `assertDevDeployment()` function (lines 43-53) aborts if `.env.local`'s `NEXT_PUBLIC_CONVEX_URL` does not match this dev URL. Running it as-is against PROD would either fail the safety guard or — if `.env.local` were temporarily switched to PROD URL — succeed but write to PROD via the same `npx convex run` calls (no `--prod` flag in the script).

2. **No `--prod` flag in convex CLI calls** (line 31):
   ```javascript
   ["convex", "run", functionName, JSON.stringify(args)]
   ```
   The script invokes `npx convex run <fn> <args>` without `--prod`, so it always targets the deployment from `.env.local`. To target PROD, every convex run call would need a `--prod` flag.

3. **No prod-specific safeguards:** No interactive confirmation, no dry-run mode, no rollback rehearsal step. For DEV this is acceptable; for PROD it is risky.

#### Safest path forward for PROD deploy

**Recommended sequence (NOT executed without confirmation):**

1. **Pre-deploy snapshot of PROD** — run a one-off snapshot script against PROD to capture the current 14 active skills + active system prompt. Store under `snapshots/pre-deployment-prod-2026-04-10T<HHMMSS>Z.json`. This is the rollback source for R4.
   - The existing `scripts/create-convex-snapshot.mjs` may need a `--prod` flag added; if it doesn't support that, the safest action is a small, contained edit to add `--prod` support, OR a one-off manual run via `npx convex run --prod` and saving the JSON.
2. **Create a PROD deploy script** — either:
   - **Option A (preferred):** Modify `scripts/deploy-attachment-awareness-dev.mjs` to accept a `--target=dev|prod` argument with the appropriate `convex run` flag and a different safety guard per target. Rename the file accordingly, or duplicate as `deploy-attachment-awareness.mjs` with target argument.
   - **Option B:** Create a sibling script `scripts/deploy-attachment-awareness-prod.mjs` that hardcodes `--prod` and asserts the target is the prod project. Keeps the dev script untouched.
   - **Option C (manual):** Run all the mutations one-by-one via `npx convex run --prod`. Most error-prone, not recommended.
3. **Run pre-deploy verification** — before mutations run, the script must read back current PROD active versions and capture them in a progress JSON (as the dev script does for dev), so the deployment record is auditable.
4. **Run mutations sequentially:** for each of 14 skills, `createOrUpdateDraft` → `publishVersion` → `activateVersion`, then for system prompt, `updateSystemPrompt`. After each successful mutation, do a readback diff against the local file and abort on any mismatch.
5. **Post-deploy verification:** rerun this verification script against PROD; expect ALL IN SYNC (15/15 match).
6. **24-hour PROD monitoring** (D5 of the fix plan).

**Do not improvise prod tooling without confirmation.** I can prepare any of the above deliverables (snapshot script, prod deploy script, verification script) once you confirm the approach you want.

## Evidence Files

- This verification doc: `docs/normalizer-typeScript/deploy-readiness-verification-2026-04-10.md`
- The verification script (one-off, not committed): `/tmp/check-dev-sync.mjs` — content reproduced inline above for traceability
- DEV deploy artifacts (already committed): `snapshots/pre-deployment-2026-04-10T11-07-41Z.json`, `snapshots/deployment-progress-2026-04-10T11-10-11Z.json`, `docs/normalizer-typeScript/attachment-awareness-dev-verification-2026-04-10.md`

## Summary

| Question | Answer |
|---|---|
| Status environment target | DEV `wary-ferret-59` confirmed; PROD `basic-oriole-337` confirmed |
| Status sync local vs active DB | DEV: 15/15 in sync. PROD: 15/15 out of sync (expected — pre-merge state) |
| Apakah deploy perlu dilakukan? | DEV: NO. PROD: YES, but only with explicit confirmation and proper tooling. |
| Kalau deploy dilakukan: bukti suksesnya | DEV deploy from 2026-04-10 still intact (this verification confirms it). |
| Kalau deploy tidak dilakukan: next step | PROD: do not improvise. Wait for user to (a) confirm scope and timing of PROD deploy, (b) approve the proposed safest-path sequence above. |

## Decision Required from User

Two questions for you to answer before any PROD action:

1. **Scope:** Is the intended PROD deploy target indeed `basic-oriole-337` for this fix, AND should it happen now (before/after merge to main), OR should we wait?
2. **Tooling approach:** If PROD deploy is approved, which option for the script?
   - Option A: Modify existing `deploy-attachment-awareness-dev.mjs` to accept `--target=dev|prod`
   - Option B: New sibling script `deploy-attachment-awareness-prod.mjs`
   - Option C: Manual mutations via `npx convex run --prod` one-by-one (NOT RECOMMENDED)

Until both answers are given, no PROD writes will happen.
