# Phase 3 — Rebuild Spec

**Branch:** `durable-agent-harness`
**Date:** 2026-04-26
**Input:** Gap matrix dari `02-phase2-gap-matrix.md` (17 PARTIAL cells across 4 clusters).
**Approach:** Cluster A (Reliability) di-spec full karena paling urgent + foundational untuk durabilitas. Cluster B/C/D di-sketch dengan target state + scope, detailed spec deferred ke iterasi spec berikutnya kalau Cluster A sudah landed.

> **Justifikasi pacing:** Per memory `feedback_analysis_paralysis.md`, sesi spec sebelumnya pernah identify 22+12 issues, produce 3 docs, fix nol → semua di-rollback. Spec doc ini batasi diri ke ~6 actionable items di Cluster A. Cluster B/C/D di-cap sebagai future scope, bukan analysis-spam.

## Spec Doc Convention

Tiap spec item punya struktur konsisten:
- **Cell:** referensi ke gap matrix (e.g., R1, R7).
- **Current state:** apa yang ada sekarang (file:line).
- **Target state:** outcome konkret, observable.
- **Approach:** strategi implementasi (high-level, bukan code).
- **Constraint:** Six Design Principles + State Separation Principle yang relevant.
- **Migration:** backwards-compat untuk in-flight Convex data.
- **Out of scope:** eksplisit batas spec ini.
- **Acceptance criteria:** how we know it's done (verifiable).

---

## CLUSTER A — Reliability (Full Spec)

### A1 · Auto-Recover Stuck Runs (R1)

**Cell:** R1 (Reliability × Orchestration Loop) — currently 🟡 PARTIAL.

**Current state:** Pause/resume via `pendingDecisionId` requires explicit user action (re-POST dengan `x-harness-resume` header). Kalau process crash mid-stream di Step 11 (model call), run tetap status `running` di `harnessRuns` selamanya — tidak ada timeout / heartbeat / lease. User UI tidak tahu run-nya zombie.

**Target state:**
- Run yang stuck >X menit tanpa step progress di-detect dan di-flip ke `failed` dengan `failureClass = "unexpected_failure"` + log alasan "lease_expired".
- UI bisa query stuck runs per conversation dan tawarkan opsi: resume (kalau aman) atau start-fresh.
- Tidak ada zombie row.

**Approach:**
1. Tambah field `leaseExpiresAt: number` di `harnessRuns` (Convex schema). Saat `createRun` / `startStep`, set `leaseExpiresAt = Date.now() + LEASE_DURATION_MS` (default 5 menit, configurable).
2. Tambah Convex mutation `expireStuckRuns()` — query runs dengan `status === "running"` AND `leaseExpiresAt < Date.now()`, flip ke `failed` dengan `failureClass = "unexpected_failure"`, emit `run_failed` event dengan `reason: "lease_expired"`.
3. Trigger expire check via Convex cron (tiap 1 menit) ATAU lazy detection (saat user POST ke chat, sweep stuck runs untuk conversation tersebut sebelum proses).
4. UI `getRecentRuns()` return runs dengan flag `wasStuck: boolean` untuk explicit display.

**Constraint:**
- **Design for Failure** — assume crashes are normal; lease is the safety net.
- **Contract-First** — `expireStuckRuns()` mutation eksplisit, bukan implicit cleanup.
- **Everything is Measurable** — emit `run_failed` event dengan reason supaya bisa di-tally per cause.
- **State Separation** — lease state di Convex, bukan in-memory.

**Migration:**
- Field baru `leaseExpiresAt: v.optional(v.number())` — `optional` supaya backwards-compat untuk row existing tanpa lease.
- Existing runs tanpa `leaseExpiresAt` di-treat sebagai "no lease set" (skip expire check). Setelah deploy, run baru otomatis dapat lease.
- Tidak perlu data migration script.

**Out of scope:**
- True mid-stream resume (pre-Step 11 atau mid-Step 11). Model token stream tidak bisa di-resume mid-emission. "Resume" untuk stuck runs artinya: start fresh dari state Convex terakhir, bukan replay token stream.
- Lease renewal mid-step kalau model call lama (e.g., reasoning models). Phase 1 fix: cukup deteksi zombie. Lease renewal kalau perlu, defer ke spec follow-up.

**Acceptance criteria:**
- Test: kill process mid-stream → tunggu LEASE_DURATION_MS → query stuck runs → run muncul dengan `wasStuck: true`.
- Test: cron / lazy sweep flip status ke `failed` + emit `run_failed` event dengan reason `lease_expired`.
- Test: existing runs tanpa `leaseExpiresAt` tidak di-touch.

---

### A2 · Atomic Pause / Resume (R7)

**Cell:** R7 (Reliability × State Management) — currently 🟡 PARTIAL.

**Current state:** `pauseRun()` calls TWO mutations: `createDecision` → `pauseRun` (`run-store.ts:140-159`). `resumeRun()` calls TWO: `resolveDecision` → `resumeRun` (`run-store.ts:161-178`). Partial failure window documented but not eliminated. Mitigasi cuma "stable decisionId + retry safe."

**Target state:**
- `pauseRun()` adapter calls SINGLE atomic Convex mutation `pauseRunAtomic` yang internally inserts decision row + flips run status dalam satu transaction.
- Same untuk `resumeRunAtomic`.
- Mirror pattern dari `startStepAtomic` yang sudah jadi (per `run-store.ts:97-107` comment).
- Tidak ada partial failure window.

**Approach:**
1. Tambah Convex mutation `harnessRuns.pauseRunAtomic(runId, reason, decision)` — internally calls `createDecision` + `pauseRun` dalam satu Convex `mutation` handler (atomic by Convex semantics).
2. Tambah `harnessRuns.resumeRunAtomic(runId, decisionId, resolution, response?, ownerToken)` — same pattern.
3. Update `RunStore.pauseRun` dan `resumeRun` di `run-store.ts` jadi single mutation call.
4. Hapus 2-mutation path setelah migration verified.

**Constraint:**
- **Contract-First** — single mutation = single contract.
- **Separation of Concerns** — adapter layer thin (1:1 wrapper); business logic di Convex.
- **State Separation** — Convex transaction = atomicity boundary.

**Migration:**
- Tambah mutation baru (additive). Old mutations `createDecision`, `pauseRun`, `resolveDecision`, `resumeRun` tetap dipertahankan supaya old code path tidak break selama transition.
- Cutover di adapter layer (`run-store.ts`) — switch ke atomic mutation.
- Setelah cutover stabil (1-2 release cycle), deprecate old standalone mutations dengan grep + delete.

**Out of scope:**
- Saga pattern untuk cross-table workflow yang lebih kompleks (pause/resume cuma 2 tabel, atomic mutation cukup).
- Cross-database transactions (single Convex DB, trivial).

**Acceptance criteria:**
- Test: invoke `pauseRunAtomic` — kedua tabel ter-update; force-fail di tengah → keduanya rollback (Convex guarantee).
- Test: existing test suite untuk pause/resume tetap pass dengan adapter switched ke atomic path.
- Verify: `RunStore.pauseRun` dan `resumeRun` cuma call ONE mutation each.

---

### A3 · Outbox Pattern untuk Events (R7)

**Cell:** R7 (Reliability × State Management) — sub-gap kedua.

**Current state:** `eventStore.emit()` adalah independent Convex mutation, tidak dikoordinasi dengan state mutation. Kalau `pauseRun` sukses tapi `eventStore.emit("run_paused")` gagal (network blip, Convex retry exhausted), state berubah tanpa event log entry. Sebaliknya juga mungkin (event tercatat, state belum berubah).

**Target state:**
- Critical events (lifecycle: started/paused/resumed/completed/failed/aborted) selalu konsisten dengan state mutation.
- Inconsistent state ↔ event log eliminated for lifecycle events.

**Approach:**
1. Tambah tabel `harnessEventOutbox` di Convex schema dengan field: `id`, `eventEnvelope`, `createdAt`, `flushedAt`, `attemptCount`.
2. State mutation yang lifecycle-relevant (`pauseRunAtomic`, `resumeRunAtomic`, `completeRun`, `updateRunStatus` ke failed/aborted) WRITE event ke outbox dalam transaksi yang sama (single Convex mutation = atomic).
3. Background flusher (Convex scheduled function tiap 5 detik) batch-read outbox, push ke `harnessEvents`, mark `flushedAt`. Idempotent via stable `eventId`.
4. Existing `eventStore.emit()` API stays — outbox cuma untuk event yang co-emit dengan state mutation.

**Constraint:**
- **Design for Failure** — outbox is the safety net.
- **Contract-First** — outbox row schema explicit.
- **Everything is Measurable** — `attemptCount` + `flushedAt` observable.

**Migration:**
- Tambah tabel `harnessEventOutbox` (new). Tidak touch existing `harnessEvents`.
- Enable outbox per-event-type secara incremental. Mulai dari lifecycle events (low cardinality, high importance).
- High-cardinality events (`tool_called`, `step_started`) tetap pakai direct emit — outbox cost tidak sebanding kalau sub-second emit rate.

**Out of scope:**
- Real-time fan-out (Convex query reactivity sudah handle).
- Multi-region replication.
- Tool-level events (cost vs benefit unfavorable).

**Acceptance criteria:**
- Test: invoke `pauseRunAtomic` → outbox row appears dalam transaksi yang sama.
- Test: simulate flusher fail → outbox row remains, `attemptCount` increments, eventually flushed.
- Test: idempotency — flusher retry tidak duplicate event di `harnessEvents`.

---

### A4 · Error Classification Tier + Retry Cap (R8)

**Cell:** R8 (Reliability × Error Handling) — currently 🟡 PARTIAL.

**Current state:** `failureClass` enum eksis di `harnessRuns` (entry/state/tool/verification/guard/unexpected_failure) tapi populated inkonsisten. `classifyError()` telemetry function (`@/lib/ai/telemetry`) classify untuk Sentry tagging, bukan retry strategy. `retryMutation` punya implicit cap, tidak surfaced.

**Target state:**
- Setiap error yang escape ke orchestrator catch block diklasifikasi ke salah satu tier:
  1. **Transient** — retry-able (network blip, Convex OCC). Auto-retry dengan exp backoff, cap 2.
  2. **LLM-recoverable** — return error sebagai ToolMessage, model coba lagi via TAO loop.
  3. **User-fixable** — interrupt run, surface ke UI sebagai user decision.
  4. **Unexpected** — bubble up, mark `failureClass`, no auto-retry.
- Retry cap eksplisit (2 max per tier) di harness level, bukan implicit di mutation wrapper.

**Approach:**
1. Tambah `src/lib/chat-harness/error/classify.ts` dengan function `classifyHarnessError(error): { tier, retryable, maxAttempts, recoveryHint, failureClass }`.
2. Wire classify ke catch block di `orchestrate-sync-run.ts:484` (sebelum panggil `attemptFallbackExecution`). Kalau tier === "transient" → retry sebelum fallback. Kalau "user-fixable" → pause run dengan decision prompt. Kalau "unexpected" → langsung fallback / fail.
3. Populate `failureClass` di Convex `updateRunStatus` consistently dari output `classifyHarnessError`.
4. Add retry counter to `harnessRuns` schema (`retryAttempts: v.optional(v.number())`).

**Constraint:**
- **Design for Failure** — failure normal, classified handling.
- **Everything is Measurable** — tier + attempt count observable per run.
- **Contract-First** — classification function returns structured result, not boolean.

**Migration:**
- New file, additive. Existing `classifyError` telemetry stays for Sentry.
- `retryAttempts` field optional → backwards-compat.
- `failureClass` enum sudah eksis, cuma populated lebih konsisten.

**Out of scope:**
- Provider-specific error mapping detail (Vercel Gateway vs OpenRouter — defer ke fallback path yang sudah handle).
- Human-in-the-loop UI untuk "user-fixable" tier — depend pada UI work yang di luar scope harness.

**Acceptance criteria:**
- Test: simulate transient Convex error → retry happens dengan exp backoff, capped at 2 → kalau masih fail, `failureClass = "transient_failure_exhausted"` (atau mapping serupa).
- Test: simulate LLM tool error → returned ke model sebagai ToolMessage (no retry at orchestrator level).
- Test: query event log untuk `run_failed` → payload include `tier` + `attemptCount`.

---

### A5 · LLM-as-Judge Verification Layer (R10)

**Cell:** R10 (Reliability × Verification Loops) — currently 🟡 PARTIAL.

**Current state:** `verifyStepOutcome` cuma rules-based (toolChainOrder, completionBlockers, leakage detection). Per Cherny benchmark (anatomy doc): verification loop → 2-3x quality. Saat ini cuma single tier.

**Target state:**
- Optional LLM-as-judge layer untuk high-stakes stages (validation submission, finalization stages: `hasil`, `diskusi`, `kesimpulan`).
- Run paralel dengan rules-based, hasil di-merge di `verificationSummary`.
- Cost-aware: opt-in per stage, default off untuk non-finalization stages.

**Approach:**
1. Tambah `src/lib/chat-harness/verification/verify-with-llm.ts` — function `verifyWithLLM({ artifactContent, stageContext, model })` return `{ pass: boolean, issues: string[], confidence: number }`.
2. Wire ke `verifyStepOutcome` sebagai optional second-tier check, gated per stage via config table (atau hardcoded enum awal).
3. Hasil judge di-emit sebagai field tambahan di `verificationSummary.llmJudgeResult`.
4. Telemetry: comparison metric — kapan rules-based pass tapi LLM-judge fail (catch yang missed) dan vice versa.

**Constraint:**
- **Everything is Measurable** — emit comparison telemetry untuk justify cost.
- **Design for Failure** — LLM judge gagal / timeout → degrade ke rules-only, jangan block.
- **Separation of Concerns** — judge function pure (input → judgment), tidak side-effect.

**Migration:**
- New file, additive. `verificationSummary` field optional.
- Default off — tidak affect existing runs.

**Out of scope:**
- Visual feedback (Playwright screenshots) — Makalah text-only output, tidak applicable.
- Auto-rejection / auto-revision based on LLM judge — judge surfaces issues, human (atau model di next turn) decide. Phase 1 cuma judgment, bukan automated action.

**Acceptance criteria:**
- Test: enable judge untuk stage `kesimpulan` → invoke verifyStepOutcome → `verificationSummary.llmJudgeResult` populated.
- Test: judge timeout → fall back ke rules-only result, no error propagated up.
- Telemetry query: count "rules pass + judge fail" per stage per week.

---

### A6 · Memory Hint vs Verify Pattern (R3)

**Cell:** R3 (Reliability × Memory) — currently 🟡 PARTIAL.

**Current state:** `paperMemoryDigest` di Convex (`schema.ts:726`), inject ke prompt saat P2 compaction. Model treat digest sebagai authoritative, tidak ada "hint vs verify" distinction. Anatomy doc principle: "agent treats its own memory as a hint and verifies against actual state before acting."

**Target state:**
- Digest entries marked dengan `verifiedAt: number` + `supersededBy?: string` (sudah ada untuk supersede flow per `context-compaction.ts:230`).
- Tools yang depend pada digest content (e.g., reading historical decision dari digest) call helper `verifyDigestEntry(entry)` yang re-fetch current paperSession state + flag stale.
- Stale digest entries → return ke model dengan `[STALE_DIGEST]` marker, prompt model untuk verify via `getCurrentPaperState` sebelum act.

**Approach:**
1. Add `verifiedAt` field per digest entry (additive, optional).
2. Helper `verifyDigestEntry(entry, currentSession): { fresh: boolean, stalenessReason?: string }` di `src/lib/ai/memory/verify-digest.ts`.
3. `buildStageDigestMessage` (`context-compaction.ts`) inject `[VERIFY-BEFORE-USE]` marker untuk entry dengan `verifiedAt` lebih dari N hari atau yang state-nya sudah berubah signifikan.
4. Tool description (e.g., readArtifact, getCurrentPaperState) di-update untuk reinforce: "kalau digest mention X, verify dulu via getCurrentPaperState sebelum act."

**Constraint:**
- **Memory is hint** (anatomy principle).
- **Contract-First** — verifyDigestEntry return structured.
- **Design for Failure** — assume digest can be stale.

**Migration:**
- New optional field — backwards compat. Existing digest entries tanpa `verifiedAt` di-treat as "always verify" (defensive default).

**Out of scope:**
- Multi-version digest with full history — current digest is current state only.
- Automatic digest refresh trigger (defer ke Cluster B optimization round).

**Acceptance criteria:**
- Test: digest entry dengan `verifiedAt` 30 hari lalu → injected dengan `[VERIFY-BEFORE-USE]` marker.
- Test: helper detects state divergence (e.g., digest says stage X approved, current session shows X as revision) → returns `fresh: false, stalenessReason: "stage_status_diverged"`.

---

## CLUSTER B — Efficiency (Sketch / Follow-Up)

Setiap item di sini punya target state + scope, tapi tidak full spec sampai Cluster A landed. Spec round berikut akan deep-dive Cluster B.

### B1 · Per-tenant / per-task Token Budget (E12)
- **Target:** Quota enforcement at harness level (token, request count) per tenant. Soft limit → warning; hard limit → reject new run.
- **Why later:** Need actual usage data dari production (dari Cluster A telemetry yang nambah failure tracking) sebelum bisa set sane defaults.

### B2 · Event Log Retention / TTL (E7)
- **Target:** `harnessEvents` partitioned by age; events >90 hari archived ke cold storage atau dropped per retention policy.
- **Why later:** Needs Cluster A outbox (A3) selesai dulu — pattern serupa, bisa reuse infrastructure.

### B3 · Per-tool Timeout + Read-only Parallelization (E2)
- **Target:** Each tool declares max execution time. Read-only tools (inspectSource*, getCurrentPaperState) marked sebagai parallelizable, dispatch concurrently per anatomy doc principle.
- **Why later:** Needs Cluster A error classification (A4) — timeout = transient tier mapping.

### B4 · Per-layer Token Budget di Instruction Stack (E5)
- **Target:** Each layer declares max contribution to total token budget; pruning per-layer kalau overflow.
- **Why later:** Need actual per-layer token profiling first (Phase 2 deferred item).

### B5 · Circuit Breaker + Graceful Degradation (E8)
- **Target:** Repeated failures dari satu provider trip circuit; degrade ke "weak-but-safe" mode.
- **Why later:** Build on top of A4 (error classification) + B1 (telemetry).

---

## CLUSTER C — Security (Sketch / Follow-Up)

### C1 · Prompt Injection Defense Layer (S4)
- **Target:** User input scanned untuk known injection patterns sebelum di-inject ke prompt. Model warned via system prompt addition.
- **Why later:** Need security review separate dari durability work; defer ke security-review skill round.

### C2 · PII / Secret Scanner di Prompt + Output (S5, S8)
- **Target:** Detect PII (email, phone, API key patterns) di user input + model output. Redact / flag.
- **Why later:** Cross-cutting concern — affects context, prompt, output, error. Needs holistic security spec round.

### C3 · Error Message Sanitization (S8)
- **Target:** Errors yang forwarded ke model context di-sanitize (strip table names, stack traces, internal paths).
- **Why later:** Trivial fix tapi cross-cuts dengan A4 (error classification) — mending bundled.

### C4 · Generic Security Verification (S10)
- **Target:** Verification loop check juga security policy (forbidden tool invocation patterns, content type violations), bukan cuma artifact leakage.
- **Why later:** Built on top of A5 (LLM judge) infrastructure.

---

## CLUSTER D — Traceability (Sketch / Follow-Up)

### D1 · Memory Mutation Audit Log (T3)
- **Target:** Every mutation ke `paperMemoryDigest` emit event (`memory_digest_updated`) dengan diff payload.
- **Why later:** Built on A3 (outbox) untuk consistency guarantee.

### D2 · Persisted Final Prompt (T5)
- **Target:** Final assembled prompt (atau hash + reproducible recipe) persisted per step untuk replay.
- **Why later:** Storage cost analysis needed; might just persist hash + layer composition.

### D3 · Streamed Output Reconstruction (T6)
- **Target:** Single canonical "final assistant text" event per step, bukan reconstruct dari chunks.
- **Why later:** Schema change to `harnessRunSteps` atau `messages` table — coordinate dengan UI changes.

---

## Cross-Cutting Migration Plan

Semua item Cluster A pakai pattern migration yang sama:
1. **Schema additive** — field baru `optional`, tabel baru independent. Tidak ada destructive migration.
2. **Adapter layer switch** — `RunStore` / `EventStore` jadi single point of behavior change.
3. **Old code path stays** — selama 1-2 release cycle, supaya rollback aman.
4. **Cleanup PR** — setelah cutover stable, hapus old paths dengan grep + delete dalam PR terpisah.

In-flight Convex data (runs yang sedang running saat deploy):
- Existing runs tanpa field baru (`leaseExpiresAt`, `retryAttempts`, dll) di-treat sebagai "no value set" — defensive default, tidak break.
- Tidak ada backfill required untuk Cluster A.

---

## Out of Scope (Eksplisit untuk Spec Doc Ini)

1. **Cluster B/C/D detailed spec** — di-sketch dengan target state, full spec di-defer ke spec round berikutnya setelah Cluster A landed.
2. **UI changes** untuk surface stuck runs / user-fixable interrupts. Harness work first; UI consumes harness contracts later.
3. **Model behavior changes** — spec ini tidak ubah system prompts atau stage skills. Pure infrastructure.
4. **Subagent introduction** — column 11 di gap matrix di-N/A by design, tidak boleh diintroduce di spec ini.
5. **Provider-level changes** (Vercel Gateway / OpenRouter config) — di luar harness boundary.
6. **Existing test suite refactor** — spec target green test, tidak refactor harness tests yang sudah ada.

---

## Constraints Summary (Six Design Principles + State Separation Applied)

| Principle | Bagaimana Diterapkan di Spec Ini |
|---|---|
| **Design for Failure** | A1 (lease for crashes), A2 (atomic txn), A3 (outbox safety net), A4 (classified retry), A5 (judge degrade graceful) |
| **Contract-First** | A1 (`expireStuckRuns` mutation), A2 (atomic mutations), A3 (outbox row schema), A4 (`classifyHarnessError` return type), A6 (`verifyDigestEntry` signature) |
| **Secure by Default** | Cluster C explicit (deferred but not forgotten); A1 lease prevents zombie write paths |
| **Separation of Concerns** | A2 (adapter thin, business in Convex), A3 (outbox decouples emit from flush), A5 (judge pure function) |
| **Everything is Measurable** | A1 (`run_failed` reason), A4 (tier + attempt count), A5 (judge comparison telemetry), A6 (digest staleness reason) |
| **Data-Driven Evolution** | Cluster B/C/D defer because need data (B1 quota baseline, C2 PII baseline) — spec ini bangun telemetry foundation |
| **State Separation** | A1 (lease in Convex, not in-memory), A6 (digest in Convex with verified state) — LLM tetap stateless throughout |

---

## Bottom Line

Spec round ini target **6 actionable items di Cluster A (Reliability)** — fondasi durabilitas. Semua additive, backwards-compat, no destructive migration.

Cluster B (Efficiency, 5 items), C (Security, 4 items), D (Traceability, 3 items) di-acknowledge dengan target state + alasan sequencing, full spec di iterasi berikutnya.

**Phase 3 → Phase 4 checkpoint per skill:**
- ✅ Spec includes target state per pillar (Cluster A complete; B/C/D scoped).
- ✅ Migration path defined (cross-cutting plan section).
- ✅ Out-of-scope list explicit (top-level + per-item).

**Next move (Phase 4):** Decompose 6 Cluster A items jadi executable task list di `04-phase4-tasks.md`. Tiap task: satu pillar primary (jangan campur R + S), acceptance criteria tied to evidence, ordered by dependency (e.g., A4 error classification might block A1 lease error mapping).
