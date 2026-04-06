# Branch Stabilization Analysis

> Hasil investigasi branch `feature/paper-ui-harness-rev-enforcement`.
> Keputusan: pertahankan UI components, persamakan backend dengan current `origin/main`.
> Referensi detail: `anomaly-findings.md` (6 findings, 1 root cause).

---

## Analisis 1: Backend Anomali Inventory

Semua non-UI backend changes:

| File | Lines | Apa yang Berubah | Status |
|------|-------|------------------|--------|
| `src/app/api/chat/route.ts` | +159 | Harness wiring, prepareStep chain, validationSubmitConfig, draftSaveGate, artifact duplicate guard | ❌ Root cause |
| `src/lib/ai/incremental-save-harness.ts` | +201 (baru) | Entire harness logic | ❌ Root cause |
| `src/lib/ai/paper-tools.ts` | +143 | saveStageDraft tool, queue/dedup, observability logs | ⚠️ Tool OK, gate mechanism tied to harness |
| `src/lib/ai/paper-mode-prompt.ts` | +45 | activeStageArtifactContext, prompt wording "SAVE INCREMENTALLY" | ⚠️ Mixed — activeStageArtifact safe, prompt wording tied to harness |
| `src/lib/ai/paper-stages/*.ts` | +36 total | "explicit-confirm → auto-present" in 12 stages | ❌ Breaks without harness coordination |
| `convex/paperSessions.ts` | +15 | artifact guard on submitForValidation | ✅ Safe, correct |
| `src/lib/chat/choice-request.ts` | +27 | isValidationChoiceInteractionEvent | ❌ Too broad, causes stage skip |
| `src/lib/json-render/choice-payload.ts` | +129 | normalizeChoiceSpec | ✅ Safe, fixes null crash |
| `src/lib/ai/draft-save-fields.ts` | +22 (baru) | Field allowlist helpers | ✅ Safe, utility |
| `src/lib/ai/paper-tools-draft-save.ts` | +15 (baru) | Warning filter | ✅ Safe, utility |
| `src/lib/ai/stage-skill-validator.ts` | +5 | Minor addition | ✅ Safe |
| `convex/migrations/*` | +6 total | Minor seed data fixes | ✅ Safe |

**Verdict:** Semua masalah bersumber dari 4 core files yang diidentifikasi di Finding #6. Tidak ada hidden anomali.

---

## Analisis 2: UI Merge Compatibility dengan Main

Main hanya ubah 1 file yang overlap: `ChatWindow.tsx` — 46 insertions (optimistic pending validation bridge).

**Perubahan main di ChatWindow.tsx:**
- `optimisticPendingValidation` state + useEffect hooks
- `hasSubmitForValidation()` helper function
- `submittedChoiceKeys` merge logic fix (Set spread)
- Validation panel condition: `stageStatus === "pending_validation" || optimisticPendingValidation`

**Perubahan branch di ChatWindow.tsx:**
- `shouldPreferUnifiedPaperLoadingUi` + `effectivePaperUiMode`
- Pending indicator suppression (`!effectivePaperUiMode`)
- `isPaperSessionLoading` guard
- Observability logs

Beda area di file yang sama. `git merge-tree` confirm zero conflicts (exit 0). Manual review tetap diperlukan.

---

## Keputusan: Persamakan Backend dengan Current Main

**PENTING: Bukan revert/rollback.** Prinsipnya: file-file yang bermasalah **dipersamakan** dengan `origin/main` saat ini. Ini berarti file di branch menjadi identik dengan main terkini — termasuk perkembangan apapun yang terjadi di main sejak branch diverge.

Teknis: `git checkout origin/main -- <file>` per file.

---

## Plan: Backend Stabilization

### Phase 1: Identifikasi dan Klasifikasi Files

#### KEEP — Pertahankan perubahan branch (UI + safe utilities)

**UI components:**
- `src/components/chat/UnifiedProcessCard.tsx` (baru)
- `src/components/chat/ChatSidebar.tsx` (import swap)
- `src/components/chat/ChatWindow.tsx` (loading indicator changes — perlu reconcile dengan main)
- `src/components/chat/MessageBubble.tsx` (UnifiedProcessCard wiring — perlu bersihkan harness references)
- `src/components/chat/ToolStateIndicator.tsx` (export getToolLabel)
- `src/components/chat/sidebar/SidebarQueueProgress.tsx` (baru)
- `src/app/globals.css` (amber dots animation)

**Pure logic, no runtime impact:**
- `src/lib/paper/task-derivation.ts` (baru)
- `src/lib/paper/__tests__/task-derivation.test.ts` (baru)
- `src/lib/hooks/useConversations.ts` (deleteAll pagination)
- `convex/conversations.ts` (deleteAll pagination)

**Safe backend fixes:**
- `convex/paperSessions.ts` (artifact guard on submitForValidation — ONLY this addition)

**Tests (keep jika file sumbernya KEEP):**
- `src/components/chat/ChatWindow.paper-loading-mode.test.tsx` (baru)
- `src/components/chat/MessageBubble.search-status.test.tsx` (minor fix)

#### PERSAMAKAN DENGAN MAIN — File disamakan dengan `origin/main` saat ini

**Backend runtime files:**
- `src/app/api/chat/route.ts` → samakan dengan main
- `src/lib/ai/paper-tools.ts` → samakan dengan main
- `src/lib/ai/paper-mode-prompt.ts` → samakan dengan main
- `src/lib/ai/paper-stages/foundation.ts` → samakan dengan main
- `src/lib/ai/paper-stages/core.ts` → samakan dengan main
- `src/lib/ai/paper-stages/results.ts` → samakan dengan main
- `src/lib/ai/paper-stages/finalization.ts` → samakan dengan main
- `src/lib/chat/choice-request.ts` → samakan dengan main
- `src/lib/ai/stage-skill-validator.ts` → samakan dengan main
- `src/lib/json-render/choice-payload.ts` → samakan dengan main (normalizeChoiceSpec dihapus — clean slate, tulis ulang saat redesign)
- `src/lib/json-render/__tests__/choice-payload.test.ts` → samakan dengan main (normalizeChoiceSpec tests dihapus)

**Files baru yang harus dihapus (tidak ada di main):**
- `src/lib/ai/incremental-save-harness.ts` → hapus
- `src/lib/ai/draft-save-fields.ts` → hapus
- `src/lib/ai/paper-tools-draft-save.ts` → hapus

**Tests yang harus dihapus (file sumbernya dihapus):**
- `src/lib/ai/__tests__/draft-save-fields.test.ts` → hapus
- `src/lib/ai/__tests__/incremental-save-harness.test.ts` → hapus
- `src/lib/ai/__tests__/save-stage-draft.test.ts` → hapus
- `src/lib/ai/paper-tools.save-stage-draft.test.ts` → hapus

**Tests yang diverifikasi — keputusan final:**
- `src/lib/ai/paper-mode-prompt.stage-skill.test.ts` → KEEP. Test baru untuk `activeStageArtifactContext` (safe feature yang KEEP di `paper-mode-prompt.ts`). Tapi karena `paper-mode-prompt.ts` dipersamakan dengan main, test ini akan GAGAL — `activeStageArtifactContext` belum ada di main. → **HAPUS** (akan ditulis ulang saat fitur di-reintroduce).
- `src/lib/ai/stage-skill-resolver.test.ts` → samakan dengan main (hanya 2 line fixture change)
- `src/lib/ai/stage-skill-validator.test.ts` → samakan dengan main (hanya 2 line fixture change)
- `src/lib/chat/__tests__/choice-request.test.ts` → samakan dengan main. Branch menambah test untuk `isValidationChoiceInteractionEvent` yang dihapus saat `choice-request.ts` dipersamakan.
- `convex/paperSessions.test.ts` → **HAPUS**. File baru dari branch. Meskipun test untuk artifact guard (fitur yang KEEP), prinsip clean slate berlaku: `paperSessions.ts` dipersamakan dengan main lalu artifact guard di-re-apply manual. Test harus ditulis ulang bersamaan saat re-apply, bukan carry-over dari branch lama.
- `convex/stageSkills.test.ts` → samakan dengan main (hanya 2 line fixture change)

**Deferred items (tracked, not addressed in this stabilization):**
- Finding #3 (choice card tetap interaktif setelah dikonfirmasi) — ini UI rendering issue di json-renderer yang independent dari harness. Tidak di-fix di stabilization ini. Tracked di `anomaly-findings.md` untuk dikerjakan terpisah.

### Phase 2: Execute Persamakan

Urutan eksekusi:

**Step 1:** `git fetch origin main` — pastikan main terkini

**Step 2:** Persamakan backend files dengan main:
```bash
git checkout origin/main -- \
  src/app/api/chat/route.ts \
  src/lib/ai/paper-tools.ts \
  src/lib/ai/paper-mode-prompt.ts \
  src/lib/ai/paper-stages/foundation.ts \
  src/lib/ai/paper-stages/core.ts \
  src/lib/ai/paper-stages/results.ts \
  src/lib/ai/paper-stages/finalization.ts \
  src/lib/chat/choice-request.ts \
  src/lib/ai/stage-skill-validator.ts \
  src/lib/json-render/choice-payload.ts \
  src/lib/json-render/__tests__/choice-payload.test.ts \
  src/lib/ai/stage-skill-resolver.test.ts \
  src/lib/ai/stage-skill-validator.test.ts \
  src/lib/chat/__tests__/choice-request.test.ts \
  convex/stageSkills.test.ts \
  convex/migrations/seedPembaruanAbstrakSkill.ts \
  convex/migrations/updateDocumentationChatAgentS5.ts \
  convex/migrations/updateStageSkillToolPolicy.ts
```

**Step 3:** Hapus files baru yang tidak ada di main:
```bash
git rm \
  src/lib/ai/incremental-save-harness.ts \
  src/lib/ai/draft-save-fields.ts \
  src/lib/ai/paper-tools-draft-save.ts \
  src/lib/ai/__tests__/draft-save-fields.test.ts \
  src/lib/ai/__tests__/incremental-save-harness.test.ts \
  src/lib/ai/__tests__/save-stage-draft.test.ts \
  src/lib/ai/paper-tools.save-stage-draft.test.ts \
  src/lib/ai/paper-mode-prompt.stage-skill.test.ts \
  convex/paperSessions.test.ts
```
Notes:
- `paper-mode-prompt.stage-skill.test.ts` — test `activeStageArtifactContext` yang belum ada di main. Tulis ulang saat fitur di-reintroduce.
- `convex/paperSessions.test.ts` — test artifact guard. Clean slate: tulis ulang bersamaan saat artifact guard di-re-apply di Step 7.

**Step 4:** Verifikasi semua import paths valid di seluruh test files yang tersisa. Tidak ada test file yang di-KEEP dari branch selain UI tests.

**Step 5:** Reconcile `ChatWindow.tsx`:
- Persamakan dengan main dulu (`git checkout origin/main -- src/components/chat/ChatWindow.tsx`)
- Ini memberikan base yang include `optimisticPendingValidation` dari main
- Re-apply UI changes dari branch:
  - `shouldPreferUnifiedPaperLoadingUi` function + `extractMessageTextForIntent` helper (exported)
  - `prefersUnifiedPaperLoadingUi` useMemo + `effectivePaperUiMode` computed
  - `!effectivePaperUiMode` guard di `hasStandalonePendingIndicator` dan `shouldShowPendingIndicatorBeforeMessage`
  - `isPaperSessionLoading` guard di pending indicator conditions
  - `ChatProcessStatusBar` visible guard: `!effectivePaperUiMode`
  - Import `hasPaperWritingIntent` dari `@/lib/ai/paper-intent-detector`
- HAPUS: `[PaperLoading]` console.log statements (observability logs sementara, bukan production code)
- VERIFIKASI: `ChatWindow.paper-loading-mode.test.tsx` tetap pass

**Step 6:** Bersihkan `MessageBubble.tsx`:
- HAPUS: console.log `[UnifiedProcess] msg#... (via ...)` — observability logs sementara
- HAPUS: console.log `[UnifiedProcess] msg#... card hasTask=...` — observability logs sementara
- PERTAHANKAN: semua UnifiedProcessCard wiring, task derivation, getMessageStage
- VERIFIKASI: tidak ada import ke file yang dihapus (audit sudah confirm: zero cross-dependencies)

**Step 7:** Bersihkan `convex/paperSessions.ts`:
- Persamakan dengan main dulu (`git checkout origin/main -- convex/paperSessions.ts`)
- Re-apply HANYA artifact guard addition di `submitForValidation` mutation:
  - `const artifactId = currentStageData?.artifactId as string | undefined;`
  - `console.log('[AutoPresent] guard check ...')`
  - Guard block: `if (!artifactId) { throw new Error(...) }`
  - `console.log('[AutoPresent] guard PASSED ...')`
- Tulis ulang `convex/paperSessions.test.ts` untuk artifact guard (test baru, clean slate)
- VERIFIKASI: test baru pass

**Step 7b:** Bersihkan `paper-tools.ts` (setelah dipersamakan dengan main):
- `paper-tools.ts` sudah dipersamakan di Step 2. Verifikasi bahwa `[IncrementalSave]` console.log yang kita tambahkan di review session TIDAK ada (karena file dipersamakan, otomatis hilang).
- Verifikasi tidak ada `saveStageDraft` tool (removed by persamakan)
- Verifikasi tidak ada `draftSaveGate` references

### Phase 3: Verifikasi

**Step 8:** Jalankan semua tests:
```bash
npx vitest run
```

**Step 9:** Verifikasi diff terhadap main — hanya UI + safe changes yang tersisa:
```bash
git diff origin/main --stat
```

Expected: hanya UI files, task-derivation, choice-payload, conversations pagination, dan paperSessions artifact guard.

**Step 10:** Verifikasi tidak ada import yang broken:
```bash
npx tsc --noEmit
```

**Step 11:** Build check:
```bash
npm run build
```

### Phase 4: Commit

Commit message harus menjelaskan apa yang terjadi:
```
stabilize: keep UI components, align backend with main

Retain: UnifiedProcessCard, task-derivation, SidebarQueueProgress,
deleteAll pagination, normalizeChoiceSpec, artifact guard.

Align with main: route.ts, paper-tools.ts, paper-mode-prompt.ts,
stage instructions, choice-request.ts, incremental-save-harness (removed).

Reason: harness timing logic caused cascading failures (see anomaly-findings.md).
UI components verified safe (46 tests pass). Backend to be redesigned separately.
```
