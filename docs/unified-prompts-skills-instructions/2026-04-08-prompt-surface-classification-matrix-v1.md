# Matriks Klasifikasi Prompt Surface di Repo

## Tujuan

Dokumen ini memetakan prompt surface utama di repo Makalah App untuk membantu keputusan unifikasi ke `src/agent/`.

Kolom yang dipakai:

- `surface`
- `current path`
- `type`
- `owner`
- `should move to src/agent?`
- `target path`
- `reason`

## Aturan Baca

- `Yes` berarti surface itu idealnya dipindah atau direlokasi ke arsitektur `src/agent/`.
- `No` berarti surface itu lebih tepat tetap di lokasi/domain sekarang.
- `current path` bisa berupa lebih dari satu file bila satu surface dibentuk oleh beberapa file.
- Matriks ini mencakup prompt surface runtime aktif, DB-managed content surfaces, feature-local utility prompts, dan migration/historical prompt assets yang relevan.

## Matriks

| surface | current path | type | owner | should move to `src/agent`? | target path | reason |
| --- | --- | --- | --- | --- | --- | --- |
| Global active system prompt | `convex/systemPrompts.ts`, `src/lib/ai/chat-config.ts` | DB-managed base system prompt | admin-managed | No | Keep in DB; optional adapter in `src/agent/adapters/system-prompts.ts` | Ini source of truth operasional, punya activate/deactivate/versioning/admin UI. Tidak boleh dipindah ke file static. |
| Global fallback system prompt | `src/lib/ai/chat-config.ts` | fallback system prompt | repo-managed | Yes | `src/agent/prompts/global/fallback-system-prompt.ts` | Ini reusable agent prompt asset, bukan domain object DB. Cocok dipusatkan. |
| Paper mode system prompt builder | `src/lib/ai/paper-mode-prompt.ts` | agentic context prompt composer | repo-managed | Yes | `src/agent/compose/build-paper-mode-message-stack.ts` | Ini builder inti message stack paper mode. Tepat jadi bagian composition layer. |
| Active stage skill content | `convex/stageSkills.ts`, `convex/schema.ts`, runtime via `src/lib/ai/stage-skill-resolver.ts` | DB-managed stage skill | admin-managed | No | Keep in DB; optional adapter in `src/agent/adapters/stage-skills.ts` | Sama seperti global prompt: ini content operasional dengan publish/activate/rollback/validation. |
| Fallback stage instructions | `src/lib/ai/paper-stages/index.ts` plus submodules di `src/lib/ai/paper-stages/` | fallback stage prompt set | repo-managed | Yes | `src/agent/prompts/paper-stage-fallbacks/` | Ini fallback prompt assets untuk paper stages dan sebaiknya dikelompokkan di namespace agent. |
| Paper workflow reminder | `src/lib/ai/paper-workflow-reminder.ts` | global workflow reminder prompt | repo-managed | Yes | `src/agent/prompts/global/paper-workflow-reminder.ts` | Reusable, agentic, dan bukan feature-local utility. |
| Search mode router prompt | `src/app/api/chat/route.ts` | router/classifier prompt | repo-managed | Yes | `src/agent/prompts/router/search-mode-router-prompt.ts` | Prompt inline besar di route. Ini kandidat utama untuk diekstrak. |
| Search retriever system prompt | `src/lib/ai/search-system-prompt.ts` | retriever-phase prompt | repo-managed | Yes | `src/agent/prompts/search/retriever-system-prompt.ts` | Ini asset retriever instruction yang reusable dan jelas agentic. |
| Search user-message augmentation hints | `src/lib/ai/search-system-prompt.ts` | retriever augmentation prompt | repo-managed | Yes | `src/agent/prompts/search/retriever-user-augmentation.ts` | Secara fungsi bagian dari search prompt contract dan sebaiknya hidup berdampingan dengan retriever prompt. |
| Search compose phase directive | `src/lib/ai/web-search/orchestrator.ts` | compose-phase directive | repo-managed | Yes | `src/agent/prompts/search/compose-phase-directive.ts` | Directive ini inti dari search compose behavior dan sekarang terlalu dekat ke orchestrator flow. |
| Search results context guidance | `src/lib/ai/search-results-context.ts` | instruction-bearing context builder | repo-managed | Yes | `src/agent/prompts/search/search-results-context-prompt.ts` | Meskipun bentuknya builder, output-nya instruction langsung ke model. Cocok masuk taxonomy agent. |
| Web search quality skill | `src/lib/ai/skills/web-search-quality/SKILL.md`, `src/lib/ai/skills/web-search-quality/index.ts` | file-based compose skill | repo-managed | Yes | `src/agent/skills/search/web-search-quality/` | Ini sudah paling dekat dengan konsep unified skill architecture. |
| Choice card YAML system prompt | `src/lib/json-render/choice-yaml-prompt.ts` | UI visual language prompt | repo-managed | Yes | `src/agent/prompts/ui/choice-card-system-prompt.ts` | Ini reusable visual-language contract untuk model. Harus duduk di prompt namespace yang jelas. |
| Choice interaction context note builder | `src/lib/chat/choice-request.ts` | runtime note / tool-followup contract | repo-managed | Yes | `src/agent/prompts/runtime-notes/choice-context-notes.ts` | `buildChoiceContextNote()` jelas membangun instruction-bearing note untuk post-choice turns. |
| Attachment first-response instruction | `src/app/api/chat/route.ts` | runtime attachment note | repo-managed | Yes | `src/agent/prompts/runtime-notes/attachment-notes.ts` | Sekarang inline di route. Ini note reusable dan cocok dipisah dari route logic. |
| Exact source inspection rules | `src/lib/ai/exact-source-guardrails.ts` | exact-source guardrail prompt | repo-managed | Yes | `src/agent/prompts/runtime-notes/exact-source-inspection-rules.ts` | Builder ini menghasilkan system note dan router note yang jelas bagian dari agent prompt architecture. |
| Source provenance rules | `src/lib/ai/exact-source-guardrails.ts` | provenance guardrail prompt | repo-managed | Yes | `src/agent/prompts/runtime-notes/source-provenance-rules.ts` | Sama seperti exact-source inspection rules: ini instruction surface aktif, bukan helper murni. |
| Paper workflow tool descriptions | `src/lib/ai/paper-tools.ts` | tool-description contract | repo-managed | Yes | `src/agent/prompts/tools/paper-tool-descriptions.ts` | Deskripsi tool di sini panjang dan sangat instruction-heavy. Idealnya diinventaris dan diekstrak ke template layer. |
| Chat route inline tool descriptions | `src/app/api/chat/route.ts` | tool-description contract | repo-managed | Yes | `src/agent/prompts/tools/chat-tool-descriptions.ts` | Tool descriptions yang masih inline di route punya sifat sama: instruction surface, bukan sekadar metadata. |
| Compaction summarization prompts | `src/lib/ai/compaction-prompts.ts`, dipakai dari `src/lib/ai/context-compaction.ts` | agent-support prompt | repo-managed | Yes | `src/agent/prompts/compaction/compaction-prompts.ts` | Ini utilitas untuk context management agent utama, bukan feature-local helper biasa. |
| Refrasa system prompt assets | `src/lib/refrasa/prompt-builder.ts` | feature-specific system prompt | repo-managed | Yes | `src/agent/prompts/features/refrasa-system-prompt.ts` | Refrasa punya prompt architecture sendiri yang masih cocok dimasukkan ke orbit `src/agent` sebagai subdomain feature prompt. |
| Active style constitution for Refrasa | `convex/styleConstitutions.ts`, consumed by `src/app/api/refrasa/route.ts` | DB-managed constitution | admin-managed | No | Keep in DB; optional adapter in `src/agent/adapters/style-constitutions.ts` | Ini konten operasional editable via admin, jadi tidak boleh dipindah ke file static. |
| Title generation prompt | `src/lib/ai/title-generator.ts` | feature-local utility prompt | repo-managed | No | Keep in `src/lib/ai/title-generator.ts` | Ini helper satu-fungsi yang tidak membentuk prompt stack agent utama. Dipindah ke `src/agent` justru menambah noise. |
| OCR image extraction instruction | `src/lib/file-extraction/image-ocr.ts` | feature-local utility prompt | repo-managed | No | Keep in `src/lib/file-extraction/image-ocr.ts` | Prompt ini milik OCR utility, bukan agent prompt architecture. |
| Admin provider validation prompt | `src/app/api/admin/validate-provider/route.ts` | verification/test prompt | repo-managed | No | Keep in route or move to local `prompts.ts` beside route if needed | Ini prompt teknis untuk connection check, bukan reusable agent behavior. |
| Admin model compatibility verification prompts | `src/app/api/admin/verify-model-compatibility/route.ts` | verification/test prompt set | repo-managed | No | Keep in route or local helper near route | Ini suite verifikasi model, bukan bagian dari runtime prompt registry agent utama. |
| Completed-session fallback closing copy | `src/lib/ai/completed-session.ts`, also completed instructions in `src/lib/ai/paper-stages/index.ts` | user-facing closing template | repo-managed | No | Keep in domain module; optionally document in `src/agent/contracts/response-templates.md` | Ini lebih tepat dianggap response template/domain copy daripada prompt asset inti. |
| Exact-source followup heuristics | `src/lib/ai/exact-source-followup.ts` | heuristic resolver, not prompt | repo-managed | No | Keep in domain module | Ini bukan prompt surface, melainkan semantic/heuristic resolver untuk routing. |
| Attachment health classifier | `src/lib/chat/attachment-health.ts` | state classifier, not prompt | repo-managed | No | Keep in domain module | Tidak menghasilkan instruction text untuk model. |
| System prompt seed template | `convex/migrations/seedDefaultSystemPrompt.ts` | migration seed prompt | ops-managed | No | Keep in migrations | Ini historical/bootstrap asset untuk database, bukan runtime prompt registry. |
| System prompt deployment/update templates | `convex/migrations/createContractAlignedSystemPrompt.ts`, `convex/migrations/deployProductionSystemPrompt.ts`, `convex/migrations/updatePromptWithPaperWorkflow.ts`, `convex/migrations/updatePromptWithArtifactGuidelines.ts`, `convex/migrations/updatePromptWithArtifactSources.ts`, `convex/migrations/updateSystemPromptTo14Stages.ts`, `convex/migrations/removeOldPaperWorkflowSection.ts`, `convex/migrations/fixAgentPersonaAndCapabilities.ts`, `convex/migrations/fix13TahapReference.ts` | migration/deployment prompt assets | ops-managed | No | Keep in migrations | Ini artefak deployment dan histori prompt DB. Wajib diinventaris, tapi tidak tepat dipindah ke `src/agent`. |
| Stage skill migration templates | `convex/migrations/fixWebSearchInstructions.ts`, `convex/migrations/updateStageSkillToolPolicy.ts`, `convex/migrations/wipeAndReseedStageSkills.ts`, `convex/migrations/seedPembaruanAbstrakSkill.ts` | migration/deployment skill assets | ops-managed | No | Keep in migrations | Sama seperti migration prompt: penting untuk histori dan ops, bukan runtime registry agent. |

## Rekomendasi Tunggal

Rekomendasi terbaik adalah:

**pakai `src/agent/` hanya untuk prompt surface yang agentic, reusable, atau menjadi instruction contract aktif di runtime; jangan paksa prompt utilitarian, verification prompt, dan migration assets masuk ke sana.**

Kenapa ini yang terbaik:

- menjaga `src/agent/` tetap fokus,
- menghindari over-centralization,
- tetap membuat prompt architecture utama unified,
- tidak merusak ownership domain yang memang tepat tinggal di DB, feature module, atau migrations.

## Ringkasan Boundary

### Harus masuk `src/agent/`

- prompt stack chat/paper/search,
- file-based skills,
- runtime notes,
- exact-source guardrails,
- tool descriptions yang jadi contract aktif,
- feature prompt builder yang secara semantik masih agentic.

### Tidak perlu masuk `src/agent/`

- DB content operasional,
- utility prompts satu-fungsi,
- verification/test prompts,
- migration/deployment prompt assets,
- pure heuristics dan classifier yang tidak mengirim instruction text ke model.
