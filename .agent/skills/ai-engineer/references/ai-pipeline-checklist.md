# AI Pipeline Checklist

## Entry & Routing
- Identifikasi entry di `src/app/api/chat/route.ts`.
- Pastikan mode normal vs websearch dipisah sesuai constraint tool.
- Pastikan routing mempertimbangkan request user dan config.

## Model & Streaming
- Gunakan `streamText` dan `convertToModelMessages` sesuai pola repo.
- Pastikan response pakai `toUIMessageStreamResponse()`.
- Cek metadata streaming untuk citations.

## Data Flow
- Validasi mapping message (role/content) konsisten.
- Pastikan persistence ke Convex aman dan tidak kehilangan data.

## Paper Mode
- Cek integrasi paper tools dan stage-aware behavior.
- Pastikan update stage mengikuti aturan auto-stage.

## References wajib dibaca
- `.references/aisdk`
- `.references/ai-sdk-inline-citations`
- `.references/search-web`
- `.references/paper-workflow`
- `.references/tool-calling-per-stage`
