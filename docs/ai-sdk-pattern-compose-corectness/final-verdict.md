• Final Audit Verdict

  Branch: pr/chat-page-ux-status-sync-20260316
  Verified at: 2026-03-22, commit 42a24752
  Reference repo: https://github.com/akashp1712/ai-sdk-patterns

  Dokumen ini adalah versi final yang sudah dikoreksi dan diverifikasi terhadap
  codebase aktif di branch ini. Fokus utamanya adalah membedakan antara:

  - masalah correctness/contract parity yang memang perlu diperbaiki
  - pattern adoption dari ai-sdk-patterns yang sifatnya opsional atau future
    work
  - area yang sudah benar dan tidak perlu disentuh

  Kategori A: AI SDK Correctness & Contract Parity

  A1
  Issue: Reasoning persistence mismatch pada websearch compose
  Severity: High
  Status: Perlu diperbaiki

  Detail:

  - Websearch compose mengirim reasoning live ke UI via data-reasoning-thought
    di orchestrator executeWebSearch() → compose stream loop, reasoning-delta handler
  - Tapi saat assistant message dipersist, reasoningTrace dikirim undefined di
    route.ts executeWebSearch onFinish callback (saveAssistantMessage call)
  - Non-websearch path justru menyimpan snapshot reasoning ke DB via
    primaryReasoningTraceController → capturePrimaryReasoningSnapshot()
  - UI history memang mendukung rehydrate dari reasoningTrace persisted, jadi
    setelah reload reasoning websearch hilang, sementara mode lain tetap ada

  Implikasi:

  - UX tidak konsisten antara live stream dan history
  - Contract parity antara websearch dan non-websearch tidak terjaga

  A2
  Issue: Finish chunk di-swallow pada websearch compose
  Severity: Low
  Status: Perlu diperbaiki

  Detail:

  - Websearch orchestrator menahan chunk finish SDK dan tidak meneruskannya ke
    writer di orchestrator executeWebSearch() → compose stream loop, finish handler
    (ends with `continue` instead of `writer.write(chunk)`)
  - Non-websearch path meneruskan chunk finish
  - useChat tetap bisa selesai saat stream close, jadi ini bukan bug state
    machine fatal
  - Tapi finishReason dan finish metadata dari AI SDK hilang

  Implikasi:

  - Drift semantik terhadap kontrak AI SDK
  - Potensi masalah kompatibilitas atau observability di masa depan

  A3
  Issue: Websearch compose tidak punya failover model untuk streaming-phase
  failure
  Severity: Medium
  Status: Perlu diperbaiki

  Detail:

  - Websearch path langsung return await executeWebSearch(...) di route.ts
    enableWebSearch branch (sebelum primary try-catch fallback block)
  - Compose model utama dipanggil di dalam createUIMessageStream execute callback
    di orchestrator executeWebSearch() → streamText() call
  - Error yang terjadi setelah Response sudah committed tidak bisa masuk ke
    fallback catch luar di route
  - Gap utamanya ada pada failure saat compose streaming sudah dimulai

  Nuansa penting:

  - Error sebelum stream jalan masih bisa tertangkap
  - Jadi ini bukan “websearch failover rusak total”
  - Ini adalah gap parity khusus untuk streaming-phase failure

  ———

  Kategori B: Pattern Adoption dari ai-sdk-patterns

  B1
  Pattern: Native AI SDK approval primitives (tool-approval-request,
  addToolOutput)
  Relevansi: N/A untuk kebutuhan saat ini
  Status sebenarnya: Human-in-the-loop sudah ada via app-level flow

  Detail:

  - Codebase ini sudah punya full human-in-the-loop untuk paper validation:
      - tool submitStageForValidation di src/lib/ai/paper-tools.ts
        (createPaperTools → submitStageForValidation tool definition)
      - backend mutation submitForValidation di convex/paperSessions.ts
        sets stageStatus to "pending_validation" via ctx.db.patch()
      - UI panel muncul saat stageStatus === "pending_validation" di
        src/components/chat/ChatWindow.tsx (Footer render section)
      - panel approval/revision ada di src/components/paper/
        PaperValidationPanel.tsx (onApprove / onRevise handlers)

  Kesimpulan:

  - Paper validation bukan kekurangan human-in-the-loop
  - Yang belum diadopsi hanya primitive approval native AI SDK
  - Itu bukan kebutuhan mendesak, karena flow app-level saat ini justru lebih
    kaya

  B2
  Pattern: Evaluator-Optimizer loop
  Relevansi: Medium
  Status: Belum ada, relevan untuk future work

  Detail:

  - Bisa dipakai untuk quality gate setelah draft/artifact dihasilkan
  - Cocok untuk paper workflow, citation-heavy answer, atau output Refrasa
  - Butuh rubric evaluasi yang jelas dan bounded iteration

  B3
  Pattern: Streaming Object / object-first progressive render
  Relevansi: Low
  Status: Nice-to-have

  Detail:

  - Bisa dipakai untuk progressive structured UI seperti outline, matrix, atau
    reviewer summary
  - Saat ini repo sudah cukup kuat dengan Output.object() dan json-renderer
  - Jadi ini lebih ke enhancement UX, bukan kebutuhan correctness

  B4
  Pattern: Parallel retriever workflow
  Relevansi: Medium
  Status: Future exploration, bukan quick refactor

  Detail:

  - Retriever chain sekarang sequential by design:
      - priority-ordered
      - first-success wins
  - Parallel retriever bukan sekadar Promise.all
  - Ini akan mengubah:
      - cost model
      - merge policy
      - dedup logic
      - authority weighting
      - fallback semantics

  Kesimpulan:

  - Layak dieksplorasi
  - Tapi ini redesign arsitektur, bukan quick win

  ———

  Kategori C: Yang Sudah Benar

  C1
  Area: useChat + DefaultChatTransport
  Status: Valid, AI SDK v6 compliant

  C2
  Area: sendMessage dipakai langsung
  Status: Valid, AI SDK v6 compliant

  C3
  Area: status dipakai sebagai state utama, bukan isLoading
  Status: Valid, AI SDK v6 compliant

  C4
  Area: createUIMessageStreamResponse / UI message streaming
  Status: Valid, AI SDK v6 compliant

  C5
  Area: convertToModelMessages async usage
  Status: Valid, AI SDK v6 compliant

  C6
  Area: stopWhen: stepCountIs(...)
  Status: Valid, AI SDK v6 compliant

  C7
  Area: tool() + inputSchema
  Status: Valid, AI SDK v6 compliant

  C8
  Area: Output.object() sebagai structured output path
  Status: Valid, sudah migrated

  C9
  Area: Iterasi message.parts untuk UI rendering
  Status: Valid, AI SDK v6 compliant

  C10
  Area: Generative UI via json-renderer
  Status: Valid, sudah ada dan lebih advanced dari pattern dasar repo referensi

  C11
  Area: Structured intent router untuk search/paper actions
  Status: Valid, sudah ada
  Catatan:

  - Ini bukan routing-agent multi-specialist ala repo referensi
  - Ini lebih tepat disebut multi-intent classifier untuk kebutuhan produk
    Makalah

  C12
  Area: Two-phase search-compose orchestrator
  Status: Valid, sudah ada

  ———

  Prioritas Implementasi

  P0
  Item: A1 — Reasoning persistence parity
  Rationale:

  - Berdampak ke setiap websearch request
  - UX gap nyata
  - Fix paling langsung dan paling defensible

  P1
  Item: A2 — Forward finish chunk / preserve finish semantics
  Rationale:

  - Perubahan kecil
  - Rapikan contract parity dengan non-websearch path
  - Mencegah drift metadata SDK

  P2
  Item: A3 — Minimal compose failover di websearch orchestrator
  Rationale:

  - Gap nyata, tapi tidak sesering A1
  - Fokus pada pre-stream atau early compose failure
  - Jangan diasumsikan solve total semua mid-stream failure

  P3
  Item: B2 — Evaluator-Optimizer
  Rationale:

  - Relevan untuk quality gate
  - Butuh desain rubric yang matang

  P4
  Item: B4 — Parallel retriever exploration
  Rationale:

  - Ada potensi performance
  - Tapi ini redesign arsitektur, bukan refactor kecil

  P5
  Item: B3 — Streaming Object UX
  Rationale:

  - Prioritas paling rendah
  - Lebih ke polish

  ———

  Scope Catatan

  Kategori A (A1, A2, A3): In scope — correctness fixes untuk implementation plan.
  Kategori B (B1–B4): Informational only — tidak masuk implementation plan saat ini.
  Kategori C (C1–C12): Informational only — konfirmasi area yang sudah benar.

  ———

  Ringkasan Putusan

  Yang wajib dibetulkan terlebih dahulu:

  - A1

  Yang layak dibetulkan setelah itu:

  - A2
  - A3

  Yang bukan correctness issue, tapi opsi evolusi:

  - B2
  - B3
  - B4

  Yang tidak perlu dimasukkan sebagai masalah implementasi saat ini:

  - B1, karena human-in-the-loop untuk paper validation sudah ada via app-level
    flow dengan status pending_validation