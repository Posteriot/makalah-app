# Keadaan Sekarang: Prompt, Skill, Hardcoded Instructions, dan Arah Perubahan

## Tujuan Dokumen

Dokumen ini mendeskripsikan **kondisi aktual codebase saat ini** untuk arsitektur prompt, skill, hardcoded instructions, dan runtime composition di Makalah App.

Dokumen ini harus akurat terhadap:

- codebase yang berjalan sekarang,
- model data Convex yang benar-benar aktif sekarang,
- admin workflow yang benar-benar ada sekarang,
- route, resolver, dan orchestrator yang benar-benar menyusun prompt saat runtime.

Dokumen ini **bukan** proposal target final. Dokumen ini adalah baseline current-state. Karena itu, bagian yang membahas perubahan ke depan harus dibaca sebagai **delta dari keadaan sekarang**, bukan sebagai sesuatu yang sudah terimplementasi.

Dokumen acuan lain yang relevan:

- `docs/unified-prompts-skills-instructions/2026-04-08-decision-record-final-migration-boundaries-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-08-prompt-surface-classification-matrix-v1.md`
- `docs/unified-prompts-skills-instructions/2026-04-09-mirror-architecture-db-admin-agent-managed-runtime-v2.md`

Jika ada konflik antara dokumen ini dan codebase aktual, codebase yang menang.

## Cara Baca Dokumen Ini

Dokumen ini dibagi jadi tiga lapisan:

1. **keadaan sekarang**: apa yang benar-benar ada dan dipakai saat ini,
2. **tegangan arsitektural saat ini**: masalah atau coupling yang memang sudah ada sekarang,
3. **delta ke target**: area mana yang diperkirakan akan berubah oleh keputusan arsitektur berikutnya.

Bagian `delta ke target` sengaja dipisah supaya dokumen ini tidak berubah menjadi dokumen desain terselubung.

## Ringkasan Eksekutif

Saat ini sistem instruksi AI **belum** punya satu namespace arsitektural yang terpadu. Yang ada sekarang adalah gabungan beberapa lapisan yang hidup berdampingan:

1. konten operasional yang memang DB-managed,
2. prompt dan note yang code-managed,
3. skill file-based,
4. inline instructions di route dan orchestrator,
5. tool descriptions yang berfungsi sebagai contract aktif ke model,
6. feature-local prompt builders di luar chat utama.

Masalah utamanya bukan sekadar "prompt tersebar", tetapi:

- ownership antar surface belum dibedakan cukup tegas,
- beberapa surface adalah hybrid antara text contract dan runtime logic,
- route besar masih memegang terlalu banyak precedence runtime,
- ada augmentasi instruksi yang baru muncul saat runtime,
- model `system prompt` dan `stage skills` memang sudah berbeda sejak level storage dan lifecycle.

## Keadaan Sekarang

### 1. Database-Managed Operational Content

Lapisan ini adalah content yang memang didesain untuk dikelola admin, disimpan di DB, dan dipakai runtime sebagai content operasional.

#### Global system prompt

File dan module utama:

- runtime fetch: `src/lib/ai/chat-config.ts`
- query dan mutation: `convex/systemPrompts.ts`
- schema storage: `convex/schema.ts`
- admin manager UI: `src/components/admin/SystemPromptsManager.tsx`
- admin form dialog: `src/components/admin/SystemPromptFormDialog.tsx`
- version history UI: `src/components/admin/VersionHistoryDialog.tsx`

Keadaan nyata saat ini:

- global system prompt disimpan di tabel `systemPrompts`,
- query runtime membaca prompt aktif lewat `getActiveSystemPrompt`,
- setiap update membuat row versi baru,
- status native yang ada adalah `isActive`,
- tidak ada lifecycle native `draft/published/archived`.

Implikasi current-state:

- DB adalah source of truth operasional untuk global system prompt,
- fallback file-based hanya berfungsi sebagai safety net saat DB prompt tidak tersedia,
- model data system prompt sudah berbentuk version chain + active flag.

#### Stage skills per stage paper workflow

File dan module utama:

- runtime resolver: `src/lib/ai/stage-skill-resolver.ts`
- validator konten skill: `src/lib/ai/stage-skill-validator.ts`
- query dan mutation lifecycle: `convex/stageSkills.ts`
- schema storage: `convex/schema.ts`
- admin manager UI: `src/components/admin/StageSkillsManager.tsx`
- admin form dialog: `src/components/admin/StageSkillFormDialog.tsx`
- version history UI: `src/components/admin/StageSkillVersionHistoryDialog.tsx`

Keadaan nyata saat ini:

- katalog skill disimpan di `stageSkills`,
- konten versi disimpan di `stageSkillVersions`,
- status native per versi adalah `draft`, `published`, `active`, `archived`,
- enable atau disable hidup di row katalog `stageSkills`,
- admin form bekerja dengan markdown penuh yang mengandung frontmatter,
- frontmatter itu dibentuk lewat `buildSkillMarkdown()` dan dibaca lewat `parseSkillMarkdown()`.

Implikasi current-state:

- stage skills adalah DB-managed operational content,
- lifecycle-nya memang lebih kaya daripada `systemPrompts`,
- source of truth runtime tetap di Convex,
- format content stage skill bukan body polos, tetapi markdown penuh dengan metadata.

#### Style constitutions untuk Refrasa

File dan module utama:

- source of truth: `convex/styleConstitutions.ts`
- consumer runtime: `src/app/api/refrasa/route.ts`

Keadaan nyata saat ini:

- constitution aktif tetap DB-managed,
- mutation dan version history-nya dikelola di `convex/styleConstitutions.ts`,
- belum ada desain mirror yang diterapkan di codebase,
- route Refrasa mengonsumsi constitution sebagai bagian dari builder prompt feature-specific.

Implikasi current-state:

- constitution termasuk surface DB-managed,
- ia punya lifecycle admin sendiri yang terpisah dari `stageSkills`,
- tetapi saat ini ia hidup di jalur feature Refrasa, bukan di unified agent namespace baru.

### 2. Code-Managed Fallback Prompt dan Helper Prompt

Lapisan ini berisi prompt yang dikelola lewat code dan dipakai sebagai fallback, helper, atau reusable prompt asset.

#### Fallback global system prompt

File utama:

- `src/lib/ai/chat-config.ts`

Keadaan nyata saat ini:

- file yang sama memegang fallback text,
- file yang sama juga memegang `logFallbackActivation()` dan alert wiring,
- fallback dipakai saat tidak ada active system prompt dari DB.

Implikasi current-state:

- fallback text ada, tetapi belum dipisah bersih dari side effect operasional,
- ini bukan pure prompt asset yang berdiri sendiri.

#### Fallback stage instructions

File utama:

- `src/lib/ai/paper-stages/index.ts`
- submodules di `src/lib/ai/paper-stages/`
- consumer: `src/lib/ai/paper-mode-prompt.ts`

Keadaan nyata saat ini:

- fallback stage instruction set tetap file-based,
- ia dipakai ketika active stage skill tidak ada atau gagal validasi,
- ia berfungsi sebagai safety net lokal terhadap DB content yang kosong atau rusak.

#### Search retriever prompt dan prompt code-managed lain

File utama:

- `src/lib/ai/search-system-prompt.ts`
- `src/lib/ai/paper-workflow-reminder.ts`
- `src/lib/json-render/choice-yaml-prompt.ts`
- `src/lib/ai/compaction-prompts.ts`

Keadaan nyata saat ini:

- retriever prompt dan augmentation hints masih hidup di module search sendiri,
- workflow reminder hidup sebagai helper prompt terpisah,
- choice card YAML prompt hidup di subdomain json-render,
- compaction prompts hidup di subdomain AI support.

Implikasi current-state:

- prompt code-managed memang ada dan valid sebagai lapisan tersendiri,
- tetapi namespace-nya masih tersebar.

### 3. File-Based Skill

Saat ini ada setidaknya satu skill file-based yang sudah jelas memakai pola `SKILL.md`.

File utama:

- `src/lib/ai/skills/web-search-quality/SKILL.md`
- `src/lib/ai/skills/web-search-quality/index.ts`
- `src/lib/ai/skills/index.ts`

Keadaan nyata saat ini:

- skill web search quality dipakai sebagai natural-language policy layer untuk compose phase,
- loader dan parser masih mengarah ke lokasi lama di `src/lib/ai/skills/`,
- ini adalah surface paling dekat ke bentuk target `skills/` file-based.

### 4. Inline Runtime Instructions

Lapisan ini adalah instruction text yang masih hidup langsung di caller runtime besar.

#### Chat route

File utama:

- `src/app/api/chat/route.ts`

Keadaan nyata saat ini:

- chat route masih menyusun banyak system messages secara inline,
- route memegang router prompt,
- route memegang attachment-first instruction,
- route memegang search atau tool mode notes,
- route juga memegang decision precedence kapan note tertentu ikut masuk stack.

Implikasi current-state:

- `route.ts` bukan cuma gudang string,
- `route.ts` juga adalah pusat precedence, timing injeksi, dan condition wiring.

#### Web search orchestrator

File utama:

- `src/lib/ai/web-search/orchestrator.ts`
- `src/lib/ai/search-results-context.ts`

Keadaan nyata saat ini:

- compose phase directive hidup di orchestrator,
- search results context builder hidup di module terpisah,
- keduanya bersama-sama membentuk contract perilaku compose phase,
- builder context tidak hanya memegang string, tetapi juga branching mode dan fallback behavior.

### 5. Tool Descriptions dan Feature-Specific Prompt Builders

Lapisan ini sering terlewat kalau orang cuma mencari "prompt string", padahal secara runtime ia sangat menentukan perilaku model.

#### Paper workflow tool descriptions

File utama:

- `src/lib/ai/paper-tools.ts`
- `src/app/api/chat/route.ts`

Keadaan nyata saat ini:

- deskripsi tool bersifat instruction-heavy,
- deskripsi itu menempel pada schema, sequencing, execute contract, dan tool registration,
- sebagian lagi masih inline di chat route.

Implikasi current-state:

- ini bukan pure prompt assets,
- ini adalah hybrid contract surface.

#### Choice context dan exact-source notes

File utama:

- `src/lib/chat/choice-request.ts`
- `src/lib/ai/exact-source-guardrails.ts`

Keadaan nyata saat ini:

- choice context note masih hidup berdampingan dengan validation dan finalize heuristics,
- exact-source guardrails menghasilkan lebih dari satu note atau rules surface,
- keduanya masih kuat terikat ke runtime logic.

#### Refrasa prompt builder

File utama:

- `src/lib/refrasa/prompt-builder.ts`
- `src/app/api/refrasa/route.ts`

Keadaan nyata saat ini:

- Refrasa punya builder prompt sendiri di luar chat route utama,
- builder menyatukan constitution optional, escape clause, dan output format,
- builder ini masih berupa module feature-level, bukan prompt asset namespace yang terpisah.

### 6. Prompt Surface Utilitarian Non-Chat

Ada surface prompt lain yang nyata di repo, tetapi tidak semuanya bagian dari inti arsitektur agent.

File utama:

- `src/lib/ai/title-generator.ts`
- `src/lib/file-extraction/image-ocr.ts`
- `src/app/api/admin/validate-provider/route.ts`
- `src/app/api/admin/verify-model-compatibility/route.ts`
- `src/lib/ai/context-compaction.ts`
- `src/lib/ai/compaction-prompts.ts`

Keadaan nyata saat ini:

- sebagian surface benar-benar utilitarian dan sebaiknya tetap lokal,
- sebagian lain support agent runtime tetapi bukan pusat arsitektur chat,
- verification prompts dan admin checks memang hidup di domain operasionalnya sendiri.

## Alur Runtime Saat Ini

### Normal chat

1. Chat route mengambil global system prompt aktif dari DB lewat `getSystemPrompt()`.
2. Jika ada paper session, route membangun paper mode prompt lewat `getPaperModeSystemPrompt()`.
3. Route menyusun message stack dengan file context, source context, choice context, dan runtime notes.
4. Jika search aktif, flow pindah ke orchestrator.

File utama:

- `src/app/api/chat/route.ts`
- `src/lib/ai/chat-config.ts`
- `src/lib/ai/paper-mode-prompt.ts`

### Paper mode

1. Resolver mencoba mengambil active stage skill dari DB.
2. Jika skill invalid atau tidak ada, resolver fallback ke `paper-stages`.
3. Jika skill valid, resolver menambahkan `ARTIFACT_CREATION_FOOTER` ke content aktif.
4. Paper mode prompt menggabungkan stage instructions, memory digest, artifact summaries, invalidated artifacts, dan status notes.

File utama:

- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/paper-mode-prompt.ts`

Catatan penting:

- runtime paper mode **tidak** memakai raw skill content secara mentah,
- ada augmentation lokal setelah content diambil dari DB.

### Web search

1. Router di chat route memutuskan search vs non-search.
2. Retriever phase memakai `getSearchSystemPrompt()`.
3. Compose phase memakai gabungan SKILL.md, compose directive, dan search-results context.

File utama:

- `src/app/api/chat/route.ts`
- `src/lib/ai/search-system-prompt.ts`
- `src/lib/ai/web-search/orchestrator.ts`
- `src/lib/ai/search-results-context.ts`

### Refrasa

1. Refrasa memiliki route dan builder sendiri di luar chat route utama.
2. Builder menyatukan constitution dari DB, hardcoded clauses, dan output format.

File utama:

- `src/lib/refrasa/prompt-builder.ts`
- `src/app/api/refrasa/route.ts`
- `convex/styleConstitutions.ts`

## Tegangan Arsitektural Saat Ini

Bagian ini tetap current-state. Ini bukan target design, tetapi masalah nyata yang sudah ada sekarang.

### 1. Hybrid surfaces lebih banyak dari yang terlihat

Beberapa modul bukan murni prompt asset dan bukan murni business logic. Mereka adalah hybrid:

- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/chat/choice-request.ts`
- `src/lib/ai/search-results-context.ts`
- `src/lib/refrasa/prompt-builder.ts`
- `src/lib/ai/paper-tools.ts`

Konsekuensi:

- klasifikasi "tinggal move" terlalu menyederhanakan realita,
- migrasi aman harus dimulai dari pemisahan `text contract` vs `runtime logic`.

### 2. Runtime augmentation adalah fakta penting

Beberapa surface mengalami augmentasi lokal saat runtime:

- active stage skill ditambah `ARTIFACT_CREATION_FOOTER` di `src/lib/ai/stage-skill-resolver.ts`,
- fallback global prompt terikat ke alert logging di `src/lib/ai/chat-config.ts`,
- exact-source guardrails menghasilkan lebih dari satu note surface.

Konsekuensi:

- content canonical dan prompt final runtime bukan hal yang sama,
- audit prompt stack saat ini memang harus membaca caller runtime, bukan cuma sumber kontennya.

### 3. Route dan orchestrator masih jadi pusat precedence

Masalah terbesar saat ini bukan hanya prompt tersebar di file berbeda, tetapi aturan precedence masih implicit di caller besar:

- `src/app/api/chat/route.ts`
- `src/lib/ai/web-search/orchestrator.ts`

Konsekuensi:

- kalau string dipindah tanpa memindahkan composition boundary,
- route besar tetap akan jadi prompt warehouse dengan import path baru saja.

### 4. Model `system prompt` dan `stage skills` memang sudah berbeda

Perbedaan ini sudah nyata di codebase sekarang:

- `systemPrompts` memakai version chain + `isActive`,
- `stageSkills` memakai catalog row + `stageSkillVersions`,
- `stageSkillVersions` punya status `draft/published/active/archived`.

Konsekuensi:

- current-state repo memang tidak mendukung asumsi satu lifecycle tunggal untuk semua DB-managed content,
- semua desain lanjutan harus menghormati perbedaan ini.

### 5. Format stage skill bukan plain text bebas

Current-stage skill content sekarang:

- disimpan sebagai markdown penuh,
- memuat frontmatter seperti `name`, `description`, dan `metadata`,
- dibangun dan diparse lewat helper admin form.

Konsekuensi:

- sinkronisasi file-to-DB di masa depan tidak bisa memperlakukan stage skill sebagai body text biasa,
- baseline current-state ini penting supaya desain target tidak salah mengira format content-nya.

## Delta ke Target

Bagian ini **bukan** keadaan sekarang. Ini adalah ringkasan perubahan yang diperkirakan akan terjadi menurut keputusan arsitektur lanjutan.

### 1. Yang diperkirakan tetap

Hal-hal berikut diperkirakan **tetap benar** setelah migrasi:

- DB tetap menjadi source of truth operasional untuk `system prompts`,
- DB tetap menjadi source of truth operasional untuk `stage skills`,
- `style constitutions` tetap DB-managed,
- runtime augmentation seperti footer injection tetap menjadi concern runtime, bukan canonical content.

### 2. Yang diperkirakan berubah

Hal-hal berikut diperkirakan akan berubah:

- prompt assets code-managed akan dipusatkan ke namespace `src/agent/`,
- access runtime ke content DB-managed akan dibungkus adapter,
- composition boundary akan dipusatkan lebih eksplisit,
- sebagian inline prompt string akan diekstrak dari route dan orchestrator,
- akan ada area `src/agent/managed/` sebagai exported mirror untuk scope awal tertentu.

### 3. Yang harus dibedakan tegas saat update dokumen lain

Supaya dokumen seri ini tidak rancu, pemisahan berikut harus dijaga:

- current-state vs target-state,
- canonical DB content vs mirror export,
- runtime access adapter vs mirror file,
- system prompt lifecycle vs stage skill lifecycle,
- prompt asset murni vs hybrid contract surface.

## Batas yang Tidak Boleh Salah Dibaca

Dokumen ini **tidak** berarti bahwa hal-hal berikut sudah ada sekarang:

- `src/agent/managed/` sudah terimplementasi,
- importer atau exporter mirror sudah ada,
- adapter runtime sudah menjadi jalur utama semua DB-managed content,
- precedence sudah dipusatkan ke compose layer baru,
- prompt scattering sudah selesai dirapikan.

Semua itu adalah ranah dokumen target dan rencana implementasi, bukan kondisi aktual.

## Kesimpulan

Keadaan sekarang menunjukkan bahwa unified prompt architecture memang dibutuhkan. Tapi baseline current-state yang benar adalah:

- prompt system saat ini memang tersebar ke beberapa lapisan,
- DB-managed content sudah menjadi bagian operasional nyata,
- route dan orchestrator masih memegang precedence yang besar,
- surface hybrid cukup banyak,
- runtime augmentation adalah bagian riil dari perilaku sistem sekarang.

Jadi, dokumen ini harus dipakai sebagai **peta kondisi saat ini**, lalu dibaca berdampingan dengan dokumen target untuk memahami **apa yang ada sekarang** dan **apa yang nanti akan berubah**.
