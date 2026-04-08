# Proposal Migrasi Bertahap Prompt Surface

## Tujuan

Dokumen ini menurunkan matriks klasifikasi prompt surface menjadi proposal migrasi yang langsung bisa dipakai untuk implementasi.

Decision anchor untuk proposal ini ada di `docs/unified-prompts-skills-instructions/2026-04-08-decision-record-final-migration-boundaries-v1.md`. Jika ada konflik antara proposal phase dan boundary final, boundary final di decision record yang dipakai.

Status yang dipakai:

- `move asset now`
- `extract contract first`
- `wrap with adapter`
- `keep local`
- `keep in DB`

## Aturan Baca

- `move asset now` berarti surface itu cukup bersih untuk direlokasi sekarang sebagai asset atau skill.
- `extract contract first` berarti surface itu relevan untuk `src/agent/`, tetapi masih tercampur dengan runtime logic, branching, atau execution contract.
- `wrap with adapter` berarti source of truth tidak dipindah, tetapi akses runtime dibungkus lewat layer `src/agent/`.
- `keep local` berarti surface itu sebaiknya tetap tinggal dekat feature atau domain sekarang.
- `keep in DB` berarti source of truth harus tetap database-managed dan historical ops tetap di migrations.

## Rekomendasi Tunggal

Rekomendasi terbaik adalah:

**jalankan migrasi dalam tiga rel: pindahkan asset yang pure sekarang, bungkus surface DB-managed dengan adapter tipis, dan perlakukan surface hybrid lewat tahap `extract contract first` sebelum relokasi penuh.**

Ini yang terbaik karena:

1. hasilnya tetap actionable,
2. risiko behavioral regression jauh lebih rendah,
3. `src/agent/` tidak diisi modul campuran yang hanya ganti folder,
4. composition layer nantinya benar-benar memegang precedence runtime.

## Proposal Per Item

| surface | current path | status | target path | reason | migration phase |
| --- | --- | --- | --- | --- | --- |
| Global active system prompt | `convex/systemPrompts.ts`, `src/lib/ai/chat-config.ts` | `wrap with adapter` | `src/agent/adapters/system-prompts.ts` | Source of truth tetap di DB. Adapter hanya menyatukan akses dan ownership metadata. | Phase 2 |
| Global fallback system prompt | `src/lib/ai/chat-config.ts` | `extract contract first` | `src/agent/prompts/global/fallback-system-prompt.ts` | Text fallback bisa dipindah, tetapi modul asal juga memegang alert logging. Pisahkan text dari side effect. | Phase 1 |
| Paper mode system prompt builder | `src/lib/ai/paper-mode-prompt.ts` | `extract contract first` | `src/agent/compose/build-paper-mode-message-stack.ts` | Modul ini memegang query, fallback, artifact summaries, dan status notes sekaligus. | Phase 3 |
| Active stage skill content | `convex/stageSkills.ts`, `convex/schema.ts`, `src/lib/ai/stage-skill-resolver.ts` | `wrap with adapter` | `src/agent/adapters/stage-skills.ts` | Source of truth tetap DB-managed, tetapi consumer runtime harus berhenti tahu detail storage. | Phase 2 |
| Fallback stage instructions | `src/lib/ai/paper-stages/index.ts` dan submodule `src/lib/ai/paper-stages/` | `move asset now` | `src/agent/prompts/paper-stage-fallbacks/` | Fallback text cukup jelas dan bisa dipindah lebih cepat. | Phase 1 |
| Paper workflow reminder | `src/lib/ai/paper-workflow-reminder.ts` | `move asset now` | `src/agent/prompts/global/paper-workflow-reminder.ts` | Reusable dan cukup bersih sebagai asset. | Phase 1 |
| Search mode router prompt | `src/app/api/chat/route.ts` | `move asset now` | `src/agent/prompts/router/search-mode-router-prompt.ts` | String inline bisa diekstrak aman. | Phase 2 |
| Search retriever system prompt | `src/lib/ai/search-system-prompt.ts` | `move asset now` | `src/agent/prompts/search/retriever-system-prompt.ts` | Prompt retriever bersih dan reusable. | Phase 1 |
| Search user-message augmentation hints | `src/lib/ai/search-system-prompt.ts` | `move asset now` | `src/agent/prompts/search/retriever-user-augmentation.ts` | Masih satu kontrak dengan retriever prompt. | Phase 1 |
| Search compose phase directive | `src/lib/ai/web-search/orchestrator.ts` | `move asset now` | `src/agent/prompts/search/compose-phase-directive.ts` | Ini pure text contract yang memegang phase semantics. | Phase 1 |
| Search results context guidance | `src/lib/ai/search-results-context.ts` | `extract contract first` | `src/agent/prompts/search/search-results-context-prompt.ts` dan `src/agent/compose/build-search-results-context.ts` | Ada text guidance sekaligus branching mode dan fallback behavior. | Phase 1 |
| Web search quality skill | `src/lib/ai/skills/web-search-quality/SKILL.md`, `src/lib/ai/skills/web-search-quality/index.ts` | `move asset now` | `src/agent/skills/search/web-search-quality/` | Skill file-based ini kandidat paling bersih untuk direlokasi. | Phase 1 |
| Choice card YAML system prompt | `src/lib/json-render/choice-yaml-prompt.ts` | `move asset now` | `src/agent/prompts/ui/choice-card-system-prompt.ts` | Cukup jelas sebagai prompt asset reusable. | Phase 1 |
| Choice interaction context note builder | `src/lib/chat/choice-request.ts` | `extract contract first` | `src/agent/prompts/runtime-notes/choice-context-notes.ts` dan `src/agent/compose/build-choice-context-note.ts` | File ini juga memegang validation dan finalize heuristics. | Phase 2 |
| Attachment first-response instruction | `src/app/api/chat/route.ts` | `move asset now` | `src/agent/prompts/runtime-notes/attachment-notes.ts` | Inline note bisa diekstrak aman. | Phase 2 |
| Exact source inspection rules | `src/lib/ai/exact-source-guardrails.ts` | `move asset now` | `src/agent/prompts/runtime-notes/exact-source-inspection-rules.ts` | String rules cukup jelas sebagai asset. | Phase 1 |
| Source provenance rules | `src/lib/ai/exact-source-guardrails.ts` | `move asset now` | `src/agent/prompts/runtime-notes/source-provenance-rules.ts` | Sama seperti inspection rules. | Phase 1 |
| Paper workflow tool descriptions | `src/lib/ai/paper-tools.ts` | `extract contract first` | `src/agent/prompts/tools/paper-tool-descriptions.ts` | Harus dipecah dari schema dan execute contract dulu. | Phase 4 |
| Chat route inline tool descriptions | `src/app/api/chat/route.ts` | `extract contract first` | `src/agent/prompts/tools/chat-tool-descriptions.ts` | Harus dipecah dari registrasi tool dan route flow dulu. | Phase 4 |
| Compaction summarization prompts | `src/lib/ai/compaction-prompts.ts`, digunakan dari `src/lib/ai/context-compaction.ts` | `move asset now` | `src/agent/prompts/compaction/compaction-prompts.ts` | Prompt asset cukup jelas dan relatif bersih. | Phase 1 |
| Refrasa system prompt assets | `src/lib/refrasa/prompt-builder.ts` | `extract contract first` | `src/agent/prompts/features/refrasa-system-prompt.ts` dan `src/agent/compose/build-refrasa-prompts.ts` | Builder domain dan prompt asset masih bercampur. | Phase 4 |
| Active style constitution for Refrasa | `convex/styleConstitutions.ts`, `src/app/api/refrasa/route.ts` | `wrap with adapter` | `src/agent/adapters/style-constitutions.ts` | Source of truth tetap DB-managed. | Phase 4 |
| Title generation prompt | `src/lib/ai/title-generator.ts` | `keep local` | `src/lib/ai/title-generator.ts` | Utility prompt satu-fungsi. | No migration |
| OCR image extraction instruction | `src/lib/file-extraction/image-ocr.ts` | `keep local` | `src/lib/file-extraction/image-ocr.ts` | Prompt OCR milik subsystem extraction. | No migration |
| Admin provider validation prompt | `src/app/api/admin/validate-provider/route.ts` | `keep local` | tetap lokal di route atau helper lokal | Verification-only, bukan runtime contract agent. | Optional cleanup |
| Admin model compatibility verification prompts | `src/app/api/admin/verify-model-compatibility/route.ts` | `keep local` | tetap lokal di route atau helper lokal | Verification-only, bukan prompt surface utama. | Optional cleanup |
| Completed-session fallback closing copy | `src/lib/ai/completed-session.ts`, instruksi terkait di `src/lib/ai/paper-stages/index.ts` | `keep local` | `src/lib/ai/completed-session.ts` | Lebih dekat ke response template/domain copy. | No migration |
| Exact-source followup heuristics | `src/lib/ai/exact-source-followup.ts` | `keep local` | `src/lib/ai/exact-source-followup.ts` | Ini resolver heuristik, bukan prompt surface. | No migration |
| Attachment health classifier | `src/lib/chat/attachment-health.ts` | `keep local` | `src/lib/chat/attachment-health.ts` | Bukan instruction text untuk model. | No migration |
| System prompt seed template | `convex/migrations/seedDefaultSystemPrompt.ts` | `keep in DB` | Keep in migrations | Artefak bootstrap database. | No migration |
| System prompt deployment dan update templates | `convex/migrations/createContractAlignedSystemPrompt.ts`, `convex/migrations/deployProductionSystemPrompt.ts`, `convex/migrations/updatePromptWithPaperWorkflow.ts`, `convex/migrations/updatePromptWithArtifactGuidelines.ts`, `convex/migrations/updatePromptWithArtifactSources.ts`, `convex/migrations/updateSystemPromptTo14Stages.ts`, `convex/migrations/removeOldPaperWorkflowSection.ts`, `convex/migrations/fixAgentPersonaAndCapabilities.ts`, `convex/migrations/fix13TahapReference.ts` | `keep in DB` | Keep in migrations | Ini histori deployment prompt DB. | No migration |
| Stage skill migration templates | `convex/migrations/fixWebSearchInstructions.ts`, `convex/migrations/updateStageSkillToolPolicy.ts`, `convex/migrations/wipeAndReseedStageSkills.ts`, `convex/migrations/seedPembaruanAbstrakSkill.ts` | `keep in DB` | Keep in migrations | Ini histori dan tooling operasi stage skills. | No migration |

## Paket Kerja Bertahap

### Phase 1: Pindahkan Asset yang Paling Bersih

Target:

- bentuk `src/agent/prompts/`,
- bentuk `src/agent/skills/`,
- relokasi asset yang benar-benar pure.

Item:

- fallback stage instructions,
- paper workflow reminder,
- search retriever prompt,
- search augmentation hints,
- search compose directive,
- web search quality skill,
- choice card YAML prompt,
- exact-source rules,
- source provenance rules,
- compaction prompts.

Item khusus Phase 1 yang harus `extract contract first`:

- global fallback prompt,
- search results context guidance.

Output minimum:

- `src/agent/` mulai berisi asset nyata,
- import graph kompatibel,
- behavior runtime tetap sama.

### Phase 2: Adapter dan Inline Prompt Extraction

Target:

- sembunyikan akses storage DB di belakang adapter,
- kurangi prompt inline di `chat/route.ts`,
- mulai rapikan boundary composition.

Item:

- adapter global system prompt,
- adapter stage skills,
- search router prompt,
- attachment first-response instruction,
- choice context note contract.

Output minimum:

- route tidak lagi tahu detail fetch prompt DB,
- string inline besar mulai hilang,
- hybrid module belum dipindah paksa seluruhnya.

### Phase 3: Centralize Composition

Target:

- pindahkan assembly message stack ke `src/agent/compose/`,
- jadikan composer memegang precedence runtime.

Item:

- pecah `paper-mode-prompt` menjadi query atau resolver layer plus compose layer,
- tambah `buildChatSystemMessages()`,
- tambah `buildPaperModeMessageStack()`,
- tambah `buildSearchComposeMessages()` atau builder serupa bila compose search masih tersebar.

Output minimum:

- route dan orchestrator fokus ke flow control,
- composition logic bisa dites terpisah,
- precedence system messages lebih eksplisit.

### Phase 4: Tool Contracts dan Feature Prompt Subdomains

Target:

- ekstrak tool-description contracts,
- rapikan prompt subdomain seperti Refrasa,
- tambah adapter DB untuk subdomain khusus.

Item:

- paper workflow tool descriptions,
- chat route inline tool descriptions,
- Refrasa prompt contracts,
- adapter style constitutions.

Output minimum:

- tool descriptions tidak lagi tersebar,
- feature-specific prompt stack tetap mengikuti taxonomy yang sama,
- builder domain tetap tinggal di tempat yang tepat.

## Struktur Eksekusi yang Disarankan

Urutan implementasi terbaik:

1. buat folder dan registry minimal di `src/agent/`,
2. pindahkan semua item `move asset now` yang paling bersih,
3. kerjakan item `extract contract first` dengan memecah text contract dari runtime logic,
4. tambah adapter untuk item `wrap with adapter`,
5. ekstrak inline prompt dari route,
6. baru centralize composition builder,
7. terakhir rapikan tool descriptions dan feature-specific prompt subdomains.

## Aturan Implementasi

- Jangan ubah source of truth untuk item `keep in DB`.
- Jangan paksa item `keep local` masuk `src/agent/`.
- Untuk item `wrap with adapter`, adapter harus tipis dan tidak membuat source of truth baru.
- Untuk item `extract contract first`, jangan pindahkan seluruh modul sebelum text contract dan runtime logic terpisah jelas.
- Untuk item `move asset now`, pindahkan asset instruksinya dulu, lalu caller setelah import stabil.
- Setiap migrasi harus mempertahankan instruction text tetap English sesuai policy repo.

## Definisi Selesai per Status

### `move asset now`

Selesai jika:

- asset sudah pindah ke namespace `src/agent/`,
- semua caller sudah import dari lokasi baru,
- behavior runtime tetap sama.

### `extract contract first`

Selesai jika:

- text contract berhasil dipisah dari runtime logic,
- modul hasil pemisahan punya boundary yang jelas,
- baru setelah itu relokasi ke `src/agent/` dilakukan.

### `wrap with adapter`

Selesai jika:

- source of truth tetap di DB,
- caller runtime mengakses lewat adapter `src/agent/`,
- tidak ada duplikasi state, fallback, atau ownership baru.

### `keep local`

Selesai jika:

- item tetap di domain lokal,
- tidak dimasukkan ke `src/agent/`,
- keberadaannya tetap terdokumentasi dalam inventaris.

### `keep in DB`

Selesai jika:

- item tetap berada di jalur database dan migration,
- tidak dibuat shadow copy statis di `src/agent/`,
- relasi admin workflow tetap utuh.

## Kesimpulan

Proposal migrasi yang paling aman dan paling langsung bisa dieksekusi adalah:

- **pindahkan sekarang asset yang pure,**
- **bungkus source of truth DB-managed dengan adapter tipis,**
- **pecah dulu surface hybrid sebelum relokasi penuh,**
- **baru setelah itu pusatkan composition di `src/agent/compose/`.**

Dengan aturan ini, `src/agent/` akan menjadi pusat arsitektur prompt yang nyata, bukan sekadar folder baru untuk menampung file lama.
