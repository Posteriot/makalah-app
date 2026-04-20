# Harness Plan System — Test/Review/Audit Checklist

Checklist ini menggabungkan checklist E2E sebelumnya (A-G) dengan
monitoring baru untuk harness plan system (H-I). Gunakan saat E2E test
stage per stage.

---

## A. Tool Chain & Artifact Lifecycle

1. Tool ordering benar — artifact muncul SETELAH respons chat.
   Verify: `[F1-F6-TEST] ToolChainOrder { correct: true }`

2. Tidak ada tool call text leakage.
   Verify: `[PAPER][outcome-guard]` kalau ada correction, atau visual inspection.

## B. Unified Process UI

3. UnifiedProcessCard muncul di setiap respons assistant selama stage aktif.
   Verify: `[UNIFIED-PROCESS-UI]` di browser console.

4. Task source benar — model-driven (dari `_plan`) atau hardcoded fallback.
   Verify: `[UNIFIED-PROCESS-UI] source=model-driven` atau `source=hardcoded-fallback`

5. Task counter konsisten — progress counter match data.
   Verify: `[UNIFIED-PROCESS-UI] progress=N/N`

## C. Choice Card & Validation

6. Choice card muncul dengan button confirmation (bukan numbered list).
   Verify: `[F1-F6-TEST] ChoiceCardSpec { hasSubmitButton: true }`

7. Validation panel muncul setelah submitStageForValidation.
   Verify: `[F1-F6-TEST] submitStageForValidation { status: "pending_validation" }`

## D. Response Quality

8. Brief muncul — respons yang menyertai artifact berisi summary
   keputusan/angle (2-4 kalimat). Visual/content judgment.

## E. Search Policy Compliance

9. Active stages (gagasan, tinjauan_literatur) — search berjalan kalau
   diperlukan. Passive stages (semua lainnya) — search TIDAK berjalan
   kecuali user explicit minta.
   Verify: `[F1-F6-TEST] SearchDecision { stage, search, reason }`

## F. Architecture-Specific (test sekali, bukan per-stage)

10. Auto paper session — conversation baru langsung punya paper session.
    Verify: `[PAPER][session-resolve]` di request pertama, stage=gagasan.

11. Completed state — setelah stage 14 approved, model responds normal.
    Rewind via timeline ke stage mana aja works.

12. Stage transition — setiap approve menghasilkan stage transition.
    Verify: `[PAPER][stage-transition]` di Convex logs.

## G. Edit/Resend stageData Reset

13. Edit/resend on incomplete stage — stageData + _plan di-clear.

    Verify dari 3 sumber:
    - Terminal: `[PAPER][session-resolve] ... postEditResendReset=true`
    - Convex: `[PAPER][edit-resend-reset] stage=X cleared=[...,_plan,...]`
    - Browser: `[PAPER][edit-resend-reset] Client: stage=X cleared=N fields`

    Guard behavior:
    - HARUS reset: stageData ada tapi artifactId belum ada (stage incomplete)
    - NGGAK BOLEH reset: artifactId sudah ada (stage complete/revision)
    - NGGAK BOLEH reset: stage = "completed"
    - NGGAK BOLEH block edit/resend: kalau reset gagal, tetap jalan

## H. Harness Plan System — Plan Capture & Awareness

### H1. Plan Emission (per stage)

14. Model emit `plan-spec` fence di response pertama stage.
    Verify terminal: `[PLAN-CAPTURE] parsed stage=X tasks=N`
    Jika TIDAK muncul: `[PLAN-CAPTURE] no plan-spec detected (stage=X)`

15. Plan-spec YAML tidak muncul di chat user (stripped from visible text).
    Verify: visual inspection — nggak ada raw YAML `plan-spec` di bubble.

16. Plan di-persist ke stageData._plan.
    Verify terminal: `[PLAN-CAPTURE] persisted stage=X tasks=N`
    Verify Convex: `[PAPER][updatePlan] stage=X tasks=N`

### H2. Plan Context Injection (per stage)

17. Model menerima plan context di setiap turn.
    Verify terminal:
    - Turn pertama (no plan yet): `[PLAN-CONTEXT] stage=X injected=no-plan-yet`
    - Turn berikutnya (plan ada): `[PLAN-CONTEXT] stage=X injected=plan progress=N/M`

### H3. Plan Updates (per stage)

18. Model update plan status setiap response (full replace).
    Verify: `[PLAN-CAPTURE] parsed` muncul di SETIAP response model,
    bukan cuma response pertama. Tasks status berubah dari
    pending → in-progress → complete seiring model bekerja.

### H4. UI Rendering (per stage)

19. UnifiedProcessCard tampil tasks dari model's plan.
    Verify browser: `[UNIFIED-PROCESS-UI] source=model-driven`
    Visual: task labels sesuai apa yang model tentukan (bukan hardcoded
    "Cari referensi awal, Eksplorasi ide, Analisis feasibility, Tentukan angle").

20. SidebarQueueProgress juga tampil tasks dari model's plan.
    Verify: visual inspection sidebar — subtasks di stage aktif sesuai
    model's plan, bukan hardcoded list.

### H5. Hardcoded Fallback (test sekali)

21. Jika model nggak emit plan-spec, UI fallback ke hardcoded tasks.
    Verify browser: `[UNIFIED-PROCESS-UI] source=hardcoded-fallback`
    Test: edit/resend clears _plan → next render harus fallback sampai
    model emit plan baru.

## I. Validation Gate (per stage, saat finalize)

22. Validation gate PASS — required fields ada sebelum submit.
    Verify Convex: `[PAPER][submitForValidation] gate PASSED stage=X required=N fields`
    Lalu: `[PAPER][submitForValidation] stage=X ... → pending_validation`

23. Validation gate BLOCK — required fields kosong.
    Verify Convex: `[PAPER][submitForValidation] gate BLOCKED stage=X missing=[field1,field2]`
    Model harus recovery: call updateStageData, lalu retry submit.
    Test: Ini terjadi kalau model call updateStageData({}) kosong
    lalu langsung submit — gate harus block.

### Search Path Plan Capture (test sekali)

24. Plan capture works di search turn (gagasan/tinjauan_literatur).
    Verify: model emit plan-spec di response yang ada search →
    `[PLAN-CAPTURE] persisted (search path) stage=X tasks=N`
    Text stripped before save (no raw YAML di stored message).

---

## Frequency Table

| Item   | Frequency                                           |
|--------|-----------------------------------------------------|
| 1-9    | Per stage — verify di setiap stage 1-14             |
| 10     | Sekali — di stage 1 (first message)                 |
| 11     | Sekali — setelah stage 14 approved                  |
| 12     | Per stage — spot-check dari Convex logs             |
| 13     | Spot-check — test 1-2x saat edit/resend             |
| 14-20  | Per stage — verify di setiap stage 1-14             |
| 21     | Sekali — test fallback behavior                     |
| 22     | Per stage — saat finalize (submit)                  |
| 23     | Sekali — test gate block + recovery                 |
| 24     | Sekali — di stage gagasan atau tinjauan_literatur   |

## Log Reference (quick lookup)

### Terminal Next.js

| Log prefix                                | Meaning                            |
|-------------------------------------------|------------------------------------|
| `[PLAN-CONTEXT] injected=no-plan-yet`     | Model dapet instruksi "emit plan"  |
| `[PLAN-CONTEXT] injected=plan`            | Model dapet existing plan context  |
| `[PLAN-CAPTURE] parsed`                   | Plan-spec detected + parsed OK     |
| `[PLAN-CAPTURE] persisted`                | Plan saved to stageData._plan      |
| `[PLAN-CAPTURE] persisted (search path)`  | Plan saved via search path regex   |
| `[PLAN-CAPTURE] persisted (fallback)`     | Plan saved via fallback stream     |
| `[PLAN-CAPTURE] no plan-spec detected`    | Model didn't emit plan-spec        |
| `[PLAN-CAPTURE] validation failed`        | YAML OK but schema mismatch        |
| `[PLAN-CAPTURE] YAML parse error`         | Malformed YAML                     |

### Terminal Convex

| Log prefix                                        | Meaning                     |
|---------------------------------------------------|-----------------------------|
| `[PAPER][updatePlan] stage=X tasks=N`             | Plan mutation success       |
| `[PAPER][updatePlan] stage mismatch`              | Plan stage != current stage |
| `[PAPER][submitForValidation] gate PASSED`        | Required fields present     |
| `[PAPER][submitForValidation] gate BLOCKED`       | Required fields missing     |

### Browser Console

| Log prefix                                        | Meaning                         |
|---------------------------------------------------|---------------------------------|
| `[UNIFIED-PROCESS-UI] source=model-driven`        | UI renders from model's _plan   |
| `[UNIFIED-PROCESS-UI] source=hardcoded-fallback`  | UI renders from STAGE_TASKS     |
