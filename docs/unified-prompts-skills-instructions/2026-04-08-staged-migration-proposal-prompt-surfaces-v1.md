# Proposal Migrasi Bertahap Prompt Surface

## Tujuan

Dokumen ini menurunkan matriks klasifikasi prompt surface menjadi proposal migrasi yang langsung bisa dipakai untuk implementasi.

Status yang dipakai:

- `move now`
- `keep local`
- `keep in DB`
- `wrap with adapter`

## Aturan Baca

- `move now` berarti surface itu bisa dipindah ke `src/agent/` sekarang tanpa mengubah ownership dasarnya.
- `keep local` berarti surface itu sebaiknya tetap tinggal dekat feature atau domain sekarang.
- `keep in DB` berarti source of truth harus tetap database-managed.
- `wrap with adapter` berarti source of truth tidak dipindah, tetapi aksesnya perlu dibungkus lewat layer `src/agent/` agar arsitektur composition tetap unified.

## Rekomendasi Tunggal

Rekomendasi terbaik adalah:

**jalankan migrasi dalam dua rel paralel: segera pindahkan prompt assets code-owned yang agentic ke `src/agent/`, dan pada saat yang sama bungkus surface DB-managed lewat adapter tipis tanpa memindahkan source of truth-nya.**

Ini yang terbaik karena:

1. hasilnya langsung actionable,
2. risiko behavioral regression rendah,
3. tidak merusak admin operations,
4. `src/agent/` cepat menjadi pusat organisasi nyata, bukan folder kosong.

## Proposal Per Item

| surface | current path | status | target path | reason | migration phase |
| --- | --- | --- | --- | --- | --- |
| Global active system prompt | `convex/systemPrompts.ts`, `src/lib/ai/chat-config.ts` | `wrap with adapter` | `src/agent/adapters/system-prompts.ts` | Source of truth harus tetap di DB, tetapi consumer runtime perlu akses lewat adapter agent agar composition tidak tersebar. | Phase 2 |
| Global fallback system prompt | `src/lib/ai/chat-config.ts` | `move now` | `src/agent/prompts/global/fallback-system-prompt.ts` | Ini prompt asset code-owned dan reusable. Tidak tergantung lifecycle admin. | Phase 1 |
| Paper mode system prompt builder | `src/lib/ai/paper-mode-prompt.ts` | `move now` | `src/agent/compose/build-paper-mode-message-stack.ts` | Ini composer inti untuk paper mode dan paling tepat tinggal di composition layer. | Phase 3 |
| Active stage skill content | `convex/stageSkills.ts`, `convex/schema.ts`, `src/lib/ai/stage-skill-resolver.ts` | `wrap with adapter` | `src/agent/adapters/stage-skills.ts` | Stage skill aktif tetap DB-managed, tetapi resolver runtime perlu dibungkus agar route/orchestrator tidak tahu detail storage. | Phase 2 |
| Fallback stage instructions | `src/lib/ai/paper-stages/index.ts` dan submodule `src/lib/ai/paper-stages/` | `move now` | `src/agent/prompts/paper-stage-fallbacks/` | Ini fallback prompt set code-owned, cocok dipusatkan sekarang. | Phase 1 |
| Paper workflow reminder | `src/lib/ai/paper-workflow-reminder.ts` | `move now` | `src/agent/prompts/global/paper-workflow-reminder.ts` | Reusable dan agentic. Tidak ada alasan tetap tercecer. | Phase 1 |
| Search mode router prompt | `src/app/api/chat/route.ts` | `move now` | `src/agent/prompts/router/search-mode-router-prompt.ts` | Prompt inline di route adalah debt utama dan bisa diekstrak tanpa mengubah flow. | Phase 2 |
| Search retriever system prompt | `src/lib/ai/search-system-prompt.ts` | `move now` | `src/agent/prompts/search/retriever-system-prompt.ts` | Ini prompt asset search yang jelas reusable. | Phase 1 |
| Search user-message augmentation hints | `src/lib/ai/search-system-prompt.ts` | `move now` | `src/agent/prompts/search/retriever-user-augmentation.ts` | Masih satu kontrak dengan retriever prompt dan idealnya hidup berdampingan. | Phase 1 |
| Search compose phase directive | `src/lib/ai/web-search/orchestrator.ts` | `move now` | `src/agent/prompts/search/compose-phase-directive.ts` | Directive ini membentuk perilaku compose phase, bukan business logic murni. | Phase 1 |
| Search results context guidance | `src/lib/ai/search-results-context.ts` | `move now` | `src/agent/prompts/search/search-results-context-prompt.ts` | Output modul ini langsung jadi instruction-bearing context. | Phase 1 |
| Web search quality skill | `src/lib/ai/skills/web-search-quality/SKILL.md`, `src/lib/ai/skills/web-search-quality/index.ts` | `move now` | `src/agent/skills/search/web-search-quality/` | Ini sudah skill file-based. Re-homing ke namespace agent sangat natural. | Phase 1 |
| Choice card YAML system prompt | `src/lib/json-render/choice-yaml-prompt.ts` | `move now` | `src/agent/prompts/ui/choice-card-system-prompt.ts` | Ini UI contract untuk model dan reusable. | Phase 1 |
| Choice interaction context note builder | `src/lib/chat/choice-request.ts` | `move now` | `src/agent/prompts/runtime-notes/choice-context-notes.ts` | Builder ini menghasilkan runtime note aktif, bukan helper biasa. | Phase 2 |
| Attachment first-response instruction | `src/app/api/chat/route.ts` | `move now` | `src/agent/prompts/runtime-notes/attachment-notes.ts` | Sekarang inline di route dan sebaiknya diekstrak. | Phase 2 |
| Exact source inspection rules | `src/lib/ai/exact-source-guardrails.ts` | `move now` | `src/agent/prompts/runtime-notes/exact-source-inspection-rules.ts` | Ini guardrail prompt aktif yang membentuk perilaku agent. | Phase 1 |
| Source provenance rules | `src/lib/ai/exact-source-guardrails.ts` | `move now` | `src/agent/prompts/runtime-notes/source-provenance-rules.ts` | Masuk satu keluarga dengan exact-source rules dan harus satu taxonomy. | Phase 1 |
| Paper workflow tool descriptions | `src/lib/ai/paper-tools.ts` | `move now` | `src/agent/prompts/tools/paper-tool-descriptions.ts` | Tool descriptions di sini instruction-heavy dan layak diekstrak sekarang. | Phase 4 |
| Chat route inline tool descriptions | `src/app/api/chat/route.ts` | `move now` | `src/agent/prompts/tools/chat-tool-descriptions.ts` | Ini masih prompt inline dalam route. Secara organisasi harus dipisah. | Phase 4 |
| Compaction summarization prompts | `src/lib/ai/compaction-prompts.ts`, digunakan dari `src/lib/ai/context-compaction.ts` | `move now` | `src/agent/prompts/compaction/compaction-prompts.ts` | Ini bagian dari agent-support stack, bukan utility feature-local. | Phase 1 |
| Refrasa system prompt assets | `src/lib/refrasa/prompt-builder.ts` | `move now` | `src/agent/prompts/features/refrasa-system-prompt.ts` | Prompt asset-nya agentic/reusable dalam subdomain Refrasa, meski builder domain boleh tetap lokal. | Phase 4 |
| Active style constitution for Refrasa | `convex/styleConstitutions.ts`, `src/app/api/refrasa/route.ts` | `wrap with adapter` | `src/agent/adapters/style-constitutions.ts` | Source of truth tetap DB-managed, tapi akses runtime sebaiknya mengikuti adapter pattern yang sama. | Phase 4 |
| Title generation prompt | `src/lib/ai/title-generator.ts` | `keep local` | `src/lib/ai/title-generator.ts` | Ini utility prompt satu-fungsi dan bukan bagian dari message stack agent utama. | No migration |
| OCR image extraction instruction | `src/lib/file-extraction/image-ocr.ts` | `keep local` | `src/lib/file-extraction/image-ocr.ts` | Prompt OCR milik subsystem extraction, bukan prompt architecture agent. | No migration |
| Admin provider validation prompt | `src/app/api/admin/validate-provider/route.ts` | `keep local` | `src/app/api/admin/validate-provider/prompts.ts` jika perlu ekstraksi lokal | Ini prompt teknis untuk verifikasi koneksi provider, bukan runtime contract utama agent. | Optional cleanup |
| Admin model compatibility verification prompts | `src/app/api/admin/verify-model-compatibility/route.ts` | `keep local` | `src/app/api/admin/verify-model-compatibility/prompts.ts` jika perlu ekstraksi lokal | Ini suite test/verification prompt, bukan prompt surface agent utama. | Optional cleanup |
| Completed-session fallback closing copy | `src/lib/ai/completed-session.ts`, instruksi terkait di `src/lib/ai/paper-stages/index.ts` | `keep local` | `src/lib/ai/completed-session.ts` | Ini lebih dekat ke response template/domain copy daripada prompt registry inti. | No migration |
| Exact-source followup heuristics | `src/lib/ai/exact-source-followup.ts` | `keep local` | `src/lib/ai/exact-source-followup.ts` | Ini bukan prompt surface, melainkan resolver heuristik. | No migration |
| Attachment health classifier | `src/lib/chat/attachment-health.ts` | `keep local` | `src/lib/chat/attachment-health.ts` | Ini classifier runtime, bukan instruction text untuk model. | No migration |
| System prompt seed template | `convex/migrations/seedDefaultSystemPrompt.ts` | `keep in DB` | Keep in migrations | Ini artefak bootstrap untuk database dan harus tetap merekam histori ops. | No migration |
| System prompt deployment/update templates | `convex/migrations/createContractAlignedSystemPrompt.ts`, `convex/migrations/deployProductionSystemPrompt.ts`, `convex/migrations/updatePromptWithPaperWorkflow.ts`, `convex/migrations/updatePromptWithArtifactGuidelines.ts`, `convex/migrations/updatePromptWithArtifactSources.ts`, `convex/migrations/updateSystemPromptTo14Stages.ts`, `convex/migrations/removeOldPaperWorkflowSection.ts`, `convex/migrations/fixAgentPersonaAndCapabilities.ts`, `convex/migrations/fix13TahapReference.ts` | `keep in DB` | Keep in migrations | Ini histori deployment prompt DB. Tidak boleh diperlakukan sebagai prompt registry runtime. | No migration |
| Stage skill migration templates | `convex/migrations/fixWebSearchInstructions.ts`, `convex/migrations/updateStageSkillToolPolicy.ts`, `convex/migrations/wipeAndReseedStageSkills.ts`, `convex/migrations/seedPembaruanAbstrakSkill.ts` | `keep in DB` | Keep in migrations | Ini histori dan tooling operasi stage skills, bukan runtime asset. | No migration |

## Paket Kerja Bertahap

### Phase 1: Relokasi Asset yang Aman

Target:

- bentuk `src/agent/prompts/`
- bentuk `src/agent/skills/`
- pindahkan asset code-owned yang paling jelas

Item:

- global fallback system prompt
- fallback stage instructions
- paper workflow reminder
- search retriever prompt
- search augmentation hints
- search compose directive
- search results context guidance
- web search quality skill
- choice card YAML prompt
- exact-source rules
- source provenance rules
- compaction prompts

Output minimum:

- import graph masih kompatibel,
- tidak ada perubahan perilaku runtime,
- `src/agent/` mulai berisi asset nyata.

### Phase 2: Adapter untuk DB-Managed Content dan Inline Route Prompts

Target:

- sembunyikan akses storage DB di belakang adapter
- kurangi prompt inline di `chat/route.ts`

Item:

- adapter global system prompt
- adapter stage skills
- search router prompt
- attachment first-response instruction
- choice context note builder

Output minimum:

- route tidak lagi tahu detail fetch prompt DB,
- prompt besar yang inline mulai hilang dari route.

### Phase 3: Centralize Composition

Target:

- pindahkan assembly message stack ke `src/agent/compose/`

Item:

- paper mode system prompt builder
- `buildChatSystemMessages()`
- `buildPaperModeMessageStack()`
- builder compose untuk search bila perlu

Output minimum:

- route/orchestrator fokus ke flow control,
- composition logic bisa dites terpisah.

### Phase 4: Tool Contracts dan Feature Prompt Subdomains

Target:

- rapikan tool description contracts
- rapikan prompt subdomain seperti Refrasa
- tambah adapter DB untuk subdomain khusus

Item:

- paper workflow tool descriptions
- chat route inline tool descriptions
- Refrasa prompt assets
- adapter style constitutions

Output minimum:

- tool descriptions tidak lagi tersebar,
- feature-specific prompt stack tetap ikut taxonomy yang sama.

## Struktur Eksekusi yang Disarankan

Urutan implementasi terbaik:

1. buat folder dan registry minimal di `src/agent/`
2. pindahkan semua item `move now` Phase 1
3. tambah adapter untuk item `wrap with adapter`
4. ekstrak inline prompt dari route
5. baru centralize composition builder
6. terakhir rapikan tool descriptions dan feature-specific prompt subdomains

## Aturan Implementasi

- Jangan ubah source of truth untuk item `keep in DB`.
- Jangan paksa item `keep local` masuk `src/agent/`.
- Untuk item `wrap with adapter`, adapter harus tipis dan tidak membuat source of truth baru.
- Untuk item `move now`, pindahkan asset instruksinya dulu, baru rapikan caller setelah import stabil.
- Setiap migrasi harus mempertahankan bahasa instruction tetap English sesuai policy repo.

## Definisi Selesai per Status

### `move now`

Selesai jika:

- file sudah pindah ke namespace `src/agent/`,
- semua caller sudah import dari lokasi baru,
- behavior runtime tetap sama.

### `wrap with adapter`

Selesai jika:

- source of truth tetap di DB,
- caller runtime mengakses lewat adapter `src/agent/`,
- tidak ada duplikasi state atau fallback liar di route.

### `keep local`

Selesai jika:

- item tetap di domain lokal,
- tidak dimasukkan ke `src/agent/`,
- keberadaannya tetap terdokumentasi dalam inventaris.

### `keep in DB`

Selesai jika:

- item tetap berada di jalur database/migration,
- tidak dibuat shadow copy statis di `src/agent/`,
- relasi admin workflow tetap utuh.

## Kesimpulan

Proposal migrasi yang paling aman dan paling langsung bisa dieksekusi adalah:

- **pindahkan sekarang semua prompt surface code-owned yang agentic,**
- **bungkus semua source of truth DB-managed dengan adapter tipis,**
- **biarkan prompt utilitarian dan prompt ops tetap di domainnya masing-masing.**

Dengan aturan ini, `src/agent/` akan cepat menjadi pusat arsitektur prompt yang nyata tanpa menciptakan dual source of truth baru.
