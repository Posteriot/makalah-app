# Matriks Klasifikasi Prompt Surface di Repo

## Tujuan

Dokumen ini memetakan prompt surface utama di repo Makalah App untuk membantu keputusan unifikasi ke `src/agent/` dan boundary managed mirror untuk content DB-managed.

Decision anchor untuk boundary final migrasi ada di `docs/unified-prompts-skills-instructions/2026-04-08-decision-record-final-migration-boundaries-v1.md`. Matriks ini juga harus dibaca konsisten dengan `docs/unified-prompts-skills-instructions/2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`.

Kolom yang dipakai:

- `surface`
- `current path`
- `type`
- `owner`
- `migration status`
- `target path`
- `reason`

## Aturan Baca

Status yang dipakai:

- `move asset now`
- `extract contract first`
- `wrap with adapter`
- `export mirror`
- `keep local`
- `keep in DB`

Definisi:

- `move asset now`: surface cukup bersih untuk direlokasi sekarang sebagai asset atau skill file-based repo-managed.
- `extract contract first`: surface relevan untuk `src/agent/`, tetapi masih tercampur dengan runtime logic, schema, branching, atau orchestration. Pisahkan kontraknya dulu.
- `wrap with adapter`: source of truth tetap di DB, akses runtime dibungkus agar composition bisa dipusatkan.
- `export mirror`: source of truth tetap di DB, tetapi snapshot canonical content boleh diekspor ke `src/agent/managed/` untuk diff, audit, dokumentasi, dan explicit sync.
- `keep local`: tetap lebih sehat tinggal di domain sekarang.
- `keep in DB`: tetap di jalur database dan migration.

## Matriks

| surface | current path | type | owner | migration status | target path | reason |
| --- | --- | --- | --- | --- | --- | --- |
| Global active system prompt runtime access | `convex/systemPrompts.ts`, `src/lib/ai/chat-config.ts` | DB-managed base system prompt | admin-managed | `wrap with adapter` | `src/agent/adapters/system-prompts.ts` | Source of truth operasional tetap di DB. Runtime harus mengakses lewat adapter tipis dan tidak boleh membuat fallback atau shadow state baru. |
| Global active system prompt mirror export | `convex/systemPrompts.ts`, `.references/system-prompt-skills-active/updated-3/system-prompt.md` | DB-managed prompt snapshot | admin-managed | `export mirror` | `src/agent/managed/system-prompts/<prompt-chain>/` | Prompt aktif dan version chain layak diekspor ke managed mirror, tetapi file mirror tidak boleh menjadi authority runtime. Model datanya adalah version chain + `isActive`, bukan draft/published/archived. |
| Global fallback system prompt | `src/lib/ai/chat-config.ts` | fallback system prompt | repo-managed | `extract contract first` | `src/agent/prompts/global/fallback-system-prompt.ts` | Text fallback bisa dipindah, tetapi modul asal juga memegang alert logging. Pisahkan text dari side effect dulu. |
| Paper mode system prompt builder | `src/lib/ai/paper-mode-prompt.ts` | agentic context composer | repo-managed | `extract contract first` | `src/agent/compose/build-paper-mode-message-stack.ts` | Modul ini bukan pure prompt builder; ia juga fetch session, resolve skill, dan merge artifact context. |
| Active stage skill runtime access | `convex/stageSkills.ts`, `convex/schema.ts`, runtime via `src/lib/ai/stage-skill-resolver.ts` | DB-managed stage skill | admin-managed | `wrap with adapter` | `src/agent/adapters/stage-skills.ts` | Content tetap DB-managed. Resolver runtime menambahkan footer lokal dan validasi, jadi adapter harus tetap tipis dan eksplisit. |
| Active stage skill mirror export | `convex/stageSkills.ts`, `convex/stageSkills/constants.ts`, `convex/schema.ts`, `.references/system-prompt-skills-active/updated-3/*.md` | DB-managed stage skill snapshot | admin-managed | `export mirror` | `src/agent/managed/stage-skills/<stage-scope>/` | Stage skill layak diekspor ke managed mirror untuk diff dan sync eksplisit. File mirror harus mempertahankan model catalog + version statuses `draft/published/active/archived` + frontmatter metadata (`name`, `description`, `stageScope`, `searchPolicy`, `metadataInternal`). Folder naming harus memakai hyphen (derived dari `stageScope` underscore via `toSkillId()`). Bukan source runtime baru. |
| Fallback stage instructions | `src/lib/ai/paper-stages/index.ts` plus submodules di `src/lib/ai/paper-stages/` | fallback stage prompt set | repo-managed | `move asset now` | `src/agent/prompts/paper-stage-fallbacks/` | Fallback text relatif bersih dan cocok dipusatkan, selama caller runtime lama tetap dipertahankan sementara. |
| Paper workflow reminder | `src/lib/ai/paper-workflow-reminder.ts` | global workflow reminder prompt | repo-managed | `move asset now` | `src/agent/prompts/global/paper-workflow-reminder.ts` | Reusable dan cukup bersih sebagai asset prompt. |
| Search mode router prompt | `src/app/api/chat/route.ts` | router/classifier prompt | repo-managed | `move asset now` | `src/agent/prompts/router/search-mode-router-prompt.ts` | Inline string bisa diekstrak aman, tetapi precedence pemakaiannya tetap harus di compose layer. |
| Search retriever system prompt | `src/lib/ai/search-system-prompt.ts` | retriever-phase prompt | repo-managed | `move asset now` | `src/agent/prompts/search/retriever-system-prompt.ts` | Prompt retriever cocok dijadikan asset code-managed. |
| Search user-message augmentation hints | `src/lib/ai/search-system-prompt.ts` | retriever augmentation prompt | repo-managed | `move asset now` | `src/agent/prompts/search/retriever-user-augmentation.ts` | Bagian dari kontrak retriever yang relatif bersih. |
| Search compose phase directive | `src/lib/ai/web-search/orchestrator.ts` | compose-phase directive | repo-managed | `move asset now` | `src/agent/prompts/search/compose-phase-directive.ts` | Directive ini adalah text contract yang jelas, tapi precedence tetap harus dijaga di composer. |
| Search results context guidance | `src/lib/ai/search-results-context.ts` | instruction-bearing context builder | repo-managed | `extract contract first` | `src/agent/prompts/search/search-results-context-prompt.ts` dan `src/agent/compose/build-search-results-context.ts` | Modul ini mengandung text guidance sekaligus branching mode dan fallback behavior. |
| Web search quality skill | `src/lib/ai/skills/web-search-quality/SKILL.md`, `src/lib/ai/skills/web-search-quality/index.ts` | file-based compose skill | repo-managed | `move asset now` | `src/agent/skills/search/web-search-quality/` | Ini kandidat paling bersih untuk re-homing ke namespace skill baru. |
| Choice card YAML system prompt | `src/lib/json-render/choice-yaml-prompt.ts` | UI visual language prompt | repo-managed | `move asset now` | `src/agent/prompts/ui/choice-card-system-prompt.ts` | Cukup jelas sebagai reusable prompt asset. |
| Choice interaction context note builder | `src/lib/chat/choice-request.ts` | runtime note plus workflow heuristics | repo-managed | `extract contract first` | `src/agent/prompts/runtime-notes/choice-context-notes.ts` dan `src/agent/compose/build-choice-context-note.ts` | `buildChoiceContextNote()` relevan, tapi file yang sama juga memegang validation dan finalize heuristics. |
| Attachment first-response instruction | `src/app/api/chat/route.ts` | runtime attachment note | repo-managed | `move asset now` | `src/agent/prompts/runtime-notes/attachment-notes.ts` | Inline note ini cukup aman diekstrak. |
| Exact source inspection rules | `src/lib/ai/exact-source-guardrails.ts` | exact-source guardrail prompt | repo-managed | `move asset now` | `src/agent/prompts/runtime-notes/exact-source-inspection-rules.ts` | Rules string cukup jelas sebagai prompt asset. |
| Source provenance rules | `src/lib/ai/exact-source-guardrails.ts` | provenance guardrail prompt | repo-managed | `move asset now` | `src/agent/prompts/runtime-notes/source-provenance-rules.ts` | Sama seperti inspection rules. |
| Paper workflow tool descriptions | `src/lib/ai/paper-tools.ts` | tool-description contract | repo-managed | `extract contract first` | `src/agent/prompts/tools/paper-tool-descriptions.ts` | Deskripsi tool sangat instruction-heavy, tetapi masih nempel ke schema, sequencing, dan execute contract. |
| Chat route inline tool descriptions | `src/app/api/chat/route.ts` | tool-description contract | repo-managed | `extract contract first` | `src/agent/prompts/tools/chat-tool-descriptions.ts` | Relevan dipusatkan, tetapi harus dipisah dari registrasi tool dan flow route. |
| Compaction summarization prompts | `src/lib/ai/compaction-prompts.ts`, dipakai dari `src/lib/ai/context-compaction.ts` | agent-support prompt | repo-managed | `move asset now` | `src/agent/prompts/compaction/compaction-prompts.ts` | Prompt asset-nya cukup jelas dan tidak terlalu terseret domain flow lain. |
| Refrasa system prompt assets | `src/lib/refrasa/prompt-builder.ts` | feature-specific prompt builder | repo-managed | `extract contract first` | `src/agent/prompts/features/refrasa-system-prompt.ts` dan `src/agent/compose/build-refrasa-prompts.ts` | Refrasa relevan untuk taxonomy agent, tetapi file saat ini adalah builder domain, bukan asset murni. |
| Active style constitution for Refrasa runtime access | `convex/styleConstitutions.ts`, consumed by `src/app/api/refrasa/route.ts` | DB-managed constitution | admin-managed | `wrap with adapter` | `src/agent/adapters/style-constitutions.ts` | Content tetap DB-managed. Saat ini belum ada keputusan mirror awal untuk constitution; yang pasti runtime access tetap harus adapter-backed. |
| Active style constitution mirror export | `convex/styleConstitutions.ts`, `src/app/api/refrasa/route.ts` | DB-managed constitution snapshot | admin-managed | `keep in DB` | Keep in DB for now | Constitution tetap DB-managed, tetapi mirror file belum masuk scope implementasi awal yang diputuskan. Jangan diasumsikan otomatis ikut `src/agent/managed/` sampai ada keputusan lanjutan. |
| Title generation prompt | `src/lib/ai/title-generator.ts` | feature-local utility prompt | repo-managed | `keep local` | `src/lib/ai/title-generator.ts` | Helper satu-fungsi yang tidak membentuk prompt stack agent utama. |
| OCR image extraction instruction | `src/lib/file-extraction/image-ocr.ts` | feature-local utility prompt | repo-managed | `keep local` | `src/lib/file-extraction/image-ocr.ts` | Milik subsystem extraction, bukan prompt architecture agent utama. |
| Admin provider validation prompt | `src/app/api/admin/validate-provider/route.ts` | verification/test prompt | repo-managed | `keep local` | `src/app/api/admin/validate-provider/route.ts` atau helper lokal di folder yang sama | Ini prompt teknis untuk connection check, bukan runtime contract agent. |
| Admin model compatibility verification prompts | `src/app/api/admin/verify-model-compatibility/route.ts` | verification/test prompt set | repo-managed | `keep local` | `src/app/api/admin/verify-model-compatibility/route.ts` atau helper lokal di folder yang sama | Verification-only, bukan runtime prompt registry agent. |
| Completed-session fallback closing copy | `src/lib/ai/completed-session.ts`, juga instruksi completed di `src/lib/ai/paper-stages/index.ts` | response template/domain copy | repo-managed | `keep local` | `src/lib/ai/completed-session.ts` | Lebih dekat ke domain response copy daripada prompt asset inti. |
| Exact-source followup heuristics | `src/lib/ai/exact-source-followup.ts` | heuristic resolver | repo-managed | `keep local` | `src/lib/ai/exact-source-followup.ts` | Bukan prompt surface. |
| Attachment health classifier | `src/lib/chat/attachment-health.ts` | state classifier | repo-managed | `keep local` | `src/lib/chat/attachment-health.ts` | Tidak menghasilkan instruction text untuk model. |
| System prompt seed template | `convex/migrations/seedDefaultSystemPrompt.ts` | migration seed prompt | ops-managed | `keep in DB` | Keep in migrations | Historical bootstrap asset, bukan runtime registry dan bukan managed mirror authority. |
| System prompt deployment dan update templates | `convex/migrations/createContractAlignedSystemPrompt.ts`, `convex/migrations/deployProductionSystemPrompt.ts`, `convex/migrations/updatePromptWithPaperWorkflow.ts`, `convex/migrations/updatePromptWithArtifactGuidelines.ts`, `convex/migrations/updatePromptWithArtifactSources.ts`, `convex/migrations/updateSystemPromptTo14Stages.ts`, `convex/migrations/removeOldPaperWorkflowSection.ts`, `convex/migrations/fixAgentPersonaAndCapabilities.ts`, `convex/migrations/fix13TahapReference.ts` | migration prompt assets | ops-managed | `keep in DB` | Keep in migrations | Artefak histori deployment prompt DB. |
| Stage skill migration templates | `convex/migrations/fixWebSearchInstructions.ts`, `convex/migrations/updateStageSkillToolPolicy.ts`, `convex/migrations/wipeAndReseedStageSkills.ts`, `convex/migrations/seedPembaruanAbstrakSkill.ts` | migration skill assets | ops-managed | `keep in DB` | Keep in migrations | Penting untuk histori dan ops, bukan runtime asset dan bukan managed mirror authority. |

## Rekomendasi Tunggal

Rekomendasi terbaik adalah:

**pakai `src/agent/` repo-managed layer hanya untuk surface yang benar-benar agentic, perlakukan surface hybrid dengan status `extract contract first`, dan perlakukan DB-managed content lewat kombinasi `wrap with adapter` + `export mirror` bila memang masuk scope mirror awal.**

Kenapa ini yang terbaik:

- menjaga `src/agent/` tetap fokus,
- mencegah relokasi palsu yang hanya memindahkan file tapi tidak memindahkan tanggung jawab,
- mengurangi risiko behavioral regression,
- membuat composition layer benar-benar berarti,
- menjaga managed mirror tetap berguna tanpa berubah jadi source of truth baru.

## Ringkasan Boundary

### Layak masuk `src/agent/` lebih cepat

- prompt asset yang pure string,
- skill file-based,
- runtime note inline yang tidak memegang branching,
- compaction prompt assets,
- exact-source rules strings,
- fallback stage instructions.

### Harus dipecah dulu sebelum masuk `src/agent/`

- paper mode composer,
- search results context builder,
- choice context note builder,
- paper tool descriptions,
- chat route tool descriptions,
- Refrasa prompt builder,
- fallback system prompt yang masih bercampur logging.

### Tetap DB-backed di runtime

- global active system prompt,
- active stage skills,
- active style constitution.

### Layak punya managed mirror export

- system prompt chains,
- stage skill snapshots.

### Tidak perlu masuk `src/agent/`

- utility prompts satu-fungsi,
- verification dan test prompts,
- migration assets,
- heuristics dan classifier non-prompt,
- constitution mirror file yang belum diputuskan scope-nya.
