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
