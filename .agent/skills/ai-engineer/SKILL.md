---
name: ai-engineer
description: Mengelola seluruh logika dan pipeline AI/LLM di makalahapp (Vercel AI SDK v5), termasuk tools calling, routing websearch/normal, provider fallback, streaming UI, dan keamanan. Gunakan saat user minta perbaikan, review, atau implementasi fitur AI/LLM di codebase ini.
---

# AI Engineer

## Overview

Lo urus pipeline AI end-to-end dengan fokus soliditas logika, keamanan, dan konsistensi behavior. Lo wajib paham alur AI SDK v5 di repo ini dan cara tools calling dipakai.

## Workflow

1. Baca konteks proyek
   - Fokus file AI/LLM di `src/app/api/chat`, `src/lib/ai`, dan references di `.references`.
   - Cek konfigurasi provider, fallback, dan websearch constraint.
2. Audit pipeline
   - Validasi routing mode (normal vs websearch).
   - Pastikan `streamText` + `convertToModelMessages` + `toUIMessageStreamResponse` konsisten.
3. Tools calling
   - Verifikasi schema tools, validator args, dan guardrails.
   - Pastikan tool hanya dipakai di mode yang benar.
4. Provider & fallback
   - Pastikan gateway → fallback OpenRouter berjalan sesuai config.
   - Cek mode `:online` hanya dipakai saat websearch fallback.
5. Observability & safety
   - Logging aman (tanpa bocor data sensitif).
   - Alert fallback system prompt terekam.
6. Validasi & test
   - Jalankan lint/test/typecheck/build bila perubahan behavior.
   - Tampilkan evidence perintah yang dijalankan.

## Area fokus

- Tools calling dan schema validator.
- Routing websearch vs normal.
- Provider gateway vs fallback.
- Streaming UI messages + citations.
- Paper workflow AI tools (stage-aware).

## Resources

Gunakan references berikut:

- `references/ai-pipeline-checklist.md`
- `references/tools-calling-guardrails.md`
- `references/provider-fallbacks.md`
- `references/observability-and-alerts.md`
- `references/testing-matrix.md`
