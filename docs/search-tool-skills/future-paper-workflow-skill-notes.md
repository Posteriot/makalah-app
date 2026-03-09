# Catatan: System Notes yang Akan Diserap Paper Workflow Skill

## Konteks

Saat refactor search web skill (`web-search-quality`), ada system notes di `route.ts` yang **tidak bisa diserap** ke skill search karena domain-nya berbeda. Notes ini soal **kapan search boleh/nggak boleh jalan** — itu concern paper workflow, bukan search quality.

Notes ini kandidat untuk diserap ke **paper workflow skill** di masa depan.

## Notes yang Perlu Diserap

| Note | File Asal | Fungsi |
|------|-----------|--------|
| `PAPER_TOOLS_ONLY_NOTE` | `src/lib/ai/paper-search-helpers.ts` | Instruksi saat mode paper tanpa web search — beritahu Gemini bahwa tool search tidak tersedia, jangan janji cari referensi |
| `getResearchIncompleteNote(stage, requirement)` | `src/lib/ai/paper-search-helpers.ts` | Reminder kuat bahwa tahap tertentu belum lengkap, wajib search dulu sebelum lanjut |
| `getFunctionToolsModeNote(searchInfo)` | `src/lib/ai/paper-search-helpers.ts` | Info bahwa search sudah selesai, sekarang pakai function tools (createArtifact, updateStageData, dll) |

## Bagaimana Notes Ini Dipakai di route.ts

- `PAPER_TOOLS_ONLY_NOTE` → di-inject saat passive stage atau search disabled
- `getResearchIncompleteNote` → di-inject saat active stage tapi research belum lengkap
- `getFunctionToolsModeNote` → di-inject setelah search selesai, switch ke function tools mode

## Prinsip Pemisahan

- **`web-search-quality` skill**: bagaimana Gemini memproses dan menyajikan hasil search (evaluasi sumber via SKILL.md, narasi, integritas referensi)
- **Paper workflow skill (future)**: kapan search boleh/nggak boleh jalan, enforcement tahapan, mode switching

Dua concern ini independen — search quality nggak peduli apakah konteksnya paper atau chat, paper workflow nggak peduli bagaimana sumber dinilai.

## Catatan Arsitektur

Saat paper workflow skill dibuat nanti, ikuti prinsip yang sama:
- **Skill instructions di SKILL.md** (natural language) — bukan hardcoded strings di route.ts
- **Tools tetap simple** — mode switching adalah concern skill, bukan tool
- **Minimal code pipeline** — hindari deterministic enforcement yang membatasi LLM intelligence
- **LLM harus reasoning, bukan pipeline** — Anthropic's Programmatic Tool Calling research menunjukkan bahwa membiarkan LLM reasoning atas raw tool output jauh lebih efektif daripada pipeline step-by-step yang memproses data sebelum sampai ke LLM

### Peringatan untuk Paper Workflow Skill

System notes (`PAPER_TOOLS_ONLY_NOTE`, `getResearchIncompleteNote`, `getFunctionToolsModeNote`) saat ini adalah hardcoded strings yang di-inject ke prompt. Saat migrasi ke skill:
- Jangan buat pipeline deterministik yang memutuskan mode switching — biarkan LLM reasoning atas state
- Skill instructions cukup menjelaskan: "if research incomplete, search first; if search done, use function tools"
- Referensi: Anthropic Programmatic Tool Calling (`.references/programatic-tools-calling/`) — evidence bahwa LLM reasoning > hardcoded pipelines
