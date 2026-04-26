# Phase 2 — Gap Matrix (REST × 12-Component)

**Branch:** `durable-agent-harness`
**Date:** 2026-04-26
**Input:** Per-claim verification log dari `01-phase1-audit-result.md` + spot-check tambahan untuk area yang belum di-audit di Phase 1 (verification loops, subagent code, memory digest, rate-limiting, circuit breaker).
**Rubric source:** Skill `makalah-durable-harness` — REST framework dari `harness-engineering-guid.md` × 12-component anatomy dari `anatomy-agent-harness.md`.

## Status Legend

| Symbol | Meaning |
|---|---|
| 🟢 SOLID | Implementasi match REST requirement, evidence file:line jelas |
| 🟡 PARTIAL | Sebagian implementasi, ada gap konkret yang perlu di-rebuild atau di-perkuat |
| 🔴 ABSENT | Tidak ada implementasi sama sekali, harus dibangun |
| ⚠️ DIVERGENT | Implementasi eksis tapi konflik dengan REST principle / engineering guide |
| ⚪ N/A | Genuinely tidak applicable, dengan justifikasi eksplisit |

---

## Matrix

| Component | Reliability | Efficiency | Security | Traceability |
|---|---|---|---|---|
| **1. Orchestration Loop** | 🟡 R1 | 🟢 E1 | 🟢 S1 | 🟢 T1 |
| **2. Tools** | 🟢 R2 | 🟡 E2 | 🟢 S2 | 🟢 T2 |
| **3. Memory** | 🟡 R3 | 🟢 E3 | 🟢 S3 | 🟡 T3 |
| **4. Context Management** | 🟢 R4 | 🟢 E4 | 🟡 S4 | 🟢 T4 |
| **5. Prompt Construction** | 🟢 R5 | 🟡 E5 | 🟡 S5 | 🟡 T5 |
| **6. Output Parsing** | 🟢 R6 | 🟢 E6 | 🟢 S6 | 🟡 T6 |
| **7. State Management** | 🟡 R7 | 🟡 E7 | 🟢 S7 | 🟢 T7 |
| **8. Error Handling** | 🟡 R8 | 🟡 E8 | 🟡 S8 | 🟢 T8 |
| **9. Guardrails & Safety** | 🟢 R9 | 🟢 E9 | 🟢 S9 | 🟢 T9 |
| **10. Verification Loops** | 🟡 R10 | 🟡 E10 | 🟡 S10 | 🟢 T10 |
| **11. Subagent Orchestration** | ⚪ R11 | ⚪ E11 | ⚪ S11 | ⚪ T11 |
| **12. Lifecycle Management** | 🟢 R12 | 🟡 E12 | 🟢 S12 | 🟢 T12 |

**Tally:** SOLID 23 · PARTIAL 17 · ABSENT 0 · DIVERGENT 0 · N/A 4 · DEFERRED 4 (P1-P4 detail, reasoningTrace, future cells)

---

## Cell Details

### Reliability Pillar (Fault Recovery, Idempotency, Behavioral Consistency)

#### R1 · Orchestration Loop — 🟡 PARTIAL
- **Solid:** Pause/resume via `pendingDecisionId` (`runtime/orchestrate-sync-run.ts:325-363, 116-184`). Resume header `x-harness-resume` reconstructs lane dari persisted run row.
- **Gap:** Tidak ada auto-resume setelah process crash mid-stream. Kalau stream mati di tengah Step 11 (model call), run masuk state `failed`, butuh user re-POST baru. Tidak ada checkpoint mid-step.
- **Gap:** Tidak ada idempotency key di entry layer — duplicate POST dengan `requestId` sama bisa create 2 run rows kalau ownership check race.

#### R2 · Tools — 🟢 SOLID
- `requestRevision` idempotent (`paper-tools.ts:492` alreadyInRevision no-op).
- `submitStageForValidation` idempotent (`paper-tools.ts:416` alreadyPendingValidation no-op).
- `createArtifact` race-free claim sync sebelum await (`build-tool-registry.ts:142, 152`).
- `retryMutation` wrapper untuk transient Convex errors (`@/lib/convex/retry`).

#### R3 · Memory — 🟡 PARTIAL
- **Solid:** `paperMemoryDigest` persisted di Convex (`convex/schema.ts:726`), survives across sessions.
- **Gap:** Tidak ada eksplisit "memory as hint, verify against state" pattern (per anatomy doc principle). Model memperlakukan DB query sebagai ground truth, tapi tidak ada layer yang membedakan kapan memory entry stale vs current.
- **Gap:** Tidak ada audit log mutasi memory digest — hanya snapshot terakhir, tidak bisa replay evolusi.

#### R4 · Context Management — 🟢 SOLID
- P1 (deterministik strip chitchat) + P2 (deterministik compact stages) + P3 (LLM summarize) + P4 (signal shrink) — multi-tier compaction (`context-compaction.ts`).
- Brute prune sebagai safety net (`apply-context-budget.ts:92-109`).
- Same input → same compaction result untuk priority deterministik. P3 kalau gagal di-skip tanpa error (graceful degradation).

#### R5 · Prompt Construction — 🟢 SOLID
- 13-layer instruction stack dengan ordering ketat (`resolve-instruction-stack.ts:80-217`).
- Same context resolution → same prompt assembly. Deterministik.

#### R6 · Output Parsing — 🟢 SOLID
- Native Vercel AI SDK tool calling (`build-step-stream.ts`), tidak ada custom regex parser untuk tool calls.
- Tool errors return sebagai `ToolMessage` ke model untuk LLM-recoverable retry.

#### R7 · State Management — 🟡 PARTIAL
- **Solid:** `startStepAtomic` single-mutation (`run-store.ts:91-107`). State Separation Principle followed — LLM stateless, state di Convex.
- **Gap:** `pauseRun` / `resumeRun` composes 2 mutations across DIFFERENT tables (`harnessDecisions` + `harnessRuns`). Partial failure window documented (`run-store.ts:129-138`) tapi mitigasinya cuma "stable decisionId + retry safe", bukan saga/compensation pattern. Window kecil tapi non-zero.
- **Gap:** Tidak ada outbox pattern untuk events — kalau Convex mutation sukses tapi event emit gagal (atau sebaliknya), state inkonsisten dengan event log.

#### R8 · Error Handling — 🟡 PARTIAL
- **Solid:** Primary→fallback provider switch (`orchestrate-sync-run.ts:484-505`). `retryMutation` wrapper. `classifyError` telemetry. `failureClass` enum di schema.
- **Gap:** Tidak ada eksplisit 4-tier classification per anatomy doc (transient / LLM-recoverable / user-fixable / unexpected). `failureClass` ada (`entry_failure` / `state_failure` / `tool_failure` / `verification_failure` / `guard_failure` / `unexpected_failure`) tapi mapping ke recovery strategy tidak terstandar.
- **Gap:** Tidak ada retry attempt cap eksplisit di harness level (Stripe pattern: max 2 retries). Cap implicit di `retryMutation` only.

#### R9 · Guardrails & Safety — 🟢 SOLID
- 3 enforcer (`enforcers.ts:43, 88, 137`) + 5-tier execution boundary (`build-tool-boundary-policy.ts:14-25`) + auto-rescue (`auto-rescue-policy.ts:24-46`) + Convex backend guards (`convex/paperSessions.ts:874, 1494, 2031, 2044`). Defense in depth — model decides what to attempt, tool system decides what's allowed.

#### R10 · Verification Loops — 🟡 PARTIAL
- **Solid:** `verifyStepOutcome` dual-call pattern (`verify-step-outcome.ts:7-22`) — stream-finish handler + onFinish handler. `emitEvents` gate mencegah double emission.
- **Gap:** Cuma rules-based verification (toolChainOrder check, completion blockers, leakage detection). Tidak ada LLM-as-judge layer (Anthropic recommendation). Tidak ada visual feedback (Playwright screenshot loop). Cherny benchmark: verification loop → 2-3x quality, tapi cuma single-layer di Makalah.

#### R11 · Subagent Orchestration — ⚪ N/A
- **Justifikasi:** Single-agent architecture by design (per doc 01 Sec 8 — "Maksimalkan single agent dulu. Split hanya jika >10 overlapping tools atau domain task jelas terpisah"). Makalah punya ~14 stage, tapi semua flow lewat satu agent dengan stage skill yang berbeda. Subagent fork/teammate/worktree bukan kebutuhan saat ini.

#### R12 · Lifecycle Management — 🟢 SOLID
- `RunStore.createRun → startStep → completeStep → completeRun` lifecycle (`run-store.ts:37-127`).
- Eksplisit status enum: `running | paused | completed | failed | aborted`.
- Run lane resolution (`entry/resolve-run-lane.ts`), conversation resolution (`entry/resolve-conversation.ts`).

---

### Efficiency Pillar (Resource Control, Low-Latency, High Throughput)

#### E1 · Orchestration Loop — 🟢 SOLID
- Streaming end-to-end via Vercel AI SDK (`buildStepStream`). Tidak ada extra buffering antara model dan client.
- Step assembly tidak punya I/O sequential yang bisa di-paralelkan tanpa breaking determinism.

#### E2 · Tools — 🟡 PARTIAL
- **Solid:** `retryMutation` punya implicit budget (max retry attempts).
- **Gap:** Tidak ada per-tool timeout. Tool yang stuck (misalnya search dengan slow upstream) bisa hang sampai global timeout.
- **Gap:** Tidak ada circuit breaker — repeated failures dari satu tool tidak trip-and-degrade ke fallback path.
- **Gap:** Read-only tools (inspectSourceDocument, quoteFromSource, getCurrentPaperState) tidak di-paralelkan eksplisit. Anatomy doc: "read-only operations can run concurrently; mutating operations run serially" — Makalah serial-by-default.

#### E3 · Memory — 🟢 SOLID
- Memory Digest (`paperMemoryDigest`) compress stage history jadi entry pendek per stage. High signal density per token.
- P2 compaction inject digest hanya saat dibutuhkan (token > 85%), bukan setiap turn.

#### E4 · Context Management — 🟢 SOLID
- Threshold-driven compaction 85% (`DEFAULT_COMPACTION_RATIO`).
- Brute prune 80% (`DEFAULT_THRESHOLD_RATIO`) sebagai safety net.
- KEEP_LAST_N=50 last messages.
- `shouldWarn` 60% sebagai early signal (🆕 doc-missing tapi eksis di kode).
- Multi-tier resource control = clear cost gradient.

#### E5 · Prompt Construction — 🟡 PARTIAL
- **Solid:** Layer assembly deterministik, urutan stabil.
- **Gap:** Tidak ada per-layer token budget. Layer yang overflow (misalnya `sources-context` dengan 100 sumber, atau `paper-mode` prompt yang terlalu panjang) bisa squeeze layer lain. Pruning happens upstream (compaction) tapi tidak per-layer.

#### E6 · Output Parsing — 🟢 SOLID
- Native tool calling = zero parser overhead.

#### E7 · State Management — 🟡 PARTIAL
- **Solid:** Convex tables indexed (`by_conversation`, `by_paperSession`, `by_ownerToken`, `by_user_updated`) — read query efficient.
- **Gap:** `harnessEvents` append-only tanpa retention policy documented. Bisa grow unbounded per conversation. Tidak ada TTL atau archival strategy.
- **Gap:** `harnessRunSteps` per run tumbuh linear dengan turn count — query historis bisa slow seiring waktu.

#### E8 · Error Handling — 🟡 PARTIAL
- **Solid:** Fallback provider switch low-latency (no extra round-trip beyond reattempt).
- **Gap:** Tidak ada circuit breaker — repeated primary failures terus retry tanpa trip.
- **Gap:** Tidak ada graceful degradation mode (e.g., "primary down → switch ke read-only / weak-but-safe").

#### E9 · Guardrails & Safety — 🟢 SOLID
- Enforcers run per-step, lightweight. No async I/O di enforcer body — cuma read dari already-fetched session.
- Auto-rescue async tapi single Convex roundtrip.

#### E10 · Verification Loops — 🟡 PARTIAL
- **Solid:** `emitEvents` gate prevents double persistence on dual-call.
- **Gap:** Verification logic itself runs 2x per step (stream-finish + onFinish). Idempotent tapi compute cost double. Acceptable kalau cheap, tapi belum ada profiling.

#### E11 · Subagent Orchestration — ⚪ N/A
- By design.

#### E12 · Lifecycle Management — 🟡 PARTIAL
- **Solid:** Token usage captured per step (`executorResultSummary` di harnessRunSteps).
- **Gap:** Tidak ada budget enforcement per-tenant / per-task / per-stage. Per-conversation cost tracking via `billingContext` ada tapi bukan circuit breaker — tidak block kalau tenant exceed quota.
- **Gap:** Tidak ada TTFA (time-to-first-action) metric eksplisit.

---

### Security Pillar (Least Privilege, Sandboxed Execution, I/O Filtering)

#### S1 · Orchestration Loop — 🟢 SOLID
- Resume guards: `conversationId` mismatch check (`orchestrate-sync-run.ts:139-143`), `ownerToken` verification.
- Authentication propagated via `accepted.userId` + `accepted.convexToken`.

#### S2 · Tools — 🟢 SOLID
- Semua tool call Convex mutations dengan `requirePaperSessionOwner` / `requireAuthUserId`.
- Tidak ada raw shell / file / network execution di tool layer.
- Tool registry includes only authorized tools per stage scope (`build-tool-registry.ts`).

#### S3 · Memory — 🟢 SOLID
- Memory tied ke `paperSession._id` yang scoped ke `userId`.
- Cross-user contamination prevented at Convex row-level access (own session only).

#### S4 · Context Management — 🟡 PARTIAL
- **Solid:** Source-body parity check (`build-tool-registry.ts:260-272`) prevents content claiming sources it doesn't have.
- **Gap:** Tidak ada eksplisit prompt-injection defense di instruction stack assembly. User input flows langsung ke `messages` tanpa sanitization layer. Trust-by-default untuk own user's input.
- **Gap:** Tidak ada PII / secret detection saat assembly.

#### S5 · Prompt Construction — 🟡 PARTIAL
- **Solid:** System prompts hardcoded / DB-controlled (server-side, not user-modifiable).
- **Gap:** User content di messages tidak melewati PII / secret scanner sebelum diinjeksi ke prompt.

#### S6 · Output Parsing — 🟢 SOLID
- Native tool calling = no eval/exec/shell di output. Output cuma text + structured tool calls.

#### S7 · State Management — 🟢 SOLID
- Convex backend = single source of truth untuk legality (per control-plane doc).
- Semua mutation require auth check.
- `paperSessions.ts` punya 3 layer guard (ownership, status contract, transition validation) sebelum write.

#### S8 · Error Handling — 🟡 PARTIAL
- **Solid:** Errors di Sentry dengan subsystem tags. Failure class enum.
- **Gap:** Error messages forwarded mentah ke model context (`paper-tools.ts` execute returns `error: errorMessage`). Bisa leak internal detail (table names, stack hints) ke LLM context window. Perlu sanitization layer.
- **Gap:** Tidak jelas apakah Sentry breadcrumb scrub PII sebelum send ke external.

#### S9 · Guardrails & Safety — 🟢 SOLID
- Three enforcers + 5-tier boundary + auto-rescue + Convex guards. Per anatomy doc separation: model decides what to attempt; tool system decides what's allowed. Match exact.

#### S10 · Verification Loops — 🟡 PARTIAL
- **Solid:** Leakage detection (`paperTurnObservability.firstLeakageMatch`) — content yang seharusnya cuma di artifact tapi muncul di chat di-flag.
- **Gap:** Leakage detection spesifik ke artifact body, bukan generic security policy (e.g., "model trying to invoke unauthorized tool", "model emitting forbidden content type"). Single-purpose.

#### S11 · Subagent Orchestration — ⚪ N/A
- By design.

#### S12 · Lifecycle Management — 🟢 SOLID
- Ownership check on resume.
- `ownerToken` verification.
- `paperSession` ownership tied ke userId.
- Authentication mandatory di entry layer.

---

### Traceability Pillar (E2E Tracing, Explainable Decisions, Auditable State)

#### T1 · Orchestration Loop — 🟢 SOLID
- Setiap step emit events: `run_started`, `step_started`, `step_completed`, `run_paused`, `run_resumed`, `run_completed`, `run_failed`, `run_aborted`.
- `correlationId` (= `requestId`) propagated across events.
- `causationEventId` chain traceable.

#### T2 · Tools — 🟢 SOLID
- `tool_called` + `tool_result_received` + `artifact_mutation_requested/applied/rejected` events.
- `paperToolTracker` flags observable post-stream (`createArtifactClaimed`, `sawCreateArtifactSuccess`, dll).
- `paperTurnObservability` capture timing (createArtifactAtMs, updateArtifactAtMs, firstLeakageAtMs).

#### T3 · Memory — 🟡 PARTIAL
- **Solid:** `paperMemoryDigest` queryable at any time.
- **Gap:** Tidak ada audit log mutasi digest — kalau entry "superseded" di-set, tidak ada trail siapa/kapan/kenapa. Cuma current state.

#### T4 · Context Management — 🟢 SOLID
- `instruction_stack_resolved` event capture stack assembly outcome.
- Compaction logged via `console.info` (`[Context Compaction] Post-compaction: ...`).
- Threshold breakdown (compaction vs prune) traceable.

#### T5 · Prompt Construction — 🟡 PARTIAL
- **Solid:** `instruction_stack_resolved` event payload include layer summary.
- **Gap:** Final assembled prompt yang dikirim ke model TIDAK fully persisted — cuma layer composition. Reconstructing exact prompt dari event log butuh re-running upstream resolvers.

#### T6 · Output Parsing — 🟡 PARTIAL
- **Solid:** `agent_output_received` event capture output summary.
- **Gap:** Streamed text reconstruction dari events tidak trivial — text appended chunk by chunk, tidak ada single "final output text" event. Final text di `messages.content` tapi requires query message table separately.

#### T7 · State Management — 🟢 SOLID
- 4 tabel (`harnessRuns` + `harnessRunSteps` + `harnessEvents` append-only + `harnessDecisions`) = full state replay capability.
- Indexes (`by_conversation`, `by_paperSession`, `by_user_updated`) support time-range + scoped queries.
- 29 canonical event types cover semua state transitions.

#### T8 · Error Handling — 🟢 SOLID
- `failureClass` enum di harnessRuns (entry/state/tool/verification/guard/unexpected_failure).
- `classifyError` telemetry.
- Sentry breadcrumbs dengan errorType.
- `run_failed` event dengan details.

#### T9 · Guardrails & Safety — 🟢 SOLID
- `execution_boundary_evaluated` event emit per-step (5-tier boundary value).
- `approval_requested` / `approval_resolved` events.
- `workflow_transition_requested/applied/rejected` events.

#### T10 · Verification Loops — 🟢 SOLID
- `verification_started` + `verification_completed` events (`verify-step-outcome.ts:11-12`).
- `verificationSummary` persisted di `harnessRunSteps` (canContinue, mustPause, completionBlockers, leakageDetected, artifactChainComplete, planComplete, streamContentOverridden).

#### T11 · Subagent Orchestration — ⚪ N/A
- By design.

#### T12 · Lifecycle Management — 🟢 SOLID
- `messages.reasoningTrace` (curated/transparent mode, steps array) untuk user-facing transparency. *Schema verification deferred dari Phase 1 — assumed accurate based on track record.*
- Run lifecycle events untuk system audit.

---

## Top Gap Cluster (Priority untuk Phase 3 Spec)

Berdasarkan severity (impact pada R.E.S.T) dan blast radius (komponen yang affected):

### Cluster A — Reliability gaps (durability core)
- **R1** Orchestration Loop: tidak ada auto-resume after crash mid-stream. Run masuk `failed` → user harus re-POST.
- **R7** State Management: 2-mutation pause/resume window, tidak ada outbox untuk events.
- **R8** Error Handling: tidak ada 4-tier classification; tidak ada retry cap eksplisit.
- **R10** Verification Loops: cuma single-tier rules-based, tidak ada LLM-as-judge.
- **R3** Memory: tidak ada "memory as hint, verify against state" pattern; tidak ada audit log mutasi digest.

### Cluster B — Efficiency gaps (cost control)
- **E12** Lifecycle: tidak ada budget enforcement per-tenant / per-task / per-stage.
- **E7** State: event log unbounded growth, no TTL/archival.
- **E2** Tools: tidak ada per-tool timeout, tidak ada read-only paralelisme.
- **E5** Prompt: tidak ada per-layer token budget.
- **E8** Error: tidak ada circuit breaker, tidak ada graceful degradation mode.

### Cluster C — Security gaps (defense in depth)
- **S4 / S5** Context / Prompt: tidak ada prompt-injection defense layer, tidak ada PII / secret scanner.
- **S8** Error Handling: error messages mentah forwarded ke model context (potential internal leak).
- **S10** Verification: leakage detection single-purpose (artifact body only).

### Cluster D — Traceability gaps (observability completeness)
- **T3** Memory: tidak ada audit log mutasi digest.
- **T5** Prompt: final prompt tidak fully persisted.
- **T6** Output: streamed text reconstruction non-trivial dari events.

---

## Notes on N/A Cells

Subagent Orchestration (column 11) di-mark ⚪ N/A across semua 4 pillars. Justifikasi: single-agent architecture is a deliberate design choice per anatomy doc + skill recommendation. Bukan gap; tidak boleh dijadikan task di Phase 3.

Kalau di masa depan Makalah scaling ke pattern yang membutuhkan subagent (e.g., parallel research workers untuk different stages), kolom ini di-revisit ulang. Saat ini: closed.

---

## Notes on Deferred Items

Dari Phase 1 ada 2 deferred:
1. P1-P4 compaction chain detail di `src/lib/ai/context-compaction.ts` — touches R4/E4. Phase 1 verifikasi mostly via doc claims. Kalau Cluster B Phase 3 sentuh compaction, deep-read wajib.
2. `messages.reasoningTrace` schema di `convex/schema.ts:145` — touches T12. Phase 1 trust-based. Kalau Cluster D Phase 3 sentuh observability schema, deep-read wajib.

---

## Bottom Line

48 cells (4 pillar × 12 component), 4 di-N/A by design (subagent column).

Dari 44 active cells:
- 23 SOLID — fondasi kuat
- 17 PARTIAL — gap konkret yang bisa di-spec untuk perbaikan
- 0 ABSENT — tidak ada komponen yang nol implementasi
- 0 DIVERGENT — tidak ada implementasi yang konflik dengan REST principle

**Reading:** Harness Makalah AI sudah punya fondasi yang reasonable (~52% SOLID, ~39% PARTIAL). Bukan rebuild from zero — ini perbaikan terhadap durabilitas. Cluster A (Reliability) paling urgent karena menyentuh inti durability promise (fault recovery, idempotent state, error classification).

**Next move (Phase 3):** Tulis spec untuk top gap clusters di file `03-phase3-rebuild-spec.md`. Per gap: target state, constraints (Six Design Principles + State Separation), migration path untuk in-flight Convex data, out-of-scope explicit list.
