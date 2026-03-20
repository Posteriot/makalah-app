# Handoff: Post Json Renderer V3 — Anomali yang Harus Diselesaikan

## Branch & Worktree

- Branch: `pr/chat-page-ux-status-sync-20260316`
- Worktree: `.worktrees/chat-page-ux-design-enforcement`
- HEAD saat handoff: `c3ebda7e`

## Status Json Renderer V3

Json renderer v3 (YAML text-based) selesai dan working. Model menulis YAML spec sebagai teks di code fence `yaml-spec`, `pipeYamlRender()` intercept dari stream, frontend render card. Submit flow, rehydration, recommendation badge — semua working.

Arsitektur documented di:
- Design doc: `docs/chat-page-ux-design-enforcement/json-renderer-ui-yaml/2026-03-19-yaml-visual-language-design.md`
- Temuan arsitektural: `docs/chat-page-ux-design-enforcement/json-renderer-ui-yaml/2026-03-19-temuan-arsitektural-tool-vs-yaml.md`
- Implementation plan: `docs/chat-page-ux-design-enforcement/json-renderer-ui-yaml/2026-03-19-yaml-visual-language-impl-plan.md`

## Anomali yang Ditemukan dari Test Manual

### Anomali 1: Web Search Compose Menghasilkan 83K Chars, 4.2 Menit, 0 Citations

**Fakta dari log:**
```
[Orchestrator] success: google-grounding, citations=0, text=83810chars
POST /api/chat 200 in 4.2min (compile: 14ms, proxy.ts: 9ms, render: 4.2min)
```

**Di mana terjadi:**
- Turn 2: user kasih topik paper → `searchRequired=true` → Google Grounding
- `src/lib/ai/web-search/orchestrator.ts` — compose step `streamText()` menghasilkan 83K chars
- `citations=0` — Google Grounding return 0 citations tapi model generate teks sangat panjang

**Perbandingan dengan turn normal:**
- Turn 3 (choice submit): `citations=20, text=5642chars` → 54s — normal
- Turn 7 (topik search): `citations=20, text=8730chars` → 42s — normal
- Turn 8 (topik search): `citations=0, text=5337chars` → 27.6s — normal

**Pola:** Anomali terjadi saat `citations=0` DAN turn pertama kali search (turn 2). Turn berikutnya dengan `citations=0` (turn 8) tidak anomali. Kemungkinan terkait dengan volume search results yang di-pass ke compose step.

**File terkait:**
- `src/lib/ai/web-search/orchestrator.ts` — compose `streamText()` call (line ~227)
- `src/lib/ai/web-search/orchestrator.ts` — `buildSearchResultsContext()` yang format search results ke compose messages
- `src/app/api/chat/route.ts` — `executeWebSearch()` call (line ~2117)

### Anomali 2: 33 Detik untuk Turn Tanpa Search ("silakan")

**Fakta dari log:**
```
normalizedLastUserContent: 'silakan'
[SearchExecution] mode=off, searchRequired=false
POST /api/chat 200 in 33.2s
```

**Di mana terjadi:**
- Turn 5: user bilang "silakan" setelah model minta konfirmasi untuk save
- Nggak ada web search, nggak ada YAML capture
- Model kemungkinan call `updateStageData` + `createArtifact` + `submitStageForValidation` dalam satu turn

**File terkait:**
- `src/app/api/chat/route.ts` — primary `streamText()` call
- `src/lib/ai/paper-tools.ts` — tool execute functions yang dipanggil model

### Anomali 3: Frequent Convex Token Refresh (16+ Requests)

**Fakta dari log:**
```
GET /api/auth/convex/token 200 — 16+ kali dalam satu session
Response times: 390ms - 1504ms per request
```

**Di mana terjadi:**
- Sepanjang session, terutama clustering setelah response panjang (4.2min turn)
- `src/app/api/auth/convex/token/route.ts` — endpoint yang di-hit

**Catatan:** Mungkin normal behavior untuk Convex real-time subscriptions yang refresh token periodically. Perlu diverifikasi apakah frekuensi ini expected.

## Known Issues dari Memory

File: `.claude/projects/-Users-eriksupit-Desktop-makalahapp/memory/project-json-renderer-remaining-issues.md`

Berisi 3 remaining issues:
1. Web search compose excessive text (anomali 1 di atas)
2. Model hanya nulis YAML di web search compose turns, bukan di normal turns
3. Admin panel stage skill version management UX

## DB Skills Status

14 DB skills sudah di-update dengan `emitChoiceCard` di Function Tools dan `## Visual Language` section. Upload via script Python ke Convex dev deployment. File reference: `.references/system-prompt-skills-active/01-gagasan-skill.md` sampai `14-judul-skill.md`.

Catatan: DB skills masih reference `emitChoiceCard` tool yang sudah nggak ada (diganti YAML). Ini nggak harmful karena model nggak bisa call tool yang nggak registered, tapi secara akurasi perlu di-update ke reference YAML approach.
