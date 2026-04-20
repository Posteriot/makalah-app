Temuan Kunci

  Bug 1: Infinite Retry — Root Cause Sebenarnya

  Gue salah blame Gemini. Buktinya:

  ┌─────────────────────┬───────────────────────────────────────────┬───────────┐
  │        Stage        │              Enforcer Chain               │   Hasil   │
  ├─────────────────────┼───────────────────────────────────────────┼───────────┤
  │ Stage 1 (gagasan)   │ [0:updateStageData, 1:createArtifact,     │ 1x call,  │
  │                     │ 2:submitStageForValidation]               │ sukses    │
  ├─────────────────────┼───────────────────────────────────────────┼───────────┤
  │ Stage 3 (outline)   │ [0:updateStageData, 1:createArtifact,     │ 1x call,  │
  │                     │ 2:submitStageForValidation]               │ sukses    │
  ├─────────────────────┼───────────────────────────────────────────┼───────────┤
  │ Stage 5             │ Same pattern                              │ Sukses    │
  ├─────────────────────┼───────────────────────────────────────────┼───────────┤
  │ Stage 12            │ [0:updateStageData ×4, 1:createArtifact,  │ 4x call,  │
  │ (daftar_pustaka)    │ 2:submit]                                 │ bug       │
  └─────────────────────┴───────────────────────────────────────────┴───────────┘

  ~~Enforcer works di mayoritas stages. Stage 12 gagal karena masalah spesifik
  compile_then_finalize workflow — enforcer nggak handle compileDaftarPustaka step
  sebelum updateStageData. Fix commit 37b7fa66 udah masuk 5 menit setelah test.~~

  ~~Status: Trigger utama udah di-fix. Tapi vulnerability tetap ada — kalau model
  pernah generate parallel calls (bahkan 2x), OCC cascade bisa terjadi lagi. Perlu
  defensive guard: kalau updateStageData dipanggil dengan dataKeys: [], skip
  mutation — jangan write ke DB dengan data kosong.~~

  > **AUDIT CORRECTION (2026-04-15 — Convex log evidence)**
  >
  > Analisis awal SALAH. Claim "Stage 1 (gagasan) sukses" kontradiksi dengan
  > Convex log live yang menunjukkan **`updateStageData stage=gagasan keys=[]`**
  > flooding dengan OCC cascade aktif (puluhan entry, semua `keys=[]`, semua
  > OCC error pada document ID `k570eyn...`).
  >
  > **Root cause bukan `compile_then_finalize` spesifik stage 12.** Root cause
  > adalah enforcer mengirim `updateStageData` dengan data kosong (`keys=[]`)
  > di stage manapun. Commit 37b7fa66 hanya fix 1 trigger (stage 12), bukan
  > root cause.
  >
  > **Actual root cause**: Enforcer forces `updateStageData` tool call, tapi
  > model nggak selalu provide data content → mutation diterima dengan
  > `keys=[]` → write kosong ke DB → concurrent empty writes → OCC cascade.
  >
  > **Fix yang benar**: Defensive guard di `paper-tools.ts:139` —
  > `updateStageData` execute handler HARUS reject kalau
  > `Object.keys(data).length === 0`. Ini bukan "nice to have" — ini **fix
  > utama**. Skip mutation, return early dengan informative error.
  >
  > **Severity upgrade**: Critical → **P0 Blocker**. Bug ini flooding Convex
  > logs sehingga semua observability lain (termasuk `[PLAN-CAPTURE]` yang
  > dibutuhkan untuk verify Bug 4) nggak bisa diakses.

  Bug 2: Enforcer Nggak Cek Plan Completion

  Sekarang flow-nya:
  finalize_stage → enforcer activate → force updateStageData → force createArtifact
  → PLAN-GATE block

  Plan gate ada di dalam createArtifact execute (route.ts:1644-1662). Enforcer
  activate tanpa cek plan progress. Artinya chain udah jalan 1-2 step sebelum
  ketauan plan incomplete.

  Fix: Early exit di enforcer — kalau _plan ada incomplete tasks DAN action adalah
  finalize_stage, jangan activate enforcer. Downgrade ke continue_discussion
  behavior. Ini bukan double-gate — ini fail-fast yang prevent unnecessary chain.

  > **AUDIT**: Confirmed. `route.ts:2380-2384` — `shouldEnforceArtifactChain`
  > derived dari `resolvedWorkflow?.action !== "continue_discussion"`, zero check
  > `_plan`. Plan data accessible via `paperSession?.stageData?.[stage]?._plan`
  > sebelum enforcer runs. Fix direction valid.

  Bug 3: Tools Path Missing composedText Fallback

  Confirmed: Search path punya fallback extraction pakai UNFENCED_PLAN_REGEX di
  orchestrator.ts:974-991. Tools path nggak punya — cuma log "no plan-spec detected"
   tanpa attempt recovery.

  Kabar baik: rawText (full response text dari semua steps) available di onFinish
  handler (route.ts:3028). Variabel ini bisa dipakai untuk regex fallback
  extraction, sama kayak search path pakai composedText.

  > **AUDIT GAP (compile blocker)**: `route.ts:53` cuma import
  > `PLAN_DATA_PART_TYPE` dan `type PlanSpec` dari `plan-spec`. Fix ini butuh
  > tambahan import `UNFENCED_PLAN_REGEX` dan `planSpecSchema` dari
  > `@/lib/ai/harness/plan-spec`. Tanpa update import, fix bakal gagal compile.

  Bug 4: Plan Progress Stale

  Caused by Bug 3. Nggak ada auto-update mechanism — kalau plan-spec nggak captured,
   _plan di DB tetap stale. Kalau Bug 3 di-fix (fallback extraction), plan harusnya
  update setiap turn.

  Nggak ada mekanisme untuk auto-mark task complete berdasarkan tool calls (misalnya
   updateStageData({ideKasar: "..."}) → otomatis mark "Diskusikan ide" complete).
  Ini by design — model yang manage plan-nya. Tapi kalau capture-nya reliable (Bug 3
   fixed), ini nggak masalah.

  > **AUDIT GAP (conditional resolution)**: Analisis ini assume model emit plan
  > YAML di tools-path turns (cuma nggak ke-capture oleh stream transformer).
  > Tapi handoff sendiri flag kemungkinan lain: "model simply doesn't emit plan
  > in non-search turns." Kalau model memang nggak emit plan-spec sama sekali di
  > tools-path, fix Bug 3 (fallback extraction di rawText) nggak akan match
  > apa-apa — Bug 4 tetap stale. **Harus di-verify empiris** setelah Bug 3
  > fixed: check apakah `rawText` di tools-path turn mengandung plan YAML.
  >
  > **AUDIT BLOCKED (2026-04-15)**: Verifikasi empiris via Convex logs GAGAL —
  > Bug 1 OCC cascade flooding seluruh log stream. `[PLAN-CAPTURE]` entries
  > nggak bisa diakses. Verify Bug 4 assumption harus dilakukan SETELAH Bug 1
  > defensive guard deployed.

  ---
  ~~Dependency Chain (Final)~~

  ~~Bug 3 (tools path no fallback) ─── fix ini ───→ Bug 4 resolves (plan updates
  captured)~~
  ~~                                                      │~~
  ~~Bug 2 (enforcer no early exit) ─── fix ini ───→ prevents unnecessary chain trigger~~
  ~~                                                      │~~
  ~~Bug 1 (OCC cascade) ──── partially fixed (compile_then_finalize)~~
  ~~                    ──── defensive guard: skip empty updateStageData~~

  ~~Fix order: Bug 3 → Bug 2 → Bug 1 defensive guard. Bug 4 resolves otomatis dari
  Bug 3.~~

  > **REVISED Dependency Chain (2026-04-15 — post log evidence)**
  >
  > ```
  > Bug 1 (empty updateStageData guard)     ◄── P0 BLOCKER, fix FIRST
  >   │  paper-tools.ts:139 — reject keys=[]
  >   │  Unblocks: observability, log access, semua debugging lain
  >   │
  >   ├──→ Bug 4 verify (check [PLAN-CAPTURE] hasUnfenced= di logs)
  >   │      │
  >   │      ├─ hasUnfenced=true  → Bug 3 fix will work → Bug 4 resolves
  >   │      └─ hasUnfenced=false → Bug 3 fix insufficient → perlu alt solution
  >   │
  >   ├──→ Bug 3 (tools path fallback) — implement setelah Bug 4 verified
  >   │      route.ts: add UNFENCED_PLAN_REGEX + planSpecSchema import
  >   │      add fallback extraction on rawText in onFinish
  >   │
  >   └──→ Bug 2 (enforcer plan check) — independent, bisa parallel
  >          route.ts:2380 — add _plan completion check before enforcer
  > ```
  >
  > **Fix order: Bug 1 → verify Bug 4 assumption dari logs → Bug 3 + Bug 2
  > (parallel).**
