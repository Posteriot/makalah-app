# Phase 1 Audit Result — Makalah Agent Harness

**Branch:** `durable-agent-harness`
**Audit date:** 2026-04-26
**Audit method:** Per-claim verification of `docs/what-is-makalah/06-agent-harness/` (sub-files 01–06) against current source code in `src/lib/chat-harness/`, `src/lib/ai/paper-tools.ts`, and `convex/`.
**Rubric:** As defined by skill `makalah-durable-harness` Phase 1 — verdict per claim is one of:
- ✅ akurat (file:line eksak match)
- ⚠️ partial / minor framing mismatch (behavior match, wording rancu)
- ❌ stale (doc claim tidak match dengan kode)
- 🆕 code-side claim doc-missing (kode punya, doc tidak menyebut)
- ⚠️ deferred (perlu deep-read tambahan, di-defer ke Phase 2 kalau dibutuhkan)

> **Catatan tentang scope SCOPE.md:** SCOPE.md branch ini menunjuk dua reference file (`anatomy-agent-harness.md` + `harness-engineering-guid.md`). File `control-plane-domain-action.md` ditambahkan ke Phase 0 reading karena rubric audit (REST × 12-component + Control/Domain/Backend mapping) tidak komplit tanpanya, dan integral untuk audit harness Makalah-spesifik. Tetap dalam spirit scope.

---

## Phase 0 — Context Loaded (Pre-Audit Baseline)

File yang dibaca di sesi audit:
1. `SCOPE.md` (via branch-scope hook)
2. `docs/what-is-makalah/README.md`
3. `docs/what-is-makalah/index.md`
4. `docs/what-is-makalah/references/agent-harness/anatomy/anatomy-agent-harness.md` — 12 komponen produksi
5. `docs/what-is-makalah/references/agent-harness/harness-engineering-guid.md` — REST framework, 6 design principles, State Separation Principle
6. `docs/what-is-makalah/references/agent-harness/control-plane-domain-action.md` — Control Plane / Domain Tools / Backend Contracts mapping
7. `docs/what-is-makalah/06-agent-harness/index.md` + 6 sub-file (`01`–`06`)

### Divergensi struktural yang ditemukan di Phase 0 (sebelum sentuh kode)

| Issue | Severity | Detail |
|---|---|---|
| `docs/what-is-makalah/glossary.md` tidak eksis | ⚠️ doc-bug | Disebut wajib oleh `index.md:165` dan oleh whitebook hook setiap session start. File benar-benar tidak ada di filesystem. White Book tidak konsisten dengan dirinya sendiri. |
| `06-agent-harness/index.md` + sub-file punya hardcoded path `file:///.../worktrees/what-is-makalah/...` | ⚠️ doc-bug | Path absolut broken di worktree manapun selain `what-is-makalah`. Bukan blocker untuk audit, tapi setiap link `file:///` di doc 06 broken di branch ini. |

---

## Phase 1 — Per-Claim Verification

### Doc 02 — Orchestration Loop

| Claim | Verdict | Evidence |
|---|---|---|
| 13-step engine di `runtime/orchestrate-sync-run.ts` | ✅ | Step 1–12 + 8.5 = 13 langkah explisit dengan label `// ── Step N` di file |
| Pause di Step 8.5: `runStore.pauseRun` create decision + flip status + stamp pendingDecisionId, emit `run_paused`, return `{kind:"paused"}` | ✅ | `src/lib/chat-harness/runtime/orchestrate-sync-run.ts:325-363` |
| Resume: Step 1 tetap jalan, skip pembuatan harnessRuns row baru di Step 2, emit `run_resumed` | ✅ | `src/lib/chat-harness/runtime/orchestrate-sync-run.ts:116-184` |
| Header `x-harness-resume` dipakai untuk deteksi resume (resolution di adapter, deteksi via `accepted.resumeContext`) | ✅ | Comment `orchestrate-sync-run.ts:113-115` |
| Step 12 fallback via `attemptFallbackExecution` | ✅ | `src/lib/chat-harness/runtime/orchestrate-sync-run.ts:484-505, 750-984` |
| `onFinishConfig` (build-on-finish-handler.ts) bukan step terpisah, callback dalam stream | ✅ | `src/lib/chat-harness/runtime/orchestrate-sync-run.ts:415-446` |

### Doc 03 — Tool Inventory & Capabilities

| Claim | Verdict | Evidence |
|---|---|---|
| createArtifact tipe valid 7 enum (`code`, `outline`, `section`, `table`, `citation`, `formula`, `chart`) | ✅ | `src/lib/chat-harness/executor/build-tool-registry.ts:120` |
| createArtifact race-free claim sebelum await (`paperToolTracker.createArtifactClaimed` set sync) | ✅ | `build-tool-registry.ts:142, 152` |
| createArtifact `CREATE_BLOCKED_VALID_EXISTS` guard (pending_validation OR revision + valid artifact) | ✅ | `build-tool-registry.ts:176-202` |
| createArtifact source-body parity check (`checkSourceBodyParity`) | ✅ | `build-tool-registry.ts:260-272` |
| createArtifact auto-link `artifactId` ke `stageData` via `paperSessions.updateStageData` | ✅ | `build-tool-registry.ts:289-300` |
| createArtifact auto-submit kalau `sawSubmitValidationArtifactMissing === true` | ✅ | `build-tool-registry.ts:314-326` |
| updateArtifact auto-rescue + auto-resolve artifactId | ✅ | `build-tool-registry.ts:388-409, 411-420` |
| submitStageForValidation dua-lapis guard: no-op jika sudah pending_validation, error `ARTIFACT_MISSING` jika belum ada artifact | ✅ | `src/lib/ai/paper-tools.ts:416-436` |
| requestRevision idempotent (return success jika sudah revision) + `NOT_PENDING_VALIDATION` error | ✅ | `paper-tools.ts:492-508` |
| resetToStage cross-stage (`rewindToStage` mode `cancel-choice`) vs same-stage (`cancelChoiceDecision` only) dual path | ✅ | `paper-tools.ts:566-586` |
| updateStageData auto-stage dari `session.currentStage`, strip `_` prefix fields, reject empty data, block after submit | ✅ | `paper-tools.ts:148-194` |
| renameConversationTitle: max 2x update AI per conversation, `titleLocked` check, max 50 char, min `CHAT_TITLE_FINAL_MIN_PAIRS` (default 3) pasang pesan | ✅ | `build-tool-registry.ts:571-622` |
| Mandatory chaining `updateStageData → createArtifact/updateArtifact → submitStageForValidation` dipaksa enforcer | ✅ | Lihat verifikasi enforcers di doc 05 |
| updateArtifact "auto-rescue jika `pending_validation`" — framing | ⚠️ partial | Doc bilang panggil hanya kalau pending_validation; kode panggil `executeAutoRescue` unconditionally (kalau ada `paperSession`) lalu gating internal di `auto-rescue-policy.ts:24-26`. Behavior identical, framing call-site beda. |

### Doc 04 — Context Management

| Claim | Verdict | Evidence |
|---|---|---|
| 13 layer instruction stack dengan label persis (`base-prompt`, `paper-mode`, `file-context`, `attachment-awareness`, `sources-context`, `source-inventory`, `exact-source-inspection`, `source-provenance`, `recent-source-skill`, `choice-context-note`/`free-text-context-note`, `choice-yaml-prompt`, `review-finalization-discipline`, `completed-session-override`) | ✅ | `src/lib/chat-harness/context/resolve-instruction-stack.ts:80, 84, 89, 94, 99, 104, 110, 116, 129, 135-137, 142, 167, 217` |
| Layer 10 mutually exclusive (choice-context-note vs free-text-context-note) | ✅ | `resolve-instruction-stack.ts:135-137` (push hanya satu, choice prioritas) |
| compactionThreshold 85% / threshold 80% (`DEFAULT_COMPACTION_RATIO = 0.85`, `DEFAULT_THRESHOLD_RATIO = 0.8`) | ✅ | `src/lib/ai/context-budget.ts:11-12` |
| `DEFAULT_KEEP_LAST_N = 50` | ✅ | `context-budget.ts:14` |
| Context window fallback 128K | ✅ | `context-budget.ts:16` (`DEFAULT_CONTEXT_WINDOW = 128_000`) |
| Brute prune ada di `apply-context-budget.ts` (range L92-109), bukan route.ts | ✅ | File exists, threshold logic dirujuk di `apply-context-budget.ts:67, 88` |
| Layer 8 (`source-provenance`) selalu diinjeksi tidak kondisional | ✅ | `resolve-instruction-stack.ts:116` (push tanpa wrap kondisional) |
| `DEFAULT_WARN_RATIO = 0.6` + `shouldWarn` flag | 🆕 doc-missing | `context-budget.ts:13, 53` — eksis di kode, doc tidak menyebut warn threshold sama sekali |
| `CHARS_PER_TOKEN = 4` heuristic untuk token estimation | 🆕 doc-missing | `context-budget.ts:15, 18-20` — heuristic dasar tidak disebut di doc |
| P1-P4 chain detail (deterministik vs LLM, paper-mode-only flag, ambang berhenti) | ⚠️ deferred | Tidak deep-read `src/lib/ai/context-compaction.ts:313` di Phase 1; perlu verifikasi tambahan kalau Phase 2 menyentuh kompaktor |

### Doc 05 — Tool Safety & Enforcement

| Claim | Verdict | Evidence |
|---|---|---|
| 3 enforcer functions terpisah di `enforcers.ts` | ✅ | `src/lib/chat-harness/policy/enforcers.ts:43, 88, 137` |
| Revision chain: step 0 + revision → `toolChoice: "required"` | ✅ | `enforcers.ts:49-54` |
| Revision chain: setelah `requestRevision` / `updateStageData` → `"required"` | ✅ | `enforcers.ts:59-66` |
| Revision chain: setelah artifact success → `submitStageForValidation` specific | ✅ | `enforcers.ts:67-71` |
| Revision chain: artifact failed (tracker flag tidak aktif) → `"required"` allow retry | ✅ | `enforcers.ts:72-74` |
| Drafting choice 4-priority order: compileDaftarPustaka → updateStageData → createArtifact → submitStageForValidation | ✅ | `enforcers.ts:104-122` |
| Universal reactive trigger only after `updateStageData` | ✅ | `enforcers.ts:153-155` |
| Plan gate: `planHasIncompleteTasks === true` + `finalize_stage` → enforcer "tidak aktif sama sekali" (return undefined) | ✅ | `enforcers.ts:91` (`isActive` false). Catatan: log message di `computeEnforcerDerivedValues:29` masih pakai kata "downgraded" — semantik agak rancu, behavior sesuai doc. |
| Execution boundary 5-tier priority (`forced-sync` > `forced-submit` > `exact-source` > `revision-chain` > `normal`) | ✅ | `src/lib/chat-harness/policy/build-tool-boundary-policy.ts:14-25` |
| Auto-rescue gating only on `pending_validation` | ✅ | `src/lib/chat-harness/shared/auto-rescue-policy.ts:24-26` |
| Auto-rescue calls `autoRescueRevision` mutation, fetches refreshed session, returns to caller | ✅ | `auto-rescue-policy.ts:29-46` |
| Backend guard: "Cannot update stage data in completed state" | ✅ | `convex/paperSessions.ts:874` |
| Backend guard: "Cannot cancel: revision in progress" | ✅ | `convex/paperSessions.ts:2031` |
| Backend guard: `isValidRewindTarget` validasi | ✅ | `convex/paperSessions.ts:1833, 2035` |
| Backend guard: "Target stage has never been validated" (target `validatedAt` required) | ✅ | `convex/paperSessions.ts:2044` |
| Backend guard: `NOT_PENDING_VALIDATION` pada `requestRevision` mutation | ✅ | `convex/paperSessions.ts:1494` |
| Backend guard: `requirePaperSessionOwner` ownership check | ✅ | 11 call sites di `convex/paperSessions.ts` |

### Doc 06 — Persistence & Observability

| Claim | Verdict | Evidence |
|---|---|---|
| 4 tabel di `convex/schema.ts` pada line yang dicantumkan doc | ✅ | `harnessRuns:1588`, `harnessRunSteps:1651`, `harnessEvents:1695`, `harnessDecisions:1723` |
| 29 canonical event types dari 6 kategori (3+6+4+8+5+3) | ✅ | `src/lib/chat-harness/persistence/event-types.ts` — count match exact |
| `isHarnessEventType` adapter-layer validator | ✅ | `event-types.ts:67-69` |
| `currentStepId` pointer field di `harnessRuns` | ✅ | `convex/schema.ts:1612` |
| `startStep` single atomic via `api.harnessRuns.startStepAtomic` (increment + insert + setCurrent dalam satu Convex transaction) | ✅ | `src/lib/chat-harness/persistence/run-store.ts:91-107` |
| `pauseRun` dua mutasi terpisah (`createDecision` → `pauseRun`) | ✅ | `run-store.ts:140-159` |
| `resumeRun` dua mutasi terpisah (`resolveDecision` → `resumeRun`) | ✅ | `run-store.ts:161-178` |
| Partial failure pause/resume aman karena `decisionId` stabil | ✅ | `run-store.ts:129-138` (comment match doc claim) |
| Convex mutation accept arbitrary string event type (forward compat tanpa schema migration) | ✅ | `event-types.ts:9-11` comment |
| `messages.reasoningTrace` schema (curated/transparent mode, steps array) | ⚠️ deferred | Tidak deep-read `convex/schema.ts:145` di Phase 1 — claim diasumsikan benar berdasarkan track record akurasi tabel lain. Verifikasi cepat kalau Phase 2 menyentuh trace UI. |

### Doc 01 — Definisi & Konsep

Dokumen doctrinal — claim direct quote dari 3 reference file (anatomy + engineering-guid + control-plane). Sudah dicross-check di Phase 0. ✅ akurat secara content. Tidak ada claim Makalah-spesifik kode untuk diaudit.

---

## Ringkasan Kuantitatif

| Verdict | Count |
|---|---|
| ✅ Akurat | ~50 claim |
| ⚠️ Partial / framing mismatch | 2 claim (updateArtifact auto-rescue framing, plan-gate "downgrade" log message) |
| 🆕 Code-claim doc-missing | 2 claim (`DEFAULT_WARN_RATIO`, `CHARS_PER_TOKEN`) |
| ❌ Stale | 0 |
| ⚠️ Deferred ke Phase 2 | 2 claim (P1-P4 compaction detail, reasoningTrace schema) |
| **Total claim diaudit** | **~55** |

---

## Catatan Struktural (Bukan Claim Divergensi)

1. **`glossary.md` tidak eksis** — disebut wajib oleh root index dan oleh runtime hook, tapi file tidak ada. White Book tidak konsisten.
2. **Hardcoded path `file:///.../worktrees/what-is-makalah/...` di seluruh doc 06** — link broken di branch `durable-agent-harness` (dan worktree manapun selain `what-is-makalah`). Bug doc lokasi.
3. **SCOPE.md kurang lengkap** — hanya menyebut 2 reference file (anatomy + engineering-guid); `control-plane-domain-action.md` integral ke audit harness Makalah dan harus ditambahkan ke scope eksplisit.

---

## Bottom Line

Doc `06-agent-harness/` **sangat akurat** sebagai snapshot *what exists today*. Dari ~55 claim eksplisit, 0 stale, 2 framing mismatch minor, 2 code-side claim hilang dari doc, dan ~50 akurat 1:1 dengan file:line evidence.

Audit Phase 2 (gap matrix REST × 12-component) bisa lanjut dengan **risiko rendah doc-vs-code mismatch**. Doc bisa dipakai sebagai baseline untuk peta "what is" sambil rubric REST × 12-component memetakan "what should be" dan delta-nya.

---

## Rekomendasi Lanjutan

1. **Phase 2:** Bangun gap matrix di file `02-phase2-gap-matrix.md` (atau nama serupa) — REST × 12-component, setiap sel `solid/partial/absent/divergent` + evidence file:line.
2. **Doc-bug fix queue (di luar audit, tapi flag untuk follow-up):**
   - Buat `glossary.md` atau hapus referensi wajibnya dari `index.md` + hook.
   - Ganti hardcoded `file:///.../worktrees/what-is-makalah/` di `06-agent-harness/*.md` jadi path relatif (`../references/...`).
   - Update SCOPE.md untuk include `control-plane-domain-action.md` eksplisit.
   - Tambahkan `DEFAULT_WARN_RATIO` + `CHARS_PER_TOKEN` ke doc 04 sebagai catatan.
3. **Phase 1 deferred items** (verifikasi kalau Phase 2 menyentuh area ini):
   - P1-P4 compaction chain detail di `src/lib/ai/context-compaction.ts`.
   - `messages.reasoningTrace` schema di `convex/schema.ts:145`.
