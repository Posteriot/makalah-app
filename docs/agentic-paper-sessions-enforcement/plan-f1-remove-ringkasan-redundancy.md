# F1: Remove Ringkasan Redundancy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove redundant `ringkasan` and `ringkasanDetail` fields from the paper workflow, making artifact the Single Source of Truth (SSOT) for stage output.

**Architecture:** Remove ringkasan from tool schema, backend guards, context builder, stage instructions, type definitions, whitelist, admin UI, and tests. Derive stage summaries from artifact content via the existing `formatArtifactSummaries()`. Memory digest switches from `ringkasan.slice(0, 200)` to `artifact.title`.

**Tech Stack:** TypeScript, Convex (backend mutations/queries), Zod (schema validation), Vitest (testing), React (admin UI)

**Design doc:** `docs/agentic-paper-sessions-enforcement/design-f1-remove-ringkasan-redundancy.md`

**Test runner:** `npx vitest run` (vitest 4.0.16)

**IMPORTANT scope note:** Only remove generic `ringkasan` and `ringkasanDetail`. KEEP stage-specific fields: `ringkasanPenelitian` (AbstrakData), `ringkasanHasil` (KesimpulanData), `ringkasanPenelitianBaru` (PembaruanAbstrakData) — these are used by the document export pipeline.

---

## Task 1: Remove ringkasan from type definitions and whitelist

Foundation layer — types and validators must change first so TypeScript catches downstream references.

**Files:**
- Modify: `src/lib/paper/stage-types.ts` (14 interfaces)
- Modify: `convex/paperSessions/types.ts` (14 validators)
- Modify: `convex/paperSessions/stageDataWhitelist.ts` (14 whitelists)

**Step 1: Remove `ringkasan` and `ringkasanDetail` from all 14 stage interfaces in `stage-types.ts`**

Remove these two lines from each of the 14 interfaces: `GagasanData`, `TopikData`, `AbstrakData`, `PendahuluanData`, `TinjauanLiteraturData`, `MetodologiData`, `HasilData`, `DiskusiData`, `KesimpulanData`, `PembaruanAbstrakData`, `DaftarPustakaData`, `LampiranData`, `JudulData`, `OutlineData`:

```typescript
// REMOVE from each interface:
ringkasan?: string;
ringkasanDetail?: string;
```

**DO NOT remove** from `AbstrakData`: `ringkasanPenelitian?: string`
**DO NOT remove** from `KesimpulanData`: `ringkasanHasil?: string`
**DO NOT remove** from `PembaruanAbstrakData`: `ringkasanPenelitianBaru?: string`

**Step 2: Remove `ringkasan` and `ringkasanDetail` from all 14 Convex validators in `types.ts`**

Same pattern — remove the two validator fields from each stage object. Keep stage-specific ones.

**Step 3: Remove `"ringkasan"` and `"ringkasanDetail"` from all 14 entries in `stageDataWhitelist.ts`**

Each stage array starts with `"ringkasan", "ringkasanDetail", ...` — remove those two strings from each.

**Step 4: Run TypeScript compiler to see all downstream breakages**

Run: `npx tsc --noEmit 2>&1 | head -80`
Expected: Multiple type errors in files that reference `data.ringkasan` — this is the roadmap for subsequent tasks.

**Step 5: Commit**

```
git add src/lib/paper/stage-types.ts convex/paperSessions/types.ts convex/paperSessions/stageDataWhitelist.ts
git commit -m "refactor(f1): remove ringkasan/ringkasanDetail from types, validators, whitelist"
```

---

## Task 2: Remove ringkasan from tool schemas (paper-tools.ts)

**Files:**
- Modify: `src/lib/ai/paper-tools.ts:101-360`

**Step 1: Remove ringkasan fields from `updateStageData` inputSchema (lines 144-160)**

Before:
```typescript
inputSchema: z.object({
    ringkasan: z.string().max(280).describe(...),
    ringkasanDetail: z.string().max(1000).optional().describe(...),
    data: z.record(z.string(), z.any()).optional().describe(
        "Additional draft data object (besides ringkasan/ringkasanDetail). IMPORTANT: referensiAwal/referensiPendukung must be ARRAY OF OBJECTS!"
    ),
}),
```

After:
```typescript
inputSchema: z.object({
    data: z.record(z.string(), z.any()).describe(
        "Draft data object for the current stage. IMPORTANT: referensiAwal/referensiPendukung must be ARRAY OF OBJECTS!"
    ),
}),
```

Note: `data` changes from `.optional()` to required — it's now the only parameter.

**Step 2: Simplify `updateStageData` execute function (lines 161-207)**

Remove the mergedData construction that merges ringkasan into data. The execute function destructures only `{ data }` and passes `data` directly.

Before (line 161):
```typescript
execute: async ({ ringkasan, ringkasanDetail, data }) => {
```
After:
```typescript
execute: async ({ data }) => {
```

Before (lines 202-207):
```typescript
const mergedData = {
    ...(data || {}),
    ringkasan,
    ...(ringkasanDetail ? { ringkasanDetail } : {}),
};
```
After:
```typescript
// data is passed directly — no ringkasan merge needed
```

Pass `data` instead of `mergedData` to the mutation call (line 213).

**Step 3: Remove safety net comment and logic (lines 218-226)**

Remove the "Safety net: Parse warning from backend if ringkasan somehow missing" block — no longer applicable.

**Step 4: Update tool description (lines 102-143)**

Remove references to ringkasan from the description string. The examples should show only `data: { ... }` format.

**Step 5: Remove ringkasan from `compileDaftarPustaka` inputSchema (lines 256-265)**

Remove `ringkasan` and `ringkasanDetail` parameters. Remove runtime guard (lines 280-285). Remove from mergedData construction (lines 339-343).

Before (line 256):
```typescript
inputSchema: z.object({
    mode: z.enum(["preview", "persist"]).optional().describe(...),
    ringkasan: z.string().max(280).optional().describe(...),
    ringkasanDetail: z.string().max(1000).optional().describe(...),
}),
```
After:
```typescript
inputSchema: z.object({
    mode: z.enum(["preview", "persist"]).optional().describe(...),
}),
```

Before (line 267):
```typescript
execute: async ({ mode, ringkasan, ringkasanDetail }) => {
```
After:
```typescript
execute: async ({ mode }) => {
```

Remove lines 280-285 (persist mode ringkasan guard).

Before (lines 339-343):
```typescript
const mergedData = {
    ringkasan: ringkasan!,
    ...(ringkasanDetail ? { ringkasanDetail } : {}),
    ...compileResult.compiled,
};
```
After:
```typescript
const mergedData = {
    ...compileResult.compiled,
};
```

**Step 6: Commit**

```
git add src/lib/ai/paper-tools.ts
git commit -m "refactor(f1): remove ringkasan from updateStageData and compileDaftarPustaka schemas"
```

---

## Task 3: Remove ringkasan guards and budget from backend (paperSessions.ts)

**Files:**
- Modify: `convex/paperSessions.ts`
- Test: `convex/paperSessions.test.ts`

**Step 1: Write updated tests for submitForValidation**

Replace the 3 existing tests in `convex/paperSessions.test.ts` with tests that only check artifactId:

```typescript
describe("submitForValidation — artifact guard", () => {
  it("throws when artifactId is missing", async () => {
    const session = makeSession({
      stageData: { gagasan: {} },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx } = makeMockCtx();

    await expect(callHandler(ctx, { sessionId: "paperSessions_1" })).rejects.toThrow(
      /Artifact must be created first/
    );
  });

  it("succeeds when artifactId exists", async () => {
    const session = makeSession({
      stageData: { gagasan: { artifactId: "artifact_123" } },
    });
    mockedRequirePaperSessionOwner.mockResolvedValue({ session } as never);
    const { ctx, patches } = makeMockCtx();

    await callHandler(ctx, { sessionId: "paperSessions_1" });

    expect(patches.length).toBe(1);
    expect(patches[0].patch).toMatchObject({
      stageStatus: "pending_validation",
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/paperSessions.test.ts`
Expected: First test PASSES (artifactId missing still throws, but message might differ). Second test FAILS (ringkasan guard blocks before artifactId check).

**Step 3: Remove ringkasan guard from `submitForValidation` (lines 986-1001)**

Remove lines 986-1001 (the ringkasan guard block). Keep the artifactId guard (lines 1003-1012). Remove `ringkasan` variable extraction (line 991). Update console.log (line 994) to not reference ringkasan.

**Step 4: Remove ringkasan guard from `approveStage` (lines 1051-1060)**

Remove the guard block. Remove `ringkasan` variable extraction (line 1053).

**Step 5: Remove content budget calculation (lines 1062-1095)**

Remove the entire budget block — from "Phase 3 Task 3.3.2: Budget Enforcement" through the throw statement at line 1094.

**Step 6: Rewrite memory digest to use artifact title (lines 1108-1118)**

Before:
```typescript
const existingDigest = session.paperMemoryDigest || [];
const newDigestEntry = {
    stage: currentStage,
    decision: ringkasan.slice(0, 200),
    timestamp: now,
};
```

After:
```typescript
const existingDigest = session.paperMemoryDigest || [];
// Derive decision from artifact title, with legacy fallback to ringkasan
const stageArtifactId = currentStageData?.artifactId as string | undefined;
let decisionText = "(no summary)";
if (stageArtifactId) {
    const artifact = await ctx.db.get(stageArtifactId as Id<"artifacts">);
    decisionText = artifact?.title ?? "(untitled artifact)";
} else {
    // Legacy fallback: existing sessions may have ringkasan but no artifact
    const legacyRingkasan = currentStageData?.ringkasan as string | undefined;
    if (legacyRingkasan) {
        decisionText = legacyRingkasan.slice(0, 200);
    }
}
const newDigestEntry = {
    stage: currentStage,
    decision: decisionText,
    timestamp: now,
};
```

Note: add `Id` import from `convex/_generated/dataModel` if not already imported.

**Step 7: Remove `estimatedContentChars` and `estimatedTokenUsage` from patch (lines 1159, 1169-1170)**

These derived from the removed budget calculation. Remove:
```typescript
const estimatedTokens = Math.ceil(totalContentChars / 4);  // line 1159
```
And from the patch object:
```typescript
estimatedContentChars: totalContentChars,  // line 1169
estimatedTokenUsage: estimatedTokens,      // line 1170
```

Note: These fields remain in the Convex schema (schema.ts:723-724) as optional fields. They become stale but don't break anything. No schema migration needed.

**Step 8: Remove ringkasan warning from `updateStageData` mutation (lines 716-741)**

Remove the `hasRingkasan` check (lines 724-725) and the warning push (lines 737-741). Keep other warnings (unknownKeys, urlValidation, truncation).

**Step 9: Remove ringkasan from truncation exclusions (lines 375-409)**

Remove `"ringkasan"` and `"ringkasanDetail"` from `EXCLUDED_TRUNCATION_FIELDS` set (line 376). Remove the custom ringkasanDetail truncation block (lines 404-409).

**Step 10: Run tests**

Run: `npx vitest run convex/paperSessions.test.ts`
Expected: All PASS.

**Step 11: Commit**

```
git add convex/paperSessions.ts convex/paperSessions.test.ts
git commit -m "refactor(f1): remove ringkasan guards, budget check, rewrite digest to artifact.title"
```

---

## Task 4: Remove ringkasan from context builder (formatStageData.ts)

**Files:**
- Modify: `src/lib/ai/paper-stages/formatStageData.ts`
- Test: `__tests__/format-stage-data-superseded.test.ts`
- Delete: `__tests__/ringkasan-detail-injection.test.ts`
- Modify: `__tests__/stage-data-truncation.test.ts`

**Step 1: Update `format-stage-data-superseded.test.ts`**

The test currently checks ringkasan in formatStageData output. After F1, completed stage summaries come from `formatArtifactSummaries` (separate function), not from `formatStageData`. Update tests to NOT expect ringkasan strings in formatStageData output. Keep the web search reference cap tests and citation cap tests (those are unrelated to ringkasan).

Remove/rewrite these test cases:
- "should exclude superseded entries from ringkasan output" — remove (no ringkasan output anymore)
- "should include non-superseded entries normally" — remove (same reason)
- "should inject ringkasanDetail only for the last 3 completed stages" — remove

Keep these test cases:
- "should cap active stage webSearchReferences to 5 items" — keep but remove `ringkasan` from test data (use any other field)
- "should cap sitasiAPA to 5 and preserve URL visibility" — keep but remove `ringkasan` from test data

**Step 2: Delete `__tests__/ringkasan-detail-injection.test.ts`**

This entire file tests the detail window logic which is being removed.

Run: `rm __tests__/ringkasan-detail-injection.test.ts`

**Step 3: Update `__tests__/stage-data-truncation.test.ts`**

Remove the test "should not truncate excluded fields like ringkasan" (lines 42-47). Remove `"ringkasan"` and `"ringkasanDetail"` from the `EXCLUDED_FIELDS` set in the test (lines 4-7).

**Step 4: Run tests to see failures**

Run: `npx vitest run __tests__/`
Expected: Updated tests should fail because formatStageData still outputs ringkasan.

**Step 5: Remove `formatRingkasanTahapSelesai` and related helpers from formatStageData.ts**

1. Remove constants: `RINGKASAN_CHAR_LIMIT` (line 27), `RINGKASAN_DETAIL_CHAR_LIMIT` (line 29), `DETAIL_WINDOW_SIZE` (line 28)
2. Remove function: `truncateRingkasan()` (lines 256-261)
3. Remove function: `truncateRingkasanDetail()` (lines 147-152)
4. Remove function: `formatRingkasanTahapSelesai()` (lines 154-199)
5. Remove the call to `formatRingkasanTahapSelesai` in `formatStageData()` (line 115)

**Step 6: Remove `Summary: ${truncateRingkasan(data.ringkasan)}` from all 14 stage formatters**

Remove the ringkasan line from each formatter function:
- `formatGagasanData` (line 285)
- `formatTopikData` (line 311)
- `formatAbstrakData` (line 337)
- `formatPendahuluanData` (line 356)
- `formatTinjauanLiteraturData` (line 389)
- `formatMetodologiData` (line 416)
- `formatHasilData` (line 436)
- `formatDiskusiData` (line 467)
- `formatKesimpulanData` (line 490)
- `formatPembaruanAbstrakData` (line 515)
- `formatDaftarPustakaData` (line 541)
- `formatLampiranData` (line 587)
- `formatJudulData` (line 627)
- `formatOutlineData` (line 663)

**Step 7: Remove ringkasan type imports if unused**

Check if removing ringkasan from interfaces makes any stage type imports unused. Clean up.

**Step 8: Run tests**

Run: `npx vitest run __tests__/`
Expected: All PASS.

**Step 9: Commit**

```
git add src/lib/ai/paper-stages/formatStageData.ts __tests__/
git commit -m "refactor(f1): remove ringkasan from formatStageData, delete injection tests"
```

---

## Task 5: Remove ringkasan warnings from stage instructions

**Files:**
- Modify: `src/lib/ai/paper-stages/foundation.ts`
- Modify: `src/lib/ai/paper-stages/core.ts`
- Modify: `src/lib/ai/paper-stages/results.ts`
- Modify: `src/lib/ai/paper-stages/finalization.ts`

**Step 1: Clean `foundation.ts` — gagasan + topik instructions**

Remove from gagasan instructions:
- ringkasanDetail description in output spec (line 99)
- `ringkasan` from updateStageData call example (line 116)
- Warning blocks (lines 124, 130, 141)

Remove from topik instructions:
- ringkasanDetail description in output spec (line 240)
- `ringkasan` from updateStageData call example (line 257)
- Warning blocks (lines 265, 271, 282)

**Step 2: Clean `core.ts` — abstrak, pendahuluan, tinjauan_literatur, metodologi**

Same pattern for each stage — remove ringkasan/ringkasanDetail from output specs, tool call examples, and all warning blocks.

Abstrak: lines 93, 111, 120, 123, 129
Pendahuluan: lines 237, 254, 262, 268, 274
Tinjauan Literatur: lines 381, 399, 407, 413, 419
Metodologi: lines 515, 532, 540, 544, 550

**Step 3: Clean `results.ts` — hasil, diskusi, kesimpulan**

Hasil: lines 97, 115, 124, 127, 133
Diskusi: lines 237, 255, 264, 270, 276
Kesimpulan: lines 367, 385, 394, 397, 403

**Step 4: Clean `finalization.ts` — pembaruan_abstrak, daftar_pustaka, lampiran, judul, outline**

Pembaruan Abstrak: lines 106, 123, 133, 136, 142
Daftar Pustaka: lines 260, 279, 281, 290, 293, 299
Lampiran: lines 400, 417, 426, 429, 435
Judul: lines 542, 561, 570, 573, 579
Outline: lines 686, 704, 713, 716, 722

**Step 5: Verify no orphan ringkasan references remain**

Run: `grep -rn "ringkasan" src/lib/ai/paper-stages/ | grep -v "ringkasanPenelitian\|ringkasanHasil\|ringkasanPenelitianBaru"`
Expected: No matches (or only code comments, which should also be removed).

**Step 6: Commit**

```
git add src/lib/ai/paper-stages/
git commit -m "refactor(f1): remove ringkasan warnings from all 14 stage instructions"
```

---

## Task 6: Update general prompt (paper-mode-prompt.ts)

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts`

**Step 1: Update compileDaftarPustaka instruction (line 293)**

Before:
```
Bibliography finalization MUST use compileDaftarPustaka({ mode: "persist", ringkasan, ringkasanDetail? }) and is only valid when active stage = daftar_pustaka.
```

After:
```
Bibliography finalization MUST use compileDaftarPustaka({ mode: "persist" }) and is only valid when active stage = daftar_pustaka.
```

**Step 2: Check for any other ringkasan references in general rules**

Run: `grep -n "ringkasan" src/lib/ai/paper-mode-prompt.ts`
Expected: Only `formatMemoryDigest` function (which reads `d.decision`, not `d.ringkasan`) — no changes needed there.

**Step 3: Commit**

```
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "refactor(f1): remove ringkasan from compileDaftarPustaka instruction in general prompt"
```

---

## Task 7: Remove `hasStageRingkasan` from chat route (route.ts)

`hasStageRingkasan` is defined at line 919 and called at lines 2197 and 2202. A replacement `hasStageArtifact` already exists at line 935. We delete the ringkasan one and update its callers.

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Delete the entire `hasStageRingkasan` function (lines 919-933)**

This function is no longer needed — `hasStageArtifact` (lines 935-943) provides the equivalent check.

**Step 2: Update `shouldForceSubmitValidation` (line 2192-2198)**

Before:
```typescript
shouldForceSubmitValidation = !enableWebSearch
    && !!paperModePrompt
    && !shouldForceGetCurrentPaperState
    && isSaveSubmitIntent
    && paperSession?.stageStatus === "drafting"
    && hasStageRingkasan(paperSession)
    && hasStageArtifact(paperSession)
```

After (remove `hasStageRingkasan` line — `hasStageArtifact` already covers the readiness check):
```typescript
shouldForceSubmitValidation = !enableWebSearch
    && !!paperModePrompt
    && !shouldForceGetCurrentPaperState
    && isSaveSubmitIntent
    && paperSession?.stageStatus === "drafting"
    && hasStageArtifact(paperSession)
```

**Step 3: Update `missingArtifactNote` (lines 2200-2207)**

Before:
```typescript
missingArtifactNote = !shouldForceSubmitValidation
    && !!paperModePrompt
    && hasStageRingkasan(paperSession)
    && !hasStageArtifact(paperSession)
    && paperSession?.stageStatus === "drafting"
    && isSaveSubmitIntent
    ? `\n⚠️ ARTIFACT NOT YET CREATED ...`
    : ""
```

After (replace `hasStageRingkasan` with a simple "has any stage data" check — the note should still fire when user tries to save without artifact):
```typescript
missingArtifactNote = !shouldForceSubmitValidation
    && !!paperModePrompt
    && !hasStageArtifact(paperSession)
    && paperSession?.stageStatus === "drafting"
    && isSaveSubmitIntent
    ? `\n⚠️ ARTIFACT NOT YET CREATED ...`
    : ""
```

Note: removing the `hasStageRingkasan` guard makes the note trigger more broadly (any save intent without artifact), which is actually correct behavior — the note warns about missing artifact regardless of other data state.

**Step 4: Commit**

```
git add src/app/api/chat/route.ts
git commit -m "refactor(f1): remove hasStageRingkasan, use hasStageArtifact for submit guards"
```

---

## Task 8: Update admin UI and backend (SessionDetailDialog + aiOps)

**Files:**
- Modify: `convex/aiOps.ts:167-179` (stageDetails extraction)
- Modify: `src/components/ai-ops/panels/SessionDetailDialog.tsx:245-338` (StageDataList)

**Step 1: Update `aiOps.ts` stageDetails extraction (lines 168-179)**

Replace ringkasan-based fields with artifact-based fields:

Before:
```typescript
const stageDetails = Object.entries(session.stageData || {}).map(
  ([stageId, data]: [string, Record<string, unknown>]) => ({
    stageId,
    hasRingkasan: !!data?.ringkasan,
    hasRingkasanDetail: !!data?.ringkasanDetail,
    ringkasan: (data?.ringkasan as string) || null,
    ringkasanDetail: (data?.ringkasanDetail as string) || null,
    validatedAt: (data?.validatedAt as number) || null,
    superseded: (data?.superseded as boolean) || false,
    revisionCount: (data?.revisionCount as number) || 0,
  })
);
```

After:
```typescript
const stageDetails = Object.entries(session.stageData || {}).map(
  ([stageId, data]: [string, Record<string, unknown>]) => ({
    stageId,
    hasArtifact: !!data?.artifactId,
    artifactId: (data?.artifactId as string) || null,
    validatedAt: (data?.validatedAt as number) || null,
    superseded: (data?.superseded as boolean) || false,
    revisionCount: (data?.revisionCount as number) || 0,
  })
);
```

**Step 2: Update digest mapping field name (line 194-198)**

The digest field maps `d.decision` → `d.ringkasan` for the UI. Rename to match what it actually is now (artifact title):

Before:
```typescript
digest: (session.paperMemoryDigest || []).map((d) => ({
  stage: d.stage,
  ringkasan: d.decision,
  superseded: d.superseded || false,
})),
```

After:
```typescript
digest: (session.paperMemoryDigest || []).map((d) => ({
  stage: d.stage,
  decision: d.decision,
  superseded: d.superseded || false,
})),
```

**Step 3: Update `StageDetail` type in SessionDetailDialog.tsx (lines 245-254)**

Before:
```typescript
type StageDetail = {
  stageId: string
  hasRingkasan: boolean
  hasRingkasanDetail: boolean
  ringkasan: string | null
  ringkasanDetail: string | null
  validatedAt: number | null
  superseded: boolean
  revisionCount: number
}
```

After:
```typescript
type StageDetail = {
  stageId: string
  hasArtifact: boolean
  artifactId: string | null
  validatedAt: number | null
  superseded: boolean
  revisionCount: number
}
```

**Step 4: Update `StageDataList` component (lines 256-338)**

Replace ringkasan badges with artifact badge. Replace expanded detail showing ringkasan text with showing artifactId.

- Replace `hasContent` check (line 263): `s.hasRingkasan || s.hasRingkasanDetail` → `s.hasArtifact`
- Replace ringkasan badge (lines 296-305): show "artifact" badge with check icon if `s.hasArtifact`, muted if not
- Remove ringkasanDetail badge (lines 306-315)
- Replace expanded detail (lines 324-336): show artifactId instead of ringkasan/ringkasanDetail text

**Step 5: Update Memory Digest display (lines 181-204)**

Replace `d.ringkasan` with `d.decision`:

Before (line 194):
```tsx
{d.ringkasan || "(kosong)"}
```

After:
```tsx
{d.decision || "(kosong)"}
```

**Step 6: Commit**

```
git add convex/aiOps.ts src/components/ai-ops/panels/SessionDetailDialog.tsx
git commit -m "refactor(f1): update admin UI from ringkasan to artifact-based display"
```

---

## Task 9: Final verification and cleanup

**Step 1: Full grep scan for remaining ringkasan references**

Run: `grep -rn "ringkasan" src/ convex/ __tests__/ --include="*.ts" --include="*.tsx" | grep -v "ringkasanPenelitian\|ringkasanHasil\|ringkasanPenelitianBaru\|node_modules"`

Review each match. Expected remaining matches:
- Stage-specific fields in export files (content-compiler.ts, word-builder.ts, pdf-builder.ts) — KEEP
- Stage-specific fields in stage-types.ts — KEEP
- Any other match — must be cleaned up

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All PASS.

**Step 3: TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit any stragglers**

```
git add -A
git commit -m "refactor(f1): final cleanup — remove remaining ringkasan references"
```

---

## Summary

| Task | What | Files | Est. |
|------|------|-------|------|
| 1 | Types, validators, whitelist | 3 files | 5 min |
| 2 | Tool schemas | 1 file | 5 min |
| 3 | Backend guards, budget, digest | 2 files | 10 min |
| 4 | Context builder + tests | 4 files | 10 min |
| 5 | Stage instructions (14 stages) | 4 files | 10 min |
| 6 | General prompt | 1 file | 2 min |
| 7 | Chat route: delete hasStageRingkasan + update callers | 1 file | 5 min |
| 8 | Admin UI + backend | 2 files | 10 min |
| 9 | Verification + cleanup | - | 5 min |
