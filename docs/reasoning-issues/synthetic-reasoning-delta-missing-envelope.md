# Synthetic reasoning-delta Missing reasoning-start/reasoning-end Envelope

## Masalah

`pipeThinkTagStrip` (src/lib/ai/harness/pipe-think-tag-strip.ts) mengubah `<think>...</think>` content di text-delta chunks menjadi reasoning-delta chunks. Chunks reasoning-delta yang diemit TIDAK memiliki `reasoning-start` dan `reasoning-end` envelope di sekelilingnya.

Pipeline selanjutnya (`pipeUITextCoalesce` di create-readable-text-transform.ts) menggunakan `reasoning-start`/`reasoning-end` sebagai forced full-flush boundaries (line 225-226). Tanpa boundary tersebut, synthetic reasoning-delta dari pipeThinkTagStrip masuk ke coalesce buffer dan di-handle oleh type-change detection (`c.type !== bufferType` check di line 251) yang men-trigger premature flush pada text-delta buffer yang sedang di-batch.

## Dampak

- Bukan crash
- Bukan data loss (reasoning-delta yang synthetic di-discard oleh writer loop di build-step-stream.ts line 752 dengan `continue`)
- Text rendering di chat bisa "hiccup" (kata terpotong tidak smooth) saat model output `<think>` tag di tengah prose, karena coalesce buffer di-flush premature

## Kondisi Trigger

Model harus output `<think>` tag di TENGAH prose text (bukan di awal turn). Ini terjadi saat:
- Gemini fallback provider output reasoning sebagai `<think>` tag
- Tag muncul setelah model sudah mulai output text biasa
- Contoh: `"Tinjauan Literatur\n<think>\nReflecting on..."` — text "Tinjauan Literatur" sudah di-coalesce, lalu `<think>` memicu type change yang flush premature

## File Terkait

- `src/lib/ai/harness/pipe-think-tag-strip.ts` — emitReasoning() (line 48-56) emit bare reasoning-delta tanpa envelope
- `src/lib/chat-harness/executor/build-step-stream.ts` — writer loop (line 746-757) discard synthetic reasoning-delta
- `src/lib/chat-harness/executor/create-readable-text-transform.ts` — pipeUITextCoalesce, reasoning-start/end boundary handling (line 225-226), type-change flush (line 251)

## Severity

Low. Cosmetic rendering hiccup saat edge case trigger. Ditemukan saat PR review di sesi 2026-04-20.
