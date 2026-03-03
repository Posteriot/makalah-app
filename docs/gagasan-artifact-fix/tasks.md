# Fix Artifact Generation di ALL Paper Stages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure AI always creates artifacts via `createArtifact` before submitting stages for validation across all 13 paper workflow stages — with 6-layer defense-in-depth.

**Architecture:** 6 defense layers: (1) runtime guard prevents force-submit without artifact, (2) system note injection reminds AI, (3) auto-link artifactId eliminates manual dependency, (4) updated instructions in all 13 hardcoded stages, (5) skill validator enforcement, (6) resolver-side mandatory footer. Covers both primary and fallback AI paths.

**Tech Stack:** TypeScript, Next.js API route, Convex mutations, Vercel AI SDK v5

**Design Doc:** `docs/gagasan-artifact-fix/design.md`
**Branch:** `fix/gagasan-artifact-generation`

---

### Task 1: Add `hasStageArtifact()` Helper

**Files:**
- Modify: `src/app/api/chat/route.ts:856-870` (near `hasStageRingkasan`)

**Step 1: Add `hasStageArtifact` function**

Add immediately after the `hasStageRingkasan` function (after line ~870, where its closing `}` is):

```typescript
const hasStageArtifact = (session: {
    currentStage?: string
    stageData?: Record<string, unknown>
} | null): boolean => {
    if (!session?.stageData || !session.currentStage) return false
    if (session.currentStage === "completed") return false
    const data = session.stageData[session.currentStage] as Record<string, unknown> | undefined
    return !!data?.artifactId
}
```

Note: Match existing code style — no semicolons (file uses no-semicolon style).

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-gagasan-artifact && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `hasStageArtifact`

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(paper): add hasStageArtifact() helper to check artifact existence in stageData"
```

---

### Task 2: Guard `shouldForceSubmitValidation` with `hasStageArtifact`

**Files:**
- Modify: `src/app/api/chat/route.ts:1918`

**Step 1: Add artifact guard to condition**

Change line 1918 from:
```typescript
                && hasStageRingkasan(paperSession)
```
To:
```typescript
                && hasStageRingkasan(paperSession)
                && hasStageArtifact(paperSession)
```

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-gagasan-artifact && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Clean

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(paper): guard shouldForceSubmitValidation — skip force-submit if artifact missing"
```

---

### Task 3: Add Missing Artifact System Note + Inject to BOTH Paths

**Files:**
- Modify: `src/app/api/chat/route.ts` — three locations:
  - After line ~1918 (compute `missingArtifactNote`)
  - Lines ~1966-1973 (inject into `fullMessagesGateway` non-websearch path)
  - Before line ~3109 (inject into `fullMessagesBase` for fallback path)

**Step 1: Compute `missingArtifactNote` after `shouldForceSubmitValidation`**

Add after line 1918 (after the `shouldForceSubmitValidation` assignment, before `forcedToolTelemetryName`):

```typescript
            const missingArtifactNote = !shouldForceSubmitValidation
                && !!paperModePrompt
                && hasStageRingkasan(paperSession)
                && !hasStageArtifact(paperSession)
                && paperSession?.stageStatus === "drafting"
                && (
                    activeStageSearchReason === "user_confirmation_prefer_paper_tools" ||
                    activeStageSearchReason === "ai_promised_save_user_confirms" ||
                    activeStageSearchReason === "explicit_save_request" ||
                    isExplicitSaveSubmitRequest(lastUserContent)
                )
                ? `\n⚠️ ARTIFACT BELUM DIBUAT untuk tahap ini. WAJIB panggil createArtifact() dengan konten yang sudah disimpan di updateStageData SEBELUM memanggil submitStageForValidation(). Pastikan include parameter 'sources' jika ada AVAILABLE_WEB_SOURCES.\n`
                : ""
```

**Step 2: Inject into `fullMessagesGateway` non-websearch path**

In the `else` branch of `fullMessagesGateway` (~line 1966-1973), add `missingArtifactNote` injection BEFORE `...fullMessagesBase.slice(1)`:

Change from:
```typescript
                : [
                    fullMessagesBase[0],
                    ...(activeStageSearchNote && paperModePrompt && !enableWebSearch
                        ? [{ role: "system" as const, content: activeStageSearchNote }]
                        : []),
                    ...fullMessagesBase.slice(1),
                ]
```
To:
```typescript
                : [
                    fullMessagesBase[0],
                    ...(activeStageSearchNote && paperModePrompt && !enableWebSearch
                        ? [{ role: "system" as const, content: activeStageSearchNote }]
                        : []),
                    ...(missingArtifactNote
                        ? [{ role: "system" as const, content: missingArtifactNote }]
                        : []),
                    ...fullMessagesBase.slice(1),
                ]
```

**Step 3: Inject into `fullMessagesBase` for fallback path**

The fallback path (~line 3109) uses `fullMessagesBase` directly — NOT `fullMessagesGateway`. So `missingArtifactNote` must also be injected there.

Find line 3109:
```typescript
                    messages: fullMessagesBase,
```

Change to:
```typescript
                    messages: missingArtifactNote
                        ? [
                            fullMessagesBase[0],
                            { role: "system" as const, content: missingArtifactNote },
                            ...fullMessagesBase.slice(1),
                        ]
                        : fullMessagesBase,
```

**Step 4: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-gagasan-artifact && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Clean

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(paper): inject missing-artifact system note in both primary and fallback paths"
```

---

### Task 4: Auto-link `artifactId` to StageData in `createArtifact` Tool

**Files:**
- Modify: `src/app/api/chat/route.ts:1417-1424` (inside createArtifact execute, after retryMutation)

**Step 1: Add auto-link logic after successful artifact creation**

After line 1417 (`"artifacts.create"` — closing of `retryMutation`) and BEFORE the `return { success: true, ... }` block (line 1419), insert:

```typescript
                        // Auto-link artifactId to paper session stageData
                        if (paperSession) {
                            try {
                                await fetchMutationWithToken(api.paperSessions.updateStageData, {
                                    sessionId: paperSession._id,
                                    stage: paperSession.currentStage,
                                    data: { artifactId: result.artifactId },
                                })
                            } catch {
                                // Non-critical: artifact exists but not linked to stage
                                console.warn("[createArtifact] Auto-link artifactId to stageData failed")
                            }
                        }
```

Note: `paperSession` is accessible via closure (defined at line 343 in route handler scope). `fetchMutationWithToken` is the standard pattern used throughout the file (defined line 98).

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-gagasan-artifact && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Clean

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(paper): auto-link artifactId to stageData after createArtifact succeeds"
```

---

### Task 5: Update GAGASAN + TOPIK Instructions (foundation.ts)

**Files:**
- Modify: `src/lib/ai/paper-stages/foundation.ts` — lines 99 and 225

**Step 1: Update GAGASAN createArtifact instruction (line 99)**

Change from:
```
- createArtifact({ type: "section", title: "Gagasan Paper - [Judul Kerja]", content: "[gabungan ide, analisis, angle, novelty, referensi dalam markdown]" })
```
To:
```
- createArtifact({ type: "section", title: "Gagasan Paper - [Judul Kerja]", content: "[gabungan ide, analisis, angle, novelty, referensi dalam markdown]", sources: [{ url, title, publishedAt? }] })
  ⚠️ 'sources' WAJIB diisi dari AVAILABLE_WEB_SOURCES jika tersedia.
  ⚠️ WAJIB panggil createArtifact di TURN YANG SAMA dengan updateStageData, SEBELUM submitStageForValidation!
```

**Step 2: Update TOPIK createArtifact instruction (line 225)**

Change from:
```
- createArtifact({ type: "section", title: "Topik Definitif - [Judul Definitif]", content: "[gabungan topik, angle, argumentasi, gap, referensi dalam markdown]" })
```
To:
```
- createArtifact({ type: "section", title: "Topik Definitif - [Judul Definitif]", content: "[gabungan topik, angle, argumentasi, gap, referensi dalam markdown]", sources: [{ url, title, publishedAt? }] })
  ⚠️ 'sources' WAJIB diisi dari AVAILABLE_WEB_SOURCES jika tersedia.
  ⚠️ WAJIB panggil createArtifact di TURN YANG SAMA dengan updateStageData, SEBELUM submitStageForValidation!
```

**Step 3: Commit**

```bash
git add src/lib/ai/paper-stages/foundation.ts
git commit -m "fix(paper): explicit sources + ordering in GAGASAN & TOPIK instructions"
```

---

### Task 6: Update CORE Stage Instructions (core.ts)

**Files:**
- Modify: `src/lib/ai/paper-stages/core.ts` — lines 93, 221, 350, 468

**Step 1: Update ABSTRAK (line 93)**

After the existing createArtifact line, add:
```
  ⚠️ 'sources' WAJIB diisi dari AVAILABLE_WEB_SOURCES jika tersedia.
  ⚠️ WAJIB panggil createArtifact di TURN YANG SAMA dengan updateStageData, SEBELUM submitStageForValidation!
```

**Step 2: Update PENDAHULUAN (line 221)**

Same addition as Step 1.

**Step 3: Update TINJAUAN_LITERATUR (line 350)**

Same addition as Step 1.

**Step 4: Update METODOLOGI (line 468)**

Same addition as Step 1.

**Step 5: Commit**

```bash
git add src/lib/ai/paper-stages/core.ts
git commit -m "fix(paper): explicit sources + ordering in CORE stage instructions (abstrak/pendahuluan/tinjauan/metodologi)"
```

---

### Task 7: Update RESULTS Stage Instructions (results.ts)

**Files:**
- Modify: `src/lib/ai/paper-stages/results.ts` — lines 99, 223, 337

**Step 1: Update HASIL (line 99)**

After the existing createArtifact line, add:
```
  ⚠️ 'sources' WAJIB diisi dari AVAILABLE_WEB_SOURCES jika tersedia.
  ⚠️ WAJIB panggil createArtifact di TURN YANG SAMA dengan updateStageData, SEBELUM submitStageForValidation!
```

**Step 2: Update DISKUSI (line 223)**

Same addition as Step 1.

**Step 3: Update KESIMPULAN (line 337)**

Same addition as Step 1.

**Step 4: Commit**

```bash
git add src/lib/ai/paper-stages/results.ts
git commit -m "fix(paper): explicit sources + ordering in RESULTS stage instructions (hasil/diskusi/kesimpulan)"
```

---

### Task 8: Update FINALIZATION Stage Instructions (finalization.ts)

**Files:**
- Modify: `src/lib/ai/paper-stages/finalization.ts` — lines 123, 246, 379, 509

**Step 1: Update DAFTAR_PUSTAKA (line 123)**

After the existing createArtifact line, add:
```
  ⚠️ 'sources' WAJIB diisi dari AVAILABLE_WEB_SOURCES jika tersedia.
  ⚠️ WAJIB panggil createArtifact di TURN YANG SAMA dengan compileDaftarPustaka, SEBELUM submitStageForValidation!
```

**Step 2: Update LAMPIRAN (line 246)**

After the existing createArtifact line, add:
```
  ⚠️ 'sources' WAJIB diisi dari AVAILABLE_WEB_SOURCES jika tersedia.
  ⚠️ WAJIB panggil createArtifact di TURN YANG SAMA dengan updateStageData, SEBELUM submitStageForValidation!
```

**Step 3: Update JUDUL (line 379)**

Same addition as Step 2.

**Step 4: Update OUTLINE (line 509)**

Same addition as Step 2.

**Step 5: Commit**

```bash
git add src/lib/ai/paper-stages/finalization.ts
git commit -m "fix(paper): explicit sources + ordering in FINALIZATION stage instructions (dafpus/lampiran/judul/outline)"
```

---

### Task 9: Update Paper Mode General Rules (paper-mode-prompt.ts)

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:211`

**Step 1: Strengthen general rule about artifact creation**

Change line 211 from:
```
- Buat artifact dengan createArtifact() untuk output yang sudah disepakati
```
To:
```
- WAJIB buat artifact dengan createArtifact() untuk output tahap yang sudah disepakati. Panggil di TURN YANG SAMA dengan updateStageData, SEBELUM submitStageForValidation. Include 'sources' dari AVAILABLE_WEB_SOURCES jika tersedia. Artifact adalah HASIL AKHIR yang di-review user.
```

**Step 2: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "fix(paper): strengthen general rule — artifact creation ordering + sources + purpose"
```

---

### Task 10: Add `createArtifact` Validation to Skill Validator

**Files:**
- Modify: `src/lib/ai/stage-skill-validator.ts` — after line ~222 (before `return`)

**Step 1: Add createArtifact mention check**

After the `postOutlineStages` check block and before the `return` statement, add:

```typescript
    // Validate that Tool Policy mentions createArtifact
    // Required for all stages — artifact is the mandatory output reviewed by user
    const toolPolicySection = getSection(content, "Tool Policy");
    if (toolPolicySection && !/createArtifact/i.test(toolPolicySection)) {
        issues.push({
            code: "missing_create_artifact_in_tool_policy",
            message: `Tool Policy wajib menyebut createArtifact untuk stage "${input.stageScope}". Artifact adalah hasil akhir yang di-review user.`,
        });
    }
```

Note: Applies to ALL stages including `daftar_pustaka` — because `daftar_pustaka` also uses `createArtifact` (line 123 in finalization.ts) alongside `compileDaftarPustaka`.

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-gagasan-artifact && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Clean

**Step 3: Commit**

```bash
git add src/lib/ai/stage-skill-validator.ts
git commit -m "fix(paper): skill validator enforces createArtifact mention in Tool Policy for all stages"
```

---

### Task 11: Resolver Append Mandatory Artifact Footer to Skill Content

**Files:**
- Modify: `src/lib/ai/stage-skill-resolver.ts:110-116`

**Step 1: Add ARTIFACT_CREATION_FOOTER constant**

Add before the `resolveStageInstructions` function (e.g., after imports):

```typescript
const ARTIFACT_CREATION_FOOTER = `

═══ MANDATORY ARTIFACT RULE ═══
⚠️ WAJIB panggil createArtifact() untuk membuat artifact dari output tahap ini.
- Panggil di TURN YANG SAMA dengan updateStageData, SEBELUM submitStageForValidation.
- Include parameter 'sources' dari AVAILABLE_WEB_SOURCES jika tersedia.
- Artifact adalah HASIL AKHIR yang akan di-review dan di-approve user.
═══════════════════════════════`
```

**Step 2: Append footer to skill content in resolver return**

Change line 111 from:
```typescript
            instructions: activeSkill.content,
```
To:
```typescript
            instructions: activeSkill.content + ARTIFACT_CREATION_FOOTER,
```

**Step 3: Verify no TypeScript errors**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-gagasan-artifact && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Clean

**Step 4: Commit**

```bash
git add src/lib/ai/stage-skill-resolver.ts
git commit -m "feat(paper): resolver appends mandatory artifact creation footer to skill content"
```

---

### Task 12: Build & Lint Verification

**Step 1: Run full build**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-gagasan-artifact && npm run build 2>&1 | tail -30`
Expected: Build succeeds with no errors

**Step 2: Run lint**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-gagasan-artifact && npm run lint 2>&1 | tail -20`
Expected: No lint errors

**Step 3: Fix any issues found and commit separately**

---

## Execution Order

```
Task 1 (helper) → Task 2 (guard) → Task 3 (system note both paths) → Task 4 (auto-link)
                                                                            ↓
                  Task 5 (gagasan/topik) ──┐
                  Task 6 (core stages)  ───┤
                  Task 7 (result stages) ──┼── can be parallel after Task 4
                  Task 8 (final stages) ───┤
                  Task 9 (general rules) ──┘
                                           ↓
                  Task 10 (skill validator) ─── can be parallel with 5-9
                  Task 11 (resolver footer) ─── can be parallel with 10
                                           ↓
                                      Task 12 (verify)
```

Tasks 1-4: Runtime fixes in `route.ts` (sequential, dependent).
Tasks 5-9: Instruction updates across all stage files (can be parallel after Task 4).
Tasks 10-11: Skill system hardening (independent, can parallel with 5-9).
Task 12: Final verification (after all).

## Defense Layer Coverage Matrix

| Layer | Where | Protects Against | Task |
|-------|-------|-----------------|------|
| L1: Guard | `shouldForceSubmitValidation` in route.ts | Force-submit tanpa artifact | Task 1-2 |
| L2: System Note | `missingArtifactNote` in primary + fallback | AI lupa createArtifact | Task 3 |
| L3: Auto-link | `createArtifact` execute handler | AI lupa link artifactId | Task 4 |
| L4: Instructions | All 13 stage files + general rules | AI tidak tahu sources/ordering | Task 5-9 |
| L5: Validator | `stage-skill-validator.ts` | Admin buat skill tanpa artifact | Task 10 |
| L6: Resolver | `stage-skill-resolver.ts` footer | Skill replace hardcoded tanpa reminder | Task 11 |
